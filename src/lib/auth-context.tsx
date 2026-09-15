import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  getProfile,
  upsertProfile,
  isFirebaseConfigured,
  type Profile,
} from './database';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithCustomToken,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

type AuthUser = {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  displayName: string | null;
};

type SendOtpResult = { error: string | null; cooldownSec?: number };

type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  otpSending: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<SendOtpResult>;
  verifyPhoneOtp: (otp: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<SendOtpResult>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  adminLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  adminResetPassword: (email: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  otpSending: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  sendPhoneOtp: async () => ({ error: 'Not initialized' }),
  verifyPhoneOtp: async () => ({ error: 'Not initialized' }),
  sendEmailOtp: async () => ({ error: 'Not initialized' }),
  verifyEmailOtp: async () => ({ error: 'Not initialized' }),
  adminLogin: async () => ({ error: 'Not initialized' }),
  adminResetPassword: async () => ({ error: 'Not initialized' }),
});

function toAuthUser(fbUser: FirebaseUser): AuthUser {
  return {
    uid: fbUser.uid,
    phoneNumber: fbUser.phoneNumber,
    email: fbUser.email,
    displayName: fbUser.displayName,
  };
}

function getCloudFunctionUrl(endpoint: string): string {
  const region = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'asia-south1';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    return `https://${region}-${projectId}.cloudfunctions.net/${endpoint}`;
  }
  return `/${endpoint}`;
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY || '';

let recaptchaContainerEl: HTMLDivElement | null = null;

function getRecaptchaContainer(): HTMLDivElement {
  if (!recaptchaContainerEl) {
    recaptchaContainerEl = document.createElement('div');
    recaptchaContainerEl.id = 'firebase-recaptcha-invisible';
    recaptchaContainerEl.style.position = 'fixed';
    recaptchaContainerEl.style.bottom = '0';
    recaptchaContainerEl.style.left = '0';
    recaptchaContainerEl.style.width = '0';
    recaptchaContainerEl.style.height = '0';
    recaptchaContainerEl.style.overflow = 'hidden';
    recaptchaContainerEl.style.zIndex = '-1';
    recaptchaContainerEl.style.visibility = 'hidden';
    recaptchaContainerEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(recaptchaContainerEl);
  }
  return recaptchaContainerEl;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const clearRecaptcha = useCallback(() => {
    const verifier = recaptchaVerifierRef.current;
    if (verifier) {
      try {
        verifier.clear();
      } catch {
        // ignore
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerEl) {
      recaptchaContainerEl.innerHTML = '';
    }
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const data = await getProfile(uid);
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.uid);
  }, [user, fetchProfile]);

  useEffect(() => {
    let unsubFb: (() => void) | undefined;
    let settled = false;

    const markLoadingDone = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    if (isFirebaseConfigured && firebaseAuth) {
      unsubFb = onAuthStateChanged(firebaseAuth, async (fbUser) => {
        if (fbUser) {
          const authUser = toAuthUser(fbUser);
          setUser(authUser);
          await fetchProfile(authUser.uid);
        }
        markLoadingDone();
      });
    } else {
      markLoadingDone();
    }

    return () => {
      if (unsubFb) unsubFb();
      clearRecaptcha();
    };
  }, [fetchProfile, clearRecaptcha]);

  const sendPhoneOtp = useCallback(
    async (phone: string): Promise<SendOtpResult> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Phone OTP is not configured. Please contact support.' };
      }

      // Sanitize the phone number: strip everything except digits
      const digits = phone.replace(/[^\d]/g, '');
      if (digits.length < 10) {
        return { error: 'Please enter a valid 10-digit mobile number.' };
      }
      // Take last 10 digits and prepend +91 (India country code)
      const fullPhone = `+91${digits.slice(-10)}`;

      setOtpSending(true);
      try {
        clearRecaptcha();

        const container = getRecaptchaContainer();
        container.innerHTML = '';

        // Give the DOM a moment to settle before instantiating the verifier
        await new Promise((r) => setTimeout(r, 50));

        // Create invisible RecaptchaVerifier with the Enterprise site key.
        // The verifier renders into a hidden container — no visible widget is shown to the user.
        const verifierParams: Record<string, unknown> = {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved — signInWithPhoneNumber proceeds automatically
          },
          'expired-callback': () => {
            clearRecaptcha();
          },
        };

        if (RECAPTCHA_SITE_KEY) {
          verifierParams.sitekey = RECAPTCHA_SITE_KEY;
        }

        const verifier = new RecaptchaVerifier(firebaseAuth, container, verifierParams);
        recaptchaVerifierRef.current = verifier;

        await verifier.render();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('RECAPTCHA_TIMEOUT')), 30000);
        });

        const result = await Promise.race([
          signInWithPhoneNumber(firebaseAuth, fullPhone, verifier),
          timeoutPromise,
        ]);
        setConfirmationResult(result);
        return { error: null };
      } catch (err) {
     const error = err as { code?: string; message?: string };
  console.error('[Phone OTP] Failed to send OTP:', error.code ?? 'unknown', error.message ?? 'unknown');
  clearRecaptcha();

  if (error.message === 'RECAPTCHA_TIMEOUT') {
    return {
      error: 'Verification timed out. Please try again.',
      cooldownSec: 30,
    };
  }
  if (error.code === 'auth/too-many-requests') {
    return {
      error: 'Too many OTP requests. Please wait before requesting another code.',
      cooldownSec: 60,
    };
  }
  if (error.code === 'auth/invalid-phone-number') {
    return {
      error: 'Invalid phone number. Please check and try again.',
    };
  }
  if (error.code === 'auth/captcha-check-failed') {
    return {
      error: 'Verification check failed. Please try again.',
      cooldownSec: 15,
    };
  }
  if (error.code === 'auth/operation-not-allowed') {
    return {
      error: 'Phone login is not enabled. Please contact support.',
    };
  }
  if (error.code === 'auth/quota-exceeded') {
    return {
      error: 'SMS quota exceeded. Please try again later or use email login.',
    };
  }
  if (error.code === 'auth/invalid-recaptcha-token' || error.code === 'auth/invalid-verification-code') {
    return {
      error: 'Verification failed. Please try again.',
      cooldownSec: 15,
    };
  }
  if (error.code === 'auth/argument-error') {
    return {
      error: 'Verification setup error. Please try again.',
      cooldownSec: 15,
    };
  }

  const msg = error.message ?? 'Failed to send OTP';
  return { error: msg };
      } finally {
        setOtpSending(false);
      }
    },
    [clearRecaptcha]
  );

  const verifyPhoneOtp = useCallback(
    async (otp: string): Promise<{ error: string | null }> => {
      if (!confirmationResult) {
        return { error: 'No OTP request in progress. Please request a new code.' };
      }
      try {
        const fbUserCred = await confirmationResult.confirm(otp);
        if (!fbUserCred.user) {
          return { error: 'Verification failed — no user returned' };
        }

        const authUser = toAuthUser(fbUserCred.user);
        setUser(authUser);

        const phone = authUser.phoneNumber ?? '';
        const displayName = authUser.displayName ?? '';
        const email = authUser.email ?? '';

        await upsertProfile({
          id: authUser.uid,
          email,
          full_name: displayName,
          phone,
          role: 'user',
        });

        await fetchProfile(authUser.uid);

        clearRecaptcha();
        setConfirmationResult(null);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        console.error('[Phone OTP] Failed to verify OTP:', error.code ?? 'unknown', error.message ?? err);
        if (error.code === 'auth/invalid-verification-code') {
          return { error: 'Invalid verification code. Please check and try again.' };
        }
        if (error.code === 'auth/code-expired') {
          return { error: 'This code has expired. Please request a new one.' };
        }
        if (error.code === 'auth/too-many-requests') {
          return { error: 'Too many attempts. Please wait a moment and try again.' };
        }
        return { error: error.message || 'Invalid or expired OTP' };
      }
    },
    [confirmationResult, fetchProfile, clearRecaptcha]
  );

  const sendEmailOtp = useCallback(
    async (email: string): Promise<SendOtpResult> => {
      if (!isFirebaseConfigured) {
        return { error: 'Email login is not configured. Please contact support.' };
      }
      setOtpSending(true);
      try {
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const apiUrl = getCloudFunctionUrl('sendOtp');
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp: generatedOtp }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) {
            return {
              error: 'Too many OTP requests. Please wait before requesting another code.',
              cooldownSec: 60,
            };
          }
          return { error: body.error || 'Failed to send OTP. Please try again.' };
        }
        const data = await res.json().catch(() => ({}));
        if (data.error) return { error: data.error };
        return { error: null };
      } catch (err) {
        console.error('[Email OTP] Failed to send OTP:', err);
        const msg = err instanceof Error ? err.message : 'Failed to send OTP';
        return { error: msg };
      } finally {
        setOtpSending(false);
      }
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Email login is not configured. Please contact support.' };
      }
      try {
        const apiUrl = getCloudFunctionUrl('verifyOtp');
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp: token }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { error: body.error || 'Verification failed. Please try again.' };
        }
        const data = await res.json().catch(() => ({}));
        if (data.error) return { error: data.error };
        if (!data.customToken) {
          return { error: 'Login failed — no auth token returned. Please contact support.' };
        }

        const userCred = await signInWithCustomToken(firebaseAuth, data.customToken);
        if (!userCred.user) {
          return { error: 'Login failed — no user returned.' };
        }

        const authUser = toAuthUser(userCred.user);
        setUser(authUser);

        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? email,
          full_name: authUser.displayName ?? '',
          phone: authUser.phoneNumber ?? '',
          role: 'user',
        });

        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        console.error('[Email OTP] Failed to verify OTP:', error.code ?? 'unknown', error.message ?? err);
        if (error.code === 'auth/invalid-custom-token') {
          return { error: 'Login failed — invalid token. Please try again.' };
        }
        const msg = error.message ?? 'Verification failed. Please try again.';
        return { error: msg };
      }
    },
    [fetchProfile]
  );

  const adminLogin = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Firebase is not configured. Please contact support.' };
      }
      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!userCred.user) {
          return { error: 'Login failed. No user returned.' };
        }

        const authUser: AuthUser = {
          uid: userCred.user.uid,
          phoneNumber: userCred.user.phoneNumber,
          email: userCred.user.email,
          displayName: userCred.user.displayName ?? '',
        };
        setUser(authUser);

        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? email.trim(),
          full_name: authUser.displayName ?? 'Admin',
          phone: authUser.phoneNumber ?? '',
          role: 'admin',
        });

        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        console.error('[Admin Login] Failed:', error.code ?? 'unknown', error.message ?? err);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          return { error: 'Invalid email or password.' };
        }
        if (error.code === 'auth/too-many-requests') {
          return { error: 'Too many failed attempts. Please try again later.' };
        }
        const msg = error.message ?? 'Login failed. Please try again.';
        return { error: msg };
      }
    },
    [fetchProfile]
  );

  const adminResetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Firebase is not configured. Please contact support.' };
      }
      try {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        console.error('[Admin Reset] Failed:', error.code ?? 'unknown', error.message ?? err);
        if (error.code === 'auth/user-not-found') {
          return { error: 'No account found with this email address.' };
        }
        const msg = error.message ?? 'Failed to send reset email. Please try again.';
        return { error: msg };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await firebaseSignOut(firebaseAuth);
      } catch {
        // ignore
      }
    }
    clearRecaptcha();
    setConfirmationResult(null);
    setUser(null);
    setProfile(null);
  }, [clearRecaptcha]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        otpSending,
        signOut,
        refreshProfile,
        sendPhoneOtp,
        verifyPhoneOtp,
        sendEmailOtp,
        verifyEmailOtp,
        adminLogin,
        adminResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

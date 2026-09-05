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
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as updateFbProfile,
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
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<SendOtpResult>;
  verifyPhoneOtp: (otp: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
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
  signInWithEmail: async () => ({ error: 'Not initialized' }),
  signUpWithEmail: async () => ({ error: 'Not initialized' }),
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
    };
  }, [fetchProfile]);

  const sendPhoneOtp = useCallback(
    async (phone: string, recaptchaContainerId: string): Promise<SendOtpResult> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Phone OTP is not configured. Please contact support.' };
      }
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      setOtpSending(true);
      try {
        clearRecaptcha();

        const container = document.getElementById(recaptchaContainerId);
        if (!container) {
          return { error: 'Verification widget could not be loaded. Please refresh the page.' };
        }
        container.innerHTML = '';

        await new Promise((r) => setTimeout(r, 50));

        const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, {
          size: 'normal',
          'expired-callback': () => {
            clearRecaptcha();
          },
        });
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
          return { error: 'Invalid phone number. Please check and try again.' };
        }
        if (error.code === 'auth/captcha-check-failed') {
          return { error: 'Verification check failed. Please try again.' };
        }
        if (error.code === 'auth/operation-not-allowed') {
          return { error: 'Phone login is not enabled. Please contact support.' };
        }
        if (error.code === 'auth/quota-exceeded') {
          return { error: 'SMS quota exceeded. Please try again later or use email login.' };
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

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Email login is not configured. Please contact support.' };
      }
      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!userCred.user) {
          return { error: 'Login failed. No user returned.' };
        }

        const authUser = toAuthUser(userCred.user);
        setUser(authUser);

        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? email.trim(),
          full_name: authUser.displayName ?? '',
          phone: authUser.phoneNumber ?? '',
          role: 'user',
        });

        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          return { error: 'Invalid email or password.' };
        }
        if (error.code === 'auth/too-many-requests') {
          return { error: 'Too many failed attempts. Please try again later.' };
        }
        if (error.code === 'auth/invalid-email') {
          return { error: 'Please enter a valid email address.' };
        }
        const msg = error.message ?? 'Login failed. Please try again.';
        return { error: msg };
      }
    },
    [fetchProfile]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Email sign-up is not configured. Please contact support.' };
      }
      try {
        const userCred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!userCred.user) {
          return { error: 'Sign-up failed. No user returned.' };
        }

        if (name.trim()) {
          await updateFbProfile(userCred.user, { displayName: name.trim() });
        }

        const authUser = toAuthUser(userCred.user);
        setUser(authUser);

        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? email.trim(),
          full_name: name.trim(),
          phone: authUser.phoneNumber ?? '',
          role: 'user',
        });

        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'auth/email-already-in-use') {
          return { error: 'An account with this email already exists. Please sign in instead.' };
        }
        if (error.code === 'auth/weak-password') {
          return { error: 'Password should be at least 6 characters.' };
        }
        if (error.code === 'auth/invalid-email') {
          return { error: 'Please enter a valid email address.' };
        }
        if (error.code === 'auth/operation-not-allowed') {
          return { error: 'Email sign-up is not enabled. Please contact support.' };
        }
        const msg = error.message ?? 'Sign-up failed. Please try again.';
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
        signInWithEmail,
        signUpWithEmail,
        adminLogin,
        adminResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

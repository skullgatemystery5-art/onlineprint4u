import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, type Profile } from './supabase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured } from './firebase';

type AuthUser = {
  uid: string;
  phoneNumber: string | null;
  email: string | null;
  displayName: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (otp: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  adminLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  adminResetPassword: (email: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const fetchProfile = useCallback(async (email: string) => {
    if (!email) return;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  setProfile(data as Profile | null);
}, []);
  
  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(authUser.email);
  }, [user, fetchProfile]);

  useEffect(() => {
    if (!isFirebaseConfigured || !firebaseAuth) {
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        const authUser = toAuthUser(fbUser);
        setUser(authUser);
        await fetchProfile(authUser.email);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsub();
  }, [fetchProfile]);

  const sendPhoneOtp = useCallback(
    async (phone: string, recaptchaContainerId: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Phone OTP is not configured. Please contact support.' };
      }
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      try {
        if (recaptchaVerifier) {
          try {
            recaptchaVerifier.clear();
          } catch {
            // ignore
          }
        }

        const verifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, {
          size: 'invisible',
        });
        setRecaptchaVerifier(verifier);

        const result = await signInWithPhoneNumber(firebaseAuth, fullPhone, verifier);
        setConfirmationResult(result);
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to send OTP';
        if (recaptchaVerifier) {
          try {
            recaptchaVerifier.clear();
          } catch {
            // ignore
          }
          setRecaptchaVerifier(null);
        }
        return { error: msg };
      }
    },
    [recaptchaVerifier]
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

        // Create or update profile in Supabase using Firebase UID
        const phone = authUser.phoneNumber ?? '';
        const displayName = authUser.displayName ?? 'User';
        const email = authUser.email ?? '';

        await supabase.from('profiles').upsert({
          id: authUser.uid,
          email,
          full_name: displayName,
          phone,
          role: 'user',
        }, { onConflict: 'id' });

        await fetchProfile(authUser.uid);

        try {
          recaptchaVerifier?.clear();
        } catch {
          // ignore
        }
        setRecaptchaVerifier(null);
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
    [confirmationResult, recaptchaVerifier, fetchProfile]
  );

  const sendEmailOtp = useCallback(
    async (_email: string): Promise<{ error: string | null }> => {
      return { error: 'Email login is not available. Please use phone number login.' };
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (_email: string, _token: string): Promise<{ error: string | null }> => {
      return { error: 'Email login is not available. Please use phone number login.' };
    },
    []
  );

  const adminLogin = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Admin login is not configured. Please contact support.' };
      }
      try {
        const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        const authUser = toAuthUser(cred.user);
        setUser(authUser);
        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          return { error: 'Invalid email or password.' };
        }
        if (error.code === 'auth/too-many-requests') {
          return { error: 'Too many attempts. Please try again later.' };
        }
        return { error: error.message || 'Login failed. Please try again.' };
      }
    },
    [fetchProfile]
  );

  const adminResetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Password reset is not configured. Please contact support.' };
      }
      try {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'auth/user-not-found') {
          return { error: 'No account found with this email address.' };
        }
        return { error: error.message || 'Failed to send reset email. Please try again.' };
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
    if (recaptchaVerifier) {
      try {
        recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      setRecaptchaVerifier(null);
    }
    setConfirmationResult(null);
    setUser(null);
    setProfile(null);
  }, [recaptchaVerifier]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        const: isAdmin = true;
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

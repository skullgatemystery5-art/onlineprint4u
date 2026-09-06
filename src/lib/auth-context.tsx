import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getProfile,
  upsertProfile,
  isFirebaseConfigured,
  type Profile,
} from './database';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

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
  sendOtp: (channel: 'phone' | 'email', contact: string) => Promise<SendOtpResult>;
  verifyOtp: (channel: 'phone' | 'email', contact: string, code: string) => Promise<{ error: string | null }>;
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
  sendOtp: async () => ({ error: 'Not initialized' }),
  verifyOtp: async () => ({ error: 'Not initialized' }),
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
  const [otpSending, setOtpSending] = useState(false);

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

  const sendOtp = useCallback(
    async (channel: 'phone' | 'email', contact: string): Promise<SendOtpResult> => {
      if (!isFirebaseConfigured || !app) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      setOtpSending(true);
      try {
        const functions = getFunctions(app, 'us-central1');
        const sendOtpFn = httpsCallable(functions, 'sendOtp');
        await sendOtpFn({ channel, contact });
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'functions/resource-exhausted') {
          return {
            error: 'Too many requests. Please wait 30 seconds before trying again.',
            cooldownSec: 30,
          };
        }
        if (error.code === 'functions/invalid-argument') {
          return { error: error.message || 'Invalid input. Please check and try again.' };
        }
        const msg = error.message ?? 'Failed to send verification code.';
        return { error: msg };
      } finally {
        setOtpSending(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (channel: 'phone' | 'email', contact: string, code: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !app || !firebaseAuth) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      try {
        const functions = getFunctions(app, 'us-central1');
        const verifyOtpFn = httpsCallable(functions, 'verifyOtp');
        const result = await verifyOtpFn({ channel, contact, code });
        const data = result.data as { customToken: string };

        if (!data.customToken) {
          return { error: 'Verification failed. Please try again.' };
        }

        const userCred = await signInWithCustomToken(firebaseAuth, data.customToken);
        if (!userCred.user) {
          return { error: 'Sign-in failed — no user returned.' };
        }

        const authUser = toAuthUser(userCred.user);
        setUser(authUser);

        await upsertProfile({
          id: authUser.uid,
          email: authUser.email ?? (channel === 'email' ? contact : ''),
          full_name: authUser.displayName ?? '',
          phone: authUser.phoneNumber ?? (channel === 'phone' ? contact : ''),
          role: 'user',
        });

        await fetchProfile(authUser.uid);
        return { error: null };
      } catch (err) {
        const error = err as { code?: string; message?: string };
        if (error.code === 'functions/not-found') {
          return { error: 'No code found. Please request a new one.' };
        }
        if (error.code === 'functions/deadline-exceeded') {
          return { error: 'This code has expired. Please request a new one.' };
        }
        if (error.code === 'functions/resource-exhausted') {
          return { error: 'Too many incorrect attempts. Please request a new code.' };
        }
        if (error.code === 'functions/invalid-argument') {
          return { error: error.message || 'Incorrect verification code.' };
        }
        const msg = error.message ?? 'Verification failed. Please try again.';
        return { error: msg };
      }
    },
    [fetchProfile]
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Firebase is not configured. Please contact support.' };
      }
      try {
        const userCred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!userCred.user) {
          return { error: 'Sign-in failed. No user returned.' };
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
        const msg = error.message ?? 'Sign-in failed. Please try again.';
        return { error: msg };
      }
    },
    [fetchProfile]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
      if (!isFirebaseConfigured || !firebaseAuth) {
        return { error: 'Firebase is not configured. Please contact support.' };
      }
      try {
        const userCred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
        if (!userCred.user) {
          return { error: 'Sign-up failed. No user returned.' };
        }
        if (name.trim()) {
          await firebaseUpdateProfile(userCred.user, { displayName: name.trim() });
        }
        const authUser: AuthUser = {
          uid: userCred.user.uid,
          phoneNumber: userCred.user.phoneNumber,
          email: userCred.user.email,
          displayName: name.trim(),
        };
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
          return { error: 'This email is already registered. Try signing in instead.' };
        }
        if (error.code === 'auth/invalid-email') {
          return { error: 'Please enter a valid email address.' };
        }
        if (error.code === 'auth/weak-password') {
          return { error: 'Password is too weak. Use at least 6 characters.' };
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
    setUser(null);
    setProfile(null);
  }, []);

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
        sendOtp,
        verifyOtp,
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

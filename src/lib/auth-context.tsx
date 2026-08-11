import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, type Profile } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (otp: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  sendPhoneOtp: async () => ({ error: 'Not initialized' }),
  verifyPhoneOtp: async () => ({ error: 'Not initialized' }),
  sendEmailOtp: async () => ({ error: 'Not initialized' }),
  verifyEmailOtp: async () => ({ error: 'Not initialized' }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const setSupabaseSession = useCallback(
    async (accessToken: string, refreshToken: string) => {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('Failed to set Supabase session:', error.message);
        return;
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Sync Firebase auth state — if a Firebase session exists on reload,
    // bridge it to Supabase.
    const firebaseUnsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser && !session) {
        try {
          const idToken = await fbUser.getIdToken();
          await bridgeToSupabase(idToken);
        } catch {
          // Non-blocking — user can re-authenticate
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      firebaseUnsub();
    };
  }, [fetchProfile, session]);

  const bridgeToSupabase = useCallback(
    async (firebaseToken: string): Promise<{ error: string | null }> => {
      const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/firebase-auth-bridge`;

      try {
        const res = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            firebaseToken,
            firebaseApiKey,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          return { error: errBody.error || `Bridge failed (${res.status})` };
        }

        const data = await res.json();
        if (data.error) return { error: data.error };

        await setSupabaseSession(data.access_token, data.refresh_token);
        return { error: null };
      } catch {
        return { error: 'Network error contacting auth bridge' };
      }
    },
    [setSupabaseSession]
  );

  const sendPhoneOtp = useCallback(
    async (phone: string, recaptchaContainerId: string): Promise<{ error: string | null }> => {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      try {
        // Clean up any existing verifier
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
        // Clean up failed verifier
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
        const idToken = await fbUserCred.user.getIdToken();
        const { error: bridgeError } = await bridgeToSupabase(idToken);
        if (bridgeError) return { error: bridgeError };
        // Clean up
        try {
          recaptchaVerifier?.clear();
        } catch {
          // ignore
        }
        setRecaptchaVerifier(null);
        setConfirmationResult(null);
        return { error: null };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid or expired OTP';
        // Map Firebase error codes to friendly messages
        const error = err as { code?: string };
        if (error.code === 'auth/invalid-verification-code') {
          return { error: 'Invalid verification code. Please check and try again.' };
        }
        if (error.code === 'auth/code-expired') {
          return { error: 'This code has expired. Please request a new one.' };
        }
        if (error.code === 'auth/too-many-requests') {
          return { error: 'Too many attempts. Please wait a moment and try again.' };
        }
        return { error: msg };
      }
    },
    [confirmationResult, bridgeToSupabase, recaptchaVerifier]
  );

  const sendEmailOtp = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) return { error: error.message };
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email ?? email,
          full_name: data.user.user_metadata?.full_name ?? 'User',
          phone: data.user.phone ?? '',
          role: 'user',
        }, { onConflict: 'id' });
        await fetchProfile(data.user.id);
      }
      return { error: null };
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch {
      // ignore firebase errors on signout
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, [recaptchaVerifier]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signOut,
        refreshProfile,
        sendPhoneOtp,
        verifyPhoneOtp,
        sendEmailOtp,
        verifyEmailOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getProfile, upsertProfile, isSupabaseConfigured, type Profile } from './database';
import { supabase } from './supabase';
import type { User as SupaUser } from '@supabase/supabase-js';

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
  otpSending: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPhoneOtp: (phone: string, recaptchaContainerId: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (otp: string) => Promise<{ error: string | null }>;
  sendEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  adminLogin: (email: string, password: string) => Promise<{ error: string | null }>;
  adminResetPassword: (email: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
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
  signInWithEmail: async () => ({ error: 'Not initialized' }),
  signUpWithEmail: async () => ({ error: 'Not initialized' }),
});

function toAuthUser(supaUser: SupaUser): AuthUser {
  return {
    uid: supaUser.id,
    phoneNumber: (supaUser.user_metadata?.phone as string) ?? supaUser.phone ?? null,
    email: supaUser.email ?? null,
    displayName: (supaUser.user_metadata?.full_name as string) ?? supaUser.email ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpSending, setOtpSending] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }
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
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const authUser = toAuthUser(data.session.user);
        setUser(authUser);
        fetchProfile(authUser.uid);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const authUser = toAuthUser(session.user);
          setUser(authUser);
          await fetchProfile(authUser.uid);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name } },
      });
      if (error) {
        return { error: error.message };
      }
      if (data.user) {
        await upsertProfile({
          id: data.user.id,
          email: email.trim(),
          full_name: name,
          phone: '',
          role: 'user',
        });
      }
      return { error: null };
    },
    []
  );

  const sendPhoneOtp = useCallback(
    async (_phone: string, _recaptchaContainerId: string): Promise<{ error: string | null }> => {
      return { error: 'Phone OTP login is not available. Please use email login.' };
    },
    []
  );

  const verifyPhoneOtp = useCallback(
    async (_otp: string): Promise<{ error: string | null }> => {
      return { error: 'Phone OTP login is not available. Please use email login.' };
    },
    []
  );

  const sendEmailOtp = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    []
  );

  const verifyEmailOtp = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: 'email',
      });
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    []
  );

  const adminLogin = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return { error: 'Invalid email or password.' };
      }
      if (data.user) {
        await upsertProfile({
          id: data.user.id,
          email: email.trim(),
          full_name: 'Admin',
          phone: '',
          role: 'admin',
        });
        await fetchProfile(data.user.id);
      }
      return { error: null };
    },
    [fetchProfile]
  );

  const adminResetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { error: 'Authentication is not configured. Please contact support.' };
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        return { error: error.message };
      }
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
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
        sendPhoneOtp,
        verifyPhoneOtp,
        sendEmailOtp,
        verifyEmailOtp,
        adminLogin,
        adminResetPassword,
        signInWithEmail,
        signUpWithEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

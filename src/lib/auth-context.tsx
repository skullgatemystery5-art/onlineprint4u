import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, type Profile } from './supabase';

export type DummyUser = {
  id: string;
  email: string;
  phone: string;
  user_metadata: { full_name: string };
};

type AuthContextType = {
  user: DummyUser | null;
  session: null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInDummy: (identifier: { email?: string; phone?: string }, fullName?: string) => Promise<void>;
};

const STORAGE_KEY = 'op4u_dummy_auth';

const DUMMY_OTP_CODE = '123456';
export { DUMMY_OTP_CODE };

function getStoredAuth(): DummyUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DummyUser;
  } catch {
    return null;
  }
}

function storeAuth(user: DummyUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  signInDummy: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DummyUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) {
      setUser(stored);
      fetchProfile(stored.id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const signInDummy = useCallback(
    async (identifier: { email?: string; phone?: string }, fullName?: string) => {
      const email = identifier.email ?? '';
      const phone = identifier.phone ?? '';
      const name = fullName ?? 'User';
      const userId = `dummy-${email || phone}-${Date.now()}`;

      const dummyUser: DummyUser = {
        id: userId,
        email,
        phone,
        user_metadata: { full_name: name },
      };

      storeAuth(dummyUser);
      setUser(dummyUser);

      // Best-effort profile sync to Supabase — non-blocking
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          full_name: name,
          phone,
          role: 'user',
        });
        await fetchProfile(userId);
      } catch {
        // Non-blocking — dummy auth still works
      }
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    storeAuth(null);
    setUser(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session: null,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signOut,
        refreshProfile,
        signInDummy,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

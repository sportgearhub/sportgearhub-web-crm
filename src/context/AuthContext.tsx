import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser, ProviderMembership } from '../types';
import { ApiError, authApi } from '../lib/api-client';

interface AuthContextType {
  user: AuthUser | null;
  memberships: ProviderMembership[];
  activeMembership: ProviderMembership | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadUser: () => Promise<{ user: AuthUser; memberships: ProviderMembership[] } | null>;
  sessionExpired: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

type SessionSnapshot = { user: AuthUser; memberships: ProviderMembership[] };

let sessionLoadPromise: Promise<SessionSnapshot | null> | null = null;

function isPublicAuthEntry() {
  return window.location.pathname.startsWith('/auth');
}

async function loadSessionSnapshot() {
  if (!sessionLoadPromise) {
    sessionLoadPromise = authApi.me()
      .then(async currentUser => {
        const currentMemberships = await authApi.providerMemberships();
        return { user: currentUser, memberships: currentMemberships };
      })
      .finally(() => {
        sessionLoadPromise = null;
      });
  }

  return sessionLoadPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [memberships, setMemberships] = useState<ProviderMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (isPublicAuthEntry()) {
      setLoading(false);
      return;
    }

    void reloadUser();
  }, []);

  const reloadUser = async () => {
    setLoading(true);
    try {
      const session = await loadSessionSnapshot();
      if (!session) return null;
      setUser(session.user);
      setMemberships(session.memberships);
      setSessionExpired(false);
      return session;
    } catch (error) {
      setUser(null);
      setMemberships([]);
      if (error instanceof ApiError && error.status === 401) {
        setSessionExpired(true);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const loginUser = await authApi.login(email, password);
    const currentUser = await authApi.me().catch(() => loginUser);
    const nextUser = {
      ...currentUser,
      emailVerified: loginUser.emailVerified ?? currentUser.emailVerified,
    };
    const currentMemberships = nextUser.emailVerified === false ? [] : await authApi.providerMemberships();
    setUser(nextUser);
    setMemberships(currentMemberships);
    setSessionExpired(false);
  };

  const signOut = async () => {
    await authApi.signout().catch(() => undefined);
    setUser(null);
    setMemberships([]);
    setSessionExpired(false);
  };

  const activeMembership = memberships[0] ?? null;

  return (
    <AuthContext.Provider value={{ user, memberships, activeMembership, loading, signIn, signOut, reloadUser, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

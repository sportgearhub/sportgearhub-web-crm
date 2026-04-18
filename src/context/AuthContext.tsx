import { createContext, useState, useEffect, ReactNode } from 'react';
import type { AuthUser } from '../types';
import { mockUser } from '../lib/mock-data';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sessionExpired: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('crm_session');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    void password;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const u = { ...mockUser, email };
    setUser(u);
    localStorage.setItem('crm_session', JSON.stringify(u));
    setSessionExpired(false);
    setLoading(false);
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('crm_session');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

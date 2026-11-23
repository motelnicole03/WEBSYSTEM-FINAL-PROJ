import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api';
import { AuthUser, CurrentUser } from '../types';

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (payload: Record<string, unknown>) => Promise<CurrentUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const me = await api.get<CurrentUser>('/auth/me');
    setUser(me);
    return me;
  }, []);

  // On first load, restore the session if a token is stored
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    loadMe()
      .catch(() => tokenStore.clear()) // expired or invalid token
      .finally(() => setLoading(false));
  }, [loadMe]);

  const finishAuth = async (result: { token: string; user: AuthUser }) => {
    tokenStore.set(result.token);
    return loadMe();
  };

  const login = async (email: string, password: string) =>
    finishAuth(await api.post('/auth/login', { email, password }));

  const register = async (payload: Record<string, unknown>) =>
    finishAuth(await api.post('/auth/register', payload));

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/** Where each role lands after logging in. */
export const homeFor = (role: CurrentUser['role']) =>
  role === 'employer' ? '/employer' : role === 'admin' ? '/admin' : '/';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, api, type User } from './api';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// The UI keeps only the displayed user; the session token stays in the httpOnly cookie (F-01 section 2).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    api<User>('/me')
      .then(setUser)
      .catch((err: ApiError) => {
        setUser(null);
        if (err.status !== 401) setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(reload, [reload]);

  const login = async (email: string, password: string) => {
    await api('/auth/login', { method: 'POST', body: { email, password } });
    setUser(await api<User>('/me'));
  };

  const logout = async () => {
    await api('/auth/logout', { method: 'POST', body: {} });
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, error, reload, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

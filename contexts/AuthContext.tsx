'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { adminLogin as apiAdminLogin, fetchCsrfToken, setUnauthorizedHandler } from '@/lib/api';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('admin_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
  );
  const router = useRouter();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      router.push('/login');
    });
  }, [router]);

  const login = async (email: string, password: string) => {
    await fetchCsrfToken();
    const res = await apiAdminLogin(email, password);
    const { token: t, data } = res.data;
    setToken(t);
    setUser(data.user);
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('csrf_token');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

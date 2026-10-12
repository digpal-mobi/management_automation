'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (data: { login: string; password: string }) => Promise<boolean>;
  register: (data: { email: string; username: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Memory storage for access token
let memoryAccessToken: string | null = null;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const setToken = (token: string | null) => {
    memoryAccessToken = token;
    setAccessToken(token);
  };

  // Refresh token call
  const refreshTokens = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Includes HTTP-only cookie
      });

      if (!res.ok) {
        setToken(null);
        setUser(null);
        return null;
      }

      const data = await res.json();
      if (data.success && data.accessToken) {
        setToken(data.accessToken);
        setUser(data.user);
        return data.accessToken;
      }
    } catch {
      setToken(null);
      setUser(null);
    }
    return null;
  }, []);

  // Try to restore session on initial load
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      await refreshTokens();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshTokens]);

  // Route protection
  useEffect(() => {
    if (isLoading) return;

    const publicRoutes = ['/login', '/register'];
    const isPublic = publicRoutes.includes(pathname);

    if (!user && !isPublic) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user && isPublic) {
      router.push('/');
    }
  }, [user, isLoading, pathname, router]);

  // Interceptor for API calls
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});

      if (memoryAccessToken) {
        headers.set('Authorization', `Bearer ${memoryAccessToken}`);
      }

      let response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // If token expired, try automatic refresh once
      if (response.status === 401 && !url.includes('/api/auth/')) {
        const newAccessToken = await refreshTokens();
        if (newAccessToken) {
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        } else {
          toast.error('Session expired. Please log in again.');
          router.push('/login');
        }
      }

      return response;
    },
    [refreshTokens, router]
  );

  const login = async (credentials: { login: string; password: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Login failed');
        return false;
      }

      setToken(data.accessToken);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      router.push('/');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Network error during login');
      return false;
    }
  };

  const register = async (credentials: {
    email: string;
    username: string;
    password: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Registration failed');
        return false;
      }

      setToken(data.accessToken);
      setUser(data.user);
      toast.success(`Account created! Welcome, ${data.user.username}`);
      router.push('/');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Network error during registration');
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore
    } finally {
      setToken(null);
      setUser(null);
      toast.info('Logged out');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

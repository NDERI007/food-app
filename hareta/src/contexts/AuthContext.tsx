import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  email: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/context-verif', {
        withCredentials: true,
      });
      const data = response.data;

      if (data?.authenticated && data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login (called after successful OTP verification)
  const login = useCallback((email: string) => {
    setUser({ email });
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const response = await axios.post(
        'api/auth/logout',
        {},
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        },
      );
      if (response.status >= 200 && response.status < 300) {
        setUser(null);
      } else {
        // non-2xx — still clear user locally, but log it
        console.warn('Logout returned non-2xx status', response.status);
        setUser(null);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // clear user locally even if remote logout fails
      setUser(null);
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    checkAuth,
    logout,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

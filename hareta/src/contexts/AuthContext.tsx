import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';

interface User {
  email: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkAuth: () => Promise<User | null>;
  logout: () => Promise<void>;
  login: (email: string, role: string) => void;
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

      const { authenticated, user } = response.data;
      if (authenticated && user) {
        setUser(user);

        // Initialize user-specific stores
        useCartStore.getState().setUserId(user.email);
        useDeliveryStore.getState().setUserId(user.email);

        return user;
      } else {
        setUser(null);

        // Switch to guest storage
        useCartStore.getState().setUserId(null);
        useDeliveryStore.getState().setUserId(null);

        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);

      // Switch to guest storage on error
      useCartStore.getState().setUserId(null);
      useDeliveryStore.getState().setUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login (called after successful OTP verification)
  const login = useCallback((email: string, role: string) => {
    setUser({ email, role });

    // Initialize user-specific stores
    useCartStore.getState().setUserId(email);
    useDeliveryStore.getState().setUserId(email);
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

        // Switch to guest storage and clear data
        useCartStore.getState().setUserId(null);
        useDeliveryStore.getState().setUserId(null);
        useCartStore.getState().clearCart();
        useDeliveryStore.getState().clearDelivery();
      } else {
        console.warn('Logout returned non-2xx status', response.status);
        setUser(null);

        // Still clear stores
        useCartStore.getState().setUserId(null);
        useDeliveryStore.getState().setUserId(null);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);

      // Clear stores even on error
      useCartStore.getState().setUserId(null);
      useDeliveryStore.getState().setUserId(null);
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

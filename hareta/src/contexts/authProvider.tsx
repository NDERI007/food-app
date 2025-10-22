import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { type User, type AuthContextType, AuthContext } from './AuthContext';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status
  const checkAuth = useCallback(async (): Promise<User | null> => {
    try {
      const response = await axios.get('/api/auth/context-verif', {
        withCredentials: true,
      });

      const { authenticated, user } = response.data;
      if (authenticated && user) {
        setUser(user);

        useCartStore.getState().setUserId(user.email);
        useDeliveryStore.getState().setUserId(user.email);

        return user;
      } else {
        setUser(null);

        useCartStore.getState().setUserId(null);
        useDeliveryStore.getState().setUserId(null);

        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);

      useCartStore.getState().setUserId(null);
      useDeliveryStore.getState().setUserId(null);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback((email: string, role: string) => {
    setUser({ email, role });
    useCartStore.getState().setUserId(email);
    useDeliveryStore.getState().setUserId(email);
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout', null, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

      setUser(null);
      useCartStore.getState().setUserId(null);
      useDeliveryStore.getState().setUserId(null);
      useCartStore.getState().clearCart();
      useDeliveryStore.getState().clearDelivery();
    } catch (error) {
      console.error('Logout failed:', error);
      setUser(null);
      useCartStore.getState().setUserId(null);
      useDeliveryStore.getState().setUserId(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    checkAuth,
    logout,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

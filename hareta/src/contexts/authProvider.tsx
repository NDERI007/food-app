import React, { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { type User, type AuthContextType, AuthContext } from './AuthContext';
import { api } from '@utils/hooks/apiUtils';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1️⃣ Restore last known user instantly (just for UI state)
  useEffect(() => {
    const saved = localStorage.getItem('auth-user');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUser(parsed);
      useCartStore.getState().setUserId(parsed.email);
      useDeliveryStore.getState().setUserId(parsed.email);
    }
  }, []);

  // 2️⃣ Securely verify user with backend
  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/context-verif', {
        withCredentials: true,
      });

      const { authenticated, user: serverUser } = response.data;

      if (authenticated && serverUser) {
        const authUser: User = {
          email: serverUser.email,
          role: serverUser.role,
        };
        setUser(authUser);
        localStorage.setItem('auth-user', JSON.stringify(authUser));

        useCartStore.getState().setUserId(authUser.email);
        useDeliveryStore.getState().setUserId(authUser.email);

        return authUser;
      } else {
        logout();
        return null;
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 3️⃣ Login
  const login = useCallback((email: string, role: string) => {
    const authUser: User = { email, role };
    setUser(authUser);
    localStorage.setItem('auth-user', JSON.stringify(authUser));

    useCartStore.getState().setUserId(email);
    useDeliveryStore.getState().setUserId(email);
  }, []);

  //Logout
  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem('auth-user');

    useCartStore.getState().setUserId(null);
    useDeliveryStore.getState().setUserId(null);

    useCartStore.getState().clearCart();
    useDeliveryStore.getState().clearDelivery();
  }, []);

  //Run check once on mount AFTER initial restore
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

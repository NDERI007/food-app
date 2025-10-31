import React, { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@utils/hooks/useCrt';
import { useDeliveryStore } from '@utils/hooks/deliveryStore';
import { type User, type AuthContextType, AuthContext } from './AuthContext';
import { api } from '@utils/hooks/apiUtils';
import axios from 'axios';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper: Sync user to all stores
  const syncUserToStores = useCallback((authUser: User) => {
    setUser(authUser);
    useCartStore.getState().setUserId(authUser.email);
    useDeliveryStore.getState().setUserId(authUser.email);
  }, []);

  // Helper: Clear user from all stores
  const clearUserFromStores = useCallback(() => {
    setUser(null);
    useCartStore.getState().setUserId(null);
    useDeliveryStore.getState().setUserId(null);
  }, []);

  // Check authentication with backend
  const checkAuth = useCallback(async (): Promise<User | null> => {
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

        syncUserToStores(authUser);
        return authUser;
      } else {
        // Backend says not authenticated
        clearUserFromStores();
        return null;
      }
    } catch (err) {
      console.error('Auth check failed:', err);

      // On network error, don't clear user immediately
      // This prevents logout on temporary network issues
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Explicit auth failure - clear user
          clearUserFromStores();
        }
        // For other errors (500, network), keep user as-is
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [syncUserToStores, clearUserFromStores]);

  // Login - syncs user from verify-otp response
  const login = useCallback(
    (email: string, role: string) => {
      const authUser: User = { email, role };
      syncUserToStores(authUser);
    },
    [syncUserToStores],
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.get('/api/auth/logout', { withCredentials: true });
    } catch (err) {
      console.warn('Logout API call failed:', err);
    }

    // Clear all state
    clearUserFromStores();
    useCartStore.getState().clearCart();
    useDeliveryStore.getState().clearDelivery();
  }, [clearUserFromStores]);

  // Run auth check on mount
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

import { createContext } from 'react';

export interface User {
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

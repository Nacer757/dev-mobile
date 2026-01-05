import React, { createContext, useContext, useEffect, useState } from 'react';
import { signIn, logOut, getUserById, onAuthChange, changePassword } from '../services/AuthService';
import type { User } from '../types/models';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getUserById(firebaseUser.uid);
          setUser(userData);
        } catch (e) {
          console.warn('Error fetching user data', e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userData = await signIn(email, password);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await logOut();
    setUser(null);
  };

  const updatePassword = async (newPassword: string) => {
    await changePassword(newPassword);
    // Refresh user data
    if (user) {
      const userData = await getUserById(user.uid);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      signIn: login, 
      logOut: logout, 
      updatePassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

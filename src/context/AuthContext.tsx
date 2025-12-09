"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  role: 'admin' | 'user' | null;
  claimsLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  claimsLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'admin' | 'user' | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setClaimsLoading(true);
      setUser(user);
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const userRole = idTokenResult.claims.role;
        if (userRole === 'admin') {
          setRole('admin');
        } else {
          setRole('user');
        }
      } else {
        setRole(null);
      }
      setClaimsLoading(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, claimsLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

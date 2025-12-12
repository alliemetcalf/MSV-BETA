'use client';

import { useState, useEffect, useMemo } from 'react';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserProfile } from '@/types/user-profile';

// Return type for useUser() - combines auth state and profile data
export interface UserHookResult { 
  user: User | null;
  userProfile: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * Hook for accessing the complete user state, including both Firebase Auth
 * user object and the corresponding Firestore user profile document.
 * @returns {UserHookResult} Object with user, userProfile, loading status, and error.
 */
export const useUser = (): UserHookResult => {
  const auth = useContext(FirebaseContext)?.auth ?? null;
  const firestore = useFirestore();

  const [authState, setAuthState] = useState<{
    user: User | null;
    isAuthLoading: boolean;
    authError: Error | null;
  }>({
    user: auth ? auth.currentUser : null,
    isAuthLoading: true,
    authError: null,
  });

  useEffect(() => {
    if (!auth) {
      setAuthState({ user: null, isAuthLoading: false, authError: null });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setAuthState({ user: firebaseUser, isAuthLoading: false, authError: null });
      },
      (error) => {
        console.error("useUser: onAuthStateChanged error:", error);
        setAuthState({ user: null, isAuthLoading: false, authError: error });
      }
    );
    return () => unsubscribe();
  }, [auth]);

  const userProfileRef = useMemoFirebase(
    () => (authState.user ? doc(firestore, 'users', authState.user.uid) : null),
    [firestore, authState.user]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

  return {
    user: authState.user,
    userProfile,
    isUserLoading: authState.isAuthLoading || isProfileLoading,
    userError: authState.authError,
  };
};

// Re-export the context for direct usage if needed, but useUser is preferred
import { FirebaseContext } from '../provider';
import { useContext } from 'react';

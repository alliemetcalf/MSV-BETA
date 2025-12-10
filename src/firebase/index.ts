'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// This holds the initialized services as a singleton.
let firebaseServices: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
} | null = null;


/**
 * Initializes and returns a singleton instance of Firebase services.
 * This function is idempotent and safe to call multiple times.
 */
export function initializeFirebase() {
  // If the singleton is already initialized, return it immediately.
  if (firebaseServices) {
    return firebaseServices;
  }

  // Check if a Firebase app has already been initialized.
  // If not, initialize a new one with the provided configuration.
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  // Get instances of the required Firebase services.
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  // Store the initialized services in the singleton variable.
  firebaseServices = {
    firebaseApp: app,
    auth,
    firestore,
    storage,
  };

  // Return the services.
  return firebaseServices;
}


export * from './provider';
export * from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

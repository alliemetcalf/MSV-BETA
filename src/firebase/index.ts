'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// This holds the initialized services.
let firebaseServices: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
} | null = null;


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // If services are already initialized, return them immediately.
  // This is the core of the fix to make initialization truly idempotent.
  if (firebaseServices) {
    return firebaseServices;
  }
  
  // If no apps are initialized, initialize a new one.
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    firebaseServices = getSdks(firebaseApp);
    return firebaseServices;
  }
  
  // If an app is already initialized (e.g. by another part of the system),
  // get that app and its services.
  const firebaseApp = getApp();
  firebaseServices = getSdks(firebaseApp);
  return firebaseServices;
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
'use server';
/**
 * @fileOverview Initializes the Firebase Admin SDK for backend use.
 *
 * This file centralizes the initialization of the Firebase Admin SDK,
 * preventing re-initialization across different server-side modules.
 * It exports the initialized Firestore database and Auth services.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import serviceAccount from '@/../firebase-service-account.json';

let adminApp: App;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApps()[0];
}

auth = getAuth(adminApp);
db = getFirestore(adminApp);

export { db, auth };

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
// The type assertion is necessary because of how dynamic imports work, but the JSON is loaded correctly.
import serviceAccount from '@/../firebase-service-account.json';

const ADMIN_APP_NAME = 'admin';

let adminApp: App;
let auth: Auth;
let db: Firestore;

// This logic ensures we're using a specific, named app instance.
// This is more robust against hot-reloading issues than relying on the default app.
const existingApp = getApps().find(app => app.name === ADMIN_APP_NAME);

if (existingApp) {
  adminApp = existingApp;
} else {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  }, ADMIN_APP_NAME);
}

auth = getAuth(adminApp);
db = getFirestore(adminApp);

export { db, auth };

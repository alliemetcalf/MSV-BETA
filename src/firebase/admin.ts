
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// This is a lazy-loaded singleton for the Firebase Admin App.
let app: App | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This is idempotent and safe to call multiple times.
 */
function initializeAdminApp(): App {
  if (getApps().length === 0) {
    // When running in a serverless environment, the GOOGLE_APPLICATION_CREDENTIALS
    // env var is used to automatically configure the credentials.
    // In a local dev environment, this var must be set in your .env file.
    app = initializeApp();
  } else {
    app = getApp();
  }
  return app;
}


export async function getAdminAuth(): Promise<Auth> {
    const adminApp = initializeAdminApp();
    return getAuth(adminApp);
}

export async function getAdminFirestore(): Promise<Firestore> {
    const adminApp = initializeAdminApp();
    return getFirestore(adminApp);
}

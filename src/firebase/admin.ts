
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import serviceAccount from '@/../firebase-service-account.json';

// This is a lazy-loaded singleton for the Firebase Admin App.
let app: App | null = null;

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This is idempotent and safe to call multiple times.
 */
function initializeAdminApp(): App {
  if (app) {
    return app;
  }

  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(serviceAccount as any),
    });
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

'use server';

import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import serviceAccount from '@/../firebase-service-account.json';

let app: App;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount as any),
  });
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);

export function getAdminApp(): App {
    return app;
}

export function getAdminAuth(): Auth {
    return auth;
}

export function getAdminFirestore(): Firestore {
    return db;
}

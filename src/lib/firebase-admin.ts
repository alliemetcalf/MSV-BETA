import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import serviceAccount from '@/../firebase-service-account.json';

let app: App;

const databaseURL = `https://${serviceAccount.project_id}.firebaseio.com`;

if (!getApps().length) {
  app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: databaseURL,
  });
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { db, auth };

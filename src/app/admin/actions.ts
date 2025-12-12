'use server';

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CreateUserInputSchema, type CreateUserInput } from '@/ai/schemas/user-schemas';

// This is safe to be in the code, as it's a server-only file.
const serviceAccount = require('../../../firebase-service-account.json');

let adminApp: App;

// Idempotent initialization of the Firebase Admin SDK
function getInitializedAdminApp(): App {
  if (getApps().some(app => app.name === 'admin')) {
    return getApps().find(app => app.name === 'admin')!;
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  }, 'admin');
  
  return adminApp;
}


export async function createUserAction(data: CreateUserInput): Promise<{ message: string; error?: string; }> {
  try {
    const parsedData = CreateUserInputSchema.safeParse(data);
    if (!parsedData.success) {
      // Create a more detailed error message from Zod's errors.
      const errorDetails = parsedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { message: '', error: `Invalid input data. ${errorDetails}` };
    }

    const { email, password, displayName, role } = parsedData.data;
    
    // Get the initialized admin app instance.
    const app = getInitializedAdminApp();

    // Pass the app instance explicitly to the services.
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 1. Create the user in Firebase Authentication.
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // 2. Create the user profile document in Firestore.
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set({
      email,
      role,
      displayName,
      bio: '', // Initialize with an empty bio.
    });

    return { message: `Successfully created user ${userRecord.email} with UID ${userRecord.uid}` };

  } catch (error: any) {
    console.error('API Error: Failed to create user:', error);

    const errorMessage = error.code === 'auth/email-already-exists'
      ? 'This email address is already in use by another account.'
      : error.message || 'An internal server error occurred.';
      
    return { message: '', error: errorMessage };
  }
}

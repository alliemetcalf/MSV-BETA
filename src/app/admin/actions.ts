'use server';

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CreateUserInputSchema, type CreateUserInput } from '@/ai/schemas/user-schemas';

// This is safe to be in the code, as it's a server-only file.
const serviceAccount = require('../../../firebase-service-account.json');

/**
 * Ensures that the Firebase Admin SDK is initialized, and returns the initialized App instance.
 * This function is idempotent, meaning it can be called multiple times without re-initializing.
 * It uses a named app 'admin' to avoid conflicts with any client-side initializations.
 */
function initializeAdminApp(): App {
  const adminAppName = 'admin';
  // Check if an app with the name 'admin' already exists
  const existingApp = getApps().find(app => app.name === adminAppName);
  if (existingApp) {
    // If it exists, return it
    return existingApp;
  }
  // Otherwise, initialize a new app with the 'admin' name
  return initializeApp({
    credential: cert(serviceAccount),
  }, adminAppName);
}

export async function createUserAction(data: CreateUserInput): Promise<{ message: string; error?: string; }> {
  try {
    const parsedData = CreateUserInputSchema.safeParse(data);
    if (!parsedData.success) {
      const errorDetails = parsedData.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { message: '', error: `Invalid input data. ${errorDetails}` };
    }

    const { email, password, displayName, role } = parsedData.data;
    
    // Get the initialized admin app instance. This is the crucial step.
    const adminApp = initializeAdminApp();

    // Pass the app instance explicitly to the services.
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

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

    // Provide a more user-friendly error message for common issues.
    const errorMessage = error.code === 'auth/email-already-exists'
      ? 'This email address is already in use by another account.'
      : error.message || 'An internal server error occurred.';
      
    return { message: '', error: errorMessage };
  }
}

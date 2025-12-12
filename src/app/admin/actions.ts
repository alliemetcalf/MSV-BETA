'use server';

import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CreateUserInputSchema, CreateUserInput } from '@/ai/schemas/user-schemas';

// This is safe to be in the code, as it's a server-only file.
const serviceAccount = require('../../../firebase-service-account.json');

// Initialize Firebase Admin SDK idempotently.
function initializeAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }
  return getApp();
}

export async function createUserAction(data: CreateUserInput): Promise<{ message: string; error?: string; }> {
  try {
    const parsedData = CreateUserInputSchema.safeParse(data);
    if (!parsedData.success) {
      return { message: '', error: 'Invalid input data.' };
    }

    const { email, password, displayName, role } = parsedData.data;
    
    const adminApp = initializeAdmin();
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

    const errorMessage = error.code === 'auth/email-already-exists'
      ? 'This email address is already in use by another account.'
      : error.message || 'An internal server error occurred.';
      
    return { message: '', error: errorMessage };
  }
}

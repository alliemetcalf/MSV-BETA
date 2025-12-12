'use server';
/**
 * @fileOverview A flow for creating a new user with a specified role.
 *
 * - createUser - A function that handles the user creation process.
 */

import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import serviceAccount from '@/../firebase-service-account.json';
import {
  CreateUserInputSchema,
  type CreateUserInput,
} from '@/ai/schemas/user-schemas';

// Initialize Firebase Admin SDK if not already initialized
let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount as any),
  });
} else {
  app = getApp();
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const auth = getAuth(app);
      const db = getFirestore(app);

      // 1. Create the user in Firebase Authentication
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.displayName,
      });

      // 2. Create the user profile document in Firestore
      const userDocRef = db.collection('users').doc(userRecord.uid);
      await userDocRef.set({
        email: input.email,
        role: input.role,
        displayName: input.displayName,
        bio: '', // Add empty bio field
      });

      return `Successfully created user ${userRecord.email} with UID ${userRecord.uid}`;
    } catch (error: any) {
      console.error('Error creating user:', error);
      // Throwing the error will propagate it to the client call,
      // where it can be caught and displayed in a toast.
      throw new Error(error.message || 'An unexpected error occurred.');
    }
  }
);

export async function createUser(input: CreateUserInput): Promise<string> {
  return await createUserFlow(input);
}

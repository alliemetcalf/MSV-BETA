'use server';
/**
 * @fileOverview A flow for creating a new user with a specified role.
 *
 * - createUserFlow - A function that handles the user creation process.
 * - CreateUserInput - The input type for the createUserFlow function.
 */

import {initializeApp, getApps, cert, getApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import serviceAccount from '@/../firebase-service-account.json';

// Initialize Firebase Admin SDK if not already initialized
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth(getApp());
const db = getFirestore(getApp());

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['superadmin', 'manager', 'contractor', 'user']),
  displayName: z.string(),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export async function createUser(input: CreateUserInput) {
  return await createUserFlow(input);
}

export const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
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

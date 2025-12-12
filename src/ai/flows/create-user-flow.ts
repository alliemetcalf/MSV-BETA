'use server';
/**
 * @fileOverview A flow for creating a new user with a specified role.
 *
 * - createUser - A function that handles the user creation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  CreateUserInputSchema,
  type CreateUserInput,
} from '@/ai/schemas/user-schemas';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';


const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const auth = getAdminAuth();
      const db = getAdminFirestore();

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

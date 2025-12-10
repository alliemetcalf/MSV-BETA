'use server';
/**
 * @fileOverview A flow for creating a Firebase user with a custom role.
 *
 * - createUser - Creates a user and assigns a role.
 * - CreateUserInput - The input type for the createUser function.
 * - CreateUserOutput - The return type for the createUser function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '@/../firebase-service-account.json';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'user', 'assistant']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    try {
      const userRecord = await getAuth().createUser({
        email: input.email,
        password: input.password,
      });

      // Instead of custom claims, create a user profile document with the role.
      const db = getFirestore();
      await db.collection('users').doc(userRecord.uid).set({
        role: input.role,
        email: userRecord.email,
        displayName: userRecord.displayName || '',
      });

      return {
        uid: userRecord.uid,
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'An unknown error occurred.',
      };
    }
  }
);

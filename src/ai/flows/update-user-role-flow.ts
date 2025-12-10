'use server';
/**
 * @fileOverview A flow for updating a user's role in their Firestore document.
 *
 * - updateUserRole - Updates a user's role.
 * - UpdateUserRoleInput - The input type for the updateUserRole function.
 * - UpdateUserRoleOutput - The return type for the updateUserRole function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '@/../firebase-service-account.json';

const UpdateUserRoleInputSchema = z.object({
  uid: z.string(),
  role: z.enum(['admin', 'user', 'assistant']),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

const UpdateUserRoleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserRoleOutput = z.infer<typeof UpdateUserRoleOutputSchema>;

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function updateUserRole(
  input: UpdateUserRoleInput
): Promise<UpdateUserRoleOutput> {
  return updateUserRoleFlow(input);
}

const updateUserRoleFlow = ai.defineFlow(
  {
    name: 'updateUserRoleFlow',
    inputSchema: UpdateUserRoleInputSchema,
    outputSchema: UpdateUserRoleOutputSchema,
  },
  async (input) => {
    try {
      const db = getFirestore();
      const userRef = db.collection('users').doc(input.uid);

      await userRef.set({ role: input.role }, { merge: true });

      return {
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

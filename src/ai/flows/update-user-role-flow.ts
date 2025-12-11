'use server';
/**
 * @fileOverview A flow for updating a user's role in their Firestore document and as a custom claim.
 *
 * - updateUserRole - Updates a user's role.
 * - UpdateUserRoleInput - The input type for the updateUserRole function.
 * - UpdateUserRoleOutput - The return type for the updateUserRole function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db, auth } from '@/lib/firebase-admin';

const UpdateUserRoleInputSchema = z.object({
  uid: z.string(),
  role: z.enum(['superadmin', 'manager', 'contractor', 'user']),
});
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleInputSchema>;

const UpdateUserRoleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type UpdateUserRoleOutput = z.infer<typeof UpdateUserRoleOutputSchema>;


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
      const { uid, role } = input;
      
      const userRef = db.collection('users').doc(uid);
      await userRef.set({ role: role }, { merge: true });
      await auth.setCustomUserClaims(uid, { role: role });

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

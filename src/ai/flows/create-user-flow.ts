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
import { db, auth } from '@/lib/firebase-admin';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['superadmin', 'manager', 'contractor', 'user']),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  uid: z.string().optional(),
  success: z.boolean(),
  message: z.string().optional(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;


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
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
      });

      // Create a user profile document with the role.
      await db.collection('users').doc(userRecord.uid).set({
        role: input.role,
        email: input.email,
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

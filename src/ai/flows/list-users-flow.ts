'use server';
/**
 * @fileOverview A flow for listing all Firebase users and their roles.
 *
 * - listUsers - Retrieves all users.
 * - ListUsersOutput - The return type for the listUsers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '@/../firebase-service-account.json';

const UserSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  role: z.string().default('user'),
});

const ListUsersOutputSchema = z.array(UserSchema);
export type ListUsersOutput = z.infer<typeof ListUsersOutputSchema>;

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export async function listUsers(): Promise<ListUsersOutput> {
  return listUsersFlow();
}

const listUsersFlow = ai.defineFlow(
  {
    name: 'listUsersFlow',
    outputSchema: ListUsersOutputSchema,
  },
  async () => {
    try {
      const userRecords = await getAuth().listUsers();
      const users = userRecords.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.customClaims?.['role'] || 'user',
      }));
      return users;
    } catch (error: any) {
      console.error('Error listing users:', error);
      // In case of an error, return an empty array or handle as needed
      return [];
    }
  }
);

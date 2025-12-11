'use server';
/**
 * @fileOverview A flow for listing all Firebase users and their roles.
 *
 * - listUsers - Retrieves all users.
 * - ListUsersOutput - The return type for the listUsers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import serviceAccount from '@/../firebase-service-account.json';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db: Firestore = getFirestore();
const auth: Auth = getAuth();


const UserSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
  role: z.string().default('user'),
});

const ListUsersOutputSchema = z.array(UserSchema);
export type ListUsersOutput = z.infer<typeof ListUsersOutputSchema>;


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
      const userRecords = await auth.listUsers();

      const userPromises = userRecords.users.map(async (user) => {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const role = userDoc.exists ? userDoc.data()?.role : 'user';

        return {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: role || 'user',
        };
      });

      return await Promise.all(userPromises);
    } catch (error: any) {
      console.error('Error listing users:', error);
      return [];
    }
  }
);

'use server';
/**
 * @fileOverview A flow for listing all Firebase users and their roles.
 *
 * - listUsers - Retrieves all users.
 * - ListUsersOutput - The return type for the listUsers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db, auth } from '@/lib/firebase-admin';

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
      const listUsersResult = await auth.listUsers();
      const authUsers = listUsersResult.users;

      // Get all user profile documents from Firestore in one go.
      const usersCollectionSnapshot = await db.collection('users').get();
      const firestoreUsers = new Map(
        usersCollectionSnapshot.docs.map(doc => [doc.id, doc.data()])
      );

      const combinedUsers = authUsers.map(authUser => {
        const firestoreUser = firestoreUsers.get(authUser.uid);
        
        // If user document doesn't exist, create it.
        if (!firestoreUser) {
           db.collection('users').doc(authUser.uid).set({
            email: authUser.email,
            role: 'user',
          });
        }
        
        return {
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          role: firestoreUser?.role || 'user',
        };
      });

      return combinedUsers;

    } catch (error: any) {
      console.error('Error listing users:', error);
      // It's better to return an empty array on error than to crash.
      return [];
    }
  }
);
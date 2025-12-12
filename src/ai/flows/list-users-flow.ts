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
      const users = listUsersResult.users;

      const combinedUsers = await Promise.all(
        users.map(async (user) => {
          const userDocRef = db.collection('users').doc(user.uid);
          const userDoc = await userDocRef.get();
          
          let role = 'user';
          if (userDoc.exists) {
            role = userDoc.data()?.role || 'user';
          } else {
            // If doc doesn't exist, create it with a default role
            await userDocRef.set({ 
              email: user.email,
              role: 'user' 
            });
          }

          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: role,
          };
        })
      );
      
      return combinedUsers;

    } catch (error: any) {
      console.error('Error listing users:', error);
      // Throw the error so the client can see what went wrong.
      throw new Error(`Failed to list users: ${error.message}`);
    }
  }
);

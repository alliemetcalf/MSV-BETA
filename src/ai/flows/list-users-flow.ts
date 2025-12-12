'use server';
/**
 * @fileOverview A flow for listing all Firebase users and their roles.
 *
 * - listUsers - Fetches all users from Firebase Auth and their roles from Firestore.
 * - ListUsersOutput - The output type for the listUsers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db, auth } from '@/lib/firebase-admin';
import { UserProfile } from '@/types/user-profile';

const UserWithRoleSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  role: z.enum(['superadmin', 'manager', 'contractor', 'user', 'admin']).optional(),
});

const ListUsersOutputSchema = z.object({
  users: z.array(UserWithRoleSchema),
  error: z.string().optional(),
});
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
      // 1. Fetch all users from Firebase Authentication
      const userRecords = await auth.listUsers();

      // 2. Fetch all user profile documents from Firestore
      const firestoreUsersSnapshot = await db.collection('users').get();
      const firestoreUsersMap = new Map<string, UserProfile>();
      firestoreUsersSnapshot.forEach(doc => {
        firestoreUsersMap.set(doc.id, doc.data() as UserProfile);
      });

      // 3. Combine the data
      const combinedUsers = userRecords.users.map(userRecord => {
        const firestoreProfile = firestoreUsersMap.get(userRecord.uid);
        return {
          uid: userRecord.uid,
          email: userRecord.email,
          role: firestoreProfile?.role || 'user', // Default to 'user' if no profile exists
        };
      });

      return {
        users: combinedUsers,
      };
    } catch (error: any) {
      console.error('Error in listUsersFlow:', error);
      return {
        users: [],
        error: error.message || 'An unknown error occurred while listing users.',
      };
    }
  }
);


// Flow for updating a user's role
const UpdateUserRoleInputSchema = z.object({
    uid: z.string(),
    role: z.enum(['superadmin', 'manager', 'contractor', 'user']),
});

const UpdateUserRoleOutputSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
});

export async function updateUserRole(input: z.infer<typeof UpdateUserRoleInputSchema>): Promise<z.infer<typeof UpdateUserRoleOutputSchema>> {
    return updateUserRoleFlow(input);
}

const updateUserRoleFlow = ai.defineFlow(
    {
        name: 'updateUserRoleFlow',
        inputSchema: UpdateUserRoleInputSchema,
        outputSchema: UpdateUserRoleOutputSchema,
    },
    async ({ uid, role }) => {
        try {
            const userDocRef = db.collection('users').doc(uid);
            await userDocRef.set({ role: role }, { merge: true });
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'An unknown error occurred.',
            };
        }
    }
);

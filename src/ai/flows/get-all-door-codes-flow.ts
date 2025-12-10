'use server';
/**
 * @fileOverview A flow for admins to fetch all door codes from all users.
 *
 * - getAllDoorCodes - Fetches all door codes.
 * - GetAllDoorCodesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '@/../firebase-service-account.json';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const DoorCodeSchema = z.object({
  id: z.string(),
  location: z.string(),
  code: z.string(),
  adminProgrammingCode: z.string(),
  guestCode: z.string(),
  doorLockType: z.string(),
  property: z.string(),
  lastChanged: z.string().optional().describe("ISO 8601 string"),
});

const UserWithCodesSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  codes: z.array(DoorCodeSchema),
});

const GetAllDoorCodesOutputSchema = z.array(UserWithCodesSchema);
export type GetAllDoorCodesOutput = z.infer<typeof GetAllDoorCodesOutputSchema>;

export async function getAllDoorCodes(): Promise<GetAllDoorCodesOutput> {
  return getAllDoorCodesFlow();
}

const getAllDoorCodesFlow = ai.defineFlow(
  {
    name: 'getAllDoorCodesFlow',
    outputSchema: GetAllDoorCodesOutputSchema,
  },
  async () => {
    const db = getFirestore();
    const auth = getAuth();
    const allUsers = await auth.listUsers();
    
    const allDoorCodes: GetAllDoorCodesOutput = [];

    for (const user of allUsers.users) {
      const doorCodesSnapshot = await db.collection('users').doc(user.uid).collection('doorCodes').get();
      
      if (!doorCodesSnapshot.empty) {
        const codes = doorCodesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            location: data.location || '',
            code: data.code || '',
            adminProgrammingCode: data.adminProgrammingCode || '',
            guestCode: data.guestCode || '',
            doorLockType: data.doorLockType || '',
            property: data.property || '',
            lastChanged: data.lastChanged?.toDate()?.toISOString(),
          };
        });

        allDoorCodes.push({
          uid: user.uid,
          email: user.email,
          codes: codes,
        });
      }
    }

    return allDoorCodes;
  }
);

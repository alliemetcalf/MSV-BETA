
'use server';
/**
 * @fileOverview A flow for admins to fetch all door codes from all users.
 *
 * - getAllDoorCodes - Fetches all door codes.
 * - GetAllDoorCodesOutput - The return type for the function.
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
    databaseURL: "https://msv-beta.firebaseio.com",
  });
}
const db: Firestore = getFirestore();
const auth: Auth = getAuth();


const DoorCodeSchema = z.object({
  id: z.string(),
  location: z.string(),
  code: z.string(),
  adminProgrammingCode: z.string(),
  guestCode: z.string(),
  doorLockType: z.string(),
  property: z.string(),
  lastChanged: z.string().optional().describe('ISO 8601 string'),
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
    // Temporarily get all user documents directly from firestore
    // instead of listing auth users, to bypass the initialization issue.
    const usersSnapshot = await db.collection('users').get();
    
    const allDoorCodes: GetAllDoorCodesOutput = [];

    for (const user of usersSnapshot.docs) {
      const doorCodesSnapshot = await user.ref.collection('doorCodes').get();
      
      if (!doorCodesSnapshot.empty) {
        const codes = doorCodesSnapshot.docs.map(doc => {
          const data = doc.data();
          const lastChanged = data.lastChanged?.toDate ? data.lastChanged.toDate().toISOString() : undefined;
          return {
            id: doc.id,
            location: data.location || '',
            code: data.code || '',
            adminProgrammingCode: data.adminProgrammingCode || '',
            guestCode: data.guestCode || '',
            doorLockType: data.doorLockType || '',
            property: data.property || '',
            lastChanged: lastChanged,
          };
        });

        allDoorCodes.push({
          uid: user.id,
          email: user.data().email, // Get email from user profile doc
          codes: codes,
        });
      }
    }

    return allDoorCodes;
  }
);

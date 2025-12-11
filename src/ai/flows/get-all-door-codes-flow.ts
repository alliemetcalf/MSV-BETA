
'use server';
/**
 * @fileOverview A flow for admins to fetch all door codes from all users.
 *
 * - getAllDoorCodes - Fetches all door codes.
 * - GetAllDoorCodesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { auth, db } from '@/firebase/admin';


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
    const allUsers = await auth.listUsers();
    
    const allDoorCodes: GetAllDoorCodesOutput = [];

    for (const user of allUsers.users) {
      const doorCodesSnapshot = await db.collection('users').doc(user.uid).collection('doorCodes').get();
      
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
          uid: user.uid,
          email: user.email,
          codes: codes,
        });
      }
    }

    return allDoorCodes;
  }
);

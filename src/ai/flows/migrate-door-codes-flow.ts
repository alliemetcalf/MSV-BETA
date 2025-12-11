'use server';
/**
 * @fileOverview A one-time migration flow to move door codes to a top-level collection.
 *
 * - migrateDoorCodes - Reads all door codes from user subcollections and copies them to the root.
 * - MigrateDoorCodesOutput - The return type for the migration function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import serviceAccount from '@/../firebase-service-account.json';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}
const db: Firestore = getFirestore();

const MigrateDoorCodesOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  codesMigrated: z.number(),
});
export type MigrateDoorCodesOutput = z.infer<
  typeof MigrateDoorCodesOutputSchema
>;

export async function migrateDoorCodes(): Promise<MigrateDoorCodesOutput> {
  return migrateDoorCodesFlow();
}

const migrateDoorCodesFlow = ai.defineFlow(
  {
    name: 'migrateDoorCodesFlow',
    outputSchema: MigrateDoorCodesOutputSchema,
  },
  async () => {
    let codesMigrated = 0;
    try {
      // Directly target the specified user's doorCodes subcollection
      const specificUserDocId = 'Ix3LurGh12PFTTkvS1ompsIEzqb2';
      const sourceCollectionRef = db
        .collection('users')
        .doc(specificUserDocId)
        .collection('doorCodes');

      const doorCodesSnapshot = await sourceCollectionRef.get();
      
      if (doorCodesSnapshot.empty) {
        return {
          success: true,
          message: 'No door codes found at the specified location to migrate.',
          codesMigrated: 0,
        };
      }

      const batch = db.batch();
      const newDoorCodesCollectionRef = db.collection('doorCodes');

      for (const codeDoc of doorCodesSnapshot.docs) {
        const newDocRef = newDoorCodesCollectionRef.doc(); // Create new doc with a new ID
        batch.set(newDocRef, codeDoc.data());
        codesMigrated++;
      }

      await batch.commit();

      return {
        success: true,
        message: `Successfully migrated ${codesMigrated} door codes to the top-level collection.`,
        codesMigrated,
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'An unknown error occurred during migration.',
        codesMigrated: 0,
      };
    }
  }
);

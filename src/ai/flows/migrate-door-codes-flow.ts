'use server';
/**
 * @fileOverview A one-time, targeted migration flow to move door codes to a top-level collection.
 *
 * - migrateDoorCodes - Reads all door codes from a specific user's subcollection and copies them to the root.
 * - MigrateDoorCodesOutput - The return type for the migration function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase-admin';


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
    const sourcePath = 'users/Ix3LurGh12PFTTkvS1ompsIEzqb2/doorCodes';
    const destinationCollection = db.collection('doorCodes');
    let codesMigrated = 0;

    try {
      const sourceCollectionRef = db.collection(sourcePath);
      const snapshot = await sourceCollectionRef.get();

      if (snapshot.empty) {
        return {
          success: false,
          message: `No documents found at path: ${sourcePath}. Please double-check the path is correct.`,
          codesMigrated: 0,
        };
      }

      const batch = db.batch();
      snapshot.forEach(doc => {
        const newDocRef = destinationCollection.doc(); // Create new doc with a new ID
        batch.set(newDocRef, doc.data());
        codesMigrated++;
      });

      await batch.commit();

      return {
        success: true,
        message: `Successfully migrated ${codesMigrated} door codes.`,
        codesMigrated: codesMigrated,
      };

    } catch (error: any) {
      // Provide a more specific error message if possible
      let errorMessage = 'An unknown error occurred during migration.';
      if (error.code === 5) { // 5 is the gRPC code for NOT_FOUND
        errorMessage = `NOT_FOUND: The path '${sourcePath}' could not be found. Please verify the user ID and subcollection name are correct and that the script has the necessary permissions. Details: ${error.message}`;
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      return {
        success: false,
        message: errorMessage,
        codesMigrated: 0,
      };
    }
  }
);

'use server';
/**
 * @fileOverview A diagnostic flow to list all top-level collections in the Firestore database.
 *
 * - listCollections - Retrieves the names of all top-level collections.
 * - ListCollectionsOutput - The return type for the listCollections function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase-admin';

const ListCollectionsOutputSchema = z.object({
  success: z.boolean(),
  collections: z.array(z.string()).optional(),
  message: z.string().optional(),
});
export type ListCollectionsOutput = z.infer<typeof ListCollectionsOutputSchema>;

export async function listCollections(): Promise<ListCollectionsOutput> {
  return listCollectionsFlow();
}

const listCollectionsFlow = ai.defineFlow(
  {
    name: 'listCollectionsFlow',
    outputSchema: ListCollectionsOutputSchema,
  },
  async () => {
    try {
      const collections = await db.listCollections();
      const collectionIds = collections.map(col => col.id);
      return {
        success: true,
        collections: collectionIds,
      };
    } catch (error: any) {
      // Create a detailed error message for better diagnostics.
      const errorMessage = `Failed to list collections. Error: ${error.name} - ${error.message}. Details: ${error.details || 'No additional details.'}`;
      console.error(errorMessage, error);
      return {
        success: false,
        message: errorMessage,
      };
    }
  }
);

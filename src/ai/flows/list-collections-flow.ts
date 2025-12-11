'use server';
/**
 * @fileOverview A diagnostic flow to list all top-level collections in the Firestore database.
 *
 * - listCollections - Retrieves the names of all top-level collections.
 * - ListCollectionsOutput - The return type for the listCollections function.
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
      return {
        success: false,
        message: error.message || 'An unknown error occurred.',
      };
    }
  }
);

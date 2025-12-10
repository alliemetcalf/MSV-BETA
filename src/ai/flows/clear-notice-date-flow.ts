'use server';
/**
 * @fileOverview A one-time flow to clear a specific 'noticeReceivedDate' from tenant records.
 */

import { ai } from '@/ai/genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import serviceAccount from '@/../firebase-service-account.json';
import { z } from 'zod';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const clearNoticeDateFlow = ai.defineFlow(
  {
    name: 'clearNoticeDateFlow',
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
        clearedCount: z.number(),
    })
  },
  async () => {
    console.log('Running clearNoticeDateFlow...');
    const db = getFirestore();
    const tenantsRef = db.collection('tenants');

    // The specific date to target: December 10, 2025
    const targetDate = new Date('2025-12-10T00:00:00.000Z');

    const snapshot = await tenantsRef.where('noticeReceivedDate', '==', targetDate).get();

    if (snapshot.empty) {
      console.log('No tenants found with the specified notice date.');
      return {
          success: true,
          message: 'No tenants found with the specified notice date.',
          clearedCount: 0,
      };
    }

    const batch = db.batch();
    let clearedCount = 0;

    snapshot.forEach(doc => {
      console.log(`Found matching tenant: ${doc.id}. Queuing for update.`);
      batch.update(doc.ref, {
        noticeReceivedDate: FieldValue.delete()
      });
      clearedCount++;
    });

    await batch.commit();

    const resultMessage = `Successfully cleared the notice date from ${clearedCount} tenant(s).`;
    console.log(resultMessage);
    
    return {
        success: true,
        message: resultMessage,
        clearedCount: clearedCount,
    };
  }
);


// Immediately execute the flow when this file is loaded.
(async () => {
    try {
        await clearNoticeDateFlow();
    } catch (e) {
        console.error('Error running clearNoticeDateFlow:', e);
    }
})();

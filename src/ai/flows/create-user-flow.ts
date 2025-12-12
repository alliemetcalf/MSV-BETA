'use server';
/**
 * @fileOverview A flow for creating a new user by calling a secure API route.
 *
 * - createUser - A function that handles the user creation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {
  CreateUserInputSchema,
  type CreateUserInput,
} from '@/ai/schemas/user-schemas';

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      // Construct the full URL for the API route.
      // In a server component, we need to use an absolute URL.
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/create-user`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Future-proofing: Add an API key or other auth mechanism if this needs to be secured further
        },
        body: JSON.stringify(input),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unexpected error occurred.');
      }

      return result.message;
    } catch (error: any) {
      console.error('Error in createUserFlow:', error);
      // Re-throw the error to be caught by the client.
      throw new Error(error.message || 'An unexpected error occurred.');
    }
  }
);

export async function createUser(input: CreateUserInput): Promise<string> {
  return await createUserFlow(input);
}

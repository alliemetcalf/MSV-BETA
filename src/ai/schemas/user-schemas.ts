import { z } from 'zod';

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['superadmin', 'manager', 'contractor', 'user']),
  displayName: z.string(),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

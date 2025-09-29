import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

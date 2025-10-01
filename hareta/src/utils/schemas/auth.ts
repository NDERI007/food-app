import { z } from 'zod';

export const emailSchema = z.object({
  email: z.email({ message: 'Invalid email address' }),
  otp: z.string().min(6, 'OTP must be 6 characters').optional(), // <-- add this
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});
export type OtpSchemaType = z.infer<typeof otpSchema>;
export type emailSchemaType = z.infer<typeof emailSchema>;

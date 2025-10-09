import { z } from "zod";
import crypto from "crypto";

// Define and validate required environment variables
const EnvSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
});

// Parse once (throws if invalid)
const env = EnvSchema.parse(process.env);

export function signSessionId(sessionId: string): string {
  return crypto
    .createHmac("sha256", env.SESSION_SECRET)
    .update(sessionId)
    .digest("hex");
}

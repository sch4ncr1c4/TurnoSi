import { z } from "zod";

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(12).max(128)
});

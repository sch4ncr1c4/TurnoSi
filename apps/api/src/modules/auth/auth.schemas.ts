import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  organization: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(12).max(128)
});

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(128),
  rememberMe: z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean().default(false)
  )
});

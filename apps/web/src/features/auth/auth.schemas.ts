import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(3, "Ingresá tu email o usuario"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rememberMe: z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.boolean().default(false)
  )
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresá tu nombre"),
  lastName: z.string().trim().min(1, "Ingresá tu apellido"),
  organization: z.string().min(2, "Ingresá el nombre del negocio"),
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres")
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

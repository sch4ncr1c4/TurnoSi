import { z } from "zod";

export const bookingConfirmSchema = z.object({
  name: z.string().min(2, "Ingresá tu nombre"),
  phone: z.string().min(8, "Ingresá un número de teléfono válido"),
  email: z.string().email("Ingresá un email válido")
});

export type BookingConfirmData = z.infer<typeof bookingConfirmSchema>;

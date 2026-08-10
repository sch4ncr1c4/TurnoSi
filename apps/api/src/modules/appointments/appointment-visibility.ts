import type { Prisma } from "@prisma/client";

export const visibleOperationalAppointmentWhere = {
  NOT: {
    channel: "web",
    depositPayment: {
      is: {
        status: { not: "approved" }
      }
    }
  }
} satisfies Prisma.AppointmentWhereInput;

import { BookingChannel, MembershipRole, PrismaClient } from "@prisma/client";

import { hashPassword } from "../lib/password.js";

const prisma = new PrismaClient();

async function main() {
  const demoPasswordHash = await hashPassword("demo-password");

  const organization = await prisma.organization.upsert({
    where: { slug: "turnosi-demo" },
    update: {
      name: "Turnos Demo",
      timezone: "America/Argentina/Buenos_Aires",
      bookingIntervalMinutes: 30
    },
    create: {
      name: "Turnos Demo",
      slug: "turnosi-demo",
      timezone: "America/Argentina/Buenos_Aires",
      bookingIntervalMinutes: 30
    }
  });

  const sofia = await prisma.user.upsert({
    where: { email: "sofia@turnosi.local" },
    update: {
      firstName: "Sofia",
      lastName: "Martinez",
      passwordHash: demoPasswordHash
    },
    create: {
      email: "sofia@turnosi.local",
      firstName: "Sofia",
      lastName: "Martinez",
      passwordHash: demoPasswordHash
    }
  });

  const lucia = await prisma.user.upsert({
    where: { email: "lucia@turnosi.local" },
    update: {
      firstName: "Lucia",
      lastName: "Fernandez",
      passwordHash: demoPasswordHash
    },
    create: {
      email: "lucia@turnosi.local",
      firstName: "Lucia",
      lastName: "Fernandez",
      passwordHash: demoPasswordHash
    }
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: sofia.id,
        organizationId: organization.id
      }
    },
    update: { role: MembershipRole.owner },
    create: {
      userId: sofia.id,
      organizationId: organization.id,
      role: MembershipRole.owner
    }
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: lucia.id,
        organizationId: organization.id
      }
    },
    update: { role: MembershipRole.member },
    create: {
      userId: lucia.id,
      organizationId: organization.id,
      role: MembershipRole.member
    }
  });

  const serviceInputs = [
    {
      name: "Corte y brushing",
      slug: "corte-brushing",
      durationMinutes: 60,
      priceCents: 180000
    },
    {
      name: "Perfilado de cejas",
      slug: "perfilado-cejas",
      durationMinutes: 30,
      priceCents: 90000
    },
    {
      name: "Semipermanente",
      slug: "semipermanente",
      durationMinutes: 45,
      priceCents: 140000
    }
  ];

  const services = [];

  for (const input of serviceInputs) {
    const service = await prisma.service.upsert({
      where: {
        organizationId_slug: {
          organizationId: organization.id,
          slug: input.slug
        }
      },
      update: {
        ...input,
        createdByUserId: sofia.id
      },
      create: {
        organizationId: organization.id,
        createdByUserId: sofia.id,
        ...input
      }
    });

    services.push(service);
  }

  const resource = await prisma.resource.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "sillon-principal"
      }
    },
    update: {
      name: "Sillon principal",
      capacity: 1
    },
    create: {
      organizationId: organization.id,
      name: "Sillon principal",
      slug: "sillon-principal",
      capacity: 1
    }
  });

  const customerInputs = [
    ["Valentina", "Rojas", "valentina@example.com", "1122334455"],
    ["Mariana", "Gomez", "mariana@example.com", "1133445566"],
    ["Camila", "Mendez", "camila@example.com", "1144556677"],
    ["Nicolas", "Acosta", "nicolas@example.com", "1155667788"],
    ["Florencia", "Suarez", "florencia@example.com", "1166778899"]
  ] as const;

  const customers = [];

  for (const [firstName, lastName, email, phone] of customerInputs) {
    const fullName = `${firstName} ${lastName}`;
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        organizationId: organization.id,
        email
      }
    });

    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName,
            lastName,
            fullName,
            email,
            phone
          }
        })
      : await prisma.customer.create({
          data: {
            organizationId: organization.id,
            firstName,
            lastName,
            fullName,
            email,
            phone
          }
        });

    customers.push(customer);
  }

  await prisma.appointment.deleteMany({
    where: {
      organizationId: organization.id,
      notes: "seed-demo"
    }
  });

  const baseDate = new Date("2026-07-01T09:00:00.000-03:00");

  const appointmentInputs = [
    {
      offsetHours: 0,
      durationMinutes: 60,
      title: "Corte y brushing",
      customerId: customers[0].id,
      serviceId: services[0].id,
      assignedUserId: sofia.id,
      channel: BookingChannel.in_person
    },
    {
      offsetHours: 2,
      durationMinutes: 30,
      title: "Perfilado de cejas",
      customerId: customers[1].id,
      serviceId: services[1].id,
      assignedUserId: lucia.id,
      channel: BookingChannel.whatsapp
    },
    {
      offsetHours: 3,
      durationMinutes: 45,
      title: "Semipermanente",
      customerId: customers[2].id,
      serviceId: services[2].id,
      assignedUserId: lucia.id,
      channel: BookingChannel.web
    }
  ];

  for (const input of appointmentInputs) {
    const startsAt = new Date(baseDate.getTime() + input.offsetHours * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60 * 1000);

    await prisma.appointment.create({
      data: {
        organizationId: organization.id,
        customerId: input.customerId,
        serviceId: input.serviceId,
        resourceId: resource.id,
        createdById: sofia.id,
        assignedUserId: input.assignedUserId,
        channel: input.channel,
        title: input.title,
        notes: "seed-demo",
        startsAt,
        endsAt,
        status: "confirmed"
      }
    });
  }

  console.log(`Seed ready for organization ${organization.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

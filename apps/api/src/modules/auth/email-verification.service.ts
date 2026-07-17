import { createHash, randomBytes } from "node:crypto";
import { MembershipRole } from "@prisma/client";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { renderTurnosiEmail } from "../../lib/email-template.js";
import { logger } from "../../lib/logger.js";
import { slugifyOrganizationName } from "./auth.utils.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationUrl(token: string) {
  const apiOrigin = env.API_PUBLIC_URL ?? env.WEB_ORIGIN.split(",")[0];
  return `${apiOrigin}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(email: string, verificationUrl: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: "Verificá tu cuenta de TurnoSi",
      html: renderTurnosiEmail({
        eyebrow: "Verificación de cuenta",
        title: "Activá tu cuenta en TurnoSi",
        intro:
          "Confirmá tu correo para terminar el alta y empezar a configurar tu negocio.",
        action: {
          label: "Verificar cuenta",
          url: verificationUrl
        },
        note: "Este enlace vence en 5 minutos por seguridad."
      })
    })
  });
  if (!response.ok) {
    logger.error("verification email failed", {
      status: response.status,
      body: await response.text()
    });
    throw new AppError(502, "EMAIL_DELIVERY_FAILED", "Verification email failed");
  }
}

async function createUniqueOrganizationSlug(organizationName: string) {
  const baseSlug = slugifyOrganizationName(organizationName) || "mi-negocio";
  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.organization.findUnique({
      where: { slug }
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function createPendingRegistrationVerification(data: {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  passwordHash: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.pendingRegistrationToken.deleteMany({
    where: { email: data.email }
  });
  const pending = await prisma.pendingRegistrationToken.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationName: data.organizationName,
      passwordHash: data.passwordHash,
      tokenHash,
      expiresAt
    }
  });

  try {
    await sendVerificationEmail(data.email, createVerificationUrl(token));
  } catch (error) {
    await prisma.pendingRegistrationToken.delete({ where: { id: pending.id } });
    throw error;
  }
}

export async function resendPendingRegistrationVerification(email: string) {
  const pending = await prisma.pendingRegistrationToken.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: "desc" }
  });
  if (!pending) return false;
  const token = randomBytes(32).toString("base64url");
  await prisma.pendingRegistrationToken.update({
    where: { id: pending.id },
    data: {
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      usedAt: null
    }
  });
  await sendVerificationEmail(pending.email, createVerificationUrl(token));
  return true;
}

export async function createEmailVerification(userId: string, email: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });
  await sendVerificationEmail(email, createVerificationUrl(token));

  return undefined;
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const pending = await prisma.pendingRegistrationToken.findUnique({
    where: { tokenHash }
  });

  if (pending) {
    if (pending.usedAt || pending.expiresAt <= new Date()) {
      throw new AppError(400, "INVALID_VERIFICATION_TOKEN", "Invalid verification token");
    }
    if (await prisma.user.findUnique({ where: { email: pending.email } })) {
      throw new AppError(409, "EMAIL_ALREADY_IN_USE", "Email already in use");
    }
    const slug = await createUniqueOrganizationSlug(pending.organizationName);

    await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: pending.email,
          passwordHash: pending.passwordHash,
          firstName: pending.firstName,
          lastName: pending.lastName,
          emailVerifiedAt: new Date()
        }
      });
      const organization = await transaction.organization.create({
        data: {
          name: pending.organizationName.trim(),
          slug
        }
      });
      const mainBranch = await transaction.branch.create({
        data: {
          organizationId: organization.id,
          name: "Sede principal",
          slug: "sede-principal",
          isMain: true
        }
      });
      const membership = await transaction.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: MembershipRole.owner
        }
      });
      await transaction.membershipBranch.create({
        data: {
          membershipId: membership.id,
          branchId: mainBranch.id
        }
      });
      await transaction.pendingRegistrationToken.update({
        where: { id: pending.id },
        data: { usedAt: new Date() }
      });
    });
    return;
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash }
  });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new AppError(400, "INVALID_VERIFICATION_TOKEN", "Invalid verification token");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    })
  ]);
}

import { createHash, randomBytes } from "node:crypto";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { renderTurnosiEmail } from "../../lib/email-template.js";
import { logger } from "../../lib/logger.js";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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

  const apiOrigin = env.API_PUBLIC_URL ?? env.WEB_ORIGIN.split(",")[0];
  const verificationUrl = `${apiOrigin}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
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

  return undefined;
}

export async function verifyEmailToken(token: string) {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) }
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

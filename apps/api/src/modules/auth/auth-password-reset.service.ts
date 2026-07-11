import { randomInt, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

import { env } from "../../config/env.js";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { hashToken } from "../../lib/crypto.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";

async function sendResetCode(email: string, code: string) {
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
      subject: "Código para recuperar tu cuenta de TurnoSi",
      html: `<p>Tu código para cambiar la contraseña es:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Vence en 3 minutos. Si no lo solicitaste, ignorá este correo.</p>`
    })
  });
  if (!response.ok) {
    throw new AppError(502, "EMAIL_DELIVERY_FAILED", "Reset email failed");
  }
}

export async function requestPasswordReset(email: string, _request: Request) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { sent: true };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(code),
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      }
    })
  ]);
  await sendResetCode(user.email, code);

  return { sent: true };
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true }
  });
  const match = user
    ? await prisma.passwordResetToken.findFirst({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 }
        },
        orderBy: { createdAt: "desc" }
      })
    : null;

  const providedHash = Buffer.from(hashToken(code));
  const expectedHash = Buffer.from(match?.tokenHash ?? hashToken("invalid"));
  const valid =
    Boolean(match) &&
    providedHash.length === expectedHash.length &&
    timingSafeEqual(providedHash, expectedHash);

  if (!valid) {
    if (match) {
      await prisma.passwordResetToken.update({
        where: { id: match.id },
        data: {
          attempts: { increment: 1 },
          ...(match.attempts >= 4 ? { usedAt: new Date() } : {})
        }
      });
    }
    throw new AppError(400, "INVALID_CODE", "Invalid or expired reset code");
  }
  if (!user || (await verifyPassword(newPassword, user.passwordHash))) {
    throw new AppError(
      400,
      "PASSWORD_UNCHANGED",
      "New password must be different"
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: match!.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 }
      },
      data: { usedAt: new Date() }
    });
    if (consumed.count !== 1) {
      throw new AppError(400, "INVALID_CODE", "Invalid or expired reset code");
    }
    await transaction.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    await transaction.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });
    await transaction.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  });

  return { reset: true };
}

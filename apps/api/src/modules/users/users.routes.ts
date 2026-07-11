import { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { ok } from "../../lib/http.js";
import { AppError } from "../../lib/app-error.js";
import { clearAuthCookies } from "../../lib/cookies.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { changePasswordSchema, updateProfileSchema } from "./users.schemas.js";

export const usersRouter = Router();

usersRouter.get("/me", async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.sub },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      onboardingGuideSeenAt: true,
      createdAt: true
    }
  });

  response.json(ok(user));
});

usersRouter.post("/me/onboarding-guide-seen", async (request, response) => {
  await prisma.user.update({
    where: { id: request.auth!.sub },
    data: { onboardingGuideSeenAt: new Date() }
  });
  response.json(ok({ onboardingGuideSeen: true }));
});

usersRouter.patch("/me/profile", authRateLimit, async (request, response) => {
  const data = updateProfileSchema.parse(request.body);
  const email = data.email.toLowerCase();
  const duplicate = await prisma.user.findFirst({
    where: { email, id: { not: request.auth!.sub } },
    select: { id: true }
  });
  if (duplicate) {
    throw new AppError(409, "EMAIL_ALREADY_IN_USE", "Email already in use");
  }

  const user = await prisma.user.update({
    where: { id: request.auth!.sub },
    data: {
      email,
      firstName: data.firstName,
      lastName: data.lastName
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      onboardingGuideSeenAt: true
    }
  });
  response.json(ok({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    onboardingGuideSeen: Boolean(user.onboardingGuideSeenAt)
  }));
});

usersRouter.patch("/me/password", authRateLimit, async (request, response) => {
  const data = changePasswordSchema.parse(request.body);
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.sub },
    select: { id: true, passwordHash: true }
  });
  if (!user || !(await verifyPassword(data.currentPassword, user.passwordHash))) {
    throw new AppError(400, "INVALID_CURRENT_PASSWORD", "Current password is invalid");
  }
  if (await verifyPassword(data.newPassword, user.passwordHash)) {
    throw new AppError(400, "PASSWORD_UNCHANGED", "New password must be different");
  }

  const passwordHash = await hashPassword(data.newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);
  clearAuthCookies(response);
  response.json(ok({ passwordChanged: true }));
});

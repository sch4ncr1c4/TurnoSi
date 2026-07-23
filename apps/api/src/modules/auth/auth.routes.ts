import { MembershipRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../../database/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { clearAuthCookies } from "../../lib/cookies.js";
import { ok } from "../../lib/http.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { authCodeRateLimit, authRateLimit } from "../../middlewares/rate-limit.js";
import { requireAuth } from "../../middlewares/require-auth.js";
import { auditLog } from "../audit/audit.service.js";
import {
  createSession,
  revokeSession,
  rotateSession
} from "./auth-session.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import { slugifyOrganizationName } from "./auth.utils.js";
import {
  requestPasswordResetSchema,
  resetPasswordSchema
} from "./auth-password-reset.schemas.js";
import {
  requestPasswordReset,
  resetPassword
} from "./auth-password-reset.service.js";
import {
  createEmailVerification,
  createPendingRegistrationVerification,
  resendPendingRegistrationVerification,
  verifyEmailToken
} from "./email-verification.service.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimit, async (request, response) => {
  const data = registerSchema.parse(request.body);
  const email = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_IN_USE", "Email already in use");
  }

  const passwordHash = await hashPassword(data.password);
  const emailVerificationEnabled = Boolean(env.RESEND_API_KEY && env.EMAIL_FROM);

  if (emailVerificationEnabled) {
    await createPendingRegistrationVerification({
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      organizationName: data.organization.trim(),
      passwordHash
    });
    response.status(201).json(
      ok({
        email,
        verificationRequired: true
      })
    );
    return;
  }

  const baseSlug = slugifyOrganizationName(data.organization) || "mi-negocio";
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

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName
      }
    });

    const organization = await tx.organization.create({
      data: {
        name: data.organization.trim(),
        slug
      }
    });

    const mainBranch = await tx.branch.create({
      data: {
        organizationId: organization.id,
        name: "Sede principal",
        slug: "sede-principal",
        isMain: true
      }
    });

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: MembershipRole.owner
      }
    });
    await tx.membershipBranch.create({
      data: {
        membershipId: membership.id,
        branchId: mainBranch.id
      }
    });

    return { user, organization };
  });

  await prisma.user.update({
    where: { id: result.user.id },
    data: { emailVerifiedAt: new Date() }
  });
  await createSession(request, response, result.user, result.organization.id);
  await auditLog({
    organizationId: result.organization.id,
    userId: result.user.id,
    action: "user.registered",
    entityType: "User",
    entityId: result.user.id,
    metadata: { email }
  });
  response.status(201).json(
    ok({
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        onboardingGuideSeen: false
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug
      },
      verificationRequired: false
    })
  );
});

authRouter.post("/login", authRateLimit, async (request, response) => {
  const data = loginSchema.parse(request.body);
  const identifier = data.email.toLowerCase();
  const isEmail = identifier.includes("@");

  const user = await prisma.user.findFirst({
    where: isEmail ? { email: identifier } : { username: identifier },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              logo: { select: { organizationId: true } }
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const passwordMatches = await verifyPassword(data.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const primaryMembership = user.memberships[0] ?? null;
  if (
    primaryMembership?.role === MembershipRole.owner &&
    !user.emailVerifiedAt
  ) {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      "Email verification required"
    );
  }
  await createSession(
    request,
    response,
    user,
    primaryMembership?.organizationId ?? null,
    undefined,
    data.rememberMe
  );
  await auditLog({
    organizationId: primaryMembership?.organizationId ?? undefined,
    userId: user.id,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
    metadata: { identifier }
  });
  response.json(
    ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingGuideSeen: Boolean(user.onboardingGuideSeenAt)
      },
      organizations: user.memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        onboardingCompleted: Boolean(membership.organization.onboardingCompletedAt),
        hasLogo: Boolean(membership.organization.logo)
      }))
    })
  );
});

authRouter.get("/verify-email", authCodeRateLimit, async (request, response) => {
  const token = z.string().min(32).parse(request.query.token);
  await verifyEmailToken(token);
  response.redirect(`${env.WEB_ORIGIN.split(",")[0]}/login?verified=1`);
});

authRouter.post("/resend-verification", authCodeRateLimit, async (request, response) => {
  const email = z.string().trim().email().parse(request.body?.email).toLowerCase();
  if (await resendPendingRegistrationVerification(email)) {
    response.json(ok({ sent: true }));
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.emailVerifiedAt) {
    await createEmailVerification(user.id, user.email);
  }
  response.json(ok({ sent: true }));
});

authRouter.post("/refresh", authRateLimit, async (request, response) => {
  await rotateSession(request, response);
  response.json(ok({ refreshed: true }));
});

authRouter.post("/request-password-reset", authCodeRateLimit, async (request, response) => {
  const data = requestPasswordResetSchema.parse(request.body);
  const result = await requestPasswordReset(data.email.toLowerCase(), request);
  response.json(ok(result));
});

authRouter.post("/reset-password", authRateLimit, async (request, response) => {
  const data = resetPasswordSchema.parse(request.body);
  const result = await resetPassword(
    data.email.toLowerCase(),
    data.code,
    data.newPassword
  );
  response.json(ok(result));
});

authRouter.post("/logout", async (request, response) => {
  await revokeSession(request);
  clearAuthCookies(response);
  if (request.auth) {
    await auditLog({
      userId: request.auth.sub,
      action: "user.logout",
      entityType: "User",
      entityId: request.auth.sub
    });
  }
  response.json(ok({ loggedOut: true }));
});

authRouter.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.sub },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              logo: { select: { organizationId: true } }
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!user) {
    throw new AppError(401, "INVALID_TOKEN", "Authenticated user not found");
  }

  response.json(
    ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingGuideSeen: Boolean(user.onboardingGuideSeenAt)
      },
      organizations: user.memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        onboardingCompleted: Boolean(membership.organization.onboardingCompletedAt),
        hasLogo: Boolean(membership.organization.logo)
      }))
    })
  );
});

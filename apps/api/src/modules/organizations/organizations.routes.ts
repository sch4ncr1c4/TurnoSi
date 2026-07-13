import express, { Router } from "express";

import { prisma } from "../../database/prisma.js";
import { AppError } from "../../lib/app-error.js";
import { clearAuthCookies } from "../../lib/cookies.js";
import { ok } from "../../lib/http.js";
import { optimizeImage } from "../../lib/image-optimizer.js";
import { verifyPassword } from "../../lib/password.js";
import { assertMembership } from "../../lib/membership.js";
import { organizationParamsSchema } from "../../lib/schemas.js";
import { authRateLimit } from "../../middlewares/rate-limit.js";
import { auditLog } from "../audit/audit.service.js";
import { serveGalleryImage, serveLogo } from "../../lib/logo.js";
import { appointmentsRouter } from "../appointments/appointments.routes.js";
import { customersRouter } from "../customers/customers.routes.js";
import { servicesRouter } from "../services/services.routes.js";
import { cancelMercadoPagoSubscription } from "../billing/mercadopago-subscription.service.js";
import {
  updateOrganizationSettingsSchema
} from "./organizations.schemas.js";

export const organizationsRouter = Router();

const logoContentTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const gallerySlots = new Set([0, 1]);

function matchesImageSignature(data: Buffer, contentType: string) {
  if (contentType === "image/png") {
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  return (
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

organizationsRouter.get("/current/logo", async (request, response) => {
  await serveLogo(request.tenant!.organizationId, response);
});

organizationsRouter.get("/current/gallery/:slot", async (request, response) => {
  const slot = Number(request.params.slot);
  if (!gallerySlots.has(slot)) return response.sendStatus(404);
  await serveGalleryImage(request.tenant!.organizationId, slot, response);
});

organizationsRouter.put(
  "/current/logo",
  authRateLimit,
  express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "8mb" }),
  async (request, response) => {
    const contentType = request.get("content-type")?.split(";")[0] ?? "";
    if (
      !logoContentTypes.has(contentType) ||
      !Buffer.isBuffer(request.body) ||
      request.body.length === 0 ||
      !matchesImageSignature(request.body, contentType)
    ) {
      return response.status(400).json({
        success: false,
        message: "Logo must be a PNG, JPEG or WebP image",
        code: "INVALID_LOGO"
      });
    }

    const tenant = request.tenant!;
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      return response.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN"
      });
    }

    let optimizedLogo;
    try {
      optimizedLogo = await optimizeImage(request.body, "logo");
    } catch {
      return response.status(400).json({
        success: false,
        message: "Logo must be a valid image",
        code: "INVALID_LOGO"
      });
    }
    await prisma.organizationLogo.upsert({
      where: { organizationId: tenant.organizationId },
      create: {
        organizationId: tenant.organizationId,
        contentType: optimizedLogo.contentType,
        data: optimizedLogo.data
      },
      update: { contentType: optimizedLogo.contentType, data: optimizedLogo.data }
    });
    response.json(ok({ uploaded: true }));
  }
);

organizationsRouter.put(
  "/current/gallery/:slot",
  authRateLimit,
  express.raw({ type: ["image/png", "image/jpeg", "image/webp"], limit: "10mb" }),
  async (request, response) => {
    const slot = Number(request.params.slot);
    if (!gallerySlots.has(slot)) {
      return response.status(400).json({
        success: false,
        message: "Gallery slot must be 0 or 1",
        code: "INVALID_GALLERY_SLOT"
      });
    }

    const contentType = request.get("content-type")?.split(";")[0] ?? "";
    if (
      !logoContentTypes.has(contentType) ||
      !Buffer.isBuffer(request.body) ||
      request.body.length === 0 ||
      !matchesImageSignature(request.body, contentType)
    ) {
      return response.status(400).json({
        success: false,
        message: "Gallery image must be a PNG, JPEG or WebP image",
        code: "INVALID_GALLERY_IMAGE"
      });
    }

    const tenant = request.tenant!;
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      return response.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN"
      });
    }

    let optimizedImage;
    try {
      optimizedImage = await optimizeImage(
        request.body,
        slot === 0 ? "galleryHorizontal" : "galleryVertical"
      );
    } catch {
      return response.status(400).json({
        success: false,
        message: "Gallery image must be a valid image",
        code: "INVALID_GALLERY_IMAGE"
      });
    }
    await prisma.organizationGalleryImage.upsert({
      where: {
        organizationId_slot: {
          organizationId: tenant.organizationId,
          slot
        }
      },
      create: {
        organizationId: tenant.organizationId,
        slot,
        focusX: 50,
        focusY: 50,
        zoom: 100,
        contentType: optimizedImage.contentType,
        data: optimizedImage.data
      },
      update: { contentType: optimizedImage.contentType, data: optimizedImage.data }
    });
    response.json(ok({ uploaded: true }));
  }
);

organizationsRouter.delete(
  "/current/gallery/:slot",
  authRateLimit,
  async (request, response) => {
    const slot = Number(request.params.slot);
    if (!gallerySlots.has(slot)) {
      return response.status(400).json({
        success: false,
        message: "Gallery slot must be 0 or 1",
        code: "INVALID_GALLERY_SLOT"
      });
    }

    const tenant = request.tenant!;
    if (tenant.role !== "owner" && tenant.role !== "admin") {
      return response.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: "FORBIDDEN"
      });
    }

    await prisma.organizationGalleryImage.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        slot
      }
    });
    response.json(ok({ deleted: true }));
  }
);

organizationsRouter.get("/current/settings", async (request, response) => {
  const organization = await prisma.organization.findUnique({
    where: { id: request.tenant!.organizationId },
    include: {
      logo: { select: { organizationId: true, updatedAt: true } },
      galleryImages: { select: { slot: true, focusX: true, focusY: true, zoom: true, updatedAt: true } }
    }
  });

  if (!organization) {
    response.status(404).json({ success: false, message: "Organization not found", code: "NOT_FOUND" });
    return;
  }

  response.json(ok({
    name: organization.name,
    slug: organization.slug,
    category: organization.category ?? "",
    phone: organization.phone ?? "",
    whatsapp: organization.whatsapp ?? "",
    publicEmail: organization.publicEmail ?? "",
    address: organization.address ?? "",
    city: organization.city ?? "",
    province: organization.province ?? "",
    instagram: organization.instagram ?? "",
    description: organization.description ?? "",
    onboardingCompleted: Boolean(organization.onboardingCompletedAt),
    hasLogo: Boolean(organization.logo),
    logoVersion: organization.logo?.updatedAt.getTime() ?? null,
    galleryImageSlots: organization.galleryImages.map((image) => image.slot).sort(),
    galleryVersions: organization.galleryImages
      .map((image) => ({
        slot: image.slot,
        version: image.updatedAt.getTime()
      }))
      .sort((first, second) => first.slot - second.slot),
    galleryFocus: organization.galleryImages
      .map((image) => ({
        slot: image.slot,
        focusX: image.focusX,
        focusY: image.focusY,
        zoom: image.zoom
      }))
      .sort((first, second) => first.slot - second.slot)
  }));
});

organizationsRouter.patch("/current/settings", authRateLimit, async (request, response) => {
  const data = updateOrganizationSettingsSchema.parse(request.body);
  const tenant = request.tenant!;

  if (tenant.role !== "owner" && tenant.role !== "admin") {
    response.status(403).json({ success: false, message: "Insufficient permissions", code: "FORBIDDEN" });
    return;
  }

  const { galleryFocus, ...organizationData } = data;
  const organization = await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: {
      ...organizationData,
      ...(organizationData.publicEmail !== undefined
        ? { publicEmail: organizationData.publicEmail || null }
        : {})
    }
  });

  if (galleryFocus?.length) {
    await prisma.$transaction(
      galleryFocus.map((image) =>
        prisma.organizationGalleryImage.updateMany({
          where: {
            organizationId: tenant.organizationId,
            slot: image.slot
          },
          data: {
            focusX: image.focusX,
            focusY: image.focusY,
            zoom: image.zoom
          }
        })
      )
    );
  }

  await auditLog({
    organizationId: tenant.organizationId,
    userId: request.auth!.sub,
    action: "organization.settings_updated",
    entityType: "Organization",
    entityId: tenant.organizationId,
    metadata: { fields: Object.keys(data) }
  });

  response.json(ok({ id: organization.id }));
});

organizationsRouter.post("/current/complete-onboarding", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  if (tenant.role !== "owner" && tenant.role !== "admin") {
    response.status(403).json({ success: false, message: "Insufficient permissions", code: "FORBIDDEN" });
    return;
  }

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: request.auth!.sub },
      select: { firstName: true, lastName: true }
    }),
    prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      select: {
        name: true,
        category: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        description: true
      }
    })
  ]);
  const missing = [
    ...(!user?.firstName || !user.lastName ? ["ownerProfile"] : []),
    ...(!organization?.name || !organization.category || !organization.phone
      ? ["business"]
      : []),
    ...(!organization?.address || !organization.city || !organization.province
      ? ["location"]
      : []),
    ...(!organization?.description ? ["publicProfile"] : [])
  ];
  if (missing.length > 0) {
    throw new AppError(
      409,
      "ONBOARDING_INCOMPLETE",
      `Missing onboarding tasks: ${missing.join(",")}`
    );
  }

  await prisma.organization.update({
    where: { id: tenant.organizationId },
    data: { onboardingCompletedAt: new Date() }
  });

  response.json(ok({ onboardingCompleted: true }));
});

organizationsRouter.delete("/current", authRateLimit, async (request, response) => {
  const tenant = request.tenant!;
  if (tenant.role !== "owner") {
    throw new AppError(403, "FORBIDDEN", "Only the owner can delete the business");
  }
  const password =
    typeof request.body?.password === "string" ? request.body.password : "";
  if (password.length < 6) {
    throw new AppError(400, "INVALID_PASSWORD", "Password is required");
  }

  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: request.auth!.sub },
      select: { passwordHash: true }
    }),
    prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      select: {
        memberships: { select: { userId: true } },
        subscription: {
          select: { mercadoPagoPreapprovalId: true, status: true }
        }
      }
    })
  ]);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(400, "INVALID_PASSWORD", "Password is incorrect");
  }
  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Business not found");
  }

  const preapprovalId = organization.subscription?.mercadoPagoPreapprovalId;
  if (preapprovalId && organization.subscription?.status !== "canceled") {
    await cancelMercadoPagoSubscription(preapprovalId);
  }

  const memberUserIds = organization.memberships.map((member) => member.userId);
  await prisma.$transaction(async (transaction) => {
    await transaction.organization.delete({
      where: { id: tenant.organizationId }
    });
    await transaction.user.deleteMany({
      where: {
        id: { in: memberUserIds },
        memberships: { none: {} }
      }
    });
  });

  clearAuthCookies(response);
  response.json(ok({ deleted: true }));
});

organizationsRouter.get("/", async (request, response) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: request.auth!.sub },
    include: { organization: true },
    orderBy: { createdAt: "asc" }
  });

  response.json(ok(memberships.map((m) => m.organization)));
});

organizationsRouter.get("/:organizationId", async (request, response) => {
  const { organizationId } = organizationParamsSchema.parse(request.params);
  await assertMembership(request.auth!.sub, organizationId);

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  });

  if (!organization) {
    response.status(404).json({
      success: false,
      message: "Organization not found",
      code: "NOT_FOUND"
    });
    return;
  }

  response.json(ok(organization));
});

organizationsRouter.use("/:organizationId/services", servicesRouter);
organizationsRouter.use("/:organizationId/customers", customersRouter);
organizationsRouter.use("/:organizationId/appointments", appointmentsRouter);

import type { Response } from "express";

import { prisma } from "../database/prisma.js";

export async function serveLogo(organizationId: string, response: Response, options?: { cacheControl?: string }) {
  const logo = await prisma.organizationLogo.findUnique({
    where: { organizationId }
  });
  if (!logo) {
    response.sendStatus(404);
    return;
  }
  response.setHeader("Content-Type", logo.contentType);
  response.setHeader("Cache-Control", options?.cacheControl ?? "private, max-age=300");
  response.send(Buffer.from(logo.data));
}

export async function serveGalleryImage(
  organizationId: string,
  slot: number,
  response: Response,
  options?: { cacheControl?: string }
) {
  const image = await prisma.organizationGalleryImage.findUnique({
    where: {
      organizationId_slot: {
        organizationId,
        slot
      }
    }
  });
  if (!image) {
    response.sendStatus(404);
    return;
  }
  response.setHeader("Content-Type", image.contentType);
  response.setHeader("Cache-Control", options?.cacheControl ?? "private, max-age=300");
  response.send(Buffer.from(image.data));
}

import type { AuthTokenPayload } from "../lib/token.js";
import type { MembershipRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      auth?: AuthTokenPayload;
      tenant?: {
        organizationId: string;
        role: MembershipRole;
        timezone: string;
        userId: string;
      };
    }
  }
}

export {};

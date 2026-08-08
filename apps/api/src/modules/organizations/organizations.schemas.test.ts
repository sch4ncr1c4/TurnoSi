import { describe, expect, it } from "vitest";

import {
  updateOrganizationBusinessSettingsSchema,
  updateOrganizationContactSettingsSchema,
  updateOrganizationPageSettingsSchema,
  updateOrganizationPaymentsSettingsSchema
} from "./organizations.schemas.js";

describe("organization settings section schemas", () => {
  it("business settings only accept identity and gallery fields", () => {
    const result = updateOrganizationBusinessSettingsSchema.safeParse({
      name: "Barberia Shop",
      category: "Barbería",
      description: "Cortes y barba.",
      phone: "1122334455"
    });

    expect(result.success).toBe(false);
  });

  it("contact settings accept contact, location and social fields", () => {
    const result = updateOrganizationContactSettingsSchema.safeParse({
      phone: "+5491122334455",
      whatsapp: "+5491122334455",
      publicEmail: "contacto@turnosi.com",
      address: "Av. Siempre Viva 123",
      city: "Tapiales",
      province: "Buenos Aires",
      instagram: "@turnosi"
    });

    expect(result.success).toBe(true);
  });

  it("page settings do not accept mutable fields yet", () => {
    const result = updateOrganizationPageSettingsSchema.safeParse({
      slug: "barberia-shop"
    });

    expect(result.success).toBe(false);
  });

  it("payments settings only accept Mercado Pago and deposit fields", () => {
    const result = updateOrganizationPaymentsSettingsSchema.safeParse({
      mercadoPagoDisconnect: false,
      depositEnabled: true,
      depositAmountCents: 1500,
      instagram: "@turnosi"
    });

    expect(result.success).toBe(false);
  });
});

import { Prisma } from "@prisma/client";

type CustomerIdentity = {
  email?: string | null;
  phone?: string | null;
};

export function normalizeCustomerEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizeCustomerPhone(phone?: string | null) {
  let digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("549") && digits.length > 10) return digits.slice(3);
  if (digits.startsWith("54") && digits.length > 10) return digits.slice(2);
  if (digits.startsWith("0") && digits.length > 8) return digits.slice(1);

  return digits;
}

function phoneLookupValues(phone?: string | null) {
  const raw = phone?.trim();
  const digits = phone?.replace(/\D/g, "") ?? "";
  const normalized = normalizeCustomerPhone(phone);

  return [...new Set([raw, digits, normalized].filter(Boolean))] as string[];
}

export function customerIdentityData(identity: CustomerIdentity) {
  return {
    email: normalizeCustomerEmail(identity.email),
    phone: normalizeCustomerPhone(identity.phone)
  };
}

export function customerIdentityWhere(
  organizationId: string,
  identity: CustomerIdentity
): Prisma.CustomerWhereInput {
  const email = normalizeCustomerEmail(identity.email);
  const phones = phoneLookupValues(identity.phone);

  return {
    organizationId,
    deletedAt: null,
    OR: [
      ...(email
        ? [{ email: { equals: email, mode: Prisma.QueryMode.insensitive } }]
        : []),
      ...(phones.length ? [{ phone: { in: phones } }] : [])
    ]
  };
}


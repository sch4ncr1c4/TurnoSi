import { slugify } from "../../lib/slugify.js";

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? fullName.trim();
  const lastName = parts.join(" ") || null;

  return { firstName, lastName };
}

export function slugifyOrganizationName(name: string) {
  return slugify(name).slice(0, 60);
}

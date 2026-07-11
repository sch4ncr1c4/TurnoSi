import type { ZodSchema } from "zod";

export function parseFormData<T>(
  schema: ZodSchema<T>,
  data: Record<string, unknown>
): { success: true; parsed: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, parsed: result.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string") {
      fieldErrors[field] = issue.message;
    }
  }
  return { success: false, errors: fieldErrors };
}

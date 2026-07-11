import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export type Pagination = z.infer<typeof paginationSchema>;

export function paginate(pagination: Pagination) {
  const skip = (pagination.page - 1) * pagination.limit;
  return { skip, take: pagination.limit };
}

export function paginatedResponse<T>(data: T[], total: number, pagination: Pagination) {
  return {
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  };
}

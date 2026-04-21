/**
 * Pagination helpers for Prisma queries.
 * All list endpoints use cursor-based or offset pagination with a max of 20 items.
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Normalise raw pagination query params into safe, bounded values.
 */
export function parsePaginationParams(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE))
  );
  const skip = (page - 1) * pageSize;

  return { skip, take: pageSize, page, pageSize };
}

/**
 * Build a PaginatedResult from a data array and total count.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);

  return {
    data,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Convenience wrapper: run a Prisma findMany + count in parallel and return
 * a PaginatedResult.
 *
 * @example
 * const result = await paginate(
 *   (args) => prisma.provider.findMany(args),
 *   () => prisma.provider.count({ where }),
 *   { where },
 *   { page: 1, pageSize: 20 }
 * );
 */
export async function paginate<T>(
  findMany: (args: { skip: number; take: number }) => Promise<T[]>,
  count: () => Promise<number>,
  paginationParams: PaginationParams
): Promise<PaginatedResult<T>> {
  const { skip, take, page, pageSize } = parsePaginationParams(paginationParams);

  const [data, total] = await Promise.all([findMany({ skip, take }), count()]);

  return buildPaginatedResult(data, total, page, pageSize);
}

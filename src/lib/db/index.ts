/**
 * Database utility functions.
 *
 * Re-exports pagination helpers and transaction helpers for convenient
 * single-import access throughout the application.
 */

export {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  parsePaginationParams,
  buildPaginatedResult,
  paginate,
} from "./pagination";

export type { PaginationParams, PaginationMeta, PaginatedResult } from "./pagination";

export {
  withTransaction,
  bookAppointmentAtomically,
  updateQueueItemAtomically,
} from "./transactions";

export type { TransactionClient } from "./transactions";

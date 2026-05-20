/**
 * Centralized entity ID generation. All new entities must use createId().
 */

const DEFAULT_SUFFIX_LEN = 6;

export function createId(prefix: string, opts?: { suffixLen?: number }): string {
  const len = opts?.suffixLen ?? DEFAULT_SUFFIX_LEN;
  const suffix = Math.random().toString(36).slice(2, 2 + len);
  const ts = Date.now().toString(36);
  return `${prefix}${ts}${suffix}`;
}

/** One-time migration: numeric legacy id → prefixed string. */
export function createNumericLegacyId(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(3, "0")}`;
}

/** Sequential customer IDs: `CUST-0001`, `CUST-0002`, … (also considers legacy `C001` seeds). */
export const CUSTOMER_ID_PREFIX = "CUST";
export const CUSTOMER_ID_PAD = 4;

/** Parse numeric sequence from `CUST-0007` or legacy seed `C012`. */
export function parseCustomerSequenceNumber(id: string): number | null {
  const trimmed = id.trim();
  const custMatch = trimmed.match(/^CUST-(\d+)$/i);
  if (custMatch) {
    const n = Number.parseInt(custMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  const legacyMatch = trimmed.match(/^C(\d+)$/i);
  if (legacyMatch) {
    const n = Number.parseInt(legacyMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Next unused customer id across existing rows (repository, seed, or UI list). */
export function createNextCustomerId(existingIds: Iterable<string>): string {
  let max = 0;
  for (const id of existingIds) {
    const n = parseCustomerSequenceNumber(id);
    if (n != null && n > max) max = n;
  }
  return `${CUSTOMER_ID_PREFIX}-${String(max + 1).padStart(CUSTOMER_ID_PAD, "0")}`;
}

/** True when `id` is a legacy seed (`C018`) or sequential `CUST-0007`. */
export function isRecognizedCustomerId(id: string): boolean {
  return parseCustomerSequenceNumber(id.trim()) != null;
}

/**
 * Opaque / placeholder-style ids from pre-M14 generators (`CUST-2026-K2J5…`, `createId("C")`, etc.).
 */
export function isOpaqueCustomerId(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return true;
  if (isRecognizedCustomerId(trimmed)) return false;
  if (/^CUST-/i.test(trimmed)) return true;
  if (/^C[a-z0-9]{4,}$/i.test(trimmed) && !/^C\d{1,4}$/i.test(trimmed)) return true;
  return false;
}

/** User-facing customer reference (sequential `CUST-NNNN`; legacy `C018` unchanged). */
export function formatCustomerIdDisplay(id: string): string {
  const trimmed = id.trim();
  if (isOpaqueCustomerId(trimmed)) return trimmed;
  const n = parseCustomerSequenceNumber(trimmed);
  if (n != null && /^CUST-/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

/** Allocate a sequential id when the proposed id is missing, duplicate, or opaque. */
export function ensureSequentialCustomerId(
  proposedId: string,
  existingIds: Iterable<string>,
): string {
  const trimmed = proposedId.trim();
  const taken = new Set(existingIds);
  if (
    trimmed &&
    !isOpaqueCustomerId(trimmed) &&
    isRecognizedCustomerId(trimmed) &&
    !taken.has(trimmed)
  ) {
    return trimmed;
  }
  return createNextCustomerId(existingIds);
}

export const ID_PREFIX = {
  project: "P",
  customer: "C",
  quotation: "Q",
  invoice: "INV",
  employee: "EMP",
  vendor: "V",
  tool: "TOOL",
  site: "SITE",
  inventory: "INV",
  team: "T",
  payment: "PAY",
  expense: "EXP",
  income: "INC",
} as const;

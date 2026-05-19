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

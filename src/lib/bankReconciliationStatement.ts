import type {
  BankReconciliationStatement,
  BankStatementTransaction,
} from "@/types/finance";

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeTransaction(raw: unknown): BankStatementTransaction | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const date = typeof row.date === "string" ? row.date.trim() : "";
  if (!date) return null;
  return {
    date,
    description: typeof row.description === "string" ? row.description : "",
    debit: parseAmount(row.debit),
    credit: parseAmount(row.credit),
    balance: parseAmount(row.balance),
    reference: typeof row.reference === "string" ? row.reference : undefined,
    rawLine: typeof row.rawLine === "string" ? row.rawLine : "",
  };
}

/** Coerce persisted/localStorage rows into a typed statement (drops invalid rows). */
export function normalizeBankReconciliationStatement(
  raw: unknown,
): BankReconciliationStatement | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  if (!id) return null;
  const transactions = Array.isArray(row.transactions)
    ? row.transactions
        .map(normalizeTransaction)
        .filter((t): t is BankStatementTransaction => t !== null)
    : [];
  return {
    id,
    fileName: typeof row.fileName === "string" ? row.fileName : "statement.csv",
    type: row.type === "cash" ? "cash" : "bank",
    transactions,
    uploadedAt:
      typeof row.uploadedAt === "string" ? row.uploadedAt : new Date().toISOString(),
  };
}

export function normalizeBankReconciliationStatements(
  raw: unknown,
): BankReconciliationStatement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeBankReconciliationStatement)
    .filter((s): s is BankReconciliationStatement => s !== null);
}

export function isBankReconciliationStatement(
  value: unknown,
): value is BankReconciliationStatement {
  return normalizeBankReconciliationStatement(value) !== null;
}

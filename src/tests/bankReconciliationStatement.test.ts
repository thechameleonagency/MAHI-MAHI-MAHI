import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import { normalizeAppState } from "@/data/appSeedBuilder";
import {
  isBankReconciliationStatement,
  normalizeBankReconciliationStatements,
} from "@/lib/bankReconciliationStatement";

describe("bankReconciliationStatement (MN3)", () => {
  it("normalizes partial persisted rows and drops invalid entries", () => {
    const normalized = normalizeBankReconciliationStatements([
      {
        id: "stmt-1",
        fileName: "hdfc.csv",
        type: "bank",
        uploadedAt: "2026-03-01T00:00:00.000Z",
        transactions: [
          { date: "25/03/2026", description: "NEFT", debit: 0, credit: "12,500", balance: 100000, rawLine: "line" },
          { date: "", description: "skip" },
        ],
      },
      { id: "" },
      null,
    ]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.transactions).toHaveLength(1);
    expect(normalized[0]?.transactions[0]?.credit).toBe(12500);
    expect(isBankReconciliationStatement(normalized[0])).toBe(true);
  });

  it("business seed statements survive hydrate with ids and transactions", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(hydrated.bankReconciliationStatements.length).toBeGreaterThan(0);
    for (const stmt of hydrated.bankReconciliationStatements) {
      expect(stmt.id).toBeTruthy();
      expect(stmt.fileName).toBeTruthy();
      expect(["bank", "cash"]).toContain(stmt.type);
      expect(Array.isArray(stmt.transactions)).toBe(true);
      expect(isBankReconciliationStatement(stmt)).toBe(true);
    }
  });

  it("normalizeAppState coerces unknown statement arrays", () => {
    const next = normalizeAppState({
      bankReconciliationStatements: [
        { id: "x", fileName: "a.csv", type: "bank", uploadedAt: "2026-01-01", transactions: [] },
        { bad: true },
      ] as never,
    });
    expect(next.bankReconciliationStatements).toHaveLength(1);
    expect(next.bankReconciliationStatements[0]?.id).toBe("x");
  });
});

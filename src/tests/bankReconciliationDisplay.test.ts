import { describe, expect, it } from "vitest";
import {
  buildReconciliationMatchDetailLines,
  hasReconciliationExpandableDetail,
  reconciliationResultRowKey,
} from "@/lib/bankReconciliationDisplay";

describe("bankReconciliationDisplay (T5)", () => {
  it("builds stable row keys for expand state", () => {
    expect(reconciliationResultRowKey("stmt-1", 3)).toBe("stmt-1:3");
  });

  it("formats matched ledger lines for expand panel", () => {
    const lines = buildReconciliationMatchDetailLines({
      flag: "matched",
      matchedLedgerEntry: {
        id: "PAY-001",
        type: "Payment",
        description: "Client receipt — Mahesh Babu",
        amount: 50_000,
        date: "2026-04-15",
      },
    });
    expect(lines[0]).toEqual({ label: "Matched to", value: "Payment" });
    expect(lines.some((l) => l.label === "Description" && l.value.includes("Mahesh"))).toBe(true);
    expect(lines.some((l) => l.label === "Ledger id" && l.value === "PAY-001")).toBe(true);
  });

  it("labels possible-match rows distinctly", () => {
    const lines = buildReconciliationMatchDetailLines({
      flag: "possible-match",
      matchedLedgerEntry: {
        id: "EXP-2",
        type: "Expense",
        description: "Petty cash",
        amount: 1200,
        date: "2026-03-01",
      },
    });
    expect(lines[0].label).toBe("Possible match");
  });

  it("falls back to notes when unmatched", () => {
    expect(
      hasReconciliationExpandableDetail({ flag: "unmatched", notes: "No amount match in ledger" }),
    ).toBe(true);
    const lines = buildReconciliationMatchDetailLines({
      flag: "unmatched",
      notes: "No amount match in ledger",
    });
    expect(lines[0].value).toContain("No amount match");
  });
});

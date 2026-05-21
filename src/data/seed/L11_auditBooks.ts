import type { AppState } from "@/contexts/AppDataContext";
import type { BankReconciliationStatement } from "@/types/finance";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt, seedDateAt } from "./seedTimeModel";
import { countFor, pushAudit } from "./seedHelpers";

/** L11 — bank reconciliation statements + supplemental audit logs. */
export function buildL11AuditBooks(state: AppState, profile: SeedProfile): AppState {
  const stmtCount = countFor(profile, 8);
  const statements: BankReconciliationStatement[] = [];

  for (let s = 0; s < stmtCount; s++) {
    const stmtId = seedId(SEED_ID_PREFIX.bankStatement);
    const payments = state.payments.slice(s * 3, s * 3 + 5);
    let balance = 850000 + s * 10000;
    const transactions = payments.map((p, i) => {
      const credit = p.direction === "in" ? p.amount : 0;
      const debit = p.direction === "out" ? p.amount : 0;
      balance += credit - debit;
      if (i % 4 !== 3) {
        p.reconciledWith = {
          statementId: stmtId,
          statementName: `HDFC-Mar-${s + 1}.csv`,
          bankEntryDate: p.date,
          matchFlag: "matched",
          matchedAt: seedDateAt(0.7 + s * 0.02),
        };
      }
      return {
        date: p.date,
        description: `NEFT ${p.counterpartyType} ${p.projectName ?? ""}`.trim(),
        debit,
        credit,
        balance,
        reference: p.reference,
        rawLine: `${p.date},${p.amount},${p.paymentMode}`,
      };
    });

    transactions.push({
      date: seedDayAt(0.72 + s * 0.01),
      description: "UPI transfer — unmapped reference",
      debit: 0,
      credit: 12500,
      balance: balance + 12500,
      rawLine: "unmatched",
    });

    statements.push({
      id: stmtId,
      fileName: `HDFC-Current-4821-${["Jan", "Feb", "Mar", "Apr", "May"][s % 5]}-2026.csv`,
      type: "bank",
      transactions,
      uploadedAt: seedDateAt(0.75 + s * 0.01),
    });
  }

  state.bankReconciliationStatements = statements;

  for (let i = 0; i < Math.min(6, state.expenses.length); i++) {
    const exp = state.expenses[i];
    const stmt = statements[i % statements.length];
    if (stmt && i % 2 === 0) {
      exp.reconciledWith = {
        statementId: stmt.id,
        statementName: stmt.fileName,
        bankEntryDate: exp.date,
        matchFlag: "matched",
      };
    }
  }

  const extraActions: Array<{ entityType: string; action: "create" | "update" | "delete" }> = [
    { entityType: "Payment", action: "update" },
    { entityType: "Payment", action: "delete" },
    { entityType: "Income", action: "update" },
    { entityType: "Income", action: "delete" },
    { entityType: "Partner", action: "update" },
    { entityType: "Employee", action: "update" },
    { entityType: "Quotation", action: "update" },
    { entityType: "MaterialDamage", action: "create" },
    { entityType: "SiteVisit", action: "create" },
    { entityType: "Blockage", action: "update" },
  ];
  for (let i = 0; i < extraActions.length; i++) {
    pushAudit(state, {
      action: extraActions[i].action,
      entityType: extraActions[i].entityType,
      entityId: seedId("AUD"),
      entityName: `${extraActions[i].entityType} seed coverage`,
      fraction: 0.8 + i * 0.005,
      role: i % 2 === 0 ? "super_admin" : "admin",
    });
  }

  return state;
}

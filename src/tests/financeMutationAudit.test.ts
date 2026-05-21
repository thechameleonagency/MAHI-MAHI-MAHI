import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("M5 — finance mutation audit coverage", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
    "utf8",
  );

  it("deletePayment appends audit with amount reversal", () => {
    expect(source).toMatch(
      /const deletePayment = useCallback[\s\S]*?createAuditEntry\(\s*"delete",\s*"Payment"/,
    );
    expect(source).toMatch(
      /deletePayment[\s\S]*?"amount",\s*String\(payment\.amount\),\s*"0"/,
    );
    expect(source).toMatch(/deletePayment[\s\S]*?auditLogs: \[\.\.\.auditLogs, \.\.\.prev\.auditLogs\]/);
  });

  it("deletePayment audits linked CPR rows", () => {
    expect(source).toContain("isClientPaymentRecordPayment(payment)");
    expect(source).toMatch(
      /deletePayment[\s\S]*?createAuditEntry\(\s*"delete",\s*"ClientPaymentRecord"/,
    );
  });

  it("updatePayment uses auditFieldDiff for field-level trail", () => {
    expect(source).toMatch(
      /const updatePayment = useCallback[\s\S]*?auditFieldDiff\(\s*createAuditEntry,\s*"Payment"/,
    );
  });

  it("updateVendorBill uses auditFieldDiff", () => {
    expect(source).toMatch(
      /const updateVendorBill = useCallback[\s\S]*?auditFieldDiff\(\s*createAuditEntry,\s*"VendorBill"/,
    );
  });

  it("resolveBlockage logs status transition", () => {
    expect(source).toMatch(
      /const resolveBlockage = useCallback[\s\S]*?createAuditEntry\(\s*"update",\s*"Blockage"/,
    );
    expect(source).toMatch(/resolveBlockage[\s\S]*?before\.status[\s\S]*?"resolved"/);
  });

  it("dismissAccountingReviewItem logs queue dismissal with amount", () => {
    expect(source).toMatch(
      /dismissAccountingReviewItem[\s\S]*?createAuditEntry\(\s*"delete",\s*"AccountingReviewQueue"/,
    );
    expect(source).toMatch(
      /dismissAccountingReviewItem[\s\S]*?String\(item\.amount\)/,
    );
  });
});

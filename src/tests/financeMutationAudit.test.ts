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
    expect(source).toContain("applyPaymentDeletionToLedger");
    expect(source).toContain("resolveClientPaymentRecordIdFromPayment(payment)");
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

  it("updateVendorBill plans GL adjustments via planVendorBillAccountingUpdate (MD7)", () => {
    expect(source).toContain("planVendorBillAccountingUpdate");
    expect(source).toMatch(
      /updateVendorBill[\s\S]*?await recordWarehouseInventoryMovement/,
    );
  });

  it("addVendorBill awaits warehouse receipt before persisting bill (ER6)", () => {
    expect(source).toMatch(
      /addVendorBill[\s\S]*?recordWarehouseInventoryMovement[\s\S]*?setState/,
    );
    expect(source).toContain("warehouseReceiptApplied");
    expect(source).toContain("enqueueWarehouseMovement");
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

  it("deleteVendorPayment logs amount reversal on vendor payment delete", () => {
    expect(source).toMatch(
      /deleteVendorPayment[\s\S]*?createAuditEntry\(\s*"delete",\s*"VendorPayment"/,
    );
    expect(source).toMatch(
      /deleteVendorPayment[\s\S]*?"amount",\s*String\(payment\.amount\),\s*"0"/,
    );
    expect(source).toMatch(/deleteVendorPayment[\s\S]*?stripVendorPaymentAccounting/);
  });

  it("ClientPaymentHistory wires CPR delete to deletePayment", () => {
    const history = readFileSync(
      resolve(process.cwd(), "src/components/projects/ClientPaymentHistory.tsx"),
      "utf8",
    );
    const projectDetail = readFileSync(
      resolve(process.cwd(), "src/pages/ProjectDetail.tsx"),
      "utf8",
    );
    expect(history).toContain("onDeletePayment");
    expect(history).toContain("DestructiveConfirmDialog");
    expect(projectDetail).toContain("clientPaymentRecordPaymentId(cprId)");
    expect(projectDetail).toContain("deletePayment(clientPaymentRecordPaymentId");
  });
});

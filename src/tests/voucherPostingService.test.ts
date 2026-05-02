import { describe, expect, it } from "vitest";
import { VoucherPostingService } from "@/application/services/VoucherPostingService";

describe("VoucherPostingService", () => {
  const service = new VoucherPostingService();

  it("creates balanced voucher for invoice issued", () => {
    const result = service.post({
      type: "InvoiceIssued",
      sourceDocumentId: "INV-1",
      amount: 1180,
      gstAmount: 180,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const debit = result.voucher.lines.reduce((sum, line) => sum + line.debit, 0);
      const credit = result.voucher.lines.reduce((sum, line) => sum + line.credit, 0);
      expect(debit).toBe(credit);
    }
  });

  it("sends unsupported event to review queue", () => {
    const result = service.post({
      type: "PartnerPayoutRecorded",
      sourceDocumentId: "PP-1",
      amount: 1000,
    });
    expect(result.ok).toBe(false);
  });
});

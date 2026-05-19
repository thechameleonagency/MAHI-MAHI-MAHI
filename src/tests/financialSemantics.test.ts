import { describe, expect, it } from "vitest";
import {
  formatProfitMargin,
  getRevenueAccrual,
  getRevenueCash,
  resolveContractAmount,
} from "@/domain/finance/financialSemantics";
import { seedInvoices, seedPayments, seedQuotations } from "@/data/seedData";

describe("financialSemantics", () => {
  it("resolveContractAmount prefers clientAgreedAmount", () => {
    const q = seedQuotations.find((x) => x.clientAgreedAmount != null);
    if (!q) {
      const fallback = seedQuotations[0];
      expect(resolveContractAmount(fallback)).toBe(fallback?.totalAmount ?? 0);
      return;
    }
    expect(resolveContractAmount(q)).toBe(q.clientAgreedAmount);
  });

  it("formatProfitMargin returns em dash when revenue is zero", () => {
    expect(formatProfitMargin(0, 0)).toBe("—");
    expect(formatProfitMargin(100, 0)).toBe("—");
  });

  it("formatProfitMargin computes percentage when revenue positive", () => {
    expect(formatProfitMargin(25, 100)).toBe("25.0");
  });

  it("getRevenueCash matches payment sum", () => {
    const cash = getRevenueCash(seedPayments);
    const sum = seedPayments.filter((p) => p.direction === "in").reduce((s, p) => s + p.amount, 0);
    expect(cash).toBe(sum);
  });

  it("getRevenueAccrual excludes voided and draft", () => {
    const accrual = getRevenueAccrual(seedInvoices);
    const manual = seedInvoices
      .filter((i) => i.status !== "voided" && i.status !== "draft")
      .reduce((s, i) => s + i.total, 0);
    expect(accrual).toBe(manual);
  });
});

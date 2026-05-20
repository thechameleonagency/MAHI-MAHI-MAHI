import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLowStockAging,
  getProjectOnHoldAging,
  getQuotationAwaitingApprovalAging,
  getQuotationDraftStaleAging,
  getQuotationInFlightAging,
} from "@/lib/agingHelpers";
import type { Project, Quotation } from "@/types/project";

describe("dashboard aging helpers (O3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flags fresh sent quotation as awaiting approval", () => {
    const q = {
      status: "sent",
      sentAt: "2026-05-17",
      createdAt: "2026-05-17",
    } as Quotation;
    expect(getQuotationAwaitingApprovalAging(q)?.label).toMatch(/Awaiting approval/);
    expect(getQuotationInFlightAging(q)?.tone).toBe("warning");
  });

  it("flags stale draft quotations", () => {
    const q = {
      status: "draft",
      createdAt: "2026-04-01",
      updatedAt: "2026-04-01",
    } as Quotation;
    expect(getQuotationDraftStaleAging(q)?.label).toMatch(/Draft \d+d/);
    expect(getQuotationInFlightAging(q)?.tone).toBe("danger");
  });

  it("flags project on hold duration", () => {
    const p = {
      status: "On Hold",
      updatedAt: "2026-05-01",
      createdAt: "2026-04-01",
    } as Project;
    expect(getProjectOnHoldAging(p)?.label).toMatch(/On hold \d+d/);
  });

  it("skips on-hold aging chip when hold is less than one day (DS5)", () => {
    const p = {
      status: "On Hold",
      updatedAt: "2026-05-17",
      createdAt: "2026-04-01",
    } as Project;
    expect(getProjectOnHoldAging(p)).toBeNull();
  });

  it("flags low stock severity", () => {
    expect(getLowStockAging(0, 10)?.label).toBe("Out of stock");
    expect(getLowStockAging(2, 10)?.tone).toBe("danger");
  });
});

import { describe, expect, it } from "vitest";
import {
  projectCompletionInvoiceBlockReason,
  projectRequiresClientInvoiceForCompletion,
} from "@/lib/projectCompletionInvoice";
import { normalizeProject } from "@/lib/projectNormalize";
import { ProjectInvariantService } from "@/domain/project/ProjectInvariantService";
import type { Project } from "@/types/project";

const baseProject = (over: Partial<Project>): Project =>
  normalizeProject({
    id: "PX",
    name: "Test",
    type: "EPC",
    projectType: "Residential",
    projectCategory: "solar",
    ownerType: "solo",
    customerId: "C001",
    progressStage: "w",
    client: "X",
    capacity: "5",
    location: "J",
    assignees: [],
    onSite: 0,
    contractAmount: 100,
    totalCost: 50,
    amountReceived: 0,
    photos: 0,
    startDate: "2026-01-01",
    endDate: null,
    projectKind: "SOLO_EPC",
    createdAt: "2026-01-01",
    lifecycleStatus: "Active",
    executionPhase: "execution",
    ...over,
  });

describe("projectCompletionInvoice", () => {
  it("requires client invoice for SOLO_EPC", () => {
    const p = baseProject({ projectKind: "SOLO_EPC" });
    expect(projectRequiresClientInvoiceForCompletion(p)).toBe(true);
    expect(
      projectCompletionInvoiceBlockReason(p, []),
    ).toMatch(/at least one invoice/i);
  });

  it("skips invoice gate for VENDORSHIP_ONLY", () => {
    const p = baseProject({ projectKind: "VENDORSHIP_ONLY" });
    expect(projectRequiresClientInvoiceForCompletion(p)).toBe(false);
    expect(projectCompletionInvoiceBlockReason(p, [])).toBeNull();
    expect(projectCompletionInvoiceBlockReason(p, [{ total: 100, amountReceived: 0, invoiceNumber: "X" }])).toBeNull();
  });

  it("skips invoice gate for OUTSOURCED_INC", () => {
    const p = baseProject({ projectKind: "OUTSOURCED_INC" });
    expect(projectRequiresClientInvoiceForCompletion(p)).toBe(false);
    expect(projectCompletionInvoiceBlockReason(p, [])).toBeNull();
  });

  it("aligns ProjectInvariantService — no invoice reason for VENDORSHIP_ONLY", () => {
    const svc = new ProjectInvariantService();
    const vendorship = baseProject({
      id: "V1",
      projectKind: "VENDORSHIP_ONLY",
      executionLineItems: [],
      generatedDocuments: [
        {
          id: "d1",
          docKey: "vendor_code_agreement",
          title: "Vendor code agreement",
          createdAt: "2026-01-01",
          bodyHtml: "<p>ok</p>",
        },
      ],
    });
    const { reasons } = svc.canMarkCompleted("V1", {
      projects: [vendorship],
      invoices: [],
      saleBills: [],
      expenses: [],
      incomes: [],
      blockages: [],
      accountingReviewQueue: [],
      attendanceRecords: [],
    });
    expect(reasons.some((r) => /invoice|sale bill/i.test(r))).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  ProjectInvariantService,
  validateProjectPartnerCount,
  type ProjectInvariantWorld,
} from "@/domain/project/ProjectInvariantService";
import type { Project } from "@/types/project";

const baseProject = (over: Partial<Project>): Project => ({
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

const emptyWorld = (projects: Project[]): ProjectInvariantWorld => ({
  projects,
  invoices: [],
  saleBills: [],
  expenses: [],
  incomes: [],
  blockages: [],
  accountingReviewQueue: [],
  attendanceRecords: [],
});

describe("ProjectInvariantService", () => {
  const svc = new ProjectInvariantService();

  describe("validateProjectCreate (M7)", () => {
    it("rejects more than one partner", () => {
      const r = validateProjectPartnerCount([
        { partnerId: "P1", partnerName: "A", partnerType: "profit", calculatedEarning: 0, settlementDirection: "company_pays_partner" },
        { partnerId: "P2", partnerName: "B", partnerType: "profit", calculatedEarning: 0, settlementDirection: "company_pays_partner" },
      ]);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe("PARTNER_COUNT");
    });

    it("rejects SOLO_EPC without quotation on intake path", () => {
      const r = svc.validateProjectCreate({ project: { projectKind: "SOLO_EPC" } });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe("QUOTATION_REQUIRED");
    });

    it("does not require quotation for direct-exception pre-build validation", () => {
      const r = svc.validateProjectCreate({ directExceptionReason: "Approved by board" });
      expect(r.ok).toBe(true);
    });

    it("requires direct-exception reason when validated", () => {
      const r = svc.validateProjectCreate({ directExceptionReason: "   " });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errorCode).toBe("REASON_REQUIRED");
    });
  });

  it("blocks completion when execution line is short vs BOQ", () => {
    const p = baseProject({
      id: "P1",
      executionLineItems: [
        {
          id: "L1",
          description: "Mod",
          quantity: 10,
          unit: "pcs",
          rate: 1,
          total: 10,
          source: "quotation",
          issuedQty: 2,
          inventoryItemId: 20,
        },
      ],
    });
    const w = emptyWorld([p]);
    const { ok } = svc.canMarkCompleted("P1", w);
    expect(ok).toBe(false);
  });

  it("allows vendor_network without project invoice doc", () => {
    const p = baseProject({
      id: "P2",
      projectKind: "VENDOR_NETWORK",
      executionLineItems: [],
    });
    const w = emptyWorld([p]);
    const { ok, reasons } = svc.canMarkCompleted("P2", w);
    expect(ok).toBe(true);
    expect(reasons).toHaveLength(0);
  });

  it("blocks SOLO_EPC without invoices linked to project", () => {
    const p = baseProject({ id: "P3", projectKind: "SOLO_EPC" });
    const w = emptyWorld([p]);
    const { ok } = svc.canMarkCompleted("P3", w);
    expect(ok).toBe(false);
  });

  it("allows VENDORSHIP_ONLY without project invoices", () => {
    const p = baseProject({ id: "P4", projectKind: "VENDORSHIP_ONLY", executionLineItems: [] });
    const w = emptyWorld([p]);
    const { ok, reasons } = svc.canMarkCompleted("P4", w);
    expect(ok).toBe(true);
    expect(reasons).toHaveLength(0);
  });

  it("allows OUTSOURCED_INC without project invoices", () => {
    const p = baseProject({ id: "P5", projectKind: "OUTSOURCED_INC", executionLineItems: [] });
    const w = emptyWorld([p]);
    const { ok } = svc.canMarkCompleted("P5", w);
    expect(ok).toBe(true);
  });
});

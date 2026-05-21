import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import {
  applyChangeRequestToProject,
  resolveChangeRequestDeltaAmount,
  scaleAgentAccrualsForContractChange,
} from "@/lib/changeRequestApproval";
import { applyMaterialReservationReleases } from "@/lib/changeRequestMaterialContinuity";
import { findStaleChangeRequestBilling } from "@/lib/changeRequestPipelineContinuity";
import type { AgentCommissionAccrual } from "@/types/operations";
import type { Project } from "@/types/project";
import type { ProjectChangeRequest } from "@/types/operations";

const baseProject: Project = {
  id: "P-1",
  name: "Test 10kW",
  client: "Client",
  customerId: "C-1",
  agentId: "AG-1",
  capacity: "10kW",
  contractAmount: 500000,
  commercialBaseline: { basis: "per_kw", rateValue: 50_000, pricingQuantity: 10 },
  projectType: "Residential",
  startDate: "2026-05-01",
  createdAt: "2026-05-01",
  executionLineItems: [
    {
      id: "BL-1",
      inventoryItemId: "INV-PANEL",
      description: "Panel",
      quantity: 10,
      unit: "pcs",
      rate: 0,
      total: 0,
      source: "manual",
      issuedQty: 0,
    },
  ],
  siteChecklist: [
    {
      id: "chk-1",
      name: "Panel 540W",
      unit: "pcs",
      qtyPlanned: 10,
      qtySent: 0,
      qtyReturned: 0,
      qtyConsumed: 0,
    },
  ],
} as Project;

describe("change request scope reduction (V4 / M1)", () => {
  it("resolveChangeRequestDeltaAmount accepts negative explicit amounts", () => {
    const cr: ProjectChangeRequest = {
      id: "CR-NEG",
      projectId: "P-1",
      type: "addon-work",
      deltaAmount: -30000,
      status: "draft",
      requestedAt: "2026-05-10",
    };
    expect(resolveChangeRequestDeltaAmount(baseProject, cr)).toBe(-30000);
  });

  it("applyChangeRequestToProject reduces contract and emits reservation releases", () => {
    const cr: ProjectChangeRequest = {
      id: "CR-NEG",
      projectId: "P-1",
      type: "addon-work",
      deltaAmount: -25000,
      materialDelta: [{ itemId: "INV-PANEL", deltaQty: -2 }],
      status: "draft",
      requestedAt: "2026-05-10",
    };
    const { projectPatch, reservations, reservationReleases, deltaAmount } =
      applyChangeRequestToProject(baseProject, cr, [
        { id: "INV-PANEL", name: "Panel 540W", unit: "pcs" },
      ]);

    expect(deltaAmount).toBe(-25000);
    expect(projectPatch.contractAmount).toBe(475000);
    expect(reservations).toHaveLength(0);
    expect(reservationReleases).toEqual([
      expect.objectContaining({ itemId: "INV-PANEL", qty: 2, projectId: "P-1" }),
    ]);
    expect(projectPatch.siteChecklist?.[0]?.qtyPlanned).toBe(8);
  });

  it("applyMaterialReservationReleases reduces active reservation qty", () => {
    const next = applyMaterialReservationReleases(
      [
        {
          id: "RES-1",
          itemId: "INV-PANEL",
          qty: 4,
          projectId: "P-1",
          createdAt: "2026-05-01",
          source: "manual",
        },
      ],
      {
        itemId: "INV-PANEL",
        qty: 2,
        projectId: "P-1",
        reason: "CR scope reduction",
      },
    );
    expect(next[0]?.qty).toBe(2);
    expect(next[0]?.releasedAt).toBeUndefined();
  });

  it("scaleAgentAccrualsForContractChange scales down on negative contract delta", () => {
    const accruals: AgentCommissionAccrual[] = [
      {
        id: "ACC-1",
        agentId: "AG-1",
        projectId: "P-1",
        expectedAmount: 50000,
        status: "pending",
        accruedAt: "2026-05-01",
      },
    ];
    const scaled = scaleAgentAccrualsForContractChange(accruals, "P-1", 500000, 475000);
    expect(scaled[0]?.expectedAmount).toBe(47500);
  });

  it("hydrated seed includes scope-reduction CR without billable invoice stale rows", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    const reduction = hydrated.projectChangeRequests?.find((cr) =>
      cr.notes?.toLowerCase().includes("scope reduction"),
    );
    expect(reduction?.status).toBe("approved");
    expect(reduction?.deltaAmount).toBeLessThan(0);
    expect(reduction?.generatedInvoiceId).toBeFalsy();
    expect(findStaleChangeRequestBilling(hydrated)).toEqual([]);
    const project = hydrated.projects.find((p) => p.id === reduction?.projectId);
    expect(project).toBeTruthy();
    const accrual = hydrated.agentCommissionAccruals?.find(
      (a) =>
        a.projectId === project?.id ||
        (project?.quotationId != null && a.sourceQuotationId === project.quotationId),
    );
    expect(accrual?.expectedAmount ?? 0).toBeGreaterThan(0);
  });
});

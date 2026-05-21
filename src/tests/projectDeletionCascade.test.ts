import { describe, expect, it } from "vitest";

import {
  applyProjectDeletionToState,
  buildProjectDeletionAuditEntry,
  countProjectDeletionCascade,
  formatProjectDeletionCascadeSummary,
  totalProjectDeletionCascadeRecords,
  unlinkQuotationsFromDeletedProject,
  type ProjectDeletionStateSlice,
} from "@/lib/projectDeletionCascade";
import type { AuditLogEntry } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

const emptySlice = (): ProjectDeletionStateSlice => ({
  projects: [],
  invoices: [],
  saleBills: [],
  tasks: [],
  expenses: [],
  incomes: [],
  payments: [],
  sites: [],
  blockages: [],
  operationalTickets: [],
  clientPaymentRecords: [],
  projectTimelineByProjectId: {},
  scheduledInstallations: [],
  siteVisits: [],
  projectChangeRequests: [],
  materialReservations: [],
  agentCommissionAccruals: [],
  materialDamageRecords: [],
  procurementNeedLines: [],
  ownerInvestments: [],
  partnerTransactions: [],
  accountingReviewQueue: [],
  agentCommissionPayments: [],
  quotations: [],
});

const baseProject = (): Project => ({
  id: "PROJ-1",
  name: "Site Alpha",
  type: "EPC",
  projectType: "Residential",
  projectCategory: "solar",
  ownerType: "solo",
  projectKind: "SOLO_EPC",
  progressStage: "new",
  client: "Client",
  capacity: "5 kW",
  location: "Jaipur",
  lifecycleStatus: "New",
  contractAmount: 100_000,
  totalCost: 0,
  amountReceived: 0,
  assignees: [],
  onSite: 0,
  photos: 0,
  startDate: "2026-01-01",
  endDate: null,
  createdAt: "2026-01-01",
  quotationId: "Q-1",
});

describe("E3 project deletion cascade", () => {
  it("counts related rows keyed by projectId", () => {
    const state: ProjectDeletionStateSlice = {
      ...emptySlice(),
      projects: [baseProject()],
      invoices: [{ id: "INV-1", projectId: "PROJ-1" } as never],
      expenses: [
        { id: "EX-1", projectId: "PROJ-1" } as never,
        { id: "EX-2", projectId: "PROJ-1" } as never,
      ],
      projectChangeRequests: [{ id: "CR-1", projectId: "PROJ-1" } as never],
      projectTimelineByProjectId: { "PROJ-1": { projectId: "PROJ-1" } as never },
      quotations: [
        {
          id: "Q-1",
          quotationNumber: "Q-001",
          status: "converted_to_project",
          linkedProjectId: "PROJ-1",
          clientName: "C",
          clientPhone: "1",
          clientEmail: "c@x.com",
          clientCity: "J",
          clientState: "R",
          paymentType: "cash",
          totalAmount: 1,
          createdAt: "2026-01-01",
        } as Quotation,
      ],
    };

    const counts = countProjectDeletionCascade(state, "PROJ-1");
    expect(counts.invoices).toBe(1);
    expect(counts.expenses).toBe(2);
    expect(counts.projectChangeRequests).toBe(1);
    expect(counts.projectTimeline).toBe(1);
    expect(counts.quotationsUnlinked).toBe(1);
    expect(totalProjectDeletionCascadeRecords(counts)).toBe(6);
  });

  it("formatProjectDeletionCascadeSummary includes project id and totals", () => {
    const summary = formatProjectDeletionCascadeSummary("Site Alpha", "PROJ-1", {
      invoices: 2,
      saleBills: 0,
      tasks: 0,
      expenses: 1,
      incomes: 0,
      payments: 0,
      sites: 0,
      blockages: 0,
      operationalTickets: 0,
      clientPaymentRecords: 0,
      projectTimeline: 0,
      scheduledInstallations: 0,
      siteVisits: 0,
      projectChangeRequests: 0,
      materialReservations: 0,
      agentCommissionAccruals: 0,
      materialDamageRecords: 0,
      procurementNeedLines: 0,
      ownerInvestments: 0,
      partnerTransactions: 0,
      incGiverTransactions: 0,
      accountingReviewQueue: 0,
      agentCommissionPayments: 0,
      quotationsUnlinked: 1,
    });
    expect(summary).toContain("Site Alpha");
    expect(summary).toContain("PROJ-1");
    expect(summary).toContain("4 related");
    expect(summary).toContain("quotations unlinked");
  });

  it("applyProjectDeletionToState removes project and unlinks quotation", () => {
    const state: ProjectDeletionStateSlice = {
      ...emptySlice(),
      projects: [baseProject()],
      expenses: [{ id: "EX-1", projectId: "PROJ-1" } as never],
      quotations: [
        {
          id: "Q-1",
          quotationNumber: "Q-001",
          status: "converted_to_project",
          linkedProjectId: "PROJ-1",
          clientName: "C",
          clientPhone: "1",
          clientEmail: "c@x.com",
          clientCity: "J",
          clientState: "R",
          paymentType: "cash",
          totalAmount: 1,
          createdAt: "2026-01-01",
        } as Quotation,
      ],
    };

    const result = applyProjectDeletionToState(state, "PROJ-1");
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.next.projects).toHaveLength(0);
    expect(result.next.expenses).toHaveLength(0);
    expect(result.next.quotations[0]?.linkedProjectId).toBeUndefined();
    expect(result.next.quotations[0]?.status).toBe("approved");
  });

  it("unlinkQuotationsFromDeletedProject is idempotent for other projects", () => {
    const { quotations, unlinkedCount } = unlinkQuotationsFromDeletedProject(
      [
        {
          id: "Q-1",
          quotationNumber: "A",
          status: "converted_to_project",
          linkedProjectId: "PROJ-1",
          clientName: "C",
          clientPhone: "1",
          clientEmail: "c@x.com",
          clientCity: "J",
          clientState: "R",
          paymentType: "cash",
          totalAmount: 1,
          createdAt: "2026-01-01",
        } as Quotation,
        {
          id: "Q-2",
          quotationNumber: "B",
          status: "approved",
          linkedProjectId: "PROJ-2",
          clientName: "C",
          clientPhone: "1",
          clientEmail: "c@x.com",
          clientCity: "J",
          clientState: "R",
          paymentType: "cash",
          totalAmount: 1,
          createdAt: "2026-01-01",
        } as Quotation,
      ],
      "PROJ-1",
    );
    expect(unlinkedCount).toBe(1);
    expect(quotations.find((q) => q.id === "Q-2")?.linkedProjectId).toBe("PROJ-2");
  });

  it("buildProjectDeletionAuditEntry uses cascadeRemoval field", () => {
    const entry = buildProjectDeletionAuditEntry(
      (action, entityType, entityId, entityName, field, _old, newValue): AuditLogEntry => ({
        id: "LOG-1",
        timestamp: "2026-01-01T00:00:00.000Z",
        userId: "u1",
        userName: "Tester",
        action,
        entityType,
        entityId,
        entityName,
        field,
        newValue,
      }),
      baseProject(),
      {
        invoices: 1,
        saleBills: 0,
        tasks: 0,
        expenses: 0,
        incomes: 0,
        payments: 0,
        sites: 0,
        blockages: 0,
        operationalTickets: 0,
        clientPaymentRecords: 0,
        projectTimeline: 0,
        scheduledInstallations: 0,
        siteVisits: 0,
        projectChangeRequests: 0,
        materialReservations: 0,
        agentCommissionAccruals: 0,
        materialDamageRecords: 0,
        procurementNeedLines: 0,
        ownerInvestments: 0,
        partnerTransactions: 0,
        accountingReviewQueue: 0,
        agentCommissionPayments: 0,
        quotationsUnlinked: 0,
      },
    );
    expect(entry.action).toBe("delete");
    expect(entry.field).toBe("cascadeRemoval");
    expect(entry.newValue).toContain("Site Alpha");
  });
});

import { describe, expect, it } from "vitest";
import {
  appendAccrualIfMissingOnApproval,
  applyAgentCommissionAccrualsOnProjectCompleted,
  capacityKwFromQuotation,
  expectedFeeFromAgent,
  findAccrualForQuotationAgent,
  linkAccrualsToProject,
  markProjectAccrualsPayable,
  reconcileAgentCommissionAccruals,
} from "@/lib/agentCommissionAccrualPolicy";
import type { Agent } from "@/types/finance";
import type { AgentCommissionAccrual } from "@/types/operations";
import type { Project, Quotation } from "@/types/project";

const agentA006: Agent = {
  id: "A006",
  name: "Meera Iyer",
  phone: "9100000006",
  address: "Chennai",
  ratePerKw: 5200,
  rateType: "per-kw",
  status: "active",
  createdAt: "2026-04-05",
};

const quotationQ007: Quotation = {
  id: "Q007",
  quotationNumber: "MSS/26/007",
  status: "approved",
  quotationType: "solar",
  clientName: "Arvind Rao",
  clientPhone: "9812000118",
  clientEmail: "arvind.rao@proton.me",
  clientCity: "Bangalore",
  clientState: "Karnataka",
  agentId: "A006",
  systemCapacity: "7",
  totalAmount: 540000,
  paymentType: "cash",
  approvedAt: "2026-04-18",
};

describe("agentCommissionAccrualPolicy", () => {
  it("parses quotation kW and computes per-kw fee", () => {
    expect(capacityKwFromQuotation(quotationQ007)).toBe(7);
    expect(expectedFeeFromAgent(agentA006, 7)).toBe(36400);
  });

  it("appendAccrualIfMissingOnApproval is idempotent on approval", () => {
    const first = appendAccrualIfMissingOnApproval([], quotationQ007, [agentA006], "sent");
    expect(first).toHaveLength(1);
    expect(first[0].expectedAmount).toBe(36400);
    expect(first[0].status).toBe("pending");
    expect(first[0].sourceQuotationId).toBe("Q007");

    const second = appendAccrualIfMissingOnApproval(first, quotationQ007, [agentA006], "approved");
    expect(second).toHaveLength(1);
    expect(findAccrualForQuotationAgent(second, "Q007", "A006")?.id).toBe(first[0].id);
  });

  it("linkAccrualsToProject sets projectId for quotation-linked rows", () => {
    const accruals: AgentCommissionAccrual[] = [
      {
        id: "ACC-1",
        agentId: "A006",
        expectedAmount: 36400,
        status: "pending",
        accruedAt: "2026-04-18",
        sourceQuotationId: "Q007",
      },
    ];
    const linked = linkAccrualsToProject(accruals, "PROJ-X", "Q007", "A006");
    expect(linked[0].projectId).toBe("PROJ-X");
  });

  it("markProjectAccrualsPayable flips pending rows for project or quotation", () => {
    const accruals: AgentCommissionAccrual[] = [
      {
        id: "ACC-1",
        agentId: "A006",
        expectedAmount: 36400,
        status: "pending",
        accruedAt: "2026-04-18",
        sourceQuotationId: "Q007",
      },
    ];
    const payable = markProjectAccrualsPayable(accruals, "PROJ-X", "Q007", "2026-05-01T00:00:00.000Z");
    expect(payable[0].status).toBe("payable");
    expect(payable[0].payableAt).toBe("2026-05-01T00:00:00.000Z");
    expect(payable[0].projectId).toBe("PROJ-X");
  });

  it("applyAgentCommissionAccrualsOnProjectCompleted backfills and marks payable", () => {
    const project: Project = {
      id: "PROJ-COMPLETE",
      name: "Test",
      capacity: "7kW",
      agentId: "A006",
      quotationId: "Q007",
      lifecycleStatus: "Completed",
      client: "Arvind Rao",
      location: "Bangalore",
      contractAmount: 520000,
      totalCost: 0,
      amountReceived: 520000,
      assignees: [],
      onSite: 0,
      photos: 0,
      startDate: "2026-04-01",
      endDate: "2026-05-01",
      createdAt: "2026-04-01",
    };

    const next = applyAgentCommissionAccrualsOnProjectCompleted(
      [],
      project,
      quotationQ007,
      [agentA006],
      "2026-05-02T00:00:00.000Z",
    );
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe("payable");
    expect(next[0].projectId).toBe("PROJ-COMPLETE");
    expect(next[0].expectedAmount).toBe(36400);
  });

  it("reconcileAgentCommissionAccruals seeds approved quotation accrual", () => {
    const next = reconcileAgentCommissionAccruals({
      accruals: [],
      quotations: [quotationQ007],
      projects: [],
      agents: [agentA006],
    });
    expect(next.some((a) => a.sourceQuotationId === "Q007" && a.agentId === "A006")).toBe(true);
  });

  it("reconcileAgentCommissionAccruals marks payable when project has startedAt (FC5)", () => {
    const next = reconcileAgentCommissionAccruals({
      accruals: [
        {
          id: "ACC-1",
          agentId: "A006",
          expectedAmount: 36400,
          status: "pending",
          accruedAt: "2026-04-18",
          sourceQuotationId: "Q007",
          projectId: "PROJ-START",
        },
      ],
      quotations: [quotationQ007],
      projects: [
        {
          id: "PROJ-START",
          quotationId: "Q007",
          agentId: "A006",
          lifecycleStatus: "In Progress",
          startedAt: "2026-05-10T00:00:00.000Z",
        } as import("@/types/project").Project,
      ],
      agents: [agentA006],
    });
    expect(next[0].status).toBe("payable");
    expect(next[0].payableAt).toBeTruthy();
  });
});

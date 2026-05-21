import {
  expectedAgentFeeForProject,
  parseCapacityKw,
} from "@/domain/agents/agentCommission";
import type { Agent } from "@/types/finance";
import type { AgentCommissionAccrual } from "@/types/operations";
import type { Project, Quotation } from "@/types/project";

export function generateAgentCommissionAccrualId(): string {
  return `ACC-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function capacityKwFromQuotation(quotation: Pick<Quotation, "systemCapacity">): number {
  return parseCapacityKw(quotation.systemCapacity ?? "");
}

export function capacityKwFromProject(project: Pick<Project, "capacity">): number {
  return parseCapacityKw(project.capacity);
}

export function expectedFeeFromAgent(agent: Agent, capacityKw: number): number {
  return expectedAgentFeeForProject({
    ratePerKw: agent.ratePerKw,
    rateType: agent.rateType,
    flatRate: agent.flatRate,
    capacityKw,
  });
}

export function findAccrualForQuotationAgent(
  accruals: AgentCommissionAccrual[],
  quotationId: string,
  agentId: string,
): AgentCommissionAccrual | undefined {
  return accruals.find(
    (a) => a.sourceQuotationId === quotationId && a.agentId === agentId,
  );
}

export function buildAccrualOnQuotationApprove(params: {
  quotation: Quotation;
  agent: Agent;
  id?: string;
  accruedAt?: string;
}): AgentCommissionAccrual | null {
  const { quotation, agent } = params;
  if (!quotation.agentId) return null;
  const capacityKw = capacityKwFromQuotation(quotation);
  return {
    id: params.id ?? generateAgentCommissionAccrualId(),
    agentId: quotation.agentId,
    expectedAmount: expectedFeeFromAgent(agent, capacityKw),
    status: "pending",
    accruedAt: params.accruedAt ?? new Date().toISOString(),
    sourceQuotationId: quotation.id,
  };
}

/** Idempotent pending accrual when a quotation first becomes approved. */
export function appendAccrualIfMissingOnApproval(
  accruals: AgentCommissionAccrual[],
  quotation: Quotation,
  agents: Agent[],
  prevStatus: Quotation["status"],
): AgentCommissionAccrual[] {
  if (prevStatus === "approved" || quotation.status !== "approved" || !quotation.agentId) {
    return accruals;
  }
  if (findAccrualForQuotationAgent(accruals, quotation.id, quotation.agentId)) {
    return accruals;
  }
  const agent = agents.find((a) => a.id === quotation.agentId);
  if (!agent) return accruals;
  const row = buildAccrualOnQuotationApprove({ quotation, agent });
  return row ? [row, ...accruals] : accruals;
}

/** Attach `projectId` to accruals tied to the originating quotation or agent. */
export function linkAccrualsToProject(
  accruals: AgentCommissionAccrual[],
  projectId: string,
  quotationId?: string,
  agentId?: string,
): AgentCommissionAccrual[] {
  if (!quotationId && !agentId) return accruals;
  return accruals.map((a) => {
    const matchesQuotation = quotationId && a.sourceQuotationId === quotationId;
    const matchesAgentOnly =
      agentId && a.agentId === agentId && !a.projectId && !a.sourceQuotationId;
    if (!matchesQuotation && !matchesAgentOnly) return a;
    if (a.projectId === projectId) return a;
    return { ...a, projectId };
  });
}

export function markProjectAccrualsPayable(
  accruals: AgentCommissionAccrual[],
  projectId: string,
  quotationId?: string,
  now = new Date().toISOString(),
): AgentCommissionAccrual[] {
  return accruals.map((a) => {
    const linked =
      a.projectId === projectId ||
      (quotationId != null && a.sourceQuotationId === quotationId);
    if (!linked || a.status !== "pending") return a;
    return { ...a, status: "payable", payableAt: now, projectId: a.projectId ?? projectId };
  });
}

/**
 * On project completion: ensure an accrual exists (backfill if approval was skipped),
 * link `projectId`, and mark payable.
 */
export function applyAgentCommissionAccrualsOnProjectCompleted(
  accruals: AgentCommissionAccrual[],
  project: Project,
  quotation: Quotation | undefined,
  agents: Agent[],
  now = new Date().toISOString(),
): AgentCommissionAccrual[] {
  const agentId = project.agentId ?? quotation?.agentId;
  if (!agentId) return accruals;

  const agent = agents.find((a) => a.id === agentId);
  if (!agent) return accruals;

  let next = accruals;
  const quotationId = project.quotationId ?? quotation?.id;
  const existing =
    quotationId != null
      ? findAccrualForQuotationAgent(next, quotationId, agentId)
      : next.find((a) => a.projectId === project.id && a.agentId === agentId);

  if (!existing) {
    const capacityKw = quotation
      ? capacityKwFromQuotation(quotation)
      : capacityKwFromProject(project);
    const row: AgentCommissionAccrual = {
      id: generateAgentCommissionAccrualId(),
      agentId,
      projectId: project.id,
      expectedAmount: expectedFeeFromAgent(agent, capacityKw),
      status: "payable",
      accruedAt: now,
      payableAt: now,
      ...(quotationId ? { sourceQuotationId: quotationId } : {}),
    };
    next = [row, ...next];
  } else {
    next = next.map((a) =>
      a.id === existing.id ? { ...a, projectId: project.id } : a,
    );
    next = markProjectAccrualsPayable(next, project.id, quotationId, now);
  }

  return next;
}

/** Demo seed / hydrate: backfill accruals for approved quotes and completed agent projects. */
export function reconcileAgentCommissionAccruals(input: {
  accruals: AgentCommissionAccrual[];
  quotations: Quotation[];
  projects: Project[];
  agents: Agent[];
}): AgentCommissionAccrual[] {
  let next = input.accruals;

  for (const quotation of input.quotations) {
    if (quotation.status !== "approved" && quotation.status !== "converted_to_project") {
      continue;
    }
    next = appendAccrualIfMissingOnApproval(next, quotation, input.agents, "draft");
  }

  for (const project of input.projects) {
    if (project.quotationId) {
      next = linkAccrualsToProject(
        next,
        project.id,
        project.quotationId,
        project.agentId,
      );
    }
    if (
      project.startedAt &&
      project.lifecycleStatus !== "Completed" &&
      project.lifecycleStatus !== "Closed"
    ) {
      next = markProjectAccrualsPayable(next, project.id, project.quotationId);
    }
    if (project.lifecycleStatus === "Completed") {
      const quotation = project.quotationId
        ? input.quotations.find((q) => q.id === project.quotationId)
        : undefined;
      next = applyAgentCommissionAccrualsOnProjectCompleted(
        next,
        project,
        quotation,
        input.agents,
      );
    }
  }

  return next;
}

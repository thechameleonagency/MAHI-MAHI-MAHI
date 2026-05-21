import type { NarrativeApply } from "./shared";
import { applyChangeRequestToProject, scaleAgentAccrualsForContractChange } from "@/lib/changeRequestApproval";
import { applyMaterialReservationReleases } from "@/lib/changeRequestMaterialContinuity";
import { seedDateAt } from "../seedTimeModel";
import { seedId, SEED_ID_PREFIX } from "../seedIdRegistry";
import type { AgentCommissionAccrual } from "@/types/operations";
import type { Project } from "@/types/project";

function accrualForProject(
  accruals: AgentCommissionAccrual[],
  project: Project,
): AgentCommissionAccrual | undefined {
  return accruals.find(
    (a) =>
      a.projectId === project.id ||
      (project.quotationId != null && a.sourceQuotationId === project.quotationId),
  );
}

/**
 * V4 — scope reduction: negative commercial delta, material reservation release, scaled agent accrual.
 */
export const applyChangeRequestScopeReduction: NarrativeApply = (state) => {
  const panelItem = state.inventoryItems.find((i) => i.name.toLowerCase().includes("panel"));
  if (!panelItem) return;

  const accruals = state.agentCommissionAccruals ?? [];
  let project = state.projects.find(
    (p) =>
      p.customerId &&
      (p.lifecycleStatus === "In Progress" || p.lifecycleStatus === "On Hold") &&
      (p.contractAmount ?? 0) >= 50000 &&
      accrualForProject(accruals, p),
  );
  if (!project) {
    project = state.projects.find(
      (p) =>
        p.customerId &&
        (p.lifecycleStatus === "In Progress" || p.lifecycleStatus === "On Hold") &&
        (p.contractAmount ?? 0) >= 50000,
    );
  }
  if (!project) return;

  const agentId =
    project.agentId ??
    state.quotations.find((q) => q.id === project.quotationId)?.agentId;
  if (!agentId) return;
  if (!project.agentId) project.agentId = agentId;

  let linkedAccrual = accrualForProject(state.agentCommissionAccruals ?? [], project);
  if (!linkedAccrual) {
    linkedAccrual = {
      id: seedId(SEED_ID_PREFIX.accrual),
      agentId,
      projectId: project.id,
      sourceQuotationId: project.quotationId,
      expectedAmount: Math.round((project.contractAmount ?? 0) * 0.1),
      status: "pending",
      accruedAt: seedDateAt(0.54),
    };
    state.agentCommissionAccruals = [
      ...(state.agentCommissionAccruals ?? []),
      linkedAccrual,
    ];
  } else if (!linkedAccrual.projectId) {
    linkedAccrual.projectId = project.id;
  }

  state.materialReservations.push({
    id: seedId(SEED_ID_PREFIX.reservation),
    itemId: panelItem.id,
    qty: 4,
    projectId: project.id,
    reason: "Initial scope panels",
    createdAt: seedDateAt(0.55),
    source: "manual",
  });

  const cr = {
    id: seedId(SEED_ID_PREFIX.changeRequest),
    projectId: project.id,
    type: "addon-work" as const,
    deltaAmount: -25000,
    materialDelta: [{ itemId: panelItem.id, deltaQty: -2 }],
    status: "approved" as const,
    requestedAt: seedDateAt(0.56),
    approvedAt: seedDateAt(0.57),
    notes: "Client scope reduction — remove 2 panels from bill of materials",
  };

  const inventoryLookup = state.inventoryItems.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
  }));

  const oldContract = project.contractAmount ?? 0;
  const { projectPatch, reservations, reservationReleases, deltaAmount } = applyChangeRequestToProject(
    project,
    cr,
    inventoryLookup,
  );
  Object.assign(project, projectPatch);

  let reservationsState = state.materialReservations;
  for (const release of reservationReleases) {
    reservationsState = applyMaterialReservationReleases(reservationsState, release);
  }
  for (const r of reservations) {
    reservationsState = [
      {
        id: seedId(SEED_ID_PREFIX.reservation),
        itemId: r.itemId,
        qty: r.qty,
        projectId: r.projectId,
        reason: r.reason,
        createdAt: seedDateAt(0.57),
        source: "manual" as const,
      },
      ...reservationsState,
    ];
  }
  state.materialReservations = reservationsState;

  state.projectChangeRequests.push({
    ...cr,
    deltaAmount: deltaAmount || cr.deltaAmount,
  });

  const newContract = project.contractAmount ?? 0;
  if (state.agentCommissionAccruals?.length && oldContract !== newContract) {
    state.agentCommissionAccruals = scaleAgentAccrualsForContractChange(
      state.agentCommissionAccruals,
      project.id,
      oldContract,
      newContract,
    );
  }
};

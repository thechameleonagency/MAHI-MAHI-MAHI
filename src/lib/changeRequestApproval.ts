import { parseCapacityKw } from "@/domain/agents/agentCommission";
import { resolvePricingBasis, resolvePricingRate } from "@/lib/pricingBasis";
import { isApplicableMaterialDelta } from "@/lib/changeRequestMaterialDelta";
import type {
  ProjectChangeRequest,
  ProjectChangeRequestMaterialDelta,
} from "@/types/operations";
import type { ExecutionLineItem, Project, ProjectSiteChecklistItem } from "@/types/project";

export type InventoryLookup = { id: string; name: string; unit?: string };

/** Resolve commercial delta — per-kW projects auto-derive from capacity change when amount omitted. */
export function resolveChangeRequestDeltaAmount(
  project: Project,
  cr: ProjectChangeRequest,
): number {
  if (cr.deltaAmount != null && cr.deltaAmount > 0) return cr.deltaAmount;
  if (cr.type === "capacity" && cr.deltaKw && cr.deltaKw > 0) {
    const basis = resolvePricingBasis(project);
    if (basis === "per_kw") {
      const ratePerKw = resolvePricingRate(project);
      return Math.round(ratePerKw * cr.deltaKw);
    }
    const capKw = parseCapacityKw(project.capacity);
    if (capKw > 0 && project.contractAmount) {
      const ratePerKw = project.contractAmount / capKw;
      return Math.round(ratePerKw * cr.deltaKw);
    }
  }
  return 0;
}

export function applyChangeRequestToProject(
  project: Project,
  cr: ProjectChangeRequest,
  inventoryItems: InventoryLookup[],
): {
  projectPatch: Partial<Project>;
  reservations: Array<{
    itemId: string;
    qty: number;
    projectId: string;
    reason: string;
  }>;
  deltaAmount: number;
} {
  const deltaAmount = resolveChangeRequestDeltaAmount(project, cr);
  const invById = new Map(inventoryItems.map((i) => [i.id, i]));

  const projectPatch: Partial<Project> = {};
  if (deltaAmount > 0) {
    projectPatch.contractAmount = (project.contractAmount ?? 0) + deltaAmount;
  }

  if (cr.deltaKw && cr.deltaKw > 0) {
    const baseKw = parseCapacityKw(project.capacity);
    projectPatch.capacity = `${baseKw + cr.deltaKw}kW`;
  }

  const exec: ExecutionLineItem[] = [...(project.executionLineItems ?? [])];
  const checklist: ProjectSiteChecklistItem[] = [...(project.siteChecklist ?? [])];
  const reservations: Array<{ itemId: number; qty: number; projectId: string; reason: string }> =
    [];

  const applyMaterialDelta = (md: ProjectChangeRequestMaterialDelta) => {
    const inv = invById.get(md.itemId);
    const name = inv?.name ?? `Item #${md.itemId}`;
    const unit = inv?.unit ?? "pcs";
    exec.push({
      id: `BL-CR-${cr.id}-${md.itemId}`,
      inventoryItemId: md.itemId,
      description: name,
      quantity: md.deltaQty,
      unit,
      rate: 0,
      total: 0,
      source: "manual",
      issuedQty: 0,
    });

    const existing = checklist.find(
      (c) => c.name === name || String(c.id).includes(String(md.itemId)),
    );
    if (existing) {
      existing.qtyPlanned += md.deltaQty;
    } else {
      checklist.push({
        id: `chk-cr-${cr.id}-${md.itemId}`,
        name,
        unit,
        qtyPlanned: md.deltaQty,
        qtySent: 0,
        qtyReturned: 0,
        qtyConsumed: 0,
        addedByOverride: true,
      });
    }

    reservations.push({
      itemId: md.itemId,
      qty: md.deltaQty,
      projectId: project.id,
      reason: `Change request ${cr.id}`,
    });
  };

  for (const md of cr.materialDelta ?? []) {
    if (isApplicableMaterialDelta(md)) applyMaterialDelta(md);
  }

  if (exec.length > (project.executionLineItems?.length ?? 0)) {
    projectPatch.executionLineItems = exec;
  }
  if (checklist.length > (project.siteChecklist?.length ?? 0) || cr.materialDelta?.length) {
    projectPatch.siteChecklist = checklist;
  }

  if (project.commercialBaseline && deltaAmount > 0) {
    projectPatch.commercialBaseline = {
      ...project.commercialBaseline,
      servicesTotal: (project.commercialBaseline.servicesTotal ?? 0) + deltaAmount,
    };
  }

  return { projectPatch, reservations, deltaAmount };
}

export function scaleAgentAccrualsForContractChange(
  accruals: import("@/types/operations").AgentCommissionAccrual[],
  projectId: string,
  oldContract: number,
  newContract: number,
): import("@/types/operations").AgentCommissionAccrual[] {
  if (oldContract <= 0 || newContract <= 0 || oldContract === newContract) return accruals;
  const ratio = newContract / oldContract;
  return accruals.map((a) =>
    a.projectId === projectId
      ? { ...a, expectedAmount: Math.round(a.expectedAmount * ratio) }
      : a,
  );
}

export function computeAdditionalWorkTotal(
  basis: "fixed" | "per_kw" | "per_sqft",
  rate: number,
  qty: number | undefined,
  project: Project,
): number {
  if (basis === "fixed") return Math.round(rate);
  if (basis === "per_kw") {
    const kw = qty && qty > 0 ? qty : parseCapacityKw(project.capacity);
    return Math.round(rate * kw);
  }
  return Math.round(rate * (qty ?? 0));
}

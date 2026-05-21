import { parseCapacityKw } from "@/domain/agents/agentCommission";
import { resolvePricingBasis, resolvePricingRate } from "@/lib/pricingBasis";
import { isApplicableMaterialDelta } from "@/lib/changeRequestMaterialDelta";
import type { MaterialReservationRelease } from "@/lib/changeRequestMaterialContinuity";
import type {
  ProjectChangeRequest,
  ProjectChangeRequestMaterialDelta,
} from "@/types/operations";
import type { ExecutionLineItem, Project, ProjectSiteChecklistItem } from "@/types/project";

export type InventoryLookup = { id: string; name: string; unit?: string };

/** Resolve commercial delta — supports negative scope reductions; per-kW derives when amount omitted. */
export function resolveChangeRequestDeltaAmount(
  project: Project,
  cr: ProjectChangeRequest,
): number {
  if (cr.deltaAmount != null && cr.deltaAmount !== 0) return cr.deltaAmount;
  if (cr.type === "capacity" && cr.deltaKw && cr.deltaKw !== 0) {
    const basis = resolvePricingBasis(project);
    const kw = cr.deltaKw;
    if (basis === "per_kw") {
      const ratePerKw = resolvePricingRate(project);
      return Math.round(ratePerKw * kw);
    }
    const capKw = parseCapacityKw(project.capacity);
    if (capKw > 0 && project.contractAmount) {
      const ratePerKw = project.contractAmount / capKw;
      return Math.round(ratePerKw * kw);
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
  reservations: Array<{ itemId: string; qty: number; projectId: string; reason: string }>;
  reservationReleases: MaterialReservationRelease[];
  deltaAmount: number;
} {
  const deltaAmount = resolveChangeRequestDeltaAmount(project, cr);
  const invById = new Map(inventoryItems.map((i) => [i.id, i]));

  const projectPatch: Partial<Project> = {};
  if (deltaAmount !== 0) {
    const nextContract = (project.contractAmount ?? 0) + deltaAmount;
    projectPatch.contractAmount = Math.max(0, nextContract);
  }

  if (cr.deltaKw && cr.deltaKw !== 0) {
    const baseKw = parseCapacityKw(project.capacity);
    projectPatch.capacity = `${Math.max(0, baseKw + cr.deltaKw)}kW`;
  }

  const exec: ExecutionLineItem[] = [...(project.executionLineItems ?? [])];
  const checklist: ProjectSiteChecklistItem[] = [...(project.siteChecklist ?? [])];
  const reservations: Array<{ itemId: string; qty: number; projectId: string; reason: string }> =
    [];
  const reservationReleases: MaterialReservationRelease[] = [];

  const applyMaterialDelta = (md: ProjectChangeRequestMaterialDelta) => {
    const inv = invById.get(md.itemId);
    const name = inv?.name ?? `Item #${md.itemId}`;
    const unit = inv?.unit ?? "pcs";

    const existingExec = exec.find((e) => String(e.inventoryItemId) === String(md.itemId));
    if (existingExec) {
      existingExec.quantity = Math.max(0, existingExec.quantity + md.deltaQty);
    } else if (md.deltaQty > 0) {
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
    }

    const existing = checklist.find(
      (c) => c.name === name || String(c.id).includes(String(md.itemId)),
    );
    if (existing) {
      existing.qtyPlanned = Math.max(0, existing.qtyPlanned + md.deltaQty);
    } else if (md.deltaQty > 0) {
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

    if (md.deltaQty > 0) {
      reservations.push({
        itemId: md.itemId,
        qty: md.deltaQty,
        projectId: project.id,
        reason: `Change request ${cr.id}`,
      });
    } else {
      reservationReleases.push({
        itemId: md.itemId,
        qty: Math.abs(md.deltaQty),
        projectId: project.id,
        reason: `Change request ${cr.id} scope reduction`,
      });
    }
  };

  for (const md of cr.materialDelta ?? []) {
    if (isApplicableMaterialDelta(md)) applyMaterialDelta(md);
  }

  if (exec.length > 0) {
    projectPatch.executionLineItems = exec;
  }
  if (checklist.length > 0 || cr.materialDelta?.length) {
    projectPatch.siteChecklist = checklist;
  }

  if (project.commercialBaseline && deltaAmount !== 0) {
    projectPatch.commercialBaseline = {
      ...project.commercialBaseline,
      servicesTotal: Math.max(
        0,
        (project.commercialBaseline.servicesTotal ?? 0) + deltaAmount,
      ),
    };
  }

  return { projectPatch, reservations, reservationReleases, deltaAmount };
}

export function scaleAgentAccrualsForContractChange(
  accruals: import("@/types/operations").AgentCommissionAccrual[],
  projectId: string,
  oldContract: number,
  newContract: number,
): import("@/types/operations").AgentCommissionAccrual[] {
  if (oldContract <= 0 || oldContract === newContract) return accruals;
  if (newContract <= 0) {
    return accruals.map((a) =>
      a.projectId === projectId ? { ...a, expectedAmount: 0 } : a,
    );
  }
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

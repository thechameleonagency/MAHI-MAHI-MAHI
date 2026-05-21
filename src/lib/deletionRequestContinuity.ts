import type { AppState } from "@/contexts/AppDataContext";
import { quotationLinkedProjectId } from "@/lib/quotationProjectLink";
import type { DeletionRequest } from "@/types/blockage";

export type StaleDeletionRequest = {
  requestId: string;
  entityType: DeletionRequest["entityType"];
  entityId: string;
  reason:
    | "orphan_entity"
    | "entity_name_drift"
    | "related_entities_drift"
    | "invalid_responsible_person";
};

export function entityDisplayNameForDeletion(
  state: AppState,
  entityType: DeletionRequest["entityType"],
  entityId: string,
): string | undefined {
  switch (entityType) {
    case "quotation": {
      const q = state.quotations.find((x) => x.id === entityId);
      return q?.quotationNumber ?? q?.id;
    }
    case "project": {
      const p = state.projects.find((x) => x.id === entityId);
      return p?.name ?? p?.id;
    }
    case "invoice": {
      const inv = state.invoices.find((x) => x.id === entityId);
      return inv?.invoiceNumber ?? inv?.id;
    }
    case "sale-bill": {
      const sb = state.saleBills.find((x) => x.id === entityId);
      return sb?.invoiceNumber ?? sb?.id;
    }
    default:
      return undefined;
  }
}

function entityExists(
  state: AppState,
  entityType: DeletionRequest["entityType"],
  entityId: string,
): boolean {
  return entityDisplayNameForDeletion(state, entityType, entityId) !== undefined;
}

/** Derive linked rows shown on admin deletion review (ER7). */
export function collectRelatedEntitiesForDeletion(
  state: AppState,
  entityType: DeletionRequest["entityType"],
  entityId: string,
): DeletionRequest["relatedEntities"] {
  const related: DeletionRequest["relatedEntities"] = [];

  switch (entityType) {
    case "quotation": {
      const q = state.quotations.find((x) => x.id === entityId);
      if (!q) return related;
      const projectId = quotationLinkedProjectId(q);
      if (projectId) {
        const p = state.projects.find((x) => x.id === projectId);
        if (p) related.push({ type: "project", id: p.id, name: p.name });
      }
      const enquiry = state.enquiries.find(
        (e) => e.quotationId === entityId || e.quotationIds?.includes(entityId),
      );
      if (enquiry) {
        related.push({ type: "enquiry", id: enquiry.id, name: enquiry.customerName });
      }
      for (const acc of state.agentCommissionAccruals ?? []) {
        if (acc.sourceQuotationId === entityId) {
          related.push({ type: "commission_accrual", id: acc.id, name: acc.agentName ?? acc.id });
        }
      }
      break;
    }
    case "project": {
      const p = state.projects.find((x) => x.id === entityId);
      if (!p) return related;
      for (const site of state.sites.filter((s) => s.projectId === entityId)) {
        related.push({ type: "site", id: String(site.id), name: site.name });
      }
      const invCount = state.invoices.filter((i) => i.projectId === entityId).length;
      if (invCount > 0) {
        related.push({ type: "invoice", id: entityId, name: `${invCount} invoice(s)` });
      }
      const taskCount = state.tasks.filter((t) => t.projectId === entityId).length;
      if (taskCount > 0) {
        related.push({ type: "task", id: entityId, name: `${taskCount} field task(s)` });
      }
      if (p.quotationId) {
        const q = state.quotations.find((x) => x.id === p.quotationId);
        if (q) {
          related.push({
            type: "quotation",
            id: q.id,
            name: q.quotationNumber ?? q.id,
          });
        }
      }
      break;
    }
    case "invoice":
    case "sale-bill": {
      const doc =
        entityType === "invoice"
          ? state.invoices.find((x) => x.id === entityId)
          : state.saleBills.find((x) => x.id === entityId);
      if (!doc) return related;
      if (doc.projectId) {
        const p = state.projects.find((x) => x.id === doc.projectId);
        if (p) related.push({ type: "project", id: p.id, name: p.name });
      }
      if (doc.customerId) {
        const c = state.customers.find((x) => x.id === doc.customerId);
        if (c) related.push({ type: "customer", id: c.id, name: c.name });
      }
      const payCount = state.payments.filter((pay) =>
        pay.allocations?.some((a) => a.invoiceId === entityId),
      ).length;
      if (payCount > 0) {
        related.push({ type: "payment", id: entityId, name: `${payCount} payment(s)` });
      }
      break;
    }
  }

  return related;
}

function relatedEntitiesEqual(
  a: DeletionRequest["relatedEntities"],
  b: DeletionRequest["relatedEntities"],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** ER7 — keep deletion requests aligned with live entity labels and linkage. */
export function reconcileDeletionRequests(state: AppState): AppState {
  const employees = new Set(state.employees.map((e) => e.id));

  const deletionRequests = (state.deletionRequests ?? []).map((req) => {
    const entityName =
      entityDisplayNameForDeletion(state, req.entityType, req.entityId) ?? req.entityName;
    const relatedEntities = collectRelatedEntitiesForDeletion(
      state,
      req.entityType,
      req.entityId,
    );
    const responsiblePersonId =
      req.responsiblePersonId != null && employees.has(String(req.responsiblePersonId))
        ? String(req.responsiblePersonId)
        : undefined;

    return {
      ...req,
      entityName,
      relatedEntities,
      responsiblePersonId,
    };
  });

  return { ...state, deletionRequests };
}

export function findStaleDeletionRequests(state: AppState): StaleDeletionRequest[] {
  const expected = reconcileDeletionRequests(state);
  const stale: StaleDeletionRequest[] = [];
  const employees = new Set(state.employees.map((e) => e.id));

  for (const req of state.deletionRequests ?? []) {
    if (req.status === "pending" && !entityExists(state, req.entityType, req.entityId)) {
      stale.push({
        requestId: req.id,
        entityType: req.entityType,
        entityId: req.entityId,
        reason: "orphan_entity",
      });
    }

    const exp = expected.deletionRequests.find((r) => r.id === req.id);
    if (!exp) continue;

    if (req.entityName !== exp.entityName) {
      stale.push({
        requestId: req.id,
        entityType: req.entityType,
        entityId: req.entityId,
        reason: "entity_name_drift",
      });
    }

    if (!relatedEntitiesEqual(req.relatedEntities, exp.relatedEntities)) {
      stale.push({
        requestId: req.id,
        entityType: req.entityType,
        entityId: req.entityId,
        reason: "related_entities_drift",
      });
    }

    if (
      req.responsiblePersonId != null &&
      !employees.has(String(req.responsiblePersonId))
    ) {
      stale.push({
        requestId: req.id,
        entityType: req.entityType,
        entityId: req.entityId,
        reason: "invalid_responsible_person",
      });
    }
  }

  return stale;
}

export function formatStaleDeletionRequestErrors(rows: StaleDeletionRequest[]): string[] {
  return rows.map(
    (s) => `ER7: deletion request ${s.requestId} (${s.entityType} ${s.entityId}) — ${s.reason}`,
  );
}

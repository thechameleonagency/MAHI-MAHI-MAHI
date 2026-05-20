import {
  createNextCustomerId,
  isOpaqueCustomerId,
} from "@/lib/idFactory";

type CustomerRow = { id: string };

/** Minimal AppState slice for customer-id FK rewiring (avoids AppDataContext import cycle). */
export type CustomerIdMigrationState = {
  customers: CustomerRow[];
  projects: Array<{ customerId?: string | null }>;
  quotations: Array<{ customerId?: string | null }>;
  invoices: Array<{ customerId?: string | null }>;
  saleBills: Array<{ customerId?: string | null }>;
  payments: Array<{ customerId?: string | null }>;
  enquiries: Array<{ customerId?: string | null }>;
  auditLogs: Array<{ entityType?: string; entityId?: string | null }>;
};

function remapCustomerFk<T extends { customerId?: string | null }>(
  rows: T[],
  idMap: Map<string, string>,
): T[] {
  if (idMap.size === 0) return rows;
  return rows.map((row) => {
    const cid = row.customerId;
    if (cid == null || cid === "") return row;
    const next = idMap.get(cid);
    return next ? { ...row, customerId: next } : row;
  });
}

/**
 * One-time (idempotent) repair: remap opaque customer primary keys and FKs to `CUST-NNNN`.
 * Safe to run on every hydrate — no-op when nothing is opaque.
 */
export function migrateOpaqueCustomerIds<T extends CustomerIdMigrationState>(state: T): T {
  const customers = state.customers ?? [];
  const idMap = new Map<string, string>();
  const reserved: string[] = [];

  for (const c of customers) {
    if (!isOpaqueCustomerId(c.id)) reserved.push(c.id);
  }

  for (const c of customers) {
    if (!isOpaqueCustomerId(c.id)) continue;
    const nextId = createNextCustomerId(reserved);
    idMap.set(c.id, nextId);
    reserved.push(nextId);
  }

  if (idMap.size === 0) return state;

  const nextCustomers = customers.map((c) =>
    idMap.has(c.id) ? { ...c, id: idMap.get(c.id)! } : c,
  );

  const auditLogs = (state.auditLogs ?? []).map((log) => {
    if (log.entityType !== "Customer" || !log.entityId) return log;
    const next = idMap.get(log.entityId);
    return next ? { ...log, entityId: next } : log;
  });

  return {
    ...state,
    customers: nextCustomers,
    projects: remapCustomerFk(state.projects ?? [], idMap),
    quotations: remapCustomerFk(state.quotations ?? [], idMap),
    invoices: remapCustomerFk(state.invoices ?? [], idMap),
    saleBills: remapCustomerFk(state.saleBills ?? [], idMap),
    payments: remapCustomerFk(state.payments ?? [], idMap),
    enquiries: remapCustomerFk(state.enquiries ?? [], idMap),
    auditLogs,
  };
}

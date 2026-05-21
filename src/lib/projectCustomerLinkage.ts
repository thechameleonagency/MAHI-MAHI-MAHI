import type { AppState } from "@/contexts/AppDataContext";
import { resolveProjectExecutionLineItems } from "@/domain/project/executionLineItems";
import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import { normalizePhoneDigits } from "@/lib/phoneNormalize";
import type { Customer } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

export type CustomerLinkageHints = {
  client?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientGstin?: string;
};

function normalizeName(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isIncSyntheticCustomerId(customerId: string | undefined): boolean {
  return Boolean(customerId?.startsWith("inc-"));
}

/** Resolve customer FK from unique phone, email, GSTIN, or exact name — never guess from partial/first row (ER3). */
export function resolveCustomerIdFromHints(
  hints: CustomerLinkageHints,
  customers: Customer[],
): string | undefined {
  const phone = normalizePhoneDigits(hints.clientPhone);
  if (phone.length >= 10) {
    const byPhone = customers.filter((c) => normalizePhoneDigits(c.phone) === phone);
    if (byPhone.length === 1) return byPhone[0].id;
  }

  const email = hints.clientEmail?.trim().toLowerCase();
  if (email) {
    const byEmail = customers.filter((c) => c.email?.trim().toLowerCase() === email);
    if (byEmail.length === 1) return byEmail[0].id;
  }

  const gstin = hints.clientGstin?.trim().toUpperCase();
  if (gstin) {
    const byGstin = customers.filter((c) => c.gstin?.trim().toUpperCase() === gstin);
    if (byGstin.length === 1) return byGstin[0].id;
  }

  const name = normalizeName(hints.client);
  if (name) {
    const byName = customers.filter((c) => normalizeName(c.name) === name);
    if (byName.length === 1) return byName[0].id;
  }

  return undefined;
}

function customerById(customers: Customer[], id: string | undefined): Customer | undefined {
  if (!id) return undefined;
  return customers.find((c) => c.id === id);
}

function normalizeLegacyProjectFields(project: Project): Project {
  const lifecycleStatus =
    project.lifecycleStatus ??
    canonicalizeProjectLifecycleStatus((project as { status?: string }).status);
  return normalizeProject({ ...project, lifecycleStatus });
}

/** Keep denormalized client fields aligned with the canonical customer row. */
export function syncProjectClientFromCustomer(project: Project, customer: Customer): Project {
  return normalizeLegacyProjectFields({
    ...project,
    customerId: customer.id,
    client: customer.name,
    clientAddress: customer.address ?? project.clientAddress,
    clientPhone: customer.phone ?? project.clientPhone,
    clientEmail: customer.email ?? project.clientEmail,
    clientGstin: customer.gstin ?? project.clientGstin,
    executionLineItems: resolveProjectExecutionLineItems({
      ...project,
      customerId: customer.id,
    }),
  });
}

function resolveProjectCustomerId(
  project: Project,
  customers: Customer[],
  quotationById: Map<string, Quotation>,
): string | undefined {
  const existing = project.customerId?.trim();
  if (existing && customerById(customers, existing)) {
    return existing;
  }

  const fromQuotation = project.quotationId
    ? quotationById.get(project.quotationId)?.customerId
    : undefined;
  if (fromQuotation && customerById(customers, fromQuotation)) {
    return fromQuotation;
  }

  return resolveCustomerIdFromHints(
    {
      client: project.client,
      clientPhone: project.clientPhone,
      clientEmail: project.clientEmail,
      clientGstin: project.clientGstin,
    },
    customers,
  );
}

/**
 * ER3 — reconcile project↔customer FKs and sync client denormalized fields.
 * Runs after quotations are hydrated so quotation.customerId can backfill projects.
 */
export function reconcileProjectCustomerLinkage(state: AppState): AppState {
  const customers = state.customers;
  if (!customers.length) return state;

  const customerById = new Map(customers.map((c) => [c.id, c]));
  const quotationById = new Map(state.quotations.map((q) => [q.id, q]));

  let projectsChanged = false;
  const projects = state.projects.map((project) => {
    const customerId = resolveProjectCustomerId(project, customers, quotationById);
    const customer = customerId ? customerById.get(customerId) : undefined;

    if (customer) {
      const synced = syncProjectClientFromCustomer({ ...project, customerId }, customer);
      const same =
        synced.customerId === project.customerId &&
        synced.client === project.client &&
        synced.clientPhone === project.clientPhone &&
        synced.clientEmail === project.clientEmail;
      if (!same) projectsChanged = true;
      return synced;
    }

    if (customerId && customerId !== project.customerId) {
      projectsChanged = true;
      return normalizeLegacyProjectFields({ ...project, customerId });
    }

    return project;
  });

  let quotationsChanged = false;
  const quotations = state.quotations.map((q) => {
    let customerId = q.customerId?.trim();
    if (!customerId || !customerById.has(customerId)) {
      customerId = resolveCustomerIdFromHints(
        {
          client: q.clientName,
          clientPhone: q.clientPhone,
          clientEmail: q.clientEmail,
          clientGstin: q.clientGstin,
        },
        customers,
      );
    }
    const customer = customerId ? customerById.get(customerId) : undefined;
    if (customer && (q.customerId !== customer.id || q.clientName !== customer.name)) {
      quotationsChanged = true;
      return { ...q, customerId: customer.id, clientName: customer.name };
    }
    if (customerId && customerId !== q.customerId) {
      quotationsChanged = true;
      return { ...q, customerId };
    }
    return q;
  });

  const projectById = new Map(projects.map((p) => [p.id, p]));
  let invoicesChanged = false;
  const patchInvoices = <T extends { customerId?: string; customerName?: string; projectId?: string }>(
    rows: T[],
  ): T[] =>
    rows.map((inv) => {
      const project = inv.projectId ? projectById.get(inv.projectId) : undefined;
      let customerId = inv.customerId?.trim();
      if (!customerId || !customerById.has(customerId)) {
        customerId =
          project?.customerId ||
          resolveCustomerIdFromHints({ client: inv.customerName }, customers);
      }
      const customer = customerId ? customerById.get(customerId) : undefined;
      const next = {
        ...inv,
        customerId: customer?.id ?? customerId,
        customerName: customer?.name ?? inv.customerName,
        projectId: inv.projectId || project?.id,
      };
      if (next.customerId !== inv.customerId || next.customerName !== inv.customerName) {
        invoicesChanged = true;
      }
      return next;
    });

  const invoices = patchInvoices(state.invoices);
  const saleBills = patchInvoices(state.saleBills ?? []);

  if (!projectsChanged && !quotationsChanged && !invoicesChanged) {
    return state;
  }

  return {
    ...state,
    projects,
    quotations,
    invoices,
    saleBills,
  };
}

export type StaleProjectCustomerLinkage = {
  projectId: string;
  reason:
    | "missing_customer_id"
    | "invalid_customer_id"
    | "client_name_mismatch"
    | "unresolved_client_hints";
};

export function findStaleProjectCustomerLinkage(state: AppState): StaleProjectCustomerLinkage[] {
  const stale: StaleProjectCustomerLinkage[] = [];
  const customerById = new Map(state.customers.map((c) => [c.id, c]));

  for (const project of state.projects) {
    const customerId = project.customerId?.trim();

    if (isIncSyntheticCustomerId(customerId)) {
      if (!customerById.has(customerId!)) {
        stale.push({ projectId: project.id, reason: "invalid_customer_id" });
      }
      continue;
    }

    if (!customerId) {
      if (project.client?.trim() || project.clientPhone?.trim()) {
        stale.push({ projectId: project.id, reason: "missing_customer_id" });
      }
      continue;
    }

    if (!customerById.has(customerId)) {
      stale.push({ projectId: project.id, reason: "invalid_customer_id" });
      continue;
    }

    const customer = customerById.get(customerId)!;
    if (project.client?.trim() && normalizeName(project.client) !== normalizeName(customer.name)) {
      stale.push({ projectId: project.id, reason: "client_name_mismatch" });
    }
  }

  return stale;
}

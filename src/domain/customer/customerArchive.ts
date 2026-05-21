import { canonicalizeProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";
import type { Customer } from "@/types/finance";
import type { Project, Quotation, Enquiry } from "@/types/project";

/**
 * Auto-archive evaluator.
 *
 * A customer is auto-archived when:
 *   - they have at least one project AND
 *   - every linked project is Completed (or Closed) AND
 *   - they have no open enquiries/quotations AND
 *   - their customerKind is not 'inventory' (inventory customers don't archive on project state).
 *
 * Manual unarchive is always possible by clearing `archivedAt`.
 */

export type AutoArchiveEvalInput = {
  customer: Customer;
  projects: Project[]; // already filtered or full list — we'll filter ourselves
  quotations: Quotation[];
  enquiries: Enquiry[];
};

export type AutoArchiveDecision =
  | { shouldArchive: true; lastProjectCompletedAt: string }
  | { shouldArchive: false; reason: string };

const OPEN_QUOTATION_STATUSES = new Set(["draft", "sent", "approved"]);
const OPEN_ENQUIRY_STATUSES = new Set([
  "new",
  "meeting_scheduled",
  "quotation_sent",
  "quotation_rejected",
]);

export function evaluateAutoArchive(input: AutoArchiveEvalInput): AutoArchiveDecision {
  const { customer, projects, quotations, enquiries } = input;

  if (customer.customerKind === "inventory") {
    return { shouldArchive: false, reason: "Inventory-only customers do not auto-archive on project state." };
  }
  if (customer.archivedAt) {
    return { shouldArchive: false, reason: "Already archived." };
  }

  const customerProjects = projects.filter((p) => p.customerId === customer.id);
  if (customerProjects.length === 0) {
    return { shouldArchive: false, reason: "No projects linked to customer yet." };
  }
  const hasOpenProject = customerProjects.some((p) => {
    const lifecycle = canonicalizeProjectLifecycleStatus(p.lifecycleStatus ?? p.status);
    return lifecycle !== "Completed" && lifecycle !== "Closed";
  });
  if (hasOpenProject) {
    return { shouldArchive: false, reason: "Customer still has open projects." };
  }

  const customerQuotations = quotations.filter((q) => q.customerId === customer.id);
  if (customerQuotations.some((q) => OPEN_QUOTATION_STATUSES.has(q.status))) {
    return { shouldArchive: false, reason: "Customer has open quotations." };
  }

  const customerEnquiries = enquiries.filter(
    (e) => e.customerId === customer.id || e.email === customer.email || e.phone === customer.phone,
  );
  if (customerEnquiries.some((e) => OPEN_ENQUIRY_STATUSES.has(e.status as string))) {
    return { shouldArchive: false, reason: "Customer has open enquiries." };
  }

  // Pick the latest completion timestamp from their projects.
  const completionTimes = customerProjects
    .map((p) => p.endDate ?? p.startDate ?? p.createdAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastCompleted = completionTimes[completionTimes.length - 1] ?? new Date().toISOString();
  return { shouldArchive: true, lastProjectCompletedAt: lastCompleted };
}

export type CustomerArchiveReconcileInput = {
  customers: Customer[];
  projects: Project[];
  quotations: Quotation[];
  enquiries: Enquiry[];
};

function customerHasOpenProject(customerId: string, projects: Project[]): boolean {
  return projects
    .filter((p) => p.customerId === customerId)
    .some((p) => {
      const lifecycle = canonicalizeProjectLifecycleStatus(p.lifecycleStatus ?? p.status);
      return lifecycle !== "Completed" && lifecycle !== "Closed";
    });
}

/** Apply auto-archive rules across all customers (seed hydrate + boot pipeline). */
export function reconcileCustomersAutoArchive(input: CustomerArchiveReconcileInput): Customer[] {
  return input.customers.map((customer) => {
    if (customer.archivedAt && customerHasOpenProject(customer.id, input.projects)) {
      const { archivedAt: _a, lastProjectCompletedAt: _l, ...rest } = customer;
      return rest;
    }

    const decision = evaluateAutoArchive({
      customer,
      projects: input.projects,
      quotations: input.quotations,
      enquiries: input.enquiries,
    });
    const patch = applyAutoArchive(customer, decision);
    return patch ? { ...customer, ...patch } : customer;
  });
}

export type StaleCustomerArchiveState = {
  customerId: string;
  reason: "should_archive" | "archived_with_open_project";
};

export function findStaleCustomerArchiveState(input: CustomerArchiveReconcileInput): StaleCustomerArchiveState[] {
  const stale: StaleCustomerArchiveState[] = [];
  for (const customer of input.customers) {
    const hasOpenProject = customerHasOpenProject(customer.id, input.projects);

    if (customer.archivedAt && hasOpenProject) {
      stale.push({ customerId: customer.id, reason: "archived_with_open_project" });
      continue;
    }

    if (!customer.archivedAt) {
      const decision = evaluateAutoArchive({
        customer,
        projects: input.projects,
        quotations: input.quotations,
        enquiries: input.enquiries,
      });
      if (decision.shouldArchive) {
        stale.push({ customerId: customer.id, reason: "should_archive" });
      }
    }
  }
  return stale;
}

/** Apply the decision to a customer row, returning the patched fields (or null if no change). */
export function applyAutoArchive(
  customer: Customer,
  decision: AutoArchiveDecision,
): Pick<Customer, "archivedAt" | "lastProjectCompletedAt"> | null {
  if (!decision.shouldArchive) return null;
  return {
    archivedAt: new Date().toISOString(),
    lastProjectCompletedAt: decision.lastProjectCompletedAt,
  };
}

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

const OPEN_PROJECT_STATUSES = new Set(["Ongoing", "On Hold", "Active", "Draft", "In Progress"]);
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
  const hasOpenProject = customerProjects.some((p) =>
    OPEN_PROJECT_STATUSES.has(p.status as string),
  );
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
    .map((p) => p.endDate ?? p.startDate)
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastCompleted = completionTimes[completionTimes.length - 1] ?? new Date().toISOString();
  return { shouldArchive: true, lastProjectCompletedAt: lastCompleted };
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

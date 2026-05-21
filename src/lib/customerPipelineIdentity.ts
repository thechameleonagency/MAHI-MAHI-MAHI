/**
 * E1 — Customer identity across enquiry → quotation → project
 *
 * - **`customerId`** is the canonical FK once a lead is commercial (enquiry convert or quotation approve).
 * - **`project.client*`** is a frozen contract snapshot at project conversion — not auto-synced on `updateCustomer`.
 * - **Display** prefers the live `Customer` record when `customerId` is set; surfaces drift vs snapshot.
 */

import { formatQuotationClientAddress, resolveCustomerState } from "@/lib/quotationApproveCustomer";
import { normalizePhoneDigits } from "@/lib/phoneNormalize";
import type { Customer } from "@/types/finance";
import type { Project, Quotation } from "@/types/project";

/** Frozen client identity copied onto a project at conversion (E1 snapshot). */
export type ProjectClientSnapshot = {
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientGstin?: string;
  state?: string;
};

export type ResolvedProjectClientDisplay = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  customerId?: string;
  /** When true, labels come from the linked Customer master, not project.client*. */
  usingLiveCustomer: boolean;
  /** Project snapshot text differs from the linked customer master (expected after master edits). */
  snapshotDiffersFromCustomer: boolean;
  snapshot: ProjectClientSnapshot;
};

function normText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

/** Build the client snapshot frozen at quotation → project conversion. */
export function buildProjectClientSnapshotFromQuotation(q: Quotation): ProjectClientSnapshot {
  const clientAddress = q.clientAddress?.trim() || formatQuotationClientAddress(q) || undefined;
  return {
    client: q.clientName.trim(),
    clientPhone: q.clientPhone?.trim() || undefined,
    clientEmail: q.clientEmail?.trim() || undefined,
    clientAddress,
    clientGstin: q.clientGstin?.trim() || undefined,
    state: resolveCustomerState(q),
  };
}

export function buildProjectClientSnapshotFromProject(
  project: Pick<
    Project,
    "client" | "clientPhone" | "clientEmail" | "clientAddress" | "clientGstin" | "state"
  >,
): ProjectClientSnapshot {
  return {
    client: project.client.trim(),
    clientPhone: project.clientPhone?.trim(),
    clientEmail: project.clientEmail?.trim(),
    clientAddress: project.clientAddress?.trim(),
    clientGstin: project.clientGstin?.trim(),
    state: project.state?.trim(),
  };
}

/** Whether a linked customer master still matches the frozen project snapshot. */
export function projectClientSnapshotMatchesCustomer(
  customer: Customer,
  snapshot: ProjectClientSnapshot,
): boolean {
  if (normText(customer.name) !== normText(snapshot.client)) return false;
  if (snapshot.clientPhone) {
    if (normalizePhoneDigits(customer.phone) !== normalizePhoneDigits(snapshot.clientPhone)) {
      return false;
    }
  }
  if (snapshot.clientEmail && normText(customer.email) !== normText(snapshot.clientEmail)) {
    return false;
  }
  return true;
}

/**
 * Resolve project header / billing display: live customer when linked, else snapshot fields.
 */
export function resolveProjectClientDisplay(
  project: Pick<
    Project,
    | "client"
    | "clientPhone"
    | "clientEmail"
    | "clientAddress"
    | "clientGstin"
    | "state"
    | "customerId"
    | "location"
  >,
  customer?: Customer | null,
): ResolvedProjectClientDisplay {
  const snapshot = buildProjectClientSnapshotFromProject(project);

  if (customer?.id && project.customerId === customer.id) {
    const differs = !projectClientSnapshotMatchesCustomer(customer, snapshot);
    return {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || undefined,
      address: customer.address?.trim() || project.location || snapshot.clientAddress,
      customerId: customer.id,
      usingLiveCustomer: true,
      snapshotDiffersFromCustomer: differs,
      snapshot,
    };
  }

  return {
    name: snapshot.client,
    phone: snapshot.clientPhone,
    email: snapshot.clientEmail,
    address: snapshot.clientAddress || project.location,
    customerId: project.customerId,
    usingLiveCustomer: false,
    snapshotDiffersFromCustomer: false,
    snapshot,
  };
}

/**
 * Apply quotation client fields as the frozen project snapshot at conversion.
 * `customerId` prefers explicit project value, then quotation.
 */
export function freezeProjectClientFieldsFromQuotation<T extends Partial<Project>>(
  project: T,
  quotation: Quotation,
): T & ProjectClientSnapshot & { customerId: string } {
  const snap = buildProjectClientSnapshotFromQuotation(quotation);
  const location =
    (typeof project.location === "string" && project.location.trim()) ||
    snap.clientAddress ||
    quotation.clientAddress?.trim() ||
    "";

  return {
    ...project,
    ...snap,
    customerId: project.customerId || quotation.customerId || "",
    address: snap.clientAddress ?? project.address,
    location: location || project.location,
  };
}

/** After quotation approval, link the source enquiry to the same customer (idempotent). */
export function syncEnquiryCustomerIdAfterQuotationApprove(
  getEnquiry: (id: string) => { customerId?: string } | null | undefined,
  updateEnquiry: (id: string, patch: { customerId: string }) => void,
  enquiryId: string | undefined,
  customerId: string,
): void {
  if (!enquiryId?.trim() || !customerId.trim()) return;
  const enquiry = getEnquiry(enquiryId);
  if (!enquiry) return;
  if (enquiry.customerId && enquiry.customerId !== customerId) return;
  if (enquiry.customerId === customerId) return;
  updateEnquiry(enquiryId, { customerId });
}

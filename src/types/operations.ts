/**
 * Operations entities introduced in the "final touches" plan.
 *
 * Reservation: Materials promised to a project (or held manually) so the
 * procurement & shortfall views can warn about cross-project contention.
 *
 * Scheduling / Visits / Readiness: drives the project lifecycle from
 * "quotation approved" to "start project".
 *
 * Change Request / Additional Work / Damage: capture mid-project deltas.
 *
 * Agent Commission Accrual: makes the agent-payment gating rule explicit
 * (pending on quotation approval -> payable on project start -> paid).
 */

export type MaterialReservationSource = "manual" | "auto-from-checklist";

export interface MaterialReservation {
  id: string;
  itemId: string;
  qty: number;
  /** When set, reserved for a specific project; otherwise a manual reservation that counts against every project. */
  projectId?: string;
  reason?: string;
  createdAt: string;
  releasedAt?: string;
  source: MaterialReservationSource;
  /** When auto-created from a project site-checklist line, traces back to that line. */
  linkedChecklistItemId?: string;
}

export type ScheduledInstallationStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ScheduledInstallation {
  id: string;
  projectId: string;
  scheduledDate: string;
  teamId?: string;
  employeeIds?: string[];
  status: ScheduledInstallationStatus;
  notes?: string;
  createdAt: string;
}

export interface SiteVisitItem {
  inventoryItemId?: string;
  name: string;
  requiredQty: number;
  unit?: string;
  notes?: string;
}

export interface SiteVisit {
  id: string;
  projectId: string;
  visitedBy: string;
  visitDate: string;
  items: SiteVisitItem[];
  blockers?: string;
  photos?: string[];
  reconciledChecklistAt?: string;
  createdAt: string;
}

export type ProjectChangeRequestType = "capacity" | "panels" | "addon-work";
export type ProjectChangeRequestStatus = "draft" | "approved" | "rejected";

export interface ProjectChangeRequestMaterialDelta {
  itemId: string;
  deltaQty: number;
}

export interface ProjectChangeRequestRateBasisChange {
  from: "fixed" | "per_kw" | "per_sqft";
  to: "fixed" | "per_kw" | "per_sqft";
  rate: number;
}

export interface ProjectChangeRequest {
  id: string;
  projectId: string;
  type: ProjectChangeRequestType;
  deltaKw?: number;
  deltaPanels?: number;
  deltaAmount?: number;
  materialDelta?: ProjectChangeRequestMaterialDelta[];
  rateBasisChange?: ProjectChangeRequestRateBasisChange;
  status: ProjectChangeRequestStatus;
  requestedAt: string;
  approvedAt?: string;
  notes?: string;
  /** Set on approval if a delta invoice draft was auto-created. */
  generatedInvoiceId?: string;
}

export type MaterialDamageStage = "transport" | "installation" | "storage";

export interface MaterialDamage {
  id: string;
  itemId: string;
  qty: number;
  stage: MaterialDamageStage;
  projectId?: string;
  transportRef?: string;
  reportedBy?: string;
  notes?: string;
  costImpact?: number;
  reportedAt: string;
}

export type AgentCommissionAccrualStatus = "pending" | "payable" | "paid";

export interface AgentCommissionAccrual {
  id: string;
  agentId: string;
  /** Filled in when a Project is created from the originating quotation. Until then the accrual
   * is tracked against the quotation via `sourceQuotationId`. */
  projectId?: string;
  /** Snapshot of the expected fee at the moment of accrual creation. */
  expectedAmount: number;
  status: AgentCommissionAccrualStatus;
  accruedAt: string;
  payableAt?: string;
  paidAt?: string;
  /** Link to the AgentCommissionPayment that closed this accrual. */
  linkedPaymentId?: string;
  /** Originating quotation. Always set when accrual was emitted at quotation approval. */
  sourceQuotationId?: string;
}

export interface AdditionalWorkLine {
  id: string;
  description: string;
  basis: "fixed" | "per_kw" | "per_sqft";
  rate: number;
  qty?: number;
  total: number;
  addedAt: string;
}

export interface SiteReadinessSnapshot {
  ready: boolean;
  note?: string;
  markedAt: string;
  markedBy: number;
}

/** Admin-assigned procurement line from Need-to-Get (vendor + acquire state). */
export type ProcurementNeedLineStatus = "pending" | "acquired";

export interface ProcurementNeedLine {
  id: string;
  /** Stable key: projectId|siteId|materialId|needByDate */
  lineKey: string;
  projectId: string;
  siteId: string;
  materialId: string;
  materialName: string;
  qtyNeeded: number;
  needByDate: string;
  lastPurchaseRate: number;
  vendorId?: string;
  status: ProcurementNeedLineStatus;
  acquiredAt?: string;
  vendorBillId?: string;
  acquiredQty?: number;
  acquiredRate?: number;
  notes?: string;
}

export function procurementNeedLineKey(parts: {
  projectId: string;
  siteId: string;
  materialId: string;
  needByDate: string;
}): string {
  return `${parts.projectId}|${parts.siteId}|${parts.materialId}|${parts.needByDate}`;
}

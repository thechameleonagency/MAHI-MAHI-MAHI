/**
 * E3 — Project deletion cascade audit + related-record cleanup
 *
 * Deleting a project removes all rows keyed by `projectId` and writes one audit entry
 * summarizing what was removed. Source quotations are unlinked (not deleted).
 */

import { quotationLinkedProjectId } from "@/lib/quotationProjectLink";
import type {
  AgentCommissionPayment,
  AccountingReviewQueueItem,
  AuditLogEntry,
  Expense,
  Income,
  Invoice,
  OwnerInvestment,
  PartnerTransaction,
  INCGiverTransaction,
  Payment,
} from "@/types/finance";
import type {
  AgentCommissionAccrual,
  Blockage,
  ClientPaymentRecord,
  MaterialDamage,
  MaterialReservation,
  ProcurementNeedLine,
  Project,
  ProjectChangeRequest,
  ProjectTimelineStatus,
  Quotation,
  ScheduledInstallation,
  SiteRecord,
  SiteVisit,
  Task,
  Ticket,
} from "@/types/project";

/** Subset of app state needed to count and apply project deletion. */
export type ProjectDeletionStateSlice = {
  projects: Project[];
  invoices: Invoice[];
  saleBills: Invoice[];
  tasks: Task[];
  expenses: Expense[];
  incomes: Income[];
  payments: Payment[];
  sites: SiteRecord[];
  blockages: Blockage[];
  operationalTickets: Ticket[];
  clientPaymentRecords: ClientPaymentRecord[];
  projectTimelineByProjectId: Record<string, ProjectTimelineStatus>;
  scheduledInstallations?: ScheduledInstallation[];
  siteVisits?: SiteVisit[];
  projectChangeRequests?: ProjectChangeRequest[];
  materialReservations?: MaterialReservation[];
  agentCommissionAccruals?: AgentCommissionAccrual[];
  materialDamageRecords?: MaterialDamage[];
  procurementNeedLines?: ProcurementNeedLine[];
  ownerInvestments: OwnerInvestment[];
  partnerTransactions: PartnerTransaction[];
  incGiverTransactions?: INCGiverTransaction[];
  accountingReviewQueue: AccountingReviewQueueItem[];
  agentCommissionPayments: AgentCommissionPayment[];
  quotations: Quotation[];
};

export type ProjectDeletionCascadeCounts = {
  invoices: number;
  saleBills: number;
  tasks: number;
  expenses: number;
  incomes: number;
  payments: number;
  sites: number;
  blockages: number;
  operationalTickets: number;
  clientPaymentRecords: number;
  projectTimeline: number;
  scheduledInstallations: number;
  siteVisits: number;
  projectChangeRequests: number;
  materialReservations: number;
  agentCommissionAccruals: number;
  materialDamageRecords: number;
  procurementNeedLines: number;
  ownerInvestments: number;
  partnerTransactions: number;
  incGiverTransactions: number;
  accountingReviewQueue: number;
  agentCommissionPayments: number;
  quotationsUnlinked: number;
};

function countByProjectId<T extends { projectId?: string }>(
  rows: T[],
  projectId: string,
): number {
  return rows.filter((r) => r.projectId === projectId).length;
}

/** Count related rows that will be removed or unlinked when `projectId` is deleted. */
export function countProjectDeletionCascade(
  state: ProjectDeletionStateSlice,
  projectId: string,
): ProjectDeletionCascadeCounts {
  const timeline = state.projectTimelineByProjectId[projectId] ? 1 : 0;
  const quotationsUnlinked = state.quotations.filter(
    (q) => quotationLinkedProjectId(q) === projectId,
  ).length;

  return {
    invoices: countByProjectId(state.invoices, projectId),
    saleBills: countByProjectId(state.saleBills, projectId),
    tasks: countByProjectId(state.tasks, projectId),
    expenses: countByProjectId(state.expenses, projectId),
    incomes: countByProjectId(state.incomes, projectId),
    payments: countByProjectId(state.payments, projectId),
    sites: countByProjectId(state.sites, projectId),
    blockages: countByProjectId(state.blockages, projectId),
    operationalTickets: countByProjectId(state.operationalTickets, projectId),
    clientPaymentRecords: countByProjectId(state.clientPaymentRecords, projectId),
    projectTimeline: timeline,
    scheduledInstallations: countByProjectId(state.scheduledInstallations ?? [], projectId),
    siteVisits: countByProjectId(state.siteVisits ?? [], projectId),
    projectChangeRequests: countByProjectId(state.projectChangeRequests ?? [], projectId),
    materialReservations: countByProjectId(state.materialReservations ?? [], projectId),
    agentCommissionAccruals: countByProjectId(state.agentCommissionAccruals ?? [], projectId),
    materialDamageRecords: countByProjectId(state.materialDamageRecords ?? [], projectId),
    procurementNeedLines: countByProjectId(state.procurementNeedLines ?? [], projectId),
    ownerInvestments: countByProjectId(state.ownerInvestments, projectId),
    partnerTransactions: countByProjectId(state.partnerTransactions, projectId),
    incGiverTransactions: countByProjectId(state.incGiverTransactions ?? [], projectId),
    accountingReviewQueue: countByProjectId(state.accountingReviewQueue, projectId),
    agentCommissionPayments: countByProjectId(state.agentCommissionPayments, projectId),
    quotationsUnlinked,
  };
}

export function totalProjectDeletionCascadeRecords(counts: ProjectDeletionCascadeCounts): number {
  return (
    counts.invoices +
    counts.saleBills +
    counts.tasks +
    counts.expenses +
    counts.incomes +
    counts.payments +
    counts.sites +
    counts.blockages +
    counts.operationalTickets +
    counts.clientPaymentRecords +
    counts.projectTimeline +
    counts.scheduledInstallations +
    counts.siteVisits +
    counts.projectChangeRequests +
    counts.materialReservations +
    counts.agentCommissionAccruals +
    counts.materialDamageRecords +
    counts.procurementNeedLines +
    counts.ownerInvestments +
    counts.partnerTransactions +
    counts.incGiverTransactions +
    counts.accountingReviewQueue +
    counts.agentCommissionPayments +
    counts.quotationsUnlinked
  );
}

const CASCADE_LABELS: { key: keyof ProjectDeletionCascadeCounts; label: string }[] = [
  { key: "invoices", label: "invoices" },
  { key: "saleBills", label: "sale bills" },
  { key: "tasks", label: "tasks" },
  { key: "expenses", label: "expenses" },
  { key: "incomes", label: "incomes" },
  { key: "payments", label: "payments" },
  { key: "sites", label: "sites" },
  { key: "blockages", label: "blockages" },
  { key: "operationalTickets", label: "tickets" },
  { key: "clientPaymentRecords", label: "client payments" },
  { key: "projectTimeline", label: "timeline" },
  { key: "scheduledInstallations", label: "install schedules" },
  { key: "siteVisits", label: "site visits" },
  { key: "projectChangeRequests", label: "change requests" },
  { key: "materialReservations", label: "material reservations" },
  { key: "agentCommissionAccruals", label: "commission accruals" },
  { key: "materialDamageRecords", label: "damage records" },
  { key: "procurementNeedLines", label: "procurement lines" },
  { key: "ownerInvestments", label: "owner investments" },
  { key: "partnerTransactions", label: "partner transactions" },
  { key: "incGiverTransactions", label: "INC giver transactions" },
  { key: "accountingReviewQueue", label: "accounting review items" },
  { key: "agentCommissionPayments", label: "commission payments" },
  { key: "quotationsUnlinked", label: "quotations unlinked" },
];

/** Human-readable summary stored on the project delete audit row. */
export function formatProjectDeletionCascadeSummary(
  projectName: string,
  projectId: string,
  counts: ProjectDeletionCascadeCounts,
): string {
  const parts = CASCADE_LABELS.filter(({ key }) => counts[key] > 0).map(
    ({ key, label }) => `${counts[key]} ${label}`,
  );
  const total = totalProjectDeletionCascadeRecords(counts);
  const detail = parts.length > 0 ? parts.join(", ") : "no related records";
  return `Deleted project "${projectName}" (${projectId}) and ${total} related record(s): ${detail}.`;
}

/** Clear project link on source quotations (quotation remains; re-convert allowed). */
export function unlinkQuotationsFromDeletedProject(
  quotations: Quotation[],
  projectId: string,
): { quotations: Quotation[]; unlinkedCount: number } {
  let unlinkedCount = 0;
  const next = quotations.map((q) => {
    if (quotationLinkedProjectId(q) !== projectId) return q;
    unlinkedCount += 1;
    const { convertedToProjectId: _legacy, ...rest } = q;
    return {
      ...rest,
      linkedProjectId: undefined,
      convertedAt: undefined,
      status: q.status === "converted_to_project" ? "approved" : q.status,
    } as Quotation;
  });
  return { quotations: next, unlinkedCount };
}

export type BuildProjectDeletionAuditEntry = (
  action: AuditLogEntry["action"],
  entityType: string,
  entityId: string,
  entityName: string,
  field?: string,
  oldValue?: string,
  newValue?: string,
) => AuditLogEntry;

/** Apply cascade filters and return next state slice fields (caller merges into full state). */
export function applyProjectDeletionToState<T extends ProjectDeletionStateSlice>(
  prev: T,
  projectId: string,
): { next: T; counts: ProjectDeletionCascadeCounts; project: Project } | null {
  const project = prev.projects.find((p) => p.id === projectId);
  if (!project) return null;

  const counts = countProjectDeletionCascade(prev, projectId);
  const { quotations, unlinkedCount } = unlinkQuotationsFromDeletedProject(
    prev.quotations,
    projectId,
  );
  counts.quotationsUnlinked = unlinkedCount;

  const { [projectId]: _removedTimeline, ...restTimelines } = prev.projectTimelineByProjectId;

  const next: T = {
    ...prev,
    projects: prev.projects.filter((p) => p.id !== projectId),
    invoices: prev.invoices.filter((i) => i.projectId !== projectId),
    saleBills: prev.saleBills.filter((s) => s.projectId !== projectId),
    tasks: prev.tasks.filter((t) => t.projectId !== projectId),
    expenses: prev.expenses.filter((e) => e.projectId !== projectId),
    incomes: prev.incomes.filter((i) => i.projectId !== projectId),
    payments: prev.payments.filter((p) => p.projectId !== projectId),
    sites: prev.sites.filter((s) => s.projectId !== projectId),
    blockages: prev.blockages.filter((b) => b.projectId !== projectId),
    operationalTickets: prev.operationalTickets.filter((t) => t.projectId !== projectId),
    clientPaymentRecords: prev.clientPaymentRecords.filter((c) => c.projectId !== projectId),
    projectTimelineByProjectId: restTimelines,
    scheduledInstallations: (prev.scheduledInstallations ?? []).filter(
      (s) => s.projectId !== projectId,
    ),
    siteVisits: (prev.siteVisits ?? []).filter((v) => v.projectId !== projectId),
    projectChangeRequests: (prev.projectChangeRequests ?? []).filter(
      (r) => r.projectId !== projectId,
    ),
    materialReservations: (prev.materialReservations ?? []).filter(
      (r) => r.projectId !== projectId,
    ),
    agentCommissionAccruals: (prev.agentCommissionAccruals ?? []).filter(
      (a) => a.projectId !== projectId,
    ),
    materialDamageRecords: (prev.materialDamageRecords ?? []).filter(
      (d) => d.projectId !== projectId,
    ),
    procurementNeedLines: (prev.procurementNeedLines ?? []).filter(
      (l) => l.projectId !== projectId,
    ),
    ownerInvestments: prev.ownerInvestments.filter((i) => i.projectId !== projectId),
    partnerTransactions: prev.partnerTransactions.filter((t) => t.projectId !== projectId),
    incGiverTransactions: (prev.incGiverTransactions ?? []).filter((t) => t.projectId !== projectId),
    accountingReviewQueue: prev.accountingReviewQueue.filter((i) => i.projectId !== projectId),
    agentCommissionPayments: prev.agentCommissionPayments.filter(
      (p) => p.projectId !== projectId,
    ),
    quotations,
  };

  return { next, counts, project };
}

export function buildProjectDeletionAuditEntry(
  createAuditEntry: BuildProjectDeletionAuditEntry,
  project: Project,
  counts: ProjectDeletionCascadeCounts,
): AuditLogEntry {
  return createAuditEntry(
    "delete",
    "Project",
    project.id,
    project.name,
    "cascadeRemoval",
    undefined,
    formatProjectDeletionCascadeSummary(project.name, project.id, counts),
  );
}

/**
 * Phase 4.1 — Unified calendar event sources for Calendar page + Dashboard schedule.
 */
import { addMonths, format, isValid, parseISO } from "date-fns";
import type { Enquiry, Project, Task } from "@/types/project";
import type { Invoice, Loan, LoanRepayment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import type { ScheduledInstallation, SiteVisit } from "@/types/operations";

export type CalendarEventSource =
  | "task"
  | "installation"
  | "enquiry"
  | "invoice"
  | "vendor-bill"
  | "loan-emi"
  | "site-visit"
  | "milestone";

export type CalendarEntityType = "project" | "customer" | "invoice" | "vendor" | "quotation";

export interface CalendarEntityLink {
  entityType: CalendarEntityType;
  entityId: string | number;
}

export interface CalendarEvent {
  id: string;
  date: string;
  source: CalendarEventSource;
  title: string;
  subtitle?: string;
  href?: string;
  projectId?: string;
  titleLink?: CalendarEntityLink;
  subtitleLink?: CalendarEntityLink;
}

export interface CalendarDataInput {
  tasks: Task[];
  scheduledInstallations: ScheduledInstallation[];
  enquiries: Enquiry[];
  invoices: Invoice[];
  vendorBills: VendorBill[];
  loans: Loan[];
  loanRepayments: LoanRepayment[];
  siteVisits: SiteVisit[];
  projects: Project[];
}

const toDay = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : null;
};

const SOURCE_LABELS: Record<CalendarEventSource, string> = {
  task: "Tasks",
  installation: "Installations",
  enquiry: "Enquiry follow-ups",
  invoice: "Invoice due",
  "vendor-bill": "Vendor bills",
  "loan-emi": "Loan EMI",
  "site-visit": "Site visits",
  milestone: "Project milestones",
};

export function getCalendarSourceLabel(source: CalendarEventSource): string {
  return SOURCE_LABELS[source];
}

function nextEmiDueDate(loan: Loan, repayments: LoanRepayment[]): string | null {
  if (loan.status !== "Active" || loan.paymentType !== "emi") return null;
  const loanReps = repayments.filter((r) => r.loanId === loan.id);
  const baseIso =
    loanReps.length > 0
      ? [...loanReps].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : loan.startDate;
  const base = parseISO(baseIso.length === 10 ? `${baseIso}T12:00:00` : baseIso);
  if (!isValid(base)) return null;
  return format(addMonths(base, 1), "yyyy-MM-dd");
}

export function buildCalendarEvents(input: CalendarDataInput): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const t of input.tasks) {
    const day = toDay(t.workDate);
    if (!day) continue;
    events.push({
      id: `task-${t.id}`,
      date: day,
      source: "task",
      title: t.siteName || t.siteId || "Site task",
      subtitle: t.workType,
      href: "/timeline",
      projectId: t.siteId,
      titleLink: t.siteId ? { entityType: "project", entityId: t.siteId } : undefined,
    });
  }

  for (const s of input.scheduledInstallations) {
    const day = toDay(s.scheduledDate);
    if (!day) continue;
    const project = input.projects.find((p) => p.id === s.projectId);
    events.push({
      id: `install-${s.id}`,
      date: day,
      source: "installation",
      title: project?.name ?? s.projectId,
      subtitle: s.status,
      href: s.projectId ? `/projects/${s.projectId}` : "/projects",
      projectId: s.projectId,
      titleLink: s.projectId ? { entityType: "project", entityId: s.projectId } : undefined,
    });
  }

  for (const e of input.enquiries) {
    if (e.status === "converted" || e.status === "lost") continue;
    const day = toDay(e.followUpDate);
    if (!day) continue;
    events.push({
      id: `enq-${e.id}`,
      date: day,
      source: "enquiry",
      title: e.customerName,
      subtitle: e.status,
      href: "/enquiries",
      titleLink: e.customerId ? { entityType: "customer", entityId: e.customerId } : undefined,
    });
  }

  for (const inv of input.invoices) {
    if (inv.status === "paid" || inv.status === "voided" || inv.status === "draft") continue;
    const day = toDay(inv.dueDate);
    if (!day) continue;
    events.push({
      id: `inv-${inv.id}`,
      date: day,
      source: "invoice",
      title: inv.invoiceNumber,
      subtitle: inv.customerName,
      href: "/invoices",
      projectId: inv.projectId,
      titleLink: { entityType: "invoice", entityId: inv.id },
      subtitleLink: inv.customerId
        ? { entityType: "customer", entityId: inv.customerId }
        : undefined,
    });
  }

  for (const bill of input.vendorBills) {
    if (bill.status === "paid" || bill.status === "draft") continue;
    const day = toDay(bill.dueDate ?? bill.billDate);
    if (!day) continue;
    events.push({
      id: `vb-${bill.id}`,
      date: day,
      source: "vendor-bill",
      title: bill.billNumber,
      subtitle: bill.vendorName,
      href: bill.vendorId ? `/vendors/${bill.vendorId}` : "/vendors",
      projectId: bill.projectId,
      subtitleLink: bill.vendorId ? { entityType: "vendor", entityId: bill.vendorId } : undefined,
    });
  }

  for (const loan of input.loans) {
    const day = nextEmiDueDate(loan, input.loanRepayments ?? []);
    if (!day) continue;
    events.push({
      id: `emi-${loan.id}-${day}`,
      date: day,
      source: "loan-emi",
      title: loan.source,
      subtitle: loan.emiAmount ? `EMI ₹${loan.emiAmount.toLocaleString("en-IN")}` : "EMI due",
      href: "/loans",
    });
  }

  for (const v of input.siteVisits) {
    const day = toDay(v.visitDate);
    if (!day) continue;
    const project = input.projects.find((p) => p.id === v.projectId);
    events.push({
      id: `visit-${v.id}`,
      date: day,
      source: "site-visit",
      title: project?.name ?? v.projectId,
      subtitle: v.reconciledChecklistAt ? "Reconciled" : "Visit logged",
      href: `/projects/${v.projectId}`,
      projectId: v.projectId,
      titleLink: { entityType: "project", entityId: v.projectId },
    });
  }

  for (const p of input.projects) {
    for (const [field, label] of [
      ["startDate", "Start"],
      ["endDate", "Target end"],
    ] as const) {
      const day = toDay(p[field]);
      if (!day) continue;
      events.push({
        id: `ms-${p.id}-${field}`,
        date: day,
        source: "milestone",
        title: p.name,
        subtitle: label,
        href: `/projects/${p.id}`,
        projectId: p.id,
        titleLink: { entityType: "project", entityId: p.id },
      });
    }
  }

  return events.sort(
    (a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "") ||
      (a.title ?? "").localeCompare(b.title ?? ""),
  );
}

export function getEventsForDate(events: CalendarEvent[], day: string): CalendarEvent[] {
  return events.filter((e) => e.date === day);
}

/** Inclusive date-range filter. Empty `to` defaults to `from`. */
export function getEventsForRange(events: CalendarEvent[], from: string, to: string): CalendarEvent[] {
  const lo = from;
  const hi = to || from;
  return events.filter((e) => e.date >= lo && e.date <= hi);
}

export function groupEventsBySource(events: CalendarEvent[]): Record<CalendarEventSource, CalendarEvent[]> {
  const groups = {} as Record<CalendarEventSource, CalendarEvent[]>;
  for (const src of Object.keys(SOURCE_LABELS) as CalendarEventSource[]) {
    groups[src] = [];
  }
  for (const e of events) {
    groups[e.source].push(e);
  }
  return groups;
}

/** Group events by their date (yyyy-MM-dd). Keys sorted ascending. */
export function groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
  const map: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    (map[e.date] ??= []).push(e);
  }
  return map;
}

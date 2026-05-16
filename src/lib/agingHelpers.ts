import { differenceInCalendarDays, differenceInHours, parseISO, isValid } from "date-fns";
import type { Enquiry, Project, Quotation } from "@/types/project";
import type { Invoice } from "@/types/finance";
import type { Blockage } from "@/types/blockage";
import type { Task } from "@/types/project";

export type AgingTone = "neutral" | "warning" | "danger" | "muted";

export interface AgingSignal {
  label: string;
  tone: AgingTone;
}

const safeParse = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = parseISO(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return isValid(d) ? d : null;
};

const daysSince = (d: Date, now = new Date()): number =>
  Math.max(0, differenceInCalendarDays(now, d));

export function isProjectCompleted(p: Project): boolean {
  return (
    p.lifecycleStatus === "Completed" ||
    p.status === "Completed" ||
    p.status === "Closed"
  );
}

export function isProjectOpen(p: Project): boolean {
  return !isProjectCompleted(p);
}

export function getProjectIdleAging(
  project: Project,
  ctx?: { lastPaymentDate?: string; lastTaskDate?: string },
): AgingSignal | null {
  const candidates = [
    safeParse(ctx?.lastTaskDate),
    safeParse(ctx?.lastPaymentDate),
    safeParse(project.startDate),
  ].filter((d): d is Date => d !== null);
  if (!candidates.length) return null;
  const last = new Date(Math.max(...candidates.map((d) => d.getTime())));
  const days = daysSince(last);
  if (days < 3) return null;
  return {
    label: `Idle ${days}d`,
    tone: days >= 14 ? "danger" : "warning",
  };
}

export function getQuotationNoResponseAging(q: Quotation): AgingSignal | null {
  if (q.status !== "sent") return null;
  const sent = safeParse(q.sentAt ?? q.updatedAt ?? q.createdAt);
  if (!sent) return null;
  const days = daysSince(sent);
  if (days < 2) return null;
  return {
    label: `No response ${days}d`,
    tone: days >= 7 ? "danger" : "warning",
  };
}

export function getInvoiceOverdueAging(inv: Invoice): AgingSignal | null {
  if (inv.status === "paid" || inv.status === "draft" || inv.status === "voided") return null;
  const due = safeParse(inv.dueDate);
  if (!due) return null;
  const days = daysSince(due);
  if (days <= 0) return null;
  return {
    label: `Overdue ${days}d`,
    tone: days >= 30 ? "danger" : "warning",
  };
}

export function getEnquiryFollowUpAging(e: Enquiry): AgingSignal | null {
  if (e.status === "converted" || e.status === "lost") return null;
  const fu = safeParse(e.followUpDate);
  if (!fu) return null;
  const now = new Date();
  if (fu >= now) return null;
  const days = daysSince(fu);
  return {
    label: `Follow-up ${days}d late`,
    tone: days >= 3 ? "danger" : "warning",
  };
}

export function getBlockageUpdatedAging(b: Blockage): AgingSignal | null {
  const at = safeParse(b.resolvedAt ?? b.assignedAt ?? b.createdAt);
  if (!at) return null;
  const hours = differenceInHours(new Date(), at);
  if (hours < 24) {
    return { label: `Updated ${hours}h ago`, tone: "muted" };
  }
  const days = Math.floor(hours / 24);
  return { label: `Updated ${days}d ago`, tone: days >= 5 ? "warning" : "muted" };
}

export function getTaskOverdueAging(t: Task): AgingSignal | null {
  if (t.status === "done") return null;
  const wd = safeParse(t.workDate);
  if (!wd) return null;
  const now = new Date();
  if (wd >= now) return null;
  const days = daysSince(wd);
  return {
    label: `Overdue ${days}d`,
    tone: days >= 2 ? "danger" : "warning",
  };
}

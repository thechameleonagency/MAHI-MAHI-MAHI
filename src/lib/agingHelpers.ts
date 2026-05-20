import { differenceInCalendarDays, differenceInHours, parseISO, isValid, addMonths, format } from "date-fns";
import type { Enquiry, Project, Quotation } from "@/types/project";
import type { Invoice, Loan, LoanRepayment } from "@/types/finance";
import type { Blockage } from "@/types/blockage";
import type { Task } from "@/types/project";
import type { VendorBill } from "@/types/inventory";

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

export function getInvoiceOverdueAging(inv: Invoice | null | undefined): AgingSignal | null {
  if (!inv?.status) return null;
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

/** Worst overdue signal across open customer bills (for list-row AgingChip). */
export function getCustomerReceivableAging(
  bills: Pick<Invoice, "status" | "dueDate" | "total" | "amountReceived">[],
): AgingSignal | null {
  const open = bills.filter(
    (b) =>
      (b.total - (b.amountReceived ?? 0)) > 0.01 &&
      b.status !== "paid" &&
      b.status !== "voided" &&
      b.status !== "draft",
  );
  if (!open.length) return null;

  let best: AgingSignal | null = null;
  let bestDays = -1;
  for (const bill of open) {
    const sig = getInvoiceOverdueAging(bill as Invoice);
    if (!sig) continue;
    const m = /(\d+)d/.exec(sig.label);
    const days = m ? Number(m[1]) : 0;
    if (days > bestDays) {
      bestDays = days;
      best = sig;
    }
  }
  return best;
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

/** Days past due for an active loan (EMI schedule, one-time due, or reminder). */
export function loanDaysOverdue(
  loan: Pick<Loan, "id" | "status" | "paymentType" | "dueDate" | "startDate" | "outstanding" | "reminderDate">,
  repayments: Pick<LoanRepayment, "loanId" | "date">[],
): number {
  const todayIso = new Date().toISOString().split("T")[0];
  if (loan.status !== "Active") return 0;

  if (loan.paymentType === "one-time" && loan.dueDate && loan.outstanding > 0.01 && loan.dueDate < todayIso) {
    return differenceInCalendarDays(parseISO(todayIso), parseISO(loan.dueDate));
  }
  if (loan.paymentType === "emi" && loan.startDate && loan.outstanding > 0.01) {
    const paidCount = repayments.filter((r) => r.loanId === loan.id).length;
    const nextDueIso = format(addMonths(parseISO(loan.startDate), paidCount + 1), "yyyy-MM-dd");
    if (nextDueIso < todayIso) {
      return differenceInCalendarDays(parseISO(todayIso), parseISO(nextDueIso));
    }
    return 0;
  }
  if (loan.paymentType === "reminder-only" && loan.reminderDate && loan.reminderDate < todayIso) {
    return differenceInCalendarDays(parseISO(todayIso), parseISO(loan.reminderDate));
  }
  return 0;
}

export function getLoanOverdueAging(
  loan: Pick<Loan, "id" | "status" | "paymentType" | "dueDate" | "startDate" | "outstanding" | "reminderDate">,
  repayments: Pick<LoanRepayment, "loanId" | "date">[],
): AgingSignal | null {
  const days = loanDaysOverdue(loan, repayments);
  if (days <= 0) return null;
  const label =
    loan.paymentType === "emi"
      ? `EMI overdue ${days}d`
      : `Overdue ${days}d`;
  return {
    label,
    tone: days >= 30 ? "danger" : "warning",
  };
}

/** Worst overdue signal across open vendor bills (for list-row AgingChip). */
export function getVendorPayableAging(
  bills: Pick<VendorBill, "status" | "dueDate" | "total" | "amountPaid">[],
): AgingSignal | null {
  const open = bills.filter(
    (b) =>
      (b.total - (b.amountPaid ?? 0)) > 0.01 &&
      b.status !== "paid",
  );
  if (!open.length) return null;

  let best: AgingSignal | null = null;
  let bestDays = -1;
  for (const bill of open) {
    const due = safeParse(bill.dueDate ?? bill.billDate);
    if (!due) continue;
    const days = daysSince(due);
    if (days <= 0) continue;
    const sig: AgingSignal = {
      label: `Overdue ${days}d`,
      tone: days >= 30 ? "danger" : "warning",
    };
    if (days > bestDays) {
      bestDays = days;
      best = sig;
    }
  }
  return best;
}

/** Partner settlement pending — days since oldest completed linked project (if any). */
export function getPartnerSettlementPendingAging(
  pending: number,
  completedProjectDates: string[],
): AgingSignal | null {
  if (pending <= 0.5) return null;
  const dates = completedProjectDates
    .map((d) => safeParse(d))
    .filter((d): d is Date => d !== null);
  if (!dates.length) {
    return { label: "Settlement pending", tone: "warning" };
  }
  const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const days = daysSince(oldest);
  return {
    label: `Pending ${days}d`,
    tone: days >= 30 ? "danger" : "warning",
  };
}

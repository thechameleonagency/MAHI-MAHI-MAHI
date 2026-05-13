import { useMemo } from "react";
import { parseISO, differenceInCalendarDays, isValid } from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";

/** Count of actionable business alerts (matches TopHeader / notification hub intent). */
export function useDerivedAlertCount(): number {
  const { invoices, loans, lowStockItems, blockages, quotations, projects, projectTimelineByProjectId } = useAppData();

  return useMemo(() => {
    const today = new Date();
    let n = 0;

    n += invoices.filter((inv) => {
      if (inv.status === "paid" || inv.status === "overpaid") return false;
      const due = inv.dueDate ? parseISO(inv.dueDate) : null;
      return due && isValid(due) && due < today;
    }).length;

    n += (lowStockItems ?? []).length;

    n += blockages.filter((b) => {
      if (b.status === "resolved") return false;
      const start = b.startDate ? parseISO(b.startDate) : null;
      return start && isValid(start) && differenceInCalendarDays(today, start) > 14;
    }).length;

    n += quotations.filter((q) => {
      if (q.status !== "sent") return false;
      const sent = q.sentAt ?? q.createdAt;
      const d = sent ? parseISO(sent) : null;
      return d && isValid(d) && differenceInCalendarDays(today, d) > 7;
    }).length;

    n += loans.filter((l) => {
      if (l.status !== "Active" || l.paymentType !== "emi" || !l.dueDate) return false;
      const due = parseISO(l.dueDate);
      if (!isValid(due)) return false;
      const days = differenceInCalendarDays(due, today);
      return (days >= 0 && days <= 7) || days < 0;
    }).length;

    projects.forEach((p) => {
      const approvals = projectTimelineByProjectId[p.id]?.workStatusApprovals;
      if (!approvals) return;
      Object.values(approvals).forEach((info) => {
        if (info?.status === "requested") n += 1;
        const subs = info?.subItemApprovals;
        if (subs) {
          Object.values(subs).forEach((sub) => {
            if (sub?.status === "requested") n += 1;
          });
        }
      });
    });

    return n;
  }, [invoices, loans, lowStockItems, blockages, quotations, projects, projectTimelineByProjectId]);
}

import { differenceInCalendarDays, parseISO, isValid } from "date-fns";
import { normalizeLoanPersonKey } from "@/lib/loanPerson";
import type { Invoice, Loan } from "@/types/finance";
import type { Blockage, DeletionRequest } from "@/types/blockage";
import type { Project, InventoryItem, Quotation } from "@/types/project";
import type { VendorBill } from "@/types/inventory";

export type BusinessAlertSeverity = "high" | "medium" | "low";

export type BusinessAlertKind =
  | "invoice"
  | "loan"
  | "stock"
  | "blockage"
  | "blockage_stale"
  | "quotation"
  | "vendor_bill"
  | "approval"
  | "deletion_request";

export type BusinessAlertDescriptor = {
  id: string;
  severity: BusinessAlertSeverity;
  title: string;
  detail: string;
  href: string;
  kind: BusinessAlertKind;
};

export type BusinessAlertsInput = {
  invoices: Invoice[];
  loans: Loan[];
  lowStockItems: InventoryItem[];
  blockages: Blockage[];
  quotations: Quotation[];
  projects: Project[];
  projectTimelineByProjectId: Record<
    string,
    {
      workStatusApprovals?: Record<
        string,
        { status?: string; subItemApprovals?: Record<string, { status?: string }> }
      >;
    }
  >;
  vendorBills: VendorBill[];
  /** Optional vendor id → display name for bill alerts. */
  vendorNamesById?: Map<string, string>;
  /** ER7 — pending admin deletion approvals. */
  deletionRequests?: DeletionRequest[];
};

function vendorLabel(bill: VendorBill, names?: Map<string, string>): string {
  const id = String(bill.vendorId);
  return bill.vendorName?.trim() || names?.get(id) || `Vendor #${id}`;
}

/** Exclude actor-acknowledged alerts (persisted per session user). */
export function filterDismissedBusinessAlerts(
  descriptors: readonly BusinessAlertDescriptor[],
  dismissedIds: ReadonlySet<string>,
): BusinessAlertDescriptor[] {
  if (dismissedIds.size === 0) return [...descriptors];
  return descriptors.filter((d) => !dismissedIds.has(d.id));
}

export function countUndismissedBusinessAlerts(
  descriptors: readonly BusinessAlertDescriptor[],
  dismissedIds: ReadonlySet<string>,
): number {
  return filterDismissedBusinessAlerts(descriptors, dismissedIds).length;
}

/** Single source of truth for Notifications page and header alert count. */
export function deriveBusinessAlertDescriptors(input: BusinessAlertsInput): BusinessAlertDescriptor[] {
  const out: BusinessAlertDescriptor[] = [];
  const today = new Date();
  const names = input.vendorNamesById;

  for (const inv of input.invoices) {
    if (!inv?.status) continue;
    if (inv.status === "paid" || inv.status === "overpaid" || inv.status === "draft") continue;
    const due = inv.dueDate ? parseISO(inv.dueDate) : null;
    if (due && isValid(due) && due < today) {
      const bal = inv.total - (inv.amountReceived ?? 0);
      out.push({
        id: `inv-${inv.id}`,
        severity: "high",
        title: `Overdue invoice ${inv.invoiceNumber}`,
        detail: `${inv.customerName} — ₹${Math.round(bal).toLocaleString("en-IN")} outstanding`,
        href: `/invoices?invoice=${inv.id}`,
        kind: "invoice",
      });
    }
  }

  for (const l of input.loans) {
    if (l.status !== "Active" || l.paymentType !== "emi" || !l.dueDate) continue;
    const due = parseISO(l.dueDate);
    if (!isValid(due)) continue;
    const days = differenceInCalendarDays(due, today);
    const personHref = `/loans/person/${encodeURIComponent(normalizeLoanPersonKey(l))}`;
    if (days < 0) {
      out.push({
        id: `loan-${l.id}-over`,
        severity: "high",
        title: `Overdue EMI — ${l.source}`,
        detail: `Due ${l.dueDate} — ₹${l.emiAmount?.toLocaleString("en-IN") ?? ""}`,
        href: personHref,
        kind: "loan",
      });
    } else if (days <= 7) {
      out.push({
        id: `loan-${l.id}-soon`,
        severity: "medium",
        title: `EMI due within 7 days — ${l.source}`,
        detail: `Due ${l.dueDate} — ₹${l.emiAmount?.toLocaleString("en-IN") ?? ""}`,
        href: personHref,
        kind: "loan",
      });
    }
  }

  for (const item of input.lowStockItems ?? []) {
    out.push({
      id: `stock-${item.id}`,
      severity: "medium",
      title: `Low stock: ${item.name}`,
      detail: `${item.stock ?? 0} on hand (min ${item.minStock ?? 0})`,
      href: `/inventory/materials`,
      kind: "stock",
    });
  }

  for (const b of input.blockages ?? []) {
    if (b.status === "resolved") continue;
    const startStr = b.startDate ?? b.createdAt;
    const start = startStr ? parseISO(startStr.includes("T") ? startStr : `${startStr.slice(0, 10)}T12:00:00`) : null;
    if (!start || !isValid(start)) continue;
    const daysOpen = differenceInCalendarDays(today, start);
    const proj = input.projects.find((p) => p.id === b.projectId);
    if (daysOpen > 14) {
      out.push({
        id: `blk-${b.id}`,
        severity: "high",
        title: `Blockage open ${daysOpen}+ days`,
        detail: `${proj?.name ?? b.projectId}: ${b.reason ?? b.title ?? ""}`,
        href: `/projects/${b.projectId}`,
        kind: "blockage_stale",
      });
    } else if (daysOpen >= 1 && daysOpen <= 14) {
      out.push({
        id: `blk-young-${b.id}`,
        severity: "medium",
        title: `Open blockage (${daysOpen}d)`,
        detail: `${proj?.name ?? b.projectId}: ${b.reason ?? b.title ?? ""}`,
        href: `/projects/${b.projectId}`,
        kind: "blockage",
      });
    }
  }

  for (const q of input.quotations) {
    if (q.status !== "sent") continue;
    const sent = q.sentAt ?? q.createdAt;
    const d = sent ? parseISO(sent) : null;
    if (d && isValid(d) && differenceInCalendarDays(today, d) > 7) {
      out.push({
        id: `quo-${q.id}`,
        severity: "low",
        title: `Quotation awaiting response`,
        detail: `${q.clientName} — ${q.quotationNumber ?? q.id}`,
        href: `/quotations?quotation=${q.id}`,
        kind: "quotation",
      });
    }
  }

  for (const bill of input.vendorBills) {
    if (bill.status === "paid" || bill.status === "draft") continue;
    const balance = bill.total - (bill.amountPaid ?? 0);
    if (balance <= 0.01) continue;
    const dueRaw = bill.dueDate;
    if (!dueRaw?.trim()) continue;
    const due = parseISO(dueRaw.includes("T") ? dueRaw : `${dueRaw.slice(0, 10)}T12:00:00`);
    if (!isValid(due)) continue;
    const days = differenceInCalendarDays(due, today);
    const vlabel = vendorLabel(bill, names);
    if (days < 0) {
      out.push({
        id: `vb-${bill.id}`,
        severity: "high",
        title: `Overdue vendor bill ${bill.billNumber}`,
        detail: `${vlabel} — ₹${Math.round(balance).toLocaleString("en-IN")} was due ${dueRaw.slice(0, 10)}`,
        href: `/vendors/${bill.vendorId}?action=record-payment`,
        kind: "vendor_bill",
      });
    } else if (days <= 7) {
      out.push({
        id: `vb-soon-${bill.id}`,
        severity: "medium",
        title: `Vendor bill due within 7 days — ${bill.billNumber}`,
        detail: `${vlabel} — ₹${Math.round(balance).toLocaleString("en-IN")} due ${dueRaw.slice(0, 10)}`,
        href: `/vendors/${bill.vendorId}`,
        kind: "vendor_bill",
      });
    }
  }

  for (const p of input.projects) {
    const approvals = input.projectTimelineByProjectId[p.id]?.workStatusApprovals;
    if (!approvals) continue;
    for (const [stageKey, info] of Object.entries(approvals)) {
      if (info?.status === "requested") {
        out.push({
          id: `ws-${p.id}-${stageKey}`,
          severity: "medium",
          title: `Work status approval requested`,
          detail: `${p.name} — ${stageKey}`,
          href: `/projects/${p.id}`,
          kind: "approval",
        });
      }
      const subs = info?.subItemApprovals;
      if (subs) {
        for (const [subKey, sub] of Object.entries(subs)) {
          if (sub?.status === "requested") {
            out.push({
              id: `ws-${p.id}-${stageKey}-${subKey}`,
              severity: "medium",
              title: `Work status sub-item approval`,
              detail: `${p.name} — ${stageKey} / ${subKey}`,
              href: `/projects/${p.id}`,
              kind: "approval",
            });
          }
        }
      }
    }
  }

  for (const req of input.deletionRequests ?? []) {
    if (req.status !== "pending") continue;
    const href = "/settings?tab=deletion-queue";
    out.push({
      id: `del-req-${req.id}`,
      severity: "medium",
      title: `Deletion request — ${req.entityName}`,
      detail: `${req.entityType} · ${req.reason.slice(0, 80)}${req.reason.length > 80 ? "…" : ""}`,
      href,
      kind: "deletion_request",
    });
  }

  return out;
}

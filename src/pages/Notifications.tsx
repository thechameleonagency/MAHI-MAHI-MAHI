import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Calendar,
  IndianRupee,
  Package,
  FileText,
  Bell,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useAppData } from "@/contexts/AppDataContext";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_TABLE_PAGE_SIZE, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { deriveBusinessAlertDescriptors, type BusinessAlertKind } from "@/lib/businessAlerts";

type LiveAlert = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
  icon: typeof Bell;
};

function iconForAlertKind(kind: BusinessAlertKind): typeof Bell {
  switch (kind) {
    case "invoice":
      return IndianRupee;
    case "loan":
      return Calendar;
    case "stock":
      return Package;
    case "blockage":
    case "blockage_stale":
      return AlertTriangle;
    case "quotation":
      return FileText;
    case "vendor_bill":
      return Truck;
    case "approval":
    default:
      return Bell;
  }
}

const Notifications = () => {
  const {
    invoices,
    loans,
    lowStockItems,
    blockages,
    quotations,
    projects,
    projectTimelineByProjectId,
  } = useAppData();

  const alerts = useMemo(() => {
    const out: LiveAlert[] = [];
    const today = new Date();

    invoices.forEach((inv) => {
      if (inv.status === "paid" || inv.status === "overpaid") return;
      const due = inv.dueDate ? parseISO(inv.dueDate) : null;
      if (due && isValid(due) && due < today) {
        out.push({
          id: `inv-${inv.id}`,
          severity: "high",
          title: `Overdue invoice ${inv.invoiceNumber}`,
          detail: `${inv.customerName} — ₹${(inv.total - (inv.amountReceived ?? 0)).toLocaleString("en-IN")} outstanding`,
          href: `/invoices?invoice=${inv.id}`,
          icon: IndianRupee,
        });
      }
    });

    loans.forEach((l) => {
      if (l.status !== "Active" || l.paymentType !== "emi" || !l.dueDate) return;
      const due = parseISO(l.dueDate);
      if (!isValid(due)) return;
      const days = differenceInCalendarDays(due, today);
      if (days < 0) {
        out.push({
          id: `loan-${l.id}-over`,
          severity: "high",
          title: `Overdue EMI — ${l.source}`,
          icon: Calendar,
          detail: `Due ${l.dueDate} — ₹${l.emiAmount?.toLocaleString("en-IN") ?? ""}`,
          href: `/loans`,
        });
      } else if (days <= 7) {
        out.push({
          id: `loan-${l.id}-soon`,
          severity: "medium",
          title: `EMI due within 7 days — ${l.source}`,
          icon: Calendar,
          detail: `Due ${l.dueDate} — ₹${l.emiAmount?.toLocaleString("en-IN") ?? ""}`,
          href: `/loans`,
        });
      }
    });

    (lowStockItems ?? []).forEach((item) => {
      out.push({
        id: `stock-${item.id}`,
        severity: "medium",
        title: `Low stock: ${item.name}`,
        detail: `${item.stock ?? 0} on hand (min ${item.minStock ?? 0})`,
        href: `/inventory`,
        icon: Package,
      });
    });

    blockages.forEach((b) => {
      if (b.status === "resolved") return;
      const start = b.startDate ? parseISO(b.startDate) : null;
      const daysOpen = start && isValid(start) ? differenceInCalendarDays(today, start) : 0;
      if (daysOpen > 14) {
        const proj = projects.find((p) => p.id === b.projectId);
        out.push({
          id: `blk-${b.id}`,
          severity: "high",
          title: `Blockage open ${daysOpen}+ days`,
          detail: `${proj?.name ?? b.projectId}: ${b.reason ?? b.description ?? ""}`,
          href: `/projects/${b.projectId}`,
          icon: AlertTriangle,
        });
      }
    });

    quotations.forEach((q) => {
      if (q.status !== "sent") return;
      const sent = q.sentAt ?? q.createdAt;
      const d = sent ? parseISO(sent) : null;
      if (d && isValid(d) && differenceInCalendarDays(today, d) > 7) {
        out.push({
          id: `quo-${q.id}`,
          severity: "low",
          title: `Quotation awaiting response`,
          detail: `${q.clientName} — ${q.quotationNumber ?? q.id}`,
          href: `/quotations?quotation=${q.id}`,
          icon: FileText,
        });
      }
    });

    projects.forEach((p) => {
      const tl = projectTimelineByProjectId[p.id];
      const approvals = tl?.workStatusApprovals;
      if (!approvals) return;
      Object.entries(approvals).forEach(([stageKey, info]) => {
        if (info?.status === "requested") {
          out.push({
            id: `ws-${p.id}-${stageKey}`,
            severity: "medium",
            title: `Work status approval requested`,
            detail: `${p.name} — ${stageKey}`,
            href: `/projects/${p.id}`,
            icon: Bell,
          });
        }
        const subs = info?.subItemApprovals;
        if (subs) {
          Object.entries(subs).forEach(([subKey, sub]) => {
            if (sub?.status === "requested") {
              out.push({
                id: `ws-${p.id}-${stageKey}-${subKey}`,
                severity: "medium",
                title: `Work status sub-item approval`,
                detail: `${p.name} — ${stageKey} / ${subKey}`,
                href: `/projects/${p.id}`,
                icon: Bell,
              });
            }
          });
        }
      });
    });

    return out;
  }, [invoices, loans, lowStockItems, blockages, quotations, projects, projectTimelineByProjectId]);

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [visible.length]);

  const { pagedItems: pagedAlerts, safePage } = usePagedSlice(visible, page, pageSize);

  return (
    <PageShell>
      <div className="space-y-6">
        <StickyPageHeader breadcrumbs={[{ label: "Home", to: "/" }, { label: "Notifications" }]} />
        <InlineKpiStrip
          items={[
            { label: "Open alerts", value: String(visible.length) },
            { label: "High priority", value: String(visible.filter((a) => a.severity === "high").length) },
          ]}
        />
        <Card>
          <CardContent className="pt-6">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Bell className="w-10 h-10 opacity-30" />
                <p className="text-sm">No alerts right now. Invoices, EMIs, stock, and project signals will appear here.</p>
              </div>
            ) : (
              <DataTableShell
                variant="inline"
                maxHeight={listTableViewportMaxHeight(pageSize)}
                scrollResetKey={`${safePage}-${pageSize}-${visible.length}`}
                footer={
                  <TablePaginationBar
                    page={safePage}
                    pageSize={pageSize}
                    total={visible.length}
                    onPageChange={setPage}
                    onPageSizeChange={(n) => {
                      setPageSize(n);
                      setPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Alert</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedAlerts.map((a) => {
                    const Icon = a.icon;
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="rounded-md bg-muted p-2 w-fit">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{a.title}</span>
                            <Badge variant="outline" className="text-2xs capitalize">
                              {a.severity}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md">{a.detail}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={a.href}>Open</Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDismissed((s) => new Set(s).add(a.id))}>
                            Dismiss
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTableShell>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Derived from invoices, loans, inventory, blockages, quotations, and work-status approvals. Dismissals are session-only.
        </p>
      </div>
    </PageShell>
  );
};

export default Notifications;

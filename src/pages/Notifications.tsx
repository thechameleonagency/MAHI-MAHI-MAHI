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
import { ListEmptyState } from "@/components/ui/ListEmptyState";

type _LiveAlert = {
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
    vendorBills,
    vendors,
  } = useAppData();

  const vendorNamesById = useMemo(
    () => new Map(vendors.map((v) => [String(v.id), v.name] as const)),
    [vendors],
  );

  const alerts = useMemo(() => {
    const rows = deriveBusinessAlertDescriptors({
      invoices,
      loans,
      lowStockItems: lowStockItems ?? [],
      blockages,
      quotations,
      projects,
      projectTimelineByProjectId,
      vendorBills,
      vendorNamesById,
    });
    return rows.map((r) => ({
      id: r.id,
      severity: r.severity,
      title: r.title,
      detail: r.detail,
      href: r.href,
      icon: iconForAlertKind(r.kind),
    }));
  }, [
    invoices,
    loans,
    lowStockItems,
    blockages,
    quotations,
    projects,
    projectTimelineByProjectId,
    vendorBills,
    vendorNamesById,
  ]);

  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  useEffect(() => {
    setPage(1);
  }, [visible.length]);

  const { pagedItems: pagedAlerts, safePage } = usePagedSlice(visible, page, pageSize);

  const dismissAll = () => {
    setDismissed(new Set(alerts.map((a) => a.id)));
  };
  const restoreAll = () => {
    setDismissed(new Set());
  };

  return (
    <PageShell>
      <div className="space-y-6">
        <StickyPageHeader
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Notifications" }]}
          subRow={
            <InlineKpiStrip
              singleRow
              className="min-w-0 flex-1"
              items={[
                { label: "Open alerts", value: String(visible.length) },
                { label: "High priority", value: String(visible.filter((a) => a.severity === "high").length) },
              ]}
            />
          }
        >
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={dismissAll}
            disabled={visible.length === 0}
          >
            Mark all read
          </Button>
          {dismissed.size > 0 ? (
            <Button variant="ghost" size="sm" type="button" onClick={restoreAll}>
              Restore dismissed ({dismissed.size})
            </Button>
          ) : null}
        </StickyPageHeader>
        <Card>
          <CardContent className="pt-6">
            {visible.length === 0 ? (
              <ListEmptyState
                icon={Bell}
                title="No alerts right now"
                description="Invoices, EMIs, stock, and project signals will appear here when action is needed."
              />
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
          Derived from invoices, loans, inventory, blockages, vendor bills, quotations, and work-status approvals. Dismissals are session-only.
        </p>
      </div>
    </PageShell>
  );
};

export default Notifications;

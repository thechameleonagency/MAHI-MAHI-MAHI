import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollText, Plus, Pencil, Trash2, Download } from "lucide-react";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { downloadCSV } from "@/lib/csvExport";
import { toast } from "@/hooks/use-toast";

const AuditLogs = () => {
  const {
    auditLogs,
    projects,
    employees,
    customers,
    partners,
    agents,
    vendors,
    enquiries,
    quotations,
    invoices,
    saleBills,
    expenses,
    materialReservations,
    scheduledInstallations,
    siteVisits,
    materialDamageRecords,
  } = useAppData();
  const navigate = useNavigate();
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filterEntity !== "all" && log.entityType !== filterEntity) return false;
      if (filterAction !== "all" && log.action !== filterAction) return false;
      return true;
    });
  }, [auditLogs, filterEntity, filterAction]);

  useEffect(() => {
    setPage(1);
  }, [filterEntity, filterAction]);

  const { pagedItems: pagedLogs, safePage } = usePagedSlice(filteredLogs, page, pageSize);

  const entityTypes = useMemo(() => {
    const types = new Set(auditLogs.map(l => l.entityType));
    return Array.from(types);
  }, [auditLogs]);

  const entityExists = (entityType: string, entityId: string): boolean => {
    const t = entityType.toLowerCase();
    switch (t) {
      case "project":
      case "projectchangerequest":
        return projects.some((p) => p.id === entityId);
      case "employee":
        return employees.some((e) => e.id === entityId);
      case "customer":
        return customers.some((c) => c.id === entityId);
      case "partner":
        return partners.some((p) => p.id === entityId);
      case "agent":
        return agents.some((a) => a.id === entityId);
      case "vendor":
        return vendors.some((v) => String(v.id) === String(entityId));
      case "enquiry":
        return enquiries.some((e) => e.id === entityId);
      case "quotation":
        return quotations.some((q) => q.id === entityId);
      case "invoice":
        return [...invoices, ...saleBills].some((i) => i.id === entityId);
      case "expense":
        return expenses.some((e) => e.id === entityId);
      case "materialreservation":
        return materialReservations.some((r) => r.id === entityId);
      case "scheduledinstallation":
        return scheduledInstallations.some((s) => s.id === entityId);
      case "sitevisit":
        return (
          siteVisits.some((v) => v.id === entityId) ||
          projects.some((p) => p.id === entityId)
        );
      case "materialdamage":
        return materialDamageRecords.some((d) => d.id === entityId);
      default:
        return true;
    }
  };

  const navigateToEntity = (entityType: string, entityId: string) => {
    if (!entityId) return;
    const routes: Record<string, string> = {
      project: `/projects/${entityId}`,
      employee: `/employees/${entityId}`,
      customer: `/customers/${entityId}`,
      partner: `/partners/${entityId}`,
      agent: `/agents/${entityId}`,
      vendor: `/vendors/${entityId}`,
      enquiry: `/enquiries?open=${entityId}`,
      quotation: `/quotations?quotation=${entityId}`,
      invoice: `/invoices?invoice=${entityId}`,
      expense: `/finance`,
      materialreservation: `/inventory/materials`,
      scheduledinstallation: `/calendar`,
      sitevisit: `/projects/${entityId}`,
      projectchangerequest: `/projects/${entityId}`,
      materialdamage: `/inventory/materials`,
    };
    const route = routes[entityType.toLowerCase()];
    if (!route) return;
    if (!entityExists(entityType, entityId)) {
      toast({
        title: "Entity no longer exists",
        description: "This record may have been deleted.",
        variant: "destructive",
      });
      return;
    }
    navigate(route);
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case "create": return <Plus className="w-3 h-3 text-primary" />;
      case "update": return <Pencil className="w-3 h-3 text-warning" />;
      case "delete": return <Trash2 className="w-3 h-3 text-destructive" />;
      default: return null;
    }
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Logs" },
        ]}
        subRow={
          <>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InlineKpiStrip
              className="w-full min-w-0 sm:w-auto sm:justify-end"
              items={[
                { label: "In system", value: auditLogs.length },
                { label: "Shown", value: filteredLogs.length },
                { label: "Entity types", value: entityTypes.length },
              ]}
            />
          </>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="w-4 h-4" />
              Change History ({filteredLogs.length} entries)
            </CardTitle>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
              downloadCSV(`AuditLogs_${filterEntity}_${filterAction}.csv`, filteredLogs.map(l => ({
                "Timestamp": l.timestamp, "User": l.userName, "Action": l.action,
                "Entity Type": l.entityType, "Entity": l.entityName,
                "Change": [l.field, l.oldValue, l.newValue].filter(Boolean).join(" | "),
              })), ["Timestamp", "User", "Action", "Entity Type", "Entity", "Change"]);
            }}>
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTableShell
            variant="inline"
            maxHeight={listTableViewportMaxHeight(pageSize)}
            scrollResetKey={`${safePage}-${pageSize}-${filteredLogs.length}`}
            footer={
              <TablePaginationBar
                page={safePage}
                pageSize={pageSize}
                total={filteredLogs.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="min-w-[220px]">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 && (
                <TableEmptyRow
                  colSpan={6}
                  icon={ScrollText}
                  title="No audit logs yet"
                  description="Changes to financial data will appear here."
                />
              )}
              {pagedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell >{log.userName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {actionIcon(log.action)}
                      <Badge
                        variant={
                          log.action === "create" ? "default" : log.action === "delete" ? "destructive" : "secondary"
                        }
                        className="text-xs"
                      >
                        {log.action}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell >{log.entityType}</TableCell>
                  <TableCell
                    className="cursor-pointer text-primary hover:underline"
                    onClick={() => navigateToEntity(log.entityType, log.entityId)}
                  >{log.entityName}</TableCell>
                  <TableCell className="max-w-md text-xs leading-snug">
                    {log.field ? (
                      <div className="space-y-1">
                        <span className="font-medium text-foreground">{log.field}</span>
                        <div className="text-muted-foreground">
                          {log.oldValue ? (
                            <span className="text-destructive/90 line-through decoration-destructive/50">{log.oldValue}</span>
                          ) : (
                            <span className="italic">(empty)</span>
                          )}
                          {log.newValue != null && log.newValue !== "" ? (
                            <>
                              <span className="mx-1.5 text-muted-foreground">→</span>
                              <span className="font-medium text-foreground">{log.newValue}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default AuditLogs;

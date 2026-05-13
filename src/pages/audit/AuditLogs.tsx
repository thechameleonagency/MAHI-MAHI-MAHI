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
import { ScrollText, Plus, Pencil, Trash2 } from "lucide-react";

const AuditLogs = () => {
  const { auditLogs } = useAppData();
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

  const actionIcon = (action: string) => {
    switch (action) {
      case "create": return <Plus className="w-3 h-3 text-primary" />;
      case "update": return <Pencil className="w-3 h-3 text-orange-500" />;
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
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Change History ({filteredLogs.length} entries)
          </CardTitle>
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
                <TableHead>Field</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScrollText className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No audit logs recorded yet</p>
                      <p className="text-xs text-muted-foreground">Changes to financial data will appear here</p>
                    </div>
                  </TableCell>
                </TableRow>
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
                  <TableCell className="cursor-pointer text-primary hover:underline">{log.entityName}</TableCell>
                  <TableCell className="text-muted-foreground">{log.field || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{log.oldValue || "-"}</TableCell>
                  <TableCell >{log.newValue || "-"}</TableCell>
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

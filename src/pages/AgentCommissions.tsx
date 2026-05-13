import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/formatCurrency";

const AgentCommissions = () => {
  const { agentCommissionPayments, agents } = useAppData();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const rows = useMemo(() => {
    const hay = q.trim().toLowerCase();
    const sorted = [...agentCommissionPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (!hay) return sorted;
    return sorted.filter((p) => {
      const agent = agents.find((a) => a.id === p.agentId);
      return (
        p.projectName?.toLowerCase().includes(hay) ||
        agent?.name.toLowerCase().includes(hay) ||
        p.notes?.toLowerCase().includes(hay)
      );
    });
  }, [agentCommissionPayments, agents, q]);

  const { pagedItems, safePage } = usePagedSlice(rows, page, pageSize);
  const total = rows.reduce((s, p) => s + p.amount, 0);

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Agents", to: "/agents" },
          { label: "Commission payments" },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "Payments", value: agentCommissionPayments.length },
              { label: "Total paid", value: formatINR(total) },
            ]}
          />
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search agent, project, notes…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <DataTableShell
        maxHeight={listTableViewportMaxHeight(pageSize)}
        scrollResetKey={`${safePage}-${pageSize}-${rows.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={pageSize}
            total={rows.length}
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
            <TableHead>Date</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-muted-foreground text-sm">
                No commission payments recorded yet. Pay commission from an agent&apos;s detail page.
              </TableCell>
            </TableRow>
          ) : (
            pagedItems.map((p) => {
              const agent = agents.find((a) => a.id === p.agentId);
              return (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap text-sm">{p.date}</TableCell>
                  <TableCell>
                    <Link to={`/agents/${p.agentId}`} className="font-medium text-primary hover:underline">
                      {agent?.name ?? p.agentId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.projectName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-2xs capitalize">
                      {p.mode?.replace(/_/g, " ") ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatINR(p.amount)}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </DataTableShell>
    </PageShell>
  );
};

export default AgentCommissions;

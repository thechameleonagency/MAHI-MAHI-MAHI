import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types/finance";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";

function CategoryExpenseLinesTable({
  entries,
  fmt,
  onProjectClick,
}: {
  entries: Expense[];
  fmt: (v: number) => string;
  onProjectClick: (projectId: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: paged, safePage } = usePagedSlice(entries, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [entries.length]);

  return (
    <DataTableShell
      maxHeight={listTableViewportMaxHeight(pageSize)}
      scrollResetKey={`${safePage}-${pageSize}-${entries.length}`}
      footer={
        <TablePaginationBar
          page={safePage}
          pageSize={pageSize}
          total={entries.length}
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
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Paid By</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paged.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-sm">{e.date}</TableCell>
            <TableCell className="text-right text-sm font-medium">{fmt(e.amount)}</TableCell>
            <TableCell
              className="cursor-pointer text-sm text-primary hover:underline"
              onClick={() => e.projectId && onProjectClick(e.projectId)}
            >
              {e.projectName || "-"}
            </TableCell>
            <TableCell className="text-sm">{e.paidBy?.entityName || e.paidBy?.type || "-"}</TableCell>
            <TableCell className="text-sm">{e.paymentMode || "-"}</TableCell>
            <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{e.notes || e.description || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTableShell>
  );
}

const MAIN_CATEGORIES = [
  { key: "company", label: "Company", color: "bg-blue-500" },
  { key: "employee", label: "Employee", color: "bg-blue-500" },
  { key: "office", label: "Office", color: "bg-purple-500" },
  { key: "site", label: "Site/Project", color: "bg-orange-500" },
  { key: "owner", label: "Owner (MK)", color: "bg-red-500" },
  { key: "partner", label: "Partner", color: "bg-yellow-500" },
];

const ExpenseAudit = () => {
  const { expenses } = useAppData();
  const navigate = useNavigate();
  const [selectedMain, setSelectedMain] = useState("all");

  const filteredExpenses = useMemo(() => {
    if (selectedMain === "all") return expenses;
    return expenses.filter(e => e.mainCategory === selectedMain);
  }, [expenses, selectedMain]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const siteTotal = expenses.filter(e => e.mainCategory === "site").reduce((s, e) => s + e.amount, 0);
    const pendingReimbursements = expenses.filter(e => e.reimbursement?.enabled && e.reimbursement.status === "pending").length;
    
    // Highest category
    const catMap = new Map<string, number>();
    filteredExpenses.forEach(e => {
      catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
    });
    let highestCat = "-";
    let highestAmount = 0;
    catMap.forEach((v, k) => { if (v > highestAmount) { highestAmount = v; highestCat = k; } });

    return { total, siteTotal, pendingReimbursements, highestCat, highestAmount };
  }, [filteredExpenses, expenses]);

  // Category breakdown for chart
  const chartData = useMemo(() => {
    return MAIN_CATEGORIES.map(mc => ({
      category: mc.label,
      amount: expenses.filter(e => e.mainCategory === mc.key).reduce((s, e) => s + e.amount, 0),
    })).filter(d => d.amount > 0);
  }, [expenses]);

  // Group by mainCategory then by category
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, typeof expenses>> = {};
    filteredExpenses.forEach(e => {
      const main = e.mainCategory || "other";
      const cat = e.category || "uncategorized";
      if (!groups[main]) groups[main] = {};
      if (!groups[main][cat]) groups[main][cat] = [];
      groups[main][cat].push(e);
    });
    return groups;
  }, [filteredExpenses]);

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Expenses" },
        ]}
        subRow={
          <>
            <Select value={selectedMain} onValueChange={setSelectedMain}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {MAIN_CATEGORIES.map((mc) => (
                  <SelectItem key={mc.key} value={mc.key}>
                    {mc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Total", value: fmt(stats.total) },
                { label: "Top category", value: stats.highestCat },
                { label: "Pending reimb.", value: stats.pendingReimbursements },
                { label: "Site", value: fmt(stats.siteTotal) },
              ]}
            />
          </>
        }
      />

      {/* Category Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense by Main Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} className="text-xs" />
              <YAxis type="category" dataKey="category" className="text-xs" width={100} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Drill-down */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([mainCat, categories]) => {
          const mcInfo = MAIN_CATEGORIES.find(m => m.key === mainCat);
          const mainTotal = Object.values(categories).flat().reduce((s, e) => s + e.amount, 0);
          
          return (
            <Collapsible key={mainCat} defaultOpen={selectedMain !== "all"}>
              <CollapsibleTrigger className="w-full">
                <Card className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", mcInfo?.color || "bg-muted")} />
                      <ChevronDown className="w-4 h-4" />
                      <span className="font-semibold text-sm">{mcInfo?.label || mainCat}</span>
                      <Badge variant="outline" className="text-xs">{Object.keys(categories).length} categories</Badge>
                    </div>
                    <span className="font-bold text-sm">{fmt(mainTotal)}</span>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 ml-4 space-y-2">
                {Object.entries(categories).map(([cat, exps]) => {
                  const catTotal = exps.reduce((s, e) => s + e.amount, 0);
                  return (
                    <Card key={cat}>
                      <CardHeader className="py-2 px-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{cat}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{exps.length} entries</Badge>
                            <span className="text-sm font-bold">{fmt(catTotal)}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 pt-2">
                        <CategoryExpenseLinesTable
                          entries={exps}
                          fmt={fmt}
                          onProjectClick={(pid) => navigate(`/projects/${pid}`)}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </PageShell>
  );
};

export default ExpenseAudit;

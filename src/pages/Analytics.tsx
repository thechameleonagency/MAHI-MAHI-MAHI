import { useState, useRef, useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BarChart3, Download } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useAppData } from "@/contexts/AppDataContext";
import { downloadCSV } from "@/lib/csvExport";
import { formatINR, formatINRCompact } from "@/lib/formatCurrency";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import {
  computePipelineMetrics,
  computeOperationsMetrics,
  computeFinanceMetrics,
  computeInventoryMetrics,
  computeCustomerMetrics,
  computePeopleMetrics,
  type AnalyticsDateRange,
  type MetricRow,
} from "@/lib/analytics";

function MetricGrid({ rows }: { rows: MetricRow[] }) {
  if (rows.length === 0) {
    return (
      <ListEmptyState
        icon={BarChart3}
        title="No metrics for this range"
        description="Widen the date filter or load sample data from Settings."
        className="py-10"
      />
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {rows.map((r) => (
        <div key={r.label} className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{r.label}</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function AnalyticsSection({
  title,
  rows,
  onExport,
  children,
}: {
  title: string;
  rows: MetricRow[];
  onExport: () => void;
  children?: ReactNode;
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <Button variant="outline" size="sm" className="h-8" onClick={onExport}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricGrid rows={rows} />
        {children}
      </CardContent>
    </Card>
  );
}

const Analytics = () => {
  const {
    projects,
    employees,
    invoices,
    saleBills,
    payments,
    expenses,
    inventoryItems,
    tasks,
    enquiries,
    quotations,
    customers,
    agents,
    materialDamageRecords,
    scheduledInstallations,
    materialReservations,
    vendorBills,
    loans,
    blockages,
    attendanceRecords,
    employeePayrollRecords,
    employeeWalletLedger,
  } = useAppData();
  
  const _exportRef = useRef<HTMLDivElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [analyticsDateRange, setAnalyticsDateRange] = useState<AnalyticsDateRange>("year");

  const analyticsSlices = useMemo(
    () => ({
      enquiries,
      quotations,
      projects,
      customers,
      invoices,
      payments,
      expenses,
      inventoryItems,
      tasks,
      agents,
      materialDamageRecords,
      scheduledInstallations,
      materialReservations,
      vendorBills,
      loans,
      employees,
      attendanceRecords,
      payrollRecords: employeePayrollRecords,
      walletLedger: employeeWalletLedger,
      blockages,
    }),
    [
      enquiries,
      quotations,
      projects,
      customers,
      invoices,
      payments,
      expenses,
      inventoryItems,
      tasks,
      agents,
      materialDamageRecords,
      scheduledInstallations,
      materialReservations,
      vendorBills,
      loans,
      employees,
      attendanceRecords,
      employeePayrollRecords,
      employeeWalletLedger,
      blockages,
    ],
  );

  const pipelineMetrics = useMemo(
    () => computePipelineMetrics(analyticsSlices, analyticsDateRange),
    [analyticsSlices, analyticsDateRange],
  );
  const operationsMetrics = useMemo(
    () => computeOperationsMetrics(analyticsSlices, analyticsDateRange),
    [analyticsSlices, analyticsDateRange],
  );
  const financeMetrics = useMemo(
    () => computeFinanceMetrics(analyticsSlices, analyticsDateRange),
    [analyticsSlices, analyticsDateRange],
  );
  const inventoryMetrics = useMemo(() => computeInventoryMetrics(analyticsSlices), [analyticsSlices]);
  const customerMetrics = useMemo(() => computeCustomerMetrics(analyticsSlices), [analyticsSlices]);
  const peopleMetrics = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    if (analyticsDateRange === "month") from.setMonth(now.getMonth() - 1);
    else if (analyticsDateRange === "quarter") from.setMonth(now.getMonth() - 3);
    else if (analyticsDateRange === "year") from.setFullYear(now.getFullYear() - 1);
    else from.setFullYear(now.getFullYear() - 10);
    return computePeopleMetrics(analyticsSlices, from, now);
  }, [analyticsSlices, analyticsDateRange]);

  const exportMetricRows = (filename: string, rows: MetricRow[]) => {
    downloadCSV(
      filename,
      rows.map((r) => ({ metric: r.label, value: r.value })),
      ["metric", "value"],
    );
    toast({ title: "Exported", description: filename });
  };
  
  // Export modal state
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpense, setIncludeExpense] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  
  // Derive project type data from context
  const projectTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {
      Residential: 0,
      Commercial: 0,
      Industrial: 0,
      Other: 0,
    };
    projects.forEach((p) => {
      const t = p.projectType;
      if (t === "Residential" || t === "Commercial" || t === "Industrial") {
        typeCounts[t]++;
      } else {
        typeCounts.Other++;
      }
    });
    const total = projects.length;
    if (total === 0) return [];
    const palette = [
      "hsl(var(--primary))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
    ];
    return (["Residential", "Commercial", "Industrial", "Other"] as const)
      .map((name, i) => ({
        name,
        value: Math.round((typeCounts[name] / total) * 100),
        color: palette[i],
      }))
      .filter((d) => d.value > 0);
  }, [projects]);
  
  // Derive employee performance from context
  const employeePerformance = useMemo(() => {
    return employees.slice(0, 5).map((emp, _idx) => {
      const empTasks = tasks.filter(t => t.employeeId === emp.id);
      const completed = empTasks.filter(t => t.status === "done").length;
      const total = empTasks.length;
      const done = completed;
      return {
        id: emp.id,
        name: emp.initial || emp.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() || emp.name.slice(0, 4),
        tasks: total,
        completed: done,
        efficiency: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [employees, tasks]);
  
  // Derive projects list from context
  const projectsList = useMemo(() => {
    return projects.slice(0, 10).map(p => ({ id: p.id, name: p.name }));
  }, [projects]);
  
  // Compute KPIs from context, filtered by selected date range
  const kpiValues = useMemo(() => {
    const now = new Date();
    const filterByRange = (dateStr: string | undefined) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (analyticsDateRange === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (analyticsDateRange === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        return d.getFullYear() === now.getFullYear() && Math.floor(d.getMonth() / 3) === q;
      }
      if (analyticsDateRange === "year") return d.getFullYear() === now.getFullYear();
      return true;
    };

    const filteredInvoices = invoices.filter(i => filterByRange(i.invoiceDate));
    const filteredSaleBills = (saleBills || []).filter(b => filterByRange(b.invoiceDate));
    const filteredPayments = payments.filter(p => filterByRange(p.date));

    const totalRevenue = filteredPayments
      .filter((p) => p.direction === "in")
      .reduce((s, p) => s + p.amount, 0);
    const activeProjects = projects.filter(p => p.status === "Ongoing").length;
    const totalEmployees = employees.length;
    const stockValue = inventoryItems.reduce((sum, item) => sum + ((item.stock || 0) * (item.salePrice || 0)), 0);

    return {
      revenue: totalRevenue || 0,
      activeProjects: activeProjects || 0,
      employees: totalEmployees || 0,
      stockValue: stockValue || 0,
    };
  }, [invoices, saleBills, payments, projects, employees, inventoryItems, analyticsDateRange]);
  
  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleExportRevenue = () => {
    const rows: Record<string, unknown>[] = [];
    if (includeIncome) {
      [...invoices, ...saleBills].forEach((inv) => {
        rows.push({
          kind: "invoice",
          id: inv.id,
          customer: inv.customerName,
          total: inv.total,
          received: inv.amountReceived,
          status: inv.status,
        });
      });
      payments.forEach((p) => {
        rows.push({
          kind: "payment",
          id: p.id,
          customer: p.counterpartyName ?? "",
          total: p.amount,
          received: p.direction === "in" ? p.amount : 0,
          status: p.direction,
        });
      });
    }
    if (includeExpense) {
      expenses.forEach((e) => {
        rows.push({
          kind: "expense",
          id: e.id,
          customer: e.description ?? e.category,
          total: e.amount,
          received: 0,
          status: e.mainCategory ?? "",
        });
      });
    }
    if (rows.length === 0) {
      toast({ title: "Nothing to export", description: "Enable income and/or expense.", variant: "destructive" });
      return;
    }
    downloadCSV("analytics_revenue_mix.csv", rows, ["kind", "id", "customer", "total", "received", "status"]);
    toast({ title: "Exported", description: `${rows.length} rows.` });
  };

  const handleExportProjects = () => {
    const rows = projects
      .filter((p) => selectedProjects.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        type: p.projectType,
        customerId: p.customerId ?? "",
      }));
    if (rows.length === 0) {
      toast({ title: "Select projects", variant: "destructive" });
      return;
    }
    downloadCSV("analytics_projects.csv", rows, ["id", "name", "status", "type", "customerId"]);
    toast({ title: "Exported", description: `${rows.length} projects.` });
  };

  const handleExportEmployee = () => {
    const emp = employees.find((e) => String(e.id) === selectedEmployee);
    if (!emp) {
      toast({ title: "Select an employee", variant: "destructive" });
      return;
    }
    const empTasks = tasks.filter((t) => t.employeeId === emp.id);
    downloadCSV(
      `analytics_employee_${emp.id}.csv`,
      empTasks.map((t) => ({
        taskId: t.id,
        projectId: t.projectId,
        site: t.siteName,
        status: t.status,
        workDate: t.workDate,
      })),
      ["taskId", "projectId", "site", "status", "workDate"],
    );
    toast({ title: "Exported", description: `${empTasks.length} tasks for ${emp.name}.` });
  };

  const handleExportInventory = () => {
    downloadCSV(
      "analytics_inventory.csv",
      inventoryItems.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        stock: i.stock,
        buyPrice: i.buyPrice,
        salePrice: i.salePrice,
      })),
      ["id", "name", "category", "stock", "buyPrice", "salePrice"],
    );
    toast({ title: "Exported", description: `${inventoryItems.length} items.` });
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Analytics" }]}
        subRow={
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 overflow-x-auto">
            <Select value={analyticsDateRange} onValueChange={setAnalyticsDateRange}>
              <SelectTrigger className="h-9 w-[130px] shrink-0 border-border bg-muted/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              singleRow
              className="min-w-0 flex-1"
              items={[
                { label: "Revenue", value: formatINRCompact(kpiValues.revenue) },
                { label: "Active jobs", value: kpiValues.activeProjects },
                { label: "Team", value: kpiValues.employees },
                { label: "Stock", value: formatINRCompact(kpiValues.stockValue) },
              ]}
            />
          </div>
        }
      >
        <Button variant="outline" size="sm" className="h-8" onClick={() => setIsExportModalOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </StickyPageHeader>

      {/* Project Distribution & Top Performers */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Project Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={projectTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {projectTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeePerformance.slice(0, 5).map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.completed}/{emp.tasks} tasks</p>
                  </div>
                </div>
                <Badge variant="outline" className={emp.efficiency >= 90 ? "bg-primary/10 text-primary border-primary/20" : "bg-warning/10 text-warning border-warning/20"}>
                  {emp.efficiency}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <AnalyticsSection
          title="Pipeline & conversion"
          rows={pipelineMetrics.summaryRows}
          onExport={() => exportMetricRows("analytics_pipeline.csv", pipelineMetrics.summaryRows)}
        >
          {pipelineMetrics.agentLeaderboard.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Agent referral leaderboard</p>
              <div className="flex flex-wrap gap-2">
                {pipelineMetrics.agentLeaderboard.map((a) => (
                  <Badge key={a.agentId} variant="outline">
                    {a.name}: {a.referrals} ref / {a.won} won ({a.conversionPct}%)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </AnalyticsSection>

        <AnalyticsSection
          title="Operations"
          rows={operationsMetrics.summaryRows}
          onExport={() => exportMetricRows("analytics_operations.csv", operationsMetrics.summaryRows)}
        />

        <AnalyticsSection
          title="Finance"
          rows={financeMetrics.summaryRows}
          onExport={() => exportMetricRows("analytics_finance.csv", financeMetrics.summaryRows)}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Debtor bucket</th>
                  <th className="py-2 pr-4">Invoices</th>
                  <th className="py-2 text-right">Open ₹</th>
                </tr>
              </thead>
              <tbody>
                {financeMetrics.debtorBuckets.map((b) => (
                  <tr key={b.bucket} className="border-b border-border/50">
                    <td className="py-2 pr-4">{b.bucket} days</td>
                    <td className="py-2 pr-4">{b.count}</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnalyticsSection
            title="Inventory"
            rows={inventoryMetrics.summaryRows}
            onExport={() => exportMetricRows("analytics_inventory_metrics.csv", inventoryMetrics.summaryRows)}
          />
          <AnalyticsSection
            title="Customers"
            rows={customerMetrics.summaryRows}
            onExport={() => exportMetricRows("analytics_customers.csv", customerMetrics.summaryRows)}
          />
        </div>

        <AnalyticsSection
          title="People"
          rows={peopleMetrics.summaryRows}
          onExport={() => exportMetricRows("analytics_people.csv", peopleMetrics.summaryRows)}
        >
          {peopleMetrics.blockagesByReason.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Blockage causes
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {peopleMetrics.blockagesByReason.map((row) => (
                  <div key={row.reason} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">{row.reason}</span>
                    <span className="tabular-nums font-medium">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {peopleMetrics.tasksByEmployee.filter((t) => t.done + t.open > 0).length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tasks per person (range)
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {peopleMetrics.tasksByEmployee
                  .filter((t) => t.done + t.open > 0)
                  .slice(0, 12)
                  .map((row) => (
                    <div key={row.employeeId} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{row.name}</span>
                      <span className="tabular-nums font-medium">
                        {row.done}<span className="text-muted-foreground">/{row.done + row.open}</span>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </AnalyticsSection>
      </div>

      {/* Export Modal */}
      <Sheet open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Export Report</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {/* Revenue Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Revenue Report</CardTitle>
                  <Button size="sm" onClick={handleExportRevenue} disabled={!includeIncome && !includeExpense}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-income" 
                      checked={includeIncome} 
                      onCheckedChange={(c) => setIncludeIncome(c as boolean)} 
                    />
                    <Label htmlFor="include-income" className="text-sm cursor-pointer">Income</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-expense" 
                      checked={includeExpense} 
                      onCheckedChange={(c) => setIncludeExpense(c as boolean)} 
                    />
                    <Label htmlFor="include-expense" className="text-sm cursor-pointer">Expense</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects Details */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Projects Details</CardTitle>
                  <Button size="sm" onClick={handleExportProjects} disabled={selectedProjects.length === 0}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground mb-2 block">Select projects (multi-select):</Label>
                <div className="flex flex-wrap gap-2">
                  {projectsList.map(p => (
                    <Badge 
                      key={p.id} 
                      variant={selectedProjects.includes(p.id) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleProject(p.id)}
                    >
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Details */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Employee Details</CardTitle>
                  <Button size="sm" onClick={handleExportEmployee} disabled={!selectedEmployee}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Inventory Items */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                  <Button size="sm" onClick={handleExportInventory}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Export all inventory items with current stock levels</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Analytics;

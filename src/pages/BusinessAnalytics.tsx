import { useMemo, useState } from "react";
import { startOfMonth, startOfQuarter, startOfYear, subDays, subMonths } from "date-fns";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import {
  computeCustomerMetrics,
  computeFinanceMetrics,
  computeInventoryMetrics,
  computeOperationsMetrics,
  computePeopleMetrics,
  type AnalyticsDateRange,
} from "@/lib/analytics";
import {
  computeEnquiryAnalytics,
  computeGeoAnalytics,
  computeInventoryRateAnalytics,
  computeLoanAnalytics,
  computePayrollAnalytics,
  computeProfitAnalytics,
  type BusinessGranularity,
  type BusinessWindow,
} from "@/lib/analytics/business";
import { OverviewTab } from "@/components/business-analytics/OverviewTab";
import { EnquiriesTab } from "@/components/business-analytics/EnquiriesTab";
import { ProjectsGeoTab } from "@/components/business-analytics/ProjectsGeoTab";
import { TasksTab } from "@/components/business-analytics/TasksTab";
import { FinanceTab } from "@/components/business-analytics/FinanceTab";
import { InvoicesGstTab } from "@/components/business-analytics/InvoicesGstTab";
import { InventoryTab } from "@/components/business-analytics/InventoryTab";
import { ChannelsTab } from "@/components/business-analytics/ChannelsTab";
import { TeamTab } from "@/components/business-analytics/TeamTab";

type RangePreset = "7d" | "30d" | "month" | "quarter" | "year" | "12m" | "24m";

const RANGE_LABELS: Record<RangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  "12m": "Last 12 months",
  "24m": "Last 24 months",
};

function presetToWindow(preset: RangePreset, now = new Date()): BusinessWindow {
  if (preset === "7d") return { from: subDays(now, 7), to: now };
  if (preset === "30d") return { from: subDays(now, 30), to: now };
  if (preset === "month") return { from: startOfMonth(now), to: now };
  if (preset === "quarter") return { from: startOfQuarter(now), to: now };
  if (preset === "year") return { from: startOfYear(now), to: now };
  if (preset === "12m") return { from: subMonths(now, 12), to: now };
  return { from: subMonths(now, 24), to: now };
}

/** Legacy compute helpers understand month/quarter/year/all only. */
function presetToLegacyRange(preset: RangePreset): AnalyticsDateRange {
  if (preset === "month" || preset === "quarter" || preset === "year") return preset;
  return "all";
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  phone: "Phone",
  referral: "Referral",
  "walk-in": "Walk-in",
  "social-media": "Social media",
  other: "Other",
};

const GRANULARITIES: { value: BusinessGranularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const BusinessAnalytics = () => {
  const {
    enquiries,
    quotations,
    projects,
    customers,
    invoices,
    saleBills,
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
    loanRepayments,
    employees,
    attendanceRecords,
    employeePayrollRecords,
    employeeWalletLedger,
    blockages,
    teams,
    tools,
    sites,
    siteVisits,
    vendors,
    partners,
    partnerTransactions,
    agentCommissionPayments,
  } = useAppData();

  const [preset, setPreset] = useState<RangePreset>("year");
  const [granularity, setGranularity] = useState<BusinessGranularity>("monthly");
  const [activeTab, setActiveTab] = useState("overview");

  // Enquiries & Sales filters (rendered in the shared toolbar so everything sits in one row).
  const [salespersonFilter, setSalespersonFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const window = useMemo(() => presetToWindow(preset), [preset]);
  const legacyRange = presetToLegacyRange(preset);

  /** Salesperson options come from the enquiries themselves, so names always resolve. */
  const salespersonOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of enquiries) {
      const key = e.assignedToMemberId ? String(e.assignedToMemberId) : e.assignedTo?.trim();
      if (!key) continue;
      const label = e.assignedTo?.trim();
      if (!seen.has(key)) seen.set(key, label || key);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enquiries]);

  const filteredEnquiries = useMemo(
    () =>
      enquiries.filter((e) => {
        if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
        if (priorityFilter !== "all" && e.priority !== priorityFilter) return false;
        if (salespersonFilter !== "all") {
          const key = e.assignedToMemberId ? String(e.assignedToMemberId) : e.assignedTo?.trim();
          if (key !== salespersonFilter) return false;
        }
        return true;
      }),
    [enquiries, sourceFilter, priorityFilter, salespersonFilter],
  );

  const slices = useMemo(
    () => ({
      enquiries,
      quotations,
      projects,
      customers,
      invoices: [...invoices, ...saleBills],
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
      enquiries, quotations, projects, customers, invoices, saleBills, payments, expenses,
      inventoryItems, tasks, agents, materialDamageRecords, scheduledInstallations,
      materialReservations, vendorBills, loans, employees, attendanceRecords,
      employeePayrollRecords, employeeWalletLedger, blockages,
    ],
  );

  // New business-analytics computations (window + granularity aware).
  const enquiryAnalytics = useMemo(
    () => computeEnquiryAnalytics(enquiries, quotations, window, granularity),
    [enquiries, quotations, window, granularity],
  );
  const profitAnalytics = useMemo(
    () => computeProfitAnalytics(projects, expenses, payments, window, granularity),
    [projects, expenses, payments, window, granularity],
  );
  const geoAnalytics = useMemo(
    () => computeGeoAnalytics(projects.filter((p) => !p.archivedAt), quotations, window),
    [projects, quotations, window],
  );
  const inventoryRates = useMemo(
    () => computeInventoryRateAnalytics(vendorBills ?? [], window, granularity),
    [vendorBills, window, granularity],
  );
  const payrollAnalytics = useMemo(
    () => computePayrollAnalytics(employeePayrollRecords ?? [], window, granularity),
    [employeePayrollRecords, window, granularity],
  );
  const loanAnalytics = useMemo(
    () => computeLoanAnalytics(loans ?? [], loanRepayments ?? [], window, granularity),
    [loans, loanRepayments, window, granularity],
  );

  // Existing Analytics metrics, folded into the relevant tabs.
  const operationsMetrics = useMemo(
    () => computeOperationsMetrics(slices, legacyRange),
    [slices, legacyRange],
  );
  const financeMetrics = useMemo(
    () => computeFinanceMetrics(slices, legacyRange),
    [slices, legacyRange],
  );
  const inventoryMetrics = useMemo(() => computeInventoryMetrics(slices), [slices]);
  const customerMetrics = useMemo(() => computeCustomerMetrics(slices), [slices]);
  const peopleMetrics = useMemo(
    () => computePeopleMetrics(slices, window.from, window.to),
    [slices, window],
  );

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enquiries">Enquiries & Sales</TabsTrigger>
          <TabsTrigger value="projects">Projects & Geography</TabsTrigger>
          <TabsTrigger value="tasks">Tasks & Operations</TabsTrigger>
          <TabsTrigger value="finance">Finance & Profitability</TabsTrigger>
          <TabsTrigger value="invoices">Invoices & GST</TabsTrigger>
          <TabsTrigger value="inventory">Inventory & Procurement</TabsTrigger>
          <TabsTrigger value="channels">Agents, Partners & Vendors</TabsTrigger>
          <TabsTrigger value="team">Team & Salaries</TabsTrigger>
        </TabsList>

        {/* Shared toolbar: time controls + (on Enquiries & Sales) the tab filters, all in one row. */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={preset} onValueChange={(v) => setPreset(v as RangePreset)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABELS) as RangePreset[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {RANGE_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex shrink-0 rounded-md border bg-background p-0.5" role="group" aria-label="Granularity">
            {GRANULARITIES.map((g) => (
              <Button
                key={g.value}
                type="button"
                variant={granularity === g.value ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 text-2xs"
                onClick={() => setGranularity(g.value)}
                aria-pressed={granularity === g.value}
              >
                {g.label}
              </Button>
            ))}
          </div>
          {activeTab === "enquiries" && (
            <>
              <Select value={salespersonFilter} onValueChange={setSalespersonFilter}>
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="Salesperson" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All salespeople</SelectItem>
                  {salespersonOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <TabsContent value="overview">
          <OverviewTab
            enquiry={enquiryAnalytics}
            profit={profitAnalytics}
            geo={geoAnalytics}
            payroll={payrollAnalytics}
            loans={loanAnalytics}
            customers={customerMetrics}
          />
        </TabsContent>
        <TabsContent value="enquiries">
          <EnquiriesTab
            enquiries={filteredEnquiries}
            quotations={quotations}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectsGeoTab
            projects={projects}
            quotations={quotations}
            operations={operationsMetrics}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab
            tasks={tasks}
            scheduledInstallations={scheduledInstallations ?? []}
            siteVisits={siteVisits ?? []}
            blockages={blockages ?? []}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="finance">
          <FinanceTab
            profit={profitAnalytics}
            finance={financeMetrics}
            loans={loanAnalytics}
            expenses={expenses}
            window={window}
          />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesGstTab
            invoices={[...invoices, ...saleBills]}
            payments={payments}
            vendorBills={vendorBills ?? []}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="inventory">
          <InventoryTab
            rates={inventoryRates}
            inventory={inventoryMetrics}
            inventoryItems={inventoryItems}
            tools={tools ?? []}
            sites={sites ?? []}
            projects={projects}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="channels">
          <ChannelsTab
            agents={agents}
            agentCommissionPayments={agentCommissionPayments ?? []}
            enquiries={enquiries}
            projects={projects}
            partners={partners ?? []}
            partnerTransactions={partnerTransactions ?? []}
            vendors={vendors ?? []}
            vendorBills={vendorBills ?? []}
            window={window}
            granularity={granularity}
          />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab
            employees={employees}
            tasks={tasks}
            attendance={attendanceRecords}
            payroll={payrollAnalytics}
            people={peopleMetrics}
            teams={teams ?? []}
            window={window}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default BusinessAnalytics;

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Users as UsersIcon, Store } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import BankReconciliationSheet from "@/components/audit/BankReconciliationSheet";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { formatINR } from "@/lib/formatCurrency";
import { computeLedgerTotals } from "@/lib/audit/ledgerTotals";
import { computeProfitLoss } from "@/lib/audit";
import { sumBookableVendorBillsInPeriod } from "@/lib/vendorBillVoucherPosting";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Info } from "lucide-react";
import { useCan } from "@/hooks/useCan";

const AuditDashboard = () => {
  const {
    invoices,
    saleBills,
    expenses,
    incomes,
    vendorBills,
    inventoryItems,
    customers,
    vendors: _vendors,
    materialDamageRecords,
    payments,
  } = useAppData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("current");
  const [showReconciliation, setShowReconciliation] = useState(false);
  const canOpenBankReconciliation = useCan("auditBankReconciliation", "view");
  const canRunBankReconciliation = useCan("auditBankReconciliation", "create");

  const now = new Date();

  const getDateRange = (p: string) => {
    if (p === "current") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (p === "last") return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
    if (p === "quarter") return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
    return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
  };

  const inRange = (dateStr: string, range: { start: Date; end: Date }) => {
    try {
      const d = parseISO(dateStr);
      return isWithinInterval(d, range);
    } catch { return false; }
  };

  const stats = useMemo(() => {
    const range = getDateRange(period);
    const allInvoices = [...invoices, ...saleBills];
    const periodInvoices = allInvoices.filter(i => inRange(i.invoiceDate, range));

    const ledger = computeLedgerTotals(
      { invoices, saleBills, expenses, vendorBills, inventoryItems, materialDamageRecords, payments },
      (dateStr) => inRange(dateStr, range),
    );
    const gstCollected = periodInvoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
    const gstInput = sumBookableVendorBillsInPeriod(vendorBills, (d) => inRange(d, range), (b) => b.gst ?? 0);
    const gstPayable = gstCollected - gstInput;
    const pl = computeProfitLoss(
      {
        invoices,
        saleBills,
        expenses,
        incomes,
        vendorBills,
        inventoryItems,
        materialDamageRecords,
        payments,
      },
      (dateStr) => inRange(dateStr, range),
      "accrual",
    );

    return {
      monthlyRevenue: ledger.revenueAccrual,
      gstCollected,
      gstPayable,
      inventoryValue: ledger.inventoryValueCost,
      receivables: ledger.receivablesOpen,
      payables: ledger.payablesOpen,
      netProfit: pl.netProfit,
    };
  }, [invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, materialDamageRecords, payments, period]);

  const kpiCards = [
    { label: "Revenue", value: stats.monthlyRevenue },
    { label: "GST Collected", value: stats.gstCollected },
    { label: "GST Payable", value: stats.gstPayable },
    { label: "Inventory Value", value: stats.inventoryValue },
    { label: "Receivables", value: stats.receivables },
    { label: "Payables", value: stats.payables },
    { label: "Net Profit", value: stats.netProfit },
  ];

  // Monthly chart data (last 6 months)
  const chartData = useMemo(() => {
    const plInput = {
      invoices,
      saleBills,
      expenses,
      incomes,
      vendorBills,
      inventoryItems,
      materialDamageRecords,
      payments,
    };
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const range = { start: startOfMonth(month), end: endOfMonth(month) };
      const pl = computeProfitLoss(plInput, (dateStr) => inRange(dateStr, range), "accrual");
      const opex =
        pl.totalDirect + pl.totalIndirect + pl.totalFinanceCost + pl.totalTax;
      return {
        month: format(month, "MMM yy"),
        Revenue: pl.revenueTotal,
        Expenses: opex,
        Purchases: pl.cogs,
        Profit: pl.netProfit,
      };
    });
  }, [invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, materialDamageRecords, payments]);

  // Top customers
  const topCustomers = useMemo(() => {
    const allInv = [...invoices, ...saleBills];
    const customerMap = new Map<string, { name: string; id: string; total: number; count: number }>();
    allInv.forEach(inv => {
      if (!inv.customerName && !inv.customerId) return;
      const key = inv.customerId || `name:${inv.customerName}`;
      const existing = customerMap.get(key) || {
        name: inv.customerName || "Unknown",
        id: inv.customerId || "",
        total: 0,
        count: 0,
      };
      existing.total += inv.total;
      existing.count += 1;
      customerMap.set(key, existing);
    });
    return Array.from(customerMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices, saleBills]);

  const openCustomer = (customerId: string, customerName: string) => {
    if (!customerId) {
      toast({
        title: "Customer not linked",
        description: `"${customerName}" has no customer record ID on file.`,
        variant: "destructive",
      });
      return;
    }
    if (!customers.some((c) => c.id === customerId)) {
      toast({
        title: "Customer not found",
        description: "This customer may have been removed.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/customers/${customerId}`);
  };

  // Top vendors
  const topVendors = useMemo(() => {
    const vendorMap = new Map<string, { name: string; id: number; total: number; count: number }>();
    vendorBills.forEach(bill => {
      const name = bill.vendorName || `Vendor ${bill.vendorId}`;
      const existing = vendorMap.get(name) || { name, id: bill.vendorId, total: 0, count: 0 };
      existing.total += bill.total;
      existing.count += 1;
      vendorMap.set(name, existing);
    });
    return Array.from(vendorMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [vendorBills]);

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Dashboard" },
        ]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="h-8 w-[min(10rem,100%)] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">This Month</SelectItem>
                  <SelectItem value="last">Last Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InlineKpiStrip
              className="w-full min-w-0 sm:max-w-[min(100%,52rem)] sm:justify-end"
              items={kpiCards.map((k) => ({ label: k.label, value: formatINR(k.value) }))}
            />
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {canOpenBankReconciliation && (
            <Button
              size="sm"
              onClick={() => setShowReconciliation(true)}
              className="gap-2"
              variant={canRunBankReconciliation ? "default" : "outline"}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">
                {canRunBankReconciliation ? "Reconcile" : "View reconciliation"}
              </span>
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Operational totals (prototype)</AlertTitle>
        <AlertDescription>
          KPIs and charts roll up invoices, expenses, and vendor bills directly. Payables and purchase COGS use
          bookable vendor bills only (non-draft — same as Vendor detail and PurchaseBillBooked vouchers). Posted GL
          vouchers are stored separately; use Chart of Accounts for voucher drill-down.
        </AlertDescription>
      </Alert>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend />
                <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Line type="monotone" dataKey="Profit" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers & Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.length === 0 && (
                <ListEmptyState
                  icon={UsersIcon}
                  title="No customer activity yet"
                  description="No invoiced customers in this period."
                />
              )}
              {topCustomers.map((c, i) => (
                <div key={c.id || c.name} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => openCustomer(c.id, c.name)}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs p-0">{i + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} invoices</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatINR(c.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top 5 Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVendors.length === 0 && (
                <ListEmptyState
                  icon={Store}
                  title="No vendor activity yet"
                  description="No vendor bills in this period."
                />
              )}
              {topVendors.map((v, i) => (
                <div key={v.name} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => navigate(`/vendors/${v.id}`)}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs p-0">{i + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.count} bills</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatINR(v.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {canOpenBankReconciliation && (
        <BankReconciliationSheet open={showReconciliation} onOpenChange={setShowReconciliation} />
      )}
    </PageShell>
  );
};

export default AuditDashboard;

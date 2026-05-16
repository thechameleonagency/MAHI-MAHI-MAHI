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
import { ShieldCheck } from "lucide-react";
import BankReconciliationModal from "@/components/audit/BankReconciliationModal";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { PrototypeFinanceNotice } from "@/components/prototype/PrototypeFinanceNotice";
import { formatINR } from "@/lib/formatCurrency";

const AuditDashboard = () => {
  const { invoices, saleBills, expenses, _incomes, vendorBills, inventoryItems, _customers, _vendors } = useAppData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("current");
  const [showReconciliation, setShowReconciliation] = useState(false);

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
    
    const monthlyRevenue = periodInvoices.reduce((s, i) => s + i.total, 0);
    const gstCollected = periodInvoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
    const gstInput = vendorBills.filter(b => inRange(b.billDate, range)).reduce((s, b) => s + (b.gst || 0), 0);
    const gstPayable = gstCollected - gstInput;
    const inventoryValue = inventoryItems.reduce((s, item) => s + item.stock * item.buyPrice, 0);
    const receivables = allInvoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.total - i.amountReceived), 0);
    const payables = vendorBills.filter(b => b.status !== "paid").reduce((s, b) => s + (b.total - b.amountPaid), 0);
    const periodExpenses = expenses.filter(e => inRange(e.date, range)).reduce((s, e) => s + e.amount, 0);
    const periodPurchases = vendorBills.filter(b => inRange(b.billDate, range)).reduce((s, b) => s + b.total, 0);
    const netProfit = monthlyRevenue - periodExpenses - periodPurchases;

    return { monthlyRevenue, gstCollected, gstPayable, inventoryValue, receivables, payables, netProfit };
  }, [invoices, saleBills, expenses, vendorBills, inventoryItems, period]);

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
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(now, 5 - i);
      const range = { start: startOfMonth(month), end: endOfMonth(month) };
      const allInv = [...invoices, ...saleBills];
      const rev = allInv.filter(inv => inRange(inv.invoiceDate, range)).reduce((s, inv) => s + inv.total, 0);
      const exp = expenses.filter(e => inRange(e.date, range)).reduce((s, e) => s + e.amount, 0);
      const purchases = vendorBills.filter(b => inRange(b.billDate, range)).reduce((s, b) => s + b.total, 0);
      return {
        month: format(month, "MMM yy"),
        Revenue: rev,
        Expenses: exp,
        Purchases: purchases,
        Profit: rev - exp,
      };
    });
  }, [invoices, saleBills, expenses, vendorBills]);

  // Top customers
  const topCustomers = useMemo(() => {
    const allInv = [...invoices, ...saleBills];
    const customerMap = new Map<string, { name: string; id: string; total: number; count: number }>();
    allInv.forEach(inv => {
      if (!inv.customerName) return;
      const existing = customerMap.get(inv.customerName) || { name: inv.customerName, id: inv.customerId || "", total: 0, count: 0 };
      existing.total += inv.total;
      existing.count += 1;
      customerMap.set(inv.customerName, existing);
    });
    return Array.from(customerMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [invoices, saleBills]);

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
          <Button size="sm" onClick={() => setShowReconciliation(true)} className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Reconcile</span>
          </Button>
        </div>
      </StickyPageHeader>

      <PrototypeFinanceNotice />

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
              {topCustomers.length === 0 && <p className="text-sm text-muted-foreground">No customer data</p>}
              {topCustomers.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                  onClick={() => c.id && navigate(`/customers/${c.id}`)}>
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
              {topVendors.length === 0 && <p className="text-sm text-muted-foreground">No vendor data</p>}
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
      <BankReconciliationModal open={showReconciliation} onOpenChange={setShowReconciliation} />
    </PageShell>
  );
};

export default AuditDashboard;

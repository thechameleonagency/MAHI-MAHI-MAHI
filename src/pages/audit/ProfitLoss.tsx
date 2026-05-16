import { useMemo, useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIRECT_EXPENSE_CATEGORIES } from "@/services/finance/chartOfAccounts";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { formatINR } from "@/lib/formatCurrency";

// Expense category to P&L line item mapping
const EXPENSE_PL_MAP: Record<string, { label: string; categories: string[] }> = {
  salaries: { label: "Salaries & Wages", categories: ["salary"] },
  advance: { label: "Employee Advance", categories: ["advance"] },
  empFood: { label: "Employee Food & Stay", categories: ["employee-food", "employee-stay"] },
  empMedical: { label: "Employee Medical", categories: ["employee-medical"] },
  empTransport: { label: "Employee Transport & Tickets", categories: ["employee-transport", "employee-tickets"] },
  empReimburse: { label: "Employee Reimbursements", categories: ["employee-reimbursement"] },
  multiEmp: { label: "Multi-Employee Shared", categories: ["multi-employee-payment"] },
  officeRent: { label: "Office Rent", categories: ["office-rent"] },
  officeUtilities: { label: "Office Utilities", categories: ["electricity-bill", "office-internet", "office-phone", "water-camper"] },
  officeSupplies: { label: "Office Supplies & Food", categories: ["office-supplies", "office-food", "office-tea", "office-misc", "office-infrastructure"] },
  vehicle: { label: "Vehicle Expenses", categories: ["company-vehicle"] },
  marketing: { label: "Marketing", categories: ["marketing", "physical-marketing"] },
  ca: { label: "CA & Professional Fees", categories: ["ca-payments"] },
  tax: { label: "Tax Payments", categories: ["tax-payments"] },
  subscriptions: { label: "Subscriptions", categories: ["subscriptions"] },
  tools: { label: "Tools & Equipment", categories: ["company-tools"] },
  commission: { label: "Site Commissions", categories: ["commission"] },
  materialTransport: { label: "Material Transport", categories: ["material-transport", "non-inventory-transport"] },
  siteTeamTransport: { label: "Site Team Transport", categories: ["site-team-transport"] },
  siteLabour: { label: "Site Labour & Machinery", categories: ["pulley-transport", "labour-material-shift", "machine-rent"] },
  outsource: { label: "Outsource Work", categories: ["outsource-work"] },
  siteTolls: { label: "Site Tolls & Parking", categories: ["site-toll-parking"] },
  otherSite: { label: "Other Site Expenses", categories: ["other-site"] },
  ownerWithdrawal: { label: "Owner Withdrawals", categories: ["owner-withdrawal"] },
  ownerPersonal: { label: "Owner Personal", categories: ["owner-personal"] },
  ownerReimburse: { label: "Owner Reimbursements", categories: ["owner-reimbursement"] },
  partnerWithdrawal: { label: "Partner Withdrawals", categories: ["partner-withdrawal"] },
  partnerProfit: { label: "Partner Profit Payments", categories: ["partner-profit-payment"] },
  partnerExpense: { label: "Partner Expenses", categories: ["partner-expense"] },
  otherCompany: { label: "Other Company Expenses", categories: ["other-company"] },
};

const ProfitLoss = () => {
  const { invoices, saleBills, expenses, incomes, vendorBills, inventoryItems } = useAppData();
  const [period, setPeriod] = useState("yearly");
  const now = new Date();

  const getRange = () => {
    if (period === "monthly") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === "quarterly") return { start: startOfQuarter(now), end: endOfQuarter(now) };
    return { start: startOfYear(now), end: endOfYear(now) };
  };

  const inRange = (dateStr: string) => {
    try {
      return isWithinInterval(parseISO(dateStr), getRange());
    } catch { return false; }
  };

  const plData = useMemo(() => {
    const _range = getRange();
    const allInvoices = [...invoices, ...saleBills];
    const periodInvoices = allInvoices.filter(i => inRange(i.invoiceDate));

    // Revenue
    const solarSales = periodInvoices.reduce((s, inv) => 
      s + inv.items.filter(item => item.hsn?.startsWith("8541")).reduce((is, item) => is + item.quantity * item.rate, 0), 0);
    const serviceIncome = periodInvoices.reduce((s, inv) => 
      s + inv.services.reduce((ss, svc) => ss + svc.rate, 0), 0);
    const otherItemSales = periodInvoices.reduce((s, inv) => 
      s + inv.items.filter(item => !item.hsn?.startsWith("8541")).reduce((is, item) => is + item.quantity * item.rate, 0), 0);
    const companyIncome = incomes.filter(i => inRange(i.date) && i.mainCategory === "company").reduce((s, i) => s + i.amount, 0);
    const totalRevenue = solarSales + serviceIncome + otherItemSales + companyIncome;

    // COGS
    const inventoryValue = inventoryItems.reduce((s, item) => s + item.stock * item.buyPrice, 0);
    const purchases = vendorBills.filter(b => inRange(b.billDate)).reduce((s, b) => s + b.total, 0);
    const cogs = purchases; // Simplified: COGS = purchases in period

    const grossProfit = totalRevenue - cogs;

    // Operating Expenses — split into Direct and Indirect
    const periodExpenses = expenses.filter(e => inRange(e.date));
    const directLines: { key: string; label: string; amount: number }[] = [];
    const indirectLines: { key: string; label: string; amount: number }[] = [];
    let totalDirect = 0;
    let totalIndirect = 0;

    Object.entries(EXPENSE_PL_MAP).forEach(([key, { label, categories }]) => {
      const amount = periodExpenses.filter(e => categories.includes(e.category)).reduce((s, e) => s + e.amount, 0);
      if (amount > 0) {
        const isDirect = categories.some(c => DIRECT_EXPENSE_CATEGORIES.includes(c));
        if (isDirect) {
          directLines.push({ key, label, amount });
          totalDirect += amount;
        } else {
          indirectLines.push({ key, label, amount });
          totalIndirect += amount;
        }
      }
    });

    // Uncategorized expenses
    const mappedCategories = Object.values(EXPENSE_PL_MAP).flatMap(v => v.categories);
    const uncategorized = periodExpenses.filter(e => !mappedCategories.includes(e.category)).reduce((s, e) => s + e.amount, 0);
    if (uncategorized > 0) {
      indirectLines.push({ key: "misc", label: "Miscellaneous", amount: uncategorized });
      totalIndirect += uncategorized;
    }

    const totalOpex = totalDirect + totalIndirect;
    const netProfit = grossProfit - totalOpex;

    return {
      revenue: { solarSales, serviceIncome, otherItemSales, companyIncome, total: totalRevenue },
      cogs, grossProfit, directLines, indirectLines, totalDirect, totalIndirect, totalOpex, netProfit, inventoryValue,
    };
  }, [invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, period]);

  const LineItem = ({ label, amount, bold = false, indent = false }: { label: string; amount: number; bold?: boolean; indent?: boolean }) => (
    <div className={cn("flex justify-between py-1.5 px-3", indent && "pl-8", bold && "font-semibold border-t border-border")}>
      <span className={cn("text-sm", bold ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-sm tabular-nums", amount < 0 ? "text-destructive" : "text-foreground", bold && "font-bold")}>{formatINR(amount)}</span>
    </div>
  );

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Profit & Loss" },
        ]}
        subRow={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="w-full min-w-0 sm:max-w-none sm:justify-end"
              items={[
                { label: "Revenue", value: formatINR(plData.revenue.total) },
                { label: "COGS", value: formatINR(plData.cogs) },
                { label: "Gross profit", value: formatINR(plData.grossProfit) },
                { label: "Net profit", value: formatINR(plData.netProfit) },
              ]}
            />
          </>
        }
      />

      {/* P&L Statement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Revenue */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="w-full">
              <div className="flex justify-between items-center px-4 py-3 bg-primary/5 hover:bg-primary/10 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="font-semibold text-sm text-foreground">Revenue</span>
                </div>
                <span className="font-bold text-sm text-primary">{formatINR(plData.revenue.total)}</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <LineItem label="Solar System Sales" amount={plData.revenue.solarSales} indent />
              <LineItem label="Installation Services" amount={plData.revenue.serviceIncome} indent />
              <LineItem label="Other Product Sales" amount={plData.revenue.otherItemSales} indent />
              <LineItem label="Other Company Income" amount={plData.revenue.companyIncome} indent />
              <LineItem label="Total Revenue" amount={plData.revenue.total} bold />
            </CollapsibleContent>
          </Collapsible>

          {/* COGS */}
          <div className="flex justify-between items-center px-4 py-3 bg-muted/50">
            <span className="font-semibold text-sm text-foreground">Cost of Goods Sold (Purchases)</span>
            <span className="font-bold text-sm text-destructive">({formatINR(plData.cogs)})</span>
          </div>
          <LineItem label="Gross Profit" amount={plData.grossProfit} bold />

          {/* Direct Expenses */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="w-full">
              <div className="flex justify-between items-center px-4 py-3 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="font-semibold text-sm text-foreground">Direct Expenses</span>
                  <Badge variant="outline" className="text-2xs px-1.5 py-0">CoA: Direct Expenses</Badge>
                </div>
                <span className="font-bold text-sm text-destructive">({formatINR(plData.totalDirect)})</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {plData.directLines.map(line => (
                <LineItem key={line.key} label={line.label} amount={line.amount} indent />
              ))}
              <LineItem label="Total Direct Expenses" amount={plData.totalDirect} bold />
            </CollapsibleContent>
          </Collapsible>

          {/* Indirect Expenses */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="w-full">
              <div className="flex justify-between items-center px-4 py-3 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown className="w-4 h-4" />
                  <span className="font-semibold text-sm text-foreground">Indirect Expenses</span>
                  <Badge variant="outline" className="text-2xs px-1.5 py-0">CoA: Indirect Expenses</Badge>
                </div>
                <span className="font-bold text-sm text-destructive">({formatINR(plData.totalIndirect)})</span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {plData.indirectLines.map(line => (
                <LineItem key={line.key} label={line.label} amount={line.amount} indent />
              ))}
              <LineItem label="Total Indirect Expenses" amount={plData.totalIndirect} bold />
            </CollapsibleContent>
          </Collapsible>

          {/* Net Profit */}
          <div className={cn("flex justify-between items-center px-4 py-4 border-t-2 border-primary/30", 
            plData.netProfit >= 0 ? "bg-primary/5" : "bg-destructive/5")}>
            <span className="font-bold text-base text-foreground">Net Profit / (Loss)</span>
            <span className={cn("font-bold text-lg", plData.netProfit >= 0 ? "text-primary" : "text-destructive")}>
              {plData.netProfit < 0 ? `(${formatINR(Math.abs(plData.netProfit))})` : formatINR(plData.netProfit)}
            </span>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default ProfitLoss;

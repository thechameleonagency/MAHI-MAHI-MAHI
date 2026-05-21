import { useMemo, useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { formatINR } from "@/lib/formatCurrency";
import { computeProfitLoss, type RevenueBasis } from "@/lib/audit";

const ProfitLoss = () => {
  const { invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, materialDamageRecords, payments } =
    useAppData();
  const [period, setPeriod] = useState("yearly");
  const [revenueBasis, setRevenueBasis] = useState<RevenueBasis>("accrual");
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
    const result = computeProfitLoss(
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
      inRange,
      revenueBasis,
    );
    return {
      revenue: {
        ...result.revenueBreakdown,
        total: result.revenueTotal,
      },
      cogs: result.cogs,
      grossProfit: result.grossProfit,
      directLines: result.directLines,
      indirectLines: result.indirectLines,
      financeCostLines: result.financeCostLines,
      taxLines: result.taxLines,
      excludedFromPL: result.excludedFromPL,
      totalDirect: result.totalDirect,
      totalIndirect: result.totalIndirect,
      totalFinanceCost: result.totalFinanceCost,
      totalTax: result.totalTax,
      operatingProfit: result.operatingProfit,
      profitBeforeTax: result.profitBeforeTax,
      totalOpex: result.totalDirect + result.totalIndirect,
      netProfit: result.netProfit,
      inventoryValue: result.inventoryValue,
      damageWriteOff: result.damageWriteOff,
      agentAndCommission: result.agentAndCommission,
      partnerShare: result.partnerShare,
      basis: result.basis,
    };
  }, [invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, materialDamageRecords, payments, period, revenueBasis]);

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
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 overflow-x-auto">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-8 w-36 shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={revenueBasis} onValueChange={(v) => setRevenueBasis(v as RevenueBasis)}>
              <SelectTrigger className="h-8 w-28 shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accrual">Accrual</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              singleRow
              className="min-w-0 flex-1"
              items={[
                { label: `Revenue (${revenueBasis})`, value: formatINR(plData.revenue.total) },
                { label: "Damage", value: formatINR(plData.damageWriteOff) },
                { label: "Agent/partner", value: formatINR(plData.agentAndCommission + plData.partnerShare) },
                { label: "Net profit", value: formatINR(plData.netProfit) },
              ]}
            />
          </div>
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
          <Alert variant="default" className="mx-3 my-3 border-muted-foreground/25 bg-muted/30">
            <AlertTitle className="text-sm">How this prototype computes COGS</AlertTitle>
            <AlertDescription className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">COGS</strong> here is the sum of bookable vendor bills (non-draft) in the selected period, aligned with Vendor detail payables and PurchaseBillBooked vouchers — not materials consumed on projects.
              It is not a consumption-based cost of sales. Ending inventory is approximated separately as stock on hand × buy price (
              {formatINR(plData.inventoryValue)} in this view); that valuation is informational and is not the same as COGS relief in a full perpetual-inventory model.
            </AlertDescription>
          </Alert>

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
              <div className="flex justify-between items-center px-4 py-3 bg-warning/5 hover:bg-warning/10 transition-colors">
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

          {/* Operating Profit (EBIT) */}
          <div className="flex justify-between items-center px-4 py-3 bg-muted/30 border-t border-border">
            <span className="font-semibold text-sm text-foreground">Operating Profit (EBIT)</span>
            <span className={cn("font-bold text-sm", plData.operatingProfit >= 0 ? "text-primary" : "text-destructive")}>
              {plData.operatingProfit < 0 ? `(${formatINR(Math.abs(plData.operatingProfit))})` : formatINR(plData.operatingProfit)}
            </span>
          </div>

          {/* Finance Costs */}
          {plData.financeCostLines.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center px-4 py-3 bg-warning/5 hover:bg-warning/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    <span className="font-semibold text-sm text-foreground">Finance Costs</span>
                    <Badge variant="outline" className="text-2xs px-1.5 py-0">Interest only — principal excluded</Badge>
                  </div>
                  <span className="font-bold text-sm text-destructive">({formatINR(plData.totalFinanceCost)})</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {plData.financeCostLines.map(line => (
                  <LineItem key={line.key} label={line.label} amount={line.amount} indent />
                ))}
                <LineItem label="Total Finance Costs" amount={plData.totalFinanceCost} bold />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Profit Before Tax */}
          <div className="flex justify-between items-center px-4 py-3 bg-muted/30 border-t border-border">
            <span className="font-semibold text-sm text-foreground">Profit Before Tax</span>
            <span className={cn("font-bold text-sm", plData.profitBeforeTax >= 0 ? "text-primary" : "text-destructive")}>
              {plData.profitBeforeTax < 0 ? `(${formatINR(Math.abs(plData.profitBeforeTax))})` : formatINR(plData.profitBeforeTax)}
            </span>
          </div>

          {/* Tax */}
          {plData.taxLines.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center px-4 py-3 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    <span className="font-semibold text-sm text-foreground">Tax</span>
                  </div>
                  <span className="font-bold text-sm text-destructive">({formatINR(plData.totalTax)})</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {plData.taxLines.map(line => (
                  <LineItem key={line.key} label={line.label} amount={line.amount} indent />
                ))}
                <LineItem label="Total Tax" amount={plData.totalTax} bold />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Net Profit */}
          <div className={cn("flex justify-between items-center px-4 py-4 border-t-2 border-primary/30",
            plData.netProfit >= 0 ? "bg-primary/5" : "bg-destructive/5")}>
            <span className="font-bold text-base text-foreground">Net Profit / (Loss)</span>
            <span className={cn("font-bold text-lg", plData.netProfit >= 0 ? "text-primary" : "text-destructive")}>
              {plData.netProfit < 0 ? `(${formatINR(Math.abs(plData.netProfit))})` : formatINR(plData.netProfit)}
            </span>
          </div>

          {/* Excluded from P&L (transparency only) */}
          {plData.excludedFromPL.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="w-full">
                <div className="flex justify-between items-center px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-xs text-muted-foreground border-t border-border">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-4 h-4" />
                    <span className="font-medium">Excluded from P&L (capital / drawings / liability / asset movements)</span>
                  </div>
                  <span>{formatINR(plData.excludedFromPL.reduce((s, l) => s + l.amount, 0))}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {plData.excludedFromPL.map(line => (
                  <div key={line.key} className="flex justify-between py-1 px-3 pl-8 text-2xs text-muted-foreground">
                    <span>{line.label}</span>
                    <span>{formatINR(line.amount)}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default ProfitLoss;

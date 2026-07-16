import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";
import type { Expense } from "@/types/finance";
import type { FinanceMetrics } from "@/lib/analytics";
import {
  inWindow,
  type BusinessWindow,
  type LoanAnalytics,
  type ProfitAnalytics,
} from "@/lib/analytics/business";
import {
  ChartCard,
  COLOR_COST,
  COLOR_DESTRUCTIVE,
  COLOR_PRIMARY,
  COLOR_REVENUE,
  COLOR_SUCCESS,
  COLOR_WARNING,
  MetricTiles,
} from "./ChartCard";

export function FinanceTab({
  profit,
  finance,
  loans,
  expenses,
  window,
}: {
  profit: ProfitAnalytics;
  finance: FinanceMetrics;
  loans: LoanAnalytics;
  expenses: Expense[];
  window: BusinessWindow;
}) {
  const [typeFilter, setTypeFilter] = useState("all");

  const expenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (!inWindow(e.date, window)) continue;
      const key = (e.mainCategory || e.category || "Other").trim() || "Other";
      map.set(key, (map.get(key) ?? 0) + e.amount);
    }
    return [...map.entries()]
      .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [expenses, window]);

  const filteredRows = useMemo(
    () => profit.rows.filter((r) => typeFilter === "all" || r.type === typeFilter),
    [profit.rows, typeFilter],
  );

  const varianceRows = useMemo(() => {
    const withVariance = filteredRows.filter((r) => r.variancePerKw !== null);
    const sorted = [...withVariance].sort((a, b) => (b.variancePerKw ?? 0) - (a.variancePerKw ?? 0));
    // Best and worst ends of the distribution.
    return [...sorted.slice(0, 6), ...sorted.slice(-6)].filter(
      (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
    );
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      <MetricTiles
        tiles={[
          { label: "Revenue (cash)", value: formatINRCompact(finance.revenueCash) },
          { label: "Revenue (accrual)", value: formatINRCompact(finance.revenueAccrual) },
          { label: "Expenses", value: formatINRCompact(finance.expenseTotal) },
          { label: "Vendor overdue", value: formatINRCompact(finance.vendorOverdueAmount) },
          { label: "EMI due (30d)", value: formatINRCompact(finance.emiDueNext30) },
          {
            label: "Avg profit / kW",
            value: profit.companyAvgProfitPerKw !== null ? formatINRCompact(profit.companyAvgProfitPerKw) : "—",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Profit per kW by project type" description="Average across projects in range">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={profit.byType}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="avgProfitPerKw" name="Avg ₹/kW" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {profit.byType.map((t) => (
              <div key={t.type} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.type} ({t.count})</span>
                <span className="tabular-nums">
                  {formatINRCompact(t.totalProfit)} · {t.avgMarginPct !== null ? `${t.avgMarginPct}%` : "—"} margin
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Profit variance per project"
          description="₹/kW above or below company average (best and worst)"
          action={
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          {varianceRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No projects with kW capacity in range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, varianceRows.length * 26)}>
              <BarChart data={varianceRows} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [formatINR(v), "vs company avg / kW"]} />
                <Bar dataKey="variancePerKw" radius={[0, 3, 3, 0]}>
                  {varianceRows.map((r) => (
                    <Cell
                      key={r.id}
                      fill={(r.variancePerKw ?? 0) >= 0 ? COLOR_SUCCESS : COLOR_DESTRUCTIVE}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue vs expenses" description="Cash in vs spend, net line">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={profit.cashFlowSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill={COLOR_REVENUE} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill={COLOR_COST} radius={[3, 3, 0, 0]} />
              <Line dataKey="net" name="Net" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Where money goes" description="Expense categories in range (top 10)">
          {expenseCategories.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No expenses in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, expenseCategories.length * 26)}>
              <BarChart data={expenseCategories} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" name="Spent" fill={COLOR_COST} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Receivables aging" description="Open invoice balances by days overdue">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={finance.debtorBuckets}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number, name: string) => (name === "amount" ? formatINR(v) : v)} />
              <Bar dataKey="amount" name="amount" fill={COLOR_WARNING} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-2">
            {finance.debtorBuckets.map((b) => (
              <Badge key={b.bucket} variant="outline" className="text-2xs">
                {b.bucket}d: {b.count} inv · {formatINRCompact(b.amount)}
              </Badge>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Loans & debt"
        description="Borrowing vs repayment in the selected period"
        action={
          <Badge
            variant="outline"
            className={
              loans.direction === "increasing"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : loans.direction === "decreasing"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
            }
          >
            Debt {loans.direction}
          </Badge>
        }
      >
        <MetricTiles
          className="mb-4"
          tiles={[
            { label: "Active loans", value: loans.activeCount },
            { label: "Outstanding", value: formatINRCompact(loans.totalOutstanding) },
            { label: "Avg interest", value: loans.avgInterestRate !== null ? `${loans.avgInterestRate}%` : "—" },
            { label: "EMI / month", value: formatINRCompact(loans.monthlyEmiCommitment) },
            { label: "New borrowing", value: formatINRCompact(loans.newPrincipalInPeriod) },
            { label: "Interest paid", value: formatINRCompact(loans.interestPaidInPeriod) },
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={loans.newLoanSeries.map((p, i) => ({
                label: p.label,
                borrowed: p.value,
                repaid: loans.repaymentSeries[i]?.value ?? 0,
                interest: loans.interestSeries[i]?.value ?? 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="borrowed" name="New borrowing" fill={COLOR_DESTRUCTIVE} radius={[3, 3, 0, 0]} />
              <Bar dataKey="repaid" name="Repaid" fill={COLOR_SUCCESS} radius={[3, 3, 0, 0]} />
              <Line dataKey="interest" name="Interest paid" stroke={COLOR_WARNING} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="max-h-[220px] overflow-y-auto pr-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1.5 pr-2">Loan source</th>
                  <th className="py-1.5 pr-2">Rate</th>
                  <th className="py-1.5 pr-2 text-right">Outstanding</th>
                  <th className="py-1.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {loans.loanRates.map((l) => (
                  <tr key={l.loanId} className="border-b border-border/50">
                    <td className="max-w-[140px] truncate py-1.5 pr-2">{l.source}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{l.interestRate}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatINRCompact(l.outstanding)}</td>
                    <td className="py-1.5 text-right">
                      <Badge variant="outline" className="text-2xs">
                        {l.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {loans.loanRates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground">
                      No loans recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}

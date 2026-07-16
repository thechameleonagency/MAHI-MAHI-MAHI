import { MapPin, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";
import type { EnquiryAnalytics, GeoAnalytics, LoanAnalytics, PayrollAnalytics, ProfitAnalytics } from "@/lib/analytics/business";
import type { CustomerMetrics } from "@/lib/analytics";
import {
  ChartCard,
  COLOR_COST,
  COLOR_PRIMARY,
  COLOR_REVENUE,
  COLOR_SUCCESS,
  MetricTiles,
  TrendBadge,
} from "./ChartCard";

export function OverviewTab({
  enquiry,
  profit,
  geo,
  payroll,
  loans,
  customers,
}: {
  enquiry: EnquiryAnalytics;
  profit: ProfitAnalytics;
  geo: GeoAnalytics;
  payroll: PayrollAnalytics;
  loans: LoanAnalytics;
  customers: CustomerMetrics;
}) {
  const topPerformer = enquiry.perEmployee.find((e) => e.memberId !== "__unassigned__") ?? null;

  return (
    <div className="space-y-4">
      <MetricTiles
        tiles={[
          { label: "Revenue in", value: formatINRCompact(profit.totalRevenueIn) },
          { label: "Expenses", value: formatINRCompact(profit.totalExpenses) },
          { label: "Net cash", value: formatINRCompact(profit.netCash) },
          { label: "Enquiries", value: enquiry.total, sub: `${enquiry.conversionPct}% converted` },
          { label: "Salaries paid", value: formatINRCompact(payroll.totalPaid) },
          { label: "Debt outstanding", value: formatINRCompact(loans.totalOutstanding) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Cash flow" description="Money in vs expenses, with net per period">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={profit.cashFlowSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="revenue" name="Revenue" fill={COLOR_REVENUE} radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill={COLOR_COST} radius={[3, 3, 0, 0]} />
              <Line dataKey="net" name="Net" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Enquiry funnel" description="How far leads progressed in this period">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={enquiry.funnel} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Enquiries" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChartCard title="Top coverage area">
          {geo.top ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-lg font-semibold">
                <MapPin className="h-4 w-4 text-primary" /> {geo.top.pincode}
              </p>
              <p className="text-sm text-muted-foreground">
                {geo.top.projects} projects · {geo.top.totalKw} kW · {formatINRCompact(geo.top.contractValue)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pincode-mapped projects in range.</p>
          )}
        </ChartCard>
        <ChartCard title="Fastest growing area">
          {geo.fastestGrowing ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold">{geo.fastestGrowing.pincode}</p>
              <p className="text-sm text-muted-foreground">
                {geo.fastestGrowing.recentCount} recent vs {geo.fastestGrowing.priorCount} earlier
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No growing area detected yet.</p>
          )}
        </ChartCard>
        <ChartCard title="Top salesperson">
          {topPerformer ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-lg font-semibold">
                <Trophy className="h-4 w-4 text-warning" /> {topPerformer.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Score {topPerformer.score} · {topPerformer.converted}/{topPerformer.total} converted
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No assigned enquiries in range.</p>
          )}
        </ChartCard>
        <ChartCard title="Payroll trend" action={<TrendBadge pct={payroll.trend} invert />}>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{formatINRCompact(payroll.totalPaid)}</p>
            <p className="text-sm text-muted-foreground">
              {payroll.employeesPaid} employees · avg {formatINRCompact(payroll.avgPerEmployee)}
            </p>
          </div>
        </ChartCard>
      </div>

      <MetricTiles
        tiles={[
          { label: "Project customers", value: customers.byKind.project ?? 0 },
          { label: "Inventory customers", value: customers.byKind.inventory ?? 0 },
          { label: "Both", value: customers.byKind.both ?? 0 },
          { label: "Repeat (2+ projects)", value: customers.repeatCustomers },
          { label: "Archived customers", value: customers.archived },
          {
            label: "Avg profit / kW",
            value: profit.companyAvgProfitPerKw !== null ? formatINRCompact(profit.companyAvgProfitPerKw) : "—",
          },
        ]}
      />
    </div>
  );
}

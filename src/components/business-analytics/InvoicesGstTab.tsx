import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
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
import type { Invoice, Payment } from "@/types/finance";
import type { VendorBill } from "@/types/inventory";
import { formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";
import {
  computeInvoiceGstAnalytics,
  type BusinessGranularity,
  type BusinessWindow,
} from "@/lib/analytics/business";
import {
  ChartCard,
  CHART_COLORS,
  COLOR_COST,
  COLOR_PRIMARY,
  COLOR_REVENUE,
  COLOR_SUCCESS,
  MetricTiles,
} from "./ChartCard";

const INVOICE_STATUSES = ["draft", "pending", "partial", "paid", "overdue", "overpaid", "voided"];

export function InvoicesGstTab({
  invoices,
  payments,
  vendorBills,
  window,
  granularity,
}: {
  invoices: Invoice[];
  payments: Payment[];
  vendorBills: VendorBill[];
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [typeFilter, setTypeFilter] = useState<"all" | "invoice" | "sale-bill">("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const a = useMemo(
    () =>
      computeInvoiceGstAnalytics(
        invoices,
        payments,
        vendorBills,
        window,
        granularity,
        typeFilter,
        statusFilter,
      ),
    [invoices, payments, vendorBills, window, granularity, typeFilter, statusFilter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Invoices + sale bills</SelectItem>
            <SelectItem value="invoice">Invoices only</SelectItem>
            <SelectItem value="sale-bill">Sale bills only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVOICE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MetricTiles
        tiles={[
          { label: "Documents", value: a.invoiceCount },
          { label: "Invoiced", value: formatINRCompact(a.totalInvoiced) },
          { label: "Collected", value: formatINRCompact(a.totalCollected), sub: `${a.collectionPct}% collection` },
          { label: "Avg days to payment", value: a.avgDaysToPayment ?? "—" },
          { label: "GST output", value: formatINRCompact(a.gstOutput) },
          { label: "GST net payable", value: formatINRCompact(a.gstNetPayable), sub: `input ${formatINRCompact(a.gstInput)}` },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Invoiced vs collected" description="Billing raised vs cash actually received">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={a.invoicedVsCollectedSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="invoiced" name="Invoiced" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
              <Line dataKey="collected" name="Collected" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="GST: output vs input credit" description="Tax on sales vs tax on purchases">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={a.gstSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="output" name="Output GST" fill={COLOR_REVENUE} radius={[3, 3, 0, 0]} />
              <Bar dataKey="input" name="Input credit" fill={COLOR_COST} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-2xs">CGST {formatINRCompact(a.gstOutputBreakdown.cgst)}</Badge>
            <Badge variant="outline" className="text-2xs">SGST {formatINRCompact(a.gstOutputBreakdown.sgst)}</Badge>
            <Badge variant="outline" className="text-2xs">IGST {formatINRCompact(a.gstOutputBreakdown.igst)}</Badge>
          </div>
        </ChartCard>

        <ChartCard title="Invoice status mix" description="Amount by lifecycle status">
          {a.statusMix.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No documents in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, a.statusMix.length * 30)}>
              <BarChart data={a.statusMix} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" width={72} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="amount" name="Amount" radius={[0, 3, 3, 0]}>
                  {a.statusMix.map((s, i) => (
                    <Cell key={s.status} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top customers" description="By amount invoiced in range">
          {a.topCustomers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No documents in range.</p>
          ) : (
            <div className="space-y-2">
              {a.topCustomers.map((c, i) => (
                <div key={c.customerId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-muted-foreground">{i + 1}</span>
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground">({c.count})</span>
                  </span>
                  <span className="font-medium tabular-nums">{formatINRCompact(c.invoiced)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Payment modes" description="How customers pay (cash in, range)" className="lg:col-span-2">
          {a.paymentModes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No incoming payments in range.</p>
          ) : (
            <div className="flex items-center">
              <ResponsiveContainer width="40%" height={200}>
                <PieChart>
                  <Pie
                    data={a.paymentModes}
                    dataKey="amount"
                    nameKey="mode"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {a.paymentModes.map((m, i) => (
                      <Cell key={m.mode} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {a.paymentModes.map((m, i) => (
                  <div key={m.mode} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="truncate">{m.mode}</span>
                      <span className="text-xs text-muted-foreground">({m.count})</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatINRCompact(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

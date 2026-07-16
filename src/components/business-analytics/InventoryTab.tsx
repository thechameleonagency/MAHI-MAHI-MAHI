import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
import { formatINR, formatINRChartAxis, formatINRCompact } from "@/lib/formatCurrency";
import type { InventoryItem, Project, SiteRecord, Tool } from "@/types/project";
import type { InventoryMetrics } from "@/lib/analytics";
import {
  bucketKey,
  bucketLabel,
  computeInventoryOpsAnalytics,
  listBucketKeys,
  parseIsoDate,
  type BusinessGranularity,
  type BusinessWindow,
  type InventoryRateAnalytics,
} from "@/lib/analytics/business";
import {
  ChartCard,
  CHART_COLORS,
  COLOR_PRIMARY,
  COLOR_DESTRUCTIVE,
  COLOR_SUCCESS,
  COLOR_WARNING,
  MetricTiles,
  TrendBadge,
} from "./ChartCard";

const RATE_TREND_ITEMS = 4;

const TOOL_STATUS_COLOR: Record<string, string> = {
  "In Use": COLOR_PRIMARY,
  Available: COLOR_SUCCESS,
  "Under Repair": COLOR_WARNING,
  Retired: COLOR_DESTRUCTIVE,
};

export function InventoryTab({
  rates,
  inventory,
  inventoryItems,
  tools,
  sites,
  projects,
  window,
  granularity,
}: {
  rates: InventoryRateAnalytics;
  inventory: InventoryMetrics;
  inventoryItems: InventoryItem[];
  tools: Tool[];
  sites: SiteRecord[];
  projects: Project[];
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const ops = useMemo(
    () =>
      computeInventoryOpsAnalytics(
        inventoryItems,
        tools,
        sites,
        projects,
        window,
        granularity,
        categoryFilter,
      ),
    [inventoryItems, tools, sites, projects, window, granularity, categoryFilter],
  );

  const stockChangePct = useMemo(() => {
    const s = ops.stockValueSeries;
    if (s.length < 2) return null;
    const prev = s[s.length - 2].value;
    const last = s[s.length - 1].value;
    if (prev === 0) return last === 0 ? 0 : null;
    return Math.round(((last - prev) / Math.abs(prev)) * 100);
  }, [ops.stockValueSeries]);
  // Merge the most-purchased items' rates into one multi-line dataset
  // (average rate per bucket; gaps stay undefined so lines connect).
  const rateTrend = useMemo(() => {
    const items = rates.topItems.filter((i) => i.purchases >= 2).slice(0, RATE_TREND_ITEMS);
    if (items.length === 0) return { data: [], names: [] as string[] };
    const keys = listBucketKeys(window, granularity);
    const data = keys.map((key) => {
      const row: Record<string, string | number | undefined> = {
        key,
        label: bucketLabel(key, granularity),
      };
      for (const item of items) {
        const inBucket = item.points.filter((p) => {
          const d = parseIsoDate(p.date);
          return d ? bucketKey(d, granularity) === key : false;
        });
        if (inBucket.length > 0) {
          row[item.name] = Math.round(inBucket.reduce((s, p) => s + p.rate, 0) / inBucket.length);
        }
      }
      return row;
    });
    return { data, names: items.map((i) => i.name) };
  }, [rates.topItems, window, granularity]);

  const topMovers = rates.movers.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-8 w-[190px] text-xs">
            <SelectValue placeholder="Material category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All material categories</SelectItem>
            {ops.categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Category filter applies to stock value and consumption cards.
        </p>
      </div>

      <MetricTiles
        tiles={[
          { label: "Stock value (cost)", value: formatINRCompact(inventory.stockValueCost) },
          { label: "Stock value (sale)", value: formatINRCompact(inventory.stockValueSale) },
          { label: "On-hand units", value: inventory.onHandUnits },
          { label: "Reserved qty", value: inventory.reservationQty },
          { label: "Consumption (range)", value: formatINRCompact(ops.consumptionValue) },
          { label: "Procurement (range)", value: formatINRCompact(rates.totalSpend), sub: `${rates.billCount} bills` },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Stock value over time"
          description="Reconstructed from item movement history (at buy price)"
          action={<TrendBadge pct={stockChangePct} />}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ops.stockValueSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Area
                dataKey="value"
                name="Stock value"
                stroke={COLOR_PRIMARY}
                fill={COLOR_PRIMARY}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-muted-foreground">
            Net change in range: {ops.stockValueChangeInPeriod >= 0 ? "+" : ""}
            {formatINRCompact(ops.stockValueChangeInPeriod)}
          </p>
        </ChartCard>

        <ChartCard
          title="Stock value change per period"
          description="Purchases and returns add; issues to sites consume"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ops.stockValueSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="change" name="Net change" radius={[3, 3, 0, 0]}>
                {ops.stockValueSeries.map((p) => (
                  <Cell key={p.key} fill={p.change >= 0 ? COLOR_SUCCESS : COLOR_DESTRUCTIVE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Consumption by category"
          description="Material issued to sites, with ₹/kW intensity"
        >
          {ops.consumptionByCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No material issues recorded in range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(140, ops.consumptionByCategory.length * 26)}>
                <BarChart data={ops.consumptionByCategory} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" name="Consumed ₹" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {ops.consumptionByCategory.slice(0, 6).map((c) => (
                  <div key={c.category} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">{c.category}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.siteCount} sites{c.valuePerKw !== null ? ` · ${formatINRCompact(c.valuePerKw)}/kW` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <ChartCard title="Consumption by site" description="Where materials went (top 12)">
          {ops.consumptionBySite.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No material issues recorded in range.
            </p>
          ) : (
            <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
              {ops.consumptionBySite.map((s) => (
                <div
                  key={s.site}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.site}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.qty} units{s.kw ? ` · ${s.kw} kW site` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">{formatINRCompact(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Tools fleet" description="Status, condition, and utilisation of tools">
        <div className="grid gap-4 lg:grid-cols-3">
          <MetricTiles
            className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-2"
            tiles={[
              { label: "Tools", value: ops.toolCount },
              { label: "Fleet value", value: formatINRCompact(ops.toolFleetValue) },
              { label: "Utilisation", value: `${ops.toolUtilizationPct}%`, sub: "in use / not retired" },
              {
                label: "Under repair",
                value: ops.toolStatusMix.find((s) => s.status === "Under Repair")?.count ?? 0,
              },
            ]}
          />
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">By status</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={ops.toolStatusMix}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={62}
                  paddingAngle={2}
                >
                  {ops.toolStatusMix.map((s, i) => (
                    <Cell key={s.status} fill={TOOL_STATUS_COLOR[s.status] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1.5">
              {ops.toolStatusMix.map((s) => (
                <Badge key={s.status} variant="outline" className="text-2xs">
                  {s.status}: {s.count}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">By condition</p>
            <ResponsiveContainer width="100%" height={Math.max(120, ops.toolConditionMix.length * 32)}>
              <BarChart data={ops.toolConditionMix} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="condition" width={68} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Tools" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Buy-rate trends"
          description="Average purchase rate per period, from vendor bill lines"
        >
          {rateTrend.names.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Not enough repeat purchases in range to chart rate trends.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rateTrend.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {rateTrend.names.map((name, i) => (
                  <Line
                    key={name}
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Biggest rate movers" description="% change first → last purchase in range">
          {topMovers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No items with rate changes in range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(160, topMovers.length * 26)}>
                <BarChart data={topMovers} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Rate change"]} />
                  <Bar dataKey="changePct" radius={[0, 3, 3, 0]}>
                    {topMovers.map((m) => (
                      <Cell key={m.key} fill={m.changePct > 0 ? COLOR_DESTRUCTIVE : COLOR_SUCCESS} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {topMovers.slice(0, 6).map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">{m.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatINR(m.firstRate)} → {formatINR(m.lastRate)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-2xs ${
                        m.changePct > 0
                          ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {m.changePct > 0 ? "+" : ""}
                      {m.changePct}%
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Procurement spend" description="Vendor bill totals per period">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rates.spendSeries}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(v: number) => formatINR(v)} />
            <Bar dataKey="value" name="Spend" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

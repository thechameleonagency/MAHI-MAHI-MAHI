import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import type { Project, Quotation } from "@/types/project";
import { formatINRCompact } from "@/lib/formatCurrency";
import {
  buildTimeSeries,
  computeGeoAnalytics,
  parseIsoDate,
  parseKw,
  type BusinessGranularity,
  type BusinessWindow,
} from "@/lib/analytics/business";
import type { OperationsMetrics } from "@/lib/analytics";
import { ChartCard, CHART_COLORS, COLOR_PRIMARY, COLOR_SUCCESS, MetricTiles } from "./ChartCard";

const GROWTH_BADGE: Record<string, string> = {
  new: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  growing: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  flat: "text-muted-foreground",
  declining: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function ProjectsGeoTab({
  projects,
  quotations,
  operations,
  window,
  granularity,
}: {
  projects: Project[];
  quotations: Quotation[];
  operations: OperationsMetrics;
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          !p.archivedAt &&
          (typeFilter === "all" || p.projectType === typeFilter) &&
          (statusFilter === "all" || p.lifecycleStatus === statusFilter),
      ),
    [projects, typeFilter, statusFilter],
  );

  const geo = useMemo(
    () => computeGeoAnalytics(filtered, quotations, window),
    [filtered, quotations, window],
  );

  const kwTrend = useMemo(
    () =>
      buildTimeSeries(
        filtered,
        (p) => p.startDate || p.createdAt,
        window,
        granularity,
        (p) => parseKw(p.capacity),
      ),
    [filtered, window, granularity],
  );

  const typeMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of filtered) {
      const t = p.projectType || "Other";
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const durationStats = useMemo(() => {
    const days: number[] = [];
    for (const p of filtered) {
      if (p.lifecycleStatus !== "Completed" || !p.startDate || !p.endDate) continue;
      const s = parseIsoDate(p.startDate);
      const e = parseIsoDate(p.endDate);
      if (!s || !e || e < s) continue;
      days.push(Math.round((e.getTime() - s.getTime()) / 86_400_000));
    }
    if (!days.length) return null;
    days.sort((a, b) => a - b);
    return {
      count: days.length,
      avg: Math.round(days.reduce((a, b) => a + b, 0) / days.length),
      min: days[0],
      max: days[days.length - 1],
    };
  }, [filtered]);

  const topAreas = geo.areas.slice(0, 10);
  const totalKw = Math.round(filtered.reduce((s, p) => s + parseKw(p.capacity), 0) * 100) / 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Project type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Residential">Residential</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
            <SelectItem value="Industrial">Industrial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="On Hold">On Hold</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MetricTiles
        tiles={[
          { label: "Projects (range)", value: geo.withPincode + geo.withoutPincode },
          { label: "kW in range", value: totalKw },
          { label: "Areas covered", value: geo.areas.length },
          { label: "Top area", value: geo.top?.pincode ?? "—", sub: geo.top ? `${geo.top.projects} projects` : undefined },
          {
            label: "Growing area",
            value: geo.fastestGrowing?.pincode ?? "—",
            sub: geo.fastestGrowing ? `${geo.fastestGrowing.recentCount} recent` : undefined,
          },
          { label: "No pincode found", value: geo.withoutPincode },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Coverage by pincode"
          description="Projects per area (top 10) with growth signal"
        >
          {topAreas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pincodes found in project locations for this range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(160, topAreas.length * 28)}>
                <BarChart data={topAreas} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="pincode" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name === "projects" ? "Projects" : name]}
                  />
                  <Bar dataKey="projects" name="Projects" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {topAreas.map((a) => (
                  <div key={a.pincode} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium tabular-nums">{a.pincode}</span>
                    <span className="text-muted-foreground">
                      {a.totalKw} kW · {formatINRCompact(a.contractValue)}
                    </span>
                    <Badge variant="outline" className={`text-2xs ${GROWTH_BADGE[a.growth]}`}>
                      {a.growth}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        <div className="space-y-4">
          <ChartCard title="Project type mix">
            {typeMix.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No projects in range.</p>
            ) : (
              <div className="flex items-center">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie
                      data={typeMix}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {typeMix.map((t, i) => (
                        <Cell key={t.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {typeMix.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                        {t.name}
                      </span>
                      <span className="font-medium tabular-nums">{t.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Project duration" description="Completed projects, start → end">
            {durationStats ? (
              <MetricTiles
                className="lg:grid-cols-4 sm:grid-cols-4 grid-cols-2"
                tiles={[
                  { label: "Completed", value: durationStats.count },
                  { label: "Avg days", value: durationStats.avg },
                  { label: "Fastest", value: `${durationStats.min}d` },
                  { label: "Slowest", value: `${durationStats.max}d` },
                ]}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed projects with start and end dates in range.
              </p>
            )}
          </ChartCard>
        </div>
      </div>

      <ChartCard title="kW installed over time" description="Capacity of projects started per period">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={kwTrend}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={40} />
            <Tooltip formatter={(v: number) => [`${v} kW`, "Capacity"]} />
            <Area
              dataKey="value"
              name="kW"
              stroke={COLOR_SUCCESS}
              fill={COLOR_SUCCESS}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <MetricTiles
        tiles={[
          { label: "Active / draft", value: (operations.lifecycleCounts.Active ?? 0) + (operations.lifecycleCounts.Draft ?? 0) },
          { label: "Completed (all)", value: operations.lifecycleCounts.Completed ?? 0 },
          { label: "Site ready", value: operations.siteReadinessReady },
          { label: "Site not ready", value: operations.siteReadinessPending },
          { label: "Installs (7d)", value: operations.installsNext7 },
          { label: "Damage ₹ (period)", value: formatINRCompact(operations.damageLossInPeriod) },
        ]}
      />
    </div>
  );
}

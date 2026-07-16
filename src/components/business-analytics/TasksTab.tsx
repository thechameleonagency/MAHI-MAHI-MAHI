import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
import type { Task } from "@/types/project";
import type { Blockage } from "@/types/blockage";
import type { ScheduledInstallation, SiteVisit } from "@/types/operations";
import {
  computeTaskAnalytics,
  type BusinessGranularity,
  type BusinessWindow,
} from "@/lib/analytics/business";
import {
  ChartCard,
  CHART_COLORS,
  COLOR_DESTRUCTIVE,
  COLOR_PRIMARY,
  COLOR_SUCCESS,
  COLOR_WARNING,
  MetricTiles,
} from "./ChartCard";

const STATUS_LABELS: Record<string, string> = {
  created: "Created",
  sent: "Sent",
  checked: "Checked",
  started: "Started",
  done: "Done",
};

export function TasksTab({
  tasks,
  scheduledInstallations,
  siteVisits,
  blockages,
  window,
  granularity,
}: {
  tasks: Task[];
  scheduledInstallations: ScheduledInstallation[];
  siteVisits: SiteVisit[];
  blockages: Blockage[];
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [workTypeFilter, setWorkTypeFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");

  const workTypes = useMemo(
    () => [...new Set(tasks.map((t) => t.workType?.trim()).filter(Boolean))].sort(),
    [tasks],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (workTypeFilter !== "all" && t.workType?.trim() !== workTypeFilter) return false;
        if (assignmentFilter === "team" && !t.teamId) return false;
        if (assignmentFilter === "individual" && (!t.employeeId || t.teamId)) return false;
        if (assignmentFilter === "unassigned" && (t.employeeId || t.teamId)) return false;
        return true;
      }),
    [tasks, workTypeFilter, assignmentFilter],
  );

  const a = useMemo(
    () =>
      computeTaskAnalytics(
        filteredTasks,
        scheduledInstallations,
        siteVisits,
        blockages,
        window,
        granularity,
      ),
    [filteredTasks, scheduledInstallations, siteVisits, blockages, window, granularity],
  );

  const throughput = a.createdTrend.map((c, i) => ({
    label: c.label,
    created: c.value,
    completed: a.completedTrend[i]?.value ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue placeholder="Work type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All work types</SelectItem>
            {workTypes.map((w) => (
              <SelectItem key={w} value={w!}>
                {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Assignment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignments</SelectItem>
            <SelectItem value="team">Team tasks</SelectItem>
            <SelectItem value="individual">Individual tasks</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <MetricTiles
        tiles={[
          { label: "Tasks (range)", value: a.total },
          { label: "Completed", value: `${a.completionPct}%`, sub: `${a.done} done` },
          { label: "Overdue", value: a.overdue },
          { label: "Delayed at least once", value: a.delayedCount, sub: a.avgDelayDays !== null ? `avg ${a.avgDelayDays}d slip` : undefined },
          { label: "Team vs individual", value: `${a.teamAssigned} / ${a.individualAssigned}`, sub: `${a.unassigned} unassigned` },
          { label: "Site visits", value: a.siteVisitCount },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Task throughput" description="Created vs completed per period">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={throughput}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="created" name="Created" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill={COLOR_SUCCESS} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status mix" description="Current status of tasks in range">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={a.statusMix.map((s) => ({ ...s, name: STATUS_LABELS[s.status] ?? s.status }))}
              layout="vertical"
              margin={{ left: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Tasks" radius={[0, 3, 3, 0]}>
                {a.statusMix.map((s, i) => (
                  <Cell
                    key={s.status}
                    fill={s.status === "done" ? COLOR_SUCCESS : CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Work types" description="Volume and completion per work type">
          {a.workTypes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tasks in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, a.workTypes.length * 26)}>
              <BarChart data={a.workTypes} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="type" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" name="Done" stackId="w" fill={COLOR_SUCCESS} />
                <Bar
                  dataKey={(row: { total: number; done: number }) => row.total - row.done}
                  name="Open"
                  stackId="w"
                  fill={COLOR_WARNING}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Busiest sites" description="Tasks per site (top 12)">
          {a.perSite.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No tasks in range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, a.perSite.length * 26)}>
              <BarChart data={a.perSite} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="site" width={120} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" name="Done" stackId="s" fill={COLOR_SUCCESS} />
                <Bar
                  dataKey={(row: { total: number; done: number }) => row.total - row.done}
                  name="Open"
                  stackId="s"
                  fill={COLOR_PRIMARY}
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Delay reasons" description="Why task dates were moved (from reschedule history)">
          {a.delayReasons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No task delays recorded in range.
            </p>
          ) : (
            <div className="space-y-2">
              {a.delayReasons.map((r) => (
                <div key={r.reason} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{r.reason}</span>
                  <Badge variant="outline">{r.count}</Badge>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                {a.totalDelayDays} total slip days across {a.delayedCount} delayed tasks.
              </p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Field operations" description="Installations, site visits, and blockages">
          <MetricTiles
            className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
            tiles={[
              ...a.installStatusMix.map((s) => ({
                label: `Installs ${s.status.replace("_", " ")}`,
                value: s.count,
              })),
              { label: "Blockages open", value: a.blockagesOpen },
              { label: "Blockages resolved", value: a.blockagesResolved },
              {
                label: "Avg resolution",
                value: a.avgBlockageResolutionDays !== null ? `${a.avgBlockageResolutionDays}d` : "—",
              },
            ]}
          />
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Site visits per period</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={a.siteVisitSeries}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                <Tooltip />
                <Area
                  dataKey="value"
                  name="Visits"
                  stroke={COLOR_PRIMARY}
                  fill={COLOR_PRIMARY}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {a.blockageReasons.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Top blockage causes</p>
              {a.blockageReasons.slice(0, 5).map((r) => (
                <div key={r.reason} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">{r.reason}</span>
                  <span className="font-medium tabular-nums">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

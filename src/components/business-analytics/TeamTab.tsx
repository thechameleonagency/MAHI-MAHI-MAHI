import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import type { AttendanceRecord, Employee, Task, Team } from "@/types/project";
import type { PeopleMetrics } from "@/lib/analytics";
import {
  computeEmployeeAnalytics,
  inWindow,
  type BusinessWindow,
  type PayrollAnalytics,
} from "@/lib/analytics/business";
import {
  ChartCard,
  COLOR_DESTRUCTIVE,
  COLOR_PRIMARY,
  COLOR_REVENUE,
  COLOR_SUCCESS,
  MetricTiles,
  TrendBadge,
} from "./ChartCard";

export function TeamTab({
  employees,
  tasks,
  attendance,
  payroll,
  people,
  teams,
  window,
}: {
  employees: Employee[];
  tasks: Task[];
  attendance: AttendanceRecord[];
  payroll: PayrollAnalytics;
  people: PeopleMetrics;
  teams: Team[];
  window: BusinessWindow;
}) {
  const analytics = useMemo(
    () => computeEmployeeAnalytics(employees, tasks, attendance, window),
    [employees, tasks, attendance, window],
  );

  const teamStats = useMemo(() => {
    const tasksInWindow = tasks.filter((t) => inWindow(t.workDate, window));
    return teams
      .map((team) => {
        const own = tasksInWindow.filter((t) => t.teamId === team.id);
        const done = own.filter((t) => t.status === "done").length;
        return {
          id: team.id,
          name: team.name,
          status: team.status,
          members: team.memberIds.length,
          total: own.length,
          done,
          open: own.length - done,
          completionPct: own.length ? Math.round((done / own.length) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [teams, tasks, window]);

  const [selectedId, setSelectedId] = useState<string>("");
  const review = useMemo(() => {
    const id = selectedId || analytics.leaderboard[0]?.employeeId || "";
    return analytics.reviews.find((r) => r.employeeId === id) ?? null;
  }, [analytics, selectedId]);

  const payrollTop = payroll.perEmployee.slice(0, 10);

  return (
    <div className="space-y-4">
      <MetricTiles
        tiles={[
          { label: "Active employees", value: people.totalActive },
          { label: "Attendance rate", value: `${Math.round(people.attendanceRate * 100)}%` },
          { label: "Tasks done (range)", value: people.tasksDoneInRange },
          { label: "Tasks open (range)", value: people.tasksOpenInRange },
          { label: "Salaries paid", value: formatINRCompact(payroll.totalPaid), sub: `${payroll.payoutCount} payouts` },
          { label: "Wallet outstanding", value: formatINRCompact(people.walletOutstanding) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Salaries paid"
          description="Net payroll per period"
          action={<TrendBadge pct={payroll.trend} invert />}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={payroll.paidSeries}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="value" name="Paid" fill={COLOR_REVENUE} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-2xs">
              Highest: {payroll.highest ? `${payroll.highest.name} · ${formatINRCompact(payroll.highest.total)}` : "—"}
            </Badge>
            <Badge variant="outline" className="text-2xs">
              Avg / employee: {formatINRCompact(payroll.avgPerEmployee)}
            </Badge>
            <Badge variant="outline" className="text-2xs">
              {payroll.employeesPaid} employees paid
            </Badge>
          </div>
        </ChartCard>

        <ChartCard title="Salary totals per employee" description="Top 10 by net amount in range">
          {payrollTop.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payroll records in range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, payrollTop.length * 26)}>
              <BarChart data={payrollTop} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={formatINRChartAxis} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatINR(v)} />
                <Bar dataKey="total" name="Net paid" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Teams workload" description="Tasks per team in range, with completion">
        {teamStats.filter((t) => t.total > 0).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No team-assigned tasks in range.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <ResponsiveContainer
              width="100%"
              height={Math.max(140, teamStats.filter((t) => t.total > 0).length * 30)}
            >
              <BarChart
                data={teamStats.filter((t) => t.total > 0)}
                layout="vertical"
                margin={{ left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" name="Done" stackId="t" fill={COLOR_SUCCESS} />
                <Bar dataKey="open" name="Open" stackId="t" fill={COLOR_PRIMARY} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {teamStats.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {t.name}
                      {t.status !== "Active" && (
                        <span className="text-xs text-muted-foreground"> (inactive)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.members} members</span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {t.done}/{t.total} · {t.completionPct}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Team leaderboard"
          description="Avg monthly score: 45% completion + 35% attendance + 20% on-time"
          className="lg:col-span-1"
        >
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {analytics.leaderboard.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity in range.</p>
            )}
            {analytics.leaderboard.map((e, i) => (
              <button
                key={e.employeeId}
                type="button"
                onClick={() => setSelectedId(e.employeeId)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                  review?.employeeId === e.employeeId
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 text-sm font-medium text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block text-xs text-muted-foreground">{e.totalDone} tasks done</span>
                  </span>
                </span>
                <Badge variant="outline">{e.avgScore}</Badge>
              </button>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title={review ? `Monthly review — ${review.name}` : "Monthly review"}
          description="Score trend with best / worst month"
          className="lg:col-span-2"
          action={
            <Select
              value={review?.employeeId ?? ""}
              onValueChange={setSelectedId}
            >
              <SelectTrigger className="h-7 w-[160px] text-xs">
                <SelectValue placeholder="Pick employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={String(e.id)} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          {!review ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select an employee to see their month-by-month review.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  Best month: {review.best ? `${review.best.label} (${review.best.score})` : "—"}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                >
                  Worst month: {review.worst ? `${review.worst.label} (${review.worst.score})` : "—"}
                </Badge>
                <Badge variant="outline">Avg score: {review.avgScore}</Badge>
                <Badge variant="outline">
                  {review.totalDone}/{review.totalAssigned} tasks · {review.totalDelayed} delayed
                </Badge>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={review.months}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Line dataKey="score" name="Score" stroke={COLOR_PRIMARY} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={review.months}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="done" name="Done" stackId="t" fill={COLOR_SUCCESS} />
                  <Bar dataKey="delayed" name="Delayed" stackId="t" fill={COLOR_DESTRUCTIVE} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-1.5">
                {review.months.map((m) => (
                  <div
                    key={m.month}
                    title={`${m.label}: attendance ${m.attendancePct ?? "—"}%`}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span
                      className={`h-6 w-8 rounded-sm ${
                        m.attendancePct === null
                          ? "bg-muted"
                          : m.attendancePct >= 90
                            ? "bg-emerald-500/80"
                            : m.attendancePct >= 70
                              ? "bg-amber-500/80"
                              : "bg-rose-500/80"
                      }`}
                    />
                    <span className="text-2xs text-muted-foreground">{m.label.split(" ")[0]}</span>
                  </div>
                ))}
                <span className="ml-2 self-center text-2xs text-muted-foreground">
                  Attendance heat (green ≥90%, amber ≥70%)
                </span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

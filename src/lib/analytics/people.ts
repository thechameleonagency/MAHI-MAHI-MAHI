import type { AnalyticsSlices, MetricRow } from "./types";

export interface PeopleMetrics {
  totalActive: number;
  totalInactive: number;
  totalTerminated: number;
  tasksDoneInRange: number;
  tasksOpenInRange: number;
  tasksByEmployee: Array<{ employeeId: number; name: string; done: number; open: number }>;
  attendanceRate: number;
  payrollPerProject: Record<string, number>;
  walletOutstanding: number;
  blockagesByReason: Array<{ reason: string; count: number }>;
  avgBlockageResolutionDays: number | null;
  summaryRows: MetricRow[];
}

const inRange = (iso: string | undefined, from: Date, to: Date) => {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t >= from.getTime() && t <= to.getTime();
};

export function computePeopleMetrics(
  slices: AnalyticsSlices,
  from: Date,
  to: Date,
): PeopleMetrics {
  const employees = slices.employees ?? [];
  const tasks = slices.tasks ?? [];
  const attendance = slices.attendanceRecords ?? [];
  const payroll = slices.payrollRecords ?? [];
  const wallet = slices.walletLedger ?? [];
  const blockages = slices.blockages ?? [];

  const totalActive = employees.filter((e) => e.status === "Active" && !e.terminatedAt).length;
  const totalTerminated = employees.filter((e) => !!e.terminatedAt).length;
  const totalInactive = employees.filter((e) => e.status === "Inactive" && !e.terminatedAt).length;

  const tasksInRange = tasks.filter((t) => inRange(t.workDate, from, to));
  const tasksDoneInRange = tasksInRange.filter((t) => t.status === "done").length;
  const tasksOpenInRange = tasksInRange.length - tasksDoneInRange;

  const tasksByEmployee = employees.map((e) => {
    const own = tasksInRange.filter((t) => t.employeeId === e.id);
    return {
      employeeId: e.id,
      name: e.name,
      done: own.filter((t) => t.status === "done").length,
      open: own.filter((t) => t.status !== "done").length,
    };
  });

  const attendanceInRange = attendance.filter((a) => inRange(a.date, from, to));
  const presentCount = attendanceInRange.filter((a) => a.status === "present" || a.status === "half-day").length;
  const attendanceRate = attendanceInRange.length > 0 ? presentCount / attendanceInRange.length : 0;

  const payrollPerProject: Record<string, number> = {};
  for (const rec of payroll) {
    const projectKey = (rec as { projectId?: string }).projectId ?? "unassigned";
    payrollPerProject[projectKey] = (payrollPerProject[projectKey] ?? 0) + (rec.netAmount ?? 0);
  }

  const walletOutstanding = wallet.reduce((sum, w) => {
    if (w.kind === "advance") return sum + (w.amount ?? 0);
    if (w.kind === "recovery") return sum - (w.amount ?? 0);
    return sum;
  }, 0);

  const reasonCounts = new Map<string, number>();
  let resolutionTotalDays = 0;
  let resolvedCount = 0;
  for (const b of blockages) {
    const reasonKey = (b.reason || "Unspecified").trim() || "Unspecified";
    reasonCounts.set(reasonKey, (reasonCounts.get(reasonKey) ?? 0) + 1);
    if (b.resolvedAt && b.createdAt) {
      const days = (Date.parse(b.resolvedAt) - Date.parse(b.createdAt)) / 86_400_000;
      if (Number.isFinite(days) && days >= 0) {
        resolutionTotalDays += days;
        resolvedCount++;
      }
    }
  }
  const blockagesByReason = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const avgBlockageResolutionDays = resolvedCount > 0 ? resolutionTotalDays / resolvedCount : null;

  const summaryRows: MetricRow[] = [
    { label: "Active employees", value: totalActive },
    { label: "Inactive", value: totalInactive },
    { label: "Terminated", value: totalTerminated },
    { label: "Tasks done (range)", value: tasksDoneInRange },
    { label: "Tasks open (range)", value: tasksOpenInRange },
    { label: "Attendance rate", value: `${Math.round(attendanceRate * 100)}%` },
    { label: "Wallet outstanding", value: `₹${walletOutstanding.toLocaleString("en-IN")}` },
    {
      label: "Avg blockage resolution",
      value: avgBlockageResolutionDays != null ? `${avgBlockageResolutionDays.toFixed(1)}d` : "—",
    },
  ];

  return {
    totalActive,
    totalInactive,
    totalTerminated,
    tasksDoneInRange,
    tasksOpenInRange,
    tasksByEmployee,
    attendanceRate,
    payrollPerProject,
    walletOutstanding,
    blockagesByReason,
    avgBlockageResolutionDays,
    summaryRows,
  };
}

/**
 * Per-employee month-by-month review: tasks done, on-time vs delayed,
 * attendance %, and a composite monthly score with best/worst month callouts.
 */
import { addMonths, format, startOfMonth } from "date-fns";
import type { AttendanceRecord, Employee, Task } from "@/types/project";
import { getEmployeeAttendanceCounts } from "@/lib/employeeAggregates";
import { inWindow, parseIsoDate, type BusinessWindow } from "./timeBuckets";

export interface EmployeeMonthStat {
  month: string; // yyyy-MM
  label: string; // "Jan 26"
  assigned: number;
  done: number;
  delayed: number;
  attendancePct: number | null;
  /** 0–100: 45% task completion, 35% attendance, 20% on-time delivery. */
  score: number;
  hasActivity: boolean;
}

export interface EmployeeReview {
  employeeId: string;
  name: string;
  months: EmployeeMonthStat[];
  best: EmployeeMonthStat | null;
  worst: EmployeeMonthStat | null;
  avgScore: number;
  totalAssigned: number;
  totalDone: number;
  totalDelayed: number;
}

export interface EmployeeAnalytics {
  reviews: EmployeeReview[];
  leaderboard: { employeeId: string; name: string; avgScore: number; totalDone: number }[];
}

function listMonths(window: BusinessWindow): string[] {
  const months: string[] = [];
  let cursor = startOfMonth(window.from);
  while (cursor <= window.to && months.length < 60) {
    months.push(format(cursor, "yyyy-MM"));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/** Weighted average over available components; missing components drop out. */
function monthScore(
  completionPct: number | null,
  attendancePct: number | null,
  onTimePct: number | null,
): number {
  const parts: { value: number; weight: number }[] = [];
  if (completionPct !== null) parts.push({ value: completionPct, weight: 0.45 });
  if (attendancePct !== null) parts.push({ value: attendancePct, weight: 0.35 });
  if (onTimePct !== null) parts.push({ value: onTimePct, weight: 0.2 });
  if (parts.length === 0) return 0;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);
}

export function computeEmployeeAnalytics(
  employees: Employee[],
  tasks: Task[],
  attendance: AttendanceRecord[],
  window: BusinessWindow,
): EmployeeAnalytics {
  const months = listMonths(window);
  const tasksInWindow = tasks.filter((t) => inWindow(t.workDate, window));

  const reviews: EmployeeReview[] = employees.map((emp) => {
    const empId = String(emp.id);
    const own = tasksInWindow.filter((t) => String(t.employeeId ?? "") === empId);

    const monthStats: EmployeeMonthStat[] = months.map((month) => {
      const monthTasks = own.filter((t) => {
        const d = parseIsoDate(t.workDate);
        return d ? format(d, "yyyy-MM") === month : false;
      });
      const assigned = monthTasks.length;
      const done = monthTasks.filter((t) => t.status === "done").length;
      const delayed = monthTasks.filter((t) => (t.delayHistory?.length ?? 0) > 0).length;
      const att = getEmployeeAttendanceCounts(empId, attendance, month);
      const attTotal = att.daysPresent + att.daysAbsent;
      const attendancePct = attTotal > 0 ? Math.round((att.daysPresent / attTotal) * 100) : null;
      const completionPct = assigned > 0 ? Math.round((done / assigned) * 100) : null;
      const onTimePct = assigned > 0 ? Math.round(((assigned - delayed) / assigned) * 100) : null;
      return {
        month,
        label: format(parseIsoDate(`${month}-01`) ?? new Date(), "MMM yy"),
        assigned,
        done,
        delayed,
        attendancePct,
        score: monthScore(completionPct, attendancePct, onTimePct),
        hasActivity: assigned > 0 || attTotal > 0,
      };
    });

    const active = monthStats.filter((m) => m.hasActivity);
    const best = active.length
      ? active.reduce((a, b) => (b.score > a.score ? b : a))
      : null;
    const worst = active.length > 1
      ? active.reduce((a, b) => (b.score < a.score ? b : a))
      : null;
    const avgScore = active.length
      ? Math.round(active.reduce((s, m) => s + m.score, 0) / active.length)
      : 0;

    return {
      employeeId: empId,
      name: emp.name,
      months: monthStats,
      best,
      worst,
      avgScore,
      totalAssigned: own.length,
      totalDone: own.filter((t) => t.status === "done").length,
      totalDelayed: own.filter((t) => (t.delayHistory?.length ?? 0) > 0).length,
    };
  });

  const leaderboard = reviews
    .filter((r) => r.totalAssigned > 0 || r.avgScore > 0)
    .map((r) => ({
      employeeId: r.employeeId,
      name: r.name,
      avgScore: r.avgScore,
      totalDone: r.totalDone,
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.totalDone - a.totalDone);

  return { reviews, leaderboard };
}

/**
 * Task & field-operations analytics: throughput, delays, work types,
 * per-site load, plus installations, site visits, and blockages.
 */
import type { Task } from "@/types/project";
import type { Blockage } from "@/types/blockage";
import type { ScheduledInstallation, SiteVisit } from "@/types/operations";
import {
  buildTimeSeries,
  inWindow,
  parseIsoDate,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

export interface TaskAnalytics {
  total: number;
  done: number;
  open: number;
  overdue: number;
  completionPct: number;
  statusMix: { status: string; count: number }[];
  workTypes: { type: string; total: number; done: number }[];
  perSite: { site: string; total: number; done: number }[];
  createdTrend: SeriesPoint[];
  completedTrend: SeriesPoint[];
  teamAssigned: number;
  individualAssigned: number;
  unassigned: number;
  // Delays (from task delayHistory audit trail)
  delayedCount: number;
  totalDelayDays: number;
  avgDelayDays: number | null;
  delayReasons: { reason: string; count: number }[];
  // Operations
  installStatusMix: { status: string; count: number }[];
  siteVisitSeries: SeriesPoint[];
  siteVisitCount: number;
  blockagesOpen: number;
  blockagesResolved: number;
  avgBlockageResolutionDays: number | null;
  blockageReasons: { reason: string; count: number }[];
}

const TASK_STATUSES = ["created", "sent", "checked", "started", "done"] as const;

function delayDays(from: string, to: string): number {
  const a = parseIsoDate(from);
  const b = parseIsoDate(to);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export function computeTaskAnalytics(
  tasks: Task[],
  scheduledInstallations: ScheduledInstallation[],
  siteVisits: SiteVisit[],
  blockages: Blockage[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
  now: Date = new Date(),
): TaskAnalytics {
  const inPeriod = tasks.filter((t) => inWindow(t.workDate, window));
  const done = inPeriod.filter((t) => t.status === "done");
  const todayIso = now.toISOString().slice(0, 10);
  const overdue = inPeriod.filter(
    (t) => t.status !== "done" && t.workDate.slice(0, 10) < todayIso,
  ).length;

  const statusMix = TASK_STATUSES.map((status) => ({
    status,
    count: inPeriod.filter((t) => t.status === status).length,
  })).filter((s) => s.count > 0);

  const typeMap = new Map<string, { total: number; done: number }>();
  for (const t of inPeriod) {
    const key = t.workType?.trim() || "Other";
    const entry = typeMap.get(key) ?? { total: 0, done: 0 };
    entry.total++;
    if (t.status === "done") entry.done++;
    typeMap.set(key, entry);
  }
  const workTypes = [...typeMap.entries()]
    .map(([type, v]) => ({ type, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const siteMap = new Map<string, { total: number; done: number }>();
  for (const t of inPeriod) {
    const key = t.siteName?.trim() || t.siteId || "Unknown site";
    const entry = siteMap.get(key) ?? { total: 0, done: 0 };
    entry.total++;
    if (t.status === "done") entry.done++;
    siteMap.set(key, entry);
  }
  const perSite = [...siteMap.entries()]
    .map(([site, v]) => ({ site, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  // Delay analysis: every delayHistory entry is one reschedule.
  let delayedCount = 0;
  let totalDelayDays = 0;
  const reasonMap = new Map<string, number>();
  for (const t of inPeriod) {
    const history = t.delayHistory ?? [];
    if (history.length === 0) continue;
    delayedCount++;
    for (const h of history) {
      totalDelayDays += delayDays(h.from, h.to);
      const reason = h.reason?.trim() || "Unspecified";
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    }
  }
  const delayReasons = [...reasonMap.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const installsInPeriod = scheduledInstallations.filter((s) =>
    inWindow(s.scheduledDate, window),
  );
  const installStatusMap = new Map<string, number>();
  for (const s of installsInPeriod) {
    installStatusMap.set(s.status, (installStatusMap.get(s.status) ?? 0) + 1);
  }

  const visitsInPeriod = siteVisits.filter((v) => inWindow(v.visitDate, window));

  const blocksInPeriod = blockages.filter((b) => inWindow(b.createdAt, window));
  const resolved = blocksInPeriod.filter((b) => b.status === "resolved");
  let resolutionTotal = 0;
  let resolutionCount = 0;
  for (const b of resolved) {
    if (!b.resolvedAt) continue;
    const days = delayDays(b.createdAt, b.resolvedAt);
    resolutionTotal += days;
    resolutionCount++;
  }
  const blockReasonMap = new Map<string, number>();
  for (const b of blocksInPeriod) {
    const reason = b.reason?.trim() || "Unspecified";
    blockReasonMap.set(reason, (blockReasonMap.get(reason) ?? 0) + 1);
  }

  return {
    total: inPeriod.length,
    done: done.length,
    open: inPeriod.length - done.length,
    overdue,
    completionPct: inPeriod.length ? Math.round((done.length / inPeriod.length) * 100) : 0,
    statusMix,
    workTypes,
    perSite,
    createdTrend: buildTimeSeries(
      tasks.filter((t) => inWindow(t.createdDate, window)),
      (t) => t.createdDate,
      window,
      granularity,
    ),
    completedTrend: buildTimeSeries(done, (t) => t.workDate, window, granularity),
    teamAssigned: inPeriod.filter((t) => t.teamId).length,
    individualAssigned: inPeriod.filter((t) => t.employeeId && !t.teamId).length,
    unassigned: inPeriod.filter((t) => !t.employeeId && !t.teamId).length,
    delayedCount,
    totalDelayDays,
    avgDelayDays: delayedCount > 0 ? Math.round((totalDelayDays / delayedCount) * 10) / 10 : null,
    delayReasons,
    installStatusMix: [...installStatusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    siteVisitSeries: buildTimeSeries(visitsInPeriod, (v) => v.visitDate, window, granularity),
    siteVisitCount: visitsInPeriod.length,
    blockagesOpen: blocksInPeriod.filter((b) => b.status === "active").length,
    blockagesResolved: resolved.length,
    avgBlockageResolutionDays:
      resolutionCount > 0 ? Math.round((resolutionTotal / resolutionCount) * 10) / 10 : null,
    blockageReasons: [...blockReasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

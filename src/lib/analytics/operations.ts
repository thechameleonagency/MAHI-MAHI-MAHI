import { getProjectKind } from "@/lib/selectors";
import type { AnalyticsDateRange, AnalyticsSlices, MetricRow } from "./types";
import { addDays, inAnalyticsRange } from "./dateRange";

export interface OperationsMetrics {
  projectsByKind: Record<string, number>;
  lifecycleCounts: Record<string, number>;
  siteReadinessReady: number;
  siteReadinessPending: number;
  installsNext7: number;
  installsNext30: number;
  damageByStage: Record<string, number>;
  damageLossInPeriod: number;
  summaryRows: MetricRow[];
}

export function computeOperationsMetrics(
  slices: AnalyticsSlices,
  range: AnalyticsDateRange,
  now: Date = new Date(),
): OperationsMetrics {
  const { projects, scheduledInstallations = [], materialDamageRecords = [] } = slices;
  const today = now.toISOString().slice(0, 10);
  const in7 = addDays(today, 7);
  const in30 = addDays(today, 30);

  const projectsByKind: Record<string, number> = {};
  const lifecycleCounts: Record<string, number> = {};
  let siteReadinessReady = 0;
  let siteReadinessPending = 0;

  for (const p of projects) {
    const kind = getProjectKind(p);
    projectsByKind[kind] = (projectsByKind[kind] ?? 0) + 1;
    const life = p.lifecycleStatus ?? "Draft";
    lifecycleCounts[life] = (lifecycleCounts[life] ?? 0) + 1;
    if (p.siteReadiness?.ready) siteReadinessReady++;
    else siteReadinessPending++;
  }

  const activeSchedules = scheduledInstallations.filter(
    (s) => s.status === "scheduled" || s.status === "in_progress",
  );
  const installsNext7 = activeSchedules.filter(
    (s) => s.scheduledDate >= today && s.scheduledDate <= in7,
  ).length;
  const installsNext30 = activeSchedules.filter(
    (s) => s.scheduledDate >= today && s.scheduledDate <= in30,
  ).length;

  const damageInPeriod = materialDamageRecords.filter((d) =>
    inAnalyticsRange(d.reportedAt, range),
  );
  const damageByStage: Record<string, number> = {};
  let damageLossInPeriod = 0;
  for (const d of damageInPeriod) {
    damageByStage[d.stage] = (damageByStage[d.stage] ?? 0) + d.qty;
    damageLossInPeriod += d.costImpact ?? 0;
  }

  const summaryRows: MetricRow[] = [
    { label: "Active / draft projects", value: (lifecycleCounts.Active ?? 0) + (lifecycleCounts.Draft ?? 0) },
    { label: "Completed", value: lifecycleCounts.Completed ?? 0 },
    { label: "Site ready", value: siteReadinessReady },
    { label: "Site not ready", value: siteReadinessPending },
    { label: "Installs (7d)", value: installsNext7 },
    { label: "Installs (30d)", value: installsNext30 },
    { label: "Damage ₹ (period)", value: Math.round(damageLossInPeriod) },
  ];

  return {
    projectsByKind,
    lifecycleCounts,
    siteReadinessReady,
    siteReadinessPending,
    installsNext7,
    installsNext30,
    damageByStage,
    damageLossInPeriod,
    summaryRows,
  };
}

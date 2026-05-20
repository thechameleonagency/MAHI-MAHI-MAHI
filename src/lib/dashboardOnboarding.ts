import type { DashboardMetricKey } from "@/application/services/RoleDashboardService";

/** Core sales-motion tiles shown in the first KPI row for most roles. */
export const SALES_PIPELINE_METRICS: DashboardMetricKey[] = [
  "openEnquiries",
  "overdueFollowUps",
  "quotationsInFlight",
  "activeProjects",
];

/** Field-ops tiles for installation-focused roles. */
export const FIELD_OPS_METRICS: DashboardMetricKey[] = [
  "activeSites",
  "overdueTasks",
  "openBlockages",
  "procurementGaps",
];

export type DashboardPipelineCounts = {
  openPipelineEnquiries: number;
  overdueFollowUpEnquiries: number;
  pendingQuotations: number;
  activeProjects: number;
  sitesOnOngoingProjects: number;
  overdueTasks: number;
  openOpsBlockages: number;
  needToGetRows: number;
};

function metricCount(
  metric: DashboardMetricKey,
  counts: DashboardPipelineCounts,
): number {
  switch (metric) {
    case "openEnquiries":
      return counts.openPipelineEnquiries;
    case "overdueFollowUps":
      return counts.overdueFollowUpEnquiries;
    case "quotationsInFlight":
      return counts.pendingQuotations;
    case "activeProjects":
      return counts.activeProjects;
    case "activeSites":
      return counts.sitesOnOngoingProjects;
    case "overdueTasks":
      return counts.overdueTasks;
    case "openBlockages":
      return counts.openOpsBlockages;
    case "procurementGaps":
      return counts.needToGetRows;
    default:
      return 0;
  }
}

/**
 * True when every visible sales-pipeline metric the role cares about is zero.
 * Requires at least one of the four core pipeline metrics to be visible.
 */
export function isSalesPipelineDashboardEmpty(
  visibleMetrics: ReadonlySet<DashboardMetricKey>,
  counts: DashboardPipelineCounts,
): boolean {
  const visiblePipeline = SALES_PIPELINE_METRICS.filter((m) => visibleMetrics.has(m));
  if (visiblePipeline.length === 0) {
    return false;
  }
  return visiblePipeline.every((m) => metricCount(m, counts) === 0);
}

/**
 * True when installation-team primary tiles are all zero.
 */
export function isFieldOpsDashboardEmpty(
  visibleMetrics: ReadonlySet<DashboardMetricKey>,
  counts: DashboardPipelineCounts,
): boolean {
  const visibleOps = FIELD_OPS_METRICS.filter((m) => visibleMetrics.has(m));
  if (visibleOps.length === 0) {
    return false;
  }
  return visibleOps.every((m) => metricCount(m, counts) === 0);
}

export type DashboardOnboardingVariant = "sales_pipeline" | "field_ops";

function hasAnyVisible(
  visibleMetrics: ReadonlySet<DashboardMetricKey>,
  metrics: DashboardMetricKey[],
): boolean {
  return metrics.some((m) => visibleMetrics.has(m));
}

export function resolveDashboardOnboardingVariant(
  visibleMetrics: ReadonlySet<DashboardMetricKey>,
  counts: DashboardPipelineCounts,
): DashboardOnboardingVariant | null {
  const salesVisible = hasAnyVisible(visibleMetrics, SALES_PIPELINE_METRICS);
  const fieldVisible = hasAnyVisible(visibleMetrics, FIELD_OPS_METRICS);
  const salesEmpty = isSalesPipelineDashboardEmpty(visibleMetrics, counts);

  if (salesEmpty && salesVisible) {
    return "sales_pipeline";
  }

  if (
    isFieldOpsDashboardEmpty(visibleMetrics, counts) &&
    fieldVisible &&
    (!salesVisible || salesEmpty)
  ) {
    return "field_ops";
  }

  return null;
}

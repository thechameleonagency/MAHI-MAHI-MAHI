import type { AnalyticsDateRange, AnalyticsSlices, MetricRow } from "./types";
import { daysBetween, inAnalyticsRange } from "./dateRange";

export interface PipelineMetrics {
  enquiriesCreated: number;
  enquiriesBySource: Record<string, number>;
  enquiryToQuotationPct: number;
  avgDaysEnquiryToQuotation: number | null;
  quotationsInPeriod: number;
  quotationFunnel: { sent: number; approved: number; converted: number };
  quotationToProjectPct: number;
  avgDaysQuotationToProject: number | null;
  agentLeaderboard: { agentId: string; name: string; referrals: number; won: number; conversionPct: number }[];
  summaryRows: MetricRow[];
}

export function computePipelineMetrics(
  slices: AnalyticsSlices,
  range: AnalyticsDateRange,
): PipelineMetrics {
  const { enquiries, quotations, projects, agents } = slices;
  const enquiriesInPeriod = enquiries.filter((e) => inAnalyticsRange(e.createdAt, range));
  const quotationsInPeriod = quotations.filter((q) => inAnalyticsRange(q.createdAt, range));

  const bySource: Record<string, number> = {};
  for (const e of enquiriesInPeriod) {
    bySource[e.source] = (bySource[e.source] ?? 0) + 1;
  }

  const withQuotation = enquiriesInPeriod.filter(
    (e) => e.quotationId || e.status === "quotation_sent" || e.status === "converted",
  );
  const enquiryToQuotationPct =
    enquiriesInPeriod.length === 0
      ? 0
      : Math.round((withQuotation.length / enquiriesInPeriod.length) * 100);

  const enquiryLagDays: number[] = [];
  for (const e of enquiriesInPeriod) {
    if (!e.quotationId) continue;
    const q = quotations.find((x) => x.id === e.quotationId);
    if (q?.createdAt) enquiryLagDays.push(daysBetween(e.createdAt, q.createdAt));
  }
  const avgDaysEnquiryToQuotation =
    enquiryLagDays.length > 0
      ? Math.round(enquiryLagDays.reduce((a, b) => a + b, 0) / enquiryLagDays.length)
      : null;

  const funnel = {
    sent: quotationsInPeriod.filter((q) => q.status === "sent" || q.sentAt).length,
    approved: quotationsInPeriod.filter((q) => q.status === "approved" || q.approvedAt).length,
    converted: quotationsInPeriod.filter(
      (q) => q.status === "converted_to_project" || q.linkedProjectId,
    ).length,
  };

  const approvedOrConverted = quotationsInPeriod.filter(
    (q) => q.status === "approved" || q.status === "converted_to_project" || q.linkedProjectId,
  );
  const linkedProjects = approvedOrConverted.filter((q) => q.linkedProjectId);
  const quotationToProjectPct =
    approvedOrConverted.length === 0
      ? 0
      : Math.round((linkedProjects.length / approvedOrConverted.length) * 100);

  const quoLagDays: number[] = [];
  for (const q of quotationsInPeriod) {
    if (!q.linkedProjectId) continue;
    const conv = q.convertedAt ?? q.approvedAt ?? projects.find((p) => p.id === q.linkedProjectId)?.createdAt;
    if (conv) quoLagDays.push(daysBetween(q.createdAt, conv));
  }
  const avgDaysQuotationToProject =
    quoLagDays.length > 0
      ? Math.round(quoLagDays.reduce((a, b) => a + b, 0) / quoLagDays.length)
      : null;

  const agentLeaderboard = agents
    .map((a) => {
      const referrals = enquiries.filter((e) => e.agentId === a.id).length;
      const won = projects.filter((p) => p.agentId === a.id && p.lifecycleStatus === "Completed").length;
      return {
        agentId: a.id,
        name: a.name,
        referrals,
        won,
        conversionPct: referrals === 0 ? 0 : Math.round((won / referrals) * 100),
      };
    })
    .filter((r) => r.referrals > 0)
    .sort((a, b) => b.won - a.won || b.referrals - a.referrals)
    .slice(0, 8);

  const summaryRows: MetricRow[] = [
    { label: "Enquiries (period)", value: enquiriesInPeriod.length },
    { label: "Enquiry → quotation", value: `${enquiryToQuotationPct}%` },
    {
      label: "Avg days enquiry → quotation",
      value: avgDaysEnquiryToQuotation ?? "—",
    },
    { label: "Quotations (period)", value: quotationsInPeriod.length },
    { label: "Quotation → project", value: `${quotationToProjectPct}%` },
    {
      label: "Avg days quotation → project",
      value: avgDaysQuotationToProject ?? "—",
    },
  ];

  return {
    enquiriesCreated: enquiriesInPeriod.length,
    enquiriesBySource: bySource,
    enquiryToQuotationPct,
    avgDaysEnquiryToQuotation,
    quotationsInPeriod: quotationsInPeriod.length,
    quotationFunnel: funnel,
    quotationToProjectPct,
    avgDaysQuotationToProject,
    agentLeaderboard,
    summaryRows,
  };
}

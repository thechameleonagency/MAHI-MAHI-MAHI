/**
 * Enquiry / sales-funnel analytics.
 *
 * Two entry points:
 * - `computeSalesActionQueue` — TODAY-focused operational queue (new leads,
 *   visits scheduled, docs due, overdue follow-ups) with the actual enquiry
 *   lists so the UI can drill down.
 * - `computeEnquiryAnalytics` — range-based funnel, site-visit outcomes, doc
 *   pipeline, salesperson performance, lost reasons, source effectiveness,
 *   and pipeline aging. Wherever a number is shown, the enquiries behind it
 *   are returned too, so every chart can open a drilldown.
 */
import type { Enquiry, Quotation } from "@/types/project";
import { getEnquiryLostReasonLabel, lostReasonGroupKey } from "@/lib/enquiryLostReasons";
import {
  buildTimeSeries,
  inWindow,
  parseIsoDate,
  type BusinessGranularity,
  type BusinessWindow,
  type SeriesPoint,
} from "./timeBuckets";

// ---------------------------------------------------------------- helpers

const OPEN_STATUSES = new Set(["new", "meeting_scheduled", "quotation_sent", "quotation_rejected"]);

export const isOpenEnquiry = (e: Enquiry): boolean => OPEN_STATUSES.has(e.status);

const reachedQuotation = (e: Enquiry): boolean =>
  Boolean(e.quotationId) ||
  e.status === "quotation_sent" ||
  e.status === "quotation_rejected" ||
  e.status === "converted";

/** Visit is on the books: explicit site-visit date, or a scheduled meeting. */
const visitPlanned = (e: Enquiry): boolean =>
  Boolean(e.siteVisitDate) || (e.status === "meeting_scheduled" && Boolean(e.meetingDate));

const visitDone = (e: Enquiry): boolean => Boolean(e.siteVisitOutcome);

const visitConfirmed = (e: Enquiry): boolean =>
  e.siteVisitOutcome === "confirmed" ||
  // No explicit visit data, but the lead progressed to quotation/conversion.
  (!e.siteVisitOutcome && reachedQuotation(e));

const sameDay = (iso: string | undefined, day: string): boolean =>
  Boolean(iso && iso.slice(0, 10) === day);

const beforeDay = (iso: string | undefined, day: string): boolean =>
  Boolean(iso && iso.slice(0, 10) < day);

function daysToConvert(e: Enquiry, quotationById: Map<string, Quotation>): number | null {
  if (e.status !== "converted") return null;
  const start = parseIsoDate(e.createdAt);
  if (!start) return null;
  const q = e.quotationId ? quotationById.get(e.quotationId) : undefined;
  const endIso = q?.convertedAt ?? q?.approvedAt ?? e.updatedAt;
  const end = parseIsoDate(endIso);
  if (!end || end < start) return null;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------- action queue (today)

export interface SalesActionQueue {
  /** Enquiries created today. */
  newToday: Enquiry[];
  /** Site visits / meetings scheduled for today without an outcome yet. */
  visitsToday: Enquiry[];
  /** Docs the customer promised for today or earlier (still not collected). */
  docsDue: Enquiry[];
  /** Open enquiries whose follow-up date has passed. */
  overdueFollowUps: Enquiry[];
  /** Visit date passed but no outcome recorded — needs an update from the field. */
  visitsAwaitingOutcome: Enquiry[];
  /** Confirmed visits with docs still pending / promised. */
  docsPipeline: Enquiry[];
}

export function computeSalesActionQueue(enquiries: Enquiry[], now: Date = new Date()): SalesActionQueue {
  const today = now.toISOString().slice(0, 10);
  const active = enquiries.filter((e) => !e.archivedAt);

  const newToday = active.filter((e) => sameDay(e.createdAt, today));
  const visitsToday = active.filter(
    (e) =>
      !e.siteVisitOutcome &&
      (sameDay(e.siteVisitDate, today) ||
        (e.status === "meeting_scheduled" && sameDay(e.meetingDate, today))),
  );
  const docsDue = active.filter(
    (e) =>
      e.docsStatus === "promised" &&
      e.docsPromisedDate &&
      e.docsPromisedDate.slice(0, 10) <= today,
  );
  const overdueFollowUps = active.filter(
    (e) => isOpenEnquiry(e) && beforeDay(e.followUpDate, today),
  );
  const visitsAwaitingOutcome = active.filter(
    (e) => !e.siteVisitOutcome && beforeDay(e.siteVisitDate, today) && isOpenEnquiry(e),
  );
  const docsPipeline = active.filter(
    (e) =>
      e.siteVisitOutcome === "confirmed" &&
      e.docsStatus !== "collected" &&
      e.status !== "lost",
  );

  return { newToday, visitsToday, docsDue, overdueFollowUps, visitsAwaitingOutcome, docsPipeline };
}

// ---------------------------------------------------------------- range analytics

export interface EnquiryEmployeeStats {
  memberId: string;
  name: string;
  total: number;
  visitsDone: number;
  visitsConfirmed: number;
  quotations: number;
  converted: number;
  lost: number;
  open: number;
  quotationPct: number;
  conversionPct: number;
  avgDaysToConvert: number | null;
  /** Sum of `estimatedBudget` on this person's open enquiries. */
  openPipelineValue: number;
  /** 0–100 composite: 45% conversion rate, 25% quotation rate, 30% relative volume. */
  score: number;
  enquiries: Enquiry[];
}

export interface FunnelStage {
  stage: string;
  count: number;
  /** % of the previous stage that made it here (100 for the first stage). */
  pctOfPrevious: number;
  enquiries: Enquiry[];
}

export interface AgingBucket {
  label: string;
  count: number;
  value: number;
  enquiries: Enquiry[];
}

export interface SourceEffectiveness {
  source: string;
  count: number;
  converted: number;
  conversionPct: number;
  enquiries: Enquiry[];
}

export interface EnquiryAnalytics {
  total: number;
  converted: number;
  lost: number;
  open: number;
  conversionPct: number;
  quotationPct: number;
  avgDaysToConvert: number | null;
  /** ₹ estimated budget across open enquiries in range. */
  openPipelineValue: number;

  funnel: FunnelStage[];
  perEmployee: EnquiryEmployeeStats[];

  lostReasons: { code: string; label: string; count: number; enquiries: Enquiry[] }[];
  sources: SourceEffectiveness[];

  // Site-visit & document tracking
  visitsPlanned: number;
  visitsDone: number;
  visitOutcomes: { outcome: "confirmed" | "rejected" | "postponed"; count: number; enquiries: Enquiry[] }[];
  docsCollected: Enquiry[];
  docsPromised: Enquiry[];
  docsPendingNoDate: Enquiry[];
  /** Promised doc collections sorted by date (soonest first). */
  upcomingDocCollections: Enquiry[];

  aging: AgingBucket[];

  createdTrend: SeriesPoint[];
  convertedTrend: SeriesPoint[];
  lostTrend: SeriesPoint[];
}

const AGING_BUCKETS: { label: string; maxDays: number }[] = [
  { label: "0–3 days", maxDays: 3 },
  { label: "4–7 days", maxDays: 7 },
  { label: "8–14 days", maxDays: 14 },
  { label: "15–30 days", maxDays: 30 },
  { label: "30+ days", maxDays: Infinity },
];

export function computeEnquiryAnalytics(
  enquiries: Enquiry[],
  quotations: Quotation[],
  window: BusinessWindow,
  granularity: BusinessGranularity,
  now: Date = new Date(),
): EnquiryAnalytics {
  const inPeriod = enquiries.filter((e) => !e.archivedAt && inWindow(e.createdAt, window));
  const quotationById = new Map(quotations.map((q) => [q.id, q]));

  const converted = inPeriod.filter((e) => e.status === "converted");
  const lost = inPeriod.filter((e) => e.status === "lost");
  const open = inPeriod.filter(isOpenEnquiry);
  const withQuotation = inPeriod.filter(reachedQuotation);

  const convertDays = converted
    .map((e) => daysToConvert(e, quotationById))
    .filter((d): d is number => d !== null);

  // ---- Funnel with stage-to-stage drop-off.
  const engaged = inPeriod.filter((e) => e.status !== "new" || visitPlanned(e));
  const confirmedStage = inPeriod.filter(
    (e) => visitConfirmed(e) && (e.status !== "new" || visitPlanned(e)),
  );
  const rawFunnel: { stage: string; enquiries: Enquiry[] }[] = [
    { stage: "Enquiries", enquiries: inPeriod },
    { stage: "Visit / meeting", enquiries: engaged },
    { stage: "Confirmed on site", enquiries: confirmedStage },
    { stage: "Quotation sent", enquiries: withQuotation },
    { stage: "Converted", enquiries: converted },
  ];
  const funnel: FunnelStage[] = rawFunnel.map((s, i) => {
    const prev = i === 0 ? s.enquiries.length : rawFunnel[i - 1].enquiries.length;
    return {
      stage: s.stage,
      count: s.enquiries.length,
      pctOfPrevious: i === 0 ? 100 : prev > 0 ? Math.round((s.enquiries.length / prev) * 100) : 0,
      enquiries: s.enquiries,
    };
  });

  // ---- Per-salesperson stats.
  const groups = new Map<string, Enquiry[]>();
  for (const e of inPeriod) {
    const key = e.assignedToMemberId
      ? String(e.assignedToMemberId)
      : e.assignedTo?.trim() || "__unassigned__";
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const maxVolume = Math.max(1, ...[...groups.values()].map((g) => g.length));
  const perEmployee: EnquiryEmployeeStats[] = [...groups.entries()]
    .map(([key, list]) => {
      const name =
        key === "__unassigned__" ? "Unassigned" : list[0].assignedTo?.trim() || key;
      const conv = list.filter((e) => e.status === "converted");
      const quo = list.filter(reachedQuotation);
      const lostCount = list.filter((e) => e.status === "lost").length;
      const openList = list.filter(isOpenEnquiry);
      const days = conv
        .map((e) => daysToConvert(e, quotationById))
        .filter((d): d is number => d !== null);
      const conversionPct = list.length ? Math.round((conv.length / list.length) * 100) : 0;
      const quotationPct = list.length ? Math.round((quo.length / list.length) * 100) : 0;
      const volumeScore = (list.length / maxVolume) * 100;
      return {
        memberId: key,
        name,
        total: list.length,
        visitsDone: list.filter(visitDone).length,
        visitsConfirmed: list.filter((e) => e.siteVisitOutcome === "confirmed").length,
        quotations: quo.length,
        converted: conv.length,
        lost: lostCount,
        open: openList.length,
        quotationPct,
        conversionPct,
        avgDaysToConvert: days.length
          ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
          : null,
        openPipelineValue: Math.round(openList.reduce((s, e) => s + (e.estimatedBudget || 0), 0)),
        score: Math.round(0.45 * conversionPct + 0.25 * quotationPct + 0.3 * volumeScore),
        enquiries: list,
      };
    })
    .sort((a, b) => b.score - a.score);

  // ---- Lost reasons with the enquiries behind each slice.
  const reasonGroups = new Map<string, Enquiry[]>();
  for (const e of lost) {
    const key = lostReasonGroupKey(e);
    const list = reasonGroups.get(key);
    if (list) list.push(e);
    else reasonGroups.set(key, [e]);
  }
  const lostReasons = [...reasonGroups.entries()]
    .map(([code, list]) => ({
      code,
      label: getEnquiryLostReasonLabel(code),
      count: list.length,
      enquiries: list,
    }))
    .sort((a, b) => b.count - a.count);

  // ---- Source effectiveness (volume + conversion rate per source).
  const sourceGroups = new Map<string, Enquiry[]>();
  for (const e of inPeriod) {
    const list = sourceGroups.get(e.source);
    if (list) list.push(e);
    else sourceGroups.set(e.source, [e]);
  }
  const sources: SourceEffectiveness[] = [...sourceGroups.entries()]
    .map(([source, list]) => {
      const conv = list.filter((e) => e.status === "converted").length;
      return {
        source,
        count: list.length,
        converted: conv,
        conversionPct: list.length ? Math.round((conv / list.length) * 100) : 0,
        enquiries: list,
      };
    })
    .sort((a, b) => b.count - a.count);

  // ---- Site visits & documents.
  const visitsDoneList = inPeriod.filter(visitDone);
  const outcomeOf = (o: "confirmed" | "rejected" | "postponed") =>
    visitsDoneList.filter((e) => e.siteVisitOutcome === o);
  const visitOutcomes = (["confirmed", "rejected", "postponed"] as const)
    .map((outcome) => ({ outcome, count: outcomeOf(outcome).length, enquiries: outcomeOf(outcome) }))
    .filter((o) => o.count > 0);

  const docsCollected = inPeriod.filter((e) => e.docsStatus === "collected");
  const docsPromised = inPeriod.filter(
    (e) => e.docsStatus === "promised" && e.status !== "lost",
  );
  const docsPendingNoDate = inPeriod.filter(
    (e) =>
      e.siteVisitOutcome === "confirmed" &&
      (!e.docsStatus || e.docsStatus === "pending") &&
      e.status !== "lost",
  );
  const upcomingDocCollections = [...docsPromised]
    .filter((e) => e.docsPromisedDate)
    .sort((a, b) => (a.docsPromisedDate! < b.docsPromisedDate! ? -1 : 1));

  // ---- Aging of the open pipeline.
  const aging: AgingBucket[] = AGING_BUCKETS.map((b) => ({
    label: b.label,
    count: 0,
    value: 0,
    enquiries: [] as Enquiry[],
  }));
  for (const e of open) {
    const created = parseIsoDate(e.createdAt);
    if (!created) continue;
    const age = Math.floor((now.getTime() - created.getTime()) / 86_400_000);
    const idx = AGING_BUCKETS.findIndex((b) => age <= b.maxDays);
    const bucket = aging[idx === -1 ? aging.length - 1 : idx];
    bucket.count++;
    bucket.value += e.estimatedBudget || 0;
    bucket.enquiries.push(e);
  }

  return {
    total: inPeriod.length,
    converted: converted.length,
    lost: lost.length,
    open: open.length,
    conversionPct: inPeriod.length ? Math.round((converted.length / inPeriod.length) * 100) : 0,
    quotationPct: inPeriod.length ? Math.round((withQuotation.length / inPeriod.length) * 100) : 0,
    avgDaysToConvert: convertDays.length
      ? Math.round(convertDays.reduce((a, b) => a + b, 0) / convertDays.length)
      : null,
    openPipelineValue: Math.round(open.reduce((s, e) => s + (e.estimatedBudget || 0), 0)),
    funnel,
    perEmployee,
    lostReasons,
    sources,
    visitsPlanned: inPeriod.filter(visitPlanned).length,
    visitsDone: visitsDoneList.length,
    visitOutcomes,
    docsCollected,
    docsPromised,
    docsPendingNoDate,
    upcomingDocCollections,
    aging,
    createdTrend: buildTimeSeries(inPeriod, (e) => e.createdAt, window, granularity),
    convertedTrend: buildTimeSeries(converted, (e) => e.updatedAt, window, granularity),
    lostTrend: buildTimeSeries(lost, (e) => e.updatedAt, window, granularity),
  };
}

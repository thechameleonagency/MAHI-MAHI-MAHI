import { useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarClock,
  FileCheck,
  FilePlus2,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import type { Enquiry, Quotation } from "@/types/project";
import { formatINRCompact } from "@/lib/formatCurrency";
import {
  bucketKey,
  computeEnquiryAnalytics,
  computeSalesActionQueue,
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
import { EnquiryListSheet, type EnquiryDrilldown } from "./EnquiryListSheet";

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  phone: "Phone",
  referral: "Referral",
  "walk-in": "Walk-in",
  "social-media": "Social media",
  other: "Other",
};

const OUTCOME_META: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed", color: COLOR_SUCCESS },
  postponed: { label: "Postponed", color: COLOR_WARNING },
  rejected: { label: "Rejected", color: COLOR_DESTRUCTIVE },
};

function fmtDay(iso: string | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "dd MMM") : "—";
}

/** Clickable operational tile for the "today" action strip. */
function ActionTile({
  icon: Icon,
  label,
  count,
  tone,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  count: number;
  tone: "default" | "warn" | "danger";
  onClick: () => void;
}) {
  const toneClass =
    count === 0
      ? "border-border/60 bg-muted/20 text-muted-foreground"
      : tone === "danger"
        ? "border-rose-500/40 bg-rose-500/10"
        : tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-primary/30 bg-primary/5";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={`flex min-w-[150px] flex-1 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${toneClass} ${
        count > 0 ? "hover:bg-muted/40" : "cursor-default"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <span className="min-w-0">
        <span className="block text-lg font-semibold leading-tight tabular-nums">{count}</span>
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </button>
  );
}

export function EnquiriesTab({
  enquiries,
  quotations,
  window,
  granularity,
}: {
  /** Already filtered by the page-level salesperson / source / priority filters. */
  enquiries: Enquiry[];
  quotations: Quotation[];
  window: BusinessWindow;
  granularity: BusinessGranularity;
}) {
  const [drilldown, setDrilldown] = useState<EnquiryDrilldown | null>(null);

  const a = useMemo(
    () => computeEnquiryAnalytics(enquiries, quotations, window, granularity),
    [enquiries, quotations, window, granularity],
  );
  const queue = useMemo(() => computeSalesActionQueue(enquiries), [enquiries]);

  const inPeriod = useMemo(
    () => enquiries.filter((e) => !e.archivedAt),
    [enquiries],
  );

  const openBucket = (title: string, list: Enquiry[], description?: string) =>
    setDrilldown({ title, description, enquiries: list });

  /** Recharts click payloads nest the datum differently per chart type. */
  const datumOf = <T,>(data: unknown): T | undefined => {
    const d = data as { payload?: { payload?: T } & T } & T;
    return (d?.payload?.payload ?? d?.payload ?? d) as T | undefined;
  };

  /** Enquiries created in a clicked trend bucket. */
  const openTrendBucket = (key: string, label: string) => {
    const list = inPeriod.filter((e) => {
      const d = parseISO(e.createdAt);
      return isValid(d) && bucketKey(d, granularity) === key;
    });
    openBucket(`Enquiries — ${label}`, list, `${list.length} enquiries created in this period`);
  };

  const volumeData = a.createdTrend.map((c, i) => ({
    key: c.key,
    label: c.label,
    created: c.value,
    converted: a.convertedTrend[i]?.value ?? 0,
    lost: a.lostTrend[i]?.value ?? 0,
  }));

  const maxFunnel = Math.max(1, a.funnel[0]?.count ?? 1);

  return (
    <div className="space-y-4">
      {/* ---- Today's action queue ---- */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Needs attention today
        </p>
        <div className="flex flex-wrap gap-2">
          <ActionTile
            icon={Sparkles}
            label="New enquiries today"
            count={queue.newToday.length}
            tone="default"
            onClick={() => openBucket("New enquiries today", queue.newToday)}
          />
          <ActionTile
            icon={MapPin}
            label="Site visits scheduled today"
            count={queue.visitsToday.length}
            tone="default"
            onClick={() => openBucket("Site visits scheduled today", queue.visitsToday)}
          />
          <ActionTile
            icon={AlertTriangle}
            label="Visits done, outcome not recorded"
            count={queue.visitsAwaitingOutcome.length}
            tone="warn"
            onClick={() =>
              openBucket(
                "Visits awaiting outcome",
                queue.visitsAwaitingOutcome,
                "Visit date has passed but no confirmation / rejection recorded",
              )
            }
          />
          <ActionTile
            icon={FilePlus2}
            label="Docs due for collection"
            count={queue.docsDue.length}
            tone="warn"
            onClick={() =>
              openBucket("Documents due", queue.docsDue, "Promised on or before today")
            }
          />
          <ActionTile
            icon={CalendarClock}
            label="Overdue follow-ups"
            count={queue.overdueFollowUps.length}
            tone="danger"
            onClick={() => openBucket("Overdue follow-ups", queue.overdueFollowUps)}
          />
          <ActionTile
            icon={FileCheck}
            label="Confirmed, docs pending"
            count={queue.docsPipeline.length}
            tone="default"
            onClick={() =>
              openBucket(
                "Confirmed — documents pending",
                queue.docsPipeline,
                "Site visit confirmed but aadhaar / PAN etc. not collected yet",
              )
            }
          />
        </div>
      </div>

      {/* ---- Range KPIs ---- */}
      <MetricTiles
        tiles={[
          { label: "Enquiries (range)", value: a.total },
          {
            label: "Open pipeline",
            value: a.open,
            sub: formatINRCompact(a.openPipelineValue),
          },
          { label: "Converted", value: `${a.conversionPct}%`, sub: `${a.converted} won` },
          {
            label: "Site visits",
            value: a.visitsDone,
            sub: `${a.visitsPlanned} planned`,
          },
          {
            label: "Docs collected",
            value: a.docsCollected.length,
            sub: `${a.docsPromised.length} promised`,
          },
          { label: "Avg days to convert", value: a.avgDaysToConvert ?? "—" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ---- Volume & outcomes trend (clickable) ---- */}
        <ChartCard
          title="Enquiry volume & outcomes"
          description="Created vs converted vs lost — click a bar to see the enquiries"
        >
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="created"
                name="Created"
                fill={COLOR_PRIMARY}
                radius={[3, 3, 0, 0]}
                cursor="pointer"
                onClick={(data: unknown) => {
                  const d = datumOf<{ key?: string; label?: string }>(data);
                  if (d?.key) openTrendBucket(d.key, d.label ?? d.key);
                }}
              />
              <Line dataKey="converted" name="Converted" stroke={COLOR_SUCCESS} strokeWidth={2} dot={false} />
              <Line dataKey="lost" name="Lost" stroke={COLOR_DESTRUCTIVE} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ---- Funnel with drop-off ---- */}
        <ChartCard
          title="Sales funnel"
          description="Stage-to-stage conversion — click a stage for the list"
        >
          <div className="space-y-2 py-1">
            {a.funnel.map((s, i) => (
              <button
                key={s.stage}
                type="button"
                onClick={() => openBucket(s.stage, s.enquiries)}
                className="group block w-full text-left"
              >
                <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{s.stage}</span>
                  <span className="flex items-center gap-2">
                    {i > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-2xs tabular-nums ${
                          s.pctOfPrevious >= 60
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : s.pctOfPrevious >= 30
                              ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                              : "border-rose-500/40 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {s.pctOfPrevious}% of prev
                      </Badge>
                    )}
                    <span className="w-8 text-right font-semibold tabular-nums">{s.count}</span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-all group-hover:bg-primary"
                    style={{ width: `${Math.max(2, (s.count / maxFunnel) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
            {a.total === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No enquiries in the selected range.
              </p>
            )}
          </div>
        </ChartCard>

        {/* ---- Site visits & documents ---- */}
        <ChartCard
          title="Site visits & documents"
          description="Visit outcomes and the document-collection pipeline"
        >
          {a.visitsDone === 0 && a.docsPromised.length === 0 && a.docsCollected.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No site-visit outcomes recorded in range yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={a.visitOutcomes.map((o) => ({
                        ...o,
                        name: OUTCOME_META[o.outcome].label,
                      }))}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={34}
                      outerRadius={60}
                      paddingAngle={2}
                      cursor="pointer"
                      onClick={(data: unknown) => {
                        const p = datumOf<{ outcome?: string; enquiries?: Enquiry[] }>(data);
                        if (p?.enquiries && p.outcome) {
                          openBucket(`Visits ${OUTCOME_META[p.outcome].label.toLowerCase()}`, p.enquiries);
                        }
                      }}
                    >
                      {a.visitOutcomes.map((o) => (
                        <Cell key={o.outcome} fill={OUTCOME_META[o.outcome].color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {a.visitOutcomes.map((o) => (
                    <Badge
                      key={o.outcome}
                      variant="outline"
                      className="cursor-pointer text-2xs"
                      onClick={() => openBucket(`Visits ${OUTCOME_META[o.outcome].label.toLowerCase()}`, o.enquiries)}
                    >
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: OUTCOME_META[o.outcome].color }}
                      />
                      {OUTCOME_META[o.outcome].label}: {o.count}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <button
                    type="button"
                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1 py-1.5 hover:bg-emerald-500/20"
                    onClick={() => openBucket("Documents collected", a.docsCollected)}
                  >
                    <span className="block text-sm font-semibold tabular-nums">{a.docsCollected.length}</span>
                    <span className="block text-2xs text-muted-foreground">Collected</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1 py-1.5 hover:bg-amber-500/20"
                    onClick={() => openBucket("Documents promised", a.docsPromised)}
                  >
                    <span className="block text-sm font-semibold tabular-nums">{a.docsPromised.length}</span>
                    <span className="block text-2xs text-muted-foreground">Promised</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border bg-muted/30 px-1 py-1.5 hover:bg-muted/60"
                    onClick={() => openBucket("Documents pending (no date)", a.docsPendingNoDate)}
                  >
                    <span className="block text-sm font-semibold tabular-nums">{a.docsPendingNoDate.length}</span>
                    <span className="block text-2xs text-muted-foreground">No date</span>
                  </button>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Upcoming doc collections
                  </p>
                  {a.upcomingDocCollections.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None scheduled.</p>
                  ) : (
                    <div className="max-h-[110px] space-y-1 overflow-y-auto pr-1">
                      {a.upcomingDocCollections.slice(0, 6).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => openBucket(`Docs — ${e.customerName}`, [e])}
                          className="flex w-full items-center justify-between gap-2 rounded border border-border/50 px-2 py-1 text-left text-xs hover:bg-muted/40"
                        >
                          <span className="min-w-0 truncate">{e.customerName}</span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {fmtDay(e.docsPromisedDate)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        {/* ---- Pipeline aging ---- */}
        <ChartCard
          title="Open pipeline aging"
          description="How long open enquiries have been sitting — older needs chasing"
        >
          {a.open === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No open enquiries in range.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <ComposedChart data={a.aging}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === "Value" ? formatINRCompact(v) : v
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="Enquiries"
                    radius={[3, 3, 0, 0]}
                    cursor="pointer"
                    onClick={(data: unknown) => {
                      const p = datumOf<{ label?: string; enquiries?: Enquiry[] }>(data);
                      if (p?.enquiries) openBucket(`Open ${p.label ?? ""}`, p.enquiries);
                    }}
                  >
                    {a.aging.map((b, i) => (
                      <Cell
                        key={b.label}
                        fill={
                          i <= 1 ? COLOR_SUCCESS : i === 2 ? COLOR_PRIMARY : i === 3 ? COLOR_WARNING : COLOR_DESTRUCTIVE
                        }
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              <p className="mt-1 text-xs text-muted-foreground">
                {a.aging[4].count > 0
                  ? `${a.aging[4].count} enquiries older than 30 days worth ${formatINRCompact(a.aging[4].value)} — click the red bar.`
                  : "Nothing older than 30 days. Pipeline is fresh."}
              </p>
            </>
          )}
        </ChartCard>

        {/* ---- Salesperson performance ---- */}
        <ChartCard
          title="Salesperson performance"
          description="Click a row to see that person's enquiries"
          className="lg:col-span-2"
        >
          {a.perEmployee.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No enquiries in range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">Salesperson</th>
                    <th className="px-2 py-1.5 text-right font-medium">Leads</th>
                    <th className="px-2 py-1.5 text-right font-medium">Visits</th>
                    <th className="px-2 py-1.5 text-right font-medium">Quoted</th>
                    <th className="px-2 py-1.5 text-right font-medium">Won</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lost</th>
                    <th className="px-2 py-1.5 text-right font-medium">Conv %</th>
                    <th className="px-2 py-1.5 text-right font-medium">Open pipeline</th>
                    <th className="px-2 py-1.5 text-right font-medium">Avg days</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {a.perEmployee.map((p) => (
                    <tr
                      key={p.memberId}
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/40"
                      onClick={() => openBucket(`Enquiries — ${p.name}`, p.enquiries)}
                    >
                      <td className="max-w-[160px] truncate py-1.5 pr-2 font-medium">{p.name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.total}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {p.visitsDone}
                        {p.visitsConfirmed > 0 && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {" "}({p.visitsConfirmed}✓)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.quotations}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {p.converted}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {p.lost}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{p.conversionPct}%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatINRCompact(p.openPipelineValue)}
                        <span className="text-xs text-muted-foreground"> ({p.open})</span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {p.avgDaysToConvert ?? "—"}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        <Badge
                          variant="outline"
                          className={`tabular-nums ${
                            p.score >= 60
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : p.score >= 30
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {p.score}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        {/* ---- Lost reasons ---- */}
        <ChartCard
          title="Why enquiries were lost"
          description="Structured rejection reasons — click to see who we lost"
        >
          {a.lostReasons.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No lost enquiries in range.
            </p>
          ) : (
            <div className="space-y-2 py-1">
              {a.lostReasons.map((r, i) => {
                const max = a.lostReasons[0].count;
                return (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => openBucket(`Lost — ${r.label}`, r.enquiries)}
                    className="group block w-full text-left"
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{r.label}</span>
                      <span className="font-semibold tabular-nums">{r.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full opacity-80 transition-opacity group-hover:opacity-100"
                        style={{
                          width: `${Math.max(3, (r.count / max) * 100)}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* ---- Source effectiveness ---- */}
        <ChartCard
          title="Source effectiveness"
          description="Volume vs conversion rate per lead source — click a bar"
        >
          {a.sources.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No enquiries in range.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart
                data={a.sources.map((s) => ({
                  ...s,
                  name: SOURCE_LABELS[s.source] ?? s.source,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 10 }}
                  width={36}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="count"
                  dataKey="count"
                  name="Enquiries"
                  fill={COLOR_PRIMARY}
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(data: unknown) => {
                    const p = datumOf<{ name?: string; enquiries?: Enquiry[] }>(data);
                    if (p?.enquiries) openBucket(`Source — ${p.name}`, p.enquiries);
                  }}
                />
                <Line
                  yAxisId="pct"
                  dataKey="conversionPct"
                  name="Conversion %"
                  stroke={COLOR_SUCCESS}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <EnquiryListSheet drilldown={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  );
}

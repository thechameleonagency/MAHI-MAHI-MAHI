import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useAppData } from "@/contexts/AppDataContext";
import {
  buildCalendarEvents,
  getCalendarSourceLabel,
  getEventsForDate,
  getEventsForRange,
  groupEventsByDate,
  groupEventsBySource,
  type CalendarEvent,
  type CalendarEventSource,
} from "@/lib/calendarSources";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const ALL_SOURCES: CalendarEventSource[] = [
  "task", "installation", "enquiry", "invoice", "vendor-bill", "loan-emi", "site-visit", "milestone",
];

function formatCalendarLabel(
  value: string | Date | undefined,
  pattern: string,
  fallback = "—",
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : parseISO(value.length === 10 ? `${value}T12:00:00` : value);
  return isValid(date) ? format(date, pattern) : fallback;
}

function CalendarEventLine({
  text,
  link,
  className,
}: {
  text: string;
  link?: CalendarEvent["titleLink"];
  className: string;
}) {
  if (link) {
    return (
      <EntityLink
        entityType={link.entityType}
        entityId={link.entityId}
        name={text}
        className={className}
      />
    );
  }
  return <p className={className}>{text}</p>;
}

const SOURCE_TONE: Record<CalendarEventSource, string> = {
  task: "border-l-primary",
  installation: "border-l-violet-500",
  enquiry: "border-l-amber-500",
  invoice: "border-l-emerald-600",
  "vendor-bill": "border-l-orange-500",
  "loan-emi": "border-l-rose-500",
  "site-visit": "border-l-cyan-600",
  milestone: "border-l-slate-500",
};

const CalendarPage = () => {
  const {
    tasks,
    scheduledInstallations,
    enquiries,
    invoices,
    saleBills,
    vendorBills,
    loans,
    loanRepayments,
    siteVisits,
    projects,
  } = useAppData();

  // Pick mode: "single" (single date) or "range" (date span).
  const [pickMode, setPickMode] = useState<"single" | "range">("single");
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [enabledSources, setEnabledSources] = useState<Set<CalendarEventSource>>(() => new Set(ALL_SOURCES));
  const [groupBy, setGroupBy] = useState<"date" | "category">("category");

  // Default to "date" when entering range mode, "category" when returning to single.
  useEffect(() => {
    setGroupBy(pickMode === "range" ? "date" : "category");
  }, [pickMode]);

  const toggleSource = (source: CalendarEventSource) => {
    setEnabledSources((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source); else next.add(source);
      return next;
    });
  };

  const allEvents = useMemo(
    () =>
      buildCalendarEvents({
        tasks,
        scheduledInstallations: scheduledInstallations ?? [],
        enquiries,
        invoices: [...invoices, ...saleBills],
        vendorBills,
        loans,
        loanRepayments,
        siteVisits: siteVisits ?? [],
        projects,
      }).filter((e) => enabledSources.has(e.source)),
    [
      tasks,
      scheduledInstallations,
      enquiries,
      invoices,
      saleBills,
      vendorBills,
      loans,
      loanRepayments,
      siteVisits,
      projects,
      enabledSources,
    ],
  );

  const selectedDay = selected ? format(selected, "yyyy-MM-dd") : "";
  const rangeFrom = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const rangeTo = range?.to ? format(range.to, "yyyy-MM-dd") : rangeFrom;

  const dayEvents = useMemo(() => {
    if (pickMode === "range") {
      if (!rangeFrom) return [];
      return getEventsForRange(allEvents, rangeFrom, rangeTo).sort((a, b) =>
        a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
      );
    }
    return selectedDay ? getEventsForDate(allEvents, selectedDay) : [];
  }, [allEvents, pickMode, selectedDay, rangeFrom, rangeTo]);
  const grouped = useMemo(() => groupEventsBySource(dayEvents), [dayEvents]);

  const daysWithEvents = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.date));
    return set;
  }, [allEvents]);

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Calendar" }]}
        subRow={
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 overflow-x-auto">
            <div className="flex shrink-0 flex-nowrap items-center gap-3" role="group" aria-label="Filter event types">
              {ALL_SOURCES.map((source) => {
                const id = `cal-filter-${source}`;
                return (
                  <div key={source} className="flex shrink-0 items-center gap-1.5">
                    <Checkbox
                      id={id}
                      checked={enabledSources.has(source)}
                      onCheckedChange={() => toggleSource(source)}
                      aria-label={`Show ${getCalendarSourceLabel(source)}`}
                    />
                    <Label htmlFor={id} className="cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
                      {getCalendarSourceLabel(source)}
                    </Label>
                  </div>
                );
              })}
            </div>
            <InlineKpiStrip
              singleRow
              className="min-w-0 flex-1"
              items={[
                { label: "Total events", value: allEvents.length },
                { label: pickMode === "range" ? "In range" : "On selected day", value: dayEvents.length },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="lg:col-span-4 xl:col-span-3">
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" aria-hidden />
                Month
              </CardTitle>
              <div className="flex rounded-md border bg-background p-0.5" role="group" aria-label="Pick mode">
                <Button
                  type="button"
                  variant={pickMode === "single" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-2xs"
                  onClick={() => setPickMode("single")}
                  aria-pressed={pickMode === "single"}
                >
                  Day
                </Button>
                <Button
                  type="button"
                  variant={pickMode === "range" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-2xs"
                  onClick={() => setPickMode("range")}
                  aria-pressed={pickMode === "range"}
                >
                  Range
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
            {pickMode === "single" ? (
              <Calendar
                mode="single"
                selected={selected}
                onSelect={setSelected}
                modifiers={{
                  hasEvents: (date) => daysWithEvents.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  hasEvents: "font-semibold text-primary",
                }}
                className="rounded-md border"
              />
            ) : (
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                modifiers={{
                  hasEvents: (date) => daysWithEvents.has(format(date, "yyyy-MM-dd")),
                }}
                modifiersClassNames={{
                  hasEvents: "font-semibold text-primary",
                }}
                className="rounded-md border"
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 xl:col-span-9">
          <CardHeader className="pb-2 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {pickMode === "range"
                    ? (rangeFrom
                        ? rangeTo && rangeTo !== rangeFrom
                          ? `${formatCalendarLabel(rangeFrom, "d MMM")} → ${formatCalendarLabel(rangeTo, "d MMM yyyy")}`
                          : formatCalendarLabel(rangeFrom, "EEEE, d MMMM yyyy")
                        : "Pick a range")
                    : (selected ? formatCalendarLabel(selected, "EEEE, d MMMM yyyy") : "Select a date")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"} {pickMode === "range" ? "in range" : "on this day"}
                </p>
              </div>
              <div className="flex rounded-md border bg-background p-0.5" role="group" aria-label="Group by">
                <Button
                  type="button"
                  variant={groupBy === "date" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setGroupBy("date")}
                  aria-pressed={groupBy === "date"}
                >
                  By date
                </Button>
                <Button
                  type="button"
                  variant={groupBy === "category" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setGroupBy("category")}
                  aria-pressed={groupBy === "category"}
                >
                  By category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[min(70vh,640px)] overflow-y-auto custom-scrollbar">
            {dayEvents.length === 0 && (
              <ListEmptyState
                icon={CalendarIcon}
                title={pickMode === "range" ? "No events in range" : "No events this day"}
                description={
                  pickMode === "range"
                    ? "Pick a date range on the calendar, or widen source filters."
                    : "Nothing scheduled for this date with the current source filters."
                }
              />
            )}
            {groupBy === "date"
              ? Object.entries(groupEventsByDate(dayEvents))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, items]) => (
                    <section key={date} className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {formatCalendarLabel(`${date}T12:00:00`, "EEEE, d MMM yyyy")}
                      </h3>
                      <ul className="space-y-2">
                        {items.map((ev) => (
                          <li
                            key={ev.id}
                            className={cn(
                              "rounded-lg border border-border/60 bg-muted/20 px-3 py-2 border-l-4",
                              SOURCE_TONE[ev.source],
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <CalendarEventLine
                                    text={ev.title}
                                    link={ev.titleLink}
                                    className="font-medium text-sm truncate text-left"
                                  />
                                  <Badge variant="outline" className="text-2xs shrink-0">
                                    {getCalendarSourceLabel(ev.source)}
                                  </Badge>
                                </div>
                                {ev.subtitle && (
                                  <CalendarEventLine
                                    text={ev.subtitle}
                                    link={ev.subtitleLink}
                                    className="text-xs text-muted-foreground truncate text-left"
                                  />
                                )}
                              </div>
                              {ev.href && (
                                <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2" asChild>
                                  <Link to={ev.href}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
              : (Object.keys(grouped) as CalendarEventSource[]).map((source) => {
                  const items = grouped[source];
                  if (!items.length) return null;
                  return (
                    <section key={source} className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {getCalendarSourceLabel(source)}
                      </h3>
                      <ul className="space-y-2">
                        {items.map((ev) => (
                          <li
                            key={ev.id}
                            className={cn(
                              "rounded-lg border border-border/60 bg-muted/20 px-3 py-2 border-l-4",
                              SOURCE_TONE[source],
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <CalendarEventLine
                                    text={ev.title}
                                    link={ev.titleLink}
                                    className="font-medium text-sm truncate text-left"
                                  />
                                  {pickMode === "range" && (
                                    <Badge variant="outline" className="text-2xs shrink-0">
                                      {formatCalendarLabel(`${ev.date}T12:00:00`, "d MMM")}
                                    </Badge>
                                  )}
                                </div>
                                {ev.subtitle && (
                                  <CalendarEventLine
                                    text={ev.subtitle}
                                    link={ev.subtitleLink}
                                    className="text-xs text-muted-foreground truncate text-left"
                                  />
                                )}
                              </div>
                              {ev.href && (
                                <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2" asChild>
                                  <Link to={ev.href}>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default CalendarPage;

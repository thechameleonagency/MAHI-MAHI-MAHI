import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
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
import { ExpandedCalendarGrid } from "@/components/calendar/ExpandedCalendarGrid";
import { validateScheduledInstallationDate } from "@/lib/scheduledInstallationValidation";
import { toast } from "@/hooks/use-toast";
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

/** Event sources that can be rescheduled by dragging on the expanded calendar. */
const MOVABLE_SOURCES = new Set<CalendarEventSource>(["task", "installation", "enquiry"]);

function CalendarEventRow({ ev, badgeText }: { ev: CalendarEvent; badgeText?: string }) {
  return (
    <li
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
            {badgeText && (
              <Badge variant="outline" className="text-2xs shrink-0">
                {badgeText}
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
  );
}

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
    updateTask,
    updateEnquiry,
    updateScheduledInstallation,
  } = useAppData();

  // Pick mode: "single" (single date) or "range" (date span).
  const [pickMode, setPickMode] = useState<"single" | "range">("single");
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  // Expanded mode: calendar takes the full width as a month grid with drag-and-drop.
  const [expanded, setExpanded] = useState(false);
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

  // Events for the selected day in expanded mode (always single-day, regardless of pick mode).
  const expandedDayEvents = useMemo(
    () => (selectedDay ? getEventsForDate(allEvents, selectedDay) : []),
    [allEvents, selectedDay],
  );

  const handleMoveEvent = async (ev: CalendarEvent, toDate: string) => {
    const dateLabel = formatCalendarLabel(`${toDate}T12:00:00`, "d MMM yyyy");

    if (ev.source === "task") {
      const id = ev.id.slice("task-".length);
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      updateTask(id, {
        workDate: toDate,
        delayHistory: [
          ...(task.delayHistory ?? []),
          { from: task.workDate, to: toDate, reason: "Moved on calendar", at: new Date().toISOString() },
        ],
      });
      toast({ title: "Task rescheduled", description: `${ev.title} moved to ${dateLabel}.` });
      return;
    }

    if (ev.source === "installation") {
      // Drag-and-drop provides no override reason, so past dates are always blocked here.
      const check = validateScheduledInstallationDate({ scheduledDate: toDate, isSuperAdmin: false });
      if (!check.ok) {
        toast({ title: "Cannot move installation", description: check.message, variant: "destructive" });
        return;
      }
      updateScheduledInstallation(ev.id.slice("install-".length), { scheduledDate: toDate });
      toast({ title: "Installation rescheduled", description: `${ev.title} moved to ${dateLabel}.` });
      return;
    }

    if (ev.source === "enquiry") {
      const result = await updateEnquiry(ev.id.slice("enq-".length), { followUpDate: toDate });
      if (!result.ok) {
        toast({ title: "Cannot move follow-up", description: result.error, variant: "destructive" });
        return;
      }
      toast({ title: "Follow-up rescheduled", description: `${ev.title} moved to ${dateLabel}.` });
    }
  };

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

      {expanded ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" aria-hidden />
                Calendar
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => setExpanded(false)}
              >
                <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                Collapse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click a date to see its events below. Drag task, installation, and follow-up chips onto another date to reschedule them.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">
            <ExpandedCalendarGrid
              events={allEvents}
              selectedDay={selectedDay}
              onSelectDay={(day) => setSelected(new Date(`${day}T12:00:00`))}
              movableSources={MOVABLE_SOURCES}
              onMoveEvent={handleMoveEvent}
            />
            <section className="space-y-2 rounded-lg border bg-muted/10 p-3" aria-label="Selected day events">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {selected ? formatCalendarLabel(selected, "EEEE, d MMMM yyyy") : "Select a date"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {expandedDayEvents.length} event{expandedDayEvents.length === 1 ? "" : "s"}
                </span>
              </div>
              {expandedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled for this date with the current source filters.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {expandedDayEvents.map((ev) => (
                    <CalendarEventRow key={ev.id} ev={ev} badgeText={getCalendarSourceLabel(ev.source)} />
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="lg:col-span-4 xl:col-span-3">
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" aria-hidden />
                Month
              </CardTitle>
              <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 px-2 text-2xs"
                onClick={() => setExpanded(true)}
                title="Expand calendar to full width with drag-and-drop rescheduling"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                Expand
              </Button>
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
                          <CalendarEventRow key={ev.id} ev={ev} badgeText={getCalendarSourceLabel(ev.source)} />
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
                          <CalendarEventRow
                            key={ev.id}
                            ev={ev}
                            badgeText={
                              pickMode === "range"
                                ? formatCalendarLabel(`${ev.date}T12:00:00`, "d MMM")
                                : undefined
                            }
                          />
                        ))}
                      </ul>
                    </section>
                  );
                })}
          </CardContent>
        </Card>
      </div>
      )}
    </PageShell>
  );
};

export default CalendarPage;

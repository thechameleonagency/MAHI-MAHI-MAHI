import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { useAppData } from "@/contexts/AppDataContext";
import {
  buildCalendarEvents,
  getCalendarSourceLabel,
  getEventsForDate,
  groupEventsBySource,
  type CalendarEventSource,
} from "@/lib/calendarSources";
import { cn } from "@/lib/utils";

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

  const [selected, setSelected] = useState<Date | undefined>(new Date());

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
      }),
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
    ],
  );

  const selectedDay = selected ? format(selected, "yyyy-MM-dd") : "";
  const dayEvents = useMemo(
    () => (selectedDay ? getEventsForDate(allEvents, selectedDay) : []),
    [allEvents, selectedDay],
  );
  const grouped = useMemo(() => groupEventsBySource(dayEvents), [dayEvents]);

  const daysWithEvents = useMemo(() => {
    const set = new Set(allEvents.map((e) => e.date));
    return set;
  }, [allEvents]);

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Calendar" }]}
        title={
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Tasks, follow-ups, dues, installs, and milestones in one schedule.
            </p>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="lg:col-span-4 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Month
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-4">
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 xl:col-span-9">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {selected ? format(selected, "EEEE, d MMMM yyyy") : "Select a date"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"} on this day
            </p>
          </CardHeader>
          <CardContent className="space-y-6 max-h-[min(70vh,640px)] overflow-y-auto custom-scrollbar">
            {dayEvents.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">No scheduled items for this date.</p>
            )}
            {(Object.keys(grouped) as CalendarEventSource[]).map((source) => {
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
                            <p className="font-medium text-sm truncate">{ev.title}</p>
                            {ev.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">{ev.subtitle}</p>
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

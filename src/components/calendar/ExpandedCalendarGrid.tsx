/**
 * Full-page month grid for the Calendar page's expanded mode.
 * Renders event chips inside day cells and supports dragging movable
 * events (tasks, installations, enquiry follow-ups) onto another date.
 */
import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarEventSource } from "@/lib/calendarSources";

const CHIP_TONE: Record<CalendarEventSource, string> = {
  task: "bg-primary/10 text-primary border-primary/30",
  installation: "bg-violet-500/10 text-violet-700 border-violet-500/30 dark:text-violet-400",
  enquiry: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  invoice: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  "vendor-bill": "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-400",
  "loan-emi": "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400",
  "site-visit": "bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-400",
  milestone: "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-400",
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MAX_CHIPS_PER_CELL = 3;

const DND_MIME = "application/x-mss-calendar-event";

export interface ExpandedCalendarGridProps {
  events: CalendarEvent[];
  selectedDay: string;
  onSelectDay: (dayIso: string) => void;
  /** Sources whose events can be dragged to a new date. */
  movableSources: Set<CalendarEventSource>;
  onMoveEvent: (event: CalendarEvent, toDateIso: string) => void;
}

export function ExpandedCalendarGrid({
  events,
  selectedDay,
  onSelectDay,
  movableSources,
  onMoveEvent,
}: ExpandedCalendarGridProps) {
  const [month, setMonth] = useState<Date>(() =>
    selectedDay ? new Date(`${selectedDay}T12:00:00`) : new Date(),
  );
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const eventsById = useMemo(() => {
    const map = new Map<string, CalendarEvent>();
    for (const ev of events) map.set(ev.id, ev);
    return map;
  }, [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date);
      if (list) list.push(ev);
      else map.set(ev.date, [ev]);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month));
    const gridEnd = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const todayIso = format(new Date(), "yyyy-MM-dd");

  const handleDrop = (dayIso: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverDay(null);
    const id = e.dataTransfer.getData(DND_MIME);
    const ev = id ? eventsById.get(id) : undefined;
    if (!ev || !movableSources.has(ev.source) || ev.date === dayIso) return;
    onMoveEvent(ev, dayIso);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{format(month, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setMonth(new Date());
              onSelectDay(todayIso);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-muted/60 px-2 py-1.5 text-center text-2xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dayIso = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(dayIso) ?? [];
          const inMonth = isSameMonth(day, month);
          const isSelected = dayIso === selectedDay;
          const isToday = dayIso === todayIso;
          const overflow = dayEvents.length - MAX_CHIPS_PER_CELL;

          return (
            <div
              key={dayIso}
              role="gridcell"
              tabIndex={0}
              aria-label={`${format(day, "d MMMM yyyy")}, ${dayEvents.length} events`}
              onClick={() => onSelectDay(dayIso)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(dayIso);
                }
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DND_MIME)) {
                  e.preventDefault();
                  setDragOverDay(dayIso);
                }
              }}
              onDragLeave={() => setDragOverDay((d) => (d === dayIso ? null : d))}
              onDrop={handleDrop(dayIso)}
              className={cn(
                "min-h-24 cursor-pointer space-y-1 bg-background p-1.5 transition-colors md:min-h-28",
                !inMonth && "bg-muted/30",
                isSelected && "ring-2 ring-inset ring-primary",
                dragOverDay === dayIso && "bg-primary/10 ring-2 ring-inset ring-primary/60",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    !inMonth && "text-muted-foreground/60",
                    isToday && "bg-primary font-semibold text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-2xs text-muted-foreground">{dayEvents.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_CHIPS_PER_CELL).map((ev) => {
                  const movable = movableSources.has(ev.source);
                  return (
                    <div
                      key={ev.id}
                      draggable={movable}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData(DND_MIME, ev.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      title={movable ? `${ev.title} — drag to reschedule` : `${ev.title} (date is fixed)`}
                      className={cn(
                        "truncate rounded border px-1 py-0.5 text-2xs leading-tight",
                        CHIP_TONE[ev.source],
                        movable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-80",
                      )}
                    >
                      {ev.title}
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="px-1 text-2xs text-muted-foreground">+{overflow} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

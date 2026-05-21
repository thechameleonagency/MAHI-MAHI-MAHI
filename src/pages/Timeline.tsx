import { useMemo, useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formatINRCompact } from "@/lib/formatCurrency";
import {
  Calendar,
  MapPin,
  IndianRupee,
  Package,
  User,
  Activity,
  FileText,
  Receipt,
  Briefcase,
  LayoutGrid,
  Users,
  Sparkles,
} from "lucide-react";
import { getTaskOverdueAging } from "@/lib/agingHelpers";
import {
  format,
  startOfWeek,
  addDays,
  subDays,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

/** Top-level timeline dimensions (aligned with sidebar “Timeline”). */
type TimelineMainTab = "sites" | "people" | "office";

type PeopleMode = "daily" | "weekly";

type ActivityIconKey =
  | "expense"
  | "invoice"
  | "payment"
  | "material"
  | "project"
  | "employee"
  | "schedule"
  | "attendance";

type BuiltActivityItem = {
  id: string;
  timeLabel: string;
  action: string;
  details: string;
  user: string;
  icon: ActivityIconKey;
  accentClass: string;
};

function formatCompactMoney(amount: number): string {
  return formatINRCompact(amount);
}

function parseDay(d: string): Date {
  try {
    return parseISO(d.includes("T") ? d : `${d}T12:00:00`);
  } catch {
    return new Date(d);
  }
}

function activityIcon(icon: ActivityIconKey) {
  switch (icon) {
    case "expense":
      return <Receipt className="h-4 w-4" />;
    case "invoice":
      return <FileText className="h-4 w-4" />;
    case "payment":
      return <IndianRupee className="h-4 w-4" />;
    case "material":
      return <Package className="h-4 w-4" />;
    case "project":
      return <Briefcase className="h-4 w-4" />;
    case "employee":
      return <User className="h-4 w-4" />;
    case "schedule":
      return <Calendar className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

/** Merge expenses, invoices, payments into a day-grouped activity feed (newest days first). */
function buildOfficeActivity(params: {
  expenseDaysBack: number;
  expenses: ReturnType<typeof useAppData>["expenses"];
  invoices: ReturnType<typeof useAppData>["invoices"];
  payments: ReturnType<typeof useAppData>["payments"];
  customers: ReturnType<typeof useAppData>["customers"];
}): Record<string, BuiltActivityItem[]> {
  const { expenseDaysBack, expenses, invoices, payments, customers } = params;
  const cutoff = startOfDay(subDays(new Date(), expenseDaysBack));
  const map = new Map<string, BuiltActivityItem[]>();

  const push = (isoDay: string, row: Omit<BuiltActivityItem, never>) => {
    const list = map.get(isoDay) ?? [];
    list.push(row);
    map.set(isoDay, list);
  };

  expenses.forEach((exp, i) => {
    const day = parseDay(exp.date);
    if (isBefore(day, cutoff)) return;
    const iso = format(day, "yyyy-MM-dd");
    push(iso, {
      id: `exp-${exp.id}-${i}`,
      timeLabel: "Expense",
      action: "Expense logged",
      details: `${exp.category}${exp.subCategory ? ` · ${exp.subCategory}` : ""} — ${formatCompactMoney(exp.amount)}${exp.projectName ? ` · ${exp.projectName}` : ""}`,
      user: exp.paidBy?.entityName || exp.paidBy?.type || "Company",
      icon: "expense",
      accentClass: "text-success bg-success/15",
    });
  });

  invoices.forEach((inv, i) => {
    const rawDay = inv.invoiceDate || inv.createdAt?.slice(0, 10);
    if (!rawDay) return;
    const day = parseDay(rawDay);
    if (isBefore(day, cutoff)) return;
    const iso = format(day, "yyyy-MM-dd");
    push(iso, {
      id: `inv-${inv.id}-${i}`,
      timeLabel: inv.type === "sale-bill" ? "Sale bill" : "Invoice",
      action: inv.type === "sale-bill" ? "Sale bill created" : "Invoice raised",
      details: `${inv.invoiceNumber} · ${inv.customerName} · ${formatCompactMoney(inv.total)} (${inv.status})`,
      user: "Accounts",
      icon: "invoice",
      accentClass: "text-primary bg-primary/15",
    });
  });

  payments.forEach((pay, i) => {
    const day = parseDay(pay.date);
    if (isBefore(day, cutoff)) return;
    const iso = format(day, "yyyy-MM-dd");
    const counterparty =
      pay.counterpartyName || (pay.counterpartyId ? customers.find((c) => c.id === pay.counterpartyId)?.name : "") || "Unknown Counterparty";
    push(iso, {
      id: `pay-${pay.id}-${i}`,
      timeLabel: "Payment",
      action: pay.direction === "in" ? "Payment received" : "Payment sent",
      details: `${formatCompactMoney(pay.amount)} · ${counterparty}${pay.paymentMode ? ` · ${pay.paymentMode}` : ""}`,
      user: counterparty,
      icon: "payment",
      accentClass: pay.direction === "in" ? "text-primary bg-primary/15" : "text-accent-foreground bg-accent/15",
    });
  });

  for (const [, rows] of map) {
    rows.sort((a, b) => String(a.details).localeCompare(String(b.details)));
  }

  return Object.fromEntries(
    [...map.entries()].sort(([da], [db]) => (da < db ? 1 : da > db ? -1 : 0)),
  );
}

type TimelineSource =
  | "site-task"
  | "site-spend"
  | "people-task"
  | "office-expense"
  | "office-invoice"
  | "office-payment";

interface TimelineItem {
  id: string;
  date: string;
  source: TimelineSource;
  icon: ActivityIconKey;
  action: string;
  details: string;
  user: string;
  accentClass: string;
  href?: string;
}

const SOURCE_CHIP: Record<TimelineSource, { label: string; className: string }> = {
  "site-task": { label: "Site", className: "bg-primary/10 text-primary border-primary/30" },
  "site-spend": { label: "Spend", className: "bg-warning/10 text-warning border-warning/30" },
  "people-task": { label: "Field", className: "bg-accent/30 text-accent-foreground border-accent/40" },
  "office-expense": { label: "Expense", className: "bg-success/10 text-success border-success/30" },
  "office-invoice": { label: "Invoice", className: "bg-primary/10 text-primary border-primary/30" },
  "office-payment": { label: "Payment", className: "bg-accent/30 text-accent-foreground border-accent/40" },
};

interface MergedTimelineFeedProps {
  enabledSections: Set<TimelineMainTab>;
  peopleMode: PeopleMode;
  tasksByDateForProjects: Record<string, { tasks: Array<{ id: string; workDate: string; siteId?: string; siteName?: string; workType: string; employeeId?: number; status: string }>; expenses: Array<{ id: string; date: string; category: string; subCategory?: string; amount: number; projectName?: string; projectId?: string }> }>;
  groupedTasksByDate: Record<string, Array<{ id: string; workDate: string; siteId?: string; siteName?: string; workType: string; employeeId?: number; status: string }>>;
  officeFiltered: Record<string, BuiltActivityItem[]>;
  employees: Array<{ id: number; name: string }>;
  projects: Array<{ id: string; name: string }>;
  onWiden: () => void;
}

function MergedTimelineFeed({
  enabledSections,
  peopleMode,
  tasksByDateForProjects,
  groupedTasksByDate,
  officeFiltered,
  employees,
  projects,
  onWiden,
}: MergedTimelineFeedProps) {
  const merged = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = [];
    if (enabledSections.has("sites")) {
      Object.entries(tasksByDateForProjects).forEach(([date, { tasks: dayTasks, expenses: dayExpenses }]) => {
        dayTasks.forEach((task, idx) => {
          const emp = employees.find((e) => e.id === task.employeeId);
          const project = projects.find((p) => p.id === task.siteId);
          out.push({
            id: `site-task-${task.id}-${idx}`,
            date,
            source: "site-task",
            icon: "project",
            action: `${task.workType} · ${task.siteName || project?.name || task.siteId || "Site"}`,
            details: emp ? `${emp.name} · ${task.status === "done" ? "Done" : "Pending"}` : task.status,
            user: emp?.name ?? "Unassigned",
            accentClass: "text-primary bg-primary/15",
            href: project ? `/projects/${project.id}` : undefined,
          });
        });
        dayExpenses.forEach((exp, idx) => {
          out.push({
            id: `site-spend-${exp.id}-${idx}`,
            date,
            source: "site-spend",
            icon: "expense",
            action: `${exp.category}${exp.subCategory ? ` · ${exp.subCategory}` : ""}`,
            details: `${formatCompactMoney(exp.amount)}${exp.projectName ? ` · ${exp.projectName}` : ""}`,
            user: exp.projectName ?? "Site",
            accentClass: "text-warning bg-warning/15",
          });
        });
      });
    }
    if (enabledSections.has("people")) {
      Object.entries(groupedTasksByDate).forEach(([date, dayTasks]) => {
        dayTasks.forEach((task, idx) => {
          const emp = employees.find((e) => e.id === task.employeeId);
          const project = projects.find((p) => p.id === task.siteId);
          out.push({
            id: `people-task-${task.id}-${idx}`,
            date,
            source: "people-task",
            icon: "employee",
            action: `${emp?.name ?? "Unassigned"} — ${task.workType}`,
            details: `${task.siteName || project?.name || task.siteId || "Site"} · ${task.status === "done" ? "Done" : "Pending"}`,
            user: emp?.name ?? "Unassigned",
            accentClass: "text-accent-foreground bg-accent/30",
            href: project ? `/projects/${project.id}` : undefined,
          });
        });
      });
    }
    if (enabledSections.has("office")) {
      Object.entries(officeFiltered).forEach(([date, rows]) => {
        rows.forEach((row) => {
          const src: TimelineSource =
            row.icon === "expense" ? "office-expense"
              : row.icon === "invoice" ? "office-invoice"
                : "office-payment";
          out.push({
            id: `office-${row.id}`,
            date,
            source: src,
            icon: row.icon,
            action: row.action,
            details: row.details,
            user: row.user,
            accentClass: row.accentClass,
          });
        });
      });
    }
    return out;
  }, [enabledSections, tasksByDateForProjects, groupedTasksByDate, officeFiltered, employees, projects]);

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    merged.forEach((item) => {
      const key = peopleMode === "weekly"
        ? format(startOfWeek(parseDay(item.date), { weekStartsOn: 1 }), "yyyy-MM-dd")
        : item.date;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    });
    return [...map.entries()].sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0));
  }, [merged, peopleMode]);

  if (grouped.length === 0) {
    return (
      <Card>
        <CardContent>
          <ListEmptyState
            icon={LayoutGrid}
            title="Nothing in this window"
            description="No activity for the selected sections and date range."
            actionLabel="Try last 30 days"
            onAction={onWiden}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {grouped.map(([key, items]) => {
        const dt = parseDay(key);
        const heading = peopleMode === "weekly"
          ? `Week of ${format(dt, "dd MMM")} — ${format(addDays(dt, 6), "dd MMM yyyy")}`
          : format(dt, "EEEE dd MMM yyyy");
        return (
          <Card key={key} className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-muted/80 to-transparent py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
                  {format(dt, "d")}
                </div>
                <div>
                  <CardTitle className="text-base">{heading}</CardTitle>
                  <p className="text-xs text-muted-foreground">{items.length} event{items.length === 1 ? "" : "s"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {items.map((item) => {
                const chip = SOURCE_CHIP[item.source];
                const Body = (
                  <div className="flex gap-3 rounded-xl border border-transparent bg-muted/30 p-3 transition-colors hover:border-border hover:bg-muted/50">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", item.accentClass)}>
                      {activityIcon(item.icon)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
                        <p className="text-sm font-medium leading-tight">{item.action}</p>
                        <Badge variant="outline" className={cn("text-2xs", chip.className)}>{chip.label}</Badge>
                      </div>
                      <p className="text-xs leading-snug text-muted-foreground">{item.details}</p>
                      <Badge variant="outline" className="text-2xs">{item.user}</Badge>
                    </div>
                  </div>
                );
                return item.href ? (
                  <Link key={item.id} to={item.href} className="block">{Body}</Link>
                ) : (
                  <div key={item.id}>{Body}</div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

const Timeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // UI 13 — sections are multi-select; URL persists as comma-list (e.g. ?sections=sites,people).
  const rawSections = searchParams.get("sections");
  const enabledSections: Set<TimelineMainTab> = useMemo(() => {
    if (!rawSections) return new Set<TimelineMainTab>(["sites", "people", "office"]);
    const arr = rawSections.split(",").filter((s): s is TimelineMainTab =>
      s === "sites" || s === "people" || s === "office",
    );
    return arr.length > 0 ? new Set(arr) : new Set<TimelineMainTab>(["sites", "people", "office"]);
  }, [rawSections]);

  // Legacy single-tab still derived for transitional refs (defaults to first enabled, used for filters scoping)
  const rawTab = searchParams.get("tab");
  const tab: TimelineMainTab =
    rawTab === "people" || rawTab === "office" || rawTab === "sites"
      ? rawTab
      : (enabledSections.values().next().value as TimelineMainTab) ?? "sites";
  const rawPeopleMode = searchParams.get("peopleMode");
  // UI 13 — weekly is the default per spec (user prefers the weekly-board card design).
  const peopleMode: PeopleMode = rawPeopleMode === "daily" ? "daily" : "weekly";

  const toggleSection = useCallback(
    (section: TimelineMainTab) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        const current = (p.get("sections") || "sites,people,office")
          .split(",")
          .filter((s): s is TimelineMainTab => s === "sites" || s === "people" || s === "office");
        const next = current.includes(section)
          ? current.filter((s) => s !== section)
          : [...current, section];
        if (next.length === 0) {
          p.delete("sections");
        } else {
          p.set("sections", next.join(","));
        }
        return p;
      });
    },
    [setSearchParams],
  );

  const setPeopleMode = useCallback(
    (mode: PeopleMode) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("peopleMode", mode);
        return p;
      });
    },
    [setSearchParams],
  );

  const {
    tasks,
    employees,
    projects,
    expenses,
    invoices,
    payments,
    customers,
  } = useAppData();

  const [sitesProjectId, setSitesProjectId] = useState<string>("all");
  const [sitesDaysBack, setSitesDaysBack] = useState<7 | 14 | 30>(14);

  const tasksOverdueOnly = searchParams.get("tasks") === "overdue";

  const timelineTasks = useMemo(() => {
    if (!tasksOverdueOnly) return tasks;
    return tasks.filter((t) => getTaskOverdueAging(t) != null);
  }, [tasks, tasksOverdueOnly]);

  const cutoffSites = startOfDay(subDays(new Date(), sitesDaysBack));

  const filteredTasksForSites = useMemo(() => {
    return timelineTasks.filter((task) => {
      const day = parseDay(task.workDate);
      if (isBefore(day, cutoffSites)) return false;
      if (sitesProjectId !== "all" && task.siteId !== sitesProjectId) return false;
      return true;
    });
  }, [timelineTasks, cutoffSites, sitesProjectId]);

  const tasksByDateForProjects = useMemo(() => {
    const acc: Record<
      string,
      { tasks: typeof tasks; expenses: typeof expenses }
    > = {};
    filteredTasksForSites.forEach((task) => {
      const dateKey = task.workDate;
      if (!acc[dateKey]) acc[dateKey] = { tasks: [], expenses: [] };
      acc[dateKey].tasks.push(task);
    });
    expenses.forEach((exp) => {
      const day = parseDay(exp.date);
      if (isBefore(day, cutoffSites)) return;
      if (sitesProjectId !== "all") {
        const matchesProject = exp.projectId === sitesProjectId;
        const taskSameDaySite = filteredTasksForSites.some(
          (t) => t.workDate === exp.date && t.siteId === sitesProjectId,
        );
        if (!matchesProject && !(taskSameDaySite && !exp.projectId)) return;
      }
      const dateKey = exp.date;
      if (!acc[dateKey]) acc[dateKey] = { tasks: [], expenses: [] };
      acc[dateKey].expenses.push(exp);
    });
    return acc;
  }, [filteredTasksForSites, expenses, cutoffSites, sitesProjectId]);

  const groupedTasksByDate = useMemo(() => {
    const acc: Record<string, typeof timelineTasks> = {};
    timelineTasks.forEach((task) => {
      const day = parseDay(task.workDate);
      if (isBefore(day, cutoffSites)) return;
      if (!acc[task.workDate]) acc[task.workDate] = [];
      acc[task.workDate].push(task);
    });
    return acc;
  }, [timelineTasks, cutoffSites]);

  const officeFiltered = useMemo(
    () =>
      buildOfficeActivity({
        expenseDaysBack: sitesDaysBack,
        expenses,
        invoices,
        payments,
        customers,
      }),
    [sitesDaysBack, expenses, invoices, payments, customers],
  );

  const kpiStrip = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);
    const tasksThisWeek = timelineTasks.filter((t) => {
      const d = parseDay(t.workDate);
      return !isBefore(d, weekStart) && isBefore(d, weekEnd);
    }).length;
    return [
      {
        label: tasksOverdueOnly ? "Overdue tasks" : "Work logs (all time)",
        value: timelineTasks.length,
      },
      { label: "This week", value: tasksThisWeek },
      { label: "In progress", value: projects.filter((p) => p.lifecycleStatus === "In Progress").length },
    ];
  }, [timelineTasks, tasksOverdueOnly, projects]);

  const mainTabs: {
    id: TimelineMainTab;
    label: string;
    hint: string;
    icon: typeof MapPin;
  }[] = [
    { id: "sites", label: "Sites & spend", hint: "Field work and costs by day", icon: MapPin },
    { id: "people", label: "Field team", hint: "Who did what — daily or weekly", icon: Users },
    { id: "office", label: "Office trail", hint: "Money & docs from app data", icon: Sparkles },
  ];

  return (
    <PageShell className="space-y-6 pb-10">
        <StickyPageHeader
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "Operations" },
            { label: "Timeline" },
          ]}
          subRow={
            <div className="flex w-full min-w-0 flex-col gap-2">
              {/* Row 1 — section toggles + window + granularity + active-sites link */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1" role="group" aria-label="Timeline section toggles">
                  {mainTabs.map(({ id, label, icon: Icon }) => {
                    const active = enabledSections.has(id);
                    return (
                      <Button
                        key={id}
                        type="button"
                        variant={active ? "secondary" : "ghost"}
                        size="sm"
                        className={cn("h-8 px-3 text-xs", active && "ring-1 ring-primary/30")}
                        onClick={() => toggleSection(id)}
                        aria-pressed={active}
                      >
                        <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        {label}
                      </Button>
                    );
                  })}
                </div>

                <div className="flex rounded-lg border bg-background p-0.5">
                  {([7, 14, 30] as const).map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant={sitesDaysBack === n ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setSitesDaysBack(n)}
                    >
                      {n}d
                    </Button>
                  ))}
                </div>

                <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Granularity">
                  <Button
                    type="button"
                    variant={peopleMode === "daily" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setPeopleMode("daily")}
                    aria-pressed={peopleMode === "daily"}
                  >
                    Daily
                  </Button>
                  <Button
                    type="button"
                    variant={peopleMode === "weekly" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setPeopleMode("weekly")}
                    aria-pressed={peopleMode === "weekly"}
                  >
                    Weekly
                  </Button>
                </div>

                <Button asChild variant="outline" size="sm" className="ml-auto h-8">
                  <Link to="/active-sites">Active sites</Link>
                </Button>
              </div>

              {/* Row 2 — project filter + KPI chips */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={sitesProjectId} onValueChange={setSitesProjectId}>
                  <SelectTrigger className="h-8 w-[220px] text-xs">
                    <SelectValue placeholder="All projects / sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects / sites</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap items-center gap-2">
                  {kpiStrip.map((k) => (
                    <div key={k.label} className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1">
                      <span className="whitespace-nowrap text-2xs uppercase tracking-wide text-muted-foreground">{k.label}</span>
                      <span className="text-xs font-semibold tabular-nums">{k.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        >
        </StickyPageHeader>

        {/* Merged chronological feed — Sites / People / Office events in one stream. */}
        <MergedTimelineFeed
          enabledSections={enabledSections}
          peopleMode={peopleMode}
          tasksByDateForProjects={tasksByDateForProjects}
          groupedTasksByDate={groupedTasksByDate}
          officeFiltered={officeFiltered}
          employees={employees}
          projects={projects}
          onWiden={() => setSitesDaysBack(30)}
        />

    </PageShell>
  );
};

export default Timeline;

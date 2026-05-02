import { useMemo, useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar,
  MapPin,
  IndianRupee,
  Package,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  Receipt,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Truck,
  Coffee,
  LayoutGrid,
  Users,
  Sparkles,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  subWeeks,
  addWeeks,
  isSameDay,
  subDays,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { WORK_STATUS_STAGES } from "@/types/blockage";
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
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
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
      accentClass: "text-emerald-600 bg-emerald-500/15",
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
      accentClass: "text-blue-600 bg-blue-500/15",
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
      accentClass: pay.direction === "in" ? "text-teal-600 bg-teal-500/15" : "text-rose-600 bg-rose-500/15",
    });
  });

  for (const [, rows] of map) {
    rows.sort((a, b) => String(a.details).localeCompare(String(b.details)));
  }

  return Object.fromEntries(
    [...map.entries()].sort(([da], [db]) => (da < db ? 1 : da > db ? -1 : 0)),
  );
}

function getWorkTypeColor(workType: string): string {
  const colors: Record<string, string> = {
    Structure: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    Panel: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    Inverter: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    Wiring: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    Earthing: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Civil: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    Meter: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    Transport: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  };
  return colors[workType] ?? "border-border bg-muted/60 text-muted-foreground";
}

const Timeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: TimelineMainTab =
    rawTab === "people" || rawTab === "office" || rawTab === "sites" ? rawTab : "sites";
  const rawPeopleMode = searchParams.get("peopleMode");
  const peopleMode: PeopleMode = rawPeopleMode === "weekly" ? "weekly" : "daily";

  const setTab = useCallback(
    (next: TimelineMainTab) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", next);
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

  const [majdoorFilterEmployee, setMajdoorFilterEmployee] = useState("all");
  const [majdoorFilterWorkType, setMajdoorFilterWorkType] = useState("all");
  const [majdoorFilterDate, setMajdoorFilterDate] = useState("all");
  const [selectedWeeklyEmployee, setSelectedWeeklyEmployee] = useState("all");

  const [officeDaysBack, setOfficeDaysBack] = useState<7 | 14 | 30>(14);
  const [officeFilterType, setOfficeFilterType] = useState<ActivityIconKey | "all">("all");

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const uniqueDates = [...new Set(tasks.map((t) => t.workDate))].sort().reverse();
  const uniqueEmployeeNames = [...new Set(employees.map((e) => e.name))];

  const cutoffSites = startOfDay(subDays(new Date(), sitesDaysBack));

  const filteredTasksForSites = useMemo(() => {
    return tasks.filter((task) => {
      const day = parseDay(task.workDate);
      if (isBefore(day, cutoffSites)) return false;
      if (sitesProjectId !== "all" && task.siteId !== sitesProjectId) return false;
      return true;
    });
  }, [tasks, cutoffSites, sitesProjectId]);

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

  const recentDatesWithData = useMemo(() => {
    return Object.keys(tasksByDateForProjects)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .filter((k) => {
        const d = tasksByDateForProjects[k];
        return (d.tasks.length ?? 0) > 0 || (d.expenses?.length ?? 0) > 0;
      });
  }, [tasksByDateForProjects]);

  const filteredTasksMajdoor = tasks.filter((task) => {
    const emp = employees.find((e) => e.id === task.employeeId);
    if (majdoorFilterEmployee !== "all" && emp?.name !== majdoorFilterEmployee) return false;
    if (majdoorFilterWorkType !== "all" && task.workType !== majdoorFilterWorkType) return false;
    if (majdoorFilterDate !== "all" && task.workDate !== majdoorFilterDate) return false;
    return true;
  });

  const groupedTasksByDate = useMemo(() => {
    return filteredTasksMajdoor.reduce(
      (acc, task) => {
        if (!acc[task.workDate]) acc[task.workDate] = [];
        acc[task.workDate].push(task);
        return acc;
      },
      {} as Record<string, typeof tasks>,
    );
  }, [filteredTasksMajdoor]);

  const employeeTasksForWeek = employees
    .map((emp) => {
      const empTasks = tasks.filter(
        (t) =>
          t.employeeId === emp.id &&
          weekDays.some((day) => isSameDay(parseDay(t.workDate), day)),
      );
      return {
        employee: emp,
        tasksByDay: weekDays.map((day) => ({
          date: day,
          tasks: empTasks.filter((t) => isSameDay(parseDay(t.workDate), day)),
        })),
        totalTasks: empTasks.length,
        completedTasks: empTasks.filter((t) => t.status === "done").length,
      };
    })
    .filter((e) => selectedWeeklyEmployee === "all" || e.employee.name === selectedWeeklyEmployee);

  const officeByDate = useMemo(
    () =>
      buildOfficeActivity({
        expenseDaysBack: officeDaysBack,
        expenses,
        invoices,
        payments,
        customers,
      }),
    [officeDaysBack, expenses, invoices, payments, customers],
  );

  const officeFiltered = useMemo(() => {
    const out: Record<string, BuiltActivityItem[]> = {};
    for (const [date, rows] of Object.entries(officeByDate)) {
      const f =
        officeFilterType === "all" ? rows : rows.filter((r) => r.icon === officeFilterType);
      if (f.length) out[date] = f;
    }
    return out;
  }, [officeByDate, officeFilterType]);

  const getEmployeeName = (empId: number) => employees.find((e) => e.id === empId)?.name ?? "Unknown";
  const getProjectName = (projId: string) => projects.find((p) => p.id === projId)?.name ?? projId;

  const kpiStrip = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 7);
    const tasksThisWeek = tasks.filter((t) => {
      const d = parseDay(t.workDate);
      return !isBefore(d, weekStart) && isBefore(d, weekEnd);
    }).length;
    return [
      { label: "Work logs (all time)", value: tasks.length },
      { label: "This week", value: tasksThisWeek },
      { label: "Open projects", value: projects.filter((p) => p.status === "Ongoing").length },
    ];
  }, [tasks, projects]);

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
    <TooltipProvider>
      <PageShell className="space-y-6 pb-10">
        <StickyPageHeader
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "Operations" },
            { label: "Timeline" },
          ]}
          subRow={
            <div className="flex flex-wrap gap-4 border-t border-border/60 pt-4">
              <div className="flex flex-wrap gap-3">
                {kpiStrip.map((k) => (
                  <div key={k.label} className="rounded-xl border bg-muted/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
                    <p className="text-lg font-semibold tabular-nums">{k.value}</p>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link to="/active-sites">Active sites</Link>
              </Button>
            </div>
          }
        >
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  One place for site work logs, team activity, and finance movement. Use the tabs below to switch
                  context — your choice is remembered in the URL (<code className="rounded bg-muted px-1 text-xs">?tab=</code>
                  ).
                </p>
              </div>
            </div>
          </div>
        </StickyPageHeader>

        {/* Primary tab switcher */}
        <div className="grid gap-2 rounded-2xl border bg-card/80 p-1.5 shadow-sm sm:grid-cols-3">
          {mainTabs.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left transition-all",
                tab === id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted/50 hover:bg-muted dark:bg-muted/25",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </span>
              <span
                className={cn(
                  "text-xs",
                  tab === id ? "text-primary-foreground/85" : "text-muted-foreground",
                )}
              >
                {hint}
              </span>
            </button>
          ))}
        </div>

        {/* Sites */}
        {tab === "sites" && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="overflow-hidden border-dashed">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-lg">Site activity & daily spend</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Tasks grouped by day with expenses recorded the same day. Narrow by project or window.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Window</span>
                    <div className="flex rounded-lg border bg-background p-0.5">
                      {([7, 14, 30] as const).map((n) => (
                        <Button
                          key={n}
                          type="button"
                          variant={sitesDaysBack === n ? "secondary" : "ghost"}
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => setSitesDaysBack(n)}
                        >
                          Last {n}d
                        </Button>
                      ))}
                    </div>
                    <Select value={sitesProjectId} onValueChange={setSitesProjectId}>
                      <SelectTrigger className="w-[min(100%,220px)]">
                        <SelectValue placeholder="Project filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All projects / sites</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {recentDatesWithData.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <LayoutGrid className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nothing in this window for the selected filters.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSitesDaysBack(30)}>
                      Try last 30 days
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/projects">Go to projects</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              recentDatesWithData.map((dateKey, dayIdx) => {
                const dayData = tasksByDateForProjects[dateKey];
                const transportExpenses = dayData.expenses.filter((e) => e.category === "Transport");
                const foodExpenses = dayData.expenses.filter(
                  (e) =>
                    e.category === "Food & Others" || e.subCategory?.toLowerCase().includes("food"),
                );
                const labourExpenses = dayData.expenses.filter((e) => e.category === "Labour");
                const totalCost = dayData.expenses.reduce((sum, e) => sum + e.amount, 0);
                const dayDate = parseDay(dateKey);
                const isToday = isSameDay(dayDate, new Date());

                return (
                  <div key={dateKey} className="relative">
                    {dayIdx < recentDatesWithData.length - 1 && (
                      <div className="absolute bottom-0 left-8 top-24 hidden w-px bg-gradient-to-b from-primary/40 to-border md:block" />
                    )}

                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      <div
                        className={cn(
                          "relative z-[1] rounded-2xl border px-5 py-3 shadow-sm",
                          isToday ? "border-primary bg-primary text-primary-foreground" : "bg-muted/60",
                        )}
                      >
                        <p className="text-lg font-bold">{isToday ? "Today" : format(dayDate, "EEE dd MMM")}</p>
                        {!isToday && (
                          <p className="text-xs opacity-80">{format(dayDate, "yyyy")}</p>
                        )}
                      </div>
                      <Separator orientation="vertical" className="hidden h-10 md:block" />
                      <Card className="flex-1 bg-muted/30">
                        <CardContent className="flex flex-wrap gap-4 py-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-help">
                                <p className="text-[10px] uppercase text-muted-foreground">Day spend</p>
                                <p className="font-semibold text-primary">{formatCompactMoney(totalCost)}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Sum of expenses dated this day (after filters).</TooltipContent>
                          </Tooltip>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" />
                              Transport {transportExpenses.length} ·{" "}
                              {formatCompactMoney(transportExpenses.reduce((s, e) => s + e.amount, 0))}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Coffee className="h-3.5 w-3.5" />
                              Food {foodExpenses.length}
                            </span>
                            <span>Labour {labourExpenses.length}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:pl-12">
                      {dayData.tasks.map((task, idx) => {
                        const emp = employees.find((e) => e.id === task.employeeId);
                        const project = projects.find((p) => p.id === task.siteId);

                        return (
                          <Card
                            key={`${task.id}-${idx}`}
                            className="border-l-4 border-l-primary/60 shadow-sm transition hover:shadow-md"
                          >
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                    <MapPin className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="truncate font-medium">
                                    {task.siteName || project?.name || task.siteId}
                                  </span>
                                </div>
                                <Badge variant={task.status === "done" ? "default" : "secondary"} className="shrink-0">
                                  {task.status === "done" ? "Done" : "Pending"}
                                </Badge>
                              </div>
                              <Badge variant="outline" className={cn("font-normal", getWorkTypeColor(task.workType))}>
                                {task.workType}
                              </Badge>
                              <p className="line-clamp-3 text-sm text-muted-foreground">{task.notes || "—"}</p>
                              <div className="flex items-center gap-2 border-t pt-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">
                                    {emp?.name?.charAt(0) ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{getEmployeeName(task.employeeId)}</span>
                              </div>
                              {project && (
                                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                                  <Link to={`/projects/${project.id}`}>Open project</Link>
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      {dayData.tasks.length === 0 && (
                        <Card className="border-dashed md:col-span-full">
                          <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No tasks — only expenses may exist for this date.
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* People */}
        {tab === "people" && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Field team</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Daily work log (filterable) or weekly heat-style summary per person.
                  </p>
                </div>
                <div className="flex rounded-xl border bg-muted/40 p-1">
                  <Button
                    type="button"
                    variant={peopleMode === "daily" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setPeopleMode("daily")}
                  >
                    <Calendar className="h-4 w-4" />
                    Daily log
                  </Button>
                  <Button
                    type="button"
                    variant={peopleMode === "weekly" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setPeopleMode("weekly")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Weekly board
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {peopleMode === "daily" && (
              <Card className="border-dashed">
                <CardContent className="flex flex-wrap gap-2 pt-6">
                  <Select value={majdoorFilterEmployee} onValueChange={setMajdoorFilterEmployee}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      {uniqueEmployeeNames.map((emp) => (
                        <SelectItem key={emp} value={emp}>
                          {emp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={majdoorFilterWorkType} onValueChange={setMajdoorFilterWorkType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Trade / type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All trades</SelectItem>
                      {WORK_STATUS_STAGES.flatMap((stage) => [
                        { value: stage.value, label: stage.label, isMain: true },
                        ...stage.subItems.map((sub) => ({ value: sub.value, label: sub.label, isMain: false })),
                      ]).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.isMain ? opt.label : `↳ ${opt.label}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={majdoorFilterDate} onValueChange={setMajdoorFilterDate}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      {uniqueDates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {format(parseDay(date), "dd MMM yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {peopleMode === "daily" && (
              <div className="space-y-8">
                {Object.keys(groupedTasksByDate).length === 0 ? (
                  <Card>
                    <CardContent className="py-14 text-center text-muted-foreground">
                      No tasks match these filters.
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(groupedTasksByDate)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .map(([date, dayTasks]) => (
                      <div key={date}>
                        <div className="mb-4 flex items-center gap-3">
                          <Badge className="bg-primary px-3 py-1.5 text-primary-foreground">
                            {format(parseDay(date), "EEEE dd MMM")}
                          </Badge>
                          <div className="h-px flex-1 bg-border" />
                          <Badge variant="secondary">{dayTasks.length} tasks</Badge>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {dayTasks.map((task) => {
                            const emp = employees.find((e) => e.id === task.employeeId);
                            const project = projects.find((p) => p.id === task.siteId);
                            return (
                              <Card key={task.id} className="overflow-hidden">
                                <CardContent className="space-y-3 p-4">
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-11 w-11 border border-border">
                                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                                        {emp?.name?.charAt(0) ?? "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium">{emp?.name ?? "Unknown"}</p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {task.siteName || project?.name || task.siteId}
                                      </p>
                                    </div>
                                    <Badge variant={task.status === "done" ? "default" : "secondary"}>
                                      {task.status === "done" ? "Done" : "Pending"}
                                    </Badge>
                                  </div>
                                  <Badge variant="outline" className={getWorkTypeColor(task.workType)}>
                                    {task.workType}
                                  </Badge>
                                  <p className="text-sm text-muted-foreground">{task.notes || "—"}</p>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {peopleMode === "weekly" && (
              <>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-4">
                  <Button variant="outline" size="icon" type="button" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    Week of {format(currentWeekStart, "dd MMM")} — {format(addDays(currentWeekStart, 6), "dd MMM yyyy")}
                  </span>
                  <Button variant="outline" size="icon" type="button" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Select value={selectedWeeklyEmployee} onValueChange={setSelectedWeeklyEmployee}>
                    <SelectTrigger className="ml-auto w-[220px]">
                      <SelectValue placeholder="Person" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Everyone</SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.name}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {employeeTasksForWeek.map((empData) => (
                    <Card key={empData.employee.id}>
                      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border">
                            <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                              {empData.employee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{empData.employee.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">{empData.employee.role}</p>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold tabular-nums">{empData.completedTasks}/{empData.totalTasks}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">done / total</p>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
                          {empData.tasksByDay.map((day, idx) => {
                            const completed = day.tasks.filter((t) => t.status === "done").length;
                            const pending = day.tasks.filter((t) => t.status !== "done").length;
                            const today = isSameDay(day.date, new Date());
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  "flex min-w-[7rem] flex-col rounded-xl border p-2.5 text-xs transition-colors",
                                  today ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-muted/20",
                                )}
                              >
                                <span className="font-semibold">{format(day.date, "EEE dd")}</span>
                                {day.tasks.length === 0 ? (
                                  <span className="mt-2 text-muted-foreground">—</span>
                                ) : (
                                  <>
                                    <span className="mt-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {completed}
                                    </span>
                                    {pending > 0 && (
                                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                        <AlertCircle className="h-3 w-3" />
                                        {pending}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-4 border-t pt-3 text-center text-sm">
                          <div className="flex-1 rounded-lg bg-muted/40 py-2">
                            <p className="text-xl font-bold">{empData.totalTasks}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">tasks</p>
                          </div>
                          <div className="flex-1 rounded-lg bg-muted/40 py-2">
                            <p className="text-xl font-bold">
                              {new Set(empData.tasksByDay.flatMap((d) => d.tasks.map((t) => t.siteId))).size}
                            </p>
                            <p className="text-[10px] uppercase text-muted-foreground">sites</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* Office */}
        {tab === "office" && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card>
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Office trail</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Built from invoices, payments, and expenses — newest days first. Filters refine the feed only.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Range</span>
                  <div className="flex rounded-lg border bg-background p-0.5">
                    {([7, 14, 30] as const).map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={officeDaysBack === n ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setOfficeDaysBack(n)}
                      >
                        {n}d
                      </Button>
                    ))}
                  </div>
                  <Select value={officeFilterType} onValueChange={(v) => setOfficeFilterType(v as typeof officeFilterType)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                      <SelectItem value="invoice">Invoices / bills</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {Object.keys(officeFiltered).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <Receipt className="h-10 w-10 opacity-40" />
                  <p>No finance rows in this range.</p>
                  <Button variant="outline" size="sm" onClick={() => setOfficeDaysBack(30)}>
                    Expand to 30 days
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                {Object.entries(officeFiltered).map(([isoDay, items]) => {
                  const dt = parseISO(`${isoDay}T12:00:00`);
                  return (
                    <Card key={isoDay} className="overflow-hidden shadow-sm">
                      <CardHeader className="border-b bg-gradient-to-r from-muted/80 to-transparent py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
                            {format(dt, "d")}
                          </div>
                          <div>
                            <CardTitle className="text-base">{format(dt, "EEEE dd MMM yyyy")}</CardTitle>
                            <p className="text-xs text-muted-foreground">{items.length} events</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 p-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 rounded-xl border border-transparent bg-muted/30 p-3 transition-colors hover:border-border hover:bg-muted/50"
                          >
                            <div
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                                item.accentClass,
                              )}
                            >
                              {activityIcon(item.icon)}
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0">
                                <p className="text-sm font-medium leading-tight">{item.action}</p>
                                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                  {item.timeLabel}
                                </span>
                              </div>
                              <p className="text-xs leading-snug text-muted-foreground">{item.details}</p>
                              <Badge variant="outline" className="text-[10px]">
                                {item.user}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </PageShell>
    </TooltipProvider>
  );
};

export default Timeline;

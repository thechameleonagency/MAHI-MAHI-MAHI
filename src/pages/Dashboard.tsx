import { useEffect, useMemo, useState } from "react";
import {
  IndianRupee,
  Users,
  AlertTriangle,
  MapPin,
  Calendar,
  Receipt,
  CreditCard,
  FileText,
  AlertCircle,
  PauseCircle,
  Building2,
  ExternalLink,
  ClipboardList,
  Package,
  LayoutGrid,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { DashboardEmiRow } from "@/components/dashboard/DashboardEmiRow";
import { DashboardInvoiceRow } from "@/components/dashboard/DashboardInvoiceRow";
import { DashboardQuotationRow } from "@/components/dashboard/DashboardQuotationRow";
import { DashboardProjectRow } from "@/components/dashboard/DashboardProjectRow";
import { DashboardTaskRow } from "@/components/dashboard/DashboardTaskRow";
import { DashboardActiveSiteRow } from "@/components/dashboard/DashboardActiveSiteRow";
import { DashboardLowStockRow } from "@/components/dashboard/DashboardLowStockRow";
import { DashboardEmployeeCard } from "@/components/dashboard/DashboardEmployeeCard";
import { DashboardBlockageRow } from "@/components/dashboard/DashboardBlockageRow";
import { DashboardOpsBlockageRow } from "@/components/dashboard/DashboardOpsBlockageRow";
import { Badge } from "@/components/ui/badge";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { buildCalendarEvents, getEventsForDate, getCalendarSourceLabel } from "@/lib/calendarSources";
import { useAppData } from "@/contexts/AppDataContext";
import { RoleDashboardService, type DashboardMetricKey } from "@/application/services/RoleDashboardService";
import {
  NeedToGetService,
  countActiveSitesByProjectId,
  needToGetLocationLabel,
} from "@/application/services/NeedToGetService";
import { NeedToGetSheet } from "@/components/need-to-get/NeedToGetSheet";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import {
  getRevenueCash,
  getOutstandingReceivables,
  partitionCashRevenueByBillKind,
} from "@/domain/finance/financialSemantics";
import {
  isProjectActiveForOperations,
  isProjectActiveForSiteExecution,
  isProjectLifecycleOnHold,
} from "@/lib/projectListFilters";
import { getInvoiceOpenBalance } from "@/lib/billingSelectors";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardEnquiryRow } from "@/components/dashboard/DashboardEnquiryRow";
import { DashboardTodaysSiteActivity } from "@/components/dashboard/DashboardTodaysSiteActivity";
import { buildTodaysSiteActivitySnapshot } from "@/lib/todaysSiteActivity";
import {
  buildProjectActorScopeContext,
  filterEnquiriesForActor,
  filterProjectsForActor,
  filterQuotationsForActor,
} from "@/lib/projectActorScope";
import { buildEnquiryToQuotationDraft, quickCreatePath, saveCreateDraft } from "@/lib/createFromContext";
import {
  FIELD_OPS_METRICS,
  resolveDashboardOnboardingVariant,
  SALES_PIPELINE_METRICS,
} from "@/lib/dashboardOnboarding";
import { DashboardOnboardingHero } from "@/components/dashboard/DashboardOnboardingHero";
import { useCan } from "@/hooks/useCan";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import {
  getEnquiryFollowUpAging,
  getInvoiceOverdueAging,
  getLoanDashboardAging,
  getProjectIdleAging,
  getQuotationInFlightAging,
  getTaskOverdueAging,
} from "@/lib/agingHelpers";
import { AgingChip } from "@/components/ui/AgingChip";
import { formatINR } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { showCommandErrorToast } from "@/lib/commandErrorToast";
import { routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { resolveQuotationCustomerId } from "@/lib/selectors";
import {
  getDashboardKpiListLabel,
  getDashboardKpiListPath,
} from "@/lib/dashboardKpiNavigation";
import {
  getLoanEmiDueDate,
  isLoanEmiDueWithinDays,
  isLoanEmiOverdue,
  startOfLocalDay,
} from "@/lib/loanEmiDue";

type StatCardDetailLine = {
  id: string;
  text?: string;
  content?: React.ReactNode;
};

type StatCardDef = {
  id: string;
  metric: DashboardMetricKey;
  title: string;
  value: string;
  icon: typeof IndianRupee;
  iconClass: string;
  hint: string;
  hintTone: "positive" | "negative" | "neutral";
  details?: StatCardDetailLine[];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [routeDeniedBannerPath, setRouteDeniedBannerPath] = useState<string | null>(null);

  useEffect(() => {
    const denied = (location.state as { routeAccessDeniedPath?: string } | null)?.routeAccessDeniedPath;
    if (!denied) return;
    setRouteDeniedBannerPath(denied);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);
  const {
    projects,
    customers,
    employees,
    invoices,
    saleBills,
    payments,
    quotations,
    loans,
    inventoryItems,
    lowStockItems: contextLowStockItems,
    sites,
    vendorBills,
    enquiries,
    blockages,
    tasks,
    scheduledInstallations,
    siteVisits,
    loanRepayments,
    transitionEnquiryStatus,
    convertEnquiryToCustomer,
    materialReservations,
    materialDamageRecords,
    projectTimelineByProjectId,
    teams,
    settingsTeamMembers,
  } = useAppData();
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const { permissionService } = useFoundation();
  const canCreateEnquiry = useCan("enquiry", "create");
  const canAccessEnquiries = permissionService.canAccessPath(currentRole, "/enquiries");
  const canAccessActiveSites = permissionService.canAccessPath(currentRole, "/active-sites");
  const dashboardService = useMemo(() => new RoleDashboardService(), []);
  const needToGetService = useMemo(() => new NeedToGetService(), []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [needToGetOpen, setNeedToGetOpen] = useState(false);
  const [isNtgCollapsed, setIsNtgCollapsed] = useState(true);
  const [kpiShellReady, setKpiShellReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setKpiShellReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const actorScopeCtx = useMemo(
    () =>
      buildProjectActorScopeContext({
        role: currentRole,
        actorMemberId: sessionUserId,
        actorDisplayName: demoUserName,
        quotations,
        enquiries,
        teams,
        employees,
        settingsTeamMembers,
        scheduledInstallations,
        projects,
      }),
    [
      currentRole,
      sessionUserId,
      demoUserName,
      quotations,
      enquiries,
      teams,
      employees,
      settingsTeamMembers,
      scheduledInstallations,
      projects,
    ],
  );

  const openPipelineEnquiries = useMemo(
    () =>
      filterEnquiriesForActor(
        enquiries.filter((e) => e.status !== "converted" && e.status !== "lost"),
        actorScopeCtx,
      ),
    [enquiries, actorScopeCtx],
  );

  const scopedProjects = useMemo(
    () => filterProjectsForActor(projects, actorScopeCtx),
    [projects, actorScopeCtx],
  );

  const scopedQuotations = useMemo(
    () => filterQuotationsForActor(quotations, actorScopeCtx),
    [quotations, actorScopeCtx],
  );

  const ongoingProjectIds = useMemo(
    () =>
      new Set(
        scopedProjects.filter((p) => isProjectActiveForSiteExecution(p)).map((p) => p.id),
      ),
    [scopedProjects],
  );

  const sitesOnOngoingProjects = useMemo(
    () => sites.filter((s) => s.projectId && ongoingProjectIds.has(s.projectId)),
    [sites, ongoingProjectIds],
  );

  const activeOpsBlockages = useMemo(
    () => (blockages ?? []).filter((b) => b.status === "active"),
    [blockages],
  );

  const projectsOnHoldList = useMemo(
    () => scopedProjects.filter((p) => isProjectLifecycleOnHold(p)),
    [scopedProjects],
  );

  const opsBlockageProjectCount = useMemo(
    () => new Set(activeOpsBlockages.map((b) => b.projectId)).size,
    [activeOpsBlockages],
  );

  const projectNameById = useMemo(
    () => new Map(scopedProjects.map((p) => [p.id, p.name])),
    [scopedProjects],
  );

  const stats = useMemo(() => {
    const totalRevenue = getRevenueCash(payments);
    const cashSplit = partitionCashRevenueByBillKind(payments, invoices, saleBills);

    const activeProjects = scopedProjects.filter((p) => isProjectActiveForOperations(p)).length;
    const completedCount = scopedProjects.filter(
      (p) => p.lifecycleStatus === "Completed" || p.status === "Completed",
    ).length;

    const activeEmployees = employees.filter((e) => e.status === "Active").length;
    const onLeave = employees.filter((e) => e.status !== "Active").length;

    const openBillingDocs = [...invoices, ...saleBills].filter(
      (inv) => inv.status !== "paid" && inv.status !== "voided" && inv.status !== "draft",
    );
    const pendingInvoices = openBillingDocs.filter((inv) => getInvoiceOpenBalance(inv, payments) > 0.01);
    const pendingAmount = getOutstandingReceivables(invoices, payments, saleBills);

    const pendingQuotations = scopedQuotations.filter(
      (q) => q.status === "draft" || q.status === "sent",
    );

    const activeBlockages = projectsOnHoldList.length;

    const activeLoansList = loans.filter((l) => l.status === "Active");
    const upcomingEmiAmount = activeLoansList.reduce((sum, l) => sum + l.emiAmount, 0);

    return {
      totalRevenue,
      cashSplit,
      activeProjects,
      completedCount,
      activeEmployees,
      onLeave,
      pendingAmount,
      pendingInvoices,
      pendingQuotations,
      activeBlockages,
      activeLoans: activeLoansList,
      upcomingEmiAmount,
      openOpsBlockagesCount: activeOpsBlockages.length,
    };
  }, [
    scopedProjects,
    projectsOnHoldList,
    employees,
    invoices,
    saleBills,
    payments,
    scopedQuotations,
    loans,
    activeOpsBlockages,
  ]);

  const lowStockItems = useMemo(
    () =>
      contextLowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        min: item.minStock ?? 0,
        category: item.category,
      })),
    [contextLowStockItems],
  );

  const startOfToday = useMemo(() => startOfLocalDay(), []);

  const activeEmiLoans = useMemo(
    () => loans.filter((l) => l.status === "Active" && l.paymentType === "emi"),
    [loans],
  );

  const emiDueWithin7Days = useMemo(
    () => activeEmiLoans.filter((l) => isLoanEmiDueWithinDays(l, 7, startOfToday)),
    [activeEmiLoans, startOfToday],
  );

  const emiOverdue = useMemo(
    () => activeEmiLoans.filter((l) => isLoanEmiOverdue(l, startOfToday)),
    [activeEmiLoans, startOfToday],
  );

  const groupedLowStockItems = lowStockItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof lowStockItems>,
  );

  const presentEmployees = useMemo(() => {
    return employees.filter((e) => e.status === "Active").map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      phone: e.phone,
      site: e.site,
      initial: e.initial,
    }));
  }, [employees]);

  const needToGetRows = useMemo(
    () =>
      needToGetService.buildRows(
        sites,
        scopedProjects,
        inventoryItems,
        vendorBills,
        materialReservations ?? [],
        materialDamageRecords ?? [],
      ),
    [
      needToGetService,
      sites,
      scopedProjects,
      inventoryItems,
      vendorBills,
      materialReservations,
      materialDamageRecords,
    ],
  );

  const ntgActiveSitesPerProject = useMemo(() => countActiveSitesByProjectId(sites), [sites]);

  const visibleMetrics = useMemo(() => new Set(dashboardService.getVisibleMetrics(currentRole)), [currentRole, dashboardService]);

  const overdueFollowUpEnquiries = useMemo(
    () => openPipelineEnquiries.filter((e) => getEnquiryFollowUpAging(e) != null),
    [openPipelineEnquiries],
  );

  const overdueTasksList = useMemo(
    () => tasks.filter((t) => getTaskOverdueAging(t) != null),
    [tasks],
  );

  const pipelineCounts = useMemo(
    () => ({
      openPipelineEnquiries: openPipelineEnquiries.length,
      overdueFollowUpEnquiries: overdueFollowUpEnquiries.length,
      pendingQuotations: stats.pendingQuotations.length,
      activeProjects: stats.activeProjects,
      sitesOnOngoingProjects: sitesOnOngoingProjects.length,
      overdueTasks: overdueTasksList.length,
      openOpsBlockages: stats.openOpsBlockagesCount,
      needToGetRows: needToGetRows.length,
    }),
    [
      openPipelineEnquiries.length,
      overdueFollowUpEnquiries.length,
      stats.pendingQuotations.length,
      stats.activeProjects,
      sitesOnOngoingProjects.length,
      overdueTasksList.length,
      stats.openOpsBlockagesCount,
      needToGetRows.length,
    ],
  );

  const onboardingVariant = useMemo(
    () => resolveDashboardOnboardingVariant(visibleMetrics, pipelineCounts),
    [visibleMetrics, pipelineCounts],
  );

  const metricsSuppressedByOnboarding = useMemo(() => {
    if (onboardingVariant === "sales_pipeline") {
      return new Set<DashboardMetricKey>(SALES_PIPELINE_METRICS);
    }
    if (onboardingVariant === "field_ops") {
      return new Set<DashboardMetricKey>(FIELD_OPS_METRICS);
    }
    return new Set<DashboardMetricKey>();
  }, [onboardingVariant]);

  const statCardsRaw: StatCardDef[] = [
    {
      id: "enquiries",
      metric: "openEnquiries",
      title: "Open enquiries",
      value: String(openPipelineEnquiries.length),
      icon: ClipboardList,
      iconClass: "bg-accent text-white shadow-sm shadow-violet-600/20",
      hint: "Tap to act on pipeline",
      hintTone: openPipelineEnquiries.length > 0 ? "neutral" : "positive",
    },
    {
      id: "followUps",
      metric: "overdueFollowUps",
      title: "Follow-ups overdue",
      value: String(overdueFollowUpEnquiries.length),
      icon: Calendar,
      iconClass: "bg-warning text-white shadow-sm",
      hint: "Needs contact today",
      hintTone: overdueFollowUpEnquiries.length > 0 ? "negative" : "positive",
    },
    {
      id: "quotations",
      metric: "quotationsInFlight",
      title: "Quotations pending",
      value: String(stats.pendingQuotations.length),
      icon: FileText,
      iconClass: "bg-primary text-primary-foreground shadow-sm shadow-primary/20",
      hint: "Draft or sent — approve / convert",
      hintTone: stats.pendingQuotations.length > 0 ? "negative" : "positive",
    },
    {
      id: "projects",
      metric: "activeProjects",
      title: "Active projects",
      value: String(stats.activeProjects),
      icon: Building2,
      iconClass: "bg-primary text-primary-foreground shadow-sm",
      hint: `${stats.completedCount} completed all-time`,
      hintTone: "neutral",
    },
    {
      id: "activeSites",
      metric: "activeSites",
      title: "Sites live",
      value: String(sitesOnOngoingProjects.length),
      icon: MapPin,
      iconClass: "bg-success text-success-foreground shadow-sm shadow-success/20",
      hint: "Ongoing execution",
      hintTone: "neutral",
    },
    {
      id: "tasks",
      metric: "overdueTasks",
      title: "Overdue tasks",
      value: String(overdueTasksList.length),
      icon: ClipboardList,
      iconClass: "bg-warning text-white shadow-sm",
      hint: "Past work date, not done",
      hintTone: overdueTasksList.length > 0 ? "negative" : "positive",
    },
    {
      id: "pending",
      metric: "receivables",
      title: "Receivables due",
      value: `₹${(stats.pendingAmount / 100000).toFixed(1)}L`,
      icon: Receipt,
      iconClass: "bg-warning text-white shadow-sm shadow-amber-500/20",
      hint: `${stats.pendingInvoices.length} open invoices`,
      hintTone: stats.pendingAmount > 0 ? "negative" : "positive",
    },
    {
      id: "needToGet",
      metric: "procurementGaps",
      title: "Procurement gaps",
      value: String(needToGetRows.length),
      icon: Package,
      iconClass: "bg-accent text-accent-foreground shadow-sm",
      hint: "Shortfall vs reservations",
      hintTone: needToGetRows.length > 0 ? "negative" : "positive",
    },
    {
      id: "stock",
      metric: "lowStockMaterials",
      title: "Low stock SKUs",
      value: String(lowStockItems.length),
      icon: AlertTriangle,
      iconClass: "bg-destructive text-destructive-foreground shadow-sm",
      hint: "Below min threshold",
      hintTone: lowStockItems.length > 0 ? "negative" : "positive",
    },
    {
      id: "emis",
      metric: "emiDueSoon",
      title: "EMI due (7d)",
      value: String(emiDueWithin7Days.length),
      icon: CreditCard,
      iconClass: "bg-warning text-white shadow-sm",
      hint: emiOverdue.length > 0 ? `${emiOverdue.length} overdue` : "Next week",
      hintTone: emiDueWithin7Days.length + emiOverdue.length > 0 ? "negative" : "positive",
    },
    {
      id: "blockages",
      metric: "openBlockages",
      title: "Ops blockages",
      value: String(stats.openOpsBlockagesCount),
      icon: AlertCircle,
      iconClass: cn(
        stats.openOpsBlockagesCount > 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
        "shadow-sm",
      ),
      hint:
        stats.openOpsBlockagesCount > 0
          ? `${opsBlockageProjectCount} project${opsBlockageProjectCount === 1 ? "" : "s"} affected`
          : "Timeline clear",
      hintTone: stats.openOpsBlockagesCount > 0 ? "negative" : "positive",
    },
    {
      id: "projectsOnHold",
      metric: "projectsOnHold",
      title: "Projects on hold",
      value: String(stats.activeBlockages),
      icon: PauseCircle,
      iconClass: cn(
        stats.activeBlockages > 0 ? "bg-warning text-white shadow-sm" : "bg-primary text-primary-foreground",
        "shadow-sm",
      ),
      hint: "Managerial hold",
      hintTone: stats.activeBlockages > 0 ? "negative" : "positive",
    },
  ];

  const statsCards = statCardsRaw.filter((c) => visibleMetrics.has(c.metric));

  const activeProjectsList = useMemo(
    () =>
      scopedProjects.filter(
        (p) => isProjectActiveForOperations(p) || isProjectLifecycleOnHold(p),
      ),
    [scopedProjects],
  );

  const sortedEmiLoans = useMemo(
    () =>
      [...activeEmiLoans]
        .map((loan) => ({ loan, due: getLoanEmiDueDate(loan) }))
        .filter((x): x is { loan: (typeof activeEmiLoans)[0]; due: Date } => x.due != null)
        .sort((a, b) => a.due.getTime() - b.due.getTime()),
    [activeEmiLoans],
  );

  const statsCardsWithDetails = useMemo(() => {
    return statsCards.map((card) => {
      switch (card.id) {
        case "emis":
          return {
            ...card,
            details: sortedEmiLoans.slice(0, 3).map(({ loan, due }) => ({
              id: loan.id,
              content: (
                <span className="inline-flex flex-wrap items-center gap-1">
                  <span>
                    {loan.personName ?? loan.source} · {format(due, "d MMM")} · {formatINR(loan.emiAmount || 0)}
                  </span>
                  <AgingChip signal={getLoanDashboardAging(loan, loanRepayments ?? [])} />
                </span>
              ),
            })),
          };
        case "enquiries":
          return {
            ...card,
            details: openPipelineEnquiries.slice(0, 3).map((e) => ({
              id: e.id,
              text: `${e.customerName} · ${e.status.replace(/_/g, " ")}`,
            })),
          };
        case "followUps":
          return {
            ...card,
            details: overdueFollowUpEnquiries.slice(0, 3).map((e) => ({
              id: e.id,
              text: `${e.customerName} · follow-up ${e.followUpDate ?? "—"}`,
            })),
          };
        case "quotations":
          return {
            ...card,
            details: stats.pendingQuotations.slice(0, 3).map((q) => {
              const customerId = resolveQuotationCustomerId(q);
              return {
                id: q.id,
                content: (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    {customerId ? (
                      <EntityLink
                        entityType="customer"
                        entityId={customerId}
                        name={q.clientName}
                        className="text-2xs font-normal"
                      />
                    ) : (
                      <span>{q.clientName}</span>
                    )}
                    <span>· {q.quotationNumber}</span>
                    <AgingChip signal={getQuotationInFlightAging(q)} />
                  </span>
                ),
              };
            }),
          };
        case "projects":
          return {
            ...card,
            details: activeProjectsList.slice(0, 3).map((p) => {
              const customerId = p.customerId;
              return {
                id: p.id,
                content: (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    <EntityLink
                      entityType="project"
                      entityId={p.id}
                      name={p.name}
                      className="text-2xs font-normal"
                    />
                    <span>·</span>
                    {customerId ? (
                      <EntityLink
                        entityType="customer"
                        entityId={customerId}
                        name={p.client}
                        className="text-2xs font-normal"
                      />
                    ) : (
                      <span>{p.client}</span>
                    )}
                    <AgingChip signal={getProjectIdleAging(p)} />
                  </span>
                ),
              };
            }),
          };
        case "activeSites":
          return {
            ...card,
            details: sitesOnOngoingProjects.slice(0, 3).map((s) => ({
              id: String(s.id),
              content: (
                <span className="inline-flex flex-wrap items-center gap-x-1">
                  <span>{s.name}</span>
                  <span>·</span>
                  {s.projectId && s.projectName ? (
                    <EntityLink
                      entityType="project"
                      entityId={s.projectId}
                      name={s.projectName}
                      className="text-2xs font-normal"
                    />
                  ) : (
                    <span>{s.projectName ?? "—"}</span>
                  )}
                </span>
              ),
            })),
          };
        case "tasks":
          return {
            ...card,
            details: overdueTasksList.slice(0, 3).map((t) => ({
              id: t.id,
              text: `${t.workType} · due ${t.workDate}`,
            })),
          };
        case "pending":
          return {
            ...card,
            details: stats.pendingInvoices.slice(0, 3).map((inv) => {
              const balance = Math.round(getInvoiceOpenBalance(inv, payments));
              return {
                id: inv.id,
                content: (
                  <span className="inline-flex flex-wrap items-center gap-x-1">
                    {inv.customerId ? (
                      <EntityLink
                        entityType="customer"
                        entityId={inv.customerId}
                        name={inv.customerName}
                        className="text-2xs font-normal"
                      />
                    ) : (
                      <span>{inv.customerName}</span>
                    )}
                    <span>
                      · {formatINR(balance)}
                    </span>
                  </span>
                ),
              };
            }),
          };
        case "needToGet":
          return {
            ...card,
            details: needToGetRows.slice(0, 3).map((r) => ({
              id: `${r.projectId}-${r.materialId}`,
              text: `${r.materialName} · −${r.qtyShort}`,
            })),
          };
        case "stock":
          return {
            ...card,
            details: lowStockItems.slice(0, 3).map((item) => ({
              id: String(item.id),
              text: `${item.name} · ${item.stock} left (min ${item.min})`,
            })),
          };
        case "blockages":
          return {
            ...card,
            details: activeOpsBlockages.slice(0, 3).map((b) => ({
              id: b.id,
              text: `${b.title} · ${projectNameById.get(b.projectId) ?? b.projectId}`,
            })),
          };
        case "projectsOnHold":
          return {
            ...card,
            details: projectsOnHoldList.slice(0, 3).map((p) => ({
              id: p.id,
              text: `${p.name} · ${p.client}`,
            })),
          };
        default:
          return card;
      }
    });
  }, [
    statsCards,
    sortedEmiLoans,
    openPipelineEnquiries,
    overdueFollowUpEnquiries,
    stats.pendingQuotations,
    stats.pendingInvoices,
    activeProjectsList,
    sitesOnOngoingProjects,
    overdueTasksList,
    needToGetRows,
    lowStockItems,
    activeOpsBlockages,
    projectsOnHoldList,
    projectNameById,
    customers,
    loanRepayments,
    projects,
  ]);

  const kpiCardsToShow = useMemo(
    () =>
      metricsSuppressedByOnboarding.size === 0
        ? statsCardsWithDetails
        : statsCardsWithDetails.filter((c) => !metricsSuppressedByOnboarding.has(c.metric)),
    [statsCardsWithDetails, metricsSuppressedByOnboarding],
  );

  const handleCardClick = (cardId: string) => {
    if (cardId === "needToGet") {
      setNeedToGetOpen(true);
      return;
    }
    setActiveModal(cardId);
  };

  const handleDashboardSendQuotation = async (enquiryId: string) => {
    const result = await transitionEnquiryStatus(enquiryId, "quotation_sent");
    if (!result.ok) {
      showCommandErrorToast("Could not update", result.error, "Could not update enquiry status.");
      return;
    }
    toast({ title: "Quotation sent", description: "Enquiry and linked quotation are marked sent." });
  };

  const handleDashboardConvertEnquiry = async (enquiry: import("@/types/project").Enquiry) => {
    const result = await convertEnquiryToCustomer(enquiry.id);
    if (!result.ok) {
      showCommandErrorToast("Conversion failed", result.error, "Could not convert enquiry.");
      return;
    }
    toast({ title: "Enquiry converted", description: "Create quotation when ready." });
  };

  const handleDashboardCreateQuotation = (enquiry: import("@/types/project").Enquiry) => {
    const gate = assertCanLinkNewQuotationToEnquiry(enquiry, currentRole);
    if (!gate.ok) {
      toast({ title: "Cannot create quotation", description: gate.message, variant: "destructive" });
      return;
    }
    const draft = buildEnquiryToQuotationDraft(enquiry);
    saveCreateDraft("quotation-create-draft", draft);
    setActiveModal(null);
    navigate(`/quotations?createFrom=enq:${enquiry.id}`);
  };

  const handleEmployeeClick = (empId: number) => {
    setActiveModal(null);
    navigate(`/employees/${empId}`);
  };

  const navigateToPage = (path: string) => {
    setActiveModal(null);
    navigate(path);
  };

  const navigateToKpiList = (cardId: string) => {
    const path = getDashboardKpiListPath(cardId);
    if (path) navigateToPage(path);
  };

  const hintClass: Record<StatCardDef["hintTone"], string> = {
    positive: "text-success/90 dark:text-success/90",
    negative: "text-warning dark:text-warning/90",
    neutral: "text-muted-foreground",
  };

  const quickActions: { label: string; desc: string; icon: typeof IndianRupee; path: string; show: boolean }[] = [
    {
      label: "New enquiry",
      desc: "Log a lead",
      icon: ClipboardList,
      path: "/enquiries",
      show: permissionService.canAccessPath(currentRole, "/enquiries"),
    },
    {
      label: "Quotation",
      desc: "Create quote",
      icon: FileText,
      path: "/quotations?create",
      show: permissionService.canAccessPath(currentRole, "/quotations"),
    },
    {
      label: "Project",
      desc: "Start build",
      icon: Building2,
      path: "/projects?create=true",
      show: permissionService.canAccessPath(currentRole, "/projects"),
    },
    {
      label: "Invoice",
      desc: "Bill client",
      icon: IndianRupee,
      path: "/invoices?create=invoice",
      show: permissionService.canAccessPath(currentRole, "/invoices"),
    },
    {
      label: "Active sites",
      desc: "Field status",
      icon: MapPin,
      path: "/active-sites",
      show: permissionService.canAccessPath(currentRole, "/active-sites"),
    },
    {
      label: "Materials",
      desc: "Stock & need",
      icon: Package,
      path: "/inventory/materials",
      show: permissionService.canAccessPath(currentRole, "/inventory/materials"),
    },
    {
      label: "Finance",
      desc: "Cash & ledgers",
      icon: LayoutGrid,
      path: "/finance",
      show: permissionService.canAccessPath(currentRole, "/finance"),
    },
    {
      label: "Attendance",
      desc: "Team presence",
      icon: Users,
      path: "/attendance",
      show: permissionService.canAccessPath(currentRole, "/attendance"),
    },
  ];

  const todayLabel = format(new Date(), "EEEE, d MMMM yyyy");
  const todayIso = format(new Date(), "yyyy-MM-dd");

  const todaysSiteActivity = useMemo(
    () =>
      buildTodaysSiteActivitySnapshot({
        projects: scopedProjects,
        blockages: blockages ?? [],
        tasks,
        todayIso,
        projectTimelineByProjectId,
      }),
    [scopedProjects, blockages, tasks, todayIso, projectTimelineByProjectId],
  );

  const todaySchedule = useMemo(() => {
    const events = buildCalendarEvents({
      tasks,
      scheduledInstallations: scheduledInstallations ?? [],
      enquiries,
      invoices: [...invoices, ...saleBills],
      vendorBills,
      loans,
      loanRepayments: loanRepayments ?? [],
      siteVisits: siteVisits ?? [],
      projects: scopedProjects,
    });
    return getEventsForDate(events, todayIso).slice(0, 10);
  }, [
    tasks,
    scheduledInstallations,
    enquiries,
    invoices,
    saleBills,
    vendorBills,
    loans,
    loanRepayments,
    siteVisits,
    scopedProjects,
    todayIso,
  ]);

  return (
    <PageShell className="space-y-0">
      <StickyPageHeader
        className="mb-2 border-0 bg-transparent px-0 py-0 shadow-none backdrop-blur-none supports-[backdrop-filter]:bg-transparent sm:px-0"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
      />

      {routeDeniedBannerPath && (
        <div
          className="mb-4 flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <p className="text-sm text-foreground">
            {routeAccessDeniedToastContent(routeDeniedBannerPath, currentRole).description}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 self-end sm:self-center"
            onClick={() => setRouteDeniedBannerPath(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="space-y-8 md:space-y-10">
        {/* KPI grid */}
        <section aria-labelledby="dash-kpis-heading">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm tabular-nums text-muted-foreground">{todayLabel}</span>
              <span className="text-muted-foreground/45 hidden sm:inline" aria-hidden>
                ·
              </span>
              <h2 id="dash-kpis-heading" className="ds-section-title mb-0">
                Key metrics
              </h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-right md:max-w-md">
              Filtered for your role. Tap a tile for a quick preview, or open the full filtered list.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {!kpiShellReady
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl border border-border/40" />)
              : (
                <>
                  {onboardingVariant && (
                    <div className="sm:col-span-2 xl:col-span-4">
                      <DashboardOnboardingHero
                        variant={onboardingVariant}
                        canCreateEnquiry={canCreateEnquiry}
                        canAccessEnquiries={canAccessEnquiries}
                        canAccessActiveSites={canAccessActiveSites}
                        onPrimaryAction={() => {
                          if (onboardingVariant === "sales_pipeline") {
                            navigate(
                              canCreateEnquiry && canAccessEnquiries
                                ? quickCreatePath("/enquiries")
                                : "/enquiries",
                            );
                            return;
                          }
                          navigate(
                            canAccessActiveSites
                              ? "/active-sites"
                              : "/inventory/materials",
                          );
                        }}
                        onSecondaryAction={
                          onboardingVariant === "sales_pipeline" && canAccessEnquiries
                            ? () => navigate("/enquiries")
                            : undefined
                        }
                      />
                    </div>
                  )}
                  {kpiCardsToShow.map((card) => {
                  const Icon = card.icon;
                  const listPath = getDashboardKpiListPath(card.id);
                  return (
                    <div
                      key={card.id}
                      className="group relative flex flex-col rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-primary/35 hover:bg-muted/20"
                    >
                      <button
                        type="button"
                        onClick={() => handleCardClick(card.id)}
                        className="flex flex-1 flex-col p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                      >
                        <div className="flex w-full items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="truncate text-xs2 font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {card.title}
                            </span>
                            <div className="flex items-baseline gap-2">
                              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{card.value}</p>
                              <p className={cn("rounded-full bg-muted/50 px-1.5 py-0.5 text-2xs font-medium", hintClass[card.hintTone])}>
                                {card.hint}
                              </p>
                            </div>
                            {card.details && card.details.length > 0 && (
                              <ul className="mt-2 space-y-0.5 border-t border-border/40 pt-2">
                                {card.details.map((line) => (
                                  <li key={line.id} className="truncate text-2xs text-muted-foreground">
                                    {line.content ?? line.text}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-[1.05]",
                                card.iconClass,
                              )}
                            >
                              <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight className="absolute right-3 top-4 h-4 w-4 text-muted-foreground/0 transition group-hover:text-muted-foreground/40" />
                      </button>
                      {listPath ? (
                        <button
                          type="button"
                          onClick={() => navigate(listPath)}
                          className="border-t border-border/50 px-4 py-2 text-left text-2xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-b-xl"
                        >
                          {getDashboardKpiListLabel(card.id)} →
                        </button>
                      ) : null}
                    </div>
                  );
                  })}
                </>
              )}
          </div>
        </section>

        {permissionService.canAccessPath(currentRole, "/calendar") && (
          <section aria-labelledby="dash-schedule-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <h2 id="dash-schedule-heading" className="ds-section-title mb-0">
                Today&apos;s schedule
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/calendar")}>
                Open calendar
              </Button>
            </div>
            <Card>
              <CardContent className="p-4">
                {todaySchedule.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled for today.</p>
                ) : (
                  <ul className="space-y-2">
                    {todaySchedule.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getCalendarSourceLabel(ev.source)}
                            {ev.subtitle ? ` · ${ev.subtitle}` : ""}
                          </p>
                        </div>
                        {ev.href && (
                          <Button variant="ghost" size="sm" className="shrink-0 h-8" onClick={() => navigate(ev.href!)}>
                            View
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick actions — full grid */}
        <section aria-labelledby="dash-actions-heading">
          <h2 id="dash-actions-heading" className="ds-section-title mb-3">
            Quick actions
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {!kpiShellReady
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl border border-border/40" />)
              : quickActions
              .filter((a) => a.show)
              .map((a) => (
                <button
                  key={a.path}
                  type="button"
                  onClick={() => navigate(a.path)}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm transition hover:border-primary/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <a.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{a.label}</span>
                    <span className="block text-xs text-muted-foreground">{a.desc}</span>
                  </span>
                </button>
              ))}
          </div>
        </section>

        {/* Attention + pipeline */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="space-y-6 lg:col-span-7">
            {canAccessActiveSites && (
              <DashboardTodaysSiteActivity snapshot={todaysSiteActivity} todayLabel={todayLabel} />
            )}

            {permissionService.canAccessPath(currentRole, "/inventory/materials") && (
              <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <span className="text-sm font-semibold text-foreground">Need-to-get procurement</span>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {needToGetRows.length} shortfalls
                  </Badge>
                </div>
                <CardContent className="space-y-4 p-5 pt-6">
                  {needToGetRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No site checklist shortfalls vs warehouse stock.</p>
                  ) : (
                    <div className="space-y-2">
                      <ul className="space-y-2">
                        {needToGetRows.slice(0, isNtgCollapsed ? 2 : needToGetRows.length).map((row) => (
                          <li
                            key={`${row.projectId}-${row.siteId}-${row.materialId}`}
                            className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium leading-snug">{row.materialName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {needToGetLocationLabel(row, ntgActiveSitesPerProject, scopedProjects)}
                              </p>
                            </div>
                            <Badge className="shrink-0 bg-destructive/10 text-destructive dark:text-destructive border-0">
                              −{row.qtyShort}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      {needToGetRows.length > 2 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setIsNtgCollapsed(!isNtgCollapsed)}
                        >
                          {isNtgCollapsed ? `View ${needToGetRows.length - 2} more...` : "Collapse view"}
                        </Button>
                      )}
                    </div>
                  )}
                  <Separator />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="flex-1 rounded-lg" variant="default" onClick={() => setNeedToGetOpen(true)}>
                      Open full report
                    </Button>
                    <Button
                      className="flex-1 rounded-lg"
                      variant="outline"
                      onClick={() => navigateToPage("/inventory/materials")}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Materials
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-4 lg:col-span-5">
            <Card className="rounded-xl border-border/70 shadow-sm">
              <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Pipeline snapshot</h3>
                <p className="text-xs text-muted-foreground">Sales motion at a glance</p>
              </div>
              <CardContent className="space-y-4 p-5 pt-6">
                {visibleMetrics.has("openEnquiries") && (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Enquiries</p>
                      <p className="text-lg font-semibold tabular-nums">{openPipelineEnquiries.length}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate("/enquiries")}>
                      View
                    </Button>
                  </div>
                )}
                {visibleMetrics.has("quotationsInFlight") && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quotations in flight</p>
                        <p className="text-lg font-semibold tabular-nums">{stats.pendingQuotations.length}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => navigate("/quotations")}>
                        View
                      </Button>
                    </div>
                  </>
                )}
                {visibleMetrics.has("activeProjects") && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active projects</p>
                        <p className="text-lg font-semibold tabular-nums">{stats.activeProjects}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => navigate("/projects")}>
                        View
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {lowStockItems.length > 0 && visibleMetrics.has("lowStockMaterials") && (
              <Card className="rounded-xl border-destructive/25 bg-destructive/[0.04] shadow-sm">
                <CardContent className="flex items-start gap-3 p-5 pt-6">
                  <Package className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">Inventory attention</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lowStockItems.length} SKU{lowStockItems.length === 1 ? "" : "s"} at or below minimum (same rule as Inventory alerts). Restock before sites stall.
                    </p>
                    <Button size="sm" variant="destructive" className="mt-3" onClick={() => navigate("/inventory/materials")}>
                      Go to inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeEmiLoans.length > 0 && visibleMetrics.has("pendingApprovals") && (
              <Card className="rounded-xl border-warning/25 bg-warning/[0.04] shadow-sm">
                <CardContent className="space-y-3 p-5 pt-6">
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Loan EMI watchlist</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Active EMI loans: {activeEmiLoans.length}. Due dates use each loan{"'"}s next due / due date field.
                      </p>
                    </div>
                  </div>
                  {emiOverdue.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Overdue</p>
                      <ul className="space-y-2">
                        {emiOverdue.map((l) => {
                          const due = getLoanEmiDueDate(l);
                          const borrower = l.personName ?? l.source;
                          return (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate font-medium">{borrower}</span>
                              <span className="text-xs text-muted-foreground">
                                {due ? due.toLocaleDateString("en-IN") : "—"} · {formatINR(l.emiAmount || 0)}
                              </span>
                              <Button size="sm" variant="outline" className="shrink-0" onClick={() => navigate("/loans")}>
                                Record payment
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {emiDueWithin7Days.length > 0 && (
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due within 7 days</p>
                      <ul className="space-y-2">
                        {emiDueWithin7Days.map((l) => {
                          const due = getLoanEmiDueDate(l);
                          const borrower = l.personName ?? l.source;
                          return (
                            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="min-w-0 truncate font-medium">{borrower}</span>
                              <span className="text-xs text-muted-foreground">
                                {due ? due.toLocaleDateString("en-IN") : "—"} · {formatINR(l.emiAmount || 0)}
                              </span>
                              <Button size="sm" variant="secondary" className="shrink-0" onClick={() => navigate("/loans")}>
                                Open loans
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {emiOverdue.length === 0 && emiDueWithin7Days.length === 0 && (
                    <p className="text-xs text-muted-foreground">No EMI due in the next 7 days and nothing overdue with a known due date.</p>
                  )}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/loans")}>
                    View all loans
                  </Button>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <NeedToGetSheet open={needToGetOpen} onOpenChange={setNeedToGetOpen} />

      {/* Revenue */}
      <Sheet open={activeModal === "revenue"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" aria-hidden />
              Revenue breakdown
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Payments linked to invoices</span>
              <span className="font-semibold tabular-nums">
                {formatINR(stats.cashSplit?.fromInvoices ?? 0)}
              </span>
            </div>
            <div className="flex justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">Payments linked to sale bills</span>
              <span className="font-semibold tabular-nums">
                {formatINR(stats.cashSplit?.fromSaleBills ?? 0)}
              </span>
            </div>
            {stats.cashSplit && stats.cashSplit.unlinked > 0 ? (
              <div className="flex justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Other payments in</span>
                <span className="font-semibold tabular-nums">{formatINR(stats.cashSplit.unlinked)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              <span className="font-medium">Cash collected (payments)</span>
              <span className="font-bold text-primary tabular-nums">{formatINR(stats.totalRevenue || 0)}</span>
            </div>
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("revenue")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("revenue")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Enquiries */}
      <Sheet open={activeModal === "enquiries" || activeModal === "followUps"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-accent-foreground" aria-hidden />
              {activeModal === "followUps" ? "Follow-ups overdue" : "Open enquiries"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-3 pt-6 max-h-[min(520px,60vh)] overflow-y-auto">
              {(activeModal === "followUps" ? overdueFollowUpEnquiries : openPipelineEnquiries)
                .slice(0, 12)
                .map((e) => (
                  <DashboardEnquiryRow
                    key={e.id}
                    enquiry={e}
                    onScheduleMeeting={() => navigateToPage("/enquiries")}
                    onSendQuotation={() => void handleDashboardSendQuotation(e.id)}
                    onConvert={() => void handleDashboardConvertEnquiry(e)}
                    onCreateQuotation={() => handleDashboardCreateQuotation(e)}
                  />
                ))}
              {(activeModal === "followUps" ? overdueFollowUpEnquiries : openPipelineEnquiries).length === 0 && (
                <ListEmptyState
                  density="compact"
                  icon={ClipboardList}
                  title={activeModal === "followUps" ? "No overdue follow-ups" : "No open enquiries"}
                  description="New pipeline items will appear here when logged."
                />
              )}
            </div>
            <Button
              className="w-full rounded-lg mt-4"
              onClick={() =>
                navigateToKpiList(activeModal === "followUps" ? "followUps" : "enquiries")
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {getDashboardKpiListLabel(activeModal === "followUps" ? "followUps" : "enquiries")}
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Overdue tasks */}
      <Sheet open={activeModal === "tasks"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-warning" aria-hidden />
              Overdue tasks
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {overdueTasksList.slice(0, 12).map((t) => (
              <DashboardTaskRow key={t.id} task={t} />
            ))}
            {overdueTasksList.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={ClipboardList}
                title="No overdue tasks"
                description="Tasks past their work date will show here."
              />
            )}
          </div>
          <Button className="w-full rounded-lg mt-4" onClick={() => navigateToKpiList("tasks")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("tasks")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Active projects */}
      <Sheet open={activeModal === "projects"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              Active projects
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {activeProjectsList.slice(0, 12).map((project) => (
              <DashboardProjectRow key={project.id} project={project} />
            ))}
            {activeProjectsList.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={Building2}
                title="No active projects"
                description="Ongoing projects will appear in this list."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("projects")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("projects")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Active sites */}
      <Sheet open={activeModal === "activeSites"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" aria-hidden />
              Sites on ongoing projects
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {sitesOnOngoingProjects.slice(0, 12).map((s) => {
              const linkedProject = s.projectId
                ? scopedProjects.find((p) => p.id === s.projectId)
                : undefined;
              return (
                <DashboardActiveSiteRow
                  key={s.id}
                  site={s}
                  projectAging={linkedProject ? getProjectIdleAging(linkedProject) : null}
                />
              );
            })}
            {sitesOnOngoingProjects.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={MapPin}
                title="No sites on ongoing projects"
                description="Sites linked to in-flight projects will show here."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("activeSites")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("activeSites")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Pending payments */}
      <Sheet open={activeModal === "pending"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-warning" aria-hidden />
              Pending receivables
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.pendingInvoices.slice(0, 12).map((invoice) => (
              <DashboardInvoiceRow key={invoice.id} invoice={invoice} />
            ))}
            {stats.pendingInvoices.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={Receipt}
                title="No pending receivables"
                description="Open invoices with balance due will appear here."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("pending")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("pending")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Employees */}
      <Sheet open={activeModal === "employees"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Active roster</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Calendar className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-sm text-muted-foreground">Today ·</span>
            <span className="font-semibold text-primary">{format(new Date(), "EEEE, d MMMM yyyy")}</span>
          </div>
          <div className="grid max-h-[400px] grid-cols-1 gap-3 overflow-y-auto py-4 sm:grid-cols-2">
            {presentEmployees.map((emp) => (
              <DashboardEmployeeCard key={emp.id} emp={emp} onSelect={handleEmployeeClick} />
            ))}
            {presentEmployees.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={Users}
                title="No active employees"
                description="Active roster members will appear here."
                className="sm:col-span-2"
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("employees")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("employees")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Low stock */}
      <Sheet open={activeModal === "stock"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
              Low stock
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-4 overflow-y-auto py-4">
            {Object.entries(groupedLowStockItems).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h4>
                {items.map((item) => (
                  <DashboardLowStockRow key={item.id} item={item} />
                ))}
              </div>
            ))}
            {lowStockItems.length === 0 && (
              <ListEmptyState
                icon={Package}
                title="All SKUs above threshold"
                description="No materials currently below their minimum stock level."
                actionLabel="Open materials"
                onAction={() => navigateToKpiList("stock")}
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("stock")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("stock")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* EMIs */}
      <Sheet open={activeModal === "emis"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-warning" aria-hidden />
              Loan EMIs
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.activeLoans.slice(0, 12).map((loan) => (
              <DashboardEmiRow key={loan.id} loan={loan} loanRepayments={loanRepayments ?? []} />
            ))}
            {stats.activeLoans.length === 0 && (
              <ListEmptyState
                icon={CreditCard}
                title="No active loans"
                description="No EMI loans or borrowings to track right now."
                actionLabel="Open loans"
                onAction={() => navigateToKpiList("emis")}
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("emis")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("emis")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Quotations */}
      <Sheet open={activeModal === "quotations"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
              Quotations in flight
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.pendingQuotations.slice(0, 12).map((quotation) => (
              <DashboardQuotationRow key={quotation.id} quotation={quotation} />
            ))}
            {stats.pendingQuotations.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={FileText}
                title="No quotations in flight"
                description="Draft or sent quotations will show here."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("quotations")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("quotations")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Ops blockages */}
      <Sheet open={activeModal === "blockages"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              Ops blockages
            </SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground">
            Active timeline blockages on ongoing projects. Resolve them from Active sites.
          </p>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {activeOpsBlockages.slice(0, 12).map((blockage) => (
              <DashboardOpsBlockageRow
                key={blockage.id}
                blockage={blockage}
                projectName={projectNameById.get(blockage.projectId)}
              />
            ))}
            {activeOpsBlockages.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={AlertCircle}
                title="No active blockages"
                description="Timeline blockages will appear here when logged on Active sites."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("blockages")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("blockages")}
          </Button>
        </AppSheetContent>
      </Sheet>

      {/* Projects on managerial hold */}
      <Sheet open={activeModal === "projectsOnHold"} onOpenChange={() => setActiveModal(null)}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-warning" aria-hidden />
              Projects on hold
            </SheetTitle>
          </SheetHeader>
          <p className="text-sm text-muted-foreground">
            Projects paused at the managerial lifecycle stage until released back to execution.
          </p>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {projectsOnHoldList.slice(0, 12).map((project) => (
              <DashboardBlockageRow key={project.id} project={project} />
            ))}
            {projectsOnHoldList.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={PauseCircle}
                title="Nothing on managerial hold"
                description="Projects marked On Hold will appear here."
              />
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToKpiList("projectsOnHold")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {getDashboardKpiListLabel("projectsOnHold")}
          </Button>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Dashboard;

import { useMemo, useState } from "react";
import {
  IndianRupee,
  Users,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  Receipt,
  CreditCard,
  FileText,
  AlertCircle,
  Building2,
  ExternalLink,
  ClipboardList,
  Package,
  LayoutGrid,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";
import { RoleDashboardService, type DashboardMetricKey } from "@/application/services/RoleDashboardService";
import {
  NeedToGetService,
  countActiveSitesByProjectId,
  needToGetLocationLabel,
} from "@/application/services/NeedToGetService";
import { NeedToGetModal } from "@/components/need-to-get/NeedToGetModal";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type StatCardDef = {
  id: string;
  metric: DashboardMetricKey;
  title: string;
  value: string;
  icon: typeof IndianRupee;
  iconClass: string;
  hint: string;
  hintTone: "positive" | "negative" | "neutral";
};

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    projects,
    employees,
    invoices,
    saleBills,
    quotations,
    loans,
    inventoryItems,
    sites,
    vendorBills,
    enquiries,
    blockages,
  } = useAppData();
  const { currentRole } = useAppSession();
  const { permissionService } = useFoundation();
  const dashboardService = useMemo(() => new RoleDashboardService(), []);
  const needToGetService = useMemo(() => new NeedToGetService(), []);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [needToGetOpen, setNeedToGetOpen] = useState(false);
  const [isNtgCollapsed, setIsNtgCollapsed] = useState(true);

  const openPipelineEnquiries = useMemo(
    () => enquiries.filter((e) => e.status !== "converted" && e.status !== "lost"),
    [enquiries],
  );

  const ongoingProjectIds = useMemo(
    () => new Set(projects.filter((p) => p.status === "Ongoing").map((p) => p.id)),
    [projects],
  );

  const sitesOnOngoingProjects = useMemo(
    () => sites.filter((s) => s.projectId && ongoingProjectIds.has(s.projectId)),
    [sites, ongoingProjectIds],
  );

  const activeOpsBlockages = useMemo(
    () => blockages.filter((b) => b.status === "active"),
    [blockages],
  );

  const stats = useMemo(() => {
    const totalRevenue = [...invoices, ...saleBills].reduce((sum, inv) => sum + (inv.amountReceived || 0), 0);

    const activeProjects = projects.filter((p) => p.status === "Ongoing").length;
    const completedCount = projects.filter((p) => p.status === "Completed").length;

    const activeEmployees = employees.filter((e) => e.status === "Active").length;
    const onLeave = employees.filter((e) => e.status !== "Active").length;

    const pendingInvoices = invoices.filter((inv) => inv.status !== "paid");
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.total - (inv.amountReceived || 0)), 0);

    const pendingQuotations = quotations.filter((q) => q.status === "draft" || q.status === "sent");

    const activeBlockages = projects.filter((p) => p.status === "On Hold").length;

    const activeLoansList = loans.filter((l) => l.status === "Active");
    const upcomingEmiAmount = activeLoansList.reduce((sum, l) => sum + l.emiAmount, 0);

    return {
      totalRevenue,
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
  }, [projects, employees, invoices, quotations, loans, saleBills, activeOpsBlockages.length]);

  const lowStockItems = useMemo(() => {
    return inventoryItems
      .filter((item) => item.stock < (item.minStock || 5))
      .map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stock,
        min: item.minStock || 5,
        category: item.category,
      }));
  }, [inventoryItems]);

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
    () => needToGetService.buildRows(sites, projects, inventoryItems, vendorBills),
    [needToGetService, sites, projects, inventoryItems, vendorBills],
  );

  const ntgActiveSitesPerProject = useMemo(() => countActiveSitesByProjectId(sites), [sites]);

  const visibleMetrics = useMemo(() => new Set(dashboardService.getVisibleMetrics(currentRole)), [currentRole, dashboardService]);

  const statCardsRaw: StatCardDef[] = [
    {
      id: "revenue",
      metric: "receivables",
      title: "Cash collected",
      value: `₹${(stats.totalRevenue / 100000).toFixed(1)}L`,
      icon: IndianRupee,
      iconClass: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20",
      hint: "Invoices + sale bills",
      hintTone: "positive",
    },
    {
      id: "enquiries",
      metric: "openEnquiries",
      title: "Open enquiries",
      value: String(openPipelineEnquiries.length),
      icon: ClipboardList,
      iconClass: "bg-violet-600 text-white shadow-sm shadow-violet-600/20",
      hint: "Pipeline excluding won/lost",
      hintTone: openPipelineEnquiries.length > 0 ? "neutral" : "positive",
    },
    {
      id: "quotations",
      metric: "quotationsInFlight",
      title: "Quotations pending",
      value: String(stats.pendingQuotations.length),
      icon: FileText,
      iconClass: "bg-sky-600 text-white shadow-sm shadow-sky-600/20",
      hint: "Draft / sent awaiting action",
      hintTone: stats.pendingQuotations.length > 0 ? "negative" : "positive",
    },
    {
      id: "projects",
      metric: "activeProjects",
      title: "Active projects",
      value: String(stats.activeProjects),
      icon: Building2,
      iconClass: "bg-primary text-primary-foreground shadow-sm",
      hint: `${stats.completedCount} completed (all-time)`,
      hintTone: "neutral",
    },
    {
      id: "activeSites",
      metric: "activeSites",
      title: "Sites live",
      value: String(sitesOnOngoingProjects.length),
      icon: MapPin,
      iconClass: "bg-teal-600 text-white shadow-sm shadow-teal-600/20",
      hint: "On ongoing projects",
      hintTone: "neutral",
    },
    {
      id: "pending",
      metric: "receivables",
      title: "Receivables due",
      value: `₹${(stats.pendingAmount / 100000).toFixed(1)}L`,
      icon: Receipt,
      iconClass: "bg-amber-500 text-white shadow-sm shadow-amber-500/20",
      hint: `${stats.pendingInvoices.length} invoices open`,
      hintTone: stats.pendingAmount > 0 ? "negative" : "positive",
    },
    {
      id: "employees",
      metric: "openTasks",
      title: "Team on roster",
      value: String(stats.activeEmployees),
      icon: Users,
      iconClass: "bg-slate-700 text-white shadow-sm",
      hint: `${stats.onLeave} not active`,
      hintTone: stats.onLeave > 0 ? "negative" : "positive",
    },
    {
      id: "stock",
      metric: "lowStockMaterials",
      title: "Low stock SKUs",
      value: String(lowStockItems.length),
      icon: AlertTriangle,
      iconClass: "bg-destructive text-destructive-foreground shadow-sm",
      hint: "Below threshold",
      hintTone: lowStockItems.length > 0 ? "negative" : "positive",
    },
    {
      id: "emis",
      metric: "pendingApprovals",
      title: "EMI load / mo",
      value: `₹${(stats.upcomingEmiAmount / 1000).toFixed(0)}K`,
      icon: CreditCard,
      iconClass: "bg-orange-600 text-white shadow-sm",
      hint: `${stats.activeLoans.length} active loans`,
      hintTone: "neutral",
    },
    {
      id: "blockages",
      metric: "openBlockages",
      title: "Projects on hold",
      value: String(stats.activeBlockages),
      icon: AlertCircle,
      iconClass: cn(
        stats.activeBlockages > 0 ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
        "shadow-sm",
      ),
      hint: stats.activeBlockages > 0 ? "Needs release plan" : "Execution clear",
      hintTone: stats.activeBlockages > 0 ? "negative" : "positive",
    },
  ];

  const statsCards = statCardsRaw.filter((c) => visibleMetrics.has(c.metric));

  const handleCardClick = (cardId: string) => {
    setActiveModal(cardId);
  };

  const handleEmployeeClick = (empId: number) => {
    setActiveModal(null);
    navigate(`/employees/${empId}`);
  };

  const navigateToPage = (path: string) => {
    setActiveModal(null);
    navigate(path);
  };

  const hintClass: Record<StatCardDef["hintTone"], string> = {
    positive: "text-emerald-700/90 dark:text-emerald-400/90",
    negative: "text-amber-800 dark:text-amber-400/90",
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
  return (
    <PageShell className="space-y-0">
      <StickyPageHeader
        className="mb-2 border-0 bg-transparent px-0 py-0 shadow-none backdrop-blur-none supports-[backdrop-filter]:bg-transparent sm:px-0"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
      />

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
              Filtered for your role. Tap a tile for detail.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(card.id)}
                  className="group relative flex flex-col rounded-xl border border-border/70 bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {card.title}
                    </span>
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-[1.02]",
                        card.iconClass,
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{card.value}</p>
                  <p className={cn("mt-1 text-xs", hintClass[card.hintTone])}>{card.hint}</p>
                  <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground/0 transition group-hover:text-muted-foreground/60" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Quick actions — full grid */}
        <section aria-labelledby="dash-actions-heading">
          <h2 id="dash-actions-heading" className="ds-section-title mb-3">
            Quick actions
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions
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
            {stats.openOpsBlockagesCount > 0 && permissionService.canAccessPath(currentRole, "/active-sites") && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Operational blockages</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {stats.openOpsBlockagesCount} open on timeline — resolve from Active sites
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 border-amber-500/40" onClick={() => navigate("/active-sites")}>
                  Open
                </Button>
              </div>
            )}

            {permissionService.canAccessPath(currentRole, "/inventory/materials") && (
              <Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <span className="text-sm font-semibold text-foreground">Need-to-get procurement</span>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {needToGetRows.length} shortfalls
                  </Badge>
                </div>
                <CardContent className="space-y-3 p-4">
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
                                {needToGetLocationLabel(row, ntgActiveSitesPerProject, projects)}
                              </p>
                            </div>
                            <Badge className="shrink-0 bg-red-500/10 text-red-700 dark:text-red-400 border-0">
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
            <Card className="rounded-2xl border-border/70 shadow-sm">
              <div className="border-b border-border/60 bg-muted/25 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">Pipeline snapshot</h3>
                <p className="text-xs text-muted-foreground">Sales motion at a glance</p>
              </div>
              <CardContent className="space-y-4 p-4">
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
              <Card className="rounded-2xl border-destructive/25 bg-destructive/[0.04] shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <Package className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">Inventory attention</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lowStockItems.length} SKU{lowStockItems.length === 1 ? "" : "s"} below minimum. Restock before sites stall.
                    </p>
                    <Button size="sm" variant="destructive" className="mt-3" onClick={() => navigate("/inventory/materials")}>
                      Go to inventory
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      <NeedToGetModal open={needToGetOpen} onOpenChange={setNeedToGetOpen} />

      {/* Revenue */}
      <Sheet open={activeModal === "revenue"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" aria-hidden />
              Revenue breakdown
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">From invoices</span>
              <span className="font-semibold tabular-nums">
                ₹{invoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">From sale bills</span>
              <span className="font-semibold tabular-nums">
                ₹{saleBills.reduce((sum, sb) => sum + (sb.amountReceived || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              <span className="font-medium">Total collected</span>
              <span className="font-bold text-primary tabular-nums">₹{stats.totalRevenue.toLocaleString()}</span>
            </div>
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/finance")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Finance
          </Button>
        </SheetContent>
      </Sheet>

      {/* Enquiries */}
      <Sheet open={activeModal === "enquiries"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-violet-600" aria-hidden />
              Open enquiries
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[min(380px,50vh)] space-y-2 overflow-y-auto py-4">
            {openPipelineEnquiries.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{e.customerName}</p>
                  <p className="text-xs text-muted-foreground">{e.id}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 capitalize">
                  {e.status}
                </Badge>
              </div>
            ))}
            {openPipelineEnquiries.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No open enquiries</p>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/enquiries")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            All enquiries
          </Button>
        </SheetContent>
      </Sheet>

      {/* Active projects */}
      <Sheet open={activeModal === "projects"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden />
              Active projects
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {projects
              .filter((p) => p.status === "Ongoing")
              .slice(0, 8)
              .map((project) => (
                <div key={project.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{project.client}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {project.capacity}
                  </Badge>
                </div>
              ))}
            {projects.filter((p) => p.status === "Ongoing").length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No active projects</p>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/projects")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            All projects
          </Button>
        </SheetContent>
      </Sheet>

      {/* Active sites */}
      <Sheet open={activeModal === "activeSites"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" aria-hidden />
              Sites on ongoing projects
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {sitesOnOngoingProjects.slice(0, 10).map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground truncate">{s.projectName ?? "—"}</p>
              </div>
            ))}
            {sitesOnOngoingProjects.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No sites linked to ongoing projects</p>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/active-sites")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Active sites
          </Button>
        </SheetContent>
      </Sheet>

      {/* Pending payments */}
      <Sheet open={activeModal === "pending"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-600" aria-hidden />
              Pending receivables
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.pendingInvoices.slice(0, 8).map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{invoice.customerName}</p>
                  <p className="text-xs text-muted-foreground">{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-destructive tabular-nums">
                    ₹{(invoice.total - (invoice.amountReceived || 0)).toLocaleString()}
                  </p>
                  <Badge variant={invoice.status === "pending" ? "destructive" : "secondary"} className="text-xs capitalize">
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            ))}
            {stats.pendingInvoices.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No pending receivables</p>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/invoices")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Invoices
          </Button>
        </SheetContent>
      </Sheet>

      {/* Employees */}
      <Sheet open={activeModal === "employees"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
              <Card
                key={emp.id}
                className="cursor-pointer border-border/70 transition-colors hover:bg-muted/40"
                onClick={() => handleEmployeeClick(emp.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">{emp.initial}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-medium">{emp.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {emp.role}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        {emp.phone}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {emp.site}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/employees")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Employees
          </Button>
        </SheetContent>
      </Sheet>

      {/* Low stock */}
      <Sheet open={activeModal === "stock"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                {items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock{" "}
                      <span className="font-semibold text-destructive">
                        {item.stock} pcs
                      </span>{" "}
                      (min {item.min})
                    </p>
                  </div>
                ))}
              </div>
            ))}
            {lowStockItems.length === 0 && <p className="py-6 text-center text-muted-foreground">All SKUs above threshold</p>}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/inventory/materials")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Materials
          </Button>
        </SheetContent>
      </Sheet>

      {/* EMIs */}
      <Sheet open={activeModal === "emis"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" aria-hidden />
              Loan EMIs
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.activeLoans.map((loan) => (
              <div key={loan.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="font-medium">{loan.source}</p>
                  <p className="text-xs text-muted-foreground">Outstanding ₹{loan.outstanding.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">₹{loan.emiAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">/ month</p>
                </div>
              </div>
            ))}
            {stats.activeLoans.length === 0 && <p className="py-6 text-center text-muted-foreground">No active loans</p>}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/loans")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Loans
          </Button>
        </SheetContent>
      </Sheet>

      {/* Quotations */}
      <Sheet open={activeModal === "quotations"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
              Quotations in flight
            </SheetTitle>
          </SheetHeader>
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {stats.pendingQuotations.slice(0, 8).map((quotation) => (
              <div key={quotation.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{quotation.clientName}</p>
                  <p className="text-xs text-muted-foreground">{quotation.quotationNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">₹{quotation.totalAmount.toLocaleString()}</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {quotation.status}
                  </Badge>
                </div>
              </div>
            ))}
            {stats.pendingQuotations.length === 0 && (
              <p className="py-6 text-center text-muted-foreground">No draft or sent quotations</p>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/quotations")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Quotations
          </Button>
        </SheetContent>
      </Sheet>

      {/* On hold */}
      <Sheet open={activeModal === "blockages"} onOpenChange={() => setActiveModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
              Projects on hold
            </SheetTitle>
          </SheetHeader>
          {stats.openOpsBlockagesCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Also <span className="font-medium text-foreground">{stats.openOpsBlockagesCount}</span> operational blockages on the
              timeline — open Active sites to resolve.
            </p>
          )}
          <div className="max-h-[400px] space-y-2 overflow-y-auto py-4">
            {projects
              .filter((p) => p.status === "On Hold")
              .slice(0, 8)
              .map((project) => (
                <div key={project.id} className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                  <Badge variant="destructive" className="mt-2 text-xs">
                    {project.progressStage ?? "On Hold"}
                  </Badge>
                </div>
              ))}
            {stats.activeBlockages === 0 && (
              <div className="py-8 text-center">
                <AlertCircle className="mx-auto mb-2 h-12 w-12 text-primary" aria-hidden />
                <p className="text-muted-foreground">Nothing on managerial hold.</p>
              </div>
            )}
          </div>
          <Button className="w-full rounded-lg" onClick={() => navigateToPage("/active-sites")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Active sites
          </Button>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Dashboard;

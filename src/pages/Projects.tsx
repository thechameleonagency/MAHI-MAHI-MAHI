import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { 
  Plus, Search, Calendar, User, 
 Building2, IndianRupee, 
  LayoutGrid, List as ListIcon, Eye, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CreateProjectWizardContainer } from "@/components/projects/CreateProjectWizardContainer";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import type { Project } from "@/types/project";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  canonicalProjectKind,
  PROJECT_KIND_FILTER_OPTIONS,
  PROJECT_KIND_UI_LABELS,
  PROJECT_KIND_UI_TONES,
  projectMatchesKindFilter,
} from "@/lib/projectTaxonomyDisplay";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";
import {
  buildCustomerToProjectDraft,
  loadCreateDraft,
  parseCreateFromParam,
  resolveCreateFromOrToast,
  stripCreateFromParam,
  type ProjectDraftFromCustomer,
} from "@/lib/createFromContext";
import { AgingChip } from "@/components/ui/AgingChip";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { projectNeedsTeamAssignment } from "@/lib/projectTeamAssignment";
import { isDirectExceptionProject, projectDirectExceptionReason } from "@/lib/projectDirectException";
import {
  getProjectIdleAging,
  isProjectCompleted,
  isProjectOpen,
} from "@/lib/agingHelpers";
import { buttonRoles } from "@/lib/buttonRoles";
import { isActiveSiteProject } from "@/lib/activeSiteProjects";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useFoundation } from "@/app/providers/FoundationProvider";
import {
  buildProjectActorScopeContext,
  filterProjectsForActor,
} from "@/lib/projectActorScope";
import {
  buildProjectsListKpiStats,
  matchesProjectLifecycleFilter,
  parseProjectStatusFilterFromUrl,
  PROJECT_LIFECYCLE_FILTER_OPTIONS,
  projectLifecycleFilterToUrlParam,
  projectStatusBadgeProps,
  type ProjectLifecycleFilter,
} from "@/lib/projectListFilters";
import { calculateProjectProfitDerived } from "@/domain/partners/derivePartnerEconomics";
import { getProjectTotalCost } from "@/lib/billingSelectors";
import { formatINR } from "@/lib/formatCurrency";

const Projects = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const { permissionService } = useFoundation();
  const {
    projects,
    quotations,
    enquiries,
    teams,
    settingsTeamMembers,
    employees,
    customers,
    getProjectEligibleQuotations,
    generateId: _generateId,
    canDo,
    payments,
    expenses,
    getTasksByProjectId,
  } = useAppData();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [prefillQuotationId, setPrefillQuotationId] = useState<string | undefined>();
  const [prefillCustomerDraft, setPrefillCustomerDraft] = useState<ProjectDraftFromCustomer | undefined>();
  const [createWizardOverride, setCreateWizardOverride] = useState<
    Partial<CreateProjectWizardState> | undefined
  >();
  const _eligibleQuotations = useMemo(() => getProjectEligibleQuotations(), [getProjectEligibleQuotations, projects]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectLifecycleFilter>(() =>
    parseProjectStatusFilterFromUrl(searchParams.get("status")),
  );

  useEffect(() => {
    const parsed = parseProjectStatusFilterFromUrl(searchParams.get("status"));
    setStatusFilter((prev) => (prev === parsed ? prev : parsed));
    setTablePage(1);
  }, [searchParams]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const param = projectLifecycleFilterToUrlParam(statusFilter);
      if (param) next.set("status", param);
      else next.delete("status");
      if (next.toString() === prev.toString()) return prev;
      return next;
    }, { replace: true });
  }, [statusFilter, setSearchParams]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const projectAgingContext = useMemo(() => {
    const byProject: Record<string, { lastPaymentDate?: string; lastTaskDate?: string }> = {};
    for (const p of projects) {
      const payDates = payments
        .filter((pay) => pay.projectId === p.id && pay.direction === "in")
        .map((pay) => pay.date)
        .filter(Boolean)
        .sort();
      const taskDates = (getTasksByProjectId(p.id) ?? [])
        .map((t) => t.workDate)
        .filter(Boolean)
        .sort();
      byProject[p.id] = {
        lastPaymentDate: payDates[payDates.length - 1],
        lastTaskDate: taskDates[taskDates.length - 1],
      };
    }
    return byProject;
  }, [projects, payments, getTasksByProjectId]);

  const customerFilterParam = searchParams.get("customer");

  const projectScopeCtx = useMemo(
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
    ],
  );

  const scopedProjects = useMemo(
    () => filterProjectsForActor(projects, projectScopeCtx),
    [projects, projectScopeCtx],
  );

  // Filtering + open-before-completed sort (Phase 3.7)
  const filteredProjects = useMemo(() => {
    const customerFilterName = customerFilterParam
      ? customers.find((c) => c.id === customerFilterParam)?.name
      : undefined;
    const base = scopedProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = matchesProjectLifecycleFilter(p, statusFilter);
      const matchesType = typeFilter === "all" || p.projectType === typeFilter;
      const matchesKind = projectMatchesKindFilter(p, kindFilter);
      const matchesCompleted = !hideCompleted || isProjectOpen(p);
      const matchesCustomer =
        !customerFilterParam ||
        p.customerId === customerFilterParam ||
        p.client.toLowerCase() === customerFilterParam.toLowerCase() ||
        (customerFilterName != null && p.client.toLowerCase() === customerFilterName.toLowerCase());
      return matchesSearch && matchesStatus && matchesType && matchesKind && matchesCompleted && matchesCustomer;
    });
    const open = base.filter(isProjectOpen);
    const completed = base.filter(isProjectCompleted);
    return [...open, ...completed];
  }, [scopedProjects, customers, searchQuery, statusFilter, typeFilter, kindFilter, hideCompleted, customerFilterParam]);

  const completedDividerIndex = useMemo(() => {
    if (hideCompleted) return -1;
    const idx = filteredProjects.findIndex(isProjectCompleted);
    return idx > 0 ? idx : -1;
  }, [filteredProjects, hideCompleted]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / tablePageSize) || 1);
  
  useEffect(() => {
    setTablePage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const createFrom = parseCreateFromParam(searchParams.get("createFrom"));
    if (createFrom?.kind === "quo" && canDo("project:create_from_quote")) {
      const quotation = resolveCreateFromOrToast("quo", createFrom.id, (entityId) =>
        quotations.find((q) => q.id === entityId),
      );
      const next = new URLSearchParams(searchParams);
      stripCreateFromParam(next);
      if (quotation) {
        setCreateWizardOverride(undefined);
        setPrefillQuotationId(quotation.id);
        setPrefillCustomerDraft(undefined);
        setIsCreateProjectOpen(true);
      }
      setSearchParams(next, { replace: true });
      return;
    }
    if (createFrom?.kind === "customer" && canDo("project:create_from_quote")) {
      const stored = loadCreateDraft<ProjectDraftFromCustomer>("project-create-draft");
      const cust =
        stored?.customerId === createFrom.id
          ? customers.find((c) => c.id === createFrom.id)
          : resolveCreateFromOrToast("customer", createFrom.id, (entityId) =>
              customers.find((c) => c.id === entityId),
            );
      const draft =
        stored?.customerId === createFrom.id
          ? stored
          : cust
            ? buildCustomerToProjectDraft(cust)
            : undefined;
      const next = new URLSearchParams(searchParams);
      stripCreateFromParam(next);
      if (draft) {
        setCreateWizardOverride(undefined);
        setPrefillCustomerDraft(draft);
        setPrefillQuotationId(undefined);
        setIsCreateProjectOpen(true);
      }
      setSearchParams(next, { replace: true });
      return;
    }
    if (searchParams.get("create") !== "1") return;
    if (canDo("project:create_from_quote")) {
      setIsCreateProjectOpen(true);
    }
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, canDo, quotations, customers]);

  const pagedProjects = filteredProjects.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const getCategoryIcon = (projectType: string) => {
    switch (projectType) {
      case "Residential": return <Building2 className="h-4 w-4 text-warning" />;
      case "Commercial": return <Building2 className="h-4 w-4 text-primary" />;
      case "Industrial": return <Building2 className="h-4 w-4 text-accent-foreground" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const activeSiteCount = useMemo(
    () => scopedProjects.filter(isActiveSiteProject).length,
    [scopedProjects],
  );
  const canAccessActiveSites = permissionService.canAccessPath(currentRole, "/active-sites");

  const stats = useMemo(
    () => buildProjectsListKpiStats(scopedProjects),
    [scopedProjects],
  );

  // BL-6: per-project derived financial metrics for list/card rows.
  // Single pass over projects+payments+expenses to avoid O(N*M) lookups per row.
  const projectFinancialsById = useMemo(() => {
    const collectedByProject = new Map<string, number>();
    for (const p of payments) {
      if (p.direction !== "in" || !p.projectId) continue;
      collectedByProject.set(p.projectId, (collectedByProject.get(p.projectId) ?? 0) + p.amount);
    }
    const map = new Map<string, { cost: number; profit: number; collected: number; outstanding: number }>();
    for (const project of scopedProjects) {
      const cost = (project.totalCost && project.totalCost > 0)
        ? project.totalCost
        : getProjectTotalCost(project.id, expenses);
      const collected = collectedByProject.get(project.id) ?? 0;
      const profit = calculateProjectProfitDerived(project, expenses);
      const outstanding = Math.max(0, (project.contractAmount || 0) - collected);
      map.set(project.id, { cost, profit, collected, outstanding });
    }
    return map;
  }, [scopedProjects, payments, expenses]);

  const openCreateProjectWizard = (override?: Partial<CreateProjectWizardState>) => {
    setCreateWizardOverride(override);
    setIsCreateProjectOpen(true);
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects" }]}
        subRow={
          <InlineKpiStrip
            items={[
              { label: "Total Projects", value: stats.total },
              { label: "New", value: stats.new },
              { label: "In Progress", value: stats.inProgress },
              { label: "On Hold", value: stats.onHold },
              { label: "Completed", value: stats.completed },
              { label: "Total Capacity", value: `${stats.totalKW} kW` },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-md">
            <Button 
              variant={viewMode === "table" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          {canAccessActiveSites && activeSiteCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => navigate("/active-sites")}>
              <MapPin className="h-4 w-4 mr-2" />
              Site execution ({activeSiteCount})
            </Button>
          )}
          <Button size="sm" onClick={() => openCreateProjectWizard()} disabled={!canDo("project:create_from_quote")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          {canDo("project:create_direct_exception") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openCreateProjectWizard({ source: "direct_exception" })}
            >
              Direct exception
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects, clients..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(parseProjectStatusFilterFromUrl(v));
              setTablePage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Lifecycle" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_LIFECYCLE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Project Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Residential">Residential</SelectItem>
              <SelectItem value="Commercial">Commercial</SelectItem>
              <SelectItem value="Industrial">Industrial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Project kind" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {PROJECT_KIND_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={hideCompleted ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => setHideCompleted((v) => !v)}
          >
            {hideCompleted ? "Showing open only" : "Hide completed"}
          </Button>
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <ListEmptyState
          icon={Building2}
          title={projects.length === 0 ? "No projects yet" : "No projects match"}
          description={
            projects.length === 0
              ? "Create your first project to track sites, materials, and billing."
              : "Try clearing search or filters, or show completed projects."
          }
          actionLabel={projects.length === 0 ? "Create project" : "Clear filters"}
          onAction={
            projects.length === 0
              ? () => openCreateProjectWizard()
              : () => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setKindFilter("all");
                  setHideCompleted(false);
                  setTablePage(1);
                }
          }
        />
      ) : viewMode === "table" ? (
        <DataTableShell
          maxHeight={listTableViewportMaxHeight(tablePageSize)}
          footer={
            <TablePaginationBar
              page={tablePage}
              pageSize={tablePageSize}
              total={filteredProjects.length}
              onPageChange={setTablePage}
              onPageSizeChange={setTablePageSize}
            />
          }
        >
          <TableHeader>
            <TableRow className={dataTableClasses.headRow}>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Deal Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Contract</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedProjects.map((project, rowIdx) => {
              const kind = canonicalProjectKind(project);
              const globalIdx = (tablePage - 1) * tablePageSize + rowIdx;
              const showDivider = completedDividerIndex === globalIdx;
              const aging = getProjectIdleAging(project, projectAgingContext[project.id]);
              return (
              <>
                {showDivider && (
                  <TableRow key={`divider-${project.id}`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={10} className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Completed projects
                    </TableCell>
                  </TableRow>
                )}
              <TableRow key={project.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(project.projectType)}
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-medium truncate">{project.name}</span>
                        {projectNeedsTeamAssignment(project) && (
                          <Badge variant="outline" className="text-2xs bg-warning/10 text-warning border-warning/20 shrink-0">
                            Assign team
                          </Badge>
                        )}
                        {isDirectExceptionProject(project) && (
                          <Badge
                            variant="outline"
                            className="text-2xs bg-warning/10 text-warning border-warning/20 shrink-0"
                            title={projectDirectExceptionReason(project) ?? undefined}
                          >
                            Direct exception
                          </Badge>
                        )}
                        <AgingChip signal={aging} />
                      </div>
                      {isDirectExceptionProject(project) && projectDirectExceptionReason(project) && (
                        <p className="text-2xs text-muted-foreground line-clamp-2">
                          <span className="font-medium text-foreground">Exception:</span>{" "}
                          {projectDirectExceptionReason(project)}
                        </p>
                      )}
                      <span className="text-2xs text-muted-foreground font-mono">{project.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {project.customerId ? (
                    <EntityLink
                      entityType="customer"
                      entityId={project.customerId}
                      name={project.client}
                    />
                  ) : (
                    project.client
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-2xs ${PROJECT_KIND_UI_TONES[kind]}`}>{PROJECT_KIND_UI_LABELS[kind]}</Badge>
                </TableCell>
                <TableCell>{project.capacity}</TableCell>
                <TableCell>
                  <StatusBadge {...projectStatusBadgeProps(normalizeProject(project))} />
                </TableCell>
                {(() => {
                  const fin = projectFinancialsById.get(project.id);
                  const contract = project.contractAmount || 0;
                  const profit = fin?.profit ?? 0;
                  const outstanding = fin?.outstanding ?? contract;
                  const profitTone = profit > 0 ? "text-success" : profit < 0 ? "text-destructive" : "text-muted-foreground";
                  const outstandingTone = outstanding > 0 ? "text-warning" : "text-muted-foreground";
                  return (
                    <>
                      <TableCell className="text-right tabular-nums">{formatINR(contract)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${outstandingTone}`}>{formatINR(outstanding)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${profitTone}`}>{formatINR(profit)}</TableCell>
                    </>
                  );
                })()}
                <TableCell className="text-muted-foreground">{project.startDate}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              </>
              );
            })}
          </TableBody>
        </DataTableShell>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedProjects.map(project => {
            const kind = canonicalProjectKind(project);
            const assigneeCount = project.assignees?.length ?? 0;
            return (
            <Card key={project.id} className="group hover:shadow-md transition-shadow cursor-pointer rounded-xl" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getCategoryIcon(project.projectType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{project.id}</p>
                    </div>
                  </div>
                  <StatusBadge {...projectStatusBadgeProps(normalizeProject(project))} />
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className={`text-2xs ${PROJECT_KIND_UI_TONES[kind]}`}>{PROJECT_KIND_UI_LABELS[kind]}</Badge>
                  <Badge variant="secondary" className="text-2xs">{project.projectType}</Badge>
                  {projectNeedsTeamAssignment(project) && (
                    <Badge variant="outline" className="text-2xs bg-warning/10 text-warning border-warning/20">
                      Assign team
                    </Badge>
                  )}
                  {isDirectExceptionProject(project) && (
                    <Badge
                      variant="outline"
                      className="text-2xs bg-warning/10 text-warning border-warning/20"
                      title={projectDirectExceptionReason(project) ?? undefined}
                    >
                      Direct exception
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {isDirectExceptionProject(project) && projectDirectExceptionReason(project) && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">Exception:</span>{" "}
                      {projectDirectExceptionReason(project)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
                    <User className="h-4 w-4 text-muted-foreground" />
                    {project.customerId ? (
                      <EntityLink entityType="customer" entityId={project.customerId} name={project.client} />
                    ) : (
                      <span>{project.client}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>{project.capacity} System</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Started {project.startDate}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex -space-x-2 overflow-hidden">
                      {project.assignees?.slice(0, 3).map((id) => {
                        const emp = employees.find(e => e.id === id);
                        return (
                          <Avatar key={id} className="h-6 w-6 border-2 border-background ring-0">
                            <AvatarFallback className="text-2xs bg-primary/10 text-primary">
                              {emp?.name.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                    {assigneeCount > 3 && (
                      <span className="text-2xs text-muted-foreground">+{assigneeCount - 3}</span>
                    )}
                    {assigneeCount === 0 && (
                      <Badge variant="outline" className="text-2xs bg-warning/10 text-warning border-warning/20">
                        Assign team
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-primary"
                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                  >
                    View Details
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
          })}
        </div>
      )}
        <CreateProjectWizardContainer
          open={isCreateProjectOpen}
          onOpenChange={(open) => {
            setIsCreateProjectOpen(open);
            if (!open) {
              setPrefillQuotationId(undefined);
              setPrefillCustomerDraft(undefined);
              setCreateWizardOverride(undefined);
            }
          }}
          prefillQuotationId={prefillQuotationId}
          prefillCustomerDraft={prefillCustomerDraft}
          initialStateOverride={createWizardOverride}
        />
    </PageShell>
  );
};

export default Projects;



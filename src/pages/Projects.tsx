import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { 
  Plus, Search, Calendar, User, 
 Building2, IndianRupee, 
  LayoutGrid, List as ListIcon, Eye, MapPin
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
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
import { CreateProjectSheet } from "@/components/projects/CreateProjectSheet";
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
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { PROJECT_KINDS } from "@/domain/projectTypes/types";
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
  countProjectsByLifecycle,
  matchesProjectLifecycleFilter,
  parseProjectStatusFilterFromUrl,
  PROJECT_LIFECYCLE_FILTER_OPTIONS,
  projectLifecycleFilterToUrlParam,
  type ProjectLifecycleFilter,
} from "@/lib/projectListFilters";

function customerOptionalForDirectExceptionKind(k: ProjectKind): boolean {
  return k === "INC_GIVEN" || k === "VENDORSHIP_ONLY" || k === "VENDOR_NETWORK";
}

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
    partners,
    incGiverCompanies,
    getProjectEligibleQuotations,
    createProjectFromConfirmedQuotation: _createProjectFromConfirmedQuotation,
    createDirectProjectException,
    generateId: _generateId,
    canDo,
    payments,
    getTasksByProjectId,
  } = useAppData();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [prefillQuotationId, setPrefillQuotationId] = useState<string | undefined>();
  const [prefillCustomerDraft, setPrefillCustomerDraft] = useState<ProjectDraftFromCustomer | undefined>();
  const [directExOpen, setDirectExOpen] = useState(false);
  const [dexName, setDexName] = useState("");
  const [dexReason, setDexReason] = useState("");
  const [dexKind, setDexKind] = useState<ProjectKind>("PARTNER_EPC");
  const [dexCustomerId, setDexCustomerId] = useState("");
  const [dexPartnerId, setDexPartnerId] = useState("");
  const [dexSubId, setDexSubId] = useState("");
  const [dexIncGiverId, setDexIncGiverId] = useState("");
  const [dexChannel, setDexChannel] = useState("");
  const [dexExternal, setDexExternal] = useState("");
  const [dexCommissionRule, setDexCommissionRule] = useState("per_kw:500");
  const [dexVendorOrDiscom, setDexVendorOrDiscom] = useState("");
  const [dexVendorshipFee, setDexVendorshipFee] = useState("");
  const [dexAmount, setDexAmount] = useState("");
  const [dexBackend, setDexBackend] = useState("");
  const [dexPartnerSell, setDexPartnerSell] = useState("");
  const [dexIntEst, setDexIntEst] = useState("");
  const [dexPaymentType, setDexPaymentType] = useState<"cash" | "loan" | "cash-and-loan">("cash");
  const [dexProjectType, setDexProjectType] = useState<"Residential" | "Commercial" | "Industrial">("Residential");
  const [dexProjectCategory, setDexProjectCategory] = useState<"solar" | "other">("solar");
  const [dexCapacity, setDexCapacity] = useState("");
  const [dexLocation, setDexLocation] = useState("");
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

  const lifecycleCounts = useMemo(
    () => countProjectsByLifecycle(scopedProjects),
    [scopedProjects],
  );

  const stats = {
    total: lifecycleCounts.all,
    new: lifecycleCounts.New,
    inProgress: lifecycleCounts["In Progress"],
    completed: lifecycleCounts.Completed,
    onHold: lifecycleCounts["On Hold"],
    closed: lifecycleCounts.Closed,
    totalKW: scopedProjects.reduce((sum, p) => sum + (parseFloat(p.capacity) || 0), 0).toFixed(1),
  };

  const resetDirectExForm = () => {
    setDexName("");
    setDexReason("");
    setDexKind("PARTNER_EPC");
    setDexCustomerId("");
    setDexPartnerId("");
    setDexSubId("");
    setDexIncGiverId("");
    setDexChannel("");
    setDexExternal("");
    setDexCommissionRule("per_kw:500");
    setDexVendorOrDiscom("");
    setDexVendorshipFee("");
    setDexAmount("");
    setDexBackend("");
    setDexPartnerSell("");
    setDexIntEst("");
    setDexPaymentType("cash");
    setDexProjectType("Residential");
    setDexProjectCategory("solar");
    setDexCapacity("");
    setDexLocation("");
  };

  const handleDirectExceptionSubmit = async () => {
    if (!dexName.trim() || !dexReason.trim()) {
      toast({ title: "Missing fields", description: "Project name and reason are required.", variant: "destructive" });
      return;
    }
    const requiresCustomer = ["SOLO_EPC", "PARTNER_EPC", "FIXED_EPC", "INC", "OUTSOURCED_INC"].includes(dexKind);
    const cust = dexCustomerId ? customers.find((c) => c.id === dexCustomerId) : undefined;
    if (requiresCustomer && !cust) {
      toast({ title: "Customer required", variant: "destructive" });
      return;
    }
    const amt = Number.parseFloat(dexAmount) || 0;
    if (amt <= 0) {
      toast({ title: "Contract amount", description: "Enter a positive contract amount.", variant: "destructive" });
      return;
    }
    if (!dexCapacity.trim()) {
      toast({ title: "Capacity required", description: "Enter system capacity (e.g. 5 or 25 kW).", variant: "destructive" });
      return;
    }
    if (!dexLocation.trim()) {
      toast({ title: "Location required", description: "Enter the site address or city — placeholders like Pending are not allowed.", variant: "destructive" });
      return;
    }
    if (dexLocation.trim().toLowerCase() === "pending") {
      toast({ title: "Invalid location", description: "Use a real site address or city, not a placeholder.", variant: "destructive" });
      return;
    }
    const est = Number.parseFloat(dexIntEst) || 0;
    const parties: ProjectIntakePayload["parties"] = {};
    if (cust) parties.customer = cust.name;
    const commercial: ProjectIntakePayload["commercial"] = {
      contractAmount: amt,
      paymentType: dexPaymentType,
      internalCostEstimate: est,
    };

    switch (dexKind) {
      case "PARTNER_EPC": {
        const p = partners.find((x) => x.id === dexPartnerId);
        if (!p) {
          toast({ title: "Partner required", variant: "destructive" });
          return;
        }
        parties.partner = p.name;
        break;
      }
      case "FIXED_EPC": {
        const p = partners.find((x) => x.id === dexPartnerId);
        if (!p) {
          toast({ title: "Partner required", variant: "destructive" });
          return;
        }
        parties.partner = p.name;
        commercial.backendPrice = Number.parseFloat(dexBackend) || 0;
        commercial.partnerSellPrice = Number.parseFloat(dexPartnerSell) || amt;
        break;
      }
      case "OUTSOURCED_INC": {
        const sub = partners.find((x) => x.id === dexSubId && x.type === "Subcontractor");
        if (!sub) {
          toast({ title: "Subcontractor required", description: "Pick a partner with type Subcontractor.", variant: "destructive" });
          return;
        }
        parties.subcontractor = sub.name;
        break;
      }
      case "INC_GIVEN": {
        const g = incGiverCompanies.find((x) => x.id === dexIncGiverId);
        if (!g) {
          toast({ title: "INC source required", variant: "destructive" });
          return;
        }
        parties.incGiverCompany = g.name;
        break;
      }
      case "VENDOR_NETWORK": {
        if (!dexChannel.trim() || !dexExternal.trim()) {
          toast({ title: "Channel + network", description: "Enter channel partner name and external network name.", variant: "destructive" });
          return;
        }
        parties.channelPartner = dexChannel.trim();
        parties.externalNetwork = dexExternal.trim();
        commercial.commissionRule = dexCommissionRule.trim() || "per_kw:0";
        break;
      }
      case "SOLO_EPC": {
        parties.vendorOrDiscom = dexVendorOrDiscom.trim() || "DISCOM — pending";
        break;
      }
      case "INC":
        break;
      case "VENDORSHIP_ONLY": {
        const fee = Number.parseFloat(dexVendorshipFee) || amt;
        parties.externalNetwork = dexExternal.trim() || "External network";
        commercial.vendorshipFeeReceivable = fee;
        break;
      }
      default:
        break;
    }

    const intake: ProjectIntakePayload = {
      kind: dexKind,
      parties,
      commercial,
      site: {
        projectType: dexProjectType,
        projectCategory: dexProjectCategory,
        capacity: dexCapacity.trim(),
        location: dexLocation.trim(),
      },
    };
    const res = await createDirectProjectException({
      projectName: dexName.trim(),
      reason: dexReason.trim(),
      customerId: dexCustomerId,
      intake,
    });
    if (res.ok && res.projectId) {
      const reason = dexReason.trim();
      toast({
        title: "Direct exception project created",
        description: reason.length > 120 ? `${reason.slice(0, 117)}…` : reason,
      });
      setDirectExOpen(false);
      resetDirectExForm();
      navigate(`/projects/${res.projectId}`, { state: { directExceptionReason: reason } });
    } else {
      toast({
        title: "Could not create project",
        description: friendlyCommandErrorMessage(res.error, "Unknown error"),
        variant: "destructive",
      });
    }
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
          <Button size="sm" onClick={() => setIsCreateProjectOpen(true)} disabled={!canDo("project:create_from_quote")}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          {canDo("project:create_direct_exception") && (
            <Button size="sm" variant="outline" onClick={() => setDirectExOpen(true)}>
              Direct exception
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <Dialog open={directExOpen} onOpenChange={(o) => { setDirectExOpen(o); if (!o) resetDirectExForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Direct project exception</DialogTitle>
            <DialogDescription>
              Creates a project without a quotation (audited). Requires admin permission. Use only when policy allows an exception.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Project name</Label>
              <Input value={dexName} onChange={(e) => setDexName(e.target.value)} placeholder="e.g. Sharma 5kW" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason (audit)</Label>
              <Textarea value={dexReason} onChange={(e) => setDexReason(e.target.value)} rows={3} placeholder="Why is this project being created without a quotation?" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Project type</Label>
                <Select
                  value={dexProjectType}
                  onValueChange={(v) => setDexProjectType(v as typeof dexProjectType)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={dexProjectCategory}
                  onValueChange={(v) => setDexProjectCategory(v as typeof dexProjectCategory)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solar">Solar</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>System capacity</Label>
              <Input
                value={dexCapacity}
                onChange={(e) => setDexCapacity(e.target.value)}
                placeholder="e.g. 10 or 25 kW"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Site location</Label>
              <Input
                value={dexLocation}
                onChange={(e) => setDexLocation(e.target.value)}
                placeholder="Full address or city, state"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deal kind</Label>
              <Select value={dexKind} onValueChange={(v) => setDexKind(v as ProjectKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{customerOptionalForDirectExceptionKind(dexKind) ? "Customer (optional)" : "Customer"}</Label>
              <Select
                value={dexCustomerId || "__none__"}
                onValueChange={(v) => {
                  const id = v === "__none__" ? "" : v;
                  setDexCustomerId(id);
                  if (id) {
                    const c = customers.find((x) => x.id === id);
                    if (c?.address?.trim() && !dexLocation.trim()) {
                      setDexLocation(c.address.trim());
                    }
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(dexKind === "PARTNER_EPC" || dexKind === "FIXED_EPC") && (
              <div className="space-y-1.5">
                <Label>Partner</Label>
                <Select value={dexPartnerId} onValueChange={setDexPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {partners.filter((p) => p.type !== "Subcontractor").map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dexKind === "FIXED_EPC" && (
              <>
                <div className="space-y-1.5">
                  <Label>Backend price (₹)</Label>
                  <Input type="number" value={dexBackend} onChange={(e) => setDexBackend(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Partner sell price (₹)</Label>
                  <Input type="number" value={dexPartnerSell} onChange={(e) => setDexPartnerSell(e.target.value)} />
                </div>
              </>
            )}
            {dexKind === "OUTSOURCED_INC" && (
              <div className="space-y-1.5">
                <Label>Subcontractor</Label>
                <Select value={dexSubId} onValueChange={setDexSubId}>
                  <SelectTrigger><SelectValue placeholder="Subcontractor partner" /></SelectTrigger>
                  <SelectContent>
                    {partners.filter((p) => p.type === "Subcontractor").map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dexKind === "INC_GIVEN" && (
              <div className="space-y-1.5">
                <Label>INC giver company</Label>
                <Select value={dexIncGiverId} onValueChange={setDexIncGiverId}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {incGiverCompanies.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dexKind === "VENDOR_NETWORK" && (
              <>
                <div className="space-y-1.5">
                  <Label>Channel partner (name)</Label>
                  <Input value={dexChannel} onChange={(e) => setDexChannel(e.target.value)} placeholder="Channel partner" />
                </div>
                <div className="space-y-1.5">
                  <Label>External network (name)</Label>
                  <Input value={dexExternal} onChange={(e) => setDexExternal(e.target.value)} placeholder="OEM / network entity" />
                </div>
                <div className="space-y-1.5">
                  <Label>Commission rule</Label>
                  <Input value={dexCommissionRule} onChange={(e) => setDexCommissionRule(e.target.value)} placeholder="e.g. per_kw:500 or flat:25000" />
                </div>
              </>
            )}
            {dexKind === "SOLO_EPC" && (
              <div className="space-y-1.5">
                <Label>Vendor / DISCOM reference</Label>
                <Input value={dexVendorOrDiscom} onChange={(e) => setDexVendorOrDiscom(e.target.value)} placeholder="DISCOM or vendor of record" />
              </div>
            )}
            {dexKind === "VENDORSHIP_ONLY" && (
              <>
                <div className="space-y-1.5">
                  <Label>External network</Label>
                  <Input value={dexExternal} onChange={(e) => setDexExternal(e.target.value)} placeholder="Entity name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendorship fee receivable (₹)</Label>
                  <Input type="number" value={dexVendorshipFee} onChange={(e) => setDexVendorshipFee(e.target.value)} />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Contract (₹)</Label>
                <Input type="number" value={dexAmount} onChange={(e) => setDexAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Internal cost est. (₹)</Label>
                <Input type="number" value={dexIntEst} onChange={(e) => setDexIntEst(e.target.value)} />
              </div>
            </div>
            {(dexKind === "SOLO_EPC" || dexKind === "PARTNER_EPC" || dexKind === "FIXED_EPC" || dexKind === "INC" || dexKind === "OUTSOURCED_INC") && (
              <div className="space-y-1.5">
                <Label>Payment type</Label>
                <Select value={dexPaymentType} onValueChange={(v) => setDexPaymentType(v as typeof dexPaymentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="cash-and-loan">Cash + loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDirectExOpen(false); resetDirectExForm(); }}>Cancel</Button>
            <Button onClick={() => void handleDirectExceptionSubmit()}>Create exception project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              ? () => setIsCreateProjectOpen(true)
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
                    <TableCell colSpan={7} className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                  <StatusBadge status={normalizeProject(project).lifecycleStatus} />
                </TableCell>
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
                  <StatusBadge status={normalizeProject(project).lifecycleStatus} />
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
        <CreateProjectSheet
          open={isCreateProjectOpen}
          onOpenChange={(open) => {
            setIsCreateProjectOpen(open);
            if (!open) {
              setPrefillQuotationId(undefined);
              setPrefillCustomerDraft(undefined);
            }
          }}
          prefillQuotationId={prefillQuotationId}
          prefillCustomerDraft={prefillCustomerDraft}
        />
    </PageShell>
  );
};

export default Projects;



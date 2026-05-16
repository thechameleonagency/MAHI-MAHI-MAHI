import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Search, Calendar, User, 
  _ExternalLink, Building2, IndianRupee, 
  LayoutGrid, List as ListIcon, Eye, _Briefcase, _FileText, _Handshake
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
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import type { Project } from "@/types/project";
import { normalizeProject } from "@/lib/projectNormalize";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { PROJECT_KINDS } from "@/domain/projectTypes/types";

function customerOptionalForDirectExceptionKind(k: ProjectKind): boolean {
  return k === "INC_GIVEN" || k === "VENDORSHIP_ONLY" || k === "VENDOR_NETWORK";
}

const Projects = () => {
  const navigate = useNavigate();
  const {
    projects,
    employees,
    customers,
    partners,
    incGiverCompanies,
    getProjectEligibleQuotations,
    _createProjectFromConfirmedQuotation,
    createDirectProjectException,
    _generateId,
    canDo,
  } = useAppData();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
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
  const _eligibleQuotations = useMemo(() => getProjectEligibleQuotations(), [getProjectEligibleQuotations, projects]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const projectKindLabel: Record<NonNullable<Project["projectKind"]>, string> = {
    SOLO_EPC: "Solo", 
    PARTNER_EPC: "Partner", 
    FIXED_EPC: "Fixed",
    VENDOR_NETWORK: "Vendor", 
    INC: "INC",
    INC_GIVEN: "INC Given",
    OUTSOURCED_INC: "Outsourced",
    VENDORSHIP_ONLY: "Vendorship Only"
  };

  const projectKindTone: Record<NonNullable<Project["projectKind"]>, string> = {
    SOLO_EPC: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
    PARTNER_EPC: "bg-primary/10 text-primary border-primary/25",
    FIXED_EPC: "bg-amber-500/10 text-amber-800 border-amber-500/25",
    VENDOR_NETWORK: "bg-violet-500/10 text-violet-700 border-violet-500/25",
    INC: "bg-slate-500/10 text-slate-700 border-slate-500/25",
    INC_GIVEN: "bg-orange-500/10 text-orange-700 border-orange-500/25",
    OUTSOURCED_INC: "bg-sky-500/10 text-sky-700 border-sky-500/25",
    VENDORSHIP_ONLY: "bg-rose-500/10 text-rose-700 border-rose-500/25",
  };

  // Filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesType = typeFilter === "all" || p.projectType === typeFilter;
      const matchesKind = kindFilter === "all" || p.projectKind === kindFilter;
      return matchesSearch && matchesStatus && matchesType && matchesKind;
    });
  }, [projects, searchQuery, statusFilter, typeFilter, kindFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / tablePageSize) || 1);
  
  useEffect(() => {
    setTablePage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedProjects = filteredProjects.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const getCategoryIcon = (projectType: string) => {
    switch (projectType) {
      case "Residential": return <Building2 className="h-4 w-4 text-amber-500" />;
      case "Commercial": return <Building2 className="h-4 w-4 text-primary" />;
      case "Industrial": return <Building2 className="h-4 w-4 text-purple-500" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const stats = {
    total: projects.length,
    ongoing: projects.filter(p => p.status === "Ongoing").length,
    completed: projects.filter(p => p.status === "Completed").length,
    onHold: projects.filter(p => p.status === "On Hold").length,
    totalKW: projects.reduce((sum, p) => sum + (parseFloat(p.capacity) || 0), 0).toFixed(1),
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

    const intake: ProjectIntakePayload = { kind: dexKind, parties, commercial };
    const res = await createDirectProjectException({
      projectName: dexName.trim(),
      reason: dexReason.trim(),
      customerId: dexCustomerId,
      intake,
    });
    if (res.ok && res.projectId) {
      toast({ title: "Project created", description: "Direct exception project is active." });
      setDirectExOpen(false);
      resetDirectExForm();
      navigate(`/projects/${res.projectId}`);
    } else {
      toast({ title: "Could not create project", description: res.error ?? "Unknown error", variant: "destructive" });
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
              { label: "Ongoing", value: stats.ongoing },
              { label: "Completed", value: stats.completed },
              { label: "On Hold", value: stats.onHold },
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
              <Select value={dexCustomerId || "__none__"} onValueChange={(v) => setDexCustomerId(v === "__none__" ? "" : v)}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Ongoing">Ongoing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
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
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Deal Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deal Types</SelectItem>
              <SelectItem value="SOLO_EPC">Solo</SelectItem>
              <SelectItem value="PARTNER_EPC">Partner</SelectItem>
              <SelectItem value="FIXED_EPC">Fixed</SelectItem>
              <SelectItem value="VENDOR_NETWORK">Vendorship</SelectItem>
              <SelectItem value="INC">INC</SelectItem>
              <SelectItem value="INC_GIVEN">INC Given</SelectItem>
              <SelectItem value="OUTSOURCED_INC">Outsourced INC</SelectItem>
              <SelectItem value="VENDORSHIP_ONLY">Vendorship Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "table" ? (
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
            {pagedProjects.map(project => {
              const kind = project.projectKind || "SOLO_EPC";
              return (
              <TableRow key={project.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(project.projectType)}
                    <div className="min-w-0">
                      <span className="font-medium block truncate">{project.name}</span>
                      <span className="text-2xs text-muted-foreground font-mono">{project.id}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{project.client}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-2xs ${projectKindTone[kind]}`}>{projectKindLabel[kind]}</Badge>
                </TableCell>
                <TableCell>{project.capacity}</TableCell>
                <TableCell>
                  <StatusBadge status={normalizeProject(project).status ?? "Ongoing"} />
                </TableCell>
                <TableCell className="text-muted-foreground">{project.startDate}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </DataTableShell>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedProjects.map(project => {
            const kind = project.projectKind || "SOLO_EPC";
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
                  <StatusBadge status={normalizeProject(project).status ?? "Ongoing"} />
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge variant="outline" className={`text-2xs ${projectKindTone[kind]}`}>{projectKindLabel[kind]}</Badge>
                  <Badge variant="secondary" className="text-2xs">{project.projectType}</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{project.client}</span>
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
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                              {emp?.name.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                    {assigneeCount > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{assigneeCount - 3}</span>
                    )}
                    {assigneeCount === 0 && (
                      <span className="text-xs text-muted-foreground italic">Unassigned</span>
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
        <CreateProjectModal 
        open={isCreateProjectOpen} 
        onOpenChange={setIsCreateProjectOpen} 
      />
    </PageShell>
  );
};

export default Projects;

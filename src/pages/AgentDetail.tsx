import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { findByRouteId } from "@/lib/resolveEntityId";
import { ArrowLeft, Phone, Mail, MapPin, UserCheck, Check, Clock, ExternalLink, Plus, Wallet, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { getPriorityColor } from "@/lib/statusColors";
import { formatINR } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";
import { expectedAgentFeeForProject, parseCapacityKw } from "@/domain/agents/agentCommission";

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { agents, projects, enquiries, quotations, updateProject, updateAgent, addAgentCommissionPayment, updateAgentCommissionPayment, deleteAgentCommissionPayment, getCommissionPaymentsByAgent, generateId } = useAppData();

  const [agentTab, setAgentTab] = useState<"enquiries" | "quotations" | "projects" | "commissions">("projects");
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "enquiries" || t === "quotations" || t === "projects" || t === "commissions") setAgentTab(t);
  }, [searchParams]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProjectId, setPaymentProjectId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentNotes, setPaymentNotes] = useState("");

  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [eaName, setEaName] = useState("");
  const [eaPhone, setEaPhone] = useState("");
  const [eaEmail, setEaEmail] = useState("");
  const [eaAddress, setEaAddress] = useState("");
  const [eaRateType, setEaRateType] = useState<"per-kw" | "per-project">("per-kw");
  const [eaRatePerKw, setEaRatePerKw] = useState("");
  const [eaFlatRate, setEaFlatRate] = useState("");
  const [eaStatus, setEaStatus] = useState<"active" | "inactive">("active");

  // Commission payment action state
  const [deletePayTarget, setDeletePayTarget] = useState<{ id: string; amount: number; projectId: string } | null>(null);
  const [editPayTarget, setEditPayTarget] = useState<{ id: string; amount: number; projectId: string } | null>(null);
  const [editPayNewAmount, setEditPayNewAmount] = useState("");
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);

  const openEditAgent = () => {
    if (!agent) return;
    setEaName(agent.name);
    setEaPhone(agent.phone);
    setEaEmail(agent.email ?? "");
    setEaAddress(agent.address ?? "");
    setEaRateType(agent.rateType);
    setEaRatePerKw(String(agent.ratePerKw ?? ""));
    setEaFlatRate(agent.flatRate != null ? String(agent.flatRate) : "");
    setEaStatus(agent.status);
    setIsEditAgentOpen(true);
  };

  const saveAgentProfile = () => {
    if (!agent || !id) return;
    const name = eaName.trim();
    if (!name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const rpk = parseFloat(eaRatePerKw);
    const flat = parseFloat(eaFlatRate);
    updateAgent(id, {
      name,
      phone: eaPhone.trim(),
      email: eaEmail.trim() || undefined,
      address: eaAddress.trim(),
      rateType: eaRateType,
      ratePerKw: Number.isFinite(rpk) && rpk >= 0 ? rpk : agent.ratePerKw,
      flatRate: eaRateType === "per-project" && Number.isFinite(flat) && flat >= 0 ? flat : undefined,
      status: eaStatus,
    });
    toast({ title: "Agent profile updated" });
    setIsEditAgentOpen(false);
  };

  const agent = useMemo(() => findByRouteId(agents, id), [agents, id]);

  const agentProjects = useMemo(() =>
    projects.filter(p => p.agentId === id),
    [projects, id]
  );

  const agentEnquiries = useMemo(() =>
    enquiries.filter(e => e.agentId === id),
    [enquiries, id]
  );

  const agentQuotations = useMemo(
    () => quotations.filter((q) => q.agentId === id),
    [quotations, id],
  );

  const convertedEnquiriesCount = useMemo(() =>
    agentEnquiries.filter(e => e.status === "converted").length,
    [agentEnquiries]
  );

  const totalCommission = useMemo(() =>
    agentProjects.reduce((s, p) => s + (p.commissionAmount || 0), 0),
    [agentProjects]
  );

  const paidCommission = useMemo(() =>
    agentProjects.reduce((s, p) => s + (p.commissionPaid || 0), 0),
    [agentProjects]
  );

  const pendingCommission = totalCommission - paidCommission;

  const _expectedFromTerms = useMemo(() => {
    if (!agent) return 0;
    return agentProjects.reduce((sum, p) => {
      const kw = parseCapacityKw(p.capacity);
      const rateType = (p.commissionRateType ?? agent.rateType) as "per-kw" | "per-project";
      return (
        sum +
        expectedAgentFeeForProject({
          ratePerKw: p.commissionRate ?? agent.ratePerKw,
          rateType,
          flatRate: agent.flatRate,
          capacityKw: kw,
        })
      );
    }, 0);
  }, [agent, agentProjects]);

  const projectsWithPending = useMemo(() =>
    agentProjects.filter(p => ((p.commissionAmount || 0) - (p.commissionPaid || 0)) > 0),
    [agentProjects]
  );

  const commissionRows = useMemo(
    () => agentProjects.filter((p) => (p.commissionAmount || 0) > 0),
    [agentProjects],
  );

  const [projectsTabPage, setProjectsTabPage] = useState(1);
  const [projectsTabPageSize, setProjectsTabPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [enquiriesTabPage, setEnquiriesTabPage] = useState(1);
  const [enquiriesTabPageSize, setEnquiriesTabPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [quotationsTabPage, setQuotationsTabPage] = useState(1);
  const [quotationsTabPageSize, setQuotationsTabPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [commissionTabPage, setCommissionTabPage] = useState(1);
  const [commissionTabPageSize, setCommissionTabPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const { pagedItems: pagedAgentProjects, safePage: safeProjectsTabPage } = usePagedSlice(
    agentProjects,
    projectsTabPage,
    projectsTabPageSize,
  );
  const { pagedItems: pagedAgentEnquiries, safePage: safeEnquiriesTabPage } = usePagedSlice(
    agentEnquiries,
    enquiriesTabPage,
    enquiriesTabPageSize,
  );
  const { pagedItems: pagedAgentQuotations, safePage: safeQuotationsTabPage } = usePagedSlice(
    agentQuotations,
    quotationsTabPage,
    quotationsTabPageSize,
  );
  const { pagedItems: pagedCommissionProjects, safePage: safeCommissionTabPage } = usePagedSlice(
    commissionRows,
    commissionTabPage,
    commissionTabPageSize,
  );

  const handleRecordPayment = () => {
    const amount = Number.parseFloat(paymentAmount);
    if (!paymentProjectId || !Number.isFinite(amount) || amount <= 0) {
      setLastConfirm({ variant: "error", title: "Please select a project and enter a valid amount." });
      return;
    }
    const project = projects.find(p => p.id === paymentProjectId);
    if (!project) return;

    const pending = (project.commissionAmount || 0) - (project.commissionPaid || 0);
    if (amount > pending) {
      setLastConfirm({ variant: "error", title: `Amount exceeds pending commission of ${formatINR(pending)}.` });
      return;
    }

    updateProject(paymentProjectId, {
      commissionPaid: (project.commissionPaid || 0) + amount,
    });

    addAgentCommissionPayment({
      id: generateId("ACP"),
      agentId: id!,
      projectId: paymentProjectId,
      projectName: project.name,
      amount,
      date: paymentDate,
      mode: paymentMode as "cash" | "bank_transfer" | "cheque" | "upi" | "other",
      notes: paymentNotes || undefined,
      createdAt: new Date().toISOString(),
    });

    setLastConfirm({
      variant: "success",
      title: `Recorded ${formatINR(amount)} commission payment`,
      description: `For ${project.name} · ${format(new Date(), "HH:mm")}`,
    });
    setShowPaymentModal(false);
    setPaymentProjectId("");
    setPaymentAmount("");
    setPaymentMode("bank_transfer");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentNotes("");
  };

  const handleConfirmDeletePay = () => {
    if (!deletePayTarget) return;
    const project = projects.find(p => p.id === deletePayTarget.projectId);
    if (project) {
      updateProject(deletePayTarget.projectId, {
        commissionPaid: Math.max(0, (project.commissionPaid || 0) - deletePayTarget.amount),
      });
    }
    deleteAgentCommissionPayment(deletePayTarget.id);
    setLastConfirm({
      variant: "success",
      title: `Deleted ${formatINR(deletePayTarget.amount)} commission payment`,
    });
    setDeletePayTarget(null);
  };

  const handleSaveEditPay = () => {
    if (!editPayTarget) return;
    const nextAmount = Number.parseFloat(editPayNewAmount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setLastConfirm({ variant: "error", title: "Enter a valid amount greater than 0." });
      return;
    }
    const project = projects.find(p => p.id === editPayTarget.projectId);
    if (project) {
      const delta = nextAmount - editPayTarget.amount;
      const newCommissionPaid = (project.commissionPaid || 0) + delta;
      const maxAllowed = project.commissionAmount || 0;
      if (newCommissionPaid > maxAllowed) {
        setLastConfirm({
          variant: "error",
          title: `Total paid would exceed commission of ${formatINR(maxAllowed)}.`,
        });
        return;
      }
      updateProject(editPayTarget.projectId, {
        commissionPaid: Math.max(0, newCommissionPaid),
      });
    }
    updateAgentCommissionPayment(editPayTarget.id, { amount: nextAmount });
    setLastConfirm({
      variant: "success",
      title: `Updated commission payment to ${formatINR(nextAmount)}`,
    });
    setEditPayTarget(null);
    setEditPayNewAmount("");
  };

  if (!agent) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Agent not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Agents", to: "/agents" },
          { label: agent.name },
        ]}
        subRow={
          <>
            <div className="flex min-w-0 max-w-full flex-1 flex-col gap-1.5 text-xs sm:max-w-[55%]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <a href={`tel:${agent.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {agent.phone}
                </a>
                {agent.email && (
                  <a href={`mailto:${agent.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {agent.email}
                  </a>
                )}
              </div>
              {agent.address && (
                <div className="inline-flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{agent.address}</span>
                </div>
              )}
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Enquiries", value: agentEnquiries.length },
                { label: "Quotations", value: agentQuotations.length },
                { label: "Converted", value: convertedEnquiriesCount },
                { label: "Projects", value: agentProjects.length },
                { label: "Commission", value: formatINR(totalCommission) },
                { label: "Paid", value: formatINR(paidCommission) },
                { label: "Pending", value: formatINR(pendingCommission) },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPaymentModal(true)} disabled={projectsWithPending.length === 0}>
            <Wallet className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button variant="outline" onClick={openEditAgent}>
            <Pencil className="h-4 w-4 mr-2" /> Edit profile
          </Button>
          <Button onClick={() => navigate(`/enquiries?createFrom=agent:${agent.id}`)}>
            <Plus className="h-4 w-4 mr-2" /> Add Enquiry from Agent
          </Button>
          {agent.status === "inactive" ? (
            <Button variant="outline" onClick={() => { updateAgent(agent.id, { status: "active" }); }}>
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="text-muted-foreground"
              onClick={() => { updateAgent(agent.id, { status: "inactive" }); }}
            >
              Deactivate
            </Button>
          )}
        </div>
      </StickyPageHeader>

      {agent.status === "inactive" && (
        <LifecycleTerminalBanner
          variant="archived"
          title="Agent deactivated"
          description={
            <span>
              This agent is inactive and excluded from new referrals. Commission and project history remain visible — reactivate to assign new enquiries.
            </span>
          }
          primaryActionLabel="Reactivate"
          onPrimaryAction={() => {
            updateAgent(agent.id, { status: "active" });
            setLastConfirm({ variant: "success", title: "Agent reactivated", description: agent.name });
          }}
        />
      )}

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {agent.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold">{agent.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              <UserCheck className="mr-1 w-3 h-3" /> Agent
            </Badge>
            <Badge variant="outline">
              {agent.rateType === "per-kw" ? `${formatINR(agent.ratePerKw)}/kW` : `${formatINR(agent.flatRate || 0)}/project`}
            </Badge>
            <StatusBadge status={agent.status} label={agent.status} className="text-xs" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={agentTab}
        onValueChange={(v) => {
          const next = v as "enquiries" | "quotations" | "projects" | "commissions";
          setAgentTab(next);
          setSearchParams(
            (prev) => {
              const n = new URLSearchParams(prev);
              n.set("tab", next);
              return n;
            },
            { replace: true },
          );
        }}
      >
        <TabsList>
          <TabsTrigger value="enquiries">Enquiries ({agentEnquiries.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({agentQuotations.length})</TabsTrigger>
          <TabsTrigger value="projects">Converted Projects ({agentProjects.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commission History</TabsTrigger>
        </TabsList>

        <TabsContent value="enquiries" className="space-y-4">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {agentEnquiries.length > 0 ? (
                <DataTableShell
                  variant="inline" maxHeight={listTableViewportMaxHeight(enquiriesTabPageSize)}
                  scrollResetKey={`${safeEnquiriesTabPage}-${enquiriesTabPageSize}-${agentEnquiries.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeEnquiriesTabPage}
                      pageSize={enquiriesTabPageSize}
                      total={agentEnquiries.length}
                      onPageChange={setEnquiriesTabPage}
                      onPageSizeChange={(n) => {
                        setEnquiriesTabPageSize(n);
                        setEnquiriesTabPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Enquiry ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedAgentEnquiries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.id}</TableCell>
                        <TableCell>{e.customerName}</TableCell>
                        <TableCell>{e.systemCapacity || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={e.status} className="text-xs" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-0 capitalize", getPriorityColor(e.priority))}>
                            {e.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{e.createdAt}</TableCell>
                        <TableCell className="text-right">{formatINR(e.estimatedBudget)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <ListEmptyState
                  icon={UserCheck}
                  title="No enquiries yet"
                  description="This agent has not been linked to any enquiries."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {agentQuotations.length > 0 ? (
                <DataTableShell
                  variant="inline"
                  maxHeight={listTableViewportMaxHeight(quotationsTabPageSize)}
                  scrollResetKey={`${safeQuotationsTabPage}-${quotationsTabPageSize}-${agentQuotations.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeQuotationsTabPage}
                      pageSize={quotationsTabPageSize}
                      total={agentQuotations.length}
                      onPageChange={setQuotationsTabPage}
                      onPageSizeChange={(n) => {
                        setQuotationsTabPageSize(n);
                        setQuotationsTabPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Quotation</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedAgentQuotations.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{q.quotationNumber}</TableCell>
                        <TableCell>{q.clientName}</TableCell>
                        <TableCell>
                          <StatusBadge status={q.status} className="text-xs" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(q.totalAmount ?? 0)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/quotations?id=${q.id}`}>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <ListEmptyState
                  icon={UserCheck}
                  title="No quotations"
                  description="Quotations linked to this agent will appear here."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {agentProjects.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(projectsTabPageSize)}
                  scrollResetKey={`${safeProjectsTabPage}-${projectsTabPageSize}-${agentProjects.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeProjectsTabPage}
                      pageSize={projectsTabPageSize}
                      total={agentProjects.length}
                      onPageChange={setProjectsTabPage}
                      onPageSizeChange={(n) => {
                        setProjectsTabPageSize(n);
                        setProjectsTabPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Contract</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Commission Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedAgentProjects.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.client}</TableCell>
                        <TableCell>{p.capacity}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} label={p.status} className="text-xs" />
                        </TableCell>
                        <TableCell className="text-right">{formatINR(p.contractAmount)}</TableCell>
                        <TableCell className="text-right">{formatINR(p.commissionAmount || 0)}</TableCell>
                        <TableCell>
                          {(p.commissionPaid || 0) >= (p.commissionAmount || 0) ? (
                            <span className="inline-flex items-center gap-1">
                              <Check className="h-3 w-3 text-muted-foreground" aria-hidden />
                              <StatusBadge status="paid" label="Paid" className="text-xs" />
                            </span>
                          ) : (p.commissionPaid || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
                              <StatusBadge status="partial" label="Partial" className="text-xs" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
                              <StatusBadge status="pending" label="Pending" className="text-xs" />
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/projects/${p.id}`}><ExternalLink className="h-3 w-3" /></Link>
                            </Button>
                            {((p.commissionAmount || 0) - (p.commissionPaid || 0)) > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => {
                                setPaymentProjectId(p.id);
                                setPaymentAmount(String((p.commissionAmount || 0) - (p.commissionPaid || 0)));
                                setShowPaymentModal(true);
                              }}>
                                <Wallet className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="px-6 py-10 text-center text-muted-foreground">
                  No projects referred by this agent yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          {id && (
            <Card className="mb-4">
              <CardContent className="py-3">
                {(() => {
                  const ledger = getCommissionPaymentsByAgent(id);
                  const paidFromLedger = ledger.reduce((s, p) => s + p.amount, 0);
                  const earned = totalCommission;
                  const balance = Math.max(0, earned - paidFromLedger);
                  return (
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Earned (projects)</p>
                        <p className="text-lg font-semibold">{formatINR(earned)}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Paid (ledger)</p>
                        <p className="text-lg font-semibold text-primary">{formatINR(paidFromLedger)}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Balance due</p>
                        <p className="text-lg font-semibold text-warning">{formatINR(balance)}</p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {commissionRows.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(commissionTabPageSize)}
                  scrollResetKey={`${safeCommissionTabPage}-${commissionTabPageSize}-${commissionRows.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeCommissionTabPage}
                      pageSize={commissionTabPageSize}
                      total={commissionRows.length}
                      onPageChange={setCommissionTabPage}
                      onPageSizeChange={(n) => {
                        setCommissionTabPageSize(n);
                        setCommissionTabPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Project</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCommissionProjects.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          {p.commissionRateType === "per-kw"
                            ? `${formatINR(p.commissionRate || 0)}/kW`
                            : `${formatINR(p.commissionRate || 0)} flat`}
                        </TableCell>
                        <TableCell className="text-right">{formatINR((p.commissionAmount || 0))}</TableCell>
                        <TableCell className="text-right text-primary">{formatINR((p.commissionPaid || 0))}</TableCell>
                        <TableCell className="text-right text-warning">{formatINR(((p.commissionAmount || 0) - (p.commissionPaid || 0)))}</TableCell>
                        <TableCell>
                          {((p.commissionAmount || 0) - (p.commissionPaid || 0)) > 0 && (
                            <Button variant="outline" size="sm" onClick={() => {
                              setPaymentProjectId(p.id);
                              setPaymentAmount(String((p.commissionAmount || 0) - (p.commissionPaid || 0)));
                              setShowPaymentModal(true);
                            }}>
                              <Wallet className="h-3 w-3 mr-1" /> Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className={dataTableClasses.footRow}>
                      <TableCell colSpan={2}>Total</TableCell>
                      <TableCell className="text-right">{formatINR(totalCommission)}</TableCell>
                      <TableCell className="text-right text-primary">{formatINR(paidCommission)}</TableCell>
                      <TableCell className="text-right text-warning">{formatINR(pendingCommission)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </DataTableShell>
              ) : (
                <div className="px-6 py-10 text-center text-muted-foreground">
                  No commission records yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment log — sorted newest first; running paid is cumulative oldest→newest */}
          {id && (() => {
            const payments = [...getCommissionPaymentsByAgent(id)].sort((a, b) => b.date.localeCompare(a.date));
            const chronological = [...payments].sort((a, b) => a.date.localeCompare(b.date));
            let run = 0;
            const runningById = new Map<string, number>();
            chronological.forEach((p) => {
              run += p.amount;
              runningById.set(p.id, run);
            });
            return (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Commission payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 p-0">
                  {payments.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-muted-foreground">No commission payments recorded yet.</div>
                  ) : (
                    <DataTableShell variant="inline">
                      <TableHeader>
                        <TableRow className={dataTableClasses.headRow}>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Paid to date</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((pay) => (
                          <TableRow key={pay.id}>
                            <TableCell>{pay.date}</TableCell>
                            <TableCell>{pay.projectName ?? pay.projectId}</TableCell>
                            <TableCell className="capitalize">{pay.mode.replace("_", " ")}</TableCell>
                            <TableCell className="text-right text-primary">{formatINR(pay.amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatINR((runningById.get(pay.id) ?? 0))}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">{pay.notes ?? "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditPayTarget({ id: pay.id, amount: pay.amount, projectId: pay.projectId });
                                    setEditPayNewAmount(String(pay.amount));
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => setDeletePayTarget({ id: pay.id, amount: pay.amount, projectId: pay.projectId })}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </DataTableShell>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Record Payment Modal */}
      <Sheet open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Record Commission Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label>Project</Label>
              <Select value={paymentProjectId} onValueChange={(val) => {
                setPaymentProjectId(val);
                const p = projects.find(pr => pr.id === val);
                if (p) setPaymentAmount(String((p.commissionAmount || 0) - (p.commissionPaid || 0)));
              }}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projectsWithPending.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — Pending: {formatINR(((p.commissionAmount || 0) - (p.commissionPaid || 0)))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="Enter amount" />
              {paymentProjectId && (() => {
                const p = projects.find(pr => pr.id === paymentProjectId);
                const pending = p ? (p.commissionAmount || 0) - (p.commissionPaid || 0) : 0;
                return <p className="text-xs text-muted-foreground mt-1">Pending: {formatINR(pending)}</p>;
              })()}
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cash", label: "Cash" },
                    { value: "upi", label: "UPI" },
                    { value: "cheque", label: "Cheque" },
                    { value: "other", label: "Other" },
                  ].map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="Any notes..." rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <Sheet open={isEditAgentOpen} onOpenChange={setIsEditAgentOpen}>
        <AppSheetContent layout="form" size="lg">
          <SheetHeader>
            <SheetTitle>Edit agent</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={eaName} onChange={(e) => setEaName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={eaPhone} onChange={(e) => setEaPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={eaEmail} onChange={(e) => setEaEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={eaAddress} onChange={(e) => setEaAddress(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Commission model</Label>
              <Select value={eaRateType} onValueChange={(v) => setEaRateType(v as "per-kw" | "per-project")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-kw">Per kW</SelectItem>
                  <SelectItem value="per-project">Per project (flat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {eaRateType === "per-kw" ? (
              <div className="space-y-2">
                <Label>Rate per kW (₹)</Label>
                <Input type="number" min={0} step={0.01} value={eaRatePerKw} onChange={(e) => setEaRatePerKw(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Flat rate per project (₹)</Label>
                <Input type="number" min={0} step={1} value={eaFlatRate} onChange={(e) => setEaFlatRate(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={eaStatus} onValueChange={(v) => setEaStatus(v as "active" | "inactive")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditAgentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAgentProfile}>Save</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!deletePayTarget}
        onOpenChange={(o) => { if (!o) setDeletePayTarget(null); }}
        title="Delete commission payment?"
        description={deletePayTarget ? (
          <span>
            Removes the {formatINR(deletePayTarget.amount)} payment and adjusts the project's paid-commission total by the same amount.
          </span>
        ) : ""}
        confirmLabel="Delete payment"
        onConfirm={handleConfirmDeletePay}
      />

      <Sheet
        open={!!editPayTarget}
        onOpenChange={(o) => { if (!o) { setEditPayTarget(null); setEditPayNewAmount(""); } }}
      >
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Edit commission payment</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>New amount (₹)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={editPayNewAmount}
                onChange={(e) => setEditPayNewAmount(e.target.value)}
                autoFocus
              />
              {editPayTarget && (
                <p className="text-xs text-muted-foreground">
                  Original: {formatINR(editPayTarget.amount)}. The project's paid-commission total will be adjusted by the delta.
                </p>
              )}
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setEditPayTarget(null); setEditPayNewAmount(""); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditPay}>Save</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default AgentDetail;

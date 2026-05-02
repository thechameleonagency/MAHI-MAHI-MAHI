import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, UserCheck, IndianRupee, Building2, Check, Clock, ExternalLink, Plus, Wallet } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { expectedAgentFeeForProject, parseCapacityKw } from "@/domain/agents/agentCommission";

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { agents, projects, updateProject } = useAppData();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProjectId, setPaymentProjectId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentNotes, setPaymentNotes] = useState("");

  const agent = useMemo(() => agents.find(a => a.id === id), [agents, id]);

  const agentProjects = useMemo(() =>
    projects.filter(p => p.agentId === id),
    [projects, id]
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

  const expectedFromTerms = useMemo(() => {
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
  const [commissionTabPage, setCommissionTabPage] = useState(1);
  const [commissionTabPageSize, setCommissionTabPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const { pagedItems: pagedAgentProjects, safePage: safeProjectsTabPage } = usePagedSlice(
    agentProjects,
    projectsTabPage,
    projectsTabPageSize,
  );
  const { pagedItems: pagedCommissionProjects, safePage: safeCommissionTabPage } = usePagedSlice(
    commissionRows,
    commissionTabPage,
    commissionTabPageSize,
  );

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentProjectId || !amount || amount <= 0) {
      toast.error("Please select a project and enter a valid amount");
      return;
    }
    const project = projects.find(p => p.id === paymentProjectId);
    if (!project) return;

    const pending = (project.commissionAmount || 0) - (project.commissionPaid || 0);
    if (amount > pending) {
      toast.error(`Amount exceeds pending commission of ₹${pending.toLocaleString()}`);
      return;
    }

    updateProject(paymentProjectId, {
      commissionPaid: (project.commissionPaid || 0) + amount,
    });

    toast.success(`₹${amount.toLocaleString()} commission payment recorded for ${project.name}`);
    setShowPaymentModal(false);
    setPaymentProjectId("");
    setPaymentAmount("");
    setPaymentMode("Bank Transfer");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentNotes("");
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
                { label: "Projects", value: agentProjects.length },
                { label: "Commission", value: `₹${totalCommission.toLocaleString()}` },
                { label: "Expected (rates)", value: `₹${Math.round(expectedFromTerms).toLocaleString()}` },
                { label: "Paid", value: `₹${paidCommission.toLocaleString()}` },
                { label: "Pending", value: `₹${pendingCommission.toLocaleString()}` },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPaymentModal(true)} disabled={projectsWithPending.length === 0}>
            <Wallet className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          <Button onClick={() => navigate(`/enquiries?from=agent&referredBy=${encodeURIComponent(agent.name)}`)}>
            <Plus className="h-4 w-4 mr-2" /> Add Enquiry from Agent
          </Button>
        </div>
      </StickyPageHeader>

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
              {agent.rateType === "per-kw" ? `₹${agent.ratePerKw.toLocaleString()}/kW` : `₹${(agent.flatRate || 0).toLocaleString()}/project`}
            </Badge>
            <Badge className={agent.status === "active" ? "border-0 bg-primary/10 text-primary" : "border-0 bg-muted text-muted-foreground"}>
              {agent.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Referred Projects ({agentProjects.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commission History</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {agentProjects.length > 0 ? (
                <DataTableShell
                  maxHeight={listTableViewportMaxHeight(projectsTabPageSize)}
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
                          <Badge className={p.status === "Ongoing" ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{p.contractAmount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{(p.commissionAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {(p.commissionPaid || 0) >= (p.commissionAmount || 0) ? (
                            <Badge className="bg-blue-500/20 text-blue-500 border-0"><Check className="w-3 h-3 mr-1" />Paid</Badge>
                          ) : (p.commissionPaid || 0) > 0 ? (
                            <Badge className="bg-blue-500/20 text-blue-500 border-0"><Clock className="w-3 h-3 mr-1" />Partial</Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-500 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
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
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {commissionRows.length > 0 ? (
                <DataTableShell
                  maxHeight={listTableViewportMaxHeight(commissionTabPageSize)}
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
                            ? `₹${(p.commissionRate || 0).toLocaleString()}/kW`
                            : `₹${(p.commissionRate || 0).toLocaleString()} flat`}
                        </TableCell>
                        <TableCell className="text-right">₹{(p.commissionAmount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-primary">₹{(p.commissionPaid || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-amber-500">₹{((p.commissionAmount || 0) - (p.commissionPaid || 0)).toLocaleString()}</TableCell>
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
                      <TableCell className="text-right">₹{totalCommission.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-primary">₹{paidCommission.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-500">₹{pendingCommission.toLocaleString()}</TableCell>
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
        </TabsContent>
      </Tabs>

      {/* Record Payment Modal */}
      <Sheet open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                      {p.name} — Pending: ₹{((p.commissionAmount || 0) - (p.commissionPaid || 0)).toLocaleString()}
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
                return <p className="text-xs text-muted-foreground mt-1">Pending: ₹{pending.toLocaleString()}</p>;
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
                  {["Bank Transfer", "Cash", "UPI", "Cheque"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
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
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default AgentDetail;

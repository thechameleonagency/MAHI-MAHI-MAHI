import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Hammer, Phone, Mail, MapPin, Plus, Briefcase, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useAppData } from "@/contexts/AppDataContext";
import { findByRouteId } from "@/lib/resolveEntityId";
import { formatINR } from "@/lib/formatCurrency";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { dataTableClasses } from "@/lib/tableConstants";
import { filterProjectsForSubcontractor } from "@/lib/subcontractorProjectLink";
import {
  deriveSubcontractorEconomics,
  deriveSubcontractorProjectPaid,
  sumSubcontractorPayments,
} from "@/lib/deriveSubcontractorEconomics";
import { toast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import type { SubcontractorTransaction } from "@/types/finance";

const SubcontractorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    subcontractors,
    projects,
    subcontractorTransactions,
    addSubcontractorTransaction,
    generateId,
  } = useAppData();
  const canRecordTxn = useCan("partner", "create");

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [txnType, setTxnType] = useState<SubcontractorTransaction["type"]>("payment");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split("T")[0]);
  const [txnProjectId, setTxnProjectId] = useState("");
  const [txnNotes, setTxnNotes] = useState("");

  const subcontractor = useMemo(
    () => findByRouteId(subcontractors ?? [], id),
    [subcontractors, id],
  );

  const linkedProjects = useMemo(
    () => (id ? filterProjectsForSubcontractor(projects ?? [], id) : []),
    [projects, id],
  );

  const subcontractorTxns = useMemo(
    () => (subcontractorTransactions ?? []).filter((t) => t.subcontractorId === id),
    [subcontractorTransactions, id],
  );

  const economics = useMemo(() => {
    if (!id) {
      return {
        linkedProjectCount: 0,
        completedProjectCount: 0,
        contract: 0,
        paid: 0,
        pending: 0,
      };
    }
    return deriveSubcontractorEconomics(id, projects ?? [], subcontractorTransactions ?? []);
  }, [id, projects, subcontractorTransactions]);

  const sortedTxns = useMemo(
    () => [...subcontractorTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [subcontractorTxns],
  );

  const projectLedger = useMemo(() => sortedTxns.filter((t) => !!t.projectId), [sortedTxns]);
  const personalLedger = useMemo(() => sortedTxns.filter((t) => !t.projectId), [sortedTxns]);
  const projectPaid = useMemo(() => sumSubcontractorPayments(projectLedger), [projectLedger]);
  const personalPaid = useMemo(() => sumSubcontractorPayments(personalLedger), [personalLedger]);
  const projectPending = Math.max(0, economics.contract - projectPaid);
  const combinedPending = economics.pending;
  const combinedLabel =
    combinedPending > 0 ? "Pending payout to subcontractor" : "Fully paid on ledger";

  const resetTxnForm = () => {
    setTxnType("payment");
    setTxnAmount("");
    setTxnDate(new Date().toISOString().split("T")[0]);
    setTxnProjectId("");
    setTxnNotes("");
  };

  const submitTransaction = () => {
    if (!subcontractor || !id) return;
    const amount = Number.parseFloat(txnAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    const project = txnProjectId ? linkedProjects.find((p) => p.id === txnProjectId) : undefined;
    addSubcontractorTransaction({
      id: generateId("SBT"),
      subcontractorId: id,
      projectId: project?.id,
      projectName: project?.name,
      date: txnDate,
      amount,
      type: txnType,
      notes: txnNotes.trim() || undefined,
    });
    setIsRecordOpen(false);
    resetTxnForm();
    toast({
      title: "Payout recorded",
      description: `${txnType === "payment" ? "Payment" : "Adjustment"} ${formatINR(amount)}`,
    });
  };

  if (!subcontractor) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Subcontractor not found.</p>
          <Button variant="outline" onClick={() => navigate("/subcontractors")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Subcontractors", to: "/subcontractors" },
          { label: subcontractor.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Outsource jobs", value: economics.linkedProjectCount },
              { label: "Completed", value: economics.completedProjectCount },
              { label: "Contract", value: formatINR(economics.contract) },
              { label: "Paid (ledger)", value: formatINR(economics.paid) },
              { label: "Pending", value: formatINR(economics.pending) },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/subcontractors")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {canRecordTxn && (
            <Button size="sm" onClick={() => setIsRecordOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record payout
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Subcontractor profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Hammer className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">{subcontractor.name}</h3>
                  {subcontractor.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{subcontractor.notes}</p>
                  )}
                </div>
              </div>
              {subcontractor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{subcontractor.phone}</span>
                </div>
              )}
              {subcontractor.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{subcontractor.email}</span>
                </div>
              )}
              {subcontractor.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{subcontractor.address}</span>
                </div>
              )}
              {subcontractor.defaultRatePerKw != null && (
                <p className="text-sm text-muted-foreground">
                  Default rate: {formatINR(subcontractor.defaultRatePerKw)}/kW
                </p>
              )}
              <div className="pt-4 border-t text-sm flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span className="font-medium">{subcontractor.createdAt}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">
                Payout summary (by project)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {linkedProjects.map((p) => {
                  const contractAmount = p.outsource?.total ?? 0;
                  const paid = deriveSubcontractorProjectPaid(p.id, subcontractorTxns);
                  const pending = Math.max(0, contractAmount - paid);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 border-b border-border/60 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <Link to={`/projects/${p.id}`} className="min-w-0 flex-1 hover:bg-muted/30 sm:rounded-md sm:px-1 sm:py-0.5">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-2xs text-muted-foreground uppercase tracking-tight">{p.client}</p>
                      </Link>
                      <div className="text-right space-y-0.5 shrink-0">
                        <p className="text-sm font-semibold text-primary">Contract {formatINR(contractAmount)}</p>
                        <p className="text-2xs text-muted-foreground">Paid: {formatINR(paid)}</p>
                        <p className={`text-2xs ${pending > 0 ? "text-warning" : "text-muted-foreground"}`}>
                          Pending: {formatINR(pending)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {linkedProjects.length === 0 && (
                  <ListEmptyState
                    density="compact"
                    icon={Briefcase}
                    title="No outsource jobs linked"
                    description="Attach this subcontractor from a project detail page."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="flex flex-wrap items-baseline justify-between gap-4 py-4">
              <div>
                <p className="text-2xs uppercase tracking-wider text-muted-foreground">Combined pending payout</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${combinedPending > 0 ? "text-warning" : "text-success"}`}>
                  {formatINR(combinedPending)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{combinedLabel}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Project: <span className="ml-1 text-warning">{formatINR(projectPending)}</span>
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Personal: <span className="ml-1">{formatINR(personalPaid)}</span>
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { title: "Project transaction ledger", rows: projectLedger, kind: "project" as const },
              { title: "Personal transaction ledger", rows: personalLedger, kind: "personal" as const },
            ].map((ledger) => (
              <Card key={ledger.kind}>
                <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">{ledger.title}</CardTitle>
                  <Badge variant="outline" className="font-normal">{ledger.rows.length} entries</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTableShell variant="inline" maxHeight={400} scrollResetKey={`${ledger.kind}-${ledger.rows.length}`}>
                    <TableHeader>
                      <TableRow className={dataTableClasses.headRow}>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        {ledger.kind === "project" && <TableHead>Project</TableHead>}
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={ledger.kind === "project" ? 5 : 4} className="p-0">
                            <ListEmptyState
                              icon={Receipt}
                              title={`No ${ledger.kind} transactions yet`}
                              description={
                                ledger.kind === "project"
                                  ? "Project-linked payouts to this subcontractor appear here."
                                  : "Personal advances and adjustments (not tied to a project) appear here."
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )}
                      {ledger.rows.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {tx.type}
                            </Badge>
                          </TableCell>
                          {ledger.kind === "project" && (
                            <TableCell>
                              {tx.projectId ? (
                                <Link to={`/projects/${tx.projectId}`} className="text-primary hover:underline">
                                  {tx.projectName ?? tx.projectId}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right font-mono">
                            {tx.type === "payment" ? formatINR(tx.amount) : `-${formatINR(tx.amount)}`}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{tx.notes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTableShell>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outsource jobs ({linkedProjects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {linkedProjects.length === 0 ? (
                <ListEmptyState
                  density="compact"
                  icon={Hammer}
                  title="No outsource jobs"
                  description="Projects with this subcontractor attached appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Contract</TableHead>
                      <TableHead className="text-right">Ledger paid</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedProjects.map((p) => {
                      const contractAmount = p.outsource?.total ?? 0;
                      const ledgerPaid = deriveSubcontractorProjectPaid(p.id, subcontractorTxns);
                      const pending = Math.max(0, contractAmount - ledgerPaid);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Link to={`/projects/${p.id}`} className="text-primary hover:underline">
                              {p.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{p.client}</TableCell>
                          <TableCell>{p.capacity || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.lifecycleStatus || p.status || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{formatINR(contractAmount)}</TableCell>
                          <TableCell className="text-right font-mono text-success">
                            {formatINR(ledgerPaid)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${pending > 0 ? "text-warning" : ""}`}>
                            {formatINR(pending)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txnType} onValueChange={(v) => setTxnType(v as SubcontractorTransaction["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment (to subcontractor)</SelectItem>
                  <SelectItem value="adjustment">Adjustment (credit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Linked project (optional)</Label>
              <Select value={txnProjectId || "none"} onValueChange={(v) => setTxnProjectId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {linkedProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={txnNotes} onChange={(e) => setTxnNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsRecordOpen(false); resetTxnForm(); }}>
              Cancel
            </Button>
            <Button onClick={submitTransaction}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default SubcontractorDetail;



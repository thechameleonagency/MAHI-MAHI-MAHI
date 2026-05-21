import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, HardHat, Phone, Mail, MapPin, Plus } from "lucide-react";
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
import { filterProjectsForIncGiverCompany } from "@/lib/incGiverProjectLink";
import {
  deriveIncGiverCompanyEconomics,
  deriveIncGiverProjectCollected,
} from "@/lib/deriveIncGiverEconomics";
import { toast } from "@/hooks/use-toast";
import { useCan } from "@/hooks/useCan";
import type { INCGiverTransaction } from "@/types/finance";

const INCWorkSourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    incGiverCompanies,
    projects,
    incGiverTransactions,
    addINCGiverTransaction,
    generateId,
  } = useAppData();
  const canRecordTxn = useCan("partner", "create");

  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [txnType, setTxnType] = useState<INCGiverTransaction["type"]>("collection");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split("T")[0]);
  const [txnProjectId, setTxnProjectId] = useState("");
  const [txnNotes, setTxnNotes] = useState("");

  const company = useMemo(
    () => findByRouteId(incGiverCompanies ?? [], id),
    [incGiverCompanies, id],
  );

  const linkedProjects = useMemo(
    () => (id ? filterProjectsForIncGiverCompany(projects ?? [], id, incGiverCompanies ?? []) : []),
    [projects, id, incGiverCompanies],
  );

  const companyTxns = useMemo(
    () => (incGiverTransactions ?? []).filter((t) => t.incGiverCompanyId === id),
    [incGiverTransactions, id],
  );

  const economics = useMemo(() => {
    if (!id) {
      return {
        linkedProjectCount: 0,
        completedProjectCount: 0,
        toCollect: 0,
        collected: 0,
        pending: 0,
      };
    }
    return deriveIncGiverCompanyEconomics(
      id,
      projects ?? [],
      incGiverTransactions ?? [],
      incGiverCompanies ?? [],
    );
  }, [id, projects, incGiverTransactions, incGiverCompanies]);

  const sortedTxns = useMemo(
    () => [...companyTxns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [companyTxns],
  );

  const resetTxnForm = () => {
    setTxnType("collection");
    setTxnAmount("");
    setTxnDate(new Date().toISOString().split("T")[0]);
    setTxnProjectId("");
    setTxnNotes("");
  };

  const submitTransaction = () => {
    if (!company || !id) return;
    const amount = Number.parseFloat(txnAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    const project = txnProjectId ? linkedProjects.find((p) => p.id === txnProjectId) : undefined;
    addINCGiverTransaction({
      id: generateId("IGT"),
      incGiverCompanyId: id,
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
      title: "Settlement recorded",
      description: `${txnType === "collection" ? "Collection" : "Adjustment"} ${formatINR(amount)}`,
    });
  };

  if (!company) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">INC work source not found.</p>
          <Button variant="outline" onClick={() => navigate("/inc-work-sources")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "INC work sources", to: "/inc-work-sources" },
          { label: company.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap"
            items={[
              { label: "INC jobs", value: economics.linkedProjectCount },
              { label: "Completed", value: economics.completedProjectCount },
              { label: "To collect", value: formatINR(economics.toCollect) },
              { label: "Collected (ledger)", value: formatINR(economics.collected) },
              { label: "Pending", value: formatINR(economics.pending) },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/inc-work-sources")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {canRecordTxn && (
            <Button size="sm" onClick={() => setIsRecordOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Record settlement
            </Button>
          )}
        </div>
      </StickyPageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-warning/10 flex items-center justify-center">
              <HardHat className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-xl">{company.name}</CardTitle>
              {company.notes && <p className="mt-1 text-sm text-muted-foreground">{company.notes}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {company.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{company.email}</span>
            </div>
          )}
          {company.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{company.address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settlement ledger ({sortedTxns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTxns.length === 0 ? (
            <ListEmptyState
              density="compact"
              icon={HardHat}
              title="No settlements recorded"
              description="Collections and adjustments from this INC work source appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTxns.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tx.projectId ? (
                        <Link to={`/projects/${tx.projectId}`} className="text-primary hover:underline">
                          {tx.projectName ?? tx.projectId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.type === "collection" ? formatINR(tx.amount) : `-${formatINR(tx.amount)}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{tx.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">INC jobs received ({linkedProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedProjects.length === 0 ? (
            <ListEmptyState
              density="compact"
              icon={HardHat}
              title="No INC jobs from this source"
              description="Projects linked to this work source appear here."
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
                  <TableHead className="text-right">Ledger collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedProjects.map((p) => {
                  const ledgerCollected = deriveIncGiverProjectCollected(p.id, companyTxns);
                  const pending = Math.max(0, (p.contractAmount || 0) - ledgerCollected);
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
                      <TableCell className="text-right font-mono">{formatINR(p.contractAmount || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-success">
                        {formatINR(ledgerCollected)}
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

      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record settlement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={txnType} onValueChange={(v) => setTxnType(v as INCGiverTransaction["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Collection (from giver)</SelectItem>
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

export default INCWorkSourceDetail;

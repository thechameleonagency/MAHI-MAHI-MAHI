import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, IndianRupee, Pencil, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formatINR } from "@/lib/formatCurrency";
import {
  calculateProjectPartnerEarning,
  calculateProjectProfit,
  _calculateProjectVendorshipFee,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,
  _partnerProjectLabel,
  partnerEconomicsWarningMessage,
} from "@/domain/partners/derivePartnerEconomics";
import { projectForbidsAction } from "@/lib/projectDetailTabs";
import type { PartnerTransaction, PartnerType } from "@/types/finance";
import type { Project, ProjectPartner } from "@/types/project";

const transactionOptions: PartnerTransaction["type"][] = [
  "Given to Partner",
  "Received from Partner",
  "Customer Paid Partner",
  "Vendorship Fee",
];

const partnerTypeOptions: PartnerType[] = ["Profit-Share", "Fixed-Rate", "Channel", "Subcontractor"];

type LinkedPartnerProject = {
  project: Project;
  projectPartner?: ProjectPartner;
  profit: number;
  earned: number;
  paid: number;
  received: number;
  pending: number;
};

const PartnerDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    addPartnerTransaction,
    deletePartnerTransaction,
    generateId,
    getPartnerById,
    getTransactionsByPartner,
    partnerTransactions,
    projects,
    canDo,
    updatePartner,
    updateProject,
  } = useAppData();
  
  const partner = id ? getPartnerById(id) : undefined;
  const txns = id ? getTransactionsByPartner(id) : [];
  
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<PartnerTransaction["type"]>("Given to Partner");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [movementProjectId, setMovementProjectId] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  
  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [deleteTxnId, setDeleteTxnId] = useState<string | null>(null);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "record-payment") return;
    setMovementType("Given to Partner");
    setIsMovementOpen(true);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("action");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const [shareEdit, setShareEdit] = useState<{
    project: Project;
    projectPartner: ProjectPartner;
    value: string;
  } | null>(null);

  const [isEditPartnerOpen, setIsEditPartnerOpen] = useState(false);
  const [peName, setPeName] = useState("");
  const [pePhone, setPePhone] = useState("");
  const [peEmail, setPeEmail] = useState("");
  const [peAddress, setPeAddress] = useState("");
  const [peNotes, setPeNotes] = useState("");
  const [peType, setPeType] = useState<PartnerType>("Profit-Share");
  const [peDefaultRatePerKw, setPeDefaultRatePerKw] = useState("");

  const saveProjectProfitShare = () => {
    if (!shareEdit || !id) return;
    const pct = parseFloat(shareEdit.value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast({ title: "Invalid percentage", description: "Enter a number between 0 and 100.", variant: "destructive" });
      return;
    }
    const p = shareEdit.project;
    const row = shareEdit.projectPartner;
    const nextPartners: ProjectPartner[] = (p.partners ?? []).map((pp) =>
      pp.partnerId === row.partnerId && pp.partnerType === "profit"
        ? { ...pp, sharePercentage: pct }
        : pp,
    );
    updateProject(p.id, { partners: nextPartners });
    toast({ title: "Profit share updated", description: `${p.name} now uses ${pct}% for this partner.` });
    setShareEdit(null);
  };

  const openEditPartner = () => {
    if (!partner) return;
    setPeName(partner.name);
    setPePhone(partner.phone);
    setPeEmail(partner.email ?? "");
    setPeAddress(partner.address ?? "");
    setPeNotes(partner.notes ?? "");
    setPeType(partner.type);
    setPeDefaultRatePerKw(partner.defaultRatePerKw != null ? String(partner.defaultRatePerKw) : "");
    setIsEditPartnerOpen(true);
  };

  const savePartnerProfile = () => {
    if (!partner) return;
    const trimmed = peName.trim();
    if (!trimmed) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    const rate = parseFloat(peDefaultRatePerKw);
    updatePartner(partner.id, {
      name: trimmed,
      phone: pePhone.trim(),
      email: peEmail.trim() || undefined,
      address: peAddress.trim() || undefined,
      notes: peNotes.trim() || undefined,
      type: peType,
      defaultRatePerKw: Number.isFinite(rate) && rate >= 0 ? rate : undefined,
    });
    toast({ title: "Partner updated", description: "Profile details saved." });
    setIsEditPartnerOpen(false);
  };

  const linkedProjects = useMemo<LinkedPartnerProject[]>(() => {
    if (!id) return [];
    return projects
      .map((project) => {
        const projectPartner = project.partners?.find((row) => row.partnerId === id);
        const isScopedPartner = !projectPartner && project.scope?.partnerId === id;
        if (!projectPartner && !isScopedPartner) return null;

        const projectTxns = partnerTransactions.filter((txn) => txn.partnerId === id && txn.projectId === project.id);
        const earned = projectPartner ? calculateProjectPartnerEarning(project, projectPartner) : 0;
        const paid = projectTxns.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
        const received = projectTxns.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);

        return {
          project,
          projectPartner,
          profit: calculateProjectProfit(project),
          earned,
          paid,
          received,
          pending: Math.max(0, earned - paid),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [id, partnerTransactions, projects]);

  const totals = linkedProjects.reduce(
    (acc, row) => ({
      earned: acc.earned + row.earned,
      paid: acc.paid + row.paid,
      pending: acc.pending + row.pending,
      received: acc.received + row.received,
    }),
    { earned: 0, paid: 0, pending: 0, received: 0 },
  );

  const sortedTxns = useMemo(
    () => [...txns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [txns],
  );
  const { pagedItems: pagedTxns, safePage } = usePagedSlice(sortedTxns, txnPage, txnPageSize);

  const resetMovementForm = () => {
    setMovementType("Given to Partner");
    setMovementAmount("");
    setMovementDate(new Date().toISOString().split("T")[0]);
    setMovementNotes("");
    setOverpayDialogOpen(false);
  };

  const [overpayDialogOpen, setOverpayDialogOpen] = useState(false);
  const [overpayMessage, setOverpayMessage] = useState("");

  const submitMovement = (opts?: { skipOverpayCheck?: boolean }) => {
    if (!partner || !movementAmount) {
      toast({ title: "Missing amount", description: "Enter the transaction amount.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(movementAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    const direction =
      movementType === "Received from Partner" || movementType === "Vendorship Fee" ? "received" : "given";

    if (movementProjectId) {
      const proj = projects.find((p) => p.id === movementProjectId);
      if (proj) {
        if (projectForbidsAction(proj, "partner_settlement")) {
          const settlementTypes: PartnerTransaction["type"][] = [
            "Given to Partner",
            "Received from Partner",
            "Customer Paid Partner",
          ];
          if (settlementTypes.includes(movementType)) {
            toast({
              title: "Not allowed",
              description: "Partner settlement is disabled for this project kind.",
              variant: "destructive",
            });
            return;
          }
        }
        if (projectForbidsAction(proj, "channel_fee") && movementType === "Vendorship Fee") {
          toast({
            title: "Not allowed",
            description: "Channel / vendorship fee entries are disabled for this project kind.",
            variant: "destructive",
          });
          return;
        }
      }
    }

    const txnMid = new Date(`${movementDate}T12:00:00`);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    if (txnMid > todayEnd || txnMid < yearAgo) {
      toast({
        title: "Unusual transaction date",
        description:
          txnMid > todayEnd
            ? "This date is in the future. You can still save if it is intentional."
            : "This date is more than one year in the past. You can still save if it is intentional.",
      });
    }

    // Overpayment guard: payment to partner exceeds pending balance
    if (direction === "given" && !opts?.skipOverpayCheck) {
      const pendingBalance = totals.earned - totals.paid;
      if (amount > Math.max(0, pendingBalance)) {
        setOverpayMessage(
          `This payment (${formatINR(amount)}) exceeds this partner's pending balance of ${formatINR(Math.max(0, pendingBalance))}. Continue anyway?`,
        );
        setOverpayDialogOpen(true);
        return;
      }
    }

    addPartnerTransaction({
      id: generateId("PTX"),
      partnerId: partner.id,
      partnerName: partner.name,
      date: movementDate,
      amount,
      type: movementType,
      direction,
      projectId: movementProjectId || undefined,
      notes: movementNotes,
    });
    setOverpayDialogOpen(false);
    setIsMovementOpen(false);
    toast({ title: "Transaction recorded", description: `${movementType}: ${formatINR(amount)}` });
  };

  if (!partner) {
    return (
      <PageShell className="space-y-4">
        <StickyPageHeader breadcrumbs={[{ label: "Home", to: "/" }, { label: "Partners", to: "/partners" }, { label: "Not found" }]} />
        <Card><CardContent className="py-8"><p className="text-sm text-muted-foreground">Partner not found.</p></CardContent></Card>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Partners", to: "/partners" }, { label: partner.name }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Projects", value: linkedProjects.length },
              { label: "Total Earned", value: formatINR(totals.earned) },
              { label: "Total Paid", value: formatINR(totals.paid) },
              { label: "Balance due", value: formatINR(totals.pending) },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button size="sm" variant="secondary" onClick={() => { resetMovementForm(); setMovementType("Given to Partner"); setIsMovementOpen(true); }} disabled={!canDo("partner:add_transaction")}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Mark partner paid
          </Button>
          <Button size="sm" onClick={() => { resetMovementForm(); setIsMovementOpen(true); }}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Record Transaction
          </Button>
          <Button size="sm" variant="outline" onClick={openEditPartner}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit profile
          </Button>
        </div>
      </StickyPageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Partner Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-primary">{partner.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="font-mono">{partner.phone}</span>
                  {partner.email && <span>• {partner.email}</span>}
                </p>
              </div>
              
              {partner.address && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Address</p>
                  <p className="text-sm">{partner.address}</p>
                </div>
              )}

              {partner.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Basic Details</p>
                  <p className="text-sm italic">{partner.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{partner.createdAt}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Settlement summary (by project)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {linkedProjects.map((lp) => (
                  <div
                    key={lp.project.id}
                    className="flex flex-col gap-2 border-b border-border/60 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link to={`/projects/${lp.project.id}`} className="min-w-0 flex-1 hover:bg-muted/30 sm:rounded-md sm:px-1 sm:py-0.5">
                      <p className="text-sm font-medium">{lp.project.name}</p>
                      <p className="text-2xs text-muted-foreground uppercase tracking-tight">
                        {lp.projectPartner?.partnerType ?? lp.project.projectKind?.replace(/_/g, " ").toLowerCase() ?? "partner"}
                      </p>
                      {lp.projectPartner && partnerEconomicsWarningMessage(lp.projectPartner) && (
                        <p className="text-2xs text-amber-600 mt-1">{partnerEconomicsWarningMessage(lp.projectPartner)}</p>
                      )}
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <p className="text-sm font-semibold text-primary">Earned {formatINR(lp.earned)}</p>
                        <p className="text-2xs text-muted-foreground">Paid: {formatINR(lp.paid)}</p>
                        <p className="text-2xs text-muted-foreground">Balance due: {formatINR(lp.pending)}</p>
                        {lp.projectPartner?.partnerType === "profit" && lp.projectPartner.sharePercentage != null && (
                          <p className="text-2xs text-muted-foreground">Share {lp.projectPartner.sharePercentage}%</p>
                        )}
                      </div>
                      {lp.projectPartner?.partnerType === "profit" && canDo("project:update_commercial") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0"
                          onClick={() =>
                            setShareEdit({
                              project: lp.project,
                              projectPartner: lp.projectPartner!,
                              value: String(lp.projectPartner!.sharePercentage ?? ""),
                            })
                          }
                        >
                          Edit %
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {linkedProjects.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground italic">
                    No projects linked yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Transaction Ledger</CardTitle>
              <Badge variant="outline" className="font-normal">{sortedTxns.length} entries</Badge>
            </CardHeader>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(txnPageSize)}
                scrollResetKey={`${safePage}-${txnPageSize}-${sortedTxns.length}`}
                footer={
                  <TablePaginationBar
                    page={safePage}
                    pageSize={txnPageSize}
                    total={sortedTxns.length}
                    onPageChange={setTxnPage}
                    onPageSizeChange={(next) => {
                      setTxnPageSize(next);
                      setTxnPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Date</TableHead>
                    <TableHead>Type / Direction</TableHead>
                    <TableHead>Linked Project</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>{txn.date}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium">{txn.type}</p>
                          <Badge
                            variant={txn.direction === "given" ? "destructive" : "outline"}
                            className="text-[9px] h-4 px-1 uppercase"
                          >
                            {txn.direction === "given" ? "Paid Out" : "Received"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {txn.projectId ? projects.find(p => p.id === txn.projectId)?.name || txn.projectId : "-"}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${txn.direction === "given" ? "text-destructive" : "text-emerald-600"}`}>
                        {txn.direction === "given" ? "-" : "+"}{formatINR(txn.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTxnId(txn.id)}
                          disabled={!canDo("partner:delete")}
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedTxns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <ListEmptyState
                          icon={Receipt}
                          title="No transactions yet"
                          description="Settlement movements for this partner will appear here."
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </DataTableShell>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit partner</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={peName} onChange={(e) => setPeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={pePhone} onChange={(e) => setPePhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={peEmail} onChange={(e) => setPeEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={peAddress} onChange={(e) => setPeAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Partner type</Label>
              <Select value={peType} onValueChange={(v) => setPeType(v as PartnerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {partnerTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default rate / kW (₹, optional)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={peDefaultRatePerKw}
                onChange={(e) => setPeDefaultRatePerKw(e.target.value)}
                placeholder="Leave blank if not used"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={peNotes} onChange={(e) => setPeNotes(e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setIsEditPartnerOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={savePartnerProfile}>
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!shareEdit} onOpenChange={(open) => { if (!open) setShareEdit(null); }}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit profit share</SheetTitle>
          </SheetHeader>
          {shareEdit && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Project: <span className="font-medium text-foreground">{shareEdit.project.name}</span>
              </p>
              <div className="space-y-2">
                <Label>Profit share (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={shareEdit.value}
                  onChange={(e) => setShareEdit({ ...shareEdit, value: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShareEdit(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveProjectProfitShare}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={isMovementOpen} onOpenChange={(v) => { if(!v) { resetMovementForm(); setMovementProjectId(linkedProjects[0]?.project.id ?? ""); } setIsMovementOpen(v); }}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader className="p-6 bg-primary/5 border-b">
            <SheetTitle>Record Transaction</SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={movementType} onValueChange={(value) => setMovementType(value as PartnerTransaction["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transactionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input type="number" value={movementAmount} onChange={(event) => setMovementAmount(event.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Link to Project (Optional)</Label>
              <Select value={movementProjectId || "_none"} onValueChange={(value) => setMovementProjectId(value === "_none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No specific project</SelectItem>
                  {linkedProjects.map(({ project }) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes / Reference</Label>
              <Input value={movementNotes} onChange={(event) => setMovementNotes(event.target.value)} placeholder="e.g., Cash payment, Bank ref, etc." />
            </div>
          </div>
          <div className="p-6 bg-muted/20 border-t flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsMovementOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => submitMovement()}>
              Save Transaction
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={overpayDialogOpen} onOpenChange={setOverpayDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exceeds pending balance</AlertDialogTitle>
            <AlertDialogDescription>{overpayMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => submitMovement({ skipOverpayCheck: true })}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTxnId} onOpenChange={(open) => { if (!open) setDeleteTxnId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The transaction record will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTxnId) { deletePartnerTransaction(deleteTxnId); setDeleteTxnId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default PartnerDetail;

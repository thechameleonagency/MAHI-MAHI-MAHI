import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import {
  calculateProjectPartnerEarning,
  calculateProjectProfit,
  calculateProjectVendorshipFee,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,
  partnerProjectLabel,
} from "@/domain/partners/derivePartnerEconomics";
import type { PartnerTransaction } from "@/types/finance";

const formatCurrency = (amount: number) => `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;

const transactionOptions: PartnerTransaction["type"][] = [
  "Given to Partner",
  "Received from Partner",
  "Customer Paid Partner",
  "Vendorship Fee",
];

const PartnerDetail = () => {
  const { id } = useParams();
  const {
    addPartnerTransaction,
    generateId,
    getPartnerById,
    getTransactionsByPartner,
    partnerTransactions,
    projects,
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

  const linkedProjects = useMemo(() => {
    if (!id) return [];
    return projects
      .map((project) => {
        const projectPartner = project.partners?.find((row) => row.partnerId === id);
        if (!projectPartner) return null;
        
        const projectTxns = partnerTransactions.filter((txn) => txn.partnerId === id && txn.projectId === project.id);
        const earned = calculateProjectPartnerEarning(project, projectPartner);
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
      .filter(Boolean) as any[];
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
    setMovementProjectId(linkedProjects[0]?.project.id ?? "");
    setMovementNotes("");
  };

  const submitMovement = () => {
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
    setIsMovementOpen(false);
    toast({ title: "Transaction recorded", description: `${movementType}: ${formatCurrency(amount)}` });
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
              { label: "Total Earned", value: formatCurrency(totals.earned) },
              { label: "Total Paid", value: formatCurrency(totals.paid) },
              { label: "Pending amount", value: formatCurrency(totals.pending) },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/partners">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button size="sm" onClick={() => { resetMovementForm(); setIsMovementOpen(true); }}>
            <IndianRupee className="mr-2 h-4 w-4" />
            Record Transaction
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
              <CardTitle className="text-sm font-semibold uppercase tracking-wider">Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {linkedProjects.map((lp) => (
                  <Link 
                    key={lp.project.id} 
                    to={`/projects/${lp.project.id}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{lp.project.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{lp.projectPartner.partnerType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{formatCurrency(lp.earned)}</p>
                      <p className="text-[10px] text-muted-foreground">Pending: {formatCurrency(lp.pending)}</p>
                    </div>
                  </Link>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTxns.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell >{txn.date}</TableCell>
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
                        {txn.direction === "given" ? "-" : "+"}{formatCurrency(txn.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sortedTxns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground italic">
                        No transactions recorded for this partner.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </DataTableShell>
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={isMovementOpen} onOpenChange={(v) => { if(!v) resetMovementForm(); setIsMovementOpen(v); }}>
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
            <Button className="flex-1" onClick={submitMovement}>
              Save Transaction
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default PartnerDetail;

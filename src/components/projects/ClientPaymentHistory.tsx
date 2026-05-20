import { useMemo, useState, useEffect } from "react";
import { Plus, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ClientPaymentRecord } from "@/types/blockage";
import { formatINR } from "@/lib/formatCurrency";
import { formatUiDate } from "@/lib/formatUiDate";

interface ClientPaymentHistoryProps {
  projectId: string;
  clientName: string;
  contractAmount: number;
  payments: ClientPaymentRecord[];
  onRecordPayment: (payment: Omit<ClientPaymentRecord, "id" | "recordedAt">) => void;
  /** External partner name for labels when settlement is partner/split */
  partnerName?: string;
  /** When true, client cash cannot be recorded as received by partner or split (company-only). */
  forbidPartnerSettlement?: boolean;
}

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "imps", label: "IMPS" },
];

const RECIPIENT_OPTIONS = [
  { value: "company", label: "Company (MSS)" },
  { value: "partner", label: "Partner" },
  { value: "split", label: "Split (company + partner)" },
] as const;

const STAGE_OPTIONS = [
  { value: "advance", label: "Advance" },
  { value: "milestone", label: "Milestone" },
  { value: "completion", label: "Completion" },
  { value: "loan_release", label: "Loan release" },
  { value: "other", label: "Other" },
];

export function ClientPaymentHistory({
  projectId,
  clientName,
  contractAmount,
  payments,
  onRecordPayment,
  partnerName,
  forbidPartnerSettlement,
}: ClientPaymentHistoryProps) {
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [settlementRecipient, setSettlementRecipient] = useState<"company" | "partner" | "split">("company");
  const [splitCompany, setSplitCompany] = useState("");
  const [splitPartner, setSplitPartner] = useState("");
  const [paymentStage, setPaymentStage] = useState<string>("other");

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = contractAmount - totalReceived;

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [payments],
  );

  /** Oldest → newest cumulative received (B2.17 running total). */
  const cumulativeByPaymentId = useMemo(() => {
    const asc = [...sortedPayments].reverse();
    let cum = 0;
    const map = new Map<string, number>();
    for (const p of asc) {
      cum += p.amount;
      map.set(p.id, cum);
    }
    return map;
  }, [sortedPayments]);
  const [payPage, setPayPage] = useState(1);
  const [paySize, setPaySize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: pagedPayments, safePage: safePayPage } = usePagedSlice(sortedPayments, payPage, paySize);

  useEffect(() => {
    setPayPage(1);
  }, [payments.length]);

  const recipientOptions = useMemo(
    () => (forbidPartnerSettlement ? RECIPIENT_OPTIONS.filter((o) => o.value === "company") : [...RECIPIENT_OPTIONS]),
    [forbidPartnerSettlement],
  );

  useEffect(() => {
    if (forbidPartnerSettlement && settlementRecipient !== "company") {
      setSettlementRecipient("company");
    }
  }, [forbidPartnerSettlement, settlementRecipient]);

  const entryAmountNum = Number.parseFloat(paymentAmount);
  const previewCollected =
    Number.isFinite(entryAmountNum) && entryAmountNum > 0 ? totalReceived + entryAmountNum : totalReceived;
  const previewPending = contractAmount - previewCollected;

  const handleRecordPayment = () => {
    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (!paymentMode) {
      toast({ title: "Error", description: "Please select a payment mode", variant: "destructive" });
      return;
    }
    if (forbidPartnerSettlement && (settlementRecipient === "partner" || settlementRecipient === "split")) {
      toast({
        title: "Not allowed",
        description: "Partner or split settlement is disabled for this project kind.",
        variant: "destructive",
      });
      return;
    }

    if (totalReceived + amount > contractAmount + 0.01) {
      toast({
        title: "Over contract",
        description: `Recorded payments (${formatINR(totalReceived)}) plus this entry (${formatINR(amount)}) exceed the contract (${formatINR(contractAmount)}). Adjust the amount or contract.`,
        variant: "destructive",
      });
      return;
    }

    let splitLines: ClientPaymentRecord["splitLines"];
    const stage = paymentStage as ClientPaymentRecord["paymentStage"];

    if (settlementRecipient === "split") {
      const ca = Number.parseFloat(splitCompany);
      const pa = Number.parseFloat(splitPartner);
      if (!Number.isFinite(ca) || ca < 0 || !Number.isFinite(pa) || pa < 0) {
        toast({ title: "Error", description: "Enter valid split amounts for company and partner.", variant: "destructive" });
        return;
      }
      const sum = ca + pa;
      if (Math.abs(sum - amount) > 0.01) {
        toast({
          title: "Error",
          description: `Split amounts must equal total (${amount}).`,
          variant: "destructive",
        });
        return;
      }
      splitLines = [
        { recipient: "company", amount: ca },
        { recipient: "partner", amount: pa },
      ];
    }

    onRecordPayment({
      projectId,
      date: paymentDate,
      amount,
      paymentMode: paymentMode as ClientPaymentRecord["paymentMode"],
      reference: paymentReference || undefined,
      notes: paymentNotes || undefined,
      settlementRecipient,
      ...(splitLines ? { splitLines } : {}),
      ...(stage ? { paymentStage: stage } : {}),
    });

    // Reset form
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentAmount("");
    setPaymentMode("");
    setPaymentReference("");
    setPaymentNotes("");
    setSettlementRecipient("company");
    setSplitCompany("");
    setSplitPartner("");
    setPaymentStage("other");
    setIsRecordPaymentOpen(false);

    toast({ title: "Payment Recorded", description: `${formatINR(amount)} received from ${clientName}` });
  };

  const getPaymentModeLabel = (mode: string) => {
    return PAYMENT_MODES.find(m => m.value === mode)?.label || mode;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Collections (customer payments)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Who received funds, when, and how much — separate from MSS→customer invoicing. Source: {clientName}
          </p>
        </div>
        <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Contract Amount</p>
            <p className="text-lg font-semibold">{formatINR(contractAmount)}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-lg font-semibold text-primary">{formatINR(totalReceived)}</p>
          </div>
          <div className={`p-3 rounded-lg ${pendingAmount > 0 ? 'bg-warning/10' : 'bg-primary/10'}`}>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className={`text-lg font-semibold ${pendingAmount > 0 ? 'text-warning' : 'text-primary'}`}>
              {formatINR(pendingAmount)}
            </p>
          </div>
        </div>

        {/* Payments Table */}
        {payments.length > 0 ? (
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(paySize)}
            scrollResetKey={`${safePayPage}-${paySize}-${sortedPayments.length}`}
            footer={
              <TablePaginationBar
                page={safePayPage}
                pageSize={paySize}
                total={sortedPayments.length}
                onPageChange={setPayPage}
                onPageSizeChange={(n) => {
                  setPaySize(n);
                  setPayPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Cumulative</TableHead>
                <TableHead>Received by</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatUiDate(payment.date)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {formatINR(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatINR(cumulativeByPaymentId.get(payment.id) ?? 0)}
                  </TableCell>
                  <TableCell >
                    {payment.settlementRecipient === "split" && payment.splitLines?.length
                      ? payment.splitLines
                          .map((l) =>
                            `${l.recipient === "company" ? "Co." : partnerName || "Partner"} ${formatINR(l.amount)}`,
                          )
                          .join(" · ")
                      : payment.settlementRecipient === "partner"
                        ? partnerName || "Partner"
                        : "Company (MSS)"}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs capitalize text-muted-foreground">
                      {payment.paymentStage?.replace("_", " ") ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {getPaymentModeLabel(payment.paymentMode)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.reference || "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {payment.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <IndianRupee className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No payments recorded yet</p>
            <Button variant="link" className="mt-2" onClick={() => setIsRecordPaymentOpen(true)}>
              Record first payment
            </Button>
          </div>
        )}
      </CardContent>

      {/* Record Payment Modal */}
      <Sheet open={isRecordPaymentOpen} onOpenChange={(v) => { if (!v) { setSplitCompany(""); setSplitPartner(""); } setIsRecordPaymentOpen(v); }}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg mb-4">
              <p className="text-sm">
                <strong>Client:</strong> {clientName}
              </p>
              <p className="text-sm text-muted-foreground">
                Pending: {formatINR(pendingAmount)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                {Number.isFinite(entryAmountNum) && entryAmountNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    After save: {formatINR(previewCollected)} collected · {formatINR(Math.max(0, previewPending))} pending
                    {previewCollected > contractAmount + 0.01 && (
                      <span className="block text-destructive mt-1">Over contract — adjust amount or contract.</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Who receives funds *</Label>
                <Select
                  value={settlementRecipient}
                  onValueChange={(v) => setSettlementRecipient(v as "company" | "partner" | "split")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {recipientOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                        {o.value === "partner" && partnerName ? ` (${partnerName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment stage</Label>
                <Select value={paymentStage} onValueChange={setPaymentStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {settlementRecipient === "split" && (
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-dashed bg-muted/20">
                <div className="space-y-2">
                  <Label>Company portion (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={splitCompany}
                    onChange={(e) => setSplitCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Partner portion (₹){partnerName ? ` — ${partnerName}` : ""}</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={splitPartner}
                    onChange={(e) => setSplitPartner(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="Cheque no., Transaction ID, etc."
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsRecordPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </Card>
  );
}

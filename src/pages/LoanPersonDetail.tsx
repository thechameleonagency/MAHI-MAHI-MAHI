import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, IndianRupee, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Loan, LoanRepayment } from "@/types/finance";
import type { LoanRepaymentCashLinkInput } from "@/lib/loanRepaymentCashLink";
import { calculateEMI } from "@/lib/emiCalc";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { formatINR } from "@/lib/formatCurrency";
import { validateContactPhone } from "@/lib/phoneValidators";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { normalizeLoanPersonKey } from "@/lib/loanPerson";

const LoanPersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // `id` is whatever key the list passed (now `normalizeLoanPersonKey(loan)`); fall back to legacy raw-name match.
  const personKey = decodeURIComponent(id || "");
  const personName = personKey;
  
  const { loans, loanRepayments, addLoan, addLoanRepayment, updateLoan, generateId, projects } = useAppData();
  
  // Filter loans for this person — prefer the normalised key but tolerate legacy name-based URLs.
  const personLoans = loans.filter(l =>
    normalizeLoanPersonKey(l) === personKey ||
    l.source === personName ||
    (l as { personName?: string }).personName === personName ||
    (l as { borrowerName?: string }).borrowerName === personName
  );
  const personRepayments = loanRepayments.filter(r => 
    personLoans.some(l => l.id === r.loanId)
  );

  const [loansPage, setLoansPage] = useState(1);
  const [loansPageSize, setLoansPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [repayPage, setRepayPage] = useState(1);
  const [repayPageSize, setRepayPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const { pagedItems: pagedPersonLoans, safePage: safeLoansPage } = usePagedSlice(
    personLoans,
    loansPage,
    loansPageSize,
  );
  const { pagedItems: pagedRepayments, safePage: safeRepayPage } = usePagedSlice(
    personRepayments,
    repayPage,
    repayPageSize,
  );

  // State
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<typeof personLoans[0] | null>(null);
  
  // Loan form state
  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanInterestRate, setLoanInterestRate] = useState("");
  const [loanEmi, setLoanEmi] = useState("");
  const [loanTenure, setLoanTenure] = useState("");
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanNotes, setLoanNotes] = useState("");
  const [loanPersonContact, setLoanPersonContact] = useState("");

  // Repayment form state
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [repaymentPrincipal, setRepaymentPrincipal] = useState("");
  const [repaymentInterest, setRepaymentInterest] = useState("");
  const [repaymentNotes, setRepaymentNotes] = useState("");
  const [repaymentCashLink, setRepaymentCashLink] = useState<LoanRepaymentCashLinkInput["type"]>("payment");
  const [repaymentPaymentMode, setRepaymentPaymentMode] = useState("Bank Transfer");

  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [elStatus, setElStatus] = useState<Loan["status"]>("Active");
  const [elReminderNotes, setElReminderNotes] = useState("");

  const openEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setElStatus(loan.status);
    setElReminderNotes(loan.reminderNotes ?? "");
    setIsEditLoanOpen(true);
  };

  const saveLoanEdits = () => {
    if (!editingLoan) return;
    updateLoan(editingLoan.id, {
      status: elStatus,
      reminderNotes: elReminderNotes.trim() || undefined,
    });
    toast({ title: "Loan updated", description: `${editingLoan.id} saved.` });
    setIsEditLoanOpen(false);
    setEditingLoan(null);
  };
  
  // Calculate totals
  const totalPrincipal = personLoans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = personLoans.reduce((sum, l) => sum + l.outstanding, 0);
  const totalRepaid = totalPrincipal - totalOutstanding;
  const totalEmi = personLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const activeCount = personLoans.filter(l => l.status === "Active").length;
  const allLoansClosed = personLoans.length > 0 && personLoans.every((l) => l.status === "Closed");
  
  // Extract person name from source (e.g., "Personal - Ramesh Kumar" -> "Ramesh Kumar")
  const displayName = personName.replace(/^(Personal|Person)\s*-\s*/i, '').trim();
  
  const suggestedEmi = useMemo(() => {
    const p = Number.parseFloat(loanPrincipal);
    const r = Number.parseFloat(loanInterestRate);
    const pp = Number.isFinite(p) ? p : 0;
    const rr = Number.isFinite(r) ? r : 0;
    const n = parseInt(loanTenure, 10) || 0;
    if (pp <= 0 || n <= 0) return 0;
    return calculateEMI(pp, rr, n);
  }, [loanPrincipal, loanInterestRate, loanTenure]);

  const handleApplySuggestedEmi = () => {
    if (suggestedEmi > 0) setLoanEmi(String(suggestedEmi));
  };

  const handleAddLoan = () => {
    const principal = Number.parseFloat(loanPrincipal);
    const rate = Number.parseFloat(loanInterestRate);
    const tenure = parseInt(loanTenure, 10);
    if (!Number.isFinite(principal) || principal <= 0) {
      toast({ title: "Invalid principal", description: "Enter a positive loan amount.", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      toast({ title: "Invalid rate", description: "Interest rate cannot be negative.", variant: "destructive" });
      return;
    }
    if (!tenure || tenure <= 0) {
      toast({ title: "Invalid tenure", description: "Tenure must be a positive number of months.", variant: "destructive" });
      return;
    }
    const emiRaw = Number.parseFloat(loanEmi);
    const emiVal = Number.isFinite(emiRaw) && emiRaw > 0 ? emiRaw : suggestedEmi || calculateEMI(principal, rate, tenure);
    if (!Number.isFinite(emiVal) || emiVal <= 0) {
      toast({ title: "Invalid EMI", description: "Enter EMI or use Calculate EMI.", variant: "destructive" });
      return;
    }
    const contactTrim = loanPersonContact.trim();
    if (contactTrim) {
      const pc = validateContactPhone(contactTrim);
      if (!pc.ok) {
        toast({ title: "Invalid contact phone", description: (pc as { message: string }).message, variant: "destructive" });
        return;
      }
    }
    const loanId = generateId("LN");
    const newLoan: Loan = {
      id: loanId,
      source: personName,
      sourceType: "person",
      personName: displayName || personName,
      principal,
      interestRate: rate,
      paymentType: "emi",
      emiAmount: Math.round(emiVal),
      tenure,
      startDate: loanStartDate,
      outstanding: principal,
      status: "Active",
      reminderNotes: loanNotes.trim() || undefined,
      personContact: contactTrim || undefined,
    };
    addLoan(newLoan);
    toast({ title: "Loan added", description: `${formatINR(principal)} booked for ${displayName || personName}.` });
    setIsAddLoanOpen(false);
    setLoanPrincipal("");
    setLoanInterestRate("");
    setLoanEmi("");
    setLoanTenure("");
    setLoanNotes("");
    setLoanPersonContact("");
  };

  const handleAddRepayment = () => {
    if (!selectedLoan) return;
    const ppRaw = Number.parseFloat(repaymentPrincipal);
    const ipRaw = Number.parseFloat(repaymentInterest);
    const pp = Number.isFinite(ppRaw) && ppRaw >= 0 ? ppRaw : 0;
    const ip = Number.isFinite(ipRaw) && ipRaw >= 0 ? ipRaw : 0;
    const total = pp + ip;
    if (total <= 0) {
      toast({ title: "Invalid repayment", description: "Enter principal and/or interest paid.", variant: "destructive" });
      return;
    }
    if (pp > selectedLoan.outstanding + 0.01) {
      toast({
        title: "Principal too high",
        description: `Outstanding principal is ${formatINR(selectedLoan.outstanding)}.`,
        variant: "destructive",
      });
      return;
    }
    const prevEmis = loanRepayments.filter((r) => r.loanId === selectedLoan.id);
    const emiNumber = (prevEmis.reduce((m, r) => Math.max(m, r.emiNumber), 0) || 0) + 1;
    const repayment: LoanRepayment = {
      id: generateId("LR"),
      loanId: selectedLoan.id,
      loanSource: selectedLoan.source,
      date: repaymentDate,
      emiNumber,
      principalPaid: pp,
      interestPaid: ip,
      totalPaid: total,
    };
    const cashLink: LoanRepaymentCashLinkInput =
      repaymentCashLink === "payment"
        ? { type: "payment", paymentMode: repaymentPaymentMode }
        : repaymentCashLink === "expense"
          ? { type: "expense" }
          : { type: "none" };
    addLoanRepayment(repayment, cashLink);
    toast({
      title: "Repayment recorded",
      description:
        cashLink.type === "none"
          ? `${formatINR(total)} on loan schedule.`
          : `${formatINR(total)} linked to ${cashLink.type === "payment" ? "payments" : "expenses"}.`,
    });
    setIsRepaymentOpen(false);
    setRepaymentPrincipal("");
    setRepaymentInterest("");
    setRepaymentNotes("");
    setSelectedLoan(null);
  };

  if (personLoans.length === 0) {
    return (
      <div className="space-y-6 px-2 md:px-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Button>
          <p className="text-xl font-semibold text-foreground">Loan source not found</p>
        </div>
        <Card className="bg-card">
          <CardContent>
            <ListEmptyState
              icon={IndianRupee}
              title={`No loans for "${personName}"`}
              actionLabel="Back to loans"
              onAction={() => navigate(-1)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageShell className="space-y-6 px-2 md:px-0">
      {/* Breadcrumb */}
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Finance", to: "/finance" },
          { label: "Loans", to: "/loans" },
          { label: displayName },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full justify-start sm:justify-end"
            items={[
              { label: "Borrowed", value: formatINR(totalPrincipal) },
              { label: "Outstanding", value: formatINR(totalOutstanding) },
              { label: "Repaid", value: formatINR(totalRepaid) },
              { label: "Monthly EMI", value: formatINR(totalEmi) },
            ]}
          />
        }
      >
        <Button variant="outline" onClick={() => setIsAddLoanOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {formPrimaryLabel("create", "loan")}
        </Button>
      </StickyPageHeader>

      {allLoansClosed && (
        <LifecycleTerminalBanner
          variant="completed"
          title="All loans closed"
          description={
            <span>
              Every loan for {displayName} is fully repaid or marked closed. Repayment history stays on this page — add a new loan if borrowing resumes.
            </span>
          }
          primaryActionLabel="Add loan"
          onPrimaryAction={() => setIsAddLoanOpen(true)}
        />
      )}

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-accent/20">
          <AvatarFallback className="bg-accent/10 text-lg font-semibold text-accent-foreground">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold text-foreground">{displayName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="border-accent/30 text-accent-foreground">Personal Loan</Badge>
            <StatusBadge
              status={activeCount > 0 ? "active" : "inactive"}
              label={`${activeCount} Active Loan${activeCount !== 1 ? "s" : ""}`}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      {/* Active Loans */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Loans from {displayName}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTableShell
            variant="inline"
            maxHeight={listTableViewportMaxHeight(loansPageSize)}
            scrollResetKey={`${safeLoansPage}-${loansPageSize}-${personLoans.length}`}
            footer={
              <TablePaginationBar
                page={safeLoansPage}
                pageSize={loansPageSize}
                total={personLoans.length}
                onPageChange={setLoansPage}
                onPageSizeChange={(n) => {
                  setLoansPageSize(n);
                  setLoansPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead >Loan ID</TableHead>
                <TableHead >Principal</TableHead>
                <TableHead >Interest Rate</TableHead>
                <TableHead >EMI</TableHead>
                <TableHead >Tenure</TableHead>
                <TableHead >Outstanding</TableHead>
                <TableHead >Start Date</TableHead>
                <TableHead >Funded project</TableHead>
                <TableHead >Status</TableHead>
                <TableHead >Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPersonLoans.map((loan) => {
                const fundedProject = projects.find((p) => p.fundingLoanId === loan.id);
                return (
                <TableRow key={loan.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{loan.id}</TableCell>
                  <TableCell className="text-foreground">{formatINR(loan.principal)}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.interestRate}%</TableCell>
                  <TableCell className="text-primary font-medium">{formatINR(loan.emiAmount)}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.tenure} months</TableCell>
                  <TableCell className="text-destructive font-medium">{formatINR(loan.outstanding)}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.startDate}</TableCell>
                  <TableCell>
                    {fundedProject ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => navigate(`/projects/${fundedProject.id}`)}
                      >
                        {fundedProject.name}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={loan.status} label={loan.status} className="text-xs" />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditLoan(loan)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={loan.status !== "Active"}
                        onClick={() => {
                          setSelectedLoan(loan);
                          setIsRepaymentOpen(true);
                        }}
                      >
                        <IndianRupee className="h-3 w-3 mr-1" />
                        Repay
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </DataTableShell>
        </CardContent>
      </Card>

      {/* Repayment History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Repayment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {personRepayments.length > 0 ? (
            <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(repayPageSize)}
              scrollResetKey={`${safeRepayPage}-${repayPageSize}-${personRepayments.length}`}
              footer={
                <TablePaginationBar
                  page={safeRepayPage}
                  pageSize={repayPageSize}
                  total={personRepayments.length}
                  onPageChange={setRepayPage}
                  onPageSizeChange={(n) => {
                    setRepayPageSize(n);
                    setRepayPage(1);
                  }}
                />
              }
            >
              <TableHeader>
                <TableRow className={dataTableClasses.headRow}>
                  <TableHead >Date</TableHead>
                  <TableHead >Loan ID</TableHead>
                  <TableHead >EMI #</TableHead>
                  <TableHead >Principal</TableHead>
                  <TableHead >Interest</TableHead>
                  <TableHead >Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRepayments.map((rep, idx) => (
                  <TableRow key={idx} className="border-border">
                    <TableCell className="text-muted-foreground">{rep.date}</TableCell>
                    <TableCell className="text-foreground">{rep.loanId}</TableCell>
                    <TableCell className="text-muted-foreground">#{rep.emiNumber}</TableCell>
                    <TableCell className="text-foreground">{formatINR(rep.principalPaid)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatINR(rep.interestPaid)}</TableCell>
                    <TableCell className="text-primary font-medium">{formatINR(rep.totalPaid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          ) : (
            <ListEmptyState density="compact" icon={IndianRupee} title="No repayments recorded yet" />
          )}
        </CardContent>
      </Card>

      {/* Add Loan Modal */}
      <Sheet open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add New Loan from {displayName}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal Amount (₹) *</Label>
                <Input 
                  type="number" 
                  placeholder="100000" 
                  value={loanPrincipal}
                  onChange={(e) => setLoanPrincipal(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={loanInterestRate}
                  onChange={(e) => setLoanInterestRate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>EMI Amount (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="10000"
                    value={loanEmi}
                    onChange={(e) => setLoanEmi(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleApplySuggestedEmi} disabled={!suggestedEmi}>
                    Calc EMI
                  </Button>
                </div>
                {suggestedEmi > 0 && (
                  <p className="text-xs text-muted-foreground">Suggested from principal, rate & tenure: {formatINR(suggestedEmi)}/mo</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tenure (months)</Label>
                <Input 
                  type="number" 
                  placeholder="12" 
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DateInput value={loanStartDate} onChange={(e) => setLoanStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone (optional)</Label>
              <Input
                value={loanPersonContact}
                onChange={(e) => setLoanPersonContact(e.target.value)}
                placeholder="+91 …"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Any notes about this loan..." 
                value={loanNotes}
                onChange={(e) => setLoanNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddLoanOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary text-primary-foreground"
              onClick={handleAddLoan}
              disabled={!loanPrincipal}
            >
              {formPrimaryLabel("create", "loan")}
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Add Repayment Modal */}
      <Sheet open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Record Repayment</SheetTitle>
          </SheetHeader>
          {selectedLoan && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Loan ID: <span className="font-medium text-foreground">{selectedLoan.id}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Outstanding: <span className="font-medium text-destructive">{formatINR(selectedLoan.outstanding)}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <DateInput value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Principal Paid (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={repaymentPrincipal}
                    onChange={(e) => setRepaymentPrincipal(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Paid (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={repaymentInterest}
                    onChange={(e) => setRepaymentInterest(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total Repayment</p>
                <p className="text-xl font-semibold text-primary">
                  {formatINR(
                    (Number.isFinite(Number.parseFloat(repaymentPrincipal))
                      ? Math.max(0, Number.parseFloat(repaymentPrincipal))
                      : 0) +
                      (Number.isFinite(Number.parseFloat(repaymentInterest))
                        ? Math.max(0, Number.parseFloat(repaymentInterest))
                        : 0),
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  placeholder="Any notes..." 
                  value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Cash link</Label>
                <Select
                  value={repaymentCashLink}
                  onValueChange={(v) => setRepaymentCashLink(v as LoanRepaymentCashLinkInput["type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Bank / cash payment</SelectItem>
                    <SelectItem value="expense">Company expense</SelectItem>
                    <SelectItem value="none">Schedule only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {repaymentCashLink === "payment" && (
                <div className="space-y-2">
                  <Label>Payment mode</Label>
                  <Select value={repaymentPaymentMode} onValueChange={setRepaymentPaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsRepaymentOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary text-primary-foreground"
              onClick={handleAddRepayment}
              disabled={!repaymentPrincipal && !repaymentInterest}
            >
              Record Repayment
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      <Sheet open={isEditLoanOpen} onOpenChange={(o) => { if (!o) { setEditingLoan(null); } setIsEditLoanOpen(o); }}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Edit loan</SheetTitle>
          </SheetHeader>
          {editingLoan && (
            <div className="mt-4 space-y-4 py-2">
              <p className="text-sm text-muted-foreground font-mono">{editingLoan.id}</p>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={elStatus} onValueChange={(v) => setElStatus(v as Loan["status"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reminder notes</Label>
                <Textarea value={elReminderNotes} onChange={(e) => setElReminderNotes(e.target.value)} rows={3} placeholder="Optional" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditLoanOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveLoanEdits}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default LoanPersonDetail;

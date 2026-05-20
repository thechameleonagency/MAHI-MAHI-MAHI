import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, CreditCard, IndianRupee, Calendar, Building2, User, Clock, Bell, AlertCircle, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import type { Loan, LoanRepayment } from "@/types/finance";
import { emiComponents } from "@/lib/emiCalc";
import { isLoanEmiDueWithinDays, isLoanEmiOverdue } from "@/lib/loanEmiDue";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/formatCurrency";
import { normalizeLoanPersonKey } from "@/lib/loanPerson";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { parseISO, format, isValid } from "date-fns";
import { downloadCSV } from "@/lib/csvExport";
import { validateContactPhone } from "@/lib/phoneValidators";
import { useCan } from "@/hooks/useCan";
import { AgingChip } from "@/components/ui/AgingChip";
import { getLoanOverdueAging, loanDaysOverdue } from "@/lib/agingHelpers";

function lastLoanRepaymentDate(loanId: string, repayments: LoanRepayment[]): string | null {
  const dates = repayments.filter((r) => r.loanId === loanId).map((r) => r.date);
  if (!dates.length) return null;
  return dates.reduce((a, b) => (a > b ? a : b));
}

const Loans = () => {
  const { loans, loanRepayments, addLoan, addLoanRepayment, deleteLoanRepayment, updateLoan, generateId } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateLoan = useCan("loan", "create");
  const canEditLoan = useCan("loan", "edit");
  const canDeleteLoan = useCan("loan", "delete");
  const canDeleteRepayment = useCan("loanRepayment", "delete");

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "all");
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get("type") ?? "all");
  const [emiFilter, setEmiFilter] = useState<"all" | "due7d" | "overdue">(() => {
    const emi = searchParams.get("emi");
    return emi === "due7d" || emi === "overdue" ? emi : "all";
  });
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setListReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const q = searchQuery.trim();
        if (q) next.set("q", q);
        else next.delete("q");
        if (statusFilter !== "all") next.set("status", statusFilter);
        else next.delete("status");
        if (typeFilter !== "all") next.set("type", typeFilter);
        else next.delete("type");
        if (emiFilter !== "all") next.set("emi", emiFilter);
        else next.delete("emi");
        return next;
      },
      { replace: true },
    );
  }, [searchQuery, statusFilter, typeFilter, emiFilter, setSearchParams]);
  
  // Modal state
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [isEditLoanOpen, setIsEditLoanOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [editLoanEmiAmount, setEditLoanEmiAmount] = useState("");
  const [editLoanTenure, setEditLoanTenure] = useState("");
  const [editLoanInterest, setEditLoanInterest] = useState("");
  const [editLoanReminderDate, setEditLoanReminderDate] = useState("");
  const [editLoanReminderNotes, setEditLoanReminderNotes] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleLoan, setScheduleLoan] = useState<Loan | null>(null);
  const [forceCloseLoan, setForceCloseLoan] = useState<Loan | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [deleteRepaymentId, setDeleteRepaymentId] = useState<string | null>(null);
  
  // Form state
  const [loanSourceType, setLoanSourceType] = useState<"bank" | "person" | "partner" | "nbfc" | "other">("bank");
  const [loanPaymentType, setLoanPaymentType] = useState<"emi" | "one-time" | "reminder-only">("emi");
  const [loanSource, setLoanSource] = useState("");
  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanInterestRate, setLoanInterestRate] = useState("");
  const [loanEmi, setLoanEmi] = useState("");
  const [loanTenure, setLoanTenure] = useState("");
  const [loanDueDate, setLoanDueDate] = useState("");
  const [loanReminderDate, setLoanReminderDate] = useState("");
  const [loanReminderNotes, setLoanReminderNotes] = useState("");
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().split('T')[0]);
  /** Optional: number of EMIs the borrower has already paid before this loan was recorded
   *  in the system (lets us back-fill outstanding correctly for in-flight EMI loans). */
  const [loanEmisPaidAlready, setLoanEmisPaidAlready] = useState("");
  /** Optional contact for person/partner (or RM phone); validated when non-empty (V58). */
  const [loanPersonContact, setLoanPersonContact] = useState("");

  // Repayment form
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const todayIso = () => new Date().toISOString().split("T")[0];

  /** Repayment sheet: default date to today each time it opens (avoids stale "yesterday" after midnight). */
  useEffect(() => {
    if (isRepaymentOpen) {
      setRepaymentDate(todayIso());
    }
  }, [isRepaymentOpen]);

  const resetLoanForm = () => {
    setLoanSourceType("bank");
    setLoanPaymentType("emi");
    setLoanSource("");
    setLoanPrincipal("");
    setLoanInterestRate("");
    setLoanEmi("");
    setLoanTenure("");
    setLoanDueDate("");
    setLoanReminderDate("");
    setLoanReminderNotes("");
    setLoanStartDate(todayIso());
    setLoanPersonContact("");
    setLoanEmisPaidAlready("");
  };

  const handleAddLoan = () => {
    if (!loanSource || !loanPrincipal) {
      toast({ title: "Error", description: "Source and principal are required", variant: "destructive" });
      return;
    }

    const t = todayIso();
    if (loanStartDate > t) {
      toast({ title: "Invalid start date", description: "Loan start date cannot be in the future.", variant: "destructive" });
      return;
    }
    if (loanStartDate < "2000-01-01") {
      toast({ title: "Invalid start date", description: "Loan start date is too far in the past.", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "emi" && !loanEmi) {
      toast({ title: "Error", description: "EMI amount is required for EMI loans", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "emi" && (parseInt(loanTenure) || 0) < 1) {
      toast({ title: "Error", description: "Tenure must be at least 1 month", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "one-time" && !loanDueDate) {
      toast({ title: "Error", description: "Due date is required for one-time payment loans", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "one-time" && loanDueDate && loanDueDate < loanStartDate) {
      toast({ title: "Invalid Dates", description: "Due date cannot be earlier than start date.", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "reminder-only" && loanReminderDate && loanReminderDate < loanStartDate) {
      toast({ title: "Invalid Dates", description: "Reminder date cannot be earlier than start date.", variant: "destructive" });
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

    const principalNum = parseFloat(loanPrincipal);
    const emiNum = loanPaymentType === "emi" ? parseFloat(loanEmi) : 0;
    const emisPaidNum = loanPaymentType === "emi" ? Math.max(0, parseInt(loanEmisPaidAlready) || 0) : 0;
    // Back-fill outstanding: principal minus EMIs already paid (clamped to >= 0).
    const computedOutstanding = Math.max(0, principalNum - emisPaidNum * emiNum);

    const newLoan: Loan = {
      id: generateId('L'),
      source: loanSource,
      sourceType: loanSourceType,
      paymentType: loanPaymentType,
      principal: principalNum,
      interestRate: parseFloat(loanInterestRate) || 0,
      emiAmount: emiNum,
      tenure: loanPaymentType === "emi" ? parseInt(loanTenure) || 12 : 0,
      dueDate: loanPaymentType === "one-time" ? loanDueDate : undefined,
      reminderDate: loanPaymentType === "reminder-only" ? loanReminderDate : undefined,
      reminderNotes: loanPaymentType === "reminder-only" ? loanReminderNotes : undefined,
      startDate: loanStartDate,
      emisPaidAlready: emisPaidNum || undefined,
      outstanding: computedOutstanding,
      status: "Active",
      personName: loanSourceType === "person" ? loanSource : undefined,
      personContact: contactTrim || undefined,
    };

    addLoan(newLoan);
    setIsAddLoanOpen(false);
    resetLoanForm();
    toast({ title: "Loan Added", description: `Loan from ${loanSource} has been added` });
  };

  const handleRecordRepayment = () => {
    if (!selectedLoan || !repaymentAmount) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }

    const t = todayIso();
    if (repaymentDate > t) {
      toast({ title: "Invalid date", description: "Repayment date cannot be in the future.", variant: "destructive" });
      return;
    }
    if (selectedLoan.startDate && repaymentDate < selectedLoan.startDate) {
      toast({ title: "Invalid date", description: "Repayment cannot be before the loan start date.", variant: "destructive" });
      return;
    }

    const amount = parseFloat(repaymentAmount);
    const emiCount = loanRepayments.filter(r => r.loanId === selectedLoan.id).length + 1;

    let principalPaid: number;
    let interestPaid: number;
    if (
      selectedLoan.paymentType === "emi" &&
      selectedLoan.tenure > 0 &&
      selectedLoan.interestRate > 0
    ) {
      const { principalComponent, interestComponent } = emiComponents(
        selectedLoan.principal,
        selectedLoan.interestRate,
        selectedLoan.tenure,
        emiCount,
      );
      const scheduledTotal = principalComponent + interestComponent;
      const paysScheduledEmi =
        Math.abs(amount - selectedLoan.emiAmount) < 1.5 ||
        Math.abs(amount - scheduledTotal) < 1.5;
      if (paysScheduledEmi && scheduledTotal > 0) {
        const scale = amount / scheduledTotal;
        principalPaid = Math.round(principalComponent * scale * 100) / 100;
        interestPaid = Math.round((amount - principalPaid) * 100) / 100;
      } else {
        const r = selectedLoan.interestRate / 12 / 100;
        interestPaid = Math.min(amount, Math.round(selectedLoan.outstanding * r));
        principalPaid = Math.round((amount - interestPaid) * 100) / 100;
      }
      principalPaid = Math.min(principalPaid, selectedLoan.outstanding);
    } else {
      principalPaid = Math.min(amount, selectedLoan.outstanding);
      interestPaid = Math.round((amount - principalPaid) * 100) / 100;
    }

    const repayment: LoanRepayment = {
      id: generateId('REP'),
      loanId: selectedLoan.id,
      loanSource: selectedLoan.source,
      date: repaymentDate,
      emiNumber: emiCount,
      principalPaid,
      interestPaid,
      totalPaid: amount,
    };

    addLoanRepayment(repayment);
    setIsRepaymentOpen(false);
    setRepaymentAmount("");
    toast({ title: "Repayment Recorded", description: `${formatINR(amount)} recorded` });
  };

  const filteredLoans = useMemo(
    () =>
      loans.filter((l) => {
        const matchesSearch = l.source.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || l.status === statusFilter;
        const matchesType = typeFilter === "all" || l.paymentType === typeFilter;
        const matchesEmi =
          emiFilter === "all" ||
          (l.paymentType === "emi" &&
            l.status === "Active" &&
            (emiFilter === "due7d"
              ? isLoanEmiDueWithinDays(l, 7)
              : isLoanEmiOverdue(l)));
        return matchesSearch && matchesStatus && matchesType && matchesEmi;
      }),
    [loans, searchQuery, statusFilter, typeFilter, emiFilter],
  );

  const { pagedItems: pagedLoans, safePage } = usePagedSlice(filteredLoans, tablePage, tablePageSize);

  const exportLoansCsv = () => {
    if (filteredLoans.length === 0) {
      toast({ title: "Nothing to export", description: "Adjust filters first.", variant: "destructive" });
      return;
    }
    downloadCSV(
      `loans-${format(new Date(), "yyyy-MM-dd")}.csv`,
      filteredLoans.map((l) => ({
        id: l.id,
        source: l.source,
        sourceType: l.sourceType,
        status: l.status,
        paymentType: l.paymentType,
        principal: l.principal,
        outstanding: l.outstanding,
        emiAmount: l.emiAmount,
        tenure: l.tenure,
        interestRate: l.interestRate,
        startDate: l.startDate,
        dueDate: l.dueDate ?? "",
        reminderDate: l.reminderDate ?? "",
      })),
      [
        "id",
        "source",
        "sourceType",
        "status",
        "paymentType",
        "principal",
        "outstanding",
        "emiAmount",
        "tenure",
        "interestRate",
        "startDate",
        "dueDate",
        "reminderDate",
      ],
    );
    toast({ title: "Exported", description: "CSV matches the current filtered list." });
  };

  const formatCurrency = (amount: number) => formatINR(amount);

  // Stats - only count EMI loans for monthly EMI calculation
  const totalPrincipal = loans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstanding, 0);
  const monthlyEmi = loans.filter(l => l.status === "Active" && l.paymentType === "emi").reduce((sum, l) => sum + l.emiAmount, 0);
  const activeLoans = loans.filter(l => l.status === "Active").length;

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "bank": return <Building2 className="h-4 w-4" />;
      case "person": return <User className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentTypeDisplay = (loan: Loan) => {
    switch (loan.paymentType) {
      case "emi":
        return <span className="font-medium">{formatCurrency(loan.emiAmount)}/mo</span>;
      case "one-time":
        return (
          <div className="flex items-center gap-1 text-warning">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Due: {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}</span>
          </div>
        );
      case "reminder-only":
        return (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Bell className="h-3 w-3" />
            <span className="text-xs">Reminder</span>
          </div>
        );
      default:
        return '-';
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      emi: "EMI",
      "one-time": "One-Time",
      "reminder-only": "Reminder",
    };
    if (!labels[type]) return null;
    return <StatusBadge status={type} label={labels[type]} className="text-xs" />;
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Loans" }]}
        subRow={
          <div className="flex w-full flex-wrap items-end gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search loans..."
                className="h-9 pl-9 bg-muted/50 border-border"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setTablePage(1); }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setTablePage(1); }}>
              <SelectTrigger className="h-9 w-[130px] bg-muted/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setTablePage(1); }}>
              <SelectTrigger className="h-9 w-[150px] bg-muted/50">
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="emi">EMI</SelectItem>
                <SelectItem value="one-time">One-Time</SelectItem>
                <SelectItem value="reminder-only">Reminder Only</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="ml-auto flex-wrap"
              items={[
                { label: "Active", value: activeLoans },
                { label: "Principal", value: formatCurrency(totalPrincipal) },
                { label: "Outstanding", value: formatCurrency(totalOutstanding) },
                { label: "EMI / mo", value: formatCurrency(monthlyEmi) },
              ]}
            />
          </div>
        }
      >
        <Button size="sm" variant="outline" type="button" onClick={exportLoansCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" onClick={() => { resetLoanForm(); setIsAddLoanOpen(true); }} disabled={!canCreateLoan}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </StickyPageHeader>

      {/* Loans Table */}
      <DataTableShell
        maxHeight={listTableViewportMaxHeight(tablePageSize)}
        scrollResetKey={`${safePage}-${tablePageSize}-${filteredLoans.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={tablePageSize}
            total={filteredLoans.length}
            onPageChange={setTablePage}
            onPageSizeChange={(n) => {
              setTablePageSize(n);
              setTablePage(1);
            }}
          />
        }
      >
        <TableHeader>
          <TableRow className={dataTableClasses.headRow}>
            <TableHead>Source</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Principal</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Payment Info</TableHead>
            <TableHead className="text-right">Outstanding</TableHead>
            <TableHead className="text-right">Days overdue</TableHead>
            <TableHead>Last payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {!listReady ? (
              <ListSkeleton variant="table" count={5} columns={10} />
            ) : pagedLoans.map((loan) => {
              const lastPay = lastLoanRepaymentDate(loan.id, loanRepayments);
              const overdueDays = loanDaysOverdue(loan, loanRepayments);
              const loanAging = getLoanOverdueAging(loan, loanRepayments);
              return (
              <TableRow key={loan.id} className="border-border">
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(loan.sourceType)}
                    <Link
                      to={`/loans/person/${encodeURIComponent(normalizeLoanPersonKey(loan))}`}
                      className="font-medium hover:underline text-foreground hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {loan.source}
                    </Link>
                    {loanAging && <AgingChip signal={loanAging} />}
                  </div>
                </TableCell>
                <TableCell>{getPaymentTypeBadge(loan.paymentType)}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.principal)}</TableCell>
                <TableCell className="text-right">{loan.interestRate > 0 ? `${loan.interestRate}%` : '-'}</TableCell>
                <TableCell className="text-right">{getPaymentTypeDisplay(loan)}</TableCell>
                <TableCell className="text-right text-warning">{formatCurrency(loan.outstanding)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {overdueDays > 0 ? (
                    <span className="font-medium text-destructive">{overdueDays}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lastPay && isValid(parseISO(lastPay)) ? format(parseISO(lastPay), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={loan.status} label={loan.status} className="text-xs" />
                </TableCell>
                <TableCell className="text-right">
                  {loan.status === "Active" && loan.paymentType !== "reminder-only" && canEditLoan && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedLoan(loan);
                        setRepaymentAmount(loan.paymentType === "emi" ? loan.emiAmount.toString() : "");
                        setIsRepaymentOpen(true);
                      }}
                    >
                      <IndianRupee className="h-3 w-3 mr-1" />
                      {loan.paymentType === "emi" ? "Pay EMI" : "Record Payment"}
                    </Button>
                  )}
                  {loan.status === "Active" && loan.paymentType === "reminder-only" && (
                    <span className="text-xs text-muted-foreground italic">View only</span>
                  )}
                  {loan.status === "Active" && loan.outstanding <= 0 && canEditLoan && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-1 text-success border-success/30 hover:bg-success"
                      onClick={() => updateLoan(loan.id, { status: "Closed", outstanding: 0 })}
                    >
                      Close Loan
                    </Button>
                  )}
                  {loan.status === "Active" && canEditLoan && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1"
                      onClick={() => setForceCloseLoan(loan)}
                    >
                      Mark closed
                    </Button>
                  )}
                  {canEditLoan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1"
                    onClick={() => {
                      setEditingLoanId(loan.id);
                      setEditLoanEmiAmount(String(loan.emiAmount));
                      setEditLoanTenure(String(loan.tenure));
                      setEditLoanInterest(String(loan.interestRate));
                      setEditLoanReminderDate(loan.reminderDate ?? "");
                      setEditLoanReminderNotes(loan.reminderNotes ?? "");
                      setIsEditLoanOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  )}
                  {loan.paymentType === "emi" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1"
                      onClick={() => { setScheduleLoan(loan); setIsScheduleOpen(true); }}
                    >
                      EMI schedule
                    </Button>
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
      </DataTableShell>
      {filteredLoans.length === 0 && (
        loans.length === 0 ? (
          <ListEmptyState
            icon={CreditCard}
            title="No loans recorded yet"
            description="Track EMIs, person-to-person borrowings, or NBFC loans here."
            actionLabel="Add your first loan"
            onAction={() => { resetLoanForm(); setIsAddLoanOpen(true); }}
          />
        ) : (
          <ListEmptyState
            icon={CreditCard}
            title="No loans match the current filters"
            description="Adjust the filters or clear them to see all loans."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
              setTablePage(1);
            }}
          />
        )
      )}

      {/* Recent Repayments */}
      {loanRepayments.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Recent Repayments</h3>
            <div className="space-y-2">
              {loanRepayments.slice(0, 5).map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{rep.loanSource}</p>
                    <p className="text-xs text-muted-foreground">#{rep.emiNumber} • {new Date(rep.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{formatCurrency(rep.totalPaid)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => setDeleteRepaymentId(rep.id)}
                      disabled={!canDeleteRepayment}
                      aria-label="Delete repayment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Loan Sheet */}
      <Sheet open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add New Loan</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={loanSourceType} onValueChange={(v) => setLoanSourceType(v as "bank" | "person" | "partner" | "nbfc" | "other")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="nbfc">NBFC</SelectItem>
                  <SelectItem value="person">Personal</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={loanPaymentType} onValueChange={(v) => setLoanPaymentType(v as "emi" | "one-time" | "reminder-only")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emi">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>EMI (Monthly Payments)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="one-time">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>One-Time Payment</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reminder-only">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <span>Reminder Only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {loanPaymentType === "emi" && "Regular monthly EMI payments with tenure tracking"}
                {loanPaymentType === "one-time" && "Single payment due on a specific date"}
                {loanPaymentType === "reminder-only" && "Track amount without monthly payment alerts"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Source Name *</Label>
              <Input value={loanSource} onChange={(e) => setLoanSource(e.target.value)} placeholder="HDFC Bank / Person name" />
            </div>

            <div className="space-y-2">
              <Label>Contact phone (optional)</Label>
              <Input
                value={loanPersonContact}
                onChange={(e) => setLoanPersonContact(e.target.value)}
                placeholder="+91 …"
              />
              <p className="text-xs text-muted-foreground">Validated when filled. Useful for personal/partner loans or bank RM.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Principal *</Label>
                <Input type="number" value={loanPrincipal} onChange={(e) => setLoanPrincipal(e.target.value)} placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate %</Label>
                <Input type="number" value={loanInterestRate} onChange={(e) => setLoanInterestRate(e.target.value)} placeholder="10.5" />
              </div>
            </div>

            {/* EMI-specific fields */}
            {loanPaymentType === "emi" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>EMI Amount *</Label>
                    <Input type="number" value={loanEmi} onChange={(e) => setLoanEmi(e.target.value)} placeholder="10871" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tenure (months)</Label>
                    <Input type="number" min="1" value={loanTenure} onChange={(e) => setLoanTenure(e.target.value)} placeholder="60" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>EMIs already paid (before recording)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={loanEmisPaidAlready}
                    onChange={(e) => setLoanEmisPaidAlready(e.target.value)}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    If the borrower has already paid some EMIs before this loan was entered in the system,
                    enter the count here. Outstanding will be back-filled accordingly.
                  </p>
                </div>
              </>
            )}

            {/* One-time payment fields */}
            {loanPaymentType === "one-time" && (
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" min={loanStartDate || undefined} value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} />
              </div>
            )}

            {/* Reminder-only fields */}
            {loanPaymentType === "reminder-only" && (
              <>
                <div className="space-y-2">
                  <Label>Reminder Date (optional)</Label>
                  <Input type="date" min={loanStartDate || undefined} value={loanReminderDate} onChange={(e) => setLoanReminderDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={loanReminderNotes} onChange={(e) => setLoanReminderNotes(e.target.value)} placeholder="Optional notes about this loan" />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={loanStartDate} onChange={(e) => setLoanStartDate(e.target.value)} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsAddLoanOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddLoan}>Add Loan</Button>
            </div>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Record Repayment Sheet */}
      <Sheet open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>
              {selectedLoan?.paymentType === "emi" ? "Record EMI Payment" : "Record Payment"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Loan: {selectedLoan?.source}</p>
              <p className="font-semibold mt-1">Outstanding: {formatCurrency(selectedLoan?.outstanding || 0)}</p>
              {selectedLoan?.paymentType === "one-time" && selectedLoan?.dueDate && (
                <p className="text-sm text-warning mt-1">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Due: {new Date(selectedLoan.dueDate).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input 
                type="number" 
                value={repaymentAmount} 
                onChange={(e) => setRepaymentAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={repaymentDate} onChange={(e) => setRepaymentDate(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsRepaymentOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRecordRepayment}>Record Payment</Button>
            </div>
          </div>
        </AppSheetContent>
      </Sheet>

      <AlertDialog open={!!deleteRepaymentId} onOpenChange={(open) => { if (!open) setDeleteRepaymentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete repayment?</AlertDialogTitle>
            <AlertDialogDescription>This will reverse the repayment and restore the outstanding balance on the loan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteRepaymentId) { deleteLoanRepayment(deleteRepaymentId); setDeleteRepaymentId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isEditLoanOpen} onOpenChange={(open) => { setIsEditLoanOpen(open); if (!open) setEditingLoanId(null); }}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Edit loan</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>EMI amount</Label>
              <Input value={editLoanEmiAmount} onChange={(e) => setEditLoanEmiAmount(e.target.value)} />
            </div>
            <div>
              <Label>Tenure (months)</Label>
              <Input value={editLoanTenure} onChange={(e) => setEditLoanTenure(e.target.value)} />
            </div>
            <div>
              <Label>Interest rate (%)</Label>
              <Input value={editLoanInterest} onChange={(e) => setEditLoanInterest(e.target.value)} />
            </div>
            <div>
              <Label>Reminder date</Label>
              <Input type="date" value={editLoanReminderDate} onChange={(e) => setEditLoanReminderDate(e.target.value)} />
            </div>
            <div>
              <Label>Reminder notes</Label>
              <Input value={editLoanReminderNotes} onChange={(e) => setEditLoanReminderNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => { setIsEditLoanOpen(false); setEditingLoanId(null); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editingLoanId) return;
                updateLoan(editingLoanId, {
                  emiAmount: Number(editLoanEmiAmount) || 0,
                  tenure: Number(editLoanTenure) || 0,
                  interestRate: Number(editLoanInterest) || 0,
                  reminderDate: editLoanReminderDate || undefined,
                  reminderNotes: editLoanReminderNotes || undefined,
                });
                setIsEditLoanOpen(false);
                setEditingLoanId(null);
              }}
            >
              Save changes
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      <Sheet open={isScheduleOpen} onOpenChange={(open) => { setIsScheduleOpen(open); if (!open) setScheduleLoan(null); }}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>EMI schedule</SheetTitle>
          </SheetHeader>
          {scheduleLoan && (
            <div className="space-y-3 py-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{scheduleLoan.source}</p>
                <p className="text-muted-foreground">
                  Principal {formatINR(scheduleLoan.principal)} · EMI {formatINR(scheduleLoan.emiAmount)} · {scheduleLoan.tenure} months
                </p>
              </div>
              <DataTableShell variant="inline">
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Due date</TableHead>
                    <TableHead className="text-right">EMI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: scheduleLoan.tenure || 0 }).map((_, i) => {
                    const start = scheduleLoan.startDate ? parseISO(scheduleLoan.startDate) : new Date();
                    const due = new Date(start);
                    due.setMonth(due.getMonth() + i + 1);
                    return (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{format(due, "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatINR(scheduleLoan.emiAmount)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTableShell>
            </div>
          )}
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={!!forceCloseLoan}
        onOpenChange={(open) => { if (!open) setForceCloseLoan(null); }}
        title={`Force-close ${forceCloseLoan?.source}?`}
        description={`Outstanding ${formatINR(forceCloseLoan?.outstanding ?? 0)} will be marked as settled.`}
        confirmLabel="Close Loan"
        onConfirm={() => {
          if (forceCloseLoan) {
            updateLoan(forceCloseLoan.id, { status: "Closed", outstanding: 0 });
            setForceCloseLoan(null);
          }
        }}
      />
    </PageShell>
  );
};

export default Loans;
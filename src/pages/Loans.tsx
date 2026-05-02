import { useState, useMemo } from "react";
import { Plus, Search, CreditCard, IndianRupee, Calendar, Building2, User, Clock, Bell, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { Loan, LoanRepayment } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const Loans = () => {
  const { loans, loanRepayments, addLoan, addLoanRepayment, generateId } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal state
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepaymentOpen, setIsRepaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
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
  
  // Repayment form
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);

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
    setLoanStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddLoan = () => {
    if (!loanSource || !loanPrincipal) {
      toast({ title: "Error", description: "Source and principal are required", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "emi" && !loanEmi) {
      toast({ title: "Error", description: "EMI amount is required for EMI loans", variant: "destructive" });
      return;
    }

    if (loanPaymentType === "one-time" && !loanDueDate) {
      toast({ title: "Error", description: "Due date is required for one-time payment loans", variant: "destructive" });
      return;
    }

    const newLoan: Loan = {
      id: generateId('L'),
      source: loanSource,
      sourceType: loanSourceType,
      paymentType: loanPaymentType,
      principal: parseFloat(loanPrincipal),
      interestRate: parseFloat(loanInterestRate) || 0,
      emiAmount: loanPaymentType === "emi" ? parseFloat(loanEmi) : 0,
      tenure: loanPaymentType === "emi" ? parseInt(loanTenure) || 12 : 0,
      dueDate: loanPaymentType === "one-time" ? loanDueDate : undefined,
      reminderDate: loanPaymentType === "reminder-only" ? loanReminderDate : undefined,
      reminderNotes: loanPaymentType === "reminder-only" ? loanReminderNotes : undefined,
      startDate: loanStartDate,
      outstanding: parseFloat(loanPrincipal),
      status: "Active",
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

    const amount = parseFloat(repaymentAmount);
    const emiCount = loanRepayments.filter(r => r.loanId === selectedLoan.id).length + 1;
    
    const repayment: LoanRepayment = {
      id: generateId('REP'),
      loanId: selectedLoan.id,
      loanSource: selectedLoan.source,
      date: repaymentDate,
      emiNumber: emiCount,
      principalPaid: amount * 0.7,
      interestPaid: amount * 0.3,
      totalPaid: amount,
    };

    addLoanRepayment(repayment);
    setIsRepaymentOpen(false);
    setRepaymentAmount("");
    toast({ title: "Repayment Recorded", description: `₹${amount.toLocaleString()} recorded` });
  };

  const filteredLoans = useMemo(
    () =>
      loans.filter((l) => {
        const matchesSearch = l.source.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || l.status === statusFilter;
        const matchesType = typeFilter === "all" || l.paymentType === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
      }),
    [loans, searchQuery, statusFilter, typeFilter],
  );

  const { pagedItems: pagedLoans, safePage } = usePagedSlice(filteredLoans, tablePage, tablePageSize);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

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
    switch (type) {
      case "emi":
        return <Badge className="bg-primary/10 text-primary border-0 text-xs">EMI</Badge>;
      case "one-time":
        return <Badge className="bg-warning/10 text-warning border-0 text-xs">One-Time</Badge>;
      case "reminder-only":
        return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Reminder</Badge>;
      default:
        return null;
    }
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Loans" }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Active", value: activeLoans },
              { label: "Principal", value: formatCurrency(totalPrincipal) },
              { label: "Outstanding", value: formatCurrency(totalOutstanding) },
              { label: "EMI / mo", value: formatCurrency(monthlyEmi) },
            ]}
          />
        }
      >
        <Button size="sm" onClick={() => { resetLoanForm(); setIsAddLoanOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </StickyPageHeader>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search loans..." 
            className="pl-9 bg-muted/50 border-border"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setTablePage(1);
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setTablePage(1);
          }}
        >
          <SelectTrigger className="w-[130px] bg-muted/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            setTablePage(1);
          }}
        >
          <SelectTrigger className="w-[150px] bg-muted/50">
            <SelectValue placeholder="Payment Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="emi">EMI</SelectItem>
            <SelectItem value="one-time">One-Time</SelectItem>
            <SelectItem value="reminder-only">Reminder Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {pagedLoans.map((loan) => (
              <TableRow key={loan.id} className="border-border">
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSourceIcon(loan.sourceType)}
                    <span className="font-medium">{loan.source}</span>
                  </div>
                </TableCell>
                <TableCell>{getPaymentTypeBadge(loan.paymentType)}</TableCell>
                <TableCell className="text-right">{formatCurrency(loan.principal)}</TableCell>
                <TableCell className="text-right">{loan.interestRate > 0 ? `${loan.interestRate}%` : '-'}</TableCell>
                <TableCell className="text-right">{getPaymentTypeDisplay(loan)}</TableCell>
                <TableCell className="text-right text-warning">{formatCurrency(loan.outstanding)}</TableCell>
                <TableCell>
                  <Badge className={loan.status === "Active" ? "bg-primary/10 text-primary border-0" : "bg-muted text-muted-foreground border-0"}>
                    {loan.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {loan.status === "Active" && loan.paymentType !== "reminder-only" && (
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
      </DataTableShell>
      {filteredLoans.length === 0 && (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No loans found</p>
        </div>
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
                  <span className="font-semibold text-primary">{formatCurrency(rep.totalPaid)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Loan Sheet */}
      <Sheet open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Loan</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Type</Label>
              <Select value={loanSourceType} onValueChange={(v) => setLoanSourceType(v as any)}>
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
              <Select value={loanPaymentType} onValueChange={(v) => setLoanPaymentType(v as any)}>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>EMI Amount *</Label>
                  <Input type="number" value={loanEmi} onChange={(e) => setLoanEmi(e.target.value)} placeholder="10871" />
                </div>
                <div className="space-y-2">
                  <Label>Tenure (months)</Label>
                  <Input type="number" value={loanTenure} onChange={(e) => setLoanTenure(e.target.value)} placeholder="60" />
                </div>
              </div>
            )}

            {/* One-time payment fields */}
            {loanPaymentType === "one-time" && (
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} />
              </div>
            )}

            {/* Reminder-only fields */}
            {loanPaymentType === "reminder-only" && (
              <>
                <div className="space-y-2">
                  <Label>Reminder Date (optional)</Label>
                  <Input type="date" value={loanReminderDate} onChange={(e) => setLoanReminderDate(e.target.value)} />
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
        </SheetContent>
      </Sheet>

      {/* Record Repayment Sheet */}
      <Sheet open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Loans;
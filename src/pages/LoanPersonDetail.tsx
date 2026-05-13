import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Phone, User, IndianRupee, Calendar, Building2, FileText, Receipt, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const LoanPersonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const personName = decodeURIComponent(id || "");
  
  const { loans, loanRepayments } = useAppData();
  
  // Filter loans for this person
  const personLoans = loans.filter(l => l.source === personName || l.source.includes(personName));
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
  
  // Repayment form state
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [repaymentPrincipal, setRepaymentPrincipal] = useState("");
  const [repaymentInterest, setRepaymentInterest] = useState("");
  const [repaymentNotes, setRepaymentNotes] = useState("");
  
  // Calculate totals
  const totalPrincipal = personLoans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = personLoans.reduce((sum, l) => sum + l.outstanding, 0);
  const totalRepaid = totalPrincipal - totalOutstanding;
  const totalEmi = personLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  const activeCount = personLoans.filter(l => l.status === "Active").length;
  
  // Extract person name from source (e.g., "Personal - Ramesh Kumar" -> "Ramesh Kumar")
  const displayName = personName.replace(/^(Personal|Person)\s*-\s*/i, '').trim();
  
  const handleAddLoan = () => {
    toast({ title: "Loan Added", description: `New loan of ₹${parseInt(loanPrincipal).toLocaleString()} added` });
    setIsAddLoanOpen(false);
    setLoanPrincipal("");
    setLoanInterestRate("");
    setLoanEmi("");
    setLoanTenure("");
    setLoanNotes("");
  };
  
  const handleAddRepayment = () => {
    if (!selectedLoan) return;
    const total = (parseFloat(repaymentPrincipal) || 0) + (parseFloat(repaymentInterest) || 0);
    toast({ title: "Repayment Recorded", description: `₹${total.toLocaleString()} repaid for ${selectedLoan.source}` });
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <p className="text-xl font-semibold text-foreground">Loan source not found</p>
        </div>
        <Card className="bg-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No loans found for "{personName}"</p>
            <Button className="mt-4" onClick={() => navigate("/finance?tab=loans")}>
              Back to Loans
            </Button>
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
              { label: "Borrowed", value: `₹${totalPrincipal.toLocaleString()}` },
              { label: "Outstanding", value: `₹${totalOutstanding.toLocaleString()}` },
              { label: "Repaid", value: `₹${totalRepaid.toLocaleString()}` },
              { label: "Monthly EMI", value: `₹${totalEmi.toLocaleString()}` },
            ]}
          />
        }
      >
        <Button variant="outline" onClick={() => setIsAddLoanOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Loan
        </Button>
      </StickyPageHeader>

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-purple-500/20">
          <AvatarFallback className="bg-purple-500/10 text-lg font-semibold text-purple-500">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold text-foreground">{displayName}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="border-purple-500/30 text-purple-500">Personal Loan</Badge>
            <Badge className={activeCount > 0 ? "bg-blue-500/10 text-blue-500" : "bg-muted"}>
              {activeCount} Active Loan{activeCount !== 1 ? "s" : ""}
            </Badge>
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
                <TableHead >Status</TableHead>
                <TableHead >Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedPersonLoans.map((loan) => (
                <TableRow key={loan.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{loan.id}</TableCell>
                  <TableCell className="text-foreground">₹{loan.principal.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.interestRate}%</TableCell>
                  <TableCell className="text-primary font-medium">₹{loan.emiAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.tenure} months</TableCell>
                  <TableCell className="text-destructive font-medium">₹{loan.outstanding.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{loan.startDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={loan.status === "Active" ? "bg-blue-500/10 text-blue-500" : "bg-muted"}>
                      {loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
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
                    <TableCell className="text-foreground">₹{rep.principalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">₹{rep.interestPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-primary font-medium">₹{rep.totalPaid.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          ) : (
            <p className="text-center text-muted-foreground py-6">No repayments recorded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Add Loan Modal */}
      <Sheet open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                <Input 
                  type="number" 
                  placeholder="10000" 
                  value={loanEmi}
                  onChange={(e) => setLoanEmi(e.target.value)}
                />
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
              <Input 
                type="date" 
                value={loanStartDate}
                onChange={(e) => setLoanStartDate(e.target.value)}
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
              Add Loan
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Repayment Modal */}
      <Sheet open={isRepaymentOpen} onOpenChange={setIsRepaymentOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                  Outstanding: <span className="font-medium text-destructive">₹{selectedLoan.outstanding.toLocaleString()}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={repaymentDate}
                  onChange={(e) => setRepaymentDate(e.target.value)}
                />
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
                  ₹{((parseFloat(repaymentPrincipal) || 0) + (parseFloat(repaymentInterest) || 0)).toLocaleString()}
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
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default LoanPersonDetail;

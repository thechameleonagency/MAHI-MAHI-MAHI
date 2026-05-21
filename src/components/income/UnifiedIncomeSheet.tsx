import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Landmark, Handshake, Users, Building2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import {
  INCOME_MAIN_CATEGORIES,

  getIncomeCategoriesByMainCategory,
  getIncomeSubCategories,
  getIncomeCategoryByValue,
  type MainIncomeCategory,
} from "@/lib/incomeSchema";
import type { Income } from "@/types/finance";
import { UnifiedFinanceValidationService } from "@/application/services/UnifiedFinanceValidationService";
import { MappingPostingChip } from "@/components/shared/MappingPostingChip";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/formDraftStorage";
import { requireDateNotBefore } from "@/lib/dateSanity";
import { FORM_CREATE_LABEL } from "@/lib/formActionLabels";

const INCOME_MODAL_DRAFT_KEY = "income-sheet-modal";

const MAIN_CAT_ICONS: Record<string, React.ReactNode> = {
  project: <Briefcase className="w-5 h-5" />,
  loan: <Landmark className="w-5 h-5" />,
  partner: <Handshake className="w-5 h-5" />,
  "employee-payment": <Users className="w-5 h-5" />,
  company: <Building2 className="w-5 h-5" />,
};

interface UnifiedIncomeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  /** When set, sheet edits an existing income row (M6 / V9). */
  editingIncome?: Income | null;
}

type Step = "main-category" | "category" | "details" | "confirm";

export function UnifiedIncomeSheet({
  isOpen,
  onClose,
  projectId: prefillProjectId,
  projectName: prefillProjectName,
  editingIncome = null,
}: UnifiedIncomeSheetProps) {
  const { projects, partners, employees, loans, addIncome, updateIncome, generateId } = useAppData();
  const isEdit = Boolean(editingIncome?.id);
  const financeValidationService = useMemo(() => new UnifiedFinanceValidationService(), []);

  const [step, setStep] = useState<Step>("main-category");
  const [mainCategory, setMainCategory] = useState<MainIncomeCategory | "">(prefillProjectId ? "project" : "");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");

  // Details
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");

  // Linked entities
  const [selectedProjectId, setSelectedProjectId] = useState(prefillProjectId || "");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedLoanId, setSelectedLoanId] = useState("");

  // Udhar-specific fields
  const [udharPersonName, setUdharPersonName] = useState("");
  const [udharContact, setUdharContact] = useState("");
  const [udharExpectedReturnDate, setUdharExpectedReturnDate] = useState("");
  const [udharRelationship, setUdharRelationship] = useState("");

  // Bank loan-specific fields
  const [bankName, setBankName] = useState("");
  const [loanAccount, setLoanAccount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenure, setTenure] = useState("");

  // Partner level
  const [partnerLevel, setPartnerLevel] = useState<"company" | "site">("company");

  const categoryInfo = getIncomeCategoryByValue(category);
  const subCategories = getIncomeSubCategories(category);
  const selectedSubCat = subCategories.find(s => s.value === subCategory);

  // Determine needs at BOTH category and subcategory level
  const needsProject = selectedSubCat?.requiresProject || mainCategory === "project";
  const needsPartner = selectedSubCat?.requiresPartner || mainCategory === "partner";
  const needsEmployee = selectedSubCat?.requiresEmployee || mainCategory === "employee-payment";
  const needsLoan = selectedSubCat?.requiresLoan || false;
  const isOutgoing = selectedSubCat?.isOutgoing || false;

  // Udhar-specific needs
  const needsPersonName = selectedSubCat?.requiresPersonName || false;
  const needsContactNumber = selectedSubCat?.requiresContactNumber || false;
  const needsExpectedReturnDate = selectedSubCat?.requiresExpectedReturnDate || false;

  // Bank loan-specific needs
  const needsBankName = selectedSubCat?.requiresBankName || false;
  const needsLoanAccount = selectedSubCat?.requiresLoanAccount || false;
  const needsInterestRate = selectedSubCat?.requiresInterestRate || false;
  const needsTenure = selectedSubCat?.requiresTenure || false;

  const isProjectRequired = selectedSubCat?.requiresProject === true;
  const isPartnerRequired = selectedSubCat?.requiresPartner === true;
  const isEmployeeRequired = selectedSubCat?.requiresEmployee === true;

  const isUdharCategory = category === "udhar-borrowing";
  const isBankLoanCategory = category === "bank-loan";

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  // Auto-fill receivedFrom from project client
  const autoFillClient = useMemo(() => {
    if (selectedProject && mainCategory === "project") {
      return selectedProject.client || "";
    }
    return "";
  }, [selectedProject, mainCategory]);

  useEffect(() => {
    if (autoFillClient && !receivedFrom) {
      setReceivedFrom(autoFillClient);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFillClient]);

  useEffect(() => {
    if (!isOpen || !editingIncome) return;
    setStep("details");
    setMainCategory(editingIncome.mainCategory);
    setCategory(editingIncome.category);
    setSubCategory(editingIncome.subCategory ?? "");
    setAmount(String(editingIncome.amount));
    setDate(editingIncome.date.slice(0, 10));
    setPaymentMode(editingIncome.paymentMode);
    setReference(editingIncome.reference ?? "");
    setNotes(editingIncome.notes ?? "");
    setSelectedProjectId(editingIncome.projectId ?? "");
    setSelectedPartnerId(editingIncome.partnerId ?? "");
    setSelectedEmployeeId(editingIncome.employeeId ?? "");
    setSelectedLoanId(editingIncome.loanId ?? "");
  }, [isOpen, editingIncome]);

  useEffect(() => {
    if (!isOpen || prefillProjectId || editingIncome) return;
    const d = loadFormDraft<{
      v: 1;
      step?: Step;
      amount?: string;
      date?: string;
      notes?: string;
      mainCategory?: MainIncomeCategory | "";
    }>(INCOME_MODAL_DRAFT_KEY);
    if (d?.v !== 1) return;
    if (d.step) setStep(d.step);
    if (d.mainCategory != null) setMainCategory(d.mainCategory);
    if (d.amount != null) setAmount(d.amount);
    if (d.date != null) setDate(d.date);
    if (d.notes != null) setNotes(d.notes);
  }, [isOpen, prefillProjectId, editingIncome]);

  useEffect(() => {
    if (!isOpen || editingIncome) return;
    saveFormDraft(INCOME_MODAL_DRAFT_KEY, {
      v: 1,
      step,
      mainCategory,
      amount,
      date,
      notes,
    });
  }, [isOpen, step, mainCategory, amount, date, notes]);

  const resetForm = () => {
    clearFormDraft(INCOME_MODAL_DRAFT_KEY);
    setStep("main-category");
    setMainCategory(prefillProjectId ? "project" : "");
    setCategory("");
    setSubCategory("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("Bank Transfer");
    setReference("");
    setNotes("");
    setReceivedFrom("");
    setSelectedProjectId(prefillProjectId || "");
    setSelectedPartnerId("");
    setSelectedEmployeeId("");
    setSelectedLoanId("");
    setUdharPersonName("");
    setUdharContact("");
    setUdharExpectedReturnDate("");
    setUdharRelationship("");
    setBankName("");
    setLoanAccount("");
    setInterestRate("");
    setTenure("");
    setPartnerLevel("company");
  };

  const steps: Step[] = ["main-category", "category", "details", "confirm"];

  const isStepValid = () => {
    switch (step) {
      case "main-category": return !!mainCategory;
      case "category": return !!category;
      case "details":
        if (!amount || parseFloat(amount) <= 0) return false;
        if (isProjectRequired && !selectedProjectId) return false;
        if (isPartnerRequired && !selectedPartnerId) return false;
        if (isEmployeeRequired && !selectedEmployeeId) return false;
        if (needsLoan && !selectedLoanId) return false;
        if (needsPersonName && !udharPersonName) return false;
        if (needsBankName && !bankName) return false;
        if (interestRate.trim()) {
          const rate = Number.parseFloat(interestRate);
          if (!Number.isFinite(rate) || rate < 0) return false;
        }
        if (tenure.trim()) {
          const months = Number.parseInt(tenure, 10);
          if (!Number.isFinite(months) || months < 0) return false;
        }
        return true;
      case "confirm": return true;
      default: return true;
    }
  };

  const goNext = () => { const idx = steps.indexOf(step); if (idx < steps.length - 1) setStep(steps[idx + 1]); };
  const goBack = () => { const idx = steps.indexOf(step); if (idx > 0) setStep(steps[idx - 1]); };

  const handleSubmit = () => {
    if (interestRate.trim()) {
      const rate = Number.parseFloat(interestRate);
      if (!Number.isFinite(rate) || rate < 0) {
        toast({ title: "Invalid interest rate", description: "Enter a non-negative number.", variant: "destructive" });
        return;
      }
    }
    if (tenure.trim()) {
      const months = Number.parseInt(tenure, 10);
      if (!Number.isFinite(months) || months < 0) {
        toast({ title: "Invalid tenure", description: "Enter whole months (0 or more).", variant: "destructive" });
        return;
      }
    }
    if (udharExpectedReturnDate) {
      const err = requireDateNotBefore("Expected return", udharExpectedReturnDate, "Income date", date);
      if (err) {
        toast({ title: "Invalid date", description: err, variant: "destructive" });
        return;
      }
    }
    const taxonomyMap: Record<string, "project_income" | "loans_borrowing" | "partner_income" | "employee_repayments" | "company_income"> = {
      project: "project_income",
      loan: "loans_borrowing",
      partner: "partner_income",
      "employee-payment": "employee_repayments",
      company: "company_income",
    };
    const taxonomyResult = financeValidationService.validateIncome(taxonomyMap[mainCategory as string], {
      projectId: selectedProjectId || undefined,
      partnerId: selectedPartnerId || undefined,
      employeeId: selectedEmployeeId || undefined,
      bankLoanDetails: bankName || loanAccount || undefined,
    });
    if (!taxonomyResult.ok) {
      toast({
        title: "Income Validation Failed",
        description: taxonomyResult.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const composedNotes = [
      notes,
      udharPersonName && `Person: ${udharPersonName}`,
      udharContact && `Contact: ${udharContact}`,
      udharRelationship && `Relationship: ${udharRelationship}`,
      udharExpectedReturnDate && `Expected Return: ${udharExpectedReturnDate}`,
      bankName && `Bank: ${bankName}`,
      loanAccount && `Account: ${loanAccount}`,
      interestRate && `Interest: ${interestRate}%`,
      tenure && `Tenure: ${tenure} months`,
      receivedFrom && `Received From: ${receivedFrom}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const payload: Partial<Income> = {
      date,
      amount: parseFloat(amount),
      mainCategory: mainCategory as MainIncomeCategory,
      category,
      subCategory: subCategory || undefined,
      projectId: selectedProjectId || undefined,
      projectName: selectedProject?.name || prefillProjectName || undefined,
      partnerId: selectedPartnerId || undefined,
      partnerName: partners.find((p) => p.id === selectedPartnerId)?.name || undefined,
      employeeId: selectedEmployeeId || undefined,
      employeeName: employees.find((e) => String(e.id) === String(selectedEmployeeId))?.name || undefined,
      loanId: selectedLoanId || undefined,
      paymentMode,
      reference: reference || undefined,
      notes: composedNotes || undefined,
      isOutgoing,
    };

    if (isEdit && editingIncome) {
      updateIncome(editingIncome.id, payload);
      toast({
        title: "Income updated",
        description: `₹${parseFloat(amount).toLocaleString()} — ${categoryInfo?.label || category}`,
      });
    } else {
      addIncome({
        id: generateId("INC"),
        ...payload,
        mainCategory: payload.mainCategory!,
        category: payload.category!,
        paymentMode: payload.paymentMode!,
        createdAt: new Date().toISOString(),
      } as Income);
      toast({
        title: isOutgoing ? "Outgoing Recorded" : "Income Added",
        description: `₹${parseFloat(amount).toLocaleString()} recorded as ${categoryInfo?.label || category}`,
      });
    }
    resetForm();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <AppSheetContent layout="form" size="lg">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">{isEdit ? "Edit Income" : "Add Income"}</SheetTitle>
          <SheetDescription>
            Step {steps.indexOf(step) + 1} of 4
            {mainCategory && <Badge variant="outline" className="ml-2">{INCOME_MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label}</Badge>}
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, idx) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${steps.indexOf(step) >= idx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 1: Main Category */}
        {step === "main-category" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">What type of income is this?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INCOME_MAIN_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setMainCategory(cat.value); setCategory(""); setSubCategory(""); }}
                  className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all ${
                    mainCategory === cat.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={mainCategory === cat.value ? "text-primary" : "text-muted-foreground"}>
                    {MAIN_CAT_ICONS[cat.value]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Category + Sub */}
        {step === "category" && mainCategory && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Category</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {getIncomeCategoriesByMainCategory(mainCategory).map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setCategory(cat.value); setSubCategory(""); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm ${
                    category === cat.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {category && subCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-type</Label>
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(sub => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                        {sub.isOutgoing && " ⚠"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* W3 — Will-post-to chip from incomeToAccountMapping master. */}
            {mainCategory && (category || subCategory) && (
              <MappingPostingChip
                kind="income"
                mappingKey={`${mainCategory}:${subCategory || category}`}
              />
            )}

            {isOutgoing && (
              <Badge className="bg-warning/10 text-warning border-0">⚠ This is an outgoing payment</Badge>
            )}
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{categoryInfo?.label}</Badge>
              {subCategory && <Badge variant="secondary">{selectedSubCat?.label}</Badge>}
              {isOutgoing && <Badge className="bg-warning/10 text-warning border-0">Outgoing</Badge>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>

            {/* Linked Project */}
            {needsProject && (
              <div className="space-y-2">
                <Label>Select Project {isProjectRequired ? "*" : "(Optional)"}</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
                  <SelectContent>
                    {!isProjectRequired && <SelectItem value="none">No project</SelectItem>}
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Received From - for project income */}
            {mainCategory === "project" && (
              <div className="space-y-2">
                <Label>Received From</Label>
                <Input value={receivedFrom} onChange={(e) => setReceivedFrom(e.target.value)} placeholder="Client name, bank, etc." />
              </div>
            )}

            {/* Partner with site/company level */}
            {needsPartner && (
              <div className="space-y-3">
                {/* Site vs Company level for partner investment */}
                {category === "partner-investment" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Investment Level</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setPartnerLevel("company"); setSelectedProjectId(""); }}
                        className={`flex-1 p-2 rounded-lg border text-sm text-center transition-all ${
                          partnerLevel === "company" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        Company Level
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartnerLevel("site")}
                        className={`flex-1 p-2 rounded-lg border text-sm text-center transition-all ${
                          partnerLevel === "site" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        Site Level
                      </button>
                    </div>
                  </div>
                )}

                {partnerLevel === "site" && category === "partner-investment" && (
                  <div className="space-y-2">
                    <Label>Select Site/Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
                      <SelectContent>
                        {projects.filter(p => p.status !== "Completed").map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Select Partner {isPartnerRequired ? "*" : "(Optional)"}</Label>
                  <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                    <SelectTrigger><SelectValue placeholder="Choose partner" /></SelectTrigger>
                    <SelectContent>
                      {!isPartnerRequired && <SelectItem value="none">No partner</SelectItem>}
                      {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Employee */}
            {needsEmployee && (
              <div className="space-y-2">
                <Label>Select Employee {isEmployeeRequired ? "*" : "(Optional)"}</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent>
                    {!isEmployeeRequired && <SelectItem value="none">No employee</SelectItem>}
                    {employees.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name} - {e.role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Loan */}
            {needsLoan && (
              <div className="space-y-2">
                <Label>Select Loan *</Label>
                <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                  <SelectTrigger><SelectValue placeholder="Choose loan" /></SelectTrigger>
                  <SelectContent>
                    {loans.map(l => <SelectItem key={l.id} value={l.id}>{l.source} - ₹{l.principal.toLocaleString()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bank Loan specific fields */}
            {isBankLoanCategory && (needsBankName || needsLoanAccount || needsInterestRate || needsTenure) && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <Label className="text-sm font-medium">Bank Loan Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {needsBankName && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bank Name *</Label>
                        <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., SBI, HDFC" />
                      </div>
                    )}
                    {needsLoanAccount && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Loan Account No.</Label>
                        <Input value={loanAccount} onChange={(e) => setLoanAccount(e.target.value)} placeholder="Account number" />
                      </div>
                    )}
                    {needsInterestRate && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
                        <Input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g., 8.5" />
                      </div>
                    )}
                    {needsTenure && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Tenure (Months)</Label>
                        <Input type="number" value={tenure} onChange={(e) => setTenure(e.target.value)} placeholder="e.g., 60" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Udhar specific fields */}
            {isUdharCategory && (needsPersonName || needsContactNumber || needsExpectedReturnDate) && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <Label className="text-sm font-medium">Udhar / Borrowing Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {needsPersonName && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Person Name *</Label>
                        <Input value={udharPersonName} onChange={(e) => setUdharPersonName(e.target.value)} placeholder="Who borrowed/lent?" />
                      </div>
                    )}
                    {needsContactNumber && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Contact Number</Label>
                        <Input value={udharContact} onChange={(e) => setUdharContact(e.target.value)} placeholder="Phone number" />
                      </div>
                    )}
                    {needsExpectedReturnDate && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Expected Return Date</Label>
                        <Input type="date" value={udharExpectedReturnDate} onChange={(e) => setUdharExpectedReturnDate(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Relationship / Context</Label>
                      <Input value={udharRelationship} onChange={(e) => setUdharRelationship(e.target.value)} placeholder="e.g., Friend, Relative" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reference / Txn ID</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Review & Confirm</Label>
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{INCOME_MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{categoryInfo?.label}{subCategory && ` → ${selectedSubCat?.label}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className={`font-bold text-lg ${isOutgoing ? "text-destructive" : "text-primary"}`}>
                    {isOutgoing ? "-" : "+"}₹{parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{new Date(date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Mode</span>
                  <span className="font-medium">{paymentMode}</span>
                </div>
                {selectedProject && <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-medium">{selectedProject.name}</span></div>}
                {receivedFrom && <div className="flex justify-between"><span className="text-muted-foreground">Received From</span><span className="font-medium">{receivedFrom}</span></div>}
                {selectedPartnerId && <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span className="font-medium">{partners.find(p => p.id === selectedPartnerId)?.name}</span></div>}
                {selectedEmployeeId && <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="font-medium">{employees.find((e) => String(e.id) === String(selectedEmployeeId))?.name}</span></div>}
                {udharPersonName && <div className="flex justify-between"><span className="text-muted-foreground">Person</span><span className="font-medium">{udharPersonName}</span></div>}
                {udharContact && <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-medium">{udharContact}</span></div>}
                {udharExpectedReturnDate && <div className="flex justify-between"><span className="text-muted-foreground">Expected Return</span><span className="font-medium">{new Date(udharExpectedReturnDate).toLocaleDateString()}</span></div>}
                {bankName && <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span className="font-medium">{bankName}</span></div>}
                {loanAccount && <div className="flex justify-between"><span className="text-muted-foreground">Account</span><span className="font-medium">{loanAccount}</span></div>}
                {interestRate && <div className="flex justify-between"><span className="text-muted-foreground">Interest Rate</span><span className="font-medium">{interestRate}%</span></div>}
                {notes && <div className="pt-2 border-t"><span className="text-muted-foreground text-sm">Notes: </span><span className="text-sm">{notes}</span></div>}

                {/* Ledger Impact */}
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ledger Impact</p>
                  <div className="text-xs space-y-1">
                    {isOutgoing ? (
                      <p>• Company Ledger: <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>
                    ) : (
                      <p>• Company Ledger: <span className="text-primary">+₹{parseFloat(amount).toLocaleString()}</span></p>
                    )}
                    {selectedProject && !isOutgoing && <p>• Site Ledger ({selectedProject.name}): <span className="text-primary">+₹{parseFloat(amount).toLocaleString()}</span></p>}
                    {mainCategory === "partner" && selectedPartnerId && (
                      <p>• Partner Ledger ({partners.find(p => p.id === selectedPartnerId)?.name}): <span className={isOutgoing ? "text-destructive" : "text-primary"}>{isOutgoing ? "-" : "+"}₹{parseFloat(amount).toLocaleString()}</span></p>
                    )}
                    {mainCategory === "employee-payment" && selectedEmployeeId && !isOutgoing && (
                      <p>• Employee Liability: <span className="text-warning">+₹{parseFloat(amount).toLocaleString()} (Company owes)</span></p>
                    )}
                    {mainCategory === "employee-payment" && selectedEmployeeId && isOutgoing && (
                      <p>• Employee Liability: <span className="text-primary">-₹{parseFloat(amount).toLocaleString()} (Reimbursed)</span></p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === "main-category" ? onClose : goBack}>
            {step === "main-category" ? "Cancel" : <><ArrowLeft className="w-4 h-4 mr-2" />Back</>}
          </Button>
          {step === "confirm" ? (
            <Button onClick={handleSubmit}><Check className="w-4 h-4 mr-2" />{FORM_CREATE_LABEL}</Button>
          ) : (
            <Button onClick={goNext} disabled={!isStepValid()}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
          )}
        </div>
      </AppSheetContent>
    </Sheet>
  );
}

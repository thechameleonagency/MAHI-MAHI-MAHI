import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, User, Crown, Handshake, Split, ArrowRight, ArrowLeft, Check, AlertCircle, Package, Calendar, Home, HardHat, Users } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { 
  EXPENSE_SCHEMA,
  EXPENSE_MAIN_CATEGORIES,
  getCategoryByValue, 
  getSubCategoriesByCategory,
  getCategoriesByMainCategory,
  getAllowedPayersByCategory,
  isReimbursementAllowed,
  requiresProject as schemaRequiresProject,
  requiresEmployee as schemaRequiresEmployee,
  requiresPartner as schemaRequiresPartner,
  requiresMonth as schemaRequiresMonth,
  requiresBillPeriod as schemaRequiresBillPeriod,
  requiresDueDate as schemaRequiresDueDate,
  requiresQuantity as schemaRequiresQuantity,
  getUnit as schemaGetUnit,
  hasOptionalProject,
  allowsMultiEmployee,
  allowsCustomSubCategory,
  requiresVendor as schemaRequiresVendor,
  type MainExpenseCategory,
} from "@/lib/expenseSchema";
import type { Expense } from "@/types/finance";
import { UnifiedFinanceValidationService } from "@/application/services/UnifiedFinanceValidationService";


const MAIN_CAT_ICONS: Record<string, React.ReactNode> = {
  company: <Building2 className="w-5 h-5" />,
  employee: <Users className="w-5 h-5" />,
  office: <Home className="w-5 h-5" />,
  site: <HardHat className="w-5 h-5" />,
  owner: <Crown className="w-5 h-5" />,
  partner: <Handshake className="w-5 h-5" />,
};

const PAYER_ICONS: Record<string, React.ReactNode> = {
  company: <Building2 className="w-5 h-5" />,
  employee: <User className="w-5 h-5" />,
  owner: <Crown className="w-5 h-5" />,
  partner: <Handshake className="w-5 h-5" />,
  split: <Split className="w-5 h-5" />,
};

const PAYER_LABELS: Record<string, string> = {
  company: "Company Account",
  employee: "Employee Paid",
  owner: "Owner (MK) Paid",
  partner: "Partner Paid",
  split: "Split Payment",
};

interface UnifiedExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  employeeId?: number;
  employeeName?: string;
  isPartnershipProject?: boolean;
  projectPartnerIds?: string[];
  isProjectCompleted?: boolean;
}

type Step = "main-category" | "category" | "details" | "payer" | "confirm";

export function UnifiedExpenseModal({
  isOpen,
  onClose,
  projectId: prefillProjectId,
  projectName: prefillProjectName,
  employeeId: prefillEmployeeId,
  employeeName: prefillEmployeeName,
  isPartnershipProject = false,
  projectPartnerIds = [],
  isProjectCompleted = false,
}: UnifiedExpenseModalProps) {
  const { employees, partners, projects, addExpense, generateId, inventoryItems } = useAppData();
  const ownerName = (() => { try { return JSON.parse(localStorage.getItem("mss.settings.company") || "{}").ownerName || "Owner"; } catch { return "Owner"; } })();
  const financeValidationService = useMemo(() => new UnifiedFinanceValidationService(), []);
  
  const [step, setStep] = useState<Step>("main-category");
  
  // Main category
  const [mainCategory, setMainCategory] = useState<MainExpenseCategory | "">(
    prefillProjectId ? "site" : prefillEmployeeId ? "employee" : ""
  );
  
  // Project / Employee / Partner selection
  const [selectedProjectId, setSelectedProjectId] = useState(prefillProjectId || "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(prefillEmployeeId || null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  
  // Multi-employee selection (for shared payments / reimbursement)
  const [multiSelectedEmployeeIds, setMultiSelectedEmployeeIds] = useState<number[]>([]);
  const [multiEmployeeAmounts, setMultiEmployeeAmounts] = useState<Record<number, string>>({});
  
  // Custom sub-category
  const [customSubCategory, setCustomSubCategory] = useState("");
  
  // Category state
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  
  // Details state
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Refresh defaults when modal re-opens (avoid stale date across midnight)
  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split("T")[0]);
      setBillingMonth(new Date().toISOString().slice(0, 7));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  
  // Billing/recurring fields
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [billPeriodStart, setBillPeriodStart] = useState("");
  const [billPeriodEnd, setBillPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Participants (who shared the expense - for team meals, transport etc.)
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  
  // Payer state (who actually paid the money)
  const [payerType, setPayerType] = useState<"company" | "employee" | "owner" | "partner" | "split">("company");
  const [payerEmployeeId, setPayerEmployeeId] = useState<number | null>(null);
  const [payerPartnerId, setPayerPartnerId] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  
  // Split payment
  const [splitCompanyAmount, setSplitCompanyAmount] = useState("");
  const [splitOwnerAmount, setSplitOwnerAmount] = useState("");
  const [splitEmployeeIds, setSplitEmployeeIds] = useState<number[]>([]);
  const [splitEmployeeAmounts, setSplitEmployeeAmounts] = useState<Record<number, string>>({});
  const [splitPartnerIds, setSplitPartnerIds] = useState<string[]>([]);
  const [splitPartnerAmounts, setSplitPartnerAmounts] = useState<Record<string, string>>({});
  
  // Reimbursement
  const [willReimburse, setWillReimburse] = useState(false);
  const [reimbursementAmount, setReimbursementAmount] = useState("");
  
  // Inventory
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<number | null>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState("");

  // Vendor
  const [vendorName, setVendorName] = useState("");

  // Partner site/company level
  const [partnerLevel, setPartnerLevel] = useState<"company" | "site">("company");

  // Auto-set payer for reimbursement (company pays back employees)
  useEffect(() => {
    if (category === "employee-reimbursement") {
      setPayerType("company");
      setWillReimburse(false);
    }
  }, [category]);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedEmployeeId), [employees, selectedEmployeeId]);
  
  const categoryInfo = getCategoryByValue(category);
  const subCategories = getSubCategoriesByCategory(category);

  useEffect(() => {
    if (!category) {
      if (subCategory) setSubCategory("");
      return;
    }
    if (!subCategory) return;
    const allowed = getSubCategoriesByCategory(category);
    if (!allowed.some((s) => s.value === subCategory)) {
      setSubCategory("");
      setCustomSubCategory("");
    }
  }, [category, subCategory]);
  
  // Dynamic field requirements
  const needsProject = schemaRequiresProject(category) || mainCategory === "site";
  const optionalProject = hasOptionalProject(category);
  const needsEmployee = schemaRequiresEmployee(category, subCategory);
  const needsPartner = schemaRequiresPartner(category) || mainCategory === "partner";
  const needsMonth = schemaRequiresMonth(category, subCategory);
  const needsBillPeriod = schemaRequiresBillPeriod(category, subCategory);
  const needsDueDate = schemaRequiresDueDate(category, subCategory);
  const needsQuantity = schemaRequiresQuantity(category, subCategory);
  const needsVendor = schemaRequiresVendor(category, subCategory);
  const schemaUnit = schemaGetUnit(category, subCategory);
  const isMaterialExpense = category === "material-purchase";
  const isMultiEmployeeAllowed = allowsMultiEmployee(category, subCategory);
  const isCustomSubAllowed = allowsCustomSubCategory(category);
  const isMultiEmployeeCategory = category === "multi-employee-payment" || category === "employee-reimbursement";

  // Get allowed payers
  const allowedPayers = useMemo(() => {
    const allowed = getAllowedPayersByCategory(category, subCategory);
    if (!isPartnershipProject && !selectedProject?.ownerType?.includes("partnership") && mainCategory !== "partner") {
      return allowed.filter(p => p !== "partner");
    }
    return allowed;
  }, [category, subCategory, isPartnershipProject, selectedProject, mainCategory]);

  const availablePartners = useMemo(() => {
    if (selectedProject?.ownerType === "partnership" && selectedProject.partners) {
      return partners.filter(p => selectedProject.partners?.some(pp => pp.partnerId === p.id));
    }
    if (projectPartnerIds.length > 0) return partners.filter(p => projectPartnerIds.includes(p.id));
    return partners;
  }, [partners, selectedProject, projectPartnerIds]);

  const canReimburse = useMemo(() => 
    isReimbursementAllowed(category, subCategory) && 
    (payerType === "employee" || payerType === "owner" || payerType === "split"),
    [category, subCategory, payerType]
  );

  const selectedInventoryItem = useMemo(() => inventoryItems.find(i => i.id === selectedInventoryItemId), [selectedInventoryItemId]);

  useEffect(() => {
    if (selectedInventoryItem && inventoryQuantity) {
      const qty = parseFloat(inventoryQuantity) || 0;
      setAmount((qty * selectedInventoryItem.buyPrice).toString());
      setUnit(selectedInventoryItem.unit);
      setQuantity(inventoryQuantity);
    }
  }, [selectedInventoryItem, inventoryQuantity]);

  useEffect(() => {
    if (isOpen && prefillProjectId) {
      setSelectedProjectId(prefillProjectId);
      setMainCategory("site");
      setStep("category");
    }
    if (isOpen && prefillEmployeeId) {
      setSelectedEmployeeId(prefillEmployeeId);
      setMainCategory("employee");
      setStep("category");
    }
  }, [isOpen, prefillProjectId, prefillEmployeeId]);

  const resetForm = () => {
    setStep("main-category");
    setMainCategory(prefillProjectId ? "site" : prefillEmployeeId ? "employee" : "");
    setSelectedProjectId(prefillProjectId || "");
    setSelectedEmployeeId(prefillEmployeeId || null);
    setSelectedPartnerId("");
    setMultiSelectedEmployeeIds([]);
    setMultiEmployeeAmounts({});
    setCustomSubCategory("");
    setCategory("");
    setSubCategory("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setQuantity("");
    setUnit("");
    setPaymentMode("Bank Transfer");
    setBillingMonth(new Date().toISOString().slice(0, 7));
    setBillPeriodStart("");
    setBillPeriodEnd("");
    setDueDate("");
    setPaidDate("");
    setIsRecurring(false);
    setParticipantIds([]);
    setPayerType("company");
    setPayerEmployeeId(null);
    setPayerPartnerId("");
    setSplitCompanyAmount("");
    setSplitOwnerAmount("");
    setSplitEmployeeIds([]);
    setSplitEmployeeAmounts({});
    setSplitPartnerIds([]);
    setSplitPartnerAmounts({});
    setWillReimburse(false);
    setReimbursementAmount("");
    setSelectedInventoryItemId(null);
    setInventoryQuantity("");
    setVendorName("");
    setPartnerLevel("company");
  };

  const calculateSplitTotal = () => {
    let total = parseFloat(splitCompanyAmount) || 0;
    total += parseFloat(splitOwnerAmount) || 0;
    splitEmployeeIds.forEach(id => { total += parseFloat(splitEmployeeAmounts[id] || "0"); });
    splitPartnerIds.forEach(id => { total += parseFloat(splitPartnerAmounts[id] || "0"); });
    return total;
  };

  const isStepValid = () => {
    switch (step) {
      case "main-category": return !!mainCategory;
      case "category":
        if (!category) return false;
        if (needsProject && !selectedProjectId) return false;
        // For multi-employee categories, require at least one employee selected
        if (isMultiEmployeeCategory && multiSelectedEmployeeIds.length === 0) return false;
        // For single employee categories (non-multi), require employee
        if (needsEmployee && !isMultiEmployeeCategory && !selectedEmployeeId) return false;
        // For partner main category: require level, partner, and site if site-level
        if (mainCategory === "partner") {
          if (!selectedPartnerId) return false;
          if (partnerLevel === "site" && !selectedProjectId) return false;
        } else if (needsPartner && !selectedPartnerId) return false;
        return true;
      case "details": return !!amount && parseFloat(amount) > 0;
      case "payer":
        if (payerType === "employee" && !payerEmployeeId) return false;
        if (payerType === "partner" && !payerPartnerId) return false;
        if (payerType === "split") {
          const total = calculateSplitTotal();
          const target = parseFloat(amount) || 0;
          if (total <= 0 || Math.abs(total - target) > 0.01) return false;
        }
        return true;
      case "confirm": return true;
      default: return true;
    }
  };

  // Skip payer step for reimbursement (employees paid - it's implicit)
  const steps: Step[] = useMemo(() => {
    if (category === "employee-reimbursement") {
      return ["main-category", "category", "details", "confirm"];
    }
    return ["main-category", "category", "details", "payer", "confirm"];
  }, [category]);
  const goNext = () => {
    if (!isStepValid()) {
      const msgs: Record<string, string> = {
        "main-category": "Select an expense category to continue.",
        category: "Fill all required fields for this category.",
        details: "Enter a valid expense amount greater than zero.",
        payer: "Select who paid, or balance the split to match the expense amount.",
      };
      toast({ title: "Required Fields", description: msgs[step] ?? "Complete this step before proceeding.", variant: "destructive" });
      return;
    }
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const goBack = () => { const idx = steps.indexOf(step); if (idx > 0) setStep(steps[idx - 1]); };

  const buildExpense = (): Expense => {
    let paidBy: Expense["paidBy"];
    if (payerType === "company") {
      paidBy = { type: "company" };
    } else if (payerType === "owner") {
      paidBy = { type: "owner", entityName: ownerName };
    } else if (payerType === "employee") {
      const emp = employees.find(e => e.id === payerEmployeeId);
      paidBy = { type: "employee", entityId: payerEmployeeId?.toString(), entityName: emp?.name };
    } else if (payerType === "partner") {
      const p = partners.find(p => p.id === payerPartnerId);
      paidBy = { type: "partner", entityId: payerPartnerId, entityName: p?.name };
    } else {
      const splits: Expense["paidBy"]["splits"] = [];
      if (parseFloat(splitCompanyAmount) > 0) splits.push({ entityId: "company", entityType: "company", entityName: "Company", amount: parseFloat(splitCompanyAmount) });
      if (parseFloat(splitOwnerAmount) > 0) splits.push({ entityId: "owner", entityType: "owner", entityName: `${ownerName} (Owner)`, amount: parseFloat(splitOwnerAmount) });
      splitEmployeeIds.forEach(id => {
        const amt = parseFloat(splitEmployeeAmounts[id] || "0");
        if (amt > 0) splits.push({ entityId: id.toString(), entityType: "employee", entityName: employees.find(e => e.id === id)?.name || "", amount: amt });
      });
      splitPartnerIds.forEach(id => {
        const amt = parseFloat(splitPartnerAmounts[id] || "0");
        if (amt > 0) splits.push({ entityId: id, entityType: "partner", entityName: partners.find(p => p.id === id)?.name || "", amount: amt });
      });
      paidBy = { type: "company", splits };
    }

    return {
      id: generateId("EXP"),
      date,
      amount: parseFloat(amount),
      mainCategory: mainCategory as MainExpenseCategory,
      projectId: (needsProject || optionalProject) ? selectedProjectId || undefined : undefined,
      projectName: (needsProject || optionalProject) ? (selectedProject?.name || prefillProjectName) : undefined,
      category,
      subCategory: subCategory || customSubCategory || undefined,
      context: mainCategory === "site" ? "project" : mainCategory === "employee" ? "employee" : "office",
      paidBy,
      notes: notes || undefined,
      description: notes || undefined,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unit: unit || schemaUnit || undefined,
      paymentMode,
      employeeId: needsEmployee ? selectedEmployeeId?.toString() : undefined,
      employeeName: needsEmployee ? (selectedEmployee?.name || prefillEmployeeName) : undefined,
      vendorName: needsVendor ? vendorName || undefined : undefined,
      teamMealEmployeeIds: isMultiEmployeeCategory 
        ? multiSelectedEmployeeIds 
        : participantIds.length > 0 ? participantIds : undefined,
      teamMealEmployeeNames: isMultiEmployeeCategory
        ? multiSelectedEmployeeIds.map(id => employees.find(e => e.id === id)?.name || "").filter(Boolean)
        : participantIds.length > 0
          ? participantIds.map(id => employees.find(e => e.id === id)?.name || "").filter(Boolean)
          : undefined,
      reimbursement: willReimburse ? { enabled: true, amount: parseFloat(reimbursementAmount) || parseFloat(amount), status: "pending" } : undefined,
      billingMonth: needsMonth ? billingMonth : undefined,
      billPeriodStart: needsBillPeriod ? billPeriodStart : undefined,
      billPeriodEnd: needsBillPeriod ? billPeriodEnd : undefined,
      dueDate: needsDueDate ? dueDate : undefined,
      paidDate: paidDate || undefined,
      isRecurring,
    };
  };

  const handleSubmit = () => {
    const taxonomyResult = financeValidationService.validateExpense(
      (mainCategory === "site" ? "site_project" : mainCategory) as any,
      {
        projectId: selectedProjectId || undefined,
        employeeId: selectedEmployeeId ? String(selectedEmployeeId) : undefined,
        partnerId: selectedPartnerId || undefined,
        vendorId: vendorName || undefined,
        month: billingMonth || undefined,
        quantity: quantity ? Number(quantity) : undefined,
      },
    );
    if (!taxonomyResult.ok) {
      toast({
        title: "Expense Validation Failed",
        description: taxonomyResult.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid expense amount", variant: "destructive" });
      return;
    }
    try {
      const expense = buildExpense();
      const ok = addExpense(expense);
      if (!ok) {
        return;
      }
      toast({ title: "Expense Added", description: `₹${parsedAmount.toLocaleString()} recorded for ${categoryInfo?.label || category}` });
      resetForm();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save expense";
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    }
  };

  if (isProjectCompleted) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <AppSheetContent layout="form" size="sm">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Project Completed
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground py-4">This project is completed. Please reactivate it to add expenses.</p>
          <div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div>
        </AppSheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <AppSheetContent layout="form" size="lg">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Add Expense</SheetTitle>
          <SheetDescription>
            Step {steps.indexOf(step) + 1} of {steps.length}
            {mainCategory && <Badge variant="outline" className="ml-2">{EXPENSE_MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label}</Badge>}
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, idx) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${steps.indexOf(step) >= idx ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* ========== Step 1: Main Category ========== */}
        {step === "main-category" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">What type of expense is this?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXPENSE_MAIN_CATEGORIES.map(cat => (
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

        {/* ========== Step 2: Category + Context ========== */}
        {step === "category" && mainCategory && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Select Category</Label>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {getCategoriesByMainCategory(mainCategory).map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => { setCategory(cat.value); setSubCategory(""); setCustomSubCategory(""); setMultiSelectedEmployeeIds([]); setMultiEmployeeAmounts({}); }}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all text-sm ${
                    category === cat.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sub-categories */}
            {category && subCategories.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-category</Label>
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(sub => (
                      <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom sub-category input for multi-employee shared */}
            {isCustomSubAllowed && subCategory === "shared-other" && (
              <div className="space-y-2">
                <Label>Specify Reason</Label>
                <Input value={customSubCategory} onChange={(e) => setCustomSubCategory(e.target.value)} placeholder="e.g., Gym membership, Water bill" />
              </div>
            )}

            {/* Project selection - required for site expenses */}
            {needsProject && (
              <div className="space-y-2">
                <Label>Select Project *</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.status !== "Completed").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Optional project linking for employee expenses */}
            {!needsProject && optionalProject && (
              <div className="space-y-2">
                <Label>Link to Project (Optional)</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Choose a project (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.filter(p => p.status !== "Completed").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Partner main category: Level FIRST, then partner/site selection */}
            {needsPartner && mainCategory === "partner" && (
              <div className="space-y-3">
                {/* Level selection comes FIRST */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Level *</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setPartnerLevel("company"); setSelectedProjectId(""); setSelectedPartnerId(""); }}
                      className={`flex-1 p-2 rounded-lg border text-sm text-center transition-all ${
                        partnerLevel === "company" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      Company Level
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPartnerLevel("site"); setSelectedPartnerId(""); }}
                      className={`flex-1 p-2 rounded-lg border text-sm text-center transition-all ${
                        partnerLevel === "site" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      Site Level
                    </button>
                  </div>
                </div>

                {/* Site selection (only when site-level) - comes BEFORE partner */}
                {partnerLevel === "site" && (
                  <div className="space-y-2">
                    <Label>Select Site/Project *</Label>
                    <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setSelectedPartnerId(""); }}>
                      <SelectTrigger><SelectValue placeholder="Choose project" /></SelectTrigger>
                      <SelectContent>
                        {projects.filter(p => p.status !== "Completed").map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - {p.client}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Partner selection - filtered by site when site-level */}
                {(partnerLevel === "company" || (partnerLevel === "site" && selectedProjectId)) && (
                  <div className="space-y-2">
                    <Label>Select Partner *</Label>
                    <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                      <SelectTrigger><SelectValue placeholder="Choose a partner" /></SelectTrigger>
                      <SelectContent>
                        {(partnerLevel === "site" ? availablePartners : partners).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Partner selection for non-partner main categories (site expenses with partner payer etc.) */}
            {needsPartner && mainCategory !== "partner" && (
              <div className="space-y-2">
                <Label>Select Partner *</Label>
                <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Choose a partner" /></SelectTrigger>
                  <SelectContent>
                    {availablePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Multi-Employee Checkbox Selection for shared payment & reimbursement */}
            {isMultiEmployeeCategory && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {category === "employee-reimbursement" ? "Who Paid? (Select Employees) *" : "Select Employees *"}
                </Label>
                <div className="border rounded-lg p-3 max-h-[180px] overflow-y-auto space-y-2">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-3">
                      <Checkbox 
                        checked={multiSelectedEmployeeIds.includes(emp.id)} 
                        onCheckedChange={(checked) => {
                          if (checked) setMultiSelectedEmployeeIds(prev => [...prev, emp.id]);
                          else {
                            setMultiSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                            const n = { ...multiEmployeeAmounts }; delete n[emp.id]; setMultiEmployeeAmounts(n);
                          }
                        }} 
                      />
                      <span className="text-sm flex-1">{emp.name} <span className="text-muted-foreground">({emp.role})</span></span>
                    </div>
                  ))}
                </div>
                {multiSelectedEmployeeIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">{multiSelectedEmployeeIds.length} employee(s) selected</p>
                )}
              </div>
            )}

            {/* Single Employee selection (non-multi) */}
            {needsEmployee && !isMultiEmployeeCategory && (
              <div className="space-y-2">
                <Label>Select Employee *</Label>
                <Select value={selectedEmployeeId?.toString() || ""} onValueChange={(v) => setSelectedEmployeeId(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Choose an employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} - {emp.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Vendor selection */}
            {needsVendor && (
              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Enter vendor name" />
              </div>
            )}
          </div>
        )}

        {/* ========== Step 3: Details ========== */}
        {step === "details" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline">{categoryInfo?.label}</Badge>
              {subCategory && <Badge variant="secondary">{subCategories.find(s => s.value === subCategory)?.label}</Badge>}
              {customSubCategory && <Badge variant="secondary">{customSubCategory}</Badge>}
              {selectedEmployee && !isMultiEmployeeCategory && <Badge variant="secondary">{selectedEmployee.name}</Badge>}
              {selectedProject && <Badge variant="secondary">{selectedProject.name}</Badge>}
              {selectedPartnerId && <Badge variant="secondary">{partners.find(p => p.id === selectedPartnerId)?.name}</Badge>}
            </div>

            {/* Inventory Quick Select for Material */}
            {isMaterialExpense && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Quick Select from Inventory</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Select Item</Label>
                      <Select value={selectedInventoryItemId?.toString() || ""} onValueChange={(v) => setSelectedInventoryItemId(parseInt(v))}>
                        <SelectTrigger><SelectValue placeholder="Choose item" /></SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map(item => (
                            <SelectItem key={item.id} value={item.id.toString()}>{item.name} (₹{item.buyPrice}/{item.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
                      <Input type="number" placeholder="Enter qty" value={inventoryQuantity} onChange={(e) => setInventoryQuantity(e.target.value)} />
                    </div>
                  </div>
                  {selectedInventoryItem && inventoryQuantity && (
                    <div className="bg-primary/10 rounded-md p-2 text-sm">
                      <span className="font-medium">{selectedInventoryItem.name}</span>
                      <span className="text-muted-foreground"> × {inventoryQuantity} {selectedInventoryItem.unit} = </span>
                      <span className="font-semibold text-primary">₹{((parseFloat(inventoryQuantity) || 0) * selectedInventoryItem.buyPrice).toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Billing Period Section */}
            {needsMonth && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">Billing Period</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Month</Label>
                      <Input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
                    </div>
                    {needsDueDate && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Due Date</Label>
                        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      </div>
                    )}
                  </div>
                  {needsBillPeriod && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bill Period Start</Label>
                        <Input type="date" value={billPeriodStart} onChange={(e) => setBillPeriodStart(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Bill Period End</Label>
                        <Input type="date" value={billPeriodEnd} onChange={(e) => setBillPeriodEnd(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Paid Date</Label>
                    <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Core fields: Date + Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" min={selectedProject?.startDate || undefined} max={new Date().toISOString().split("T")[0]} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Per-employee amount inputs for multi-employee categories */}
            {isMultiEmployeeCategory && multiSelectedEmployeeIds.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {category === "employee-reimbursement" ? "Reimbursement per Employee" : "Amount per Employee"}
                </Label>
                <div className="border rounded-lg p-3 space-y-2">
                  {multiSelectedEmployeeIds.map(empId => {
                    const emp = employees.find(e => e.id === empId);
                    return (
                      <div key={empId} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{emp?.name}</span>
                        <Input 
                          type="number" 
                          placeholder="₹0" 
                          value={multiEmployeeAmounts[empId] || ""} 
                          onChange={(e) => setMultiEmployeeAmounts(prev => ({ ...prev, [empId]: e.target.value }))} 
                          className="w-28 h-8" 
                        />
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Total</span>
                    <span>₹{Object.values(multiEmployeeAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity/Unit for applicable categories */}
            {needsQuantity && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" placeholder="Enter quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input value={schemaUnit || unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., hours, pcs" readOnly={!!schemaUnit} />
                </div>
              </div>
            )}

            {/* Participants section - for team meals, team transport (NOT for multi-employee categories which use checkboxes in step 2) */}
            {isMultiEmployeeAllowed && !isMultiEmployeeCategory && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Who Participated? (for per-person tracking)</Label>
                <div className="border rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-3">
                      <Checkbox 
                        checked={participantIds.includes(emp.id)} 
                        onCheckedChange={(checked) => {
                          if (checked) setParticipantIds(prev => [...prev, emp.id]);
                          else setParticipantIds(prev => prev.filter(id => id !== emp.id));
                        }} 
                      />
                      <span className="text-sm">{emp.name}</span>
                    </div>
                  ))}
                </div>
                {participantIds.length > 0 && amount && (
                  <p className="text-xs text-muted-foreground">
                    {participantIds.length} participants • ₹{(parseFloat(amount) / participantIds.length).toFixed(0)}/person
                  </p>
                )}
              </div>
            )}

            {/* Recurring toggle */}
            <div className="flex items-center gap-3">
              <Checkbox id="recurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(!!c)} />
              <Label htmlFor="recurring" className="text-sm cursor-pointer">This is a recurring expense</Label>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
        )}

        {/* ========== Step 4: Who Paid + Payment Mode ========== */}
        {step === "payer" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Who Paid for This?</Label>
            
            {/* Payer type selection */}
            <div className="space-y-2">
              {(["company", "employee", "owner", "partner", "split"] as const)
                .filter(t => allowedPayers.includes(t))
                .map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPayerType(type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    payerType === type ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`flex-shrink-0 ${payerType === type ? "text-primary" : "text-muted-foreground"}`}>
                    {PAYER_ICONS[type]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{PAYER_LABELS[type]}</p>
                    {type === "company" && <p className="text-xs text-muted-foreground">Paid from company bank/cash</p>}
                    {type === "employee" && <p className="text-xs text-muted-foreground">An employee paid out of pocket</p>}
                    {type === "owner" && <p className="text-xs text-muted-foreground">Owner paid personally</p>}
                    {type === "partner" && <p className="text-xs text-muted-foreground">Partner paid for this expense</p>}
                    {type === "split" && <p className="text-xs text-muted-foreground">Multiple parties contributed</p>}
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    payerType === type ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {payerType === type && <Check className="w-3 h-3 text-primary-foreground m-auto" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Employee payer details */}
            {payerType === "employee" && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label className="text-sm">Which employee paid?</Label>
                <Select value={payerEmployeeId?.toString() || ""} onValueChange={(v) => setPayerEmployeeId(parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name} - {emp.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Partner payer details */}
            {payerType === "partner" && (
              <div className="space-y-2 border rounded-lg p-3">
                <Label className="text-sm">Which partner paid?</Label>
                <Select value={payerPartnerId} onValueChange={setPayerPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {availablePartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Split payment details */}
            {payerType === "split" && (
              <div className="space-y-3 border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Split Payment Breakdown</Label>
                  <span className={`text-xs font-medium ${
                    Math.abs(calculateSplitTotal() - (parseFloat(amount) || 0)) <= 1 ? "text-primary" : "text-destructive"
                  }`}>
                    ₹{calculateSplitTotal().toLocaleString()} / ₹{parseFloat(amount || "0").toLocaleString()}
                  </span>
                </div>

                {allowedPayers.includes("company") && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1">Company</span>
                    <Input type="number" placeholder="₹0" value={splitCompanyAmount} onChange={(e) => setSplitCompanyAmount(e.target.value)} className="w-28 h-8" />
                  </div>
                )}

                {allowedPayers.includes("owner") && (
                  <div className="flex items-center gap-3">
                    <Crown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1">Owner (MK)</span>
                    <Input type="number" placeholder="₹0" value={splitOwnerAmount} onChange={(e) => setSplitOwnerAmount(e.target.value)} className="w-28 h-8" />
                  </div>
                )}

                {allowedPayers.includes("employee") && (
                  <div className="border-t pt-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Employees</Label>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {employees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-3">
                          <Checkbox 
                            checked={splitEmployeeIds.includes(emp.id)} 
                            onCheckedChange={(c) => {
                              if (c) setSplitEmployeeIds(prev => [...prev, emp.id]);
                              else {
                                setSplitEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                const n = { ...splitEmployeeAmounts }; delete n[emp.id]; setSplitEmployeeAmounts(n);
                              }
                            }} 
                          />
                          <span className="text-sm flex-1">{emp.name}</span>
                          {splitEmployeeIds.includes(emp.id) && (
                            <Input type="number" placeholder="₹0" value={splitEmployeeAmounts[emp.id] || ""} onChange={(e) => setSplitEmployeeAmounts({ ...splitEmployeeAmounts, [emp.id]: e.target.value })} className="w-28 h-8" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allowedPayers.includes("partner") && availablePartners.length > 0 && (
                  <div className="border-t pt-2">
                    <Label className="text-xs text-muted-foreground mb-2 block">Partners</Label>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {availablePartners.map(p => (
                        <div key={p.id} className="flex items-center gap-3">
                          <Checkbox 
                            checked={splitPartnerIds.includes(p.id)} 
                            onCheckedChange={(c) => {
                              if (c) setSplitPartnerIds(prev => [...prev, p.id]);
                              else {
                                setSplitPartnerIds(prev => prev.filter(id => id !== p.id));
                                const n = { ...splitPartnerAmounts }; delete n[p.id]; setSplitPartnerAmounts(n);
                              }
                            }} 
                          />
                          <span className="text-sm flex-1">{p.name}</span>
                          {splitPartnerIds.includes(p.id) && (
                            <Input type="number" placeholder="₹0" value={splitPartnerAmounts[p.id] || ""} onChange={(e) => setSplitPartnerAmounts({ ...splitPartnerAmounts, [p.id]: e.target.value })} className="w-28 h-8" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Mode */}
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

            {/* Reimbursement toggle */}
            {canReimburse && (
              <div className="space-y-3 border rounded-lg p-3 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Checkbox id="reimburse" checked={willReimburse} onCheckedChange={(c) => setWillReimburse(!!c)} />
                  <Label htmlFor="reimburse" className="text-sm font-medium cursor-pointer">
                    Mark as reimbursable (Company will pay back)
                  </Label>
                </div>
                {willReimburse && (
                  <div className="flex items-center gap-3 ml-6">
                    <Label className="text-sm text-muted-foreground">Reimbursement Amount:</Label>
                    <Input type="number" placeholder={amount || "Full amount"} min="0" max={amount || undefined} value={reimbursementAmount} onChange={(e) => { const v = parseFloat(e.target.value); const max = parseFloat(amount) || 0; setReimbursementAmount(max > 0 && v > max ? amount : e.target.value); }} className="w-32 h-8" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== Step 5: Confirm ========== */}
        {step === "confirm" && (
          <div className="space-y-4">
            <Label className="text-base font-medium">Review & Confirm</Label>
            <Card className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{EXPENSE_MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label}</Badge>
                </div>
                {selectedProject && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-medium">{selectedProject.name}</span></div>
                )}
                {selectedEmployee && !isMultiEmployeeCategory && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="font-medium">{selectedEmployee.name}</span></div>
                )}
                {selectedPartnerId && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Partner</span><span className="font-medium">{partners.find(p => p.id === selectedPartnerId)?.name}</span></div>
                )}
                {isMultiEmployeeCategory && multiSelectedEmployeeIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employees</span>
                    <span className="font-medium text-right text-xs max-w-[200px]">
                      {multiSelectedEmployeeIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium">{categoryInfo?.label}{subCategory && ` → ${subCategories.find(s => s.value === subCategory)?.label}`}{customSubCategory && ` → ${customSubCategory}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold text-lg">₹{parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{new Date(date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Mode</span>
                  <span className="font-medium">{paymentMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid By</span>
                  <span className="font-medium">
                    {category === "employee-reimbursement"
                      ? "Employees (Reimbursement from Company)"
                      : payerType === "employee" && payerEmployeeId
                      ? employees.find(e => e.id === payerEmployeeId)?.name
                      : payerType === "partner" && payerPartnerId
                      ? partners.find(p => p.id === payerPartnerId)?.name
                      : payerType === "split" ? "Multiple (Split)"
                      : PAYER_LABELS[payerType]}
                  </span>
                </div>
                {participantIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium text-right text-xs">
                      {participantIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {needsMonth && <div className="flex justify-between"><span className="text-muted-foreground">Billing Month</span><span className="font-medium">{billingMonth}</span></div>}
                {vendorName && <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span className="font-medium">{vendorName}</span></div>}
                {willReimburse && <div className="flex justify-between text-primary"><span>Reimbursement</span><span className="font-medium">₹{(parseFloat(reimbursementAmount) || parseFloat(amount)).toLocaleString()}</span></div>}
                {notes && <div className="pt-2 border-t"><span className="text-muted-foreground text-sm">Notes: </span><span className="text-sm">{notes}</span></div>}

                {/* Ledger Impact Preview */}
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ledger Impact</p>
                  <div className="text-xs space-y-1">
                    {payerType === "company" && (
                      <p>• Company Ledger: <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>
                    )}
                    {payerType === "employee" && payerEmployeeId && (
                      <>
                        <p>• {employees.find(e => e.id === payerEmployeeId)?.name} paid: <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>
                        {willReimburse && <p>• Company Liability: <span className="text-amber-500">+₹{(parseFloat(reimbursementAmount) || parseFloat(amount)).toLocaleString()} (owes employee)</span></p>}
                      </>
                    )}
                    {payerType === "owner" && (
                      <>
                        <p>• Owner Ledger: <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>
                        {willReimburse && <p>• Company Liability: <span className="text-amber-500">+₹{(parseFloat(reimbursementAmount) || parseFloat(amount)).toLocaleString()} (owes owner)</span></p>}
                      </>
                    )}
                    {payerType === "partner" && payerPartnerId && (
                      <p>• {partners.find(p => p.id === payerPartnerId)?.name} Ledger: <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>
                    )}
                    {payerType === "split" && (
                      <>
                        {parseFloat(splitCompanyAmount) > 0 && <p>• Company: <span className="text-destructive">-₹{parseFloat(splitCompanyAmount).toLocaleString()}</span></p>}
                        {parseFloat(splitOwnerAmount) > 0 && <p>• Owner: <span className="text-destructive">-₹{parseFloat(splitOwnerAmount).toLocaleString()}</span></p>}
                        {splitEmployeeIds.map(id => {
                          const amt = parseFloat(splitEmployeeAmounts[id] || "0");
                          return amt > 0 ? <p key={id}>• {employees.find(e => e.id === id)?.name}: <span className="text-destructive">-₹{amt.toLocaleString()}</span></p> : null;
                        })}
                        {splitPartnerIds.map(id => {
                          const amt = parseFloat(splitPartnerAmounts[id] || "0");
                          return amt > 0 ? <p key={id}>• {partners.find(p => p.id === id)?.name}: <span className="text-destructive">-₹{amt.toLocaleString()}</span></p> : null;
                        })}
                      </>
                    )}
                    {needsProject && selectedProject && <p>• Site Ledger ({selectedProject.name}): <span className="text-destructive">-₹{parseFloat(amount).toLocaleString()}</span></p>}
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
            <Button onClick={handleSubmit}><Check className="w-4 h-4 mr-2" />Confirm & Save</Button>
          ) : (
            <Button onClick={goNext}>Next<ArrowRight className="w-4 h-4 ml-2" /></Button>
          )}
        </div>
      </AppSheetContent>
    </Sheet>
  );
}

import { useState, useEffect } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Crown, Handshake, Split, AlertCircle } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Expense } from "@/types/finance";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  // If true, shows partnership project options (partner as payer)
  isPartnershipProject?: boolean;
  projectPartnerIds?: string[];
}

export const AddExpenseModal = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  isPartnershipProject = false,
  projectPartnerIds = []
}: AddExpenseModalProps) => {
  const { employees, partners, addExpense, generateId } = useAppData();
  
  // Form state
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Who paid - enhanced
  const [payerType, setPayerType] = useState<"company" | "employee" | "owner" | "partner" | "split">("company");
  const [ownerSubType, setOwnerSubType] = useState("");
  
  // Multi-payer state for employees
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [employeeAmounts, setEmployeeAmounts] = useState<Record<number, string>>({});
  
  // Multi-payer state for partners
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [partnerAmounts, setPartnerAmounts] = useState<Record<string, string>>({});
  
  // Split payment state
  const [splitIncludeCompany, setSplitIncludeCompany] = useState(false);
  const [splitCompanyAmount, setSplitCompanyAmount] = useState("");
  const [splitIncludeOwner, setSplitIncludeOwner] = useState(false);
  const [splitOwnerAmount, setSplitOwnerAmount] = useState("");
  
  // Material source for material category
  const [materialSource, setMaterialSource] = useState<"inventory" | "purchased">("purchased");
  
  // Confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Get expense categories
  const expenseCategories = [
    { value: "labour", label: "Labour" },
    { value: "transport", label: "Transport" },
    { value: "material", label: "Material" },
    { value: "commission", label: "Commission" },
    { value: "food", label: "Food" },
    { value: "stay", label: "Stay" },
    { value: "medical", label: "Medical" },
    { value: "mk-owner", label: "MK (Owner)" },
    { value: "outsource", label: "Outsource Work" },
    { value: "infrastructure", label: "Infrastructure" },
    { value: "other", label: "Other" },
  ];
  
  // Company reimbursement state
  const [willReimburse, setWillReimburse] = useState(false);
  const [reimbursementAmount, setReimbursementAmount] = useState("");
  
  // Get sub-categories based on category
  const getSubCategories = (cat: string) => {
    switch (cat) {
      case "labour":
        return [
          { value: "salary", label: "Salary" },
          { value: "overtime", label: "Overtime" },
          { value: "advance", label: "Advance" },
          { value: "employee-expense", label: "Employee Expense" },
        ];
      case "transport":
        return [
          { value: "vehicle-rent", label: "Vehicle Rent" },
          { value: "fuel", label: "Fuel" },
          { value: "driver", label: "Driver" },
          { value: "toll-parking", label: "Toll / Parking" },
          { value: "labour-transport", label: "Labour Transport" },
        ];
      case "mk-owner":
        return [
          { value: "investment", label: "Investment / Capital" },
          { value: "withdrawal", label: "Withdrawal" },
          { value: "food", label: "Food" },
          { value: "transport", label: "Transport" },
          { value: "emi", label: "EMI Payment" },
          { value: "personal", label: "Personal" },
        ];
      case "outsource":
        return [
          { value: "jcb-work", label: "JCB Work" },
          { value: "pani-tanker", label: "Pani Tanker" },
          { value: "crane-work", label: "Crane Work" },
          { value: "site-cleaning", label: "Site Cleaning" },
          { value: "other", label: "Other" },
        ];
      default:
        return [];
    }
  };
  
  // Reset form
  const resetForm = () => {
    setCategory("");
    setSubCategory("");
    setAmount("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    setPayerType("company");
    setOwnerSubType("");
    setSelectedEmployeeIds([]);
    setEmployeeAmounts({});
    setSelectedPartnerIds([]);
    setPartnerAmounts({});
    setSplitIncludeCompany(false);
    setSplitCompanyAmount("");
    setSplitIncludeOwner(false);
    setSplitOwnerAmount("");
    setMaterialSource("purchased");
    setShowConfirmation(false);
    setWillReimburse(false);
    setReimbursementAmount("");
  };
  
  // Handle employee selection
  const handleEmployeeToggle = (empId: number, checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(prev => [...prev, empId]);
    } else {
      setSelectedEmployeeIds(prev => prev.filter(id => id !== empId));
      const newAmounts = { ...employeeAmounts };
      delete newAmounts[empId];
      setEmployeeAmounts(newAmounts);
    }
  };
  
  // Handle partner selection
  const handlePartnerToggle = (partnerId: string, checked: boolean) => {
    if (checked) {
      setSelectedPartnerIds(prev => [...prev, partnerId]);
    } else {
      setSelectedPartnerIds(prev => prev.filter(id => id !== partnerId));
      const newAmounts = { ...partnerAmounts };
      delete newAmounts[partnerId];
      setPartnerAmounts(newAmounts);
    }
  };
  
  // Calculate total from split amounts
  const calculateSplitTotal = () => {
    let total = 0;
    if (splitIncludeCompany) total += parseFloat(splitCompanyAmount) || 0;
    if (splitIncludeOwner) total += parseFloat(splitOwnerAmount) || 0;
    selectedEmployeeIds.forEach(id => {
      total += parseFloat(employeeAmounts[id] || "0");
    });
    selectedPartnerIds.forEach(id => {
      total += parseFloat(partnerAmounts[id] || "0");
    });
    return total;
  };
  
  // Validate form
  const isFormValid = () => {
    if (!category || !amount || parseFloat(amount) <= 0) return false;
    if (payerType === "employee" && selectedEmployeeIds.length === 0) return false;
    if (payerType === "partner" && selectedPartnerIds.length === 0) return false;
    if (payerType === "split") {
      const total = calculateSplitTotal();
      const diff = Math.abs(total - parseFloat(amount));
      if (diff > 0.01 && total > 0) return false; // Allow small rounding errors
    }
    return true;
  };
  
  // Build paidBy object
  const buildPaidBy = (): Expense["paidBy"] => {
    switch (payerType) {
      case "company":
        return { type: "company" };
      case "employee":
        if (selectedEmployeeIds.length === 1) {
          const emp = employees.find(e => e.id === selectedEmployeeIds[0]);
          return { 
            type: "employee", 
            entityId: selectedEmployeeIds[0].toString(),
            entityName: emp?.name
          };
        }
        return {
          type: "employee",
          splits: selectedEmployeeIds.map(id => ({
            entityId: id.toString(),
            entityType: "employee",
            entityName: employees.find(e => e.id === id)?.name || "",
            amount: parseFloat(employeeAmounts[id] || "0")
          }))
        };
      case "owner":
        return { type: "owner", entityName: "MK" };
      case "partner":
        if (selectedPartnerIds.length === 1) {
          const partner = partners.find(p => p.id === selectedPartnerIds[0]);
          return { 
            type: "partner", 
            entityId: selectedPartnerIds[0],
            entityName: partner?.name
          };
        }
        return {
          type: "partner",
          splits: selectedPartnerIds.map(id => ({
            entityId: id,
            entityType: "partner",
            entityName: partners.find(p => p.id === id)?.name || "",
            amount: parseFloat(partnerAmounts[id] || "0")
          }))
        };
      case "split":
        const splits: Expense["paidBy"]["splits"] = [];
        if (splitIncludeCompany && parseFloat(splitCompanyAmount) > 0) {
          splits.push({ entityId: "company", entityType: "company", entityName: "Company", amount: parseFloat(splitCompanyAmount) });
        }
        if (splitIncludeOwner && parseFloat(splitOwnerAmount) > 0) {
          splits.push({ entityId: "owner", entityType: "owner", entityName: "MK (Owner)", amount: parseFloat(splitOwnerAmount) });
        }
        selectedEmployeeIds.forEach(id => {
          if (parseFloat(employeeAmounts[id] || "0") > 0) {
            splits.push({
              entityId: id.toString(),
              entityType: "employee",
              entityName: employees.find(e => e.id === id)?.name || "",
              amount: parseFloat(employeeAmounts[id] || "0")
            });
          }
        });
        selectedPartnerIds.forEach(id => {
          if (parseFloat(partnerAmounts[id] || "0") > 0) {
            splits.push({
              entityId: id,
              entityType: "partner",
              entityName: partners.find(p => p.id === id)?.name || "",
              amount: parseFloat(partnerAmounts[id] || "0")
            });
          }
        });
        return { type: "company", splits }; // Default type for splits
      default:
        return { type: "company" };
    }
  };
  
  // Handle save
  const handleSave = () => {
    const expense: Expense = {
      id: generateId("EXP"),
      date,
      amount: parseFloat(amount),
      projectId,
      projectName,
      category,
      subCategory: subCategory || undefined,
      paidBy: buildPaidBy(),
      notes: notes || undefined,
      description: notes || undefined,
    };
    
    addExpense(expense);
    
    toast({
      title: "Expense Added",
      description: `₹${parseFloat(amount).toLocaleString()} expense recorded for ${category}`,
    });
    
    resetForm();
    onClose();
  };
  
  // Auto-distribute remaining amount to last payer in split mode
  useEffect(() => {
    if (payerType === "split" && amount) {
      const total = parseFloat(amount);
      const currentSum = calculateSplitTotal();
      // Could auto-fill last person but keeping manual for now
    }
  }, [payerType, amount, splitCompanyAmount, splitOwnerAmount, employeeAmounts, partnerAmounts]);
  
  // Filter partners for partnership projects
  const availablePartners = isPartnershipProject && projectPartnerIds.length > 0
    ? partners.filter(p => projectPartnerIds.includes(p.id))
    : partners;
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
      <AppSheetContent layout="form" size="md">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Add Expense</SheetTitle>
          {projectName && (
            <SheetDescription>
              Recording expense for: <span className="font-medium text-primary">{projectName}</span>
            </SheetDescription>
          )}
        </SheetHeader>
        
        <div className="space-y-4 py-4">
          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setSubCategory(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sub-category */}
          {category && getSubCategories(category).length > 0 && (
            <div className="space-y-2">
              <Label>Sub-category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {getSubCategories(category).map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Material source for material category */}
          {category === "material" && (
            <div className="space-y-2">
              <Label>Source</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="materialSource" 
                    value="inventory" 
                    checked={materialSource === "inventory"}
                    onChange={() => setMaterialSource("inventory")}
                    className="accent-primary"
                  />
                  <span className="text-sm">From Inventory</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="materialSource" 
                    value="purchased"
                    checked={materialSource === "purchased"}
                    onChange={() => setMaterialSource("purchased")}
                    className="accent-primary"
                  />
                  <span className="text-sm">Purchased</span>
                </label>
              </div>
            </div>
          )}
          
          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input 
              type="number" 
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          
          {/* Who Paid Section */}
          <div className="space-y-3">
            <Label>Who Paid?</Label>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setPayerType("company")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  payerType === "company" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Building2 className={`w-5 h-5 ${payerType === "company" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs">Company</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPayerType("employee")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  payerType === "employee" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <User className={`w-5 h-5 ${payerType === "employee" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs">Employee</span>
              </button>
              
              <button
                type="button"
                onClick={() => setPayerType("owner")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  payerType === "owner" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Crown className={`w-5 h-5 ${payerType === "owner" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs">Owner</span>
              </button>
              
              {(isPartnershipProject || partners.length > 0) && (
                <button
                  type="button"
                  onClick={() => setPayerType("partner")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                    payerType === "partner" 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Handshake className={`w-5 h-5 ${payerType === "partner" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs">Partner</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setPayerType("split")}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  payerType === "split" 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Split className={`w-5 h-5 ${payerType === "split" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs">Split</span>
              </button>
            </div>
          </div>
          
          {/* Employee Selection (for employee payer type) */}
          {payerType === "employee" && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <Label>Select Employee(s) Who Paid</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {employees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <Checkbox 
                      id={`emp-${emp.id}`}
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onCheckedChange={(checked) => handleEmployeeToggle(emp.id, checked as boolean)}
                    />
                    <label htmlFor={`emp-${emp.id}`} className="flex-1 text-sm cursor-pointer">
                      {emp.name}
                      <span className="text-xs text-muted-foreground ml-2">({emp.role})</span>
                    </label>
                    {selectedEmployeeIds.includes(emp.id) && selectedEmployeeIds.length > 1 && (
                      <Input 
                        type="number"
                        placeholder="Amount"
                        className="w-24 h-8"
                        value={employeeAmounts[emp.id] || ""}
                        onChange={(e) => setEmployeeAmounts(prev => ({ ...prev, [emp.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEmployeeIds.length > 1 
                  ? "Enter amount each employee paid" 
                  : "Select employee(s) who paid for this expense"}
              </p>
              
              {/* Company Reimbursement Option */}
              {selectedEmployeeIds.length > 0 && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="will-reimburse"
                      checked={willReimburse}
                      onCheckedChange={(checked) => setWillReimburse(checked as boolean)}
                    />
                    <label htmlFor="will-reimburse" className="text-sm cursor-pointer flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Company will reimburse
                    </label>
                  </div>
                  {willReimburse && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Reimbursement Amount:</Label>
                      <Input 
                        type="number"
                        placeholder={amount || "0"}
                        className="w-32 h-8"
                        value={reimbursementAmount}
                        onChange={(e) => setReimbursementAmount(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => setReimbursementAmount(amount)}
                      >
                        Full Amount
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Partner Selection (for partner payer type) */}
          {payerType === "partner" && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <Label>Select Partner(s) Who Paid</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availablePartners.map((partner) => (
                  <div key={partner.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <Checkbox 
                      id={`partner-${partner.id}`}
                      checked={selectedPartnerIds.includes(partner.id)}
                      onCheckedChange={(checked) => handlePartnerToggle(partner.id, checked as boolean)}
                    />
                    <label htmlFor={`partner-${partner.id}`} className="flex-1 text-sm cursor-pointer">
                      {partner.name}
                      <span className="text-xs text-muted-foreground ml-2">({partner.partnerCategory ?? "partner"})</span>
                    </label>
                    {selectedPartnerIds.includes(partner.id) && selectedPartnerIds.length > 1 && (
                      <Input 
                        type="number"
                        placeholder="Amount"
                        className="w-24 h-8"
                        value={partnerAmounts[partner.id] || ""}
                        onChange={(e) => setPartnerAmounts(prev => ({ ...prev, [partner.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Owner sub-type selection */}
          {payerType === "owner" && (
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              <Label>Owner Expense Type</Label>
              <Select value={ownerSubType} onValueChange={setOwnerSubType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Investment / Capital</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="emi">EMI Payment</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Split Payment Configuration */}
          {payerType === "split" && (
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="flex items-center gap-2">
                <Split className="w-4 h-4" />
                Split Payment Distribution
              </Label>
              <p className="text-xs text-muted-foreground">
                Total: ₹{amount || "0"} | Allocated: ₹{calculateSplitTotal().toLocaleString()}
                {amount && Math.abs(calculateSplitTotal() - parseFloat(amount)) > 0.01 && (
                  <span className="text-destructive ml-2">
                    (Difference: ₹{Math.abs(calculateSplitTotal() - parseFloat(amount)).toLocaleString()})
                  </span>
                )}
              </p>
              
              <div className="space-y-2">
                {/* Company */}
                <div className="flex items-center gap-3 p-2 border rounded-lg">
                  <Checkbox 
                    id="split-company"
                    checked={splitIncludeCompany}
                    onCheckedChange={(checked) => setSplitIncludeCompany(checked as boolean)}
                  />
                  <label htmlFor="split-company" className="flex-1 text-sm cursor-pointer">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Company
                  </label>
                  {splitIncludeCompany && (
                    <Input 
                      type="number"
                      placeholder="Amount"
                      className="w-24 h-8"
                      value={splitCompanyAmount}
                      onChange={(e) => setSplitCompanyAmount(e.target.value)}
                    />
                  )}
                </div>
                
                {/* Owner */}
                <div className="flex items-center gap-3 p-2 border rounded-lg">
                  <Checkbox 
                    id="split-owner"
                    checked={splitIncludeOwner}
                    onCheckedChange={(checked) => setSplitIncludeOwner(checked as boolean)}
                  />
                  <label htmlFor="split-owner" className="flex-1 text-sm cursor-pointer">
                    <Crown className="w-4 h-4 inline mr-2" />
                    Owner (MK)
                  </label>
                  {splitIncludeOwner && (
                    <Input 
                      type="number"
                      placeholder="Amount"
                      className="w-24 h-8"
                      value={splitOwnerAmount}
                      onChange={(e) => setSplitOwnerAmount(e.target.value)}
                    />
                  )}
                </div>
                
                {/* Employees */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Employees</p>
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-2 border rounded-lg mb-1">
                      <Checkbox 
                        id={`split-emp-${emp.id}`}
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onCheckedChange={(checked) => handleEmployeeToggle(emp.id, checked as boolean)}
                      />
                      <label htmlFor={`split-emp-${emp.id}`} className="flex-1 text-sm cursor-pointer">
                        {emp.name}
                      </label>
                      {selectedEmployeeIds.includes(emp.id) && (
                        <Input 
                          type="number"
                          placeholder="Amount"
                          className="w-24 h-8"
                          value={employeeAmounts[emp.id] || ""}
                          onChange={(e) => setEmployeeAmounts(prev => ({ ...prev, [emp.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Partners (if available) */}
                {availablePartners.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Partners</p>
                    {availablePartners.map((partner) => (
                      <div key={partner.id} className="flex items-center gap-3 p-2 border rounded-lg mb-1">
                        <Checkbox 
                          id={`split-partner-${partner.id}`}
                          checked={selectedPartnerIds.includes(partner.id)}
                          onCheckedChange={(checked) => handlePartnerToggle(partner.id, checked as boolean)}
                        />
                        <label htmlFor={`split-partner-${partner.id}`} className="flex-1 text-sm cursor-pointer">
                          {partner.name}
                        </label>
                        {selectedPartnerIds.includes(partner.id) && (
                          <Input 
                            type="number"
                            placeholder="Amount"
                            className="w-24 h-8"
                            value={partnerAmounts[partner.id] || ""}
                            onChange={(e) => setPartnerAmounts(prev => ({ ...prev, [partner.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea 
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
            Cancel
          </Button>
          <Button 
            className="bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={!isFormValid()}
          >
            Save Expense
          </Button>
        </div>
      </AppSheetContent>
    </Sheet>
  );
};

export default AddExpenseModal;

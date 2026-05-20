import { useEffect, useMemo, useState } from "react";
import { Plus, User, Briefcase, Upload, X, ChevronLeft, ChevronRight, IndianRupee, AlertCircle, Check, Filter, ClipboardList, Users } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { showPermissionDeniedToastForAction } from "@/lib/permissionFeedback";
import { validateContactPhone } from "@/lib/phoneValidators";
import type { Employee } from "@/types/project";
import type { EmployeePayrollRecord } from "@/types/finance";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { UnifiedExpenseSheet } from "@/components/expenses/UnifiedExpenseSheet";
import { TaskAssignmentSheet } from "@/components/employees/TaskAssignmentSheet";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { useCan } from "@/hooks/useCan";
import { formPrimaryLabel, FORM_CREATE_LABEL } from "@/lib/formActionLabels";
import { formatINR } from "@/lib/formatCurrency";

// Data is pulled from AppDataContext and MastersContext

interface UploadedDoc {
  name: string;
  preview: string;
}

const Employees = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateEmployee = useCan("employee", "create");
  const canEditEmployee = useCan("employee", "edit");
  const canCreatePayroll = useCan("payroll", "create");
  const { employees: contextEmployees, attendanceRecords, expenses: contextExpenses, sites, addEmployee, addEmployeePayrollRecord, updateEmployee, addExpense, generateId } = useAppData();

  // Use context employees with extended fields for display
  const employees = contextEmployees.map(emp => ({
    ...emp,
    site: "Office / Idle",
    wallet: emp.pendingAmount || 0,
    initial: emp.initial || emp.name.charAt(0),
    aadhar: emp.aadhar || "",
    dob: emp.dob || "",
    joiningDate: emp.joiningDate || "",
    daysPresent: attendanceRecords.filter(r => r.employeeId === emp.id && r.status === "present").length,
    daysAbsent: attendanceRecords.filter(r => r.employeeId === emp.id && r.status === "absent").length,
    holidays: attendanceRecords.filter(r => r.employeeId === emp.id && r.status === "holiday").length,
  }));

  const refMonthPrefix = format(new Date(), "yyyy-MM");
  const payrollRowExtras = useMemo(() => {
    const map = new Map<string, { currentSite: string; hoursThisMonth: number }>();
    for (const emp of contextEmployees) {
      const monthRecs = attendanceRecords.filter((r) => r.employeeId === emp.id && r.date.startsWith(refMonthPrefix));
      let hours = 0;
      for (const r of monthRecs) {
        if (r.status === "present") hours += 8;
        else if (r.status === "half-day") hours += 4;
      }
      const pick = [...attendanceRecords]
        .filter((r) => r.employeeId === emp.id && (r.status === "present" || r.status === "half-day"))
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const site = pick?.sites?.[0]?.trim() || "—";
      map.set(emp.id, { currentSite: site, hoursThisMonth: hours });
    }
    return map;
  }, [contextEmployees, attendanceRecords, refMonthPrefix]);

  // Build deployment data: employees with weekly schedule derived from attendance
  const deploymentData = useMemo(() => {
    return contextEmployees.map(emp => {
      const schedule = Array.from({ length: 31 }, (_, day) => {
        const dateStr = `2024-12-${String(day + 1).padStart(2, "0")}`;
        const rec = attendanceRecords.find(r => r.employeeId === emp.id && r.date === dateStr);
        if (!rec) return "-";
        if (rec.status === "holiday") return "Holiday";
        if (rec.status === "absent") return "-";
        return "Office";
      });
      return { id: emp.id, name: emp.name, role: emp.role, avatar: (emp.initial || emp.name.charAt(0)), schedule };
    });
  }, [contextEmployees, attendanceRecords]);

  // Build payroll months: last 12 months with pending salary per employee (filled per selected employee)
  const payrollMonthsList = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-IN", { month: "long", year: "numeric" }),
      });
    }
    return months;
  }, []);

  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab");
    return t === "deployment" ? "deployment" : "payroll";
  });
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isEmployeeSavedOpen, setIsEmployeeSavedOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [isExpenseConfirmOpen, setIsExpenseConfirmOpen] = useState(false);
  const [selectedEmployeeForExpense, setSelectedEmployeeForExpense] = useState<typeof employees[0] | null>(null);
  const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState<typeof employees[0] | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedEmployeeForTask, setSelectedEmployeeForTask] = useState<typeof employees[0] | null>(null);
  
  // Expense form state
  const [expenseSite, setExpenseSite] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseItem, setExpenseItem] = useState("");
  const [expenseCostAllocation, setExpenseCostAllocation] = useState("reimburse");
  const [_isInventoryItem, setIsInventoryItem] = useState(false);
  const [expenseWhoPaid, setExpenseWhoPaid] = useState("company");
  const [expenseAmount, setExpenseAmount] = useState("");
  
  // Pay salary form state
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["dec-2024"]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<EmployeePayrollRecord["mode"]>("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  /** E3: when employee + month(s) are selected in Pay Salary, pre-fill amount from attendance and net of advances. */
  useEffect(() => {
    if (!isPaySalaryOpen || !selectedEmployeeForPayment || selectedMonths.length === 0) return;
    const emp = contextEmployees.find((e) => e.id === selectedEmployeeForPayment.id);
    if (!emp) return;
    const dailyRate = (emp.salary || 0) / 26;
    let daysPresent = 0;
    selectedMonths.forEach((mv) => {
      attendanceRecords.forEach((r) => {
        if (r.employeeId !== emp.id || !r.date.startsWith(mv)) return;
        if (r.status === "present" || r.status === "paid_leave") daysPresent += 1;
      });
    });
    const advanceTotal = contextExpenses.reduce((sum, ex) => {
      if (String(ex.employeeId) !== String(emp.id)) return sum;
      const cat = (ex.category || "").toLowerCase();
      if (!cat.includes("advance")) return sum;
      if (!selectedMonths.some((mv) => ex.date?.startsWith(mv))) return sum;
      return sum + (ex.amount || 0);
    }, 0);
    const suggested = Math.max(0, Math.round(daysPresent * dailyRate - advanceTotal));
    setPaymentAmount(String(suggested));
  }, [isPaySalaryOpen, selectedEmployeeForPayment, selectedMonths, contextEmployees, attendanceRecords, contextExpenses]);

  // Add employee form state (B9 — was fully uncontrolled)
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpPhone, setNewEmpPhone] = useState("");
  const [newEmpAddress, setNewEmpAddress] = useState("");
  const [newEmpAadhar, setNewEmpAadhar] = useState("");
  const [newEmpDob, setNewEmpDob] = useState("");
  const [newEmpAltPhone, setNewEmpAltPhone] = useState("");
  const [newEmpSalary, setNewEmpSalary] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("");
  const [newEmpJoiningDate, setNewEmpJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  
  // Months for Pay Salary modal: last 12 months with pending amount per selected employee
  const months = useMemo(() => {
    if (!selectedEmployeeForPayment) return payrollMonthsList.map(m => ({ ...m, pending: 0 }));
    const emp = contextEmployees.find(e => e.id === selectedEmployeeForPayment.id);
    if (!emp) return payrollMonthsList.map(m => ({ ...m, pending: 0 }));
    const dailyRate = (emp.salary || 0) / 26;
    return payrollMonthsList.map(m => {
      const present = attendanceRecords.filter(r =>
        r.employeeId === emp.id &&
        r.status === "present" &&
        r.date.startsWith(m.value)
      ).length;
      const computed = Math.round(present * dailyRate);
      return { ...m, pending: computed };
    });
  }, [selectedEmployeeForPayment, contextEmployees, attendanceRecords, payrollMonthsList]);

  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Employee filter for deployment board
  const [selectedEmployeeFilters, setSelectedEmployeeFilters] = useState<number[]>(() => {
    const raw = searchParams.get("emp");
    if (!raw) return [];
    return raw.split(",").map((s) => Number(s)).filter((n) => !Number.isNaN(n));
  });

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (activeTab !== "payroll") next.set("tab", activeTab);
        else next.delete("tab");
        const emp = selectedEmployeeFilters.join(",");
        if (emp) next.set("emp", emp);
        else next.delete("emp");
        return next;
      },
      { replace: true },
    );
  }, [activeTab, selectedEmployeeFilters, setSearchParams]);

  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPageSize, setPayrollPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [deploymentPage, setDeploymentPage] = useState(1);
  const [deploymentPageSize, setDeploymentPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const [shellReady, setShellReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShellReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  
  // Upload docs state
  const [uploadedAadhar, setUploadedAadhar] = useState<UploadedDoc | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedDoc | null>(null);
  const [uploadedOthers, setUploadedOthers] = useState<UploadedDoc | null>(null);

  // Prototype document picker. Opens an ephemeral <input type="file"> via the browser so the
  // upload buttons below are not "dead" — selected images are previewed locally without leaving
  // the browser. Replace with the real backend upload once persistence is in place.
  const pickDocument = (setter: (doc: UploadedDoc | null) => void, label: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setter({ name: file.name, preview: String(reader.result ?? "") });
      };
      reader.readAsDataURL(file);
    };
    input.click();
    // `label` is currently informational; kept on the call sites so future toast/audit can read it.
    void label;
  };

  // Generate week days
  const generateWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(currentWeekStart, i);
      days.push({
        day: format(dayDate, 'EEE'),
        date: format(dayDate, 'd'),
        fullDate: format(dayDate, 'd MMM'),
        dateObj: dayDate,
      });
    }
    return days;
  };

  const weekDays = generateWeekDays();

  const handlePrevWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
    setDeploymentPage(1);
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
    setDeploymentPage(1);
  };

  const handleSaveEmployee = () => {
    if (!newEmpName.trim() || !newEmpRole) return;
    const mainPh = validateContactPhone(newEmpPhone);
    if (!mainPh.ok) {
      toast({ title: "Invalid phone", description: (mainPh as { message: string }).message, variant: "destructive" });
      return;
    }
    const altPh = validateContactPhone(newEmpAltPhone);
    if (!altPh.ok) {
      toast({ title: "Invalid alternate phone", description: (altPh as { message: string }).message, variant: "destructive" });
      return;
    }
    const newEmployee: Employee = {
      id: Date.now(),
      name: newEmpName.trim(),
      initial: newEmpName.trim().charAt(0).toUpperCase(),
      role: newEmpRole,
      phone: newEmpPhone,
      email: "",
      status: "Active",
      site: "Office / Idle",
      salary: parseFloat(newEmpSalary) || 0,
      wallet: 0,
      aadhar: newEmpAadhar,
      dob: newEmpDob,
      joiningDate: newEmpJoiningDate,
      daysPresent: 0,
      daysAbsent: 0,
      holidays: 0,
      advancePaid: 0,
      pendingAmount: parseFloat(newEmpSalary) || 0,
    };
    addEmployee(newEmployee);
    setIsAddEmployeeOpen(false);
    setIsEmployeeSavedOpen(true);
    setNewEmpName(""); setNewEmpPhone(""); setNewEmpAddress("");
    setNewEmpAadhar(""); setNewEmpDob(""); setNewEmpAltPhone("");
    setNewEmpSalary(""); setNewEmpRole(""); setNewEmpJoiningDate(new Date().toISOString().slice(0, 10));
  };

  const handleAddExpense = (emp: typeof employees[0]) => {
    setSelectedEmployeeForExpense(emp);
    setExpenseSite("");
    setExpenseCategory("");
    setExpenseItem("");
    setExpenseCostAllocation("reimburse");
    setIsInventoryItem(false);
    setExpenseWhoPaid("company");
    setExpenseAmount("");
    setIsAddExpenseOpen(true);
  };

  const handlePaySalary = (emp: typeof employees[0]) => {
    if (!canCreatePayroll) {
      showPermissionDeniedToastForAction("hr:release_payroll");
      return;
    }
    setSelectedEmployeeForPayment(emp);
    // Default to current month
    const now = new Date();
    const currentMonthVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonths([currentMonthVal]);
    // Auto-fill: compute this month's salary from attendance
    const dailyRate = (emp.salary || 0) / 26;
    const presentThisMonth = attendanceRecords.filter(
      r => r.employeeId === emp.id && r.status === "present" && r.date.startsWith(currentMonthVal)
    ).length;
    const autoAmount = presentThisMonth > 0 ? Math.round(presentThisMonth * dailyRate) : (emp.pendingAmount > 0 ? emp.pendingAmount : emp.salary || 0);
    setPaymentAmount(autoAmount.toString());
    setIsPaySalaryOpen(true);
  };

  const handleMonthToggle = (monthValue: string) => {
    setSelectedMonths(prev => 
      prev.includes(monthValue) 
        ? prev.filter(m => m !== monthValue)
        : [...prev, monthValue]
    );
  };

  const handleExpenseSubmit = () => {
    setIsAddExpenseOpen(false);
    setIsExpenseConfirmOpen(true);
  };

  const handleEmployeeClick = (empId: number) => {
    navigate(`/employees/${empId}`);
  };

  // Get schedule for a specific day
  const getScheduleForDay = (emp: typeof deploymentData[0], dayDate: Date) => {
    const dayOfMonth = dayDate.getDate() - 1;
    if (dayOfMonth >= 0 && dayOfMonth < emp.schedule.length) {
      return emp.schedule[dayOfMonth];
    }
    return "-";
  };

  // Calculate total pending from selected months
  const getTotalSelectedPending = () => {
    return selectedMonths.reduce((sum, monthVal) => {
      const month = months.find(m => m.value === monthVal);
      return sum + (month?.pending || 0);
    }, 0);
  };

  const isAmountExceedsPending = () => {
    const amount = parseFloat(paymentAmount) || 0;
    const totalPending = getTotalSelectedPending();
    return amount > totalPending && totalPending > 0;
  };

  // Toggle employee filter
  const toggleEmployeeFilter = (empId: number) => {
    setSelectedEmployeeFilters((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
    setDeploymentPage(1);
  };

  // Filter deployment data based on selected employees
  const filteredDeploymentData = useMemo(
    () =>
      selectedEmployeeFilters.length > 0
        ? deploymentData.filter((emp) => selectedEmployeeFilters.includes(emp.id))
        : deploymentData,
    [selectedEmployeeFilters],
  );

  const { pagedItems: pagedEmployees, safePage: safePayrollPage } = usePagedSlice(
    employees,
    payrollPage,
    payrollPageSize,
  );
  const { pagedItems: pagedDeploymentData, safePage: safeDeploymentPage } = usePagedSlice(
    filteredDeploymentData,
    deploymentPage,
    deploymentPageSize,
  );

  // Check if same employee paid and will be reimbursed
  const isSameEmployeePaidAndReimbursed = () => {
    return expenseWhoPaid === `emp-${selectedEmployeeForExpense?.id}` && expenseCostAllocation === "reimburse";
  };

  // Get confirmation message based on cost allocation
  const getConfirmationMessage = () => {
    if (isSameEmployeePaidAndReimbursed()) {
      return "No changes in amount will be made as the same employee paid and will be reimbursed.";
    }
    if (expenseCostAllocation === "deduct") {
      return "This amount will be deducted from the employee's next salary payment.";
    }
    return "This expense will be added to the project costs and the employee will be reimbursed.";
  };

  return (
    <PageShell className="space-y-4 px-2 md:space-y-6 md:px-0">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Employees" }]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "Total", value: employees.length },
              { label: "Active", value: employees.filter((e) => e.status === "Active").length },
              { label: "Roles", value: new Set(employees.map((e) => e.role)).size },
            ]}
          />
        }
      >
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setIsAddEmployeeOpen(true)} disabled={!canCreateEmployee}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </StickyPageHeader>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 overflow-x-auto">
          <TabsTrigger
            value="payroll"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-3 text-sm whitespace-nowrap"
          >
            Payroll
          </TabsTrigger>
          <TabsTrigger
            value="deployment"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-3 text-sm whitespace-nowrap"
          >
            Site Deployment Board
          </TabsTrigger>
        </TabsList>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="pt-4 md:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-base md:text-lg font-semibold">Salary & Payroll ({format(new Date(), "MMM yyyy")})</h2>
          </div>

          <DataTableShell
            maxHeight={listTableViewportMaxHeight(payrollPageSize)}
            scrollResetKey={`${safePayrollPage}-${payrollPageSize}-${employees.length}`}
            footer={
              <TablePaginationBar
                page={safePayrollPage}
                pageSize={payrollPageSize}
                total={employees.length}
                onPageChange={setPayrollPage}
                onPageSizeChange={(n) => {
                  setPayrollPageSize(n);
                  setPayrollPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="min-w-[180px]">Employee</TableHead>
                <TableHead className="text-right min-w-[80px]">Salary</TableHead>
                <TableHead className="text-center min-w-[60px]">Present</TableHead>
                <TableHead className="text-center min-w-[60px]">Absent</TableHead>
                <TableHead className="text-center min-w-[60px]">Holiday</TableHead>
                <TableHead className="min-w-[120px]">Current site</TableHead>
                <TableHead className="text-right min-w-[72px]" title="Estimated hours from attendance this calendar month (8h per present day, 4h per half-day).">
                  Hrs / mo
                </TableHead>
                <TableHead className="text-right min-w-[100px]">Pending</TableHead>
                <TableHead className="text-right min-w-[80px]">Advance</TableHead>
                <TableHead className="min-w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!shellReady ? (
                Array.from({ length: Math.min(payrollPageSize, 5) }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    <ListEmptyState
                      icon={Users}
                      title="No employees found"
                      description="Adjust filters or add team members in Settings."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedEmployees.map((emp) => (
                  <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEmployeeClick(emp.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleEmployeeClick(emp.id)}>
                        <Avatar className="h-8 w-8">
                          {emp.photoUrl && <AvatarImage src={emp.photoUrl} alt={emp.name} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">{emp.initial}</AvatarFallback>
                        </Avatar>
                        <div>
                          <EntityLink entityType="employee" entityId={emp.id} name={emp.name} />
                          <p className="text-xs text-muted-foreground">{emp.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatINR(emp.salary)}</TableCell>
                    <TableCell className="text-center text-primary font-medium">{emp.daysPresent}</TableCell>
                    <TableCell className="text-center text-destructive font-medium">{emp.daysAbsent}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{emp.holidays}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate" title={payrollRowExtras.get(emp.id)?.currentSite}>
                      {payrollRowExtras.get(emp.id)?.currentSite ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {payrollRowExtras.get(emp.id)?.hoursThisMonth ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.pendingAmount < 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-primary font-semibold text-sm">{formatINR(Math.abs(emp.pendingAmount))}</span>
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">Extra</Badge>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm">{formatINR(emp.pendingAmount)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatINR(emp.advancePaid)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="h-8 bg-primary text-primary-foreground text-xs"
                          disabled={!canCreatePayroll}
                          onClick={() => handlePaySalary(emp)}
                        >
                          <IndianRupee className="w-3 h-3 mr-1" />
                          Pay
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={() => handleAddExpense(emp)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Expense
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-primary text-primary hover:bg-primary hover:text-white"
                          onClick={() => {
                            setSelectedEmployeeForTask(emp);
                            setIsTaskModalOpen(true);
                          }}
                        >
                          <ClipboardList className="w-3 h-3 mr-1" />
                          Task
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTableShell>
        </TabsContent>

        {/* Site Deployment Board Tab - 1 Week View with Employee Filter */}
        <TabsContent value="deployment" className="pt-4 md:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-base md:text-lg font-semibold">
              Project Allocation ({format(currentWeekStart, 'dd MMM')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy')})
            </h2>
            <div className="flex items-center gap-2">
              {/* Employee Filter */}
              <Select>
                <SelectTrigger className="w-[180px] h-8">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    <span className="text-sm">
                      {selectedEmployeeFilters.length > 0 
                        ? `${selectedEmployeeFilters.length} selected` 
                        : "Filter Employees"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 space-y-2">
                    {deploymentData.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <Checkbox 
                          id={`filter-emp-${emp.id}`}
                          checked={selectedEmployeeFilters.includes(emp.id)}
                          onCheckedChange={() => toggleEmployeeFilter(emp.id)}
                        />
                        <label htmlFor={`filter-emp-${emp.id}`} className="text-sm cursor-pointer">
                          {emp.name}
                        </label>
                      </div>
                    ))}
                    {selectedEmployeeFilters.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-xs mt-2"
                        onClick={() => {
                          setSelectedEmployeeFilters([]);
                          setDeploymentPage(1);
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek} aria-label="Previous week">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[100px] text-center">
                {format(currentWeekStart, 'MMM yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek} aria-label="Next week">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-2 md:hidden">
            Deployment board is desktop-first; swipe horizontally to see all days.
          </p>

          <DataTableShell
            className="min-w-0 md:min-w-[700px]"
            maxHeight={listTableViewportMaxHeight(deploymentPageSize)}
            scrollResetKey={`${safeDeploymentPage}-${deploymentPageSize}-${filteredDeploymentData.length}-${currentWeekStart.getTime()}`}
            footer={
              <TablePaginationBar
                page={safeDeploymentPage}
                pageSize={deploymentPageSize}
                total={filteredDeploymentData.length}
                onPageChange={setDeploymentPage}
                onPageSizeChange={(n) => {
                  setDeploymentPageSize(n);
                  setDeploymentPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="w-48 sticky left-0 bg-card z-10">Employee</TableHead>
                {weekDays.map((d, idx) => (
                  <TableHead key={idx} className="text-center min-w-[100px]">
                    <div className={`${isSameDay(d.dateObj, new Date()) ? 'text-primary' : ''}`}>
                      <p className="text-xs font-medium">{d.day}</p>
                      <p className="text-xs text-muted-foreground">{d.date}</p>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!shellReady ? (
                Array.from({ length: Math.min(deploymentPageSize, 5) }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: weekDays.length + 1 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : pagedDeploymentData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={weekDays.length + 1} className="p-0">
                    <ListEmptyState
                      icon={ClipboardList}
                      title="No deployment rows"
                      description="No employees match this week or filter."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedDeploymentData.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="sticky left-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">{emp.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <EntityLink entityType="employee" entityId={emp.id} name={emp.name} />
                              <p className="text-xs text-muted-foreground">{emp.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        {weekDays.map((d, idx) => {
                          const schedule = getScheduleForDay(emp, d.dateObj);
                          return (
                            <TableCell key={idx} className="text-center">
                              {schedule === "Holiday" ? (
                                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-0">
                                  Holiday
                                </Badge>
                              ) : schedule === "-" ? (
                                <span className="text-muted-foreground">-</span>
                              ) : schedule === "Office" ? (
                                <Badge variant="outline" className="text-xs bg-muted">
                                  Office
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-0">
                                  {String(schedule).length > 10 ? String(schedule).slice(0, 10) + "..." : String(schedule)}
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
          </DataTableShell>
        </TabsContent>
      </Tabs>

      {/* Add Employee Sheet */}
      <Sheet open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Add New Employee</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-4">
            {/* Personal Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <User className="w-5 h-5" />
                <h3 className="font-semibold">Personal Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" placeholder="Enter full name" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" value={newEmpPhone} onChange={e => setNewEmpPhone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Current Address</Label>
                <Input id="address" placeholder="Enter current address" value={newEmpAddress} onChange={e => setNewEmpAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input id="aadhar" placeholder="XXXX XXXX XXXX" value={newEmpAadhar} onChange={e => setNewEmpAadhar(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={newEmpDob} onChange={e => setNewEmpDob(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altPhone">Alternate Number</Label>
                  <Input id="altPhone" placeholder="Enter alternate number" value={newEmpAltPhone} onChange={e => setNewEmpAltPhone(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Role & Salary Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Briefcase className="w-5 h-5" />
                <h3 className="font-semibold">Role & Salary</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (Monthly)</Label>
                  <Input id="salary" placeholder="₹ Enter amount" value={newEmpSalary} onChange={e => setNewEmpSalary(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={newEmpRole} onValueChange={setNewEmpRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Site Supervisor">Site Supervisor</SelectItem>
                      <SelectItem value="Installer">Installer</SelectItem>
                      <SelectItem value="Electrician">Electrician</SelectItem>
                      <SelectItem value="Helper">Helper</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date</Label>
                  <Input id="joiningDate" type="date" value={newEmpJoiningDate} onChange={e => setNewEmpJoiningDate(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Upload Documents Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Upload className="w-5 h-5" />
                <h3 className="font-semibold">Upload Docs</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Aadhar Upload */}
                <div className="relative">
                  {uploadedAadhar ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={uploadedAadhar.preview} alt="Aadhar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{uploadedAadhar.name}</span>
                      </div>
                      <button 
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        onClick={() => setUploadedAadhar(null)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary"
                      onClick={() => pickDocument(setUploadedAadhar, "Aadhar")}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Aadhar</span>
                    </Button>
                  )}
                </div>

                {/* Photo Upload */}
                <div className="relative">
                  {uploadedPhoto ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={uploadedPhoto.preview} alt="Photo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{uploadedPhoto.name}</span>
                      </div>
                      <button 
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        onClick={() => setUploadedPhoto(null)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary"
                      onClick={() => pickDocument(setUploadedPhoto, "Photo")}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Photo</span>
                    </Button>
                  )}
                </div>

                {/* Others Upload */}
                <div className="relative">
                  {uploadedOthers ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={uploadedOthers.preview} alt="Other" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{uploadedOthers.name}</span>
                      </div>
                      <button 
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        onClick={() => setUploadedOthers(null)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary"
                      onClick={() => pickDocument(setUploadedOthers, "Others")}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Others</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleSaveEmployee} disabled={!newEmpName.trim() || !newEmpRole}>{formPrimaryLabel("create", "employee")}</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Employee Saved Confirmation Sheet */}
      <Sheet open={isEmployeeSavedOpen} onOpenChange={setIsEmployeeSavedOpen}>
        <AppSheetContent layout="form" size="xs" className="text-center">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Employee Saved!</h3>
              <p className="text-muted-foreground mt-2">The new employee has been successfully added to the system.</p>
            </div>
            <Button className="bg-primary text-primary-foreground w-full" onClick={() => setIsEmployeeSavedOpen(false)}>
              Done
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Pay Salary Sheet - Scrollable with Month Selection */}
      <Sheet open={isPaySalaryOpen} onOpenChange={setIsPaySalaryOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Pay Salary</SheetTitle>
          </SheetHeader>
          
          {selectedEmployeeForPayment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">{selectedEmployeeForPayment.initial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{selectedEmployeeForPayment.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeForPayment.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Salary</p>
                  <p className="font-semibold">{formatINR(selectedEmployeeForPayment.salary)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pending</p>
                  <p className={`font-semibold ${selectedEmployeeForPayment.pendingAmount < 0 ? 'text-primary' : ''}`}>
                    {selectedEmployeeForPayment.pendingAmount < 0 ? (
                      <>{formatINR(Math.abs(selectedEmployeeForPayment.pendingAmount))} (Extra)</>
                    ) : (
                      <>{formatINR(selectedEmployeeForPayment.pendingAmount)}</>
                    )}
                  </p>
                </div>
              </div>

              {/* Month Selection */}
              <div className="space-y-2">
                <Label>Paying for Month(s)</Label>
                <div className="border rounded-lg p-3 space-y-2">
                  {months.map((month) => (
                    <div key={month.value} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id={month.value}
                          checked={selectedMonths.includes(month.value)}
                          onCheckedChange={() => handleMonthToggle(month.value)}
                        />
                        <label htmlFor={month.value} className="text-sm cursor-pointer">
                          {month.label}
                        </label>
                      </div>
                      <span className={`text-sm ${month.pending > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {month.pending > 0 ? formatINR(month.pending) : 'Paid'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {formatINR(getTotalSelectedPending())} pending
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Amount</Label>
                  <Input
                    placeholder="₹ Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  {selectedEmployeeForPayment && selectedMonths.length > 0 && (() => {
                    const emp = contextEmployees.find(e => e.id === selectedEmployeeForPayment.id);
                    if (!emp) return null;
                    const totalPresent = selectedMonths.reduce((sum, mv) => {
                      return sum + attendanceRecords.filter(r => r.employeeId === emp.id && (r.status === "present" || r.status === "paid_leave") && r.date.startsWith(mv)).length;
                    }, 0);
                    if (totalPresent === 0) return null;
                    const computed = Math.round(totalPresent * (emp.salary / 26));
                    return (
                      <p className="text-xs text-muted-foreground">
                        Auto-computed: {totalPresent} days × {formatINR(Math.round(emp.salary / 26))}/day = <span className="font-medium text-foreground">{formatINR(computed)}</span>
                      </p>
                    );
                  })()}
                  {isAmountExceedsPending() && (
                    <div className="flex items-center gap-2 p-2 bg-warning/10 rounded text-warning text-xs">
                      <AlertCircle className="w-4 h-4" />
                      Amount exceeds computed salary. Please verify.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMode} onValueChange={v => setPaymentMode(v as EmployeePayrollRecord["mode"])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="Add any notes..." value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsPaySalaryOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" disabled={!canCreatePayroll || !paymentAmount || !selectedEmployeeForPayment} onClick={() => {
              if (!canCreatePayroll || !selectedEmployeeForPayment) return;
              const net = parseFloat(paymentAmount) || 0;
              const daysForPayroll = selectedMonths.reduce((sum, mv) => {
                return sum + attendanceRecords.filter(
                  (r) =>
                    r.employeeId === selectedEmployeeForPayment.id &&
                    (r.status === "present" || r.status === "paid_leave") &&
                    r.date.startsWith(mv),
                ).length;
              }, 0);
              const record: EmployeePayrollRecord = {
                id: generateId("PAY"),
                employeeId: selectedEmployeeForPayment.id,
                employeeName: selectedEmployeeForPayment.name,
                month: selectedMonths.join(", "),
                year: new Date().getFullYear(),
                daysPresent: daysForPayroll,
                grossAmount: net,
                deductions: 0,
                netAmount: net,
                paidDate: paymentDate,
                mode: paymentMode,
                notes: paymentNotes || undefined,
              };
              addEmployeePayrollRecord(record);
              updateEmployee(selectedEmployeeForPayment.id, {
                pendingAmount: Math.max(0, (selectedEmployeeForPayment.pendingAmount || 0) - net),
              });
              toast({ title: "Salary recorded", description: `Net ${formatINR(net)} saved for ${selectedEmployeeForPayment.name}.` });
              setIsPaySalaryOpen(false);
              setPaymentAmount(""); setPaymentNotes("");
            }}>
              Confirm Payment
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Add Expense Sheet - Enhanced with Office as site and cost messaging */}
      <Sheet open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Add Expense</SheetTitle>
          </SheetHeader>
          
          {selectedEmployeeForExpense && (
            <div className="space-y-4 py-4">
              {/* Info Banner */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <p className="text-muted-foreground">This expense will be added to the project/site it's marked for.</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">{selectedEmployeeForExpense.initial}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedEmployeeForExpense.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployeeForExpense.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Site Selection First - Includes Office */}
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Select value={expenseSite} onValueChange={setExpenseSite}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map(site => (
                        <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category After Site - Only employee-related costs */}
                {expenseSite && (
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expenseCategory} onValueChange={(val) => {
                      setExpenseCategory(val);
                      setExpenseItem("");
                      setIsInventoryItem(false);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="stay">Stay</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Note: Site costs (material, labour, transport) should be added from Projects or Finance page.
                    </p>
                  </div>
                )}

                {expenseCategory && (
                  <>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>

                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input 
                        placeholder="₹ Enter amount" 
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reason / Notes</Label>
                      <Input placeholder="Enter reason" />
                    </div>

                    {/* Who Paid */}
                    <div className="space-y-2">
                      <Label>Who Paid?</Label>
                      <Select value={expenseWhoPaid} onValueChange={setExpenseWhoPaid}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company">Company Paid</SelectItem>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={`emp-${emp.id}`}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cost Allocation */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Cost Allocation</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="costAllocation" 
                            value="reimburse"
                            checked={expenseCostAllocation === "reimburse"}
                            onChange={(e) => setExpenseCostAllocation(e.target.value)}
                            className="accent-primary"
                          />
                          <span className="text-sm">Company will reimburse</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="costAllocation" 
                            value="deduct"
                            checked={expenseCostAllocation === "deduct"}
                            onChange={(e) => setExpenseCostAllocation(e.target.value)}
                            className="accent-primary"
                          />
                          <span className="text-sm">Employee needs to bear this cost</span>
                        </label>
                      </div>
                    </div>

                    {/* Show messaging based on who paid and cost allocation */}
                    {isSameEmployeePaidAndReimbursed() && (
                      <div className="p-3 bg-muted/30 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> No changes in amount will be made as the same employee paid and will be reimbursed.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleExpenseSubmit}>Continue</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Expense Confirmation Sheet */}
      <Sheet open={isExpenseConfirmOpen} onOpenChange={setIsExpenseConfirmOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Confirm Expense</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                {expenseCostAllocation === "reimburse" && !isSameEmployeePaidAndReimbursed() ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : expenseCostAllocation === "deduct" ? (
                  <AlertCircle className="w-5 h-5 text-warning" />
                ) : (
                  <Check className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {isSameEmployeePaidAndReimbursed() 
                    ? "No Amount Change" 
                    : expenseCostAllocation === "reimburse" 
                      ? "Marked as Project Cost" 
                      : "Will be Deducted from Salary"}
                </span>
              </div>
              
              {expenseAmount && (
                <div className="text-sm">
                  <strong>Amount:</strong> {formatINR(parseFloat(expenseAmount))}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {getConfirmationMessage()}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExpenseConfirmOpen(false)}>Go Back</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => {
              const parsedAmt = parseFloat(expenseAmount);
              if (!isNaN(parsedAmt) && parsedAmt > 0 && selectedEmployeeForExpense) {
                addExpense({
                  id: generateId("EXP"),
                  category: expenseCategory || "general",
                  description: expenseItem || expenseCategory || "Employee expense",
                  amount: parsedAmt,
                  date: new Date().toISOString().slice(0, 10),
                  paidBy:
                    expenseWhoPaid === "company"
                      ? { type: "company", entityName: "Company" }
                      : { type: "employee", entityId: String(selectedEmployeeForExpense.id), entityName: selectedEmployeeForExpense.name },
                  employeeId: String(selectedEmployeeForExpense.id),
                });
                if (expenseCostAllocation === "deduct") {
                  updateEmployee(selectedEmployeeForExpense.id, {
                    pendingAmount: Math.max(0, (selectedEmployeeForExpense.pendingAmount || 0) - parsedAmt),
                  });
                }
              }
              setIsExpenseConfirmOpen(false);
              setExpenseAmount(""); setExpenseSite(""); setExpenseCategory(""); setExpenseItem(""); setExpenseWhoPaid("company"); setExpenseCostAllocation("reimburse");
            }}>
              {FORM_CREATE_LABEL}
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Unified Expense Modal */}
      <UnifiedExpenseSheet
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        employeeId={selectedEmployeeForExpense?.id}
        employeeName={selectedEmployeeForExpense?.name}
      />

      {/* Task Assignment Modal */}
      {selectedEmployeeForTask && (
        <TaskAssignmentSheet
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedEmployeeForTask(null);
          }}
          employeeId={selectedEmployeeForTask.id}
          employeeName={selectedEmployeeForTask.name}
        />
      )}
    </PageShell>
  );
};

export default Employees;

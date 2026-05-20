import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Edit, User, Phone, Calendar, MapPin, IndianRupee, Briefcase, ChevronDown, ChevronUp, Upload, X, FileText, Filter, Download, Receipt, ClipboardList, Gift, Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { format, getDaysInMonth } from "date-fns";
import { formatUiDate } from "@/lib/formatUiDate";
import { toast } from "@/hooks/use-toast";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { formatINR } from "@/lib/formatCurrency";
import { validateContactPhone } from "@/lib/phoneValidators";
import { PayrollPolicyService } from "@/application/services/PayrollPolicyService";
import { downloadCSV } from "@/lib/csvExport";
import { useCanAction } from "@/hooks/useCanAction";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { ExpenseReimbursementStatus } from "@/components/expenses/ExpenseReimbursementStatus";
import type { Expense } from "@/types/finance";

// Shared instance — service is stateless, this avoids re-instantiating per render.
const payrollPolicyService = new PayrollPolicyService();

interface UploadedDoc {
  name: string;
  preview: string;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const expenseCategories = ["All", "Transport", "Food", "Material", "Medical", "Others"];

const EmployeeProfile = () => {
  const _navigate = useNavigate();
  const { id } = useParams();
  const {
    getTasksByEmployee = () => [],
    updateTask,
    employeePaidHolidays = [],
    employees: _employees,
    getEmployeeById,
    updateEmployee,
    updateExpense,
    attendanceRecords,
    holidays,
    getExpensesByEmployee,
    expenses,
    getEmployeePaidHolidaysByMonth,
    canDo,
    getEmployeeWalletLedger,
    addEmployeeWalletLedgerEntry,
    siteVisits = [],
    scheduledInstallations = [],
    projects: appProjects = [],
  } = useAppData();
  const { currentRole } = useAppSession();
  const isSuperAdmin = currentRole === "super_admin";
  const canApproveReimbursement = useCanAction("approval:resolve");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("attendance");
  
  // Month switcher state
  const [selectedMonth, setSelectedMonth] = useState("December");
  
  // Expense filter states
  const [expenseMonthFilter, setExpenseMonthFilter] = useState("all");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("All");
  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [expenseTablePage, setExpenseTablePage] = useState(1);
  const [expenseTablePageSize, setExpenseTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const [walletKind, setWalletKind] = useState<"advance" | "recovery" | "adjustment">("advance");
  const [walletDate, setWalletDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [walletAmount, setWalletAmount] = useState("");
  const [walletNotes, setWalletNotes] = useState("");

  // Edit profile state
  const [uploadedAadhar, setUploadedAadhar] = useState<UploadedDoc | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedDoc | null>(null);
  const [uploadedOthers, setUploadedOthers] = useState<UploadedDoc | null>(null);

  // Prototype document picker: opens an ephemeral <input type="file"> so the upload buttons
  // below are not "dead" — preview is local-only until backend persistence is wired up.
  const pickDocument = (setter: (doc: UploadedDoc | null) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter({ name: file.name, preview: String(reader.result ?? "") });
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAadhar, setEditAadhar] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editJoiningDate, setEditJoiningDate] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const employeeId = (id || "").trim();
  const contextEmployee = getEmployeeById(employeeId);

  const walletLedgerRows = useMemo(
    () =>
      [...(getEmployeeWalletLedger?.(employeeId) ?? [])].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [getEmployeeWalletLedger, employeeId],
  );

  const walletLedgerNet = useMemo(() => {
    return walletLedgerRows.reduce((acc, r) => {
      if (r.kind === "recovery") return acc - r.amount;
      return acc + r.amount;
    }, 0);
  }, [walletLedgerRows]);
  
  // Build employee object from context
  const employee = useMemo(() => {
    if (!contextEmployee) return null;
    return {
      ...contextEmployee,
      initial: contextEmployee.name?.charAt(0) || "?",
      wallet: contextEmployee.pendingAmount || 0,
      address: "Not specified", // Default value
      altPhone: "", // Default value
      docs: {
        aadhar: null,
        photo: null,
        others: null,
      }
    };
  }, [contextEmployee]);
  
  // Get paid leaves for this employee
  const employeePaidLeaves = useMemo(() => {
    return employeePaidHolidays.filter(pl => pl.employeeId === employeeId);
  }, [employeePaidHolidays, employeeId]);
  
  // Get employee expenses from context
  const employeeExpenses = useMemo(() => {
    return getExpensesByEmployee(employeeId.toString()).map(exp => ({
      id: exp.id,
      date: exp.date,
      category: exp.category,
      description: exp.description || exp.subCategory || "",
      amount: exp.amount,
      project: exp.projectName || "General",
    }));
  }, [getExpensesByEmployee, employeeId]);

  const reimbursementPending = useMemo(() => {
    return getExpensesByEmployee(employeeId.toString()).filter(
      (e) => e.reimbursement?.enabled && e.reimbursement.status === "pending",
    );
  }, [getExpensesByEmployee, employeeId, expenses]);

  const employeeExpenseRows = useMemo(
    () => getExpensesByEmployee(employeeId.toString()),
    [getExpensesByEmployee, employeeId, expenses],
  );

  const filteredExpenses = useMemo(() => {
    return employeeExpenses.filter((expense) => {
      if (expenseCategoryFilter !== "All" && expense.category !== expenseCategoryFilter) return false;
      if (expenseMonthFilter !== "all") {
        const expenseMonth = new Date(expense.date).toLocaleString("en-US", { month: "long" });
        if (expenseMonth !== expenseMonthFilter) return false;
      }
      if (expenseDateFrom && new Date(expense.date) < new Date(expenseDateFrom)) return false;
      if (expenseDateTo && new Date(expense.date) > new Date(expenseDateTo)) return false;
      return true;
    });
  }, [
    employeeExpenses,
    expenseCategoryFilter,
    expenseMonthFilter,
    expenseDateFrom,
    expenseDateTo,
  ]);

  const totalFilteredExpenses = useMemo(
    () => filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [filteredExpenses],
  );

  const filteredExpenseRows = useMemo(() => {
    const ids = new Set(filteredExpenses.map((e) => e.id));
    return employeeExpenseRows.filter((e) => ids.has(e.id));
  }, [filteredExpenses, employeeExpenseRows]);

  const { pagedItems: pagedFilteredExpenses, safePage: safeExpenseTablePage } = usePagedSlice(
    filteredExpenses,
    expenseTablePage,
    expenseTablePageSize,
  );

  const pagedExpenseRows = useMemo(() => {
    const pageIds = new Set(pagedFilteredExpenses.map((e) => e.id));
    return filteredExpenseRows.filter((e) => pageIds.has(e.id));
  }, [pagedFilteredExpenses, filteredExpenseRows]);

  useEffect(() => {
    setExpenseTablePage(1);
  }, [expenseCategoryFilter, expenseMonthFilter, expenseDateFrom, expenseDateTo]);
  
  // Calculate attendance data from context records
  const attendanceData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    
    return months.map((monthName, monthIndex) => {
      const monthStr = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;
      const daysInMonth = getDaysInMonth(new Date(currentYear, monthIndex, 1));
      
      // Get attendance records for this month
      const monthRecords = attendanceRecords.filter(r => 
        r.employeeId === employeeId && r.date.startsWith(monthStr)
      );
      
      // Get paid holidays for this month
      const paidLeaves = getEmployeePaidHolidaysByMonth(employeeId, monthStr);
      
      // Count company holidays in this month
      const holidayCount = holidays.filter(h => {
        const hDate = h instanceof Date ? h : new Date(h);
        return hDate.getFullYear() === currentYear && hDate.getMonth() === monthIndex;
      }).length;
      
      // Count present and absent days
      const presentDays = monthRecords.filter(r => r.status === "present").length + paidLeaves.length;
      const absentDays = monthRecords.filter(r => r.status === "absent").length;
      
      // C5: route monthly proration through PayrollPolicyService so this view agrees with payroll.
      // Note: legacy `presentDays` already folds in `paidLeaves`, so we don't pass them again.
      const salary = contextEmployee?.salary || 0;
      const policyOutput = payrollPolicyService.calculate({
        monthlySalary: salary,
        totalWorkingDays: 26,
        presentDays,
        paidLeaveDays: 0,
        unpaidDays: absentDays,
        companyHolidays: holidayCount,
        overtimeAmount: 0,
        bonusAmount: 0,
        deductionsAmount: 0,
        salaryAdvances: 0,
        manualAdjustments: 0,
      });
      const salaryEarned = Math.round(policyOutput.grossEarning);
      
      // Get advances (salary advances from expenses)
      const advances = expenses
        .filter(e => 
          e.employeeId === employeeId.toString() && 
          e.category === "salary" && 
          e.date.startsWith(monthStr)
        )
        .map(e => ({ date: formatUiDate(e.date, "dd MMM"), amount: e.amount }));
      
      const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
      const netPending = salaryEarned - totalAdvances;
      
      // Generate day-by-day details
      const details = Array.from({ length: daysInMonth }, (_, i) => {
        const dayDate = format(new Date(currentYear, monthIndex, i + 1), "yyyy-MM-dd");
        const record = monthRecords.find(r => r.date === dayDate);
        const isHoliday = holidays.some(h => {
          const hDate = h instanceof Date ? h : new Date(h);
          return format(hDate, "yyyy-MM-dd") === dayDate;
        });
        const isPaidLeave = paidLeaves.some(pl => pl.date === dayDate);
        
        let status = "";
        if (isHoliday) status = "H";
        else if (isPaidLeave) status = "PL";
        else if (record?.status === "present") status = "P";
        else if (record?.status === "absent") status = "A";
        
        return { date: i + 1, status };
      });
      
      return {
        month: monthName,
        present: presentDays,
        absent: absentDays,
        holiday: holidayCount,
        total: daysInMonth,
        salaryEarned,
        advances,
        netPending,
        details,
      };
    });
  }, [attendanceRecords, employeeId, holidays, expenses, contextEmployee, getEmployeePaidHolidaysByMonth]);
  
  // Get paid leaves by month
  const _getPaidLeavesForMonth = (monthName: string) => {
    const monthMap: Record<string, string> = {
      "January": "01", "February": "02", "March": "03", "April": "04",
      "May": "05", "June": "06", "July": "07", "August": "08",
      "September": "09", "October": "10", "November": "11", "December": "12"
    };
    const monthNum = monthMap[monthName];
    return employeePaidLeaves.filter(pl => pl.month.endsWith(`-${monthNum}`));
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const submitWalletEntry = () => {
    if (!isSuperAdmin) return;
    const amt = parseFloat(walletAmount);
    const res = addEmployeeWalletLedgerEntry({
      employeeId,
      date: walletDate,
      kind: walletKind,
      amount: amt,
      notes: walletNotes.trim() || undefined,
    });
    if (res.ok) {
      toast({ title: "Recorded", description: "Wallet entry saved." });
      setWalletAmount("");
      setWalletNotes("");
    } else {
      toast({
        title: "Could not save",
        description: res.error === "forbidden" ? "Super admin only." : res.error ?? "Check amount and date.",
        variant: "destructive",
      });
    }
  };

  const openEditProfile = () => {
    if (employee) {
      setUploadedAadhar(employee.docs.aadhar);
      setUploadedPhoto(employee.docs.photo);
      setUploadedOthers(employee.docs.others);
    }
    setIsEditProfileOpen(true);
  };

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Employee not found</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calculate totals
  const totalSalaryEarned = attendanceData.reduce((sum, row) => sum + row.salaryEarned, 0);
  const totalAdvances = attendanceData.reduce((sum, row) => sum + row.advances.reduce((a, adv) => a + adv.amount, 0), 0);
  const totalNetPending = totalSalaryEarned - totalAdvances;

  // Calculate running totals for month switcher
  const getRunningTotals = (upToMonth: string) => {
    const monthIndex = months.indexOf(upToMonth);
    const dataUpToMonth = attendanceData.slice(0, monthIndex + 1);
    const salaryEarned = dataUpToMonth.reduce((sum, row) => sum + row.salaryEarned, 0);
    const advances = dataUpToMonth.reduce((sum, row) => sum + row.advances.reduce((a, adv) => a + adv.amount, 0), 0);
    return { salaryEarned, advances, pending: salaryEarned - advances };
  };

  const _currentMonthData = attendanceData.find(d => d.month === selectedMonth);
  const runningTotals = getRunningTotals(selectedMonth);
  const previousMonthIndex = months.indexOf(selectedMonth) - 1;
  const previousRunningTotals = previousMonthIndex >= 0 ? getRunningTotals(months[previousMonthIndex]) : { salaryEarned: 0, advances: 0, pending: 0 };

  return (
    <PageShell className="space-y-6 px-2 md:px-0">
      {/* Breadcrumb */}
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Employees", to: "/employees" },
          { label: employee.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Role", value: employee.role },
              { label: "Status", value: employee.status },
              { label: "Salary", value: formatINR(employee.salary) },
              { label: "Wallet", value: formatINR(employee.wallet) },
            ]}
          />
        }
      >
        <Button variant="outline" onClick={openEditProfile} disabled={!canDo("hr:update_employee")}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
        {employee.terminatedAt ? (
          <Button
            variant="outline"
            onClick={() => updateEmployee(employee.id, { status: "Active", terminatedAt: undefined, terminationReason: undefined })}
            disabled={!canDo("hr:update_employee")}
          >
            Reinstate
          </Button>
        ) : (
          <Button
            variant="outline"
            className="text-muted-foreground"
            onClick={() => setShowTerminateDialog(true)}
            disabled={!canDo("hr:update_employee")}
          >
            Terminate
          </Button>
        )}
      </StickyPageHeader>

      {employee.terminatedAt && (
        <LifecycleTerminalBanner
          variant="terminated"
          title="Employment terminated"
          description={
            <span>
              Terminated on {formatUiDate(employee.terminatedAt)}
              {employee.terminationReason ? <> · Reason: {employee.terminationReason}</> : null}. Payroll and attendance history remain — reinstate to assign new work.
            </span>
          }
          primaryActionLabel="Reinstate"
          onPrimaryAction={() => {
            if (!canDo("hr:update_employee")) return;
            updateEmployee(employee.id, { status: "Active", terminatedAt: undefined, terminationReason: undefined });
            toast({ title: "Employee reinstated", description: employee.name });
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                  {employee.initial}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold mt-4">{employee.name}</h2>
              <Badge className="mt-2 bg-primary/10 text-primary border-0">{employee.role}</Badge>
              <Badge className="mt-2 bg-primary/10 text-primary border-0">{employee.status}</Badge>
            </div>

            <div className="mt-6 space-y-4 pt-6 border-t">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{employee.phone}</p>
                </div>
              </div>
              {contextEmployee?.email ? (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <a href={`mailto:${contextEmployee.email}`} className="text-sm font-medium text-primary hover:underline">
                      {contextEmployee.email}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-muted-foreground">—</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Aadhar</p>
                  <p className="text-sm font-medium">{employee.aadhar}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Date of Birth</p>
                  <p className="text-sm font-medium">{formatDate(employee.dob)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{employee.address}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Salary</p>
                  <p className="text-sm font-medium text-primary">{formatINR(employee.salary)} / month</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Joining Date</p>
                  <p className="text-sm font-medium">{formatDate(employee.joiningDate)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {reimbursementPending.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader>
                <CardTitle className="text-base font-medium">Pending reimbursements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reimbursementPending.map((exp) => (
                  <div key={exp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium truncate">{exp.description || exp.category}</p>
                      <p className="text-2xs text-muted-foreground">{exp.date}</p>
                      <ExpenseReimbursementStatus reimbursement={exp.reimbursement} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold">{formatINR(exp.reimbursement?.amount ?? exp.amount)}</span>
                      <PermissionGatedButton
                        allowed={canApproveReimbursement}
                        deniedHint={PERMISSION_DENIED_HINTS.expenseReimbursementApprove}
                        size="sm"
                        variant="secondary"
                        type="button"
                        onClick={() => {
                          if (!exp.reimbursement?.enabled) return;
                          updateExpense(exp.id, {
                            reimbursement: {
                              ...exp.reimbursement,
                              status: "paid",
                              paidDate: format(new Date(), "yyyy-MM-dd"),
                            },
                          });
                          toast({
                            title: "Reimbursement approved",
                            description: `${formatINR(exp.reimbursement.amount)} for ${exp.category}.`,
                          });
                        }}
                      >
                        Approve reimbursement
                      </PermissionGatedButton>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {/* Documents Section */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Aadhar */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Aadhar Card</p>
                  {employee.docs.aadhar ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={employee.docs.aadhar.preview} alt="Aadhar" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{employee.docs.aadhar.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      No document
                    </div>
                  )}
                </div>

                {/* Photo */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Photo</p>
                  {employee.docs.photo ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={employee.docs.photo.preview} alt="Photo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{employee.docs.photo.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      No document
                    </div>
                  )}
                </div>

                {/* Others */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Other Documents</p>
                  {employee.docs.others ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group">
                      <img src={employee.docs.others.preview} alt="Other" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs text-white">{employee.docs.others.name}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      No document
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HR Tab with Tabs for Attendance and Expenses */}
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-medium">HR & Finance</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="bg-muted/50 w-full sm:w-auto">
                    <TabsTrigger value="attendance" className="flex-1 sm:flex-none">Attendance</TabsTrigger>
                    <TabsTrigger value="tasks" className="flex-1 sm:flex-none">
                      <ClipboardList className="w-3 h-3 mr-1" />
                      Tasks ({getTasksByEmployee(employeeId).length})
                    </TabsTrigger>
                    <TabsTrigger value="visits" className="flex-1 sm:flex-none">
                      Site visits ({siteVisits.filter((v) => v.visitedBy === id).length})
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="flex-1 sm:flex-none">
                      Schedule ({scheduledInstallations.filter((s) => (s.employeeIds ?? []).includes(id)).length})
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex-1 sm:flex-none">Expenses</TabsTrigger>
                    <TabsTrigger value="wallet" className="flex-1 sm:flex-none">
                      <Wallet className="w-3 h-3 mr-1" />
                      Wallet
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTab === "attendance" && (
                <>
                  {/* Month Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm font-medium">Select Month:</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Until Last Month: </span>
                        <span className={`font-semibold ${previousRunningTotals.pending >= 0 ? "text-foreground" : "text-primary"}`}>
                          {formatINR(Math.abs(previousRunningTotals.pending))}
                          {previousRunningTotals.pending < 0 && " (Extra)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Current Total: </span>
                        <span className={`font-semibold ${runningTotals.pending >= 0 ? "text-foreground" : "text-primary"}`}>
                          {formatINR(Math.abs(runningTotals.pending))}
                          {runningTotals.pending < 0 && " (Extra)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Header Row */}
                  <div className="hidden md:grid grid-cols-8 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span></span>
                <span className="text-center">Present</span>
                <span className="text-center">Absent</span>
                <span className="text-center">Holiday</span>
                <span className="text-right">Salary</span>
                <span className="text-center">Advances</span>
                <span className="text-right">Net Pending</span>
                <span></span>
              </div>

              {attendanceData.map((row) => (
                <Collapsible key={row.month} open={expandedMonths.includes(row.month)}>
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex flex-col md:grid md:grid-cols-8 gap-2 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleMonth(row.month)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedMonths.includes(row.month) ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">{row.month}</span>
                      </div>
                      <div className="flex md:hidden flex-wrap gap-4 text-sm ml-6">
                        <span className="text-primary">{row.present}P</span>
                        <span className="text-destructive">{row.absent}A</span>
                        <span className="text-muted-foreground">{row.holiday}H</span>
                        <span className="text-primary font-medium">{formatINR(row.salaryEarned)}</span>
                      </div>
                      <span className="hidden md:block text-center text-primary font-medium text-sm">{row.present}P</span>
                      <span className="hidden md:block text-center text-destructive font-medium text-sm">{row.absent}A</span>
                      <span className="hidden md:block text-center text-muted-foreground text-sm">{row.holiday}H</span>
                      <span className="hidden md:block text-right text-primary font-medium text-sm">{formatINR(row.salaryEarned)}</span>
                      <span className="hidden md:block text-center text-sm">
                        {row.advances.length > 0 ? (
                          <span className="text-warning">
                            {row.advances.map(a => formatINR(a.amount)).join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                      <span className="hidden md:block text-right text-sm">
                        {row.netPending < 0 ? (
                          <span className="text-primary font-semibold">{formatINR(Math.abs(row.netPending))} Extra</span>
                        ) : row.netPending > 0 ? (
                          <span className="font-semibold">{formatINR(row.netPending)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                      <span></span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 bg-muted/20 rounded-lg mt-1 ml-6 md:ml-8 space-y-4">
                      {/* Advances Detail */}
                      {row.advances.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Advances Paid:</p>
                          <div className="flex flex-wrap gap-2">
                            {row.advances.map((adv, idx) => (
                              <Badge key={idx} variant="outline" className="text-warning border-warning/30">
                                {adv.date}: {formatINR(adv.amount)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-2 text-center text-xs">
                        <div className="font-medium text-muted-foreground">Mon</div>
                        <div className="font-medium text-muted-foreground">Tue</div>
                        <div className="font-medium text-muted-foreground">Wed</div>
                        <div className="font-medium text-muted-foreground">Thu</div>
                        <div className="font-medium text-muted-foreground">Fri</div>
                        <div className="font-medium text-muted-foreground">Sat</div>
                        <div className="font-medium text-muted-foreground">Sun</div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: row.total }, (_, i) => {
                          const detail = row.details.find(d => d.date === i + 1);
                          const status = detail?.status || (i < row.present ? "P" : i < row.present + row.absent ? "A" : "H");
                          return (
                            <div 
                              key={i} 
                              className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                                status === "P" ? "bg-primary/10 text-primary" :
                                status === "A" ? "bg-destructive/10 text-destructive" :
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-primary/10"></div>
                          <span>Present</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-destructive/10"></div>
                          <span>Absent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded bg-muted"></div>
                          <span>Holiday</span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}

              {/* Total Summary */}
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Salary Earned</p>
                      <p className="text-lg font-semibold text-primary">{formatINR(totalSalaryEarned)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Advances</p>
                      <p className="text-lg font-semibold text-warning">{formatINR(totalAdvances)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {totalNetPending >= 0 ? "Total Pending" : "Extra Paid"}
                    </p>
                    <p className={`text-xl font-bold ${totalNetPending >= 0 ? "text-foreground" : "text-primary"}`}>
                      {formatINR(Math.abs(totalNetPending))}
                      {totalNetPending < 0 && <span className="text-sm font-normal ml-1">(Extra)</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Paid Leave Summary */}
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-primary" />
                  <h4 className="font-medium text-sm">Paid Leave Summary 2024</h4>
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    {employeePaidLeaves.length} taken
                  </Badge>
                </div>
                {employeePaidLeaves.length > 0 ? (
                  <div className="space-y-2">
                    {employeePaidLeaves.map(pl => (
                      <div key={pl.id} className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{formatUiDate(pl.date)}</span>
                          {pl.notes && <span className="text-muted-foreground">- {pl.notes}</span>}
                        </div>
                        <Badge variant="outline" className="text-xs">{pl.month}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No paid leaves taken this year</p>
                )}
              </div>
              </>
              )}

              {activeTab === "tasks" && (
                <>
                  <div className="space-y-3">
                    {getTasksByEmployee(employeeId).length === 0 ? (
                      <ListEmptyState
                        icon={ClipboardList}
                        title="No tasks assigned yet"
                        description="Tasks from the field roster will show here when assigned."
                      />
                    ) : (
                      getTasksByEmployee(employeeId).map(task => (
                        <div key={task.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                task.status === "done" ? "bg-primary/10 text-primary" :
                                task.status === "started" ? "bg-primary/10 text-primary" :
                                task.status === "checked" ? "bg-accent/30 text-accent-foreground" :
                                task.status === "sent" || task.status === "created" ? "bg-warning/10 text-warning" :
                                "bg-muted text-muted-foreground"
                              }>
                                {/* Merge created and sent - show as Sent */}
                                {task.status === "created" ? "Sent" : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                              </Badge>
                              <span className="font-medium">{task.workType}</span>
                              {task.workTag && task.workTag !== task.workType && (
                                <Badge variant="outline" className="text-xs">{task.workTag}</Badge>
                              )}
                            </div>
                            <Select 
                              value={task.status === "created" ? "sent" : task.status} 
                              onValueChange={(val) => updateTask(task.id, { status: val as any })}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="checked">Checked</SelectItem>
                                <SelectItem value="started">Started</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>📍 {task.siteName}</span>
                            <span>📅 {formatUiDate(task.workDate)}</span>
                            {task.dateOffset && task.dateOffset > 0 && (
                              <Badge variant="outline" className="text-xs">T+{task.dateOffset}</Badge>
                            )}
                          </div>
                          
                          {/* Show work items if present */}
                          {task.workItems && task.workItems.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {task.workItems.map((item, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {item.stageName}{item.subItems.length > 0 ? `: ${item.subItems.join(", ")}` : ""}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {task.notes && <p className="text-sm">{task.notes}</p>}
                          
                          {/* Show delay indicator if original date differs */}
                          {task.originalDate && task.originalDate !== task.workDate && (
                            <Badge variant="destructive" className="text-xs">
                              ⚠️ Delayed from {formatUiDate(task.originalDate, "dd MMM")}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === "visits" && (
                <div className="space-y-2">
                  {siteVisits.filter((v) => v.visitedBy === id).length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No site visits recorded for this employee.</p>
                  ) : (
                    siteVisits
                      .filter((v) => v.visitedBy === id)
                      .map((v) => {
                        const proj = appProjects.find((p) => p.id === v.projectId);
                        return (
                          <div key={v.id} className="rounded-lg border border-border/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{proj?.name ?? v.projectId}</p>
                              <span className="text-xs text-muted-foreground">{v.visitDate}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Items: {v.items.length}{v.blockers ? ` · Blockers: ${v.blockers}` : ""}</p>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {activeTab === "schedule" && (
                <div className="space-y-2">
                  {scheduledInstallations.filter((s) => (s.employeeIds ?? []).includes(id)).length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No scheduled installations for this employee.</p>
                  ) : (
                    scheduledInstallations
                      .filter((s) => (s.employeeIds ?? []).includes(id))
                      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
                      .map((s) => {
                        const proj = appProjects.find((p) => p.id === s.projectId);
                        return (
                          <div key={s.id} className="rounded-lg border border-border/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{proj?.name ?? s.projectId}</p>
                              <span className="text-xs text-muted-foreground">{s.scheduledDate}</span>
                            </div>
                            <p className="text-xs capitalize text-muted-foreground">{s.status}{s.notes ? ` — ${s.notes}` : ""}</p>
                          </div>
                        );
                      })
                  )}
                </div>
              )}

              {activeTab === "wallet" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground">Ledger net (advances + adjustments − recoveries)</p>
                      <p className={`text-lg font-semibold ${walletLedgerNet >= 0 ? "text-foreground" : "text-primary"}`}>
                        {formatINR(Math.abs(walletLedgerNet))}
                        {walletLedgerNet < 0 && <span className="text-sm font-normal text-muted-foreground ml-1">(net recovery)</span>}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Recorded separately from monthly payroll runs. Only a super admin can add entries.
                    </p>
                  </div>

                  {isSuperAdmin && (
                    <div className="p-4 border rounded-lg space-y-3 bg-card">
                      <h4 className="text-sm font-medium">Add wallet entry</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Kind</Label>
                          <Select value={walletKind} onValueChange={(v) => setWalletKind(v as typeof walletKind)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="advance">Advance</SelectItem>
                              <SelectItem value="recovery">Recovery</SelectItem>
                              <SelectItem value="adjustment">Adjustment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Date</Label>
                          <Input type="date" value={walletDate} onChange={(e) => setWalletDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Amount (₹)</Label>
                          <Input
                            inputMode="decimal"
                            value={walletAmount}
                            onChange={(e) => setWalletAmount(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Notes (optional)</Label>
                          <Input value={walletNotes} onChange={(e) => setWalletNotes(e.target.value)} placeholder="Reference / remark" />
                        </div>
                      </div>
                      <Button type="button" size="sm" onClick={submitWalletEntry}>
                        Save entry
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Wallet ledger</h4>
                    <p className="text-xs text-muted-foreground">Chronological advances, recoveries, and adjustments.</p>
                    <DataTableShell variant="inline" maxHeight="min(420px, 50vh)">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Kind</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {walletLedgerRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              No wallet entries yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          walletLedgerRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {row.kind}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {row.kind === "recovery" ? "−" : "+"}
                                {formatINR(row.amount)}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm max-w-[240px] truncate">
                                {row.notes ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </DataTableShell>
                  </div>
                </div>
              )}

              {activeTab === "expenses" && (
                <>
                  {/* Expense Filters */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Filters:</span>
                    </div>
                    <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={expenseMonthFilter} onValueChange={setExpenseMonthFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {months.map(month => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="date" 
                        placeholder="From" 
                        value={expenseDateFrom}
                        onChange={(e) => setExpenseDateFrom(e.target.value)}
                        className="w-[140px]"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input 
                        type="date" 
                        placeholder="To" 
                        value={expenseDateTo}
                        onChange={(e) => setExpenseDateTo(e.target.value)}
                        className="w-[140px]"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      disabled={filteredExpenses.length === 0}
                      onClick={() => {
                        downloadCSV(
                          `${employee?.name ?? "employee"}-expenses`,
                          filteredExpenses.map((e) => ({
                            Date: e.date,
                            Category: e.category,
                            Description: e.description ?? "",
                            Amount: e.amount,
                            Project: e.project ?? "",
                          })),
                          ["Date", "Category", "Description", "Amount", "Project"],
                        );
                        toast({ title: "Export ready", description: `${filteredExpenses.length} rows downloaded.` });
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>

                  {/* Expenses Table */}
                  <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(expenseTablePageSize)}
                    scrollResetKey={`${safeExpenseTablePage}-${expenseTablePageSize}-${filteredExpenses.length}`}
                    footer={
                      <TablePaginationBar
                        page={safeExpenseTablePage}
                        pageSize={expenseTablePageSize}
                        total={filteredExpenses.length}
                        onPageChange={setExpenseTablePage}
                        onPageSizeChange={(n) => {
                          setExpenseTablePageSize(n);
                          setExpenseTablePage(1);
                        }}
                      />
                    }
                  >
                      <TableHeader>
                        <TableRow className={dataTableClasses.headRow}>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Reimbursement</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.length > 0 ? (
                          pagedExpenseRows.map((expense: Expense) => (
                            <TableRow key={expense.id}>
                              <TableCell className="text-muted-foreground">{expense.date}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{expense.category}</Badge>
                              </TableCell>
                              <TableCell>{expense.description || expense.subCategory || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{expense.projectName || "General"}</TableCell>
                              <TableCell>
                                <ExpenseReimbursementStatus reimbursement={expense.reimbursement} />
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatINR(expense.amount)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No expenses found for the selected filters
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                  </DataTableShell>

                  {/* Expense Summary */}
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Total Expenses ({filteredExpenses.length} items)</span>
                    </div>
                    <span className="text-xl font-bold text-primary">{formatINR(totalFilteredExpenses)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={isEditProfileOpen} onOpenChange={(open) => {
        if (open && employee) {
          setEditName(employee.name);
          setEditPhone(employee.phone);
          setEditAadhar(employee.aadhar || "");
          setEditDob(employee.dob || "");
          setEditSalary(employee.salary?.toString() || "");
          setEditRole(employee.role);
          setEditJoiningDate(employee.joiningDate || "");
          setEditAddress((contextEmployee as any)?.address || "");
        }
        setIsEditProfileOpen(open);
      }}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Edit Profile</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-4">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <User className="w-5 h-5" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input id="aadhar" value={editAadhar} onChange={e => setEditAadhar(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={editDob} onChange={e => setEditDob(e.target.value)} />
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
                  <Input id="salary" value={editSalary} onChange={e => setEditSalary(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={editRole} onValueChange={setEditRole}>
                    <SelectTrigger>
                      <SelectValue />
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
                  <Input id="joiningDate" type="date" value={editJoiningDate} onChange={e => setEditJoiningDate(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Employee address" />
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
                  <Label className="text-xs">Aadhar Card</Label>
                  {uploadedAadhar ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group mt-1">
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
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1"
                      onClick={() => pickDocument(setUploadedAadhar)}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Aadhar</span>
                    </Button>
                  )}
                </div>

                {/* Photo Upload */}
                <div className="relative">
                  <Label className="text-xs">Photo</Label>
                  {uploadedPhoto ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group mt-1">
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
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1"
                      onClick={() => pickDocument(setUploadedPhoto)}
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Upload Photo</span>
                    </Button>
                  )}
                </div>

                {/* Others Upload */}
                <div className="relative">
                  <Label className="text-xs">Other Documents</Label>
                  {uploadedOthers ? (
                    <div className="h-24 border rounded-lg overflow-hidden relative group mt-1">
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
                      className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1"
                      onClick={() => pickDocument(setUploadedOthers)}
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
            <Button variant="outline" onClick={() => setIsEditProfileOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => {
              if (!employee) return;
              const ph = validateContactPhone(editPhone);
              if (!ph.ok) {
                toast({ title: "Invalid phone", description: (ph as { message: string }).message, variant: "destructive" });
                return;
              }
              updateEmployee(employee.id, {
                name: editName.trim(),
                phone: editPhone,
                aadhar: editAadhar,
                dob: editDob,
                salary: parseFloat(editSalary) || employee.salary || 0,
                role: editRole || employee.role,
                joiningDate: editJoiningDate,
                initial: editName.trim().charAt(0).toUpperCase() || employee.initial,
                address: editAddress || undefined,
              } as any);
              toast({ title: "Profile Updated", description: "Employee profile has been saved." });
              setIsEditProfileOpen(false);
            }}>Save Changes</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={showTerminateDialog}
        onOpenChange={setShowTerminateDialog}
        title={`Terminate ${employee?.name ?? "employee"}?`}
        description="They will be marked inactive and excluded from new task assignments. This action is permanent."
        confirmLabel="Terminate"
        typedConfirmation={employee?.name}
        onConfirm={() => {
          if (employee) {
            updateEmployee(employee.id, {
              status: "Inactive",
              terminatedAt: new Date().toISOString(),
            } as any);
            setShowTerminateDialog(false);
          }
        }}
      />
    </PageShell>
  );
};

export default EmployeeProfile;

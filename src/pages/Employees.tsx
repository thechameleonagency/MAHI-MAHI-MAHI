import { useMemo, useState } from "react";
import { Plus, MapPin, User, Briefcase, Upload, X, ChevronLeft, ChevronRight, IndianRupee, AlertCircle, Check, Filter, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { UnifiedExpenseModal } from "@/components/expenses/UnifiedExpenseModal";
import { TaskAssignmentModal } from "@/components/employees/TaskAssignmentModal";
import { EntityLink } from "@/components/shared/EntityInfoModal";

const siteIssuedMaterials = [
  { id: 1, name: "Waaree 540W Panel", site: "Sharma Residency" },
  { id: 2, name: "DC Cable 4sqmm", site: "Sharma Residency" },
  { id: 3, name: "Structure GI Rail", site: "Apex Industries" },
];

const materialReasons = [
  { value: "damaged", label: "Item Damaged" },
  { value: "broke-transport", label: "Broke During Transport" },
  { value: "defective", label: "Defective Item" },
  { value: "wrong-item", label: "Wrong Item Sent" },
  { value: "other", label: "Other" },
];

const employees = [
  { id: 1, name: "Rajesh Kumar", role: "Site Supervisor", phone: "+91 98765 43210", status: "Active", site: "Sharma Residency", wallet: 15000, initial: "R", aadhar: "1234 5678 9012", dob: "15 - 03 - 1985", salary: 36000, joiningDate: "15 Jan, 2022", daysPresent: 22, daysAbsent: 3, holidays: 5, advancePaid: 5000, pendingAmount: 26000 },
  { id: 2, name: "Amit Singh", role: "Installer", phone: "+91 98765 43211", status: "Active", site: "Sharma Residency", wallet: 8200, initial: "A", aadhar: "2345 6789 0123", dob: "22 - 07 - 1990", salary: 24000, joiningDate: "20 Mar, 2022", daysPresent: 20, daysAbsent: 5, holidays: 5, advancePaid: 8000, pendingAmount: 10000 },
  { id: 3, name: "Suresh Patel", role: "Electrician", phone: "+91 98765 43212", status: "Active", site: "Office / Idle", wallet: 5000, initial: "S", aadhar: "3456 7890 1234", dob: "10 - 11 - 1988", salary: 30000, joiningDate: "05 Jun, 2021", daysPresent: 24, daysAbsent: 1, holidays: 5, advancePaid: 32000, pendingAmount: -4000 },
  { id: 4, name: "Vikram Malhotra", role: "Helper", phone: "+91 99988 77766", status: "Active", site: "Apex Industries", wallet: 3500, initial: "V", aadhar: "4567 8901 2345", dob: "28 - 01 - 1995", salary: 15000, joiningDate: "12 Aug, 2023", daysPresent: 18, daysAbsent: 7, holidays: 5, advancePaid: 2000, pendingAmount: 10500 },
  { id: 5, name: "Anita Desai", role: "Accountant", phone: "+91 99988 11122", status: "Active", site: "Office / Idle", wallet: 20000, initial: "A", aadhar: "5678 9012 3456", dob: "05 - 09 - 1992", salary: 27000, joiningDate: "01 Feb, 2020", daysPresent: 25, daysAbsent: 0, holidays: 5, advancePaid: 0, pendingAmount: 27000 },
];

const deploymentData = [
  { id: 1, name: "Rajesh Kumar", role: "Site Supervisor", avatar: "R", phone: "+91 98765 43210", schedule: Array(31).fill(null).map((_, i) => i < 22 ? "Sharma Residency" : i < 25 ? "Holiday" : "-") },
  { id: 2, name: "Amit Singh", role: "Installer", avatar: "A", phone: "+91 98765 43211", schedule: Array(31).fill(null).map((_, i) => i < 15 ? "Sharma Residency" : i < 20 ? "Apex Industries" : "-") },
  { id: 3, name: "Suresh Patel", role: "Electrician", avatar: "S", phone: "+91 98765 43212", schedule: Array(31).fill(null).map((_, i) => i % 3 === 0 ? "Office" : "-") },
  { id: 4, name: "Vikram Malhotra", role: "Helper", avatar: "V", phone: "+91 99988 77766", schedule: Array(31).fill(null).map((_, i) => i < 18 ? "Apex Industries" : "-") },
  { id: 5, name: "Anita Desai", role: "Accountant", avatar: "A", phone: "+91 99988 11122", schedule: Array(31).fill("Office") },
];

const months = [
  { value: "oct-2024", label: "October 2024", pending: 26000 },
  { value: "nov-2024", label: "November 2024", pending: 0 },
  { value: "dec-2024", label: "December 2024 (Current)", pending: 15000 },
];

interface UploadedDoc {
  name: string;
  preview: string;
}

const Employees = () => {
  const navigate = useNavigate();
  const { employees: contextEmployees, sites } = useAppData();
  
  // Use context employees with extended fields for display
  const employees = contextEmployees.map(emp => ({
    ...emp,
    site: "Office / Idle",
    wallet: emp.pendingAmount || 0,
    initial: emp.name.charAt(0),
    aadhar: "",
    dob: "",
    joiningDate: "",
    daysPresent: 22,
    daysAbsent: 3,
    holidays: 5,
  }));
  
  const [activeTab, setActiveTab] = useState("payroll");
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
  const [isInventoryItem, setIsInventoryItem] = useState(false);
  const [expenseWhoPaid, setExpenseWhoPaid] = useState("company");
  const [expenseAmount, setExpenseAmount] = useState("");
  
  // Pay salary form state
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["dec-2024"]);
  const [paymentAmount, setPaymentAmount] = useState("");
  
  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Employee filter for deployment board
  const [selectedEmployeeFilters, setSelectedEmployeeFilters] = useState<number[]>([]);

  const [payrollPage, setPayrollPage] = useState(1);
  const [payrollPageSize, setPayrollPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [deploymentPage, setDeploymentPage] = useState(1);
  const [deploymentPageSize, setDeploymentPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Upload docs state
  const [uploadedAadhar, setUploadedAadhar] = useState<UploadedDoc | null>({ name: "aadhar_front.jpg", preview: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=150&h=100&fit=crop" });
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedDoc | null>({ name: "profile_photo.jpg", preview: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=100&fit=crop" });
  const [uploadedOthers, setUploadedOthers] = useState<UploadedDoc | null>(null);

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
    setIsAddEmployeeOpen(false);
    setIsEmployeeSavedOpen(true);
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
    setSelectedEmployeeForPayment(emp);
    // Smart default selection
    const pendingMonths = months.filter(m => m.pending > 0);
    if (pendingMonths.length > 0) {
      setSelectedMonths([pendingMonths[0].value]);
    } else {
      setSelectedMonths(["dec-2024"]);
    }
    setPaymentAmount(emp.pendingAmount > 0 ? emp.pendingAmount.toString() : "");
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
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "HR" }, { label: "Employees" }]}
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
        <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setIsAddEmployeeOpen(true)}>
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
            <h2 className="text-base md:text-lg font-semibold">Salary & Payroll (Dec 2024)</h2>
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
                <TableHead className="text-right min-w-[100px]">Pending</TableHead>
                <TableHead className="text-right min-w-[80px]">Advance</TableHead>
                <TableHead className="min-w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedEmployees.map((emp) => (
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
                    <TableCell className="text-right text-sm">₹{emp.salary.toLocaleString()}</TableCell>
                    <TableCell className="text-center text-primary font-medium text-sm">{emp.daysPresent}</TableCell>
                    <TableCell className="text-center text-destructive font-medium text-sm">{emp.daysAbsent}</TableCell>
                    <TableCell className="text-center text-muted-foreground text-sm">{emp.holidays}</TableCell>
                    <TableCell className="text-right">
                      {emp.pendingAmount < 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-primary font-semibold text-sm">₹{Math.abs(emp.pendingAmount).toLocaleString()}</span>
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">Extra</Badge>
                        </div>
                      ) : (
                        <span className="font-semibold text-sm">₹{emp.pendingAmount.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">₹{emp.advancePaid.toLocaleString()}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          className="h-8 bg-primary text-primary-foreground text-xs"
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
                          className="h-8 text-xs border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
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
                ))}
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
              
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[100px] text-center">
                {format(currentWeekStart, 'MMM yyyy')}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DataTableShell
            className="min-w-[700px]"
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
                  <TableHead key={idx} className="text-center min-w-[100px] px-2">
                    <div className={`${isSameDay(d.dateObj, new Date()) ? 'text-primary' : ''}`}>
                      <p className="text-xs font-medium">{d.day}</p>
                      <p className="text-xs text-muted-foreground">{d.date}</p>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
                    {pagedDeploymentData.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div 
                            className="flex items-center gap-3 cursor-pointer" 
                            onClick={() => handleEmployeeClick(emp.id)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">{emp.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm hover:text-primary">{emp.name}</p>
                              <p className="text-xs text-muted-foreground">{emp.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        {weekDays.map((d, idx) => {
                          const schedule = getScheduleForDay(emp, d.dateObj);
                          return (
                            <TableCell key={idx} className="text-center px-2">
                              {schedule === "Holiday" ? (
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-0">
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
                                  {schedule.length > 10 ? schedule.slice(0, 10) + "..." : schedule}
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
          </DataTableShell>
        </TabsContent>
      </Tabs>

      {/* Add Employee Sheet */}
      <Sheet open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Current Address</Label>
                <Input id="address" placeholder="Enter current address" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input id="aadhar" placeholder="XXXX XXXX XXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altPhone">Alternate Number</Label>
                  <Input id="altPhone" placeholder="Enter alternate number" />
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
                  <Input id="salary" placeholder="₹ Enter amount" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supervisor">Site Supervisor</SelectItem>
                      <SelectItem value="installer">Installer</SelectItem>
                      <SelectItem value="electrician">Electrician</SelectItem>
                      <SelectItem value="helper">Helper</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date</Label>
                  <Input id="joiningDate" type="date" />
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary">
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary">
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary">
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
            <Button className="bg-primary text-primary-foreground" onClick={handleSaveEmployee}>Save Employee</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Employee Saved Confirmation Sheet */}
      <Sheet open={isEmployeeSavedOpen} onOpenChange={setIsEmployeeSavedOpen}>
        <SheetContent className="max-w-sm text-center overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Pay Salary Sheet - Scrollable with Month Selection */}
      <Sheet open={isPaySalaryOpen} onOpenChange={setIsPaySalaryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                  <p className="font-semibold">₹{selectedEmployeeForPayment.salary.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Pending</p>
                  <p className={`font-semibold ${selectedEmployeeForPayment.pendingAmount < 0 ? 'text-primary' : ''}`}>
                    {selectedEmployeeForPayment.pendingAmount < 0 ? (
                      <>₹{Math.abs(selectedEmployeeForPayment.pendingAmount).toLocaleString()} (Extra)</>
                    ) : (
                      <>₹{selectedEmployeeForPayment.pendingAmount.toLocaleString()}</>
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
                        {month.pending > 0 ? `₹${month.pending.toLocaleString()}` : 'Paid'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: ₹{getTotalSelectedPending().toLocaleString()} pending
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
                  {isAmountExceedsPending() && (
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded text-amber-600 text-xs">
                      <AlertCircle className="w-4 h-4" />
                      Amount exceeds pending (₹{getTotalSelectedPending().toLocaleString()}). Extra will be added to next month.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select defaultValue="cash">
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="Add any notes..." />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsPaySalaryOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsPaySalaryOpen(false)}>
              Confirm Payment
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Expense Sheet - Enhanced with Office as site and cost messaging */}
      <Sheet open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
        </SheetContent>
      </Sheet>

      {/* Expense Confirmation Sheet */}
      <Sheet open={isExpenseConfirmOpen} onOpenChange={setIsExpenseConfirmOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Confirm Expense</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                {expenseCostAllocation === "reimburse" && !isSameEmployeePaidAndReimbursed() ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : expenseCostAllocation === "deduct" ? (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
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
                  <strong>Amount:</strong> ₹{parseFloat(expenseAmount).toLocaleString()}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                {getConfirmationMessage()}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExpenseConfirmOpen(false)}>Go Back</Button>
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsExpenseConfirmOpen(false)}>
              Confirm & Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Unified Expense Modal */}
      <UnifiedExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        employeeId={selectedEmployeeForExpense?.id}
        employeeName={selectedEmployeeForExpense?.name}
      />

      {/* Task Assignment Modal */}
      {selectedEmployeeForTask && (
        <TaskAssignmentModal
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

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, User, Phone, Calendar, MapPin, IndianRupee, Briefcase, ChevronDown, ChevronUp, Upload, X, FileText, Filter, Download, Receipt, ClipboardList, Gift, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import { format, getDaysInMonth, startOfMonth, eachDayOfInterval, isSameDay, parseISO, isBefore, startOfDay } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

interface UploadedDoc {
  name: string;
  preview: string;
}

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const expenseCategories = ["All", "Transport", "Food", "Material", "Medical", "Others"];

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { 
    getTasksByEmployee = () => [], 
    updateTask, 
    employeePaidHolidays = [],
    employees,
    getEmployeeById,
    attendanceRecords,
    holidays,
    getExpensesByEmployee,
    expenses,
    getEmployeePaidHolidaysByMonth,
  } = useAppData();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
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

  // Edit profile state
  const [uploadedAadhar, setUploadedAadhar] = useState<UploadedDoc | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedDoc | null>(null);
  const [uploadedOthers, setUploadedOthers] = useState<UploadedDoc | null>(null);

  const employeeId = parseInt(id || "1");
  const contextEmployee = getEmployeeById(employeeId);
  
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
        aadhar: contextEmployee.aadhar ? { name: "aadhar.jpg", preview: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=150&h=100&fit=crop" } : null,
        photo: { name: "photo.jpg", preview: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=100&fit=crop" },
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

  const { pagedItems: pagedFilteredExpenses, safePage: safeExpenseTablePage } = usePagedSlice(
    filteredExpenses,
    expenseTablePage,
    expenseTablePageSize,
  );

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
      
      // Calculate salary earned (present + holidays + paid leaves)
      const salary = contextEmployee?.salary || 30000;
      const perDayRate = salary / daysInMonth;
      const salaryEarned = Math.round((presentDays + holidayCount) * perDayRate);
      
      // Get advances (salary advances from expenses)
      const advances = expenses
        .filter(e => 
          e.employeeId === employeeId.toString() && 
          e.category === "salary" && 
          e.date.startsWith(monthStr)
        )
        .map(e => ({ date: format(new Date(e.date), "dd MMM"), amount: e.amount }));
      
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
  const getPaidLeavesForMonth = (monthName: string) => {
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

  const currentMonthData = attendanceData.find(d => d.month === selectedMonth);
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
              { label: "Salary", value: `₹${employee.salary.toLocaleString()}` },
              { label: "Wallet", value: `₹${employee.wallet.toLocaleString()}` },
            ]}
          />
        }
      >
        <Button variant="outline" onClick={openEditProfile}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </StickyPageHeader>

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
                  <p className="text-sm font-medium text-primary">₹{employee.salary.toLocaleString()} / month</p>
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
                      Tasks ({getTasksByEmployee(parseInt(id || "1")).length})
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="flex-1 sm:flex-none">Expenses</TabsTrigger>
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
                          ₹{Math.abs(previousRunningTotals.pending).toLocaleString()}
                          {previousRunningTotals.pending < 0 && " (Extra)"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Current Total: </span>
                        <span className={`font-semibold ${runningTotals.pending >= 0 ? "text-foreground" : "text-primary"}`}>
                          ₹{Math.abs(runningTotals.pending).toLocaleString()}
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
                        <span className="text-primary font-medium">₹{row.salaryEarned.toLocaleString()}</span>
                      </div>
                      <span className="hidden md:block text-center text-primary font-medium text-sm">{row.present}P</span>
                      <span className="hidden md:block text-center text-destructive font-medium text-sm">{row.absent}A</span>
                      <span className="hidden md:block text-center text-muted-foreground text-sm">{row.holiday}H</span>
                      <span className="hidden md:block text-right text-primary font-medium text-sm">₹{row.salaryEarned.toLocaleString()}</span>
                      <span className="hidden md:block text-center text-sm">
                        {row.advances.length > 0 ? (
                          <span className="text-amber-600">
                            {row.advances.map(a => `₹${a.amount.toLocaleString()}`).join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </span>
                      <span className="hidden md:block text-right text-sm">
                        {row.netPending < 0 ? (
                          <span className="text-primary font-semibold">₹{Math.abs(row.netPending).toLocaleString()} Extra</span>
                        ) : row.netPending > 0 ? (
                          <span className="font-semibold">₹{row.netPending.toLocaleString()}</span>
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
                              <Badge key={idx} variant="outline" className="text-amber-600 border-amber-600/30">
                                {adv.date}: ₹{adv.amount.toLocaleString()}
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
                      <p className="text-lg font-semibold text-primary">₹{totalSalaryEarned.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Advances</p>
                      <p className="text-lg font-semibold text-amber-600">₹{totalAdvances.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {totalNetPending >= 0 ? "Total Pending" : "Extra Paid"}
                    </p>
                    <p className={`text-xl font-bold ${totalNetPending >= 0 ? "text-foreground" : "text-primary"}`}>
                      ₹{Math.abs(totalNetPending).toLocaleString()}
                      {totalNetPending < 0 && <span className="text-sm font-normal ml-1">(Extra)</span>}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Paid Leave Summary */}
              <div className="mt-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-sm">Paid Leave Summary 2024</h4>
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                    {employeePaidLeaves.length} taken
                  </Badge>
                </div>
                {employeePaidLeaves.length > 0 ? (
                  <div className="space-y-2">
                    {employeePaidLeaves.map(pl => (
                      <div key={pl.id} className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span>{format(new Date(pl.date), "dd MMM yyyy")}</span>
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
                    {getTasksByEmployee(parseInt(id || "1")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No tasks assigned yet</p>
                      </div>
                    ) : (
                      getTasksByEmployee(parseInt(id || "1")).map(task => (
                        <div key={task.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                task.status === "done" ? "bg-blue-500/10 text-blue-500" :
                                task.status === "started" ? "bg-blue-500/10 text-blue-500" :
                                task.status === "checked" ? "bg-purple-500/10 text-purple-500" :
                                task.status === "sent" || task.status === "created" ? "bg-amber-500/10 text-amber-500" :
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
                            <span>📅 {format(new Date(task.workDate), "dd MMM yyyy")}</span>
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
                              ⚠️ Delayed from {format(new Date(task.originalDate), "dd MMM")}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
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
                    <Button variant="outline" size="sm" className="ml-auto">
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
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.length > 0 ? (
                          pagedFilteredExpenses.map(expense => (
                            <TableRow key={expense.id}>
                              <TableCell className="text-muted-foreground">{expense.date}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{expense.category}</Badge>
                              </TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell className="text-muted-foreground">{expense.project}</TableCell>
                              <TableCell className="text-right font-medium">₹{expense.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                    <span className="text-xl font-bold text-primary">₹{totalFilteredExpenses.toLocaleString()}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                  <Input id="fullName" defaultValue={employee.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue={employee.phone} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Current Address</Label>
                <Input id="address" defaultValue={employee.address} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aadhar">Aadhar Number</Label>
                  <Input id="aadhar" defaultValue={employee.aadhar} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" defaultValue={employee.dob} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altPhone">Alternate Number</Label>
                  <Input id="altPhone" defaultValue={employee.altPhone} />
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
                  <Input id="salary" defaultValue={employee.salary.toString()} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select defaultValue={employee.role.toLowerCase().replace(" ", "-")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="site-supervisor">Site Supervisor</SelectItem>
                      <SelectItem value="installer">Installer</SelectItem>
                      <SelectItem value="electrician">Electrician</SelectItem>
                      <SelectItem value="helper">Helper</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="joiningDate">Joining Date</Label>
                  <Input id="joiningDate" type="date" defaultValue={employee.joiningDate} />
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1">
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1">
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
                    <Button variant="outline" className="h-24 w-full flex-col gap-2 border-dashed border-primary text-primary mt-1">
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
            <Button className="bg-primary text-primary-foreground" onClick={() => setIsEditProfileOpen(false)}>Save Changes</Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default EmployeeProfile;

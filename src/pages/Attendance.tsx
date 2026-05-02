import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, Check, Pencil, Trash2, Gift, AlertTriangle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isSameDay } from "date-fns";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { toast } from "@/hooks/use-toast";
import { EntityLink } from "@/components/shared/EntityInfoModal";
import { PayrollPolicyService } from "@/application/services/PayrollPolicyService";

const Attendance = () => {
  const payrollPolicyService = new PayrollPolicyService();
  const { 
    employees, sites, holidays, addHoliday, removeHoliday,
    addEmployeePaidHoliday, hasEmployeePaidHolidayInMonth, getEmployeePaidHolidaysByMonth,
    getTasksByEmployee, getExpensesByEmployee, attendanceRecords,
    generateId
  } = useAppData();
  
  // Selected date for attendance
  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  
  // Transform employees for attendance view with local state
  const employeesWithAttendance = employees.map(emp => ({
    ...emp,
    initial: emp.name.charAt(0),
    wallet: emp.pendingAmount || 0,
    attendanceStatus: null as string | null,
    workedSites: [] as string[],
  }));
  
  const [attendanceState, setAttendanceState] = useState<Record<number, { status: string | null; sites: string[] }>>({});
  const [isMarkHolidayOpen, setIsMarkHolidayOpen] = useState(false);
  const [selectedHolidayDates, setSelectedHolidayDates] = useState<Date[]>([]);
  const [isMultipleDayMode, setIsMultipleDayMode] = useState(false);
  const [holidayModalTab, setHolidayModalTab] = useState("mark");
  // Use context holidays directly - no local state copy
  const markedHolidays = holidays || [];
  
  // Fix: Sync attendance state when date changes - load from records
  useEffect(() => {
    const recordsForDate = attendanceRecords.filter(r => r.date === selectedDateStr);
    const newState: Record<number, { status: string | null; sites: string[] }> = {};
    
    recordsForDate.forEach(record => {
      newState[record.employeeId] = { 
        status: record.status, 
        sites: record.sites || [] 
      };
    });
    
    // Also check paid holidays for this date
    const currentMonth = format(selectedDate, 'yyyy-MM');
    employees.forEach(emp => {
      const paidLeaves = getEmployeePaidHolidaysByMonth(emp.id, currentMonth);
      if (paidLeaves.some(pl => pl.date === selectedDateStr)) {
        newState[emp.id] = { status: "paid_leave", sites: [] };
      }
    });
    
    setAttendanceState(newState);
  }, [selectedDateStr, attendanceRecords, employees, getEmployeePaidHolidaysByMonth]);
  
  // Site selection dialog state
  const [isSiteSelectionOpen, setIsSiteSelectionOpen] = useState(false);
  const [selectedEmployeeForSite, setSelectedEmployeeForSite] = useState<typeof employeesWithAttendance[0] | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [attendanceType, setAttendanceType] = useState<"present" | "paid_leave">("present");
  
  // Confirmation dialog state
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    employeeName: string;
    status: string;
    date: Date;
    sites: string[];
  } | null>(null);

  // Extra paid leave confirmation
  const [isExtraPaidLeaveConfirmOpen, setIsExtraPaidLeaveConfirmOpen] = useState(false);
  const [pendingPaidLeaveEmployee, setPendingPaidLeaveEmployee] = useState<typeof employeesWithAttendance[0] | null>(null);

  // Edit absent confirmation modal
  const [isEditAbsentOpen, setIsEditAbsentOpen] = useState(false);
  const [editAbsentEmployee, setEditAbsentEmployee] = useState<typeof employeesWithAttendance[0] | null>(null);
  const [absentHasRelationship, setAbsentHasRelationship] = useState<{ hasRelationship: boolean; details: string[] }>({ hasRelationship: false, details: [] });

  const [holidayListPage, setHolidayListPage] = useState(1);
  const [holidayListPageSize, setHolidayListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const sortedMarkedHolidays = useMemo(
    () => [...markedHolidays].sort((a, b) => a.getTime() - b.getTime()),
    [markedHolidays],
  );
  const { pagedItems: pagedHolidayRows, safePage: safeHolidayListPage } = usePagedSlice(
    sortedMarkedHolidays,
    holidayListPage,
    holidayListPageSize,
  );

  useEffect(() => {
    setHolidayListPage(1);
  }, [markedHolidays.length]);

  // Helper function to check if employee has relationships on a date
  const hasEmployeeRelationshipsOnDate = (employeeId: number, date: string): { hasRelationship: boolean; details: string[] } => {
    const details: string[] = [];
    
    // Check tasks
    const tasks = getTasksByEmployee?.(employeeId) || [];
    const tasksOnDate = tasks.filter(t => t.workDate === date);
    if (tasksOnDate.length > 0) details.push(`${tasksOnDate.length} task(s)`);
    
    // Check expenses
    const expenses = getExpensesByEmployee?.(employeeId.toString()) || [];
    const expensesOnDate = expenses.filter(e => e.date === date);
    if (expensesOnDate.length > 0) details.push(`${expensesOnDate.length} expense(s)`);
    
    // Check attendance records with site work
    const attendanceOnDate = attendanceRecords.find(a => a.employeeId === employeeId && a.date === date);
    if (attendanceOnDate?.sites?.length > 0) {
      const siteNames = attendanceOnDate.sites.map(id => sites.find(s => s.projectId === id)?.name || id);
      details.push(`Work at ${siteNames.join(", ")}`);
    }
    
    return { hasRelationship: details.length > 0, details };
  };

  // Calculate monthly earnings for an employee
  const calculateMonthlyEarnings = (emp: typeof employeesWithAttendance[0]) => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    const daysInMonth = getDaysInMonth(now);
    const perDayRate = emp.salary / daysInMonth;
    
    // Count days passed in current month (excluding future)
    const monthStart = startOfMonth(now);
    const today = now;
    const daysToCount = eachDayOfInterval({ start: monthStart, end: today });
    
    // Count attendance for current month
    let presentDays = 0;
    let holidayDays = 0;
    let paidLeaveDays = 0;
    let absentDays = 0;
    
    daysToCount.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const attendance = attendanceState[emp.id];
      const recordedAttendance = attendanceRecords.find(a => a.employeeId === emp.id && a.date === dayStr);
      
      // Check if it's a company holiday
      const isHoliday = markedHolidays.some(h => isSameDay(h, day));
      if (isHoliday) {
        holidayDays++;
        return;
      }
      
      // Check paid leave
      const paidLeaves = getEmployeePaidHolidaysByMonth(emp.id, currentMonth);
      const isPaidLeave = paidLeaves.some(pl => pl.date === dayStr);
      if (isPaidLeave) {
        paidLeaveDays++;
        return;
      }
      
      // Check if marked present (from local state or records)
      if (isSameDay(day, selectedDate) && attendance?.status === "present") {
        presentDays++;
      } else if (recordedAttendance?.status === "present") {
        presentDays++;
      } else if (isSameDay(day, selectedDate) && attendance?.status === "absent") {
        absentDays++;
      } else if (recordedAttendance?.status === "absent") {
        absentDays++;
      } else if (!isSameDay(day, today)) {
        // Auto-absent for unmarked past days
        absentDays++;
      }
    });
    
    const activeDays = presentDays + holidayDays + paidLeaveDays;
    const currentEarnings = Math.round(activeDays * perDayRate);
    const lastMonthPending = emp.pendingAmount || 0; // This would come from previous month calculations
    const payrollResult = payrollPolicyService.calculate({
      monthlySalary: emp.salary,
      totalWorkingDays: daysInMonth,
      presentDays,
      paidLeaveDays,
      unpaidDays: absentDays,
      companyHolidays: holidayDays,
      overtimeAmount: 0,
      bonusAmount: 0,
      deductionsAmount: 0,
      salaryAdvances: 0,
      manualAdjustments: lastMonthPending,
    });
    const totalPayable = payrollResult.finalPayable;
    
    return {
      daysInMonth,
      daysPassed: daysToCount.length,
      perDayRate: Math.round(perDayRate),
      presentDays,
      holidayDays,
      paidLeaveDays,
      absentDays,
      activeDays,
      currentEarnings,
      lastMonthPending,
      totalPayable
    };
  };

  const handleMarkPresent = (employee: typeof employeesWithAttendance[0]) => {
    // Check if already marked as paid leave on this date
    const currentMonth = format(selectedDate, 'yyyy-MM');
    const paidLeaves = getEmployeePaidHolidaysByMonth(employee.id, currentMonth);
    const hasPaidLeaveToday = paidLeaves.some(pl => pl.date === selectedDateStr);
    
    if (hasPaidLeaveToday) {
      toast({
        title: "Already Marked",
        description: `${employee.name} is already on Paid Leave for this date.`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedEmployeeForSite(employee);
    setSelectedSites([]);
    setIsEditMode(false);
    setAttendanceType("present");
    setIsSiteSelectionOpen(true);
  };

  const handleEditSites = (employee: typeof employeesWithAttendance[0]) => {
    setSelectedEmployeeForSite(employee);
    const currentSites = getWorkedSites(employee);
    setSelectedSites([...currentSites]);
    setIsEditMode(true);
    setAttendanceType("present");
    setIsSiteSelectionOpen(true);
  };

  const handleSiteSelection = (siteId: string, checked: boolean) => {
    if (checked) {
      setSelectedSites(prev => [...prev, siteId]);
    } else {
      setSelectedSites(prev => prev.filter(s => s !== siteId));
    }
  };

  const handleConfirmSiteSelection = () => {
    if (!selectedEmployeeForSite) return;
    
    if (attendanceType === "paid_leave") {
      // Handle paid leave confirmation
      const currentMonth = format(selectedDate, 'yyyy-MM');
      const alreadyHasPaidLeave = hasEmployeePaidHolidayInMonth(selectedEmployeeForSite.id, currentMonth);
      
      if (alreadyHasPaidLeave) {
        // Show extra paid leave confirmation
        setPendingPaidLeaveEmployee(selectedEmployeeForSite);
        setIsSiteSelectionOpen(false);
        setIsExtraPaidLeaveConfirmOpen(true);
        return;
      }
      
      // Mark paid leave
      markPaidLeave(selectedEmployeeForSite);
    } else {
      // Mark present
      setAttendanceState(prev => ({ 
        ...prev, 
        [selectedEmployeeForSite.id]: { status: "present", sites: selectedSites }
      }));
      
      setConfirmationData({
        employeeName: selectedEmployeeForSite.name,
        status: "present",
        date: selectedDate,
        sites: selectedSites
      });
      setIsSiteSelectionOpen(false);
      setIsConfirmationOpen(true);
    }
  };

  const markPaidLeave = (employee: typeof employeesWithAttendance[0]) => {
    const currentMonth = format(selectedDate, 'yyyy-MM');
    
    // Add paid leave record
    addEmployeePaidHoliday({
      id: generateId('PL'),
      employeeId: employee.id,
      employeeName: employee.name,
      date: selectedDateStr,
      month: currentMonth,
      createdAt: new Date().toISOString()
    });
    
    // Update attendance state
    setAttendanceState(prev => ({
      ...prev,
      [employee.id]: { status: "paid_leave", sites: [] }
    }));
    
    // Show confirmation
    setConfirmationData({
      employeeName: employee.name,
      status: "paid_leave",
      date: selectedDate,
      sites: []
    });
    setIsSiteSelectionOpen(false);
    setIsExtraPaidLeaveConfirmOpen(false);
    setIsConfirmationOpen(true);
    
    toast({
      title: "Paid Leave Marked",
      description: `${employee.name} has been marked on paid leave for ${format(selectedDate, 'dd MMM yyyy')}.`,
    });
  };

  const handleConfirmExtraPaidLeave = () => {
    if (pendingPaidLeaveEmployee) {
      markPaidLeave(pendingPaidLeaveEmployee);
      setPendingPaidLeaveEmployee(null);
    }
  };

  const handleMarkAbsent = (employee: typeof employeesWithAttendance[0]) => {
    // Check for relationships before marking absent
    const currentStatus = attendanceState[employee.id]?.status;
    
    if (currentStatus === "present" || currentStatus === "paid_leave") {
      const relationships = hasEmployeeRelationshipsOnDate(employee.id, selectedDateStr);
      if (relationships.hasRelationship) {
        toast({
          title: "Cannot Mark Absent",
          description: `${employee.name} has existing records for this date: ${relationships.details.join(", ")}. Remove them first.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setAttendanceState(prev => ({ ...prev, [employee.id]: { status: "absent", sites: [] } }));
    
    // Show confirmation
    setConfirmationData({
      employeeName: employee.name,
      status: "absent",
      date: selectedDate,
      sites: []
    });
    setIsConfirmationOpen(true);
  };

  // Handle editing an already marked absent employee
  const handleEditAbsent = (employee: typeof employeesWithAttendance[0]) => {
    const relationships = hasEmployeeRelationshipsOnDate(employee.id, selectedDateStr);
    setAbsentHasRelationship(relationships);
    setEditAbsentEmployee(employee);
    setIsEditAbsentOpen(true);
  };

  // Change absent to present
  const handleChangeAbsentToPresent = () => {
    if (!editAbsentEmployee) return;
    
    // Open site selection modal to mark present
    setSelectedEmployeeForSite(editAbsentEmployee);
    setSelectedSites([]);
    setIsEditMode(false);
    setAttendanceType("present");
    setIsEditAbsentOpen(false);
    setIsSiteSelectionOpen(true);
  };

  // Check if employee has paid leave remaining this month
  const hasPaidLeaveRemaining = (employeeId: number) => {
    const currentMonth = format(selectedDate, 'yyyy-MM');
    return !hasEmployeePaidHolidayInMonth(employeeId, currentMonth);
  };

  // Get paid leave info for this month
  const getPaidLeaveInfo = (employeeId: number) => {
    const currentMonth = format(selectedDate, 'yyyy-MM');
    const paidLeaves = getEmployeePaidHolidaysByMonth(employeeId, currentMonth);
    return paidLeaves;
  };

  const getAttendanceStatus = (emp: typeof employeesWithAttendance[0]) => {
    // Check if marked as paid leave today
    const paidLeaves = getPaidLeaveInfo(emp.id);
    if (paidLeaves.some(pl => pl.date === selectedDateStr)) {
      return "paid_leave";
    }
    return attendanceState[emp.id]?.status ?? emp.attendanceStatus;
  };

  const getWorkedSites = (emp: typeof employeesWithAttendance[0]) => {
    return attendanceState[emp.id]?.sites ?? emp.workedSites;
  };

  const handleMarkTodayAsHoliday = () => {
    const today = new Date();
    addHoliday(today);
    setIsMarkHolidayOpen(false);
    setSelectedHolidayDates([]);
    toast({ title: "Holiday Marked", description: `${format(today, 'dd MMM yyyy')} marked as company holiday` });
  };

  const handleMarkSelectedDatesAsHoliday = () => {
    if (selectedHolidayDates.length > 0) {
      selectedHolidayDates.forEach(date => addHoliday(date));
      setIsMarkHolidayOpen(false);
      setSelectedHolidayDates([]);
      toast({ title: "Holidays Marked", description: `${selectedHolidayDates.length} date(s) marked as company holidays` });
    }
  };

  const handleMultipleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedHolidayDates(prev => {
      const exists = prev.some(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
      if (exists) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd'));
      }
      return [...prev, date];
    });
  };

  const handleDeleteHoliday = (dateToDelete: Date) => {
    removeHoliday(dateToDelete);
    toast({ title: "Holiday Removed", description: `${format(dateToDelete, 'dd MMM yyyy')} removed from holidays` });
  };

  const getDayName = (date: Date) => {
    return format(date, "EEEE");
  };

  let presentDay = 0;
  let absentDay = 0;
  let paidLeaveDay = 0;
  for (const emp of employeesWithAttendance) {
    const s = getAttendanceStatus(emp);
    if (s === "present") presentDay++;
    else if (s === "absent") absentDay++;
    else if (s === "paid_leave") paidLeaveDay++;
  }

  return (
    <PageShell className="space-y-4 px-2 md:space-y-6 md:px-0">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "HR" }, { label: "Attendance" }]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "Team", value: employeesWithAttendance.length },
              { label: "Present", value: presentDay },
              { label: "Absent", value: absentDay },
              { label: "PL", value: paidLeaveDay },
            ]}
          />
        }
      >
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="h-8 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium"
            />
            <span className="hidden text-xs text-muted-foreground sm:inline">Past dates editable</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-primary text-primary"
            onClick={() => setIsMarkHolidayOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Holiday
          </Button>
        </div>
      </StickyPageHeader>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employeesWithAttendance.map((emp) => {
          const status = getAttendanceStatus(emp);
          const workedSites = getWorkedSites(emp);
          const monthlyData = calculateMonthlyEarnings(emp);
          const paidLeaves = getPaidLeaveInfo(emp.id);
          
          return (
            <Card 
              key={emp.id} 
              className="bg-card hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 md:p-5">
                {/* Role & Status Header */}
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    {emp.role}
                  </span>
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">
                    {emp.status}
                  </Badge>
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <Avatar className="h-10 w-10 md:h-12 md:w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-base md:text-lg font-semibold">
                      {emp.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <EntityLink entityType="employee" entityId={emp.id} name={emp.name} />
                    <p className="text-xs md:text-sm text-muted-foreground">{emp.phone}</p>
                  </div>
                </div>

                {/* Monthly Earnings Summary */}
                <div className="space-y-2 border-t pt-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    {format(new Date(), 'MMMM yyyy')} Summary
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Days:</span>
                      <span className="font-medium">{monthlyData.activeDays} / {monthlyData.daysPassed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Per Day:</span>
                      <span className="font-medium text-primary">₹{monthlyData.perDayRate.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="text-[10px] text-muted-foreground">
                    (P: {monthlyData.presentDays}, H: {monthlyData.holidayDays}, PL: {monthlyData.paidLeaveDays})
                  </div>
                  
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Current Earnings:</span>
                      <span className="font-medium">₹{monthlyData.currentEarnings.toLocaleString()}</span>
                    </div>
                    {monthlyData.lastMonthPending !== 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Last Month Pending:</span>
                        <span className={`font-medium ${monthlyData.lastMonthPending > 0 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {monthlyData.lastMonthPending > 0 ? '+' : ''}₹{monthlyData.lastMonthPending.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold pt-1">
                      <span>Total Payable:</span>
                      <span className="text-primary">₹{monthlyData.totalPayable.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Paid Leave Status Indicator */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground">Paid Leave ({format(selectedDate, 'MMM')})</span>
                    {paidLeaves.length === 0 ? (
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                        1/1 Available
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Gift className="w-3 h-3 mr-1" />
                        {paidLeaves.length} Used ({paidLeaves.map(pl => format(new Date(pl.date), 'dd')).join(', ')})
                      </Badge>
                    )}
                  </div>
                  
                  {/* Show worked sites if marked present - with edit button */}
                  {status === "present" && workedSites.length > 0 && (
                    <div className="flex items-center justify-between text-xs md:text-sm pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground">Sites Today: </span>
                        <span className="text-primary font-medium">
                          {workedSites.map(id => sites.find(s => s.projectId === id)?.name || id).join(", ")}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => handleEditSites(emp)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Attendance Buttons */}
                <div className="flex flex-col gap-2 mt-3 md:mt-4 pt-3 border-t">
                  {status === "present" ? (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 bg-primary text-primary-foreground text-xs md:text-sm"
                      disabled
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Marked Present
                    </Button>
                  ) : status === "absent" ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 bg-destructive text-destructive-foreground text-xs md:text-sm cursor-pointer hover:bg-destructive/90"
                            onClick={() => handleEditAbsent(emp)}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Marked Absent
                            <Pencil className="w-3 h-3 ml-1" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to change attendance</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : status === "paid_leave" ? (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1 bg-amber-500 text-white text-xs md:text-sm"
                      disabled
                    >
                      <Gift className="w-3 h-3 mr-1" />
                      Paid Leave
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground text-xs md:text-sm"
                        onClick={() => handleMarkPresent(emp)}
                      >
                        Present
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs md:text-sm"
                        onClick={() => handleMarkAbsent(emp)}
                      >
                        Absent
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Site Selection Sheet - Enhanced with Paid Leave Option */}
      <Sheet open={isSiteSelectionOpen} onOpenChange={setIsSiteSelectionOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">
              {isEditMode ? "Edit Work Sites" : "Mark Attendance"}
            </SheetTitle>
            <SheetDescription>
              Select attendance type for {selectedEmployeeForSite?.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {selectedEmployeeForSite && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {isEditMode ? "Editing sites for:" : "Marking attendance for:"}
                </p>
                <p className="font-medium text-primary">{selectedEmployeeForSite.name}</p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'EEEE, dd MMMM yyyy')}</p>
              </div>
            )}

            {/* Attendance Type Selection */}
            {!isEditMode && (
              <RadioGroup value={attendanceType} onValueChange={(v) => setAttendanceType(v as "present" | "paid_leave")}>
                <div className="space-y-3">
                  <Label 
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      attendanceType === "present" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="present" className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">Mark Present at Site(s)</p>
                      <p className="text-xs text-muted-foreground">Employee worked today at selected site(s)</p>
                    </div>
                  </Label>
                  
                  <Label 
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      attendanceType === "paid_leave" ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/50"
                    }`}
                  >
                    <RadioGroupItem value="paid_leave" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Mark Paid Leave</p>
                        <Gift className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hasPaidLeaveRemaining(selectedEmployeeForSite?.id || 0) 
                          ? "1/1 Available this month" 
                          : `Already used ${getPaidLeaveInfo(selectedEmployeeForSite?.id || 0).length} this month (will add extra)`}
                      </p>
                      {!hasPaidLeaveRemaining(selectedEmployeeForSite?.id || 0) && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          Extra paid leave will require confirmation
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}

            {/* Site selection - only show if marking present */}
            {attendanceType === "present" && (
              <div className="space-y-2">
                <Label>Which site(s) did they work at today?</Label>
                <div className="border rounded-lg p-3 space-y-3 max-h-48 overflow-y-auto">
                  {sites.map((site) => (
                    <div key={site.id} className="flex items-center gap-3">
                      <Checkbox 
                        id={`site-${site.id}`}
                        checked={selectedSites.includes(site.projectId)}
                        onCheckedChange={(checked) => handleSiteSelection(site.projectId, checked as boolean)}
                      />
                      <label htmlFor={`site-${site.id}`} className="text-sm flex-1 cursor-pointer">
                        {site.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSiteSelectionOpen(false)}>Cancel</Button>
            <Button 
              className={attendanceType === "paid_leave" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-primary text-primary-foreground"}
              onClick={handleConfirmSiteSelection}
              disabled={attendanceType === "present" && selectedSites.length === 0}
            >
              {isEditMode ? "Update Sites" : attendanceType === "paid_leave" ? "Confirm Paid Leave" : "Confirm Present"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Extra Paid Leave Confirmation Sheet */}
      <Sheet open={isExtraPaidLeaveConfirmOpen} onOpenChange={setIsExtraPaidLeaveConfirmOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Additional Paid Leave
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pendingPaidLeaveEmployee?.name}</span> has already used their 1 allocated paid leave for <span className="font-medium text-foreground">{format(selectedDate, 'MMMM yyyy')}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              This will be an additional paid leave. Are you sure you want to continue?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setIsExtraPaidLeaveConfirmOpen(false);
              setPendingPaidLeaveEmployee(null);
            }}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleConfirmExtraPaidLeave}
            >
              Add Extra Paid Leave
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Attendance Confirmation Sheet */}
      <Sheet open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <SheetContent className="max-w-sm text-center overflow-y-auto custom-scrollbar">
          <div className="py-6 space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              confirmationData?.status === "present" 
                ? "bg-primary/10" 
                : confirmationData?.status === "paid_leave"
                  ? "bg-amber-500/10"
                  : "bg-destructive/10"
            }`}>
              {confirmationData?.status === "paid_leave" ? (
                <Gift className="w-8 h-8 text-amber-500" />
              ) : (
                <Check className={`w-8 h-8 ${
                  confirmationData?.status === "present" 
                    ? "text-primary" 
                    : "text-destructive"
                }`} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Attendance Marked!</h3>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{confirmationData?.employeeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{confirmationData?.date ? format(confirmationData.date, "dd MMM yyyy") : ""}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`${
                    confirmationData?.status === "present" 
                      ? "bg-primary/10 text-primary" 
                      : confirmationData?.status === "paid_leave"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-destructive/10 text-destructive"
                  } border-0`}>
                    {confirmationData?.status === "present" ? "Present" : confirmationData?.status === "paid_leave" ? "Paid Leave" : "Absent"}
                  </Badge>
                </div>
                {confirmationData?.status === "present" && confirmationData?.sites && confirmationData.sites.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Worked at:</span>
                    <span className="font-medium text-primary text-right">{confirmationData.sites.join(", ")}</span>
                  </div>
                )}
                {confirmationData?.status === "paid_leave" && (
                  <div className="text-xs text-amber-600 pt-2 border-t mt-2">
                    This counts as paid leave for {confirmationData?.date ? format(confirmationData.date, 'MMMM yyyy') : ''}
                  </div>
                )}
              </div>
            </div>
            <Button 
              className="bg-primary text-primary-foreground w-full" 
              onClick={() => setIsConfirmationOpen(false)}
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Absent Confirmation Sheet */}
      <Sheet open={isEditAbsentOpen} onOpenChange={setIsEditAbsentOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Edit Attendance</SheetTitle>
            <SheetDescription>
              Change attendance for {editAbsentEmployee?.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Current Status</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-destructive/10 text-destructive border-0">Absent</Badge>
                <span className="text-sm text-muted-foreground">on {format(selectedDate, 'dd MMM yyyy')}</span>
              </div>
            </div>

            {absentHasRelationship.hasRelationship ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Cannot change to Absent</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Employee has existing records: {absentHasRelationship.details.join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      You can change to Present or Paid Leave.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You can change this to Present or Paid Leave.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setIsEditAbsentOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleChangeAbsentToPresent}
              >
                Mark Present
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mark Holiday Sheet - With Tabs */}
      <Sheet open={isMarkHolidayOpen} onOpenChange={setIsMarkHolidayOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Company Holidays</SheetTitle>
          </SheetHeader>
          
          <Tabs value={holidayModalTab} onValueChange={setHolidayModalTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="mark">Mark Holiday</TabsTrigger>
              <TabsTrigger value="list">Holiday List ({markedHolidays.length})</TabsTrigger>
            </TabsList>
            
            {/* Mark Holiday Tab */}
            <TabsContent value="mark" className="space-y-6 pt-4">
              {/* Today's Date Quick Action */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Today's Date</p>
                    <p className="text-lg font-semibold text-primary">{format(new Date(), "dd MMM, yyyy")}</p>
                  </div>
                  <Button 
                    className="bg-primary text-primary-foreground w-full sm:w-auto"
                    onClick={handleMarkTodayAsHoliday}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Mark Today
                  </Button>
                </div>
              </div>

              {/* Or Separator */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-sm text-muted-foreground">or select dates</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Multiple Days Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Mark Multiple Days</p>
                  <p className="text-xs text-muted-foreground">Select multiple dates from calendar</p>
                </div>
                <Switch 
                  checked={isMultipleDayMode} 
                  onCheckedChange={setIsMultipleDayMode}
                />
              </div>

              {/* Calendar */}
              <div className="flex justify-center">
                {isMultipleDayMode ? (
                  <Calendar
                    mode="multiple"
                    selected={selectedHolidayDates}
                    onSelect={(dates) => setSelectedHolidayDates(dates || [])}
                    className="rounded-md border pointer-events-auto"
                  />
                ) : (
                  <Calendar
                    mode="single"
                    selected={selectedHolidayDates[0]}
                    onSelect={(date) => date && setSelectedHolidayDates([date])}
                    className="rounded-md border pointer-events-auto"
                  />
                )}
              </div>

              {/* Selected Dates Display */}
              {selectedHolidayDates.length > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-2">Selected Dates:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedHolidayDates.map((date, idx) => (
                      <Badge key={idx} variant="outline" className="bg-background">
                        {format(date, "dd MMM yyyy")}
                        <button 
                          className="ml-1 hover:text-destructive"
                          onClick={() => setSelectedHolidayDates(prev => prev.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setIsMarkHolidayOpen(false);
                  setSelectedHolidayDates([]);
                }}>
                  Cancel
                </Button>
                <Button 
                  className="bg-primary text-primary-foreground"
                  onClick={handleMarkSelectedDatesAsHoliday}
                  disabled={selectedHolidayDates.length === 0}
                >
                  Mark as Holiday ({selectedHolidayDates.length})
                </Button>
              </div>
            </TabsContent>
            
            {/* Holiday List Tab */}
            <TabsContent value="list" className="pt-4">
              {markedHolidays.length > 0 ? (
                <DataTableShell
                  maxHeight={listTableViewportMaxHeight(holidayListPageSize)}
                  scrollResetKey={`${safeHolidayListPage}-${holidayListPageSize}-${sortedMarkedHolidays.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeHolidayListPage}
                      pageSize={holidayListPageSize}
                      total={sortedMarkedHolidays.length}
                      onPageChange={setHolidayListPage}
                      onPageSizeChange={(n) => {
                        setHolidayListPageSize(n);
                        setHolidayListPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedHolidayRows.map((date, idx) => (
                      <TableRow key={`${date.getTime()}-${idx}`}>
                        <TableCell className="font-medium">{format(date, "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-muted-foreground">{getDayName(date)}</TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteHoliday(date)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No holidays marked yet.</p>
                  <p className="text-sm text-muted-foreground">Switch to "Mark Holiday" tab to add holidays.</p>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => setIsMarkHolidayOpen(false)}>
                  Close
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Attendance;

import { useState, useMemo } from "react";
import { RefreshCw, MapPin, AlertTriangle, CheckCircle, Clock, ExternalLink, AlertCircle, User, Users, Circle, CheckCircle2, IndianRupee, FileText, Wrench, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { format, formatDistanceToNow } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import type { Blockage, ProjectTimelineStatus } from "@/types/blockage";
import ActiveSitesFilters, { type ActiveSitesFiltersState } from "@/components/activesites/ActiveSitesFilters";
import { getPriorityColor, getStatusColor } from "@/lib/statusColors";
import { formatUiDate } from "@/lib/formatUiDate";
import { AgingChip } from "@/components/ui/AgingChip";
import { getProjectIdleAging, getBlockageUpdatedAging } from "@/lib/agingHelpers";
import { ListEmptyState } from "@/components/ui/ListEmptyState";

// Timeline step labels
const TIMELINE_STEPS = [
  { key: "fileLogin", label: "File", icon: FileText },
  { key: "subsidyType", label: "Sub", icon: IndianRupee },
  { key: "bankFileType", label: "Bank", icon: IndianRupee },
  { key: "workStatus", label: "Work", icon: Wrench },
  { key: "discomStatus", label: "DIS", icon: Zap },
  { key: "paymentStatus", label: "Pay", icon: IndianRupee },
];

// Step detail configurations
const FILE_LOGIN_STEPS = [
  { value: "doc-received", label: "Doc Received", percent: 33 },
  { value: "file-login", label: "File Login", percent: 66 },
  { value: "submitted", label: "Submitted", percent: 100 },
];

const SUBSIDY_OPTIONS = [
  { value: "center-78k", label: "Center", amount: "₹78,000" },
  { value: "state-17k", label: "State", amount: "₹17,000" },
  { value: "both", label: "Both", amount: "₹95,000" },
  { value: "not-applicable", label: "N/A", amount: "₹0" },
];

const LOAN_STAGES = [
  { value: "file-prepare", label: "File Prepare" },
  { value: "file-into-bank", label: "File into Bank" },
  { value: "loan-apply", label: "Loan Apply" },
];

// New work status items - actual solar installation stages
const WORK_STATUS_ITEMS = [
  { value: "structure", label: "Structure", subItems: ["Item 1", "Item 2", "Item 3"], photoRequired: true, videoRequired: false },
  { value: "panel", label: "Panel", photoRequired: true, videoRequired: false },
  { value: "earthing", label: "Earthing", photoRequired: true, videoRequired: false },
  { value: "ac-dc", label: "AC DC", photoRequired: true, videoRequired: false },
  { value: "inverter", label: "Inverter", photoRequired: true, videoRequired: true },
  { value: "transport", label: "Transport", photoRequired: false, videoRequired: false },
];

const DISCOM_ITEMS = [
  { value: "meter-file-submit", label: "Meter & File Submit" },
  { value: "net-metering", label: "Net Metering" },
  { value: "subsidy-apply-photo", label: "Subsidy Apply + Photos" },
];

// Calculate step completion based on new timeline structure
const isStepComplete = (stepKey: string, timeline: ProjectTimelineStatus | null): boolean => {
  if (!timeline) return false;
  
  switch (stepKey) {
    case "fileLogin":
      return timeline.fileLoginComplete === true || timeline.fileLogin === "complete";
    case "subsidyType":
      return !!timeline.subsidyType;
    case "bankFileType":
      return timeline.bankFileType === "cash" || timeline.loanStatus === "approved";
    case "workStatus":
      return timeline.workStatusComplete === true || (timeline.workStatusChecks?.includes("transport") ?? false);
    case "discomStatus":
      return timeline.discomSubsidyStatus === "approved";
    case "paymentStatus":
      return timeline.cashToMahiConfirmed === true || timeline.secondInstallmentPaid === true;
    default:
      return false;
  }
};

// Calculate if step is in progress
const isStepInProgress = (stepKey: string, timeline: ProjectTimelineStatus | null): boolean => {
  if (!timeline) return false;
  
  switch (stepKey) {
    case "fileLogin":
      return timeline.fileLogin !== "pending" && timeline.fileLogin !== "complete" && !timeline.fileLoginComplete;
    case "subsidyType":
      return false; // Selection based - either done or not
    case "bankFileType":
      return timeline.bankFileType === "loan" && timeline.loanStatus !== "approved";
    case "workStatus":
      return (timeline.workStatusChecks?.length ?? 0) > 0 && !timeline.workStatusComplete;
    case "discomStatus":
      return (timeline.discomChecks?.length ?? 0) > 0 && timeline.discomSubsidyStatus !== "approved";
    case "paymentStatus":
      return (timeline.paymentType === "cash-to-mahi" && !timeline.cashToMahiConfirmed) ||
             (timeline.paymentType === "instalments" && timeline.firstInstallmentPaid && !timeline.secondInstallmentPaid);
    default:
      return false;
  }
};

// Calculate overall project progress based on timeline
const calculateOverallProgress = (timeline: ProjectTimelineStatus | null): number => {
  if (!timeline) return 0;
  
  let progress = 0;
  const stepWeight = 100 / 6; // ~16.67% per step
  
  // File Login
  if (timeline.fileLoginComplete || timeline.fileLogin === "complete") {
    progress += stepWeight;
  } else if (timeline.fileLogin === "submitted") {
    progress += stepWeight * 0.9;
  } else if (timeline.fileLogin === "file-login") {
    progress += stepWeight * 0.66;
  } else if (timeline.fileLogin === "doc-received") {
    progress += stepWeight * 0.33;
  }
  
  // Subsidy
  if (timeline.subsidyType) {
    progress += stepWeight;
  }
  
  // Bank File
  if (timeline.bankFileType === "cash" || timeline.loanStatus === "approved") {
    progress += stepWeight;
  } else if (timeline.bankFileType === "loan") {
    if (timeline.loanStage === "loan-apply") progress += stepWeight * 0.75;
    else if (timeline.loanStage === "file-into-bank") progress += stepWeight * 0.5;
    else if (timeline.loanStage === "file-prepare") progress += stepWeight * 0.25;
  }
  
  // Work Status
  const workChecks = timeline.workStatusChecks?.length ?? 0;
  progress += (workChecks / 6) * stepWeight;
  
  // DISCOM
  if (timeline.discomSubsidyStatus === "approved") {
    progress += stepWeight;
  } else {
    const discomChecks = timeline.discomChecks?.length ?? 0;
    progress += (discomChecks / 3) * stepWeight * 0.75;
  }
  
  // Payment
  if (timeline.cashToMahiConfirmed || timeline.secondInstallmentPaid) {
    progress += stepWeight;
  } else if (timeline.firstInstallmentPaid) {
    progress += stepWeight * 0.5;
  } else if (timeline.paymentType) {
    progress += stepWeight * 0.25;
  }
  
  return Math.round(progress);
};

/** Active Sites reads `blockages`, `operationalTickets`, `projectTimelineByProjectId` from AppData (seed: `src/data/activeSitesSeed.ts`). */

const ActiveSites = () => {
  const navigate = useNavigate();
  const {
    projects,
    employees,
    blockages,
    operationalTickets,
    projectTimelineByProjectId,
    resolveBlockage,
    updateBlockage,
    sites,
    inventoryItems,
    vendorBills,
    tasks,
  } = useAppData();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [_refreshKey, setRefreshKey] = useState(0);

  const needToGetService = useMemo(() => new NeedToGetService(), []);
  const procurementShortQtyByProject = useMemo(() => {
    const rows = needToGetService.buildRows(sites, projects, inventoryItems, vendorBills);
    const m = new Map<string, number>();
    for (const r of rows) {
      if (r.rowKind === "nonMaterial") continue;
      m.set(r.projectId, (m.get(r.projectId) ?? 0) + r.qtyShort);
    }
    return m;
  }, [needToGetService, sites, projects, inventoryItems, vendorBills]);
  
  // State for expanded step in cards
  const [expandedStep, setExpandedStep] = useState<{projectId: string, step: string} | null>(null);
  
  // State for Resolve Modal
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedBlockage, setSelectedBlockage] = useState<Blockage | null>(null);
  const [_selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [resolvedBy, setResolvedBy] = useState<string>("");
  const [resolveDate, setResolveDate] = useState(new Date().toISOString().split('T')[0]);
  const [resolveNotes, setResolveNotes] = useState("");

  // Link-task-to-blockage sheet state
  const [linkTaskTarget, setLinkTaskTarget] = useState<{ blockageId: string; projectId: string } | null>(null);
  const [linkTaskValue, setLinkTaskValue] = useState<string>("");

  // State for filters
  const [filters, setFilters] = useState<ActiveSitesFiltersState>({
    search: "",
    fileLogin: [],
    subsidyType: [],
    bankFileType: [],
    loanStage: [],
    workStatus: [],
    discomStatus: [],
    paymentStatus: [],
  });

  // Toggle expanded step
  const handleToggleStep = (projectId: string, stepKey: string) => {
    if (expandedStep?.projectId === projectId && expandedStep?.step === stepKey) {
      setExpandedStep(null);
    } else {
      setExpandedStep({ projectId, step: stepKey });
    }
  };

  // Render step detail content
  const renderStepDetails = (stepKey: string, timeline: ProjectTimelineStatus | null) => {
    if (!timeline) return null;
    
    switch (stepKey) {
      case "fileLogin":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">File Login Progress</p>
            <div className="flex items-center gap-2 text-xs">
              {timeline.fileLogin === "pending" ? (
                <Circle className="w-3 h-3 text-primary fill-primary" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-primary" />
              )}
              <span>Pending</span>
            </div>
            {FILE_LOGIN_STEPS.map((step) => {
              const currentIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === timeline.fileLogin);
              const stepIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === step.value);
              const isComplete = timeline.fileLoginComplete || timeline.fileLogin === "complete" || stepIndex < currentIndex;
              const isCurrent = step.value === timeline.fileLogin;
              
              return (
                <div key={step.value} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                    ) : isCurrent ? (
                      <Circle className="w-3 h-3 text-primary fill-primary" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/40" />
                    )}
                    <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                  </div>
                  <span className="text-muted-foreground">{step.percent}%</span>
                </div>
              );
            })}
          </div>
        );
        
      case "subsidyType":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Subsidy Selection</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SUBSIDY_OPTIONS.map((opt) => (
                <div 
                  key={opt.value}
                  className={`p-2 rounded text-center text-xs ${
                    timeline.subsidyType === opt.value 
                      ? 'bg-primary/20 border border-primary/50 text-foreground' 
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-2xs">{opt.amount}</p>
                  {timeline.subsidyType === opt.value && <CheckCircle2 className="w-3 h-3 mx-auto mt-0.5 text-primary" />}
                </div>
              ))}
            </div>
          </div>
        );
        
      case "bankFileType":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Bank File / Cash</p>
            {timeline.bankFileType === "cash" ? (
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">Cash File - Complete</span>
              </div>
            ) : timeline.bankFileType === "loan" ? (
              <div className="space-y-1.5">
                {LOAN_STAGES.map((stage, idx) => {
                  const currentIndex = LOAN_STAGES.findIndex(s => s.value === timeline.loanStage);
                  const isComplete = idx < currentIndex || timeline.loanStatus === "approved";
                  const isCurrent = stage.value === timeline.loanStage && timeline.loanStatus !== "approved";
                  
                  return (
                    <div key={stage.value} className="flex items-center gap-2 text-xs">
                      {isComplete ? (
                        <CheckCircle2 className="w-3 h-3 text-primary" />
                      ) : isCurrent ? (
                        <Circle className="w-3 h-3 text-primary fill-primary" />
                      ) : (
                        <Circle className="w-3 h-3 text-muted-foreground/40" />
                      )}
                      <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>{stage.label}</span>
                    </div>
                  );
                })}
                {timeline.loanStatus === "approved" && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs mt-2">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span className="text-primary font-medium">Loan Approved</span>
                  </div>
                )}
                {timeline.loanStatus === "rejected" && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-xs mt-2">
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    <span className="text-destructive font-medium">Loan Rejected</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not selected</p>
            )}
          </div>
        );
        
      case "workStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Work Status ({timeline.workStatusChecks?.length || 0}/6)</p>
            <div className="grid grid-cols-2 gap-1.5">
              {WORK_STATUS_ITEMS.map((item) => {
                const isChecked = timeline.workStatusChecks?.includes(item.value);
                return (
                  <div key={item.value} className="flex items-center gap-1.5 text-xs">
                    {isChecked ? (
                      <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
        
      case "discomStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">DISCOM Status</p>
            {DISCOM_ITEMS.map((item) => {
              const isChecked = timeline.discomChecks?.includes(item.value);
              return (
                <div key={item.value} className="flex items-center gap-2 text-xs">
                  {isChecked ? (
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40" />
                  )}
                  <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              );
            })}
            {timeline.discomSubsidyStatus === "approved" && (
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs mt-2">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">Subsidy Approved</span>
              </div>
            )}
          </div>
        );
        
      case "paymentStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Payment Status</p>
            {timeline.paymentType === "cash-to-mahi" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Circle className="w-3 h-3 text-primary fill-primary" />
                  <span className="font-medium">Cash to Mahi</span>
                </div>
                {timeline.cashToMahiConfirmed && (
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded text-xs">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    <span className="text-primary font-medium">Payment Confirmed</span>
                  </div>
                )}
              </div>
            ) : timeline.paymentType === "instalments" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {timeline.firstInstallmentPaid ? (
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40" />
                  )}
                  <span className={timeline.firstInstallmentPaid ? 'text-foreground' : 'text-muted-foreground'}>1st Installment</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {timeline.secondInstallmentPaid ? (
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40" />
                  )}
                  <span className={timeline.secondInstallmentPaid ? 'text-foreground' : 'text-muted-foreground'}>2nd Installment</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not selected</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  // Get active/ongoing projects with filtering
  const activeProjects = useMemo(() => {
    let filtered = projects.filter((p) => {
      if (p.lifecycleStatus === "Completed") return false;
      if (p.status === "Completed" || p.status === "Closed") return false;
      return p.status === "Ongoing" || p.lifecycleStatus === "Active" || p.lifecycleStatus === "On Hold";
    });
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        (p.client ?? "").toLowerCase().includes(searchLower) ||
        (p.location ?? "").toLowerCase().includes(searchLower)
      );
    }
    
    // Apply timeline-based filters
    filtered = filtered.filter(project => {
      const timeline = projectTimelineByProjectId[project.id];
      
      // File Login filter
      if (filters.fileLogin.length > 0) {
        if (!timeline) return false;
        const matchesFileLogin = filters.fileLogin.some(f => {
          if (f === "complete") return timeline.fileLoginComplete;
          return timeline.fileLogin === f;
        });
        if (!matchesFileLogin) return false;
      }
      
      // Subsidy Type filter
      if (filters.subsidyType.length > 0) {
        if (!timeline || !filters.subsidyType.includes(timeline.subsidyType || "")) return false;
      }
      
      // Bank File Type filter
      if (filters.bankFileType.length > 0) {
        if (!timeline || !filters.bankFileType.includes(timeline.bankFileType || "")) return false;
      }
      
      // Loan Stage filter
      if (filters.loanStage.length > 0) {
        if (!timeline) return false;
        const matchesLoanStage = filters.loanStage.some(f => {
          if (f === "approved") return timeline.loanStatus === "approved";
          return timeline.loanStage === f;
        });
        if (!matchesLoanStage) return false;
      }
      
      // Work Status filter
      if (filters.workStatus.length > 0) {
        if (!timeline) return false;
        const matchesWork = filters.workStatus.some(f => timeline.workStatusChecks?.includes(f));
        if (!matchesWork) return false;
      }
      
      // DISCOM Status filter
      if (filters.discomStatus.length > 0) {
        if (!timeline) return false;
        const matchesDiscom = filters.discomStatus.some(f => {
          if (f === "approved") return timeline.discomSubsidyStatus === "approved";
          return timeline.discomChecks?.includes(f);
        });
        if (!matchesDiscom) return false;
      }
      
      // Payment Status filter
      if (filters.paymentStatus.length > 0) {
        if (!timeline) return false;
        const matchesPayment = filters.paymentStatus.some(f => {
          if (f === "cash-to-mahi") return timeline.paymentType === "cash-to-mahi";
          if (f === "instalments") return timeline.paymentType === "instalments";
          if (f === "first-paid") return timeline.firstInstallmentPaid;
          if (f === "fully-paid") return timeline.cashToMahiConfirmed || timeline.secondInstallmentPaid;
          return false;
        });
        if (!matchesPayment) return false;
      }
      
      return true;
    });
    
    return filtered;
  }, [projects, filters, projectTimelineByProjectId]);

  // Get blockages for each project
  const getProjectBlockages = (projectId: string) => 
    blockages.filter(b => b.projectId === projectId && b.status === "active");

  // Get tickets for each project
  const getProjectTickets = (projectId: string) =>
    operationalTickets.filter(t => t.projectId === projectId && t.status !== "completed");

  // Get timeline status for project
  const getProjectTimeline = (projectId: string): ProjectTimelineStatus | null => {
    return projectTimelineByProjectId[projectId] || null;
  };

  const getEmployeeName = (id: string) => {
    return employees.find((e) => String(e.id) === String(id))?.name || `Employee ${id}`;
  };

  const timeSinceRefresh = () => {
    const diff = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff === 1) return "1 min ago";
    return `${diff} mins ago`;
  };

  // Handle opening resolve modal
  const handleOpenResolveModal = (projectId: string, blockage: Blockage) => {
    setSelectedProjectId(projectId);
    setSelectedBlockage(blockage);
    setResolvedBy("");
    setResolveDate(new Date().toISOString().split('T')[0]);
    setResolveNotes("");
    setIsResolveModalOpen(true);
  };

  // Handle resolving blockage
  const handleResolveBlockage = () => {
    if (!selectedBlockage || !resolvedBy) {
      toast({
        title: "Error",
        description: "Please select who resolved the blockage",
        variant: "destructive"
      });
      return;
    }

    // Update the blockage status
    resolveBlockage({
      id: selectedBlockage.id,
      resolvedAt: resolveDate,
      resolvedBy,
      resolvedByName:
        resolvedBy === "self"
          ? "Self"
          : resolvedBy === "super-admin"
            ? "Super Admin"
            : getEmployeeName(resolvedBy),
      notesAppend: resolveNotes || undefined,
    });

    toast({
      title: "Blockage Resolved",
      description: `"${selectedBlockage.title}" has been marked as resolved`
    });

    setIsResolveModalOpen(false);
    setSelectedBlockage(null);
    setSelectedProjectId(null);
  };

  // State for tab switching
  const [activeTab, setActiveTab] = useState<"ongoing" | "active-tickets">("ongoing");
  
  // Get completed projects with active tickets
  const completedProjectsWithTickets = useMemo(() => {
    const completedProjects = projects.filter(p => p.status === "Completed");
    return completedProjects.filter(p => {
      const projectTickets = operationalTickets.filter(t => t.projectId === p.id && t.status !== "completed");
      return projectTickets.length > 0;
    });
  }, [projects, operationalTickets]);

  const activeTicketsCount = useMemo(
    () =>
      operationalTickets.filter(
        (t) =>
          t.status !== "completed" &&
          completedProjectsWithTickets.some((p) => p.id === t.projectId),
      ).length,
    [completedProjectsWithTickets, operationalTickets],
  );

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Active sites" }]}
        subRow={
          <>
            <div className="flex w-full flex-wrap items-center gap-1 rounded-lg bg-muted/50 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("ongoing")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "ongoing"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ongoing
                <Badge variant="secondary" className="ml-1.5 text-2xs">
                  {activeProjects.length}
                </Badge>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("active-tickets")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "active-tickets"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tickets
                <Badge variant="secondary" className="ml-1.5 text-2xs">
                  {completedProjectsWithTickets.length}
                </Badge>
              </button>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Ongoing sites", value: activeProjects.length },
                { label: "Blockages", value: blockages.filter((b) => b.status === "active").length },
                { label: "Ticket sites", value: completedProjectsWithTickets.length },
                { label: "Active tickets", value: activeTicketsCount },
              ]}
            />
          </>
        }
      >
        <span className="hidden text-xs text-muted-foreground sm:inline">{timeSinceRefresh()}</span>
        <Button variant="outline" size="sm" className="h-8" onClick={() => { setLastRefreshed(new Date()); setRefreshKey(k => k + 1); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </StickyPageHeader>

      {/* Filters Section - Only for Ongoing Sites */}
      {activeTab === "ongoing" && (
        <ActiveSitesFilters filters={filters} onFiltersChange={setFilters} />
      )}

      {/* Content based on active tab */}
      {activeTab === "ongoing" && (
        <>
      {/* Site Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeProjects.map(project => {
          const projectBlockages = getProjectBlockages(project.id);
          const _tickets = getProjectTickets(project.id);
          const hasBlockages = projectBlockages.length > 0;
          const timeline = getProjectTimeline(project.id);
          const overallProgress = calculateOverallProgress(timeline);

          return (
            <Card 
              key={project.id} 
              className={`group cursor-pointer transition-all duration-200 hover:shadow-lg ${hasBlockages ? "border-warning/40 shadow-warning/5" : "hover:border-primary/30"}`}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <CardTitle className="text-base font-semibold truncate">{project.name}</CardTitle>
                      <AgingChip signal={getProjectIdleAging(project)} />
                      <Badge variant="secondary" className="text-2xs px-1.5 py-0 h-4 shrink-0">
                        {project.capacity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{project.client}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={`${getStatusColor(project.status)} shrink-0 text-xs px-2`}>
                      {project.status}
                    </Badge>
                    {(procurementShortQtyByProject.get(project.id) ?? 0) > 0 && (
                      <Badge variant="outline" className="text-2xs border-warning/40 text-warning">
                        Shortfall {procurementShortQtyByProject.get(project.id)} units
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Overall Progress Bar - Enhanced */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Overall Progress</span>
                    <span className={`font-bold ${overallProgress >= 75 ? 'text-primary' : overallProgress >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {overallProgress}%
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                        overallProgress >= 75 ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                        overallProgress >= 50 ? 'bg-gradient-to-r from-primary to-primary/80' :
                        'bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30'
                      }`}
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
                
                {/* 6 Step Mini Indicators - Enhanced Visual Design */}
                <div className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl p-4 space-y-3 border border-muted-foreground/10">
                  {/* Step Icons Row with Animated Connecting Line */}
                  <div className="relative px-2">
                    {/* Background connecting line */}
                    <div className="absolute top-4 left-6 right-6 h-0.5 bg-muted-foreground/15 rounded-full" />
                    {/* Progress connecting line */}
                    <div 
                      className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-blue-500 to-primary rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.max(0, (TIMELINE_STEPS.filter(s => isStepComplete(s.key, timeline)).length - 1) / (TIMELINE_STEPS.length - 1) * 100)}%`,
                        maxWidth: 'calc(100% - 48px)'
                      }}
                    />
                    
                    <div className="relative flex justify-between">
                      {TIMELINE_STEPS.map((step, _idx) => {
                        const isComplete = isStepComplete(step.key, timeline);
                        const inProgress = isStepInProgress(step.key, timeline);
                        const isExpanded = expandedStep?.projectId === project.id && expandedStep?.step === step.key;
                        const StepIcon = step.icon;
                        
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1 z-10">
                            <div 
                              onClick={() => handleToggleStep(project.id, step.key)}
                              className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer 
                                ${isComplete 
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40' 
                                  : inProgress
                                  ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-2 ring-primary/40 shadow-lg shadow-primary/30'
                                  : 'bg-muted/80 text-muted-foreground hover:bg-muted-foreground/20 hover:scale-105'
                                } 
                                ${isExpanded ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'active:scale-95'}
                              `}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <StepIcon className="w-3.5 h-3.5" />
                              )}
                              {inProgress && (
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <span className={`text-2xs font-semibold tracking-tight ${
                                isComplete ? 'text-primary' : inProgress ? 'text-primary' : 'text-muted-foreground/70'
                              }`}>
                                {step.label}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-2.5 h-2.5 text-primary" />
                              ) : (
                                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Collapsible Step Details - Enhanced */}
                  <Collapsible open={expandedStep?.projectId === project.id}>
                    <CollapsibleContent className="animate-accordion-down">
                      <div className="pt-3 mt-2 border-t border-muted-foreground/10 bg-background/50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                        {expandedStep?.projectId === project.id && renderStepDetails(expandedStep.step, timeline)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>


                {/* Enhanced Blockages Display - Refined UI */}
                {projectBlockages.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-warning/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-warning/20">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        </div>
                        <span className="text-sm font-semibold text-warning">
                          {projectBlockages.length} Blockage{projectBlockages.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {projectBlockages.length > 2 && (
                        <Badge variant="outline" className="text-2xs border-warning/30 text-warning">
                          +{projectBlockages.length - 2} more
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {projectBlockages.slice(0, 2).map(blockage => {
                        const daysSince = blockage.createdAt 
                          ? formatDistanceToNow(new Date(blockage.createdAt), { addSuffix: true })
                          : 'Unknown';
                        const isDelayed = blockage.projectStage === 'delayed';
                        const isOnHold = blockage.projectStage === 'on-hold';
                        const priorityColor = isDelayed ? 'bg-destructive' : isOnHold ? 'bg-warning' : 'bg-warning';
                        const priorityBg = isDelayed ? 'bg-destructive/10 border-destructive/30' : isOnHold ? 'bg-warning/10 border-warning/30' : 'bg-warning/10 border-warning/30';
                        const priorityText = isDelayed ? 'text-destructive' : isOnHold ? 'text-warning' : 'text-warning';
                        
                        return (
                          <div key={blockage.id} className={`relative overflow-hidden rounded-xl border ${priorityBg}`}>
                            {/* Priority indicator bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColor}`} />
                            
                            <div className="p-3 pl-4">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className={`font-semibold text-sm ${priorityText} line-clamp-1 flex items-center gap-1.5 flex-wrap`}>
                                  {blockage.title}
                                  <AgingChip signal={getBlockageUpdatedAging(blockage)} />
                                </p>
                                <Badge variant="secondary" className={`text-2xs shrink-0 px-1.5 py-0 h-4 ${
                                  isDelayed ? 'bg-destructive/20 text-destructive' : 
                                  isOnHold ? 'bg-warning/20 text-warning' : 
                                  'bg-warning/20 text-warning'
                                }`}>
                                  {isDelayed ? 'HIGH' : isOnHold ? 'MEDIUM' : 'NORMAL'}
                                </Badge>
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{blockage.reason}</p>

                              <div className="flex items-center justify-between text-2xs">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <User className="w-3 h-3" />
                                    <span className="font-medium">{blockage.assignedToName || 'Unassigned'}</span>
                                  </span>
                                  {blockage.resolveByDate && (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>Due: {formatUiDate(blockage.resolveByDate, "dd MMM")}</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground/70">{daysSince}</span>
                                  <button
                                    type="button"
                                    className="text-2xs font-medium px-2 py-0.5 rounded border bg-muted/40 text-muted-foreground hover:bg-muted"
                                    onClick={() => {
                                      setLinkTaskTarget({ blockageId: blockage.id, projectId: project.id });
                                      setLinkTaskValue(blockage.linkedTaskId ?? "");
                                    }}
                                  >
                                    Link task
                                  </button>
                                  <button
                                    type="button"
                                    className={`text-2xs font-medium px-2 py-0.5 rounded ${priorityText} border ${priorityBg} hover:opacity-80`}
                                    onClick={() => handleOpenResolveModal(project.id, blockage)}
                                  >
                                    Resolve
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No issues indicator */}
                {projectBlockages.length === 0 && (
                  <div className="flex items-center gap-2 text-primary pt-2 border-t">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">All clear - No blockages</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to={`/projects/${project.id}`}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </Button>
                  {hasBlockages && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-warning border-warning/50 hover:bg-warning/10"
                      onClick={() => handleOpenResolveModal(project.id, projectBlockages[0])}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State for Ongoing */}
      {activeProjects.length === 0 && (
        <ListEmptyState
          icon={MapPin}
          title="No ongoing sites"
          description="Active projects with in-progress work will appear here."
        />
      )}
        </>
      )}

      {/* Active Tickets Sites Tab */}
      {activeTab === "active-tickets" && (
        <>
          {/* Completed Projects with Tickets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedProjectsWithTickets.map(project => {
              const projectTickets = operationalTickets.filter(t => t.projectId === project.id && t.status !== "completed");
              const hasUrgentTickets = projectTickets.some(t => (t.priority as string) === "urgent" || (t.priority as string) === "high");

              return (
                <Card key={project.id} className={`group transition-all duration-200 hover:shadow-lg ${hasUrgentTickets ? "border-primary/40" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base font-semibold truncate">{project.name}</CardTitle>
                          <Badge variant="secondary" className="text-2xs px-1.5 py-0 h-4 shrink-0">
                            {project.capacity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{project.client}</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary shrink-0 text-xs px-2">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Active Tickets Count */}
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="p-1.5 rounded-lg bg-primary/20">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-primary">
                          {projectTickets.length} Active Ticket{projectTickets.length > 1 ? 's' : ''}
                        </span>
                        <p className="text-xs text-muted-foreground">Support issues pending</p>
                      </div>
                    </div>

                    {/* Tickets List */}
                    <div className="space-y-2">
                      {projectTickets.slice(0, 2).map(ticket => {
                        const dueDate = new Date(ticket.dueDate);
                        const today = new Date();
                        const isOverdue = dueDate < today;
                        
                        return (
                          <div key={ticket.id} className="p-2.5 bg-muted/50 rounded-lg border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  (ticket.priority as string) === 'urgent' ? 'bg-destructive' :
                                  (ticket.priority as string) === 'high' ? 'bg-warning' :
                                  (ticket.priority as string) === 'medium' ? 'bg-warning' : 'bg-primary'
                                }`} />
                                <p className="text-xs font-medium truncate">{ticket.description}</p>
                              </div>
                              <Badge className={`${getPriorityColor(ticket.priority)} text-2xs shrink-0`}>
                                {ticket.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-1.5 text-2xs text-muted-foreground pl-3.5">
                              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                Due: {format(dueDate, "dd MMM yyyy")}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {projectTickets.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{projectTickets.length - 2} more tickets
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to={`/projects/${project.id}`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State for Active Tickets */}
          {completedProjectsWithTickets.length === 0 && (
            <ListEmptyState
              icon={CheckCircle}
              title="No active tickets"
              description="Completed projects with open support tickets will appear here."
            />
          )}
        </>
      )}

      {/* Resolve Blockage Modal */}
      <Sheet open={isResolveModalOpen} onOpenChange={setIsResolveModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Resolve Blockage</SheetTitle>
            <SheetDescription>
              Mark this blockage as resolved and assign who solved it.
            </SheetDescription>
          </SheetHeader>
          
          {selectedBlockage && (
            <div className="space-y-4 py-4">
              {/* Blockage Info */}
              <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
                <p className="font-medium text-warning">{selectedBlockage.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedBlockage.reason}</p>
                {selectedBlockage.howToSolve && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium">Solution: </span>{selectedBlockage.howToSolve}
                  </p>
                )}
              </div>

              {/* Resolved By */}
              <div className="space-y-2">
                <Label>Resolved By *</Label>
                <Select value={resolvedBy} onValueChange={setResolvedBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who resolved" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Self
                      </div>
                    </SelectItem>
                    <SelectItem value="super-admin">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Super Admin
                      </div>
                    </SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Date */}
              <div className="space-y-2">
                <Label>Resolution Date</Label>
                <Input 
                  type="date" 
                  value={resolveDate} 
                  onChange={(e) => setResolveDate(e.target.value)} 
                />
              </div>

              {/* Resolution Notes */}
              <div className="space-y-2">
                <Label>Resolution Notes (optional)</Label>
                <Textarea 
                  placeholder="How was the blockage resolved?"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsResolveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveBlockage}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={!!linkTaskTarget}
        onOpenChange={(open) => { if (!open) { setLinkTaskTarget(null); setLinkTaskValue(""); } }}
      >
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Link blockage to task</SheetTitle>
            <SheetDescription>Pick a task from this project to associate with the blockage.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {(() => {
              if (!linkTaskTarget) return null;
              const projectTasks = tasks.filter((t) => t.projectId === linkTaskTarget.projectId);
              if (projectTasks.length === 0) {
                return <p className="text-sm text-muted-foreground">No tasks exist on this project yet.</p>;
              }
              return (
                <div className="space-y-2">
                  <Label>Task</Label>
                  <Select value={linkTaskValue} onValueChange={setLinkTaskValue}>
                    <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                    <SelectContent>
                      {projectTasks.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          #{t.id} — {t.workType} · {t.workDate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setLinkTaskTarget(null); setLinkTaskValue(""); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!linkTaskTarget) return;
                updateBlockage(linkTaskTarget.blockageId, { linkedTaskId: linkTaskValue || undefined });
                setLinkTaskTarget(null);
                setLinkTaskValue("");
              }}
            >
              Link task
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default ActiveSites;

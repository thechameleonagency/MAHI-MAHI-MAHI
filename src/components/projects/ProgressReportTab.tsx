import { useState, useEffect, useRef, useMemo } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { AlertTriangle, Check, Clock, Plus, Flag, Users, Calendar, MapPin, ChevronDown, ChevronRight, FileText, Phone, Briefcase, CheckCircle2, XCircle, Circle, IndianRupee, RotateCcw, User, Wrench, Zap, Camera, Video, Image, Tag, ClipboardList } from "lucide-react";
import { ImageViewerModal } from "@/components/shared/ImageViewerModal";
import { TaskAssignmentModal } from "@/components/employees/TaskAssignmentModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import type {
  Blockage,
  Ticket,
  ProjectTimelineStatus,
  WorkStatusApprovalInfo,
  WorkStatusApprovalStatus,
} from "@/types/blockage";
import { WORK_STATUS_STAGES, BLOCKAGE_TIMELINE_STAGES, DEFAULT_CUSTOM_STAGE_TAGS, type CustomBlockageStageTag } from "@/types/blockage";
import type { Employee, ProjectScopeConfig } from "@/types/project";

// Timeline steps for site status card (now 7 steps)
const TIMELINE_STEPS = [
  { key: "fileLogin", label: "File", icon: FileText },
  { key: "subsidyType", label: "Sub", icon: IndianRupee },
  { key: "bankFileType", label: "Bank", icon: IndianRupee },
  { key: "workStatus", label: "Work", icon: Wrench },
  { key: "discomStatus", label: "DIS", icon: Zap },
  { key: "paymentStatus", label: "Pay", icon: IndianRupee },
  { key: "dcrStatus", label: "DCR", icon: FileText },
];

interface MaterialSentItem {
  itemId: number;
  itemName: string;
  quantity: number;
  dateIssued: string;
}

interface ProgressReportTabProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  blockages: Blockage[];
  tickets: Ticket[];
  timelineStatus: ProjectTimelineStatus | null;
  employees: Employee[];
  materialsSent?: MaterialSentItem[];
  // Financial data from quotation/project
  projectPaymentType?: "cash" | "loan" | "cash-and-loan" | "";
  projectContractAmount?: number;
  projectBankDocAmount?: number;
  projectAmountReceived?: number;
  onAddBlockage: (blockage: Omit<Blockage, "id" | "createdAt">) => void;
  onResolveBlockage: (
    blockageId: string,
    resolution: { resolvedBy: string; resolvedByName: string; resolvedAt: string; notes?: string },
  ) => void;
  /** When set, cash received is persisted (client payment record + project totals); otherwise local demo totals only. */
  onRecordClientCash?: (amount: number, notes?: string) => void;
  onAddTicket: (ticket: Omit<Ticket, "id" | "createdAt">) => void;
  onUpdateTimeline: (updates: Partial<ProjectTimelineStatus>) => void;
  scope?: ProjectScopeConfig;
}

// File Login steps (sequential)
const FILE_LOGIN_STEPS = [
  { value: "doc-received", label: "Doc Received", percent: 33 },
  { value: "file-login", label: "File Login", percent: 66 },
  { value: "submitted", label: "Submitted", percent: 100 },
];

// Subsidy options
const SUBSIDY_OPTIONS = [
  { value: "center-78k", label: "Center", amount: "₹78,000", color: "bg-accent border-border/80 text-muted-foreground" },
  { value: "state-17k", label: "State", amount: "₹17,000", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { value: "both", label: "Both", amount: "₹95,000", color: "bg-accent border-border/80 text-muted-foreground" },
  { value: "not-applicable", label: "N/A", amount: "₹0", color: "bg-muted border-muted-foreground/20 text-muted-foreground" },
];

// DISCOM checkboxes (sequential)
const DISCOM_ITEMS = [
  { value: "meter-file-submit", label: "Meter & File Submit DISCOM" },
  { value: "net-metering", label: "Net Metering" },
  { value: "subsidy-apply-photo", label: "Subsidy Apply with Site Photos" },
];

// Loan flow stages
const LOAN_STAGES = [
  { value: "file-prepare", label: "File Prepare" },
  { value: "file-into-bank", label: "File into Bank" },
  { value: "loan-apply", label: "Loan Apply" },
];

// DCR (Work Completion Report) steps
const DCR_STEPS = [
  { value: "preparation", label: "Report Preparation", percent: 33 },
  { value: "documentation", label: "Documentation Collection", percent: 66 },
  { value: "submitted", label: "Submitted", percent: 100 },
];

const PROJECT_STAGES = [
  { value: "pending", label: "Pending" },
  { value: "work-in-progress", label: "Work In Progress" },
  { value: "on-hold", label: "On Hold" },
  { value: "delayed", label: "Delayed" },
  { value: "completed", label: "Completed" },
];

const TASK_TYPES = [
  { value: "work", label: "Work" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "visit", label: "Site Visit" },
  { value: "custom", label: "Custom" },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "bg-red-500/20 text-red-500" },
  { value: "high", label: "High", color: "bg-orange-500/20 text-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/20 text-yellow-500" },
  { value: "low", label: "Low", color: "bg-slate-500/20 text-slate-600" },
];

// Transport material mapping for stage keywords
const TRANSPORT_MATERIAL_MAP: Record<string, string[]> = {
  "structure": ["structure", "mounting", "rail", "clamp", "l-angle", "channel", "gi"],
  "panel": ["panel", "solar", "module", "waaree", "540w", "mono"],
  "inverter": ["inverter", "growatt"],
  "civil": ["cement", "sand", "chemical", "pharma"],
};

export function ProgressReportTab({
  projectId,
  projectName,
  projectStatus,
  blockages,
  tickets,
  timelineStatus,
  employees,
  materialsSent,
  projectPaymentType,
  projectContractAmount,
  projectBankDocAmount,
  projectAmountReceived,
  onAddBlockage,
  onResolveBlockage,
  onRecordClientCash,
  onAddTicket,
  onUpdateTimeline,
  scope,
}: ProgressReportTabProps) {
  
  // Dynamic steps based on scope
  const visibleSteps = useMemo(() => {
    // If no scope (legacy), return all
    if (!scope) return TIMELINE_STEPS;
    
    return TIMELINE_STEPS.filter(step => {
      if (step.key === "work") return scope.hasInstallation;
      if (["fileLogin", "discomStatus", "dcrStatus", "subsidyType"].includes(step.key)) {
        return scope.vendorshipOwner === "MSS";
      }
      return true; // Keep Pay, Bank, etc.
    });
  }, [scope]);

  // Modal states
  const [isAddBlockageOpen, setIsAddBlockageOpen] = useState(false);
  const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isConfirmCashModalOpen, setIsConfirmCashModalOpen] = useState(false);
  const [isConfirmInstallmentModalOpen, setIsConfirmInstallmentModalOpen] = useState(false);
  const [isResolveBlockageModalOpen, setIsResolveBlockageModalOpen] = useState(false);
  const [selectedBlockageToResolve, setSelectedBlockageToResolve] = useState<Blockage | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [taskModalMilestoneId, setTaskModalMilestoneId] = useState<string | undefined>();
  
  const { currentRole } = useAppSession();
  const isAdmin = currentRole === "admin" || currentRole === "super_admin" || currentRole === "ceo";
  
  // Blockage view toggle: "active" or "history"
  const [blockageViewMode, setBlockageViewMode] = useState<"active" | "history">("active");
  
  // Ticket view toggle for completed projects: "active" or "history"
  const [ticketViewMode, setTicketViewMode] = useState<"active" | "history">("active");
  
  // Custom blockage stage tags
  const [customStageTags, setCustomStageTags] = useState<CustomBlockageStageTag[]>(DEFAULT_CUSTOM_STAGE_TAGS);
  const [newCustomTagName, setNewCustomTagName] = useState("");
  const [saveNewTag, setSaveNewTag] = useState(false);
  const [selectedCustomTag, setSelectedCustomTag] = useState("");
  
  // Site status card state
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  type WorkApprovalsState = NonNullable<ProjectTimelineStatus["workStatusApprovals"]>;

  const [workStatusApprovals, setWorkStatusApprovals] = useState<WorkApprovalsState>({});

  useEffect(() => {
    setWorkStatusApprovals(timelineStatus?.workStatusApprovals ?? {});
  }, [projectId, timelineStatus?.updatedAt]);
  
  // Image viewer state
  const [viewerImage, setViewerImage] = useState<{ url: string; fileName: string } | null>(null);
  
  // Photo assignment modal state for Mark Completed workflow
  const [photoAssignmentModal, setPhotoAssignmentModal] = useState<{
    stageKey: string;
    stageName: string;
    open: boolean;
  } | null>(null);
  const [photoAssignTo, setPhotoAssignTo] = useState("");
  const [photoAssignNotes, setPhotoAssignNotes] = useState("");
  const [uploadPhotosDirectly, setUploadPhotosDirectly] = useState(false);
  
  // Photo upload modal state for sub-items
  const [photoUploadModal, setPhotoUploadModal] = useState<{
    stageKey: string;
    subItemKey: string;
    open: boolean;
  } | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [pendingPhotoDataUrls, setPendingPhotoDataUrls] = useState<string[]>([]);
  const [pendingVideoDataUrls, setPendingVideoDataUrls] = useState<string[]>([]);
  const workPhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photoUploadModal?.open) return;
    setPendingPhotoDataUrls([]);
    setPendingVideoDataUrls([]);
    setUploadNotes("");
  }, [photoUploadModal?.open]);
  const [rejectReasonModal, setRejectReasonModal] = useState<{
    stageKey: string;
    subItemKey: string;
    open: boolean;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Blockage form state
  const [blockageTitle, setBlockageTitle] = useState("");
  const [blockageReason, setBlockageReason] = useState("");
  const [blockageHowToSolve, setBlockageHowToSolve] = useState("");
  const [blockageResolveBy, setBlockageResolveBy] = useState("");
  const [blockageStage, setBlockageStage] = useState("work-in-progress");
  const [blockageTimelineStage, setBlockageTimelineStage] = useState("");
  const [blockageSubStage, setBlockageSubStage] = useState("");
  const [blockageNotes, setBlockageNotes] = useState("");
  const [blockageAssignedTo, setBlockageAssignedTo] = useState("");

  // Ticket form state
  const [ticketTaskType, setTicketTaskType] = useState("work");
  const [ticketCustomType, setTicketCustomType] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketHowToDo, setTicketHowToDo] = useState("");
  const [ticketAssignees, setTicketAssignees] = useState<number[]>([]);
  const [ticketAssignSuperAdmin, setTicketAssignSuperAdmin] = useState(false);
  const [ticketDueDate, setTicketDueDate] = useState("");
  const [ticketDueTime, setTicketDueTime] = useState("");
  const [ticketPriority, setTicketPriority] = useState("medium");
  const [ticketLocation, setTicketLocation] = useState(projectId);
  const [ticketLinkedBlockage, setTicketLinkedBlockage] = useState("");

  // Resolve blockage form state
  const [resolvedBy, setResolvedBy] = useState("");
  const [resolveDate, setResolveDate] = useState(new Date().toISOString().split('T')[0]);
  const [resolveNotes, setResolveNotes] = useState("");

  // Cash payment recording state
  const [cashPaymentAmount, setCashPaymentAmount] = useState("");
  const [cashPaymentNotes, setCashPaymentNotes] = useState("");
  const [totalCashReceived, setTotalCashReceived] = useState(0);

  // Instalment amounts (editable)
  const [firstInstalmentAmount, setFirstInstalmentAmount] = useState(0);
  const [secondInstalmentAmount, setSecondInstalmentAmount] = useState(0);
  const [isEditingInstalments, setIsEditingInstalments] = useState(false);

  // Timeline status helpers (declared before effects that depend on them — TDZ-safe)
  const fileLogin = timelineStatus?.fileLogin || "pending";
  const subsidyType = timelineStatus?.subsidyType || "";
  const bankFileType = timelineStatus?.bankFileType || "";
  const loanStage = timelineStatus?.loanStage || "";
  const loanStatus = timelineStatus?.loanStatus || "";
  const workStatusChecks = timelineStatus?.workStatusChecks || [];
  const discomChecks = timelineStatus?.discomChecks || [];
  const discomSubsidyStatus = timelineStatus?.discomSubsidyStatus || "";
  const paymentType = timelineStatus?.paymentType || "";
  const cashToMahiConfirmed = timelineStatus?.cashToMahiConfirmed || false;
  const firstInstallmentPaid = timelineStatus?.firstInstallmentPaid || false;
  const secondInstallmentPaid = timelineStatus?.secondInstallmentPaid || false;

  // Initialize from project/quotation financial data
  useEffect(() => {
    if (projectContractAmount) {
      setFirstInstalmentAmount(Math.round(projectContractAmount * 0.5));
      setSecondInstalmentAmount(Math.round(projectContractAmount * 0.5));
    }
    if (projectAmountReceived !== undefined) {
      setTotalCashReceived(projectAmountReceived);
    }
  }, [projectContractAmount, projectAmountReceived]);

  // Auto-populate bankFileType and paymentType from project payment type if timeline is empty
  useEffect(() => {
    if (projectPaymentType && projectPaymentType.length > 0) {
      // Auto-populate Bank File (step 3)
      if (!bankFileType) {
        if (projectPaymentType === "cash") {
          onUpdateTimeline({ bankFileType: "cash", updatedAt: new Date().toISOString() });
        } else if (projectPaymentType === "loan") {
          onUpdateTimeline({ bankFileType: "loan", loanStage: "file-prepare", loanStatus: "pending", updatedAt: new Date().toISOString() });
        } else if (projectPaymentType === "cash-and-loan") {
          onUpdateTimeline({ bankFileType: "cash-and-loan", loanStage: "file-prepare", loanStatus: "pending", updatedAt: new Date().toISOString() });
        }
      }
      // Auto-populate Payment Type (step 6)
      if (!paymentType) {
        if (projectPaymentType === "cash") {
          onUpdateTimeline({ paymentType: "cash-to-mahi", updatedAt: new Date().toISOString() });
        } else if (projectPaymentType === "loan") {
          onUpdateTimeline({ paymentType: "instalments", updatedAt: new Date().toISOString() });
        } else if (projectPaymentType === "cash-and-loan") {
          onUpdateTimeline({ paymentType: "cash-to-mahi", updatedAt: new Date().toISOString() });
        }
      }
    }
  }, [projectPaymentType, bankFileType, paymentType]);

  // Helper to record a cash payment
  const handleRecordCashPayment = () => {
    const amount = parseFloat(cashPaymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const contract = projectContractAmount ?? 0;
    if (contract > 0) {
      const already = projectAmountReceived ?? 0;
      const remaining = Math.max(0, contract - already);
      if (amount > remaining + 0.01) {
        toast({
          title: "Exceeds contract balance",
          description: `Outstanding contract balance is about ₹${remaining.toLocaleString("en-IN")}. Reduce the amount or update the contract.`,
          variant: "destructive",
        });
        return;
      }
    }
    const notes = cashPaymentNotes.trim() || undefined;
    if (onRecordClientCash) {
      onRecordClientCash(amount, notes);
    } else {
      setTotalCashReceived((prev) => prev + amount);
    }
    setCashPaymentAmount("");
    setCashPaymentNotes("");
    toast({ title: "Payment Recorded", description: `₹${amount.toLocaleString("en-IN")} cash payment recorded` });
  };

  // Format currency helper
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

  const activeBlockages = blockages.filter(b => b.status === "active");
  const resolvedBlockages = blockages.filter(b => b.status === "resolved");
  const pendingTickets = tickets.filter(t => t.status === "pending" || t.status === "in-progress");
  const completedTickets = tickets.filter(t => t.status === "completed");
  const activeTickets = tickets.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const resolvedTickets = tickets.filter(t => t.status === "completed" || t.status === "cancelled");

  const handleAddBlockage = () => {
    if (!blockageTitle || !blockageReason) {
      toast({ title: "Error", description: "Title and reason are required", variant: "destructive" });
      return;
    }
    
    if (!blockageTimelineStage) {
      toast({ title: "Error", description: "Timeline stage is required", variant: "destructive" });
      return;
    }
    
    // Save new custom tag if option selected
    if (blockageTimelineStage === "something-else" && newCustomTagName && saveNewTag) {
      const newTag: CustomBlockageStageTag = {
        id: `custom-${Date.now()}`,
        label: newCustomTagName,
        createdAt: new Date().toISOString(),
      };
      setCustomStageTags(prev => [...prev, newTag]);
    }

    onAddBlockage({
      projectId,
      title: blockageTitle,
      reason: blockageReason,
      howToSolve: blockageHowToSolve || undefined,
      resolveByDate: blockageResolveBy || undefined,
      projectStage: blockageStage,
      timelineStage: blockageTimelineStage === "something-else" 
        ? (selectedCustomTag ? customStageTags.find(t => t.id === selectedCustomTag)?.label : newCustomTagName) 
        : blockageTimelineStage,
      timelineSubStage: blockageSubStage || undefined,
      notes: blockageNotes || undefined,
      status: "active",
      assignedTo: blockageAssignedTo || undefined,
      assignedToName: blockageAssignedTo === "self" ? "Self" : 
                      blockageAssignedTo === "super-admin" ? "Super Admin" :
                      employees.find(e => e.id.toString() === blockageAssignedTo)?.name,
      assignedAt: blockageAssignedTo ? new Date().toISOString() : undefined,
    });

    // Reset form
    setBlockageTitle("");
    setBlockageReason("");
    setBlockageHowToSolve("");
    setBlockageResolveBy("");
    setBlockageStage("work-in-progress");
    setBlockageTimelineStage("");
    setBlockageSubStage("");
    setBlockageNotes("");
    setBlockageAssignedTo("");
    setSelectedCustomTag("");
    setNewCustomTagName("");
    setSaveNewTag(false);
    setIsAddBlockageOpen(false);

    toast({ title: "Blockage Added", description: "The blockage has been recorded" });
  };

  const handleAddTicket = () => {
    if (!ticketDescription || !ticketDueDate) {
      toast({ title: "Error", description: "Description and due date are required", variant: "destructive" });
      return;
    }

    if (ticketAssignees.length === 0 && !ticketAssignSuperAdmin) {
      toast({ title: "Error", description: "Please assign to at least one person", variant: "destructive" });
      return;
    }

    onAddTicket({
      projectId,
      taskType: ticketTaskType as Ticket["taskType"],
      customTaskType: ticketTaskType === "custom" ? ticketCustomType : undefined,
      description: ticketDescription,
      howToDo: ticketHowToDo || undefined,
      assignedTo: ticketAssignees,
      assignToSuperAdmin: ticketAssignSuperAdmin,
      dueDate: ticketDueDate,
      dueTime: ticketDueTime || undefined,
      priority: ticketPriority as Ticket["priority"],
      location: ticketLocation,
      linkedBlockageId: ticketLinkedBlockage || undefined,
      status: "pending",
    });

    // Reset form
    setTicketTaskType("work");
    setTicketCustomType("");
    setTicketDescription("");
    setTicketHowToDo("");
    setTicketAssignees([]);
    setTicketAssignSuperAdmin(false);
    setTicketDueDate("");
    setTicketDueTime("");
    setTicketPriority("medium");
    setTicketLocation(projectId);
    setTicketLinkedBlockage("");
    setIsAddTicketOpen(false);

    toast({ title: "Ticket Created", description: "The task has been assigned" });
  };

  // File Login: Sequential step handler
  const handleFileLoginStep = (step: string) => {
    const currentIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === fileLogin);
    const targetIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === step);
    
    // Can only move to next step or current step
    if (targetIndex <= currentIndex + 1) {
      onUpdateTimeline({ fileLogin: step as ProjectTimelineStatus["fileLogin"], updatedAt: new Date().toISOString() });
    }
  };

  const handleMarkFileLoginComplete = () => {
    if (fileLogin === "submitted") {
      onUpdateTimeline({ fileLogin: "complete", fileLoginComplete: true, updatedAt: new Date().toISOString() });
      toast({ title: "File Login Complete", description: "File login process has been marked as complete" });
    }
  };

  // Subsidy: Click to select
  const handleSubsidySelect = (value: string) => {
    onUpdateTimeline({ subsidyType: value as ProjectTimelineStatus["subsidyType"], updatedAt: new Date().toISOString() });
  };

  // Bank File: Two trees
  const handleBankFileTypeSelect = (type: "cash" | "loan") => {
    if (type === "cash") {
      onUpdateTimeline({ 
        bankFileType: "cash", 
        loanStage: "", 
        loanStatus: "",
        updatedAt: new Date().toISOString() 
      });
      toast({ title: "Cash File Selected", description: "Bank file marked as complete (Cash)" });
    } else {
      onUpdateTimeline({ 
        bankFileType: "loan", 
        loanStage: "file-prepare",
        loanStatus: "pending",
        updatedAt: new Date().toISOString() 
      });
    }
  };

  const handleLoanStageChange = (stage: string) => {
    onUpdateTimeline({ loanStage: stage as ProjectTimelineStatus["loanStage"], updatedAt: new Date().toISOString() });
  };

  const handleLoanStatusChange = (status: "approved" | "rejected") => {
    onUpdateTimeline({ loanStatus: status, updatedAt: new Date().toISOString() });
    if (status === "approved") {
      toast({ title: "Loan Approved", description: "Bank file process marked as complete" });
    } else {
      toast({ title: "Loan Rejected", description: "You can restart the process", variant: "destructive" });
    }
  };

  const handleLoanRestart = () => {
    onUpdateTimeline({ 
      loanStage: "file-prepare", 
      loanStatus: "pending", 
      updatedAt: new Date().toISOString() 
    });
    toast({ title: "Process Restarted", description: "Loan application process has been reset" });
  };

  // Work Status: Multi-select checkboxes (Admin direct action)
  const handleWorkStatusCheck = (item: string, checked: boolean) => {
    if (!isAdmin) {
      toast({ title: "Request Required", description: "Please use 'Request Done' to submit for approval", variant: "destructive" });
      return;
    }

    let newChecks = [...workStatusChecks];
    let newApprovals: WorkApprovalsState = { ...workStatusApprovals };
    if (checked) {
      if (!newChecks.includes(item)) {
        newChecks.push(item);
      }
      newApprovals = { ...newApprovals, [item]: { status: "approved", photoCount: 0, videoCount: 0 } };
    } else {
      newChecks = newChecks.filter((c) => c !== item);
      const { [item]: _removed, ...rest } = newApprovals;
      newApprovals = rest;
    }

    const isComplete = newChecks.length === WORK_STATUS_STAGES.length;
    setWorkStatusApprovals(newApprovals);
    onUpdateTimeline({
      workStatusChecks: newChecks,
      workStatusComplete: isComplete,
      workStatusApprovals: newApprovals,
      updatedAt: new Date().toISOString(),
    });

    if (isComplete) {
      toast({ title: "Work Completed", description: "All work stages have been completed" });
    }
  };

  // Sub-item click handler
  const handleSubItemClick = (stageKey: string, subItemKey: string, photoRequired: boolean) => {
    // Check if already completed
    const subApproval = workStatusApprovals[stageKey]?.subItemApprovals?.[subItemKey];
    if (subApproval?.status === "approved" || subApproval?.status === "closed") {
      return; // Already complete
    }
    
    if (photoRequired) {
      setPhotoUploadModal({ stageKey, subItemKey, open: true });
    } else {
      handleSubItemMarkComplete(stageKey, subItemKey);
    }
  };

  // Mark sub-item as complete
  const handleSubItemMarkComplete = (
    stageKey: string,
    subItemKey: string,
    photoCount?: number,
    notes?: string,
    photoUrls?: string[],
    videoUrls?: string[],
  ) => {
    const prev = workStatusApprovals;
    const photoN = photoUrls?.length ?? photoCount ?? 0;
    const videoN = videoUrls?.length ?? 0;
    const count = photoN + videoN;
    const hasMedia = photoN > 0 || videoN > 0;
    const subStatus: WorkStatusApprovalStatus =
      isAdmin ? "approved" : hasMedia ? "requested" : "pending";
    const next: WorkApprovalsState = {
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        status: prev[stageKey]?.status || "pending",
        subItemApprovals: {
          ...prev[stageKey]?.subItemApprovals,
          [subItemKey]: {
            ...prev[stageKey]?.subItemApprovals?.[subItemKey],
            status: subStatus,
            updatedBy: isAdmin ? "admin" : "currentUserId",
            updatedByName: isAdmin ? "Admin" : "Current User",
            updatedAt: new Date().toISOString(),
            photoCount: photoN,
            videoCount: videoN,
            photoUrls: photoUrls?.length ? photoUrls : prev[stageKey]?.subItemApprovals?.[subItemKey]?.photoUrls,
            videoUrls: videoUrls?.length ? videoUrls : prev[stageKey]?.subItemApprovals?.[subItemKey]?.videoUrls,
            notes: notes || undefined,
            approvedByName: isAdmin ? "Admin" : undefined,
            approvedAt: isAdmin ? new Date().toISOString() : undefined,
            requestedByName: !isAdmin && hasMedia ? "Current User" : undefined,
            requestedAt: !isAdmin && hasMedia ? new Date().toISOString() : undefined,
          },
        },
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });

    toast({
      title: isAdmin ? "Item Completed" : "Submitted for Approval",
      description: isAdmin ? "Sub-item marked as complete" : "Your update has been submitted for admin approval",
    });
  };

  // Admin approve sub-item
  const handleApproveSubItem = (stageKey: string, subItemKey: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        subItemApprovals: {
          ...prev[stageKey]?.subItemApprovals,
          [subItemKey]: {
            ...prev[stageKey]?.subItemApprovals?.[subItemKey],
            status: "approved",
            approvedByName: "Admin",
            approvedAt: new Date().toISOString(),
          },
        },
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
    toast({ title: "Approved", description: "Sub-item has been approved" });
  };

  // Admin reject sub-item with reason
  const handleRejectSubItem = (stageKey: string, subItemKey: string, reason: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        subItemApprovals: {
          ...prev[stageKey]?.subItemApprovals,
          [subItemKey]: {
            ...prev[stageKey]?.subItemApprovals?.[subItemKey],
            status: "rejected",
            rejectionReason: reason,
          },
        },
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
    setRejectReasonModal(null);
    setRejectReason("");
    toast({ title: "Rejected", description: "Photo retake requested", variant: "destructive" });
  };

  // Check if all sub-items are complete for a stage
  const areAllSubItemsComplete = (stageKey: string): boolean => {
    const stage = WORK_STATUS_STAGES.find(s => s.value === stageKey);
    if (!stage || !stage.subItems || stage.subItems.length === 0) return false;
    return stage.subItems.every(sub => {
      const subApproval = workStatusApprovals[stageKey]?.subItemApprovals?.[sub.value];
      return subApproval?.status === "approved" || subApproval?.status === "closed";
    });
  };

  // User: Request done for a work item
  const handleRequestDone = (item: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [item]: {
        ...prev[item],
        status: "requested",
        requestedAt: new Date().toISOString(),
        requestedBy: "Current User",
        photoCount: prev[item]?.photoCount ?? 0,
        videoCount: item === "inverter" ? 1 : 0,
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
    toast({ title: "Request Submitted", description: `"${WORK_STATUS_STAGES.find(i => i.value === item)?.label}" marked for approval` });
  };

  // Admin: Approve work item
  const handleApproveWorkItem = (item: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [item]: {
        ...prev[item],
        status: "approved",
      },
    };
    setWorkStatusApprovals(next);

    const newChecks = workStatusChecks.includes(item) ? [...workStatusChecks] : [...workStatusChecks, item];
    const isComplete = newChecks.length === WORK_STATUS_STAGES.length;
    onUpdateTimeline({
      workStatusChecks: newChecks,
      workStatusComplete: isComplete,
      workStatusApprovals: next,
      updatedAt: new Date().toISOString(),
    });

    toast({ title: "Approved", description: `Work item has been approved` });
  };

  // Admin: Reject work item
  const handleRejectWorkItem = (item: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [item]: {
        ...prev[item],
        status: "rejected",
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
    toast({ title: "Rejected", description: `Work item has been sent back for revision`, variant: "destructive" });
  };

  // Admin: Mark as closed
  const handleCloseWorkItem = (item: string) => {
    const prev = workStatusApprovals;
    const next: WorkApprovalsState = {
      ...prev,
      [item]: {
        ...prev[item],
        status: "closed",
      },
    };
    setWorkStatusApprovals(next);
    onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
    toast({ title: "Completed", description: `Work item marked as completed` });
  };
  
  // Handle Mark Completed - check for photo requirements
  const handleMarkCompleted = (stageKey: string) => {
    const stage = WORK_STATUS_STAGES.find(s => s.value === stageKey);
    const approval = workStatusApprovals[stageKey];
    
    // If photos required and none attached, show photo options modal
    if ((stage?.photoRequired || stage?.videoRequired) && !approval?.photoCount) {
      setPhotoAssignmentModal({
        stageKey,
        stageName: stage?.label || stageKey,
        open: true,
      });
    } else {
      // Proceed with marking complete
      handleCloseWorkItem(stageKey);
    }
  };
  
  // Handle photo assignment submit
  const handlePhotoAssignmentSubmit = () => {
    if (!photoAssignmentModal) return;

    if (uploadPhotosDirectly) {
      const prev = workStatusApprovals;
      const key = photoAssignmentModal.stageKey;
      const next: WorkApprovalsState = {
        ...prev,
        [key]: {
          ...prev[key],
          status: "closed",
          photoCount: prev[key]?.photoCount && prev[key]!.photoCount! > 0 ? prev[key]!.photoCount : 1,
        },
      };
      setWorkStatusApprovals(next);
      onUpdateTimeline({ workStatusApprovals: next, updatedAt: new Date().toISOString() });
      toast({ title: "Completed", description: "Stage marked as completed (upload flow)" });
    } else {
      // Assign to someone
      if (!photoAssignTo) {
        toast({ title: "Error", description: "Please select an employee to assign", variant: "destructive" });
        return;
      }
      const emp = employees.find(e => e.id.toString() === photoAssignTo);
      toast({ 
        title: "Photo Request Sent", 
        description: `Request sent to ${emp?.name || "Employee"} for photos of ${photoAssignmentModal.stageName}` 
      });
    }
    
    // Reset modal state
    setPhotoAssignmentModal(null);
    setPhotoAssignTo("");
    setPhotoAssignNotes("");
    setUploadPhotosDirectly(false);
  };
  
  // Get transported count for a stage based on materials sent
  const getTransportedCount = (stageKey: string): number => {
    if (!materialsSent || materialsSent.length === 0) return 0;
    const keywords = TRANSPORT_MATERIAL_MAP[stageKey] || [];
    return materialsSent.filter(m => 
      keywords.some(k => m.itemName.toLowerCase().includes(k))
    ).length;
  };
  
  // Get pending transport count (placeholder - would need to know expected quantity)
  const getPendingTransportCount = (stageKey: string): number => {
    // For now, return a static demo value
    const transported = getTransportedCount(stageKey);
    return transported > 0 ? Math.max(0, 5 - transported) : 0;
  };

  // DISCOM: Sequential checkboxes
  const handleDiscomCheck = (item: string, checked: boolean) => {
    const itemIndex = DISCOM_ITEMS.findIndex(d => d.value === item);
    let newChecks = [...discomChecks];
    
    if (checked) {
      // Can only check if previous items are checked
      const canCheck = DISCOM_ITEMS.slice(0, itemIndex).every(d => discomChecks.includes(d.value));
      if (canCheck || itemIndex === 0) {
        if (!newChecks.includes(item)) {
          newChecks.push(item);
        }
      } else {
        toast({ title: "Complete Previous Step", description: "Please complete the previous steps first", variant: "destructive" });
        return;
      }
    } else {
      // When unchecking, also uncheck subsequent items
      newChecks = newChecks.filter(c => {
        const cIndex = DISCOM_ITEMS.findIndex(d => d.value === c);
        return cIndex < itemIndex;
      });
    }
    
    onUpdateTimeline({ discomChecks: newChecks, updatedAt: new Date().toISOString() });
  };

  const handleDiscomSubsidyStatus = (status: "approved" | "rejected") => {
    onUpdateTimeline({ discomSubsidyStatus: status, updatedAt: new Date().toISOString() });
    if (status === "approved") {
      toast({ title: "Subsidy Approved", description: "DISCOM process marked as complete" });
    }
  };

  // Payment: Two trees
  const handlePaymentTypeSelect = (type: "cash-to-mahi" | "instalments") => {
    onUpdateTimeline({ 
      paymentType: type, 
      cashToMahiConfirmed: false,
      firstInstallmentPaid: false,
      secondInstallmentPaid: false,
      updatedAt: new Date().toISOString() 
    });
  };

  const handleConfirmCashToMahi = () => {
    onUpdateTimeline({ cashToMahiConfirmed: true, updatedAt: new Date().toISOString() });
    setIsConfirmCashModalOpen(false);
    toast({ title: "Payment Confirmed", description: "Cash to Mahi payment has been confirmed" });
  };

  const handleFirstInstallmentCheck = (checked: boolean) => {
    onUpdateTimeline({ firstInstallmentPaid: checked, updatedAt: new Date().toISOString() });
  };

  const handleSecondInstallmentClick = () => {
    if (firstInstallmentPaid) {
      setIsConfirmInstallmentModalOpen(true);
    } else {
      toast({ title: "Complete 1st Installment", description: "Please mark 1st installment as paid first", variant: "destructive" });
    }
  };

  const handleConfirmSecondInstallment = () => {
    onUpdateTimeline({ secondInstallmentPaid: true, updatedAt: new Date().toISOString() });
    setIsConfirmInstallmentModalOpen(false);
    toast({ title: "Payment Complete", description: "All installments have been paid" });
  };

  // Open resolve blockage modal
  const handleOpenResolveBlockageModal = (blockage: Blockage) => {
    setSelectedBlockageToResolve(blockage);
    setResolvedBy("");
    setResolveDate(new Date().toISOString().split('T')[0]);
    setResolveNotes("");
    setIsResolveBlockageModalOpen(true);
  };

  // Handle resolving blockage
  const handleResolveBlockageSubmit = () => {
    if (!selectedBlockageToResolve || !resolvedBy) {
      toast({ title: "Error", description: "Please select who resolved the blockage", variant: "destructive" });
      return;
    }
    const resolvedByName =
      resolvedBy === "self"
        ? "Self"
        : resolvedBy === "super-admin"
          ? "Super Admin"
          : employees.find((e) => e.id.toString() === resolvedBy)?.name ?? resolvedBy;
    const resolvedAt = new Date(`${resolveDate}T12:00:00`).toISOString();
    const notes = resolveNotes.trim() || undefined;
    onResolveBlockage(selectedBlockageToResolve.id, {
      resolvedBy,
      resolvedByName,
      resolvedAt,
      notes,
    });
    setIsResolveBlockageModalOpen(false);
    setSelectedBlockageToResolve(null);
    setResolveNotes("");
    toast({ title: "Blockage Resolved", description: "The blockage has been marked as resolved" });
  };

  // Calculate progress percentages
  const getFileLoginProgress = () => {
    if (fileLogin === "pending") return 0;
    if (fileLogin === "complete") return 100;
    const step = FILE_LOGIN_STEPS.find(s => s.value === fileLogin);
    return step?.percent || 0;
  };

  const getWorkStatusProgress = () => {
    return Math.round((workStatusChecks.length / WORK_STATUS_STAGES.length) * 100);
  };

  const getDiscomProgress = () => {
    if (discomSubsidyStatus === "approved") return 100;
    return Math.round((discomChecks.length / DISCOM_ITEMS.length) * 75); // Max 75% until approved
  };

  const getBankFileProgress = () => {
    if (bankFileType === "cash") return 100;
    if (bankFileType === "loan") {
      if (loanStatus === "approved") return 100;
      if (loanStatus === "rejected") return 75;
      const stageIndex = LOAN_STAGES.findIndex(s => s.value === loanStage);
      return Math.round(((stageIndex + 1) / LOAN_STAGES.length) * 75);
    }
    return 0;
  };

  const getPaymentProgress = () => {
    if (paymentType === "cash-to-mahi") {
      return cashToMahiConfirmed ? 100 : 50;
    }
    if (paymentType === "instalments") {
      if (secondInstallmentPaid) return 100;
      if (firstInstallmentPaid) return 50;
      return 25;
    }
    return 0;
  };

  // DCR progress helpers
  const getDcrProgress = () => {
    const dcrStatus = timelineStatus?.dcrStatus;
    if (!dcrStatus || dcrStatus === "pending") return 0;
    if (dcrStatus === "complete") return 100;
    const step = DCR_STEPS.find(s => s.value === dcrStatus);
    return step?.percent || 0;
  };

  const handleDcrStepChange = (step: string) => {
    onUpdateTimeline({ dcrStatus: step as ProjectTimelineStatus["dcrStatus"], updatedAt: new Date().toISOString() });
  };

  const handleDcrComplete = () => {
    onUpdateTimeline({ dcrStatus: "complete", dcrComplete: true, updatedAt: new Date().toISOString() });
    toast({ title: "DCR Complete", description: "DCR & Work Completion Report has been marked as complete" });
  };
  // Calculate overall progress for site status card
  const calculateOverallProgress = () => {
    if (!timelineStatus) return 0;
    
    let progress = 0;
    const stepWeight = 100 / 7; // Now 7 steps instead of 6
    
    // File Login
    if (timelineStatus.fileLoginComplete || timelineStatus.fileLogin === "complete") {
      progress += stepWeight;
    } else if (timelineStatus.fileLogin === "submitted") {
      progress += stepWeight * 0.9;
    } else if (timelineStatus.fileLogin === "file-login") {
      progress += stepWeight * 0.66;
    } else if (timelineStatus.fileLogin === "doc-received") {
      progress += stepWeight * 0.33;
    }
    
    // Subsidy
    if (timelineStatus.subsidyType) {
      progress += stepWeight;
    }
    
    // Bank File
    if (bankFileType === "cash" || loanStatus === "approved") {
      progress += stepWeight;
    } else if (bankFileType === "loan") {
      if (loanStage === "loan-apply") progress += stepWeight * 0.75;
      else if (loanStage === "file-into-bank") progress += stepWeight * 0.5;
      else if (loanStage === "file-prepare") progress += stepWeight * 0.25;
    }
    
    // Work Status
    const workChecks = workStatusChecks.length;
    progress += (workChecks / 6) * stepWeight;
    
    // DISCOM
    if (discomSubsidyStatus === "approved") {
      progress += stepWeight;
    } else {
      const numDiscomChecks = discomChecks.length;
      progress += (numDiscomChecks / 3) * stepWeight * 0.75;
    }
    
    // Payment
    if (cashToMahiConfirmed || secondInstallmentPaid) {
      progress += stepWeight;
    } else if (firstInstallmentPaid) {
      progress += stepWeight * 0.5;
    } else if (paymentType) {
      progress += stepWeight * 0.25;
    }
    
    // DCR
    if (timelineStatus.dcrComplete || timelineStatus.dcrStatus === "complete") {
      progress += stepWeight;
    } else if (timelineStatus.dcrStatus === "submitted") {
      progress += stepWeight * 0.9;
    } else if (timelineStatus.dcrStatus === "documentation") {
      progress += stepWeight * 0.66;
    } else if (timelineStatus.dcrStatus === "preparation") {
      progress += stepWeight * 0.33;
    }
    
    return Math.round(progress);
  };

  // Step completion check for site status card
  const isStepComplete = (stepKey: string): boolean => {
    switch (stepKey) {
      case "fileLogin":
        return timelineStatus?.fileLoginComplete === true || timelineStatus?.fileLogin === "complete";
      case "subsidyType":
        return !!timelineStatus?.subsidyType;
      case "bankFileType":
        return bankFileType === "cash" || loanStatus === "approved";
      case "workStatus":
        return timelineStatus?.workStatusComplete === true || workStatusChecks.includes("transport");
      case "discomStatus":
        return discomSubsidyStatus === "approved";
      case "paymentStatus":
        return cashToMahiConfirmed || secondInstallmentPaid;
      case "dcrStatus":
        return timelineStatus?.dcrComplete === true || timelineStatus?.dcrStatus === "complete";
      default:
        return false;
    }
  };

  // Step in-progress check for site status card
  const isStepInProgress = (stepKey: string): boolean => {
    switch (stepKey) {
      case "fileLogin":
        return fileLogin !== "pending" && fileLogin !== "complete" && !timelineStatus?.fileLoginComplete;
      case "subsidyType":
        return false;
      case "bankFileType":
        return bankFileType === "loan" && loanStatus !== "approved";
      case "workStatus":
        return workStatusChecks.length > 0 && !timelineStatus?.workStatusComplete;
      case "discomStatus":
        return discomChecks.length > 0 && discomSubsidyStatus !== "approved";
      case "paymentStatus":
        return (paymentType === "cash-to-mahi" && !cashToMahiConfirmed) ||
               (paymentType === "instalments" && firstInstallmentPaid && !secondInstallmentPaid);
      case "dcrStatus":
        return timelineStatus?.dcrStatus && 
               timelineStatus.dcrStatus !== "pending" && 
               timelineStatus.dcrStatus !== "complete" && 
               !timelineStatus?.dcrComplete;
      default:
        return false;
    }
  };

  // Render step detail content for site status card
  const renderStepDetails = (stepKey: string) => {
    switch (stepKey) {
      case "fileLogin":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">File Login Progress</p>
            <div className="flex items-center gap-2 text-xs">
              {fileLogin === "pending" ? (
                <Circle className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
              )}
              <span>Pending</span>
            </div>
            {FILE_LOGIN_STEPS.map((step) => {
              const currentIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === fileLogin);
              const stepIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === step.value);
              const isComplete = timelineStatus?.fileLoginComplete || fileLogin === "complete" || stepIndex < currentIndex;
              const isCurrent = step.value === fileLogin;
              
              return (
                <div key={step.value} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                    ) : isCurrent ? (
                      <Circle className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>{step.label}</span>
                  </div>
                  <span className="text-muted-foreground">{step.percent}%</span>
                </div>
              );
            })}
            <div className="pt-2 border-t mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5"
                onClick={() => {
                  setTaskModalMilestoneId("fileLogin");
                  setIsAssignTaskOpen(true);
                }}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
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
                    subsidyType === opt.value 
                      ? 'bg-primary/20 border border-primary/50 text-foreground' 
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-2xs">{opt.amount}</p>
                  {subsidyType === opt.value && <CheckCircle2 className="w-3 h-3 mx-auto mt-0.5 text-primary" />}
                </div>
              ))}
            </div>
          </div>
        );
        
      case "bankFileType":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Bank File / Cash</p>
            {bankFileType === "cash" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 bg-accent rounded text-xs">
                  <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  <span className="text-success font-medium">Cash File - Complete</span>
                </div>
                {projectContractAmount && (
                  <div className="text-2xs text-muted-foreground space-y-0.5 pl-1">
                    <p>Contract: {formatCurrency(projectContractAmount)}</p>
                    <p>Received: {formatCurrency(totalCashReceived)}</p>
                  </div>
                )}
              </div>
            ) : bankFileType === "loan" ? (
              <div className="space-y-1.5">
                {projectBankDocAmount && (
                  <p className="text-2xs text-muted-foreground pl-1">Bank Doc: {formatCurrency(projectBankDocAmount)}</p>
                )}
                {LOAN_STAGES.map((stage, idx) => {
                  const currentIndex = LOAN_STAGES.findIndex(s => s.value === loanStage);
                  const isComplete = idx < currentIndex || loanStatus === "approved";
                  const isCurrent = stage.value === loanStage && loanStatus !== "approved";
                  
                  return (
                    <div key={stage.value} className="flex items-center gap-2 text-xs">
                      {isComplete ? (
                        <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                      ) : isCurrent ? (
                        <Circle className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}>{stage.label}</span>
                    </div>
                  );
                })}
                {loanStatus === "approved" && (
                  <div className="flex items-center gap-2 p-2 bg-accent rounded text-xs mt-2">
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                    <span className="text-success font-medium">Loan Approved</span>
                  </div>
                )}
                {loanStatus === "rejected" && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-xs mt-2">
                    <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                    <span className="text-destructive font-medium">Loan Rejected</span>
                  </div>
                )}
              </div>
            ) : bankFileType === "cash-and-loan" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 bg-accent rounded text-xs">
                  <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  <span className="text-success font-medium">Cash + Loan</span>
                </div>
                {projectContractAmount && (
                  <p className="text-2xs text-muted-foreground pl-1">Contract: {formatCurrency(projectContractAmount)}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not selected</p>
            )}
            <div className="pt-2 border-t mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5"
                onClick={() => {
                  setTaskModalMilestoneId("bankFileType");
                  setIsAssignTaskOpen(true);
                }}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
          </div>
        );
        
      case "workStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Work Status ({workStatusChecks.length}/{WORK_STATUS_STAGES.length})</p>
            <div className="grid grid-cols-2 gap-1.5">
              {WORK_STATUS_STAGES.map((stage) => {
                const isChecked = workStatusChecks.includes(stage.value);
                return (
                  <div key={stage.value} className="flex items-center gap-1.5 text-xs">
                    {isChecked ? (
                      <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>{stage.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t mt-2">
              <Button size="sm" variant="ghost" className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5" onClick={() => { setTaskModalMilestoneId("workStatus"); setIsAssignTaskOpen(true); }}>
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
          </div>
        );
        
      case "discomStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">DISCOM Status</p>
            {DISCOM_ITEMS.map((item) => {
              const isChecked = discomChecks.includes(item.value);
              return (
                <div key={item.value} className="flex items-center gap-2 text-xs">
                  {isChecked ? (
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={isChecked ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
                </div>
              );
            })}
            {discomSubsidyStatus === "approved" && (
              <div className="flex items-center gap-2 p-2 bg-accent rounded text-xs mt-2">
                <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                <span className="text-success font-medium">Subsidy Approved</span>
              </div>
            )}
            <div className="pt-2 border-t mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5"
                onClick={() => {
                  setTaskModalMilestoneId("discomStatus");
                  setIsAssignTaskOpen(true);
                }}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
          </div>
        );
        
      case "paymentStatus":
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Payment Status</p>
            {paymentType === "cash-to-mahi" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Circle className="w-3 h-3 text-primary fill-primary flex-shrink-0" />
                  <span className="font-medium">Cash to Mahi</span>
                </div>
                {projectContractAmount && (
                  <div className="text-2xs text-muted-foreground space-y-0.5 pl-5">
                    <p>Total: {formatCurrency(projectContractAmount)}</p>
                    <p>Received: {formatCurrency(totalCashReceived)}</p>
                    <p>Remaining: {formatCurrency(Math.max(0, projectContractAmount - totalCashReceived))}</p>
                  </div>
                )}
                {cashToMahiConfirmed && (
                  <div className="flex items-center gap-2 p-2 bg-accent rounded text-xs">
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                    <span className="text-success font-medium">Payment Confirmed</span>
                  </div>
                )}
              </div>
            ) : paymentType === "instalments" ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {firstInstallmentPaid ? (
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={firstInstallmentPaid ? 'text-foreground' : 'text-muted-foreground'}>
                    1st: {firstInstalmentAmount ? formatCurrency(firstInstalmentAmount) : "1st Installment"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {secondInstallmentPaid ? (
                    <CheckCircle2 className="w-3 h-3 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span className={secondInstallmentPaid ? 'text-foreground' : 'text-muted-foreground'}>
                    2nd: {secondInstalmentAmount ? formatCurrency(secondInstalmentAmount) : "2nd Installment"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not selected</p>
            )}
            <div className="pt-2 border-t mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5"
                onClick={() => {
                  setTaskModalMilestoneId("paymentStatus");
                  setIsAssignTaskOpen(true);
                }}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
          </div>
        );
        
      case "dcrStatus": {
        const DCR_STEPS = [
          { value: "preparation", label: "Preparation" },
          { value: "documentation", label: "Documentation" },
          { value: "submitted", label: "Submitted" },
          { value: "complete", label: "Complete" },
        ] as const;
        const currentDcr = timelineStatus?.dcrStatus || "pending";
        const currentDcrIndex = DCR_STEPS.findIndex(s => s.value === currentDcr);
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">DCR Status</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DCR_STEPS.map((step, idx) => {
                const isStepDone = timelineStatus?.dcrComplete || currentDcr === "complete" || (currentDcrIndex >= 0 && idx < currentDcrIndex);
                const isCurrent = step.value === currentDcr;
                return (
                  <button
                    key={step.value}
                    className={`p-2 rounded text-xs text-left flex items-center gap-1.5 transition-colors ${
                      isStepDone
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : isCurrent
                        ? "bg-accent border border-border text-foreground font-medium"
                        : "bg-muted/50 text-muted-foreground border border-transparent"
                    }`}
                    onClick={() => {
                      const newStatus = step.value as ProjectTimelineStatus["dcrStatus"];
                      const isComplete = step.value === "complete";
                      onUpdateTimeline({ dcrStatus: newStatus, dcrComplete: isComplete, updatedAt: new Date().toISOString() });
                    }}
                  >
                    {isStepDone ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <Circle className="w-3 h-3 flex-shrink-0 opacity-40" />}
                    {step.label}
                  </button>
                );
              })}
            </div>
            <div className="pt-2 border-t mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-full text-2xs uppercase font-bold text-primary hover:bg-primary/5"
                onClick={() => {
                  setTaskModalMilestoneId("dcrStatus");
                  setIsAssignTaskOpen(true);
                }}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Quick Assign Task
              </Button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  const overallProgress = calculateOverallProgress();

  // Determine which CTA to show based on project status
  const isCompleted = projectStatus === "Completed";

  return (
    <div className="space-y-6">
      {/* Conditional CTA Button - based on project status */}
      <div className="flex flex-wrap gap-2">
        {isCompleted ? (
          <Button onClick={() => setIsAddTicketOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setIsAddBlockageOpen(true)}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            Add Blockage
          </Button>
        )}
      </div>

      {/* Active Site Status Card - Enhanced Visual Design */}
      <Card className="bg-gradient-to-br from-card to-muted/20 border-muted-foreground/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Site Status Overview</CardTitle>
                <CardDescription className="text-xs mt-0.5">7-step progress tracker</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${
                overallProgress >= 75 ? 'text-success' : 
                overallProgress >= 50 ? 'text-primary' : 
                'text-muted-foreground'
              }`}>
                {overallProgress}%
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar - Enhanced */}
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                overallProgress >= 75 ? 'bg-gradient-to-r from-primary/50 to-primary/30' :
                overallProgress >= 50 ? 'bg-gradient-to-r from-primary to-primary/80' :
                'bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          
          {/* Step Indicators with Enhanced Styling */}
          <div className="bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl p-4 border border-muted-foreground/10">
            {/* Connecting Line */}
            <div className="relative px-2 mb-3">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-muted-foreground/15 rounded-full" />
              <div 
                className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.max(0, (visibleSteps.filter(s => isStepComplete(s.key)).length - 1) / (visibleSteps.length - 1) * 100)}%`,
                  maxWidth: 'calc(100% - 48px)'
                }}
              />
              
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                {visibleSteps.map((step) => {
                  const isComplete = isStepComplete(step.key);
                  const inProgress = isStepInProgress(step.key);
                  const isExpanded = expandedStep === step.key;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1 z-10">
                      <div 
                        onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer 
                          ${isComplete 
                            ? 'bg-gradient-to-br from-primary to-primary/85 text-primary-foreground shadow-md shadow-primary/20' 
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
                          isComplete ? 'text-success' : inProgress ? 'text-primary' : 'text-muted-foreground/70'
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
            
            {/* Collapsible Details - Enhanced */}
            <Collapsible open={!!expandedStep}>
              <CollapsibleContent className="animate-accordion-down">
                <div className="pt-3 mt-2 border-t border-muted-foreground/10 bg-background/50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                  {expandedStep && renderStepDetails(expandedStep)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {pendingTickets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              Pending Tasks ({pendingTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTickets.map(ticket => {
                const priorityConfig = PRIORITIES.find(p => p.value === ticket.priority);
                const assigneeNames = ticket.assignedTo
                  .map(id => employees.find(e => e.id === id)?.name || "Unknown")
                  .join(", ");
                
                return (
                  <div key={ticket.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">{ticket.taskType}</Badge>
                        <Badge className={`text-xs ${priorityConfig?.color || ""}`}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm">{ticket.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {format(new Date(ticket.dueDate), "dd MMM")}
                          {ticket.dueTime && ` at ${ticket.dueTime}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {assigneeNames || (ticket.assignToSuperAdmin ? "Super Admin" : "Unassigned")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Site Blockages Section - with Active/History Toggle */}
      <Card className={`${activeBlockages.length > 0 ? 'border-orange-500/30 shadow-orange-500/5' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${activeBlockages.length > 0 ? 'bg-orange-500/20' : 'bg-muted/90'}`}>
                {activeBlockages.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Site Blockages</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {blockageViewMode === "active" 
                    ? (activeBlockages.length > 0 
                        ? `${activeBlockages.length} active issue${activeBlockages.length > 1 ? 's' : ''}` 
                        : 'No active blockages')
                    : `${resolvedBlockages.length} resolved blockage${resolvedBlockages.length !== 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Active/History Toggle */}
              <div className="flex items-center rounded-lg border bg-muted p-1">
                <Button
                  variant={blockageViewMode === "active" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setBlockageViewMode("active")}
                >
                  Active ({activeBlockages.length})
                </Button>
                <Button
                  variant={blockageViewMode === "history" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setBlockageViewMode("history")}
                >
                  History ({resolvedBlockages.length})
                </Button>
              </div>
              
              <Button size="sm" variant="outline" onClick={() => setIsAddBlockageOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {blockageViewMode === "active" && activeBlockages.length === 0 ? (
            <div className="text-center py-8 bg-muted/40 rounded-xl border border-border/60">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-success/70" />
              <p className="text-sm font-medium text-success">All Clear!</p>
              <p className="text-xs text-muted-foreground mt-1">
                {resolvedBlockages.length > 0 
                  ? `No active blockages. ${resolvedBlockages.length} resolved blockage${resolvedBlockages.length !== 1 ? 's' : ''} in history.`
                  : "No blockages have been recorded for this project."
                }
              </p>
              {resolvedBlockages.length > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="mt-2 text-xs"
                  onClick={() => setBlockageViewMode("history")}
                >
                  View History →
                </Button>
              )}
            </div>
          ) : blockageViewMode === "history" && resolvedBlockages.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-xl border">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No History</p>
              <p className="text-xs text-muted-foreground mt-1">No blockages have been resolved yet.</p>
            </div>
          ) : blockageViewMode === "active" ? (
            <div className="space-y-4">
              {activeBlockages.map(blockage => {
                const daysSince = blockage.createdAt 
                  ? formatDistanceToNow(new Date(blockage.createdAt), { addSuffix: true })
                  : 'Unknown';
                const isDelayed = blockage.projectStage === 'delayed';
                const isOnHold = blockage.projectStage === 'on-hold';
                const priorityColor = isDelayed ? 'bg-red-500' : isOnHold ? 'bg-yellow-500' : 'bg-orange-500';
                const priorityBg = isDelayed ? 'bg-red-500/10 border-red-500/30' : isOnHold ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-orange-500/10 border-orange-500/30';
                const priorityText = isDelayed ? 'text-red-400' : isOnHold ? 'text-yellow-400' : 'text-orange-400';
                
                return (
                  <div key={blockage.id} className={`relative overflow-hidden rounded-xl border ${priorityBg}`}>
                    {/* Priority indicator bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityColor}`} />
                    
                    <div className="p-4 pl-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold ${priorityText}`}>{blockage.title}</h4>
                            <Badge variant="secondary" className={`text-2xs px-1.5 py-0 h-4 ${
                              isDelayed ? 'bg-red-500/20 text-red-400' : 
                              isOnHold ? 'bg-yellow-500/20 text-yellow-400' : 
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {isDelayed ? 'HIGH PRIORITY' : isOnHold ? 'MEDIUM' : 'NORMAL'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{blockage.reason}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className={`shrink-0 gap-1.5 ${priorityText} border-current/30 hover:bg-current/10`}
                          onClick={() => handleOpenResolveBlockageModal(blockage)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Resolve
                        </Button>
                      </div>
                      
                      {/* How to Solve - Always visible in detailed view */}
                      {blockage.howToSolve && (
                        <div className="mb-3 p-3 bg-background/50 rounded-lg border border-muted-foreground/10">
                          <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" />
                            How to Solve
                          </p>
                          <p className="text-sm">{blockage.howToSolve}</p>
                        </div>
                      )}
                      
                      {/* Notes */}
                      {blockage.notes && (
                        <div className="mb-3 p-3 bg-background/50 rounded-lg border border-muted-foreground/10">
                          <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                            <FileText className="w-3 h-3" />
                            Notes
                          </p>
                          <p className="text-sm text-muted-foreground">{blockage.notes}</p>
                        </div>
                      )}
                      
                      {/* Meta info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-2xs text-muted-foreground">Assigned To</p>
                            <p className="font-medium">{blockage.assignedToName || 'Unassigned'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-2xs text-muted-foreground">Resolve By</p>
                            <p className="font-medium">
                              {blockage.resolveByDate 
                                ? format(new Date(blockage.resolveByDate), "dd MMM yyyy")
                                : 'Not set'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-2xs text-muted-foreground">Created</p>
                            <p className="font-medium">{daysSince}</p>
                          </div>
                        </div>
                        
                        {blockage.timelineStage && (
                          <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                            <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-2xs text-muted-foreground">Timeline Stage</p>
                              <p className="font-medium capitalize">{blockage.timelineStage.replace('-', ' ')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              );
            })}
          </div>
          ) : (
            /* History View - Resolved Blockages */
            <div className="space-y-4">
              {resolvedBlockages.map(blockage => {
                const resolvedDate = blockage.resolvedAt 
                  ? format(new Date(blockage.resolvedAt), "dd MMM yyyy")
                  : 'Unknown';
                const createdDate = blockage.createdAt 
                  ? format(new Date(blockage.createdAt), "dd MMM yyyy")
                  : 'Unknown';
                
                return (
                  <div key={blockage.id} className="relative overflow-hidden rounded-xl border bg-muted/20">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                    
                    <div className="p-4 pl-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <h4 className="font-semibold text-foreground">{blockage.title}</h4>
                            <Badge variant="outline" className="bg-accent text-foreground border-border/80 text-2xs px-1.5">
                              RESOLVED
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{blockage.reason}</p>
                        </div>
                      </div>
                      
                      {/* How it was solved */}
                      {blockage.howToSolve && (
                        <div className="mb-3 p-3 bg-background/50 rounded-lg border border-muted-foreground/10">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">How it was solved</p>
                          <p className="text-sm">{blockage.howToSolve}</p>
                        </div>
                      )}
                      
                      {/* Resolution notes */}
                      {blockage.notes && (
                        <div className="mb-3 p-3 bg-background/50 rounded-lg border border-muted-foreground/10">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm text-muted-foreground">{blockage.notes}</p>
                        </div>
                      )}
                      
                      {/* Meta info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-2xs text-muted-foreground">Created</p>
                            <p className="font-medium">{createdDate}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
                          <Check className="w-3.5 h-3.5 text-success" />
                          <div>
                            <p className="text-2xs text-muted-foreground">Resolved</p>
                            <p className="font-medium text-foreground">{resolvedDate}</p>
                          </div>
                        </div>
                        
                        {blockage.resolvedByName && (
                          <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-2xs text-muted-foreground">Resolved By</p>
                              <p className="font-medium">{blockage.resolvedByName}</p>
                            </div>
                          </div>
                        )}
                        
                        {blockage.timelineStage && (
                          <div className="flex items-center gap-2 p-2 bg-background/50 rounded-lg">
                            <Flag className="w-3.5 h-3.5 text-muted-foreground" />
                            <div>
                              <p className="text-2xs text-muted-foreground">Stage</p>
                              <p className="font-medium capitalize">
                                {blockage.timelineStage.replace('-', ' ')}
                                {blockage.timelineSubStage && ` → ${blockage.timelineSubStage.replace('-', ' ')}`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Tickets - Only for Completed Projects */}
      {projectStatus === "Completed" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{activeTickets.length}</Badge>
                <CardTitle className="text-base">Site Tickets</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {/* Active/History Toggle */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <Button 
                    size="sm" 
                    variant={ticketViewMode === "active" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => setTicketViewMode("active")}
                  >
                    Active ({activeTickets.length})
                  </Button>
                  <Button 
                    size="sm" 
                    variant={ticketViewMode === "history" ? "default" : "ghost"}
                    className="h-7 text-xs"
                    onClick={() => setTicketViewMode("history")}
                  >
                    History ({resolvedTickets.length})
                  </Button>
                </div>
                <Button size="sm" onClick={() => setIsAddTicketOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Ticket
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ticketViewMode === "active" ? (
              activeTickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active tickets</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTickets.map(ticket => {
                    const priorityStyle = PRIORITIES.find(p => p.value === ticket.priority);
                    return (
                      <div key={ticket.id} className="relative overflow-hidden rounded-xl border bg-card/50">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                          ticket.priority === "urgent" ? "bg-destructive" :
                          ticket.priority === "high" ? "bg-orange-500" :
                          ticket.priority === "medium" ? "bg-amber-500" :
                          "bg-primary"
                        }`} />
                        <div className="p-4 pl-5">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-foreground">{ticket.description}</h4>
                                <Badge className={priorityStyle?.color || ""} variant="outline">
                                  {ticket.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {ticket.taskType === "custom" ? ticket.customTaskType : ticket.taskType} • Due: {format(new Date(ticket.dueDate), "dd MMM yyyy")}
                              </p>
                            </div>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                              {ticket.status}
                            </Badge>
                          </div>
                          {ticket.howToDo && (
                            <p className="text-sm text-muted-foreground mb-3">{ticket.howToDo}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              resolvedTickets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No ticket history</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {resolvedTickets.map(ticket => (
                    <div key={ticket.id} className="relative overflow-hidden rounded-xl border bg-muted/20">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <h4 className="font-semibold text-foreground">{ticket.description}</h4>
                              <Badge variant="outline" className="bg-accent text-foreground border-border/80 text-2xs px-1.5">
                                {ticket.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {ticket.taskType === "custom" ? ticket.customTaskType : ticket.taskType}
                              {ticket.completedAt && ` • Completed: ${format(new Date(ticket.completedAt), "dd MMM yyyy")}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* 6-Step Project Timeline */}
      <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-base">Project Timeline (7 Steps)</CardTitle>
                {isTimelineOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. File Login - Sequential Steps */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">1️⃣ File Login</span>
                    {fileLogin === "complete" && (
                      <Badge className="bg-muted/90 text-success">Complete</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getFileLoginProgress()}%</span>
                    </div>
                    <Progress value={getFileLoginProgress()} className="h-2" />
                  </div>
                  
                  {/* Step List */}
                  <div className="space-y-2">
                    {/* Pending - no percentage */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {fileLogin === "pending" ? (
                          <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                        )}
                        <span className={fileLogin === "pending" ? 'font-medium text-primary' : 'text-muted-foreground'}>
                          Pending
                        </span>
                      </div>
                      <span className="text-muted-foreground">-</span>
                    </div>
                    
                    {FILE_LOGIN_STEPS.map((step, idx) => {
                      const currentIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === fileLogin);
                      const stepIndex = FILE_LOGIN_STEPS.findIndex(s => s.value === step.value);
                      const isComplete = fileLogin === "complete" || stepIndex < currentIndex;
                      const isCurrent = step.value === fileLogin;
                      const isClickable = fileLogin !== "complete" && (
                        (fileLogin === "pending" && stepIndex === 0) ||
                        (fileLogin !== "pending" && stepIndex <= currentIndex + 1)
                      );
                      
                      return (
                        <div 
                          key={step.value} 
                          className={`flex items-center justify-between text-xs ${isClickable ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded' : ''}`}
                          onClick={() => isClickable && handleFileLoginStep(step.value)}
                        >
                          <div className="flex items-center gap-2">
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            ) : isCurrent ? (
                              <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className={isCurrent ? 'font-medium text-primary' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
                              {step.label}
                            </span>
                          </div>
                          <span className={isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'}>{step.percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Mark Complete Button */}
                  {fileLogin === "submitted" && (
                    <Button size="sm" className="w-full mt-3" onClick={handleMarkFileLoginComplete}>
                      <Check className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                </div>

                {/* 2. Subsidy - Visual Clickable Cards */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">2️⃣ Subsidy Type</span>
                    {subsidyType && (
                      <Badge className="bg-muted/90 text-success">Selected</Badge>
                    )}
                  </div>
                  
                  {/* Visual Option Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    {SUBSIDY_OPTIONS.map(opt => (
                      <div 
                        key={opt.value}
                        className={`p-3 rounded-lg border-2 text-center transition-all cursor-pointer ${
                          subsidyType === opt.value 
                            ? `${opt.color} ring-2 ring-primary ring-offset-1` 
                            : 'bg-muted/30 border-transparent hover:border-muted-foreground/20'
                        }`}
                        onClick={() => handleSubsidySelect(opt.value)}
                      >
                        <p className="text-xs font-medium">{opt.label}</p>
                        <p className="text-sm font-bold">{opt.amount}</p>
                        {subsidyType === opt.value && (
                          <CheckCircle2 className="w-4 h-4 text-primary mx-auto mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Applied Display */}
                  {subsidyType && (
                    <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg mt-3">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">
                        Applied: {SUBSIDY_OPTIONS.find(o => o.value === subsidyType)?.label} ({SUBSIDY_OPTIONS.find(o => o.value === subsidyType)?.amount})
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Bank File - Two Trees */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">3️⃣ Bank File / Cash</span>
                    {(bankFileType === "cash" || loanStatus === "approved") && (
                      <Badge className="bg-muted/90 text-success">Complete</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getBankFileProgress()}%</span>
                    </div>
                    <Progress value={getBankFileProgress()} className="h-2" />
                  </div>
                  
                  {/* Type Selection */}
                  {!bankFileType && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-auto py-3 flex-col"
                        onClick={() => handleBankFileTypeSelect("cash")}
                      >
                        <IndianRupee className="w-4 h-4 mb-1" />
                        <span className="text-xs">Cash</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-auto py-3 flex-col"
                        onClick={() => handleBankFileTypeSelect("loan")}
                      >
                        <FileText className="w-4 h-4 mb-1" />
                        <span className="text-xs">Loan</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-auto py-3 flex-col"
                        onClick={() => {
                          onUpdateTimeline({ 
                            bankFileType: "cash-and-loan",
                            loanStage: "file-prepare",
                            loanStatus: "pending",
                            updatedAt: new Date().toISOString() 
                          });
                        }}
                      >
                        <div className="flex gap-0.5 mb-1">
                          <IndianRupee className="w-3 h-3" />
                          <FileText className="w-3 h-3" />
                        </div>
                        <span className="text-xs">Cash + Loan</span>
                      </Button>
                    </div>
                  )}
                  
                  {/* Cash File - Enhanced with amounts */}
                  {bankFileType === "cash" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="text-xs font-medium text-success">Cash File</span>
                      </div>
                      
                      {/* Financial summary */}
                      {projectContractAmount && (
                        <div className="p-3 bg-muted/30 rounded-lg border border-muted-foreground/10 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Contract Amount</span>
                            <span className="font-semibold text-foreground">{formatCurrency(projectContractAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Received</span>
                            <span className="font-medium text-foreground">{formatCurrency(totalCashReceived)}</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-muted-foreground/10 pt-1.5">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className="font-semibold text-amber-600">{formatCurrency(Math.max(0, projectContractAmount - totalCashReceived))}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Record Cash Payment */}
                      {projectContractAmount && totalCashReceived < projectContractAmount && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={cashPaymentAmount}
                              onChange={(e) => setCashPaymentAmount(e.target.value)}
                              className="h-8 text-xs flex-1"
                            />
                            <Button size="sm" className="h-8 text-xs" onClick={handleRecordCashPayment}>
                              <Plus className="w-3 h-3 mr-1" />
                              Record
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Cash + Loan Combined - Enhanced */}
                  {bankFileType === "cash-and-loan" && (
                    <div className="space-y-3">
                      {/* Cash Component */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-success">Cash Component</span>
                        </div>
                        {projectContractAmount && (
                          <div className="p-2.5 bg-muted/30 rounded-lg border border-muted-foreground/10 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Contract</span>
                              <span className="font-semibold text-foreground">{formatCurrency(projectContractAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Received</span>
                              <span className="font-medium text-foreground">{formatCurrency(totalCashReceived)}</span>
                            </div>
                          </div>
                        )}
                        {projectContractAmount && totalCashReceived < projectContractAmount && (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={cashPaymentAmount}
                              onChange={(e) => setCashPaymentAmount(e.target.value)}
                              className="h-8 text-xs flex-1"
                            />
                            <Button size="sm" className="h-8 text-xs" onClick={handleRecordCashPayment}>
                              <Plus className="w-3 h-3 mr-1" />
                              Record
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Loan Component */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Loan Component:</p>
                        {projectBankDocAmount && (
                          <div className="flex justify-between text-xs px-1">
                            <span className="text-muted-foreground">Bank Documentation</span>
                            <span className="font-semibold text-foreground">{formatCurrency(projectBankDocAmount)}</span>
                          </div>
                        )}
                        {LOAN_STAGES.map((stage, idx) => {
                          const currentIndex = LOAN_STAGES.findIndex(s => s.value === loanStage);
                          const isComplete = idx < currentIndex || loanStatus === "approved";
                          const isCurrent = stage.value === loanStage && loanStatus !== "approved";
                          const isClickable = idx <= currentIndex + 1 && loanStatus !== "approved" && loanStatus !== "rejected";
                          
                          return (
                            <div 
                              key={stage.value}
                              className={`flex items-center gap-2 text-xs ${isClickable ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded' : ''}`}
                              onClick={() => isClickable && handleLoanStageChange(stage.value)}
                            >
                              {isComplete ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                              ) : isCurrent ? (
                                <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                              )}
                              <span className={isCurrent ? 'font-medium text-primary' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
                                {stage.label}
                              </span>
                            </div>
                          );
                        })}
                        {loanStage === "loan-apply" && loanStatus === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="flex-1" onClick={() => handleLoanStatusChange("approved")}>
                              <Check className="w-3 h-3 mr-1" />
                              Approved
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleLoanStatusChange("rejected")}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Rejected
                            </Button>
                          </div>
                        )}
                        {loanStatus === "approved" && (
                          <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-xs font-medium text-success">Loan Approved</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Loan Flow - Enhanced with bank doc amount */}
                  {bankFileType === "loan" && (
                    <div className="space-y-2">
                      {projectBankDocAmount && (
                        <div className="flex justify-between text-xs p-2 bg-muted/30 rounded-lg border border-muted-foreground/10 mb-2">
                          <span className="text-muted-foreground">Bank Documentation</span>
                          <span className="font-semibold text-foreground">{formatCurrency(projectBankDocAmount)}</span>
                        </div>
                      )}
                      {LOAN_STAGES.map((stage, idx) => {
                        const currentIndex = LOAN_STAGES.findIndex(s => s.value === loanStage);
                        const isComplete = idx < currentIndex || loanStatus === "approved";
                        const isCurrent = stage.value === loanStage && loanStatus !== "approved";
                        const isClickable = idx <= currentIndex + 1 && loanStatus !== "approved" && loanStatus !== "rejected";
                        
                        return (
                          <div 
                            key={stage.value}
                            className={`flex items-center gap-2 text-xs ${isClickable ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded' : ''}`}
                            onClick={() => isClickable && handleLoanStageChange(stage.value)}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            ) : isCurrent ? (
                              <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className={isCurrent ? 'font-medium text-primary' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* Loan Apply - Approve/Reject */}
                      {loanStage === "loan-apply" && loanStatus === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="flex-1" onClick={() => handleLoanStatusChange("approved")}>
                            <Check className="w-3 h-3 mr-1" />
                            Approved
                          </Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleLoanStatusChange("rejected")}>
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Button>
                        </div>
                      )}
                      
                      {/* Loan Approved */}
                      {loanStatus === "approved" && (
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-success">Loan Approved - Complete</span>
                        </div>
                      )}
                      
                      {/* Loan Rejected - Restart */}
                      {loanStatus === "rejected" && (
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs font-medium text-red-500">Loan Rejected</span>
                          </div>
                          <Button size="sm" variant="outline" className="w-full" onClick={handleLoanRestart}>
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restart Process
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Work Status - With Approval Workflow */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">4️⃣ Work Status</span>
                    {timelineStatus?.workStatusComplete && (
                      <Badge className="bg-muted/90 text-success border-border/80">Complete</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{workStatusChecks.length}/{WORK_STATUS_STAGES.length} ({getWorkStatusProgress()}%)</span>
                    </div>
                    <Progress value={getWorkStatusProgress()} className="h-2" />
                  </div>
                  
                  {/* Work Items with Approval Flow */}
                  <div className="space-y-3">
                    {WORK_STATUS_STAGES.map((stage) => {
                      const isChecked = workStatusChecks.includes(stage.value);
                      const approval = workStatusApprovals[stage.value];
                      const approvalStatus = approval?.status || "pending";
                      
                      const allSubItemsDone = areAllSubItemsComplete(stage.value);
                      
                      return (
                        <div key={stage.value} className={`flex flex-col gap-2 p-2.5 rounded-lg border transition-colors ${
                          allSubItemsDone 
                            ? 'bg-accent border-primary/30 ring-1 ring-border/60' 
                            : approvalStatus === "requested" ? 'bg-amber-500/5 border-amber-500/30' :
                            approvalStatus === "approved" ? 'bg-muted/40 border-border/80' :
                            approvalStatus === "rejected" ? 'bg-red-500/5 border-red-500/30' :
                            approvalStatus === "closed" ? 'bg-muted border-muted-foreground/20' :
                            'bg-muted/30 border-muted-foreground/10'
                        }`}>
                          <div className="flex items-center gap-2">
                            {/* Checkbox - Admin only */}
                            {isAdmin ? (
                              <Checkbox
                                id={`work-${stage.value}`}
                                checked={isChecked}
                                onCheckedChange={(checked) => handleWorkStatusCheck(stage.value, !!checked)}
                                disabled={approvalStatus === "closed"}
                              />
                            ) : (
                              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                                isChecked ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                            )}
                            
                            <label 
                              htmlFor={`work-${stage.value}`} 
                              className={`text-sm flex-1 ${isChecked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                            >
                              {stage.label}
                              {stage.subItems && stage.subItems.length > 0 && (
                                <span className="text-2xs text-muted-foreground ml-1">({stage.subItems.length} sub-items)</span>
                              )}
                            </label>
                            
                            {/* Media indicators */}
                            <div className="flex items-center gap-1.5 text-2xs">
                              {stage.photoRequired && approval?.photoUrls && approval.photoUrls.length > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {approval.photoUrls.slice(0, 3).map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`Photo ${idx + 1}`}
                                      className="w-5 h-5 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity border border-muted"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setViewerImage({ url, fileName: `${stage.label}-photo-${idx + 1}` });
                                      }}
                                    />
                                  ))}
                                  {approval.photoUrls.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{approval.photoUrls.length - 3}</span>
                                  )}
                                </div>
                              )}
                              {stage.photoRequired && (!approval?.photoUrls || approval.photoUrls.length === 0) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                  <Camera className="w-2.5 h-2.5 inline mr-0.5" />
                                  0
                                </span>
                              )}
                              {stage.videoRequired && (
                                <span className={`px-1.5 py-0.5 rounded ${
                                  approval?.videoCount ? 'bg-muted/90 text-foreground' : 'bg-amber-500/20 text-amber-600'
                                }`}>
                                  🎥 {approval?.videoCount || 0}
                                </span>
                              )}
                            </div>
                            
                            {/* Status Badge */}
                            {approvalStatus === "requested" && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-2xs px-1.5">
                                Pending Approval
                              </Badge>
                            )}
                            {approvalStatus === "approved" && (
                              <Badge variant="outline" className="bg-accent text-foreground border-border/80 text-2xs px-1.5">
                                Approved
                              </Badge>
                            )}
                            {approvalStatus === "rejected" && (
                              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 text-2xs px-1.5">
                                Rejected
                              </Badge>
                            )}
                            {approvalStatus === "closed" && (
                              <Badge variant="outline" className="bg-accent text-foreground border-border/80 text-2xs px-1.5">
                                Completed
                              </Badge>
                            )}
                          </div>
                          
                          {/* Sub-items (expandable) with enhanced status */}
                          {stage.subItems && stage.subItems.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-xs ml-6 gap-1">
                                  <ChevronRight className="w-3 h-3 transition-transform duration-200 ui-expanded:rotate-90" />
                                  View {stage.subItems.length} sub-items
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="ml-6 mt-2 space-y-2">
                                {stage.subItems.map((subItem) => {
                                  // Get sub-item approval info
                                  const subApproval = approval?.subItemApprovals?.[subItem.value];
                                  const isSubCompleted = subApproval?.status === "approved" || subApproval?.status === "closed";
                                  const isSubPending = subApproval?.status === "pending";
                                  const isSubOnHold = subApproval?.status === "rejected";
                                  const hasBlockage = blockages.some(b => 
                                    b.status === "active" && 
                                    b.timelineStage === "work-status" && 
                                    b.timelineSubStage === stage.value
                                  );
                                  const isOnHold = hasBlockage || isSubOnHold;
                                  
                                  return (
                                    <div 
                                      key={subItem.value} 
                                      className={`p-2.5 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                                        isSubCompleted 
                                          ? 'bg-accent border-border/80' 
                                          : isOnHold
                                          ? 'bg-amber-500/10 border-amber-500/30'
                                          : 'bg-muted/20 border-muted-foreground/10'
                                      }`}
                                      onClick={() => handleSubItemClick(stage.value, subItem.value, subItem.photoRequired || false)}
                                    >
                                      <div className="flex items-center gap-2 text-xs">
                                        {/* Status indicator */}
                                        {isSubCompleted ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                                        ) : isOnHold ? (
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                        ) : (
                                          <Circle className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
                                        )}
                                        
                                        <span className={`flex-1 font-medium ${
                                          isSubCompleted 
                                            ? 'text-foreground' 
                                            : isOnHold
                                            ? 'text-amber-600'
                                            : 'text-red-500'
                                        }`}>
                                          {subItem.label}
                                        </span>
                                        
                                        {/* Transport counts for transport sub-items */}
                                        {subItem.value.includes("transport") && materialsSent && materialsSent.length > 0 && (
                                          <span className="text-[9px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                            {getTransportedCount(stage.value)} sent
                                          </span>
                                        )}
                                        
                                        {/* Media requirements */}
                                        {subItem.photoRequired && subApproval?.photoUrls && subApproval.photoUrls.length > 0 && (
                                          <div className="flex items-center gap-0.5">
                                            {subApproval.photoUrls.slice(0, 2).map((url, idx) => (
                                              <img
                                                key={idx}
                                                src={url}
                                                alt={`Photo ${idx + 1}`}
                                                className="w-4 h-4 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity border border-muted"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setViewerImage({ url, fileName: `${subItem.label}-photo-${idx + 1}` });
                                                }}
                                              />
                                            ))}
                                            {subApproval.photoUrls.length > 2 && (
                                              <span className="text-[8px] text-muted-foreground">+{subApproval.photoUrls.length - 2}</span>
                                            )}
                                          </div>
                                        )}
                                        {subItem.photoRequired && (!subApproval?.photoUrls || subApproval.photoUrls.length === 0) && (
                                          <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                                            <Camera className="w-2.5 h-2.5 inline mr-0.5" />
                                            0
                                          </span>
                                        )}
                                        {subItem.videoRequired && (
                                          <span className={`text-[9px] px-1 py-0.5 rounded ${
                                            subApproval?.videoCount ? 'bg-muted/90 text-foreground' : 'bg-amber-500/20 text-amber-600'
                                          }`}>
                                            <Video className="w-2.5 h-2.5 inline mr-0.5" />
                                            {subApproval?.videoCount || 0}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Employee info and timestamp for completed/pending items */}
                                      {subApproval?.updatedByName && (
                                        <div className="mt-1.5 ml-5 text-2xs text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <User className="w-2.5 h-2.5" />
                                            <span className="font-medium">
                                              {subApproval.updatedByName}
                                            </span>
                                            {subApproval.updatedAt && (
                                              <>
                                                <span>•</span>
                                                <span>
                                                  {format(new Date(subApproval.updatedAt), "dd MMM, h:mm a")}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                          {subApproval.notes && (
                                            <div className="mt-0.5 italic">"{subApproval.notes}"</div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* On hold / blockage indicator */}
                                      {isOnHold && (
                                        <div className="mt-1.5 ml-5 flex items-center gap-1 text-2xs text-amber-600">
                                          <Flag className="w-2.5 h-2.5" />
                                          <span>{hasBlockage ? "On Hold - Blockage linked" : "Rejected - Photo retake required"}</span>
                                        </div>
                                      )}
                                      
                                      {/* Rejection reason */}
                                      {subApproval?.rejectionReason && (
                                        <div className="mt-1.5 ml-5 p-1.5 bg-red-500/10 rounded text-2xs text-red-600">
                                          Reason: {subApproval.rejectionReason}
                                        </div>
                                      )}
                                      
                                      {/* Admin actions for pending approval */}
                                      {isAdmin && isSubPending && (
                                        <div className="mt-2 ml-5 flex gap-2">
                                          <Button 
                                            size="sm" 
                                            className="h-6 text-2xs" 
                                            onClick={(e) => { e.stopPropagation(); handleApproveSubItem(stage.value, subItem.value); }}
                                          >
                                            <Check className="w-3 h-3 mr-0.5" />
                                            Approve
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="destructive" 
                                            className="h-6 text-2xs" 
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              setRejectReasonModal({ stageKey: stage.value, subItemKey: subItem.value, open: true }); 
                                            }}
                                          >
                                            <XCircle className="w-3 h-3 mr-0.5" />
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                          
                          {/* Stage Completion Info - shown when all sub-items done */}
                          {stage.subItems && stage.subItems.length > 0 && allSubItemsDone && (
                            <div className="ml-6 mt-2 p-2 bg-muted/40 border border-border/60 rounded-lg text-xs">
                              <div className="flex items-center gap-2 text-foreground">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">All Sub-items Complete</span>
                              </div>
                              {approval?.approvedByName && (
                                <div className="mt-1 text-muted-foreground">
                                  Confirmed by: {approval.approvedByName} • {approval.approvedAt && format(new Date(approval.approvedAt), "dd MMM yyyy, h:mm a")}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 ml-6">
                            {/* User: Request Done button */}
                            {!isAdmin && approvalStatus === "pending" && !isChecked && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs"
                                onClick={() => handleRequestDone(stage.value)}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                Request Done
                              </Button>
                            )}
                            
                            {/* User: After rejection - can re-request */}
                            {!isAdmin && approvalStatus === "rejected" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs border-amber-500/40 text-amber-600"
                                onClick={() => handleRequestDone(stage.value)}
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Re-submit
                              </Button>
                            )}
                            
                            {/* Admin: Approve/Reject buttons for pending requests */}
                            {isAdmin && approvalStatus === "requested" && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={() => handleApproveWorkItem(stage.value)}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  onClick={() => handleRejectWorkItem(stage.value)}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            
                            {/* Admin: Close button for approved items */}
                            {isAdmin && approvalStatus === "approved" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleMarkCompleted(stage.value)}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mark Completed
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. DISCOM - Sequential Checkboxes */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">5️⃣ DISCOM</span>
                    {discomSubsidyStatus === "approved" && (
                      <Badge className="bg-muted/90 text-success">Complete</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getDiscomProgress()}%</span>
                    </div>
                    <Progress value={getDiscomProgress()} className="h-2" />
                  </div>
                  
                  {/* Sequential Checkboxes */}
                  <div className="space-y-2">
                    {DISCOM_ITEMS.map((item, idx) => {
                      const isChecked = discomChecks.includes(item.value);
                      const previousChecked = idx === 0 || DISCOM_ITEMS.slice(0, idx).every(d => discomChecks.includes(d.value));
                      const isDisabled = !previousChecked && !isChecked;
                      
                      return (
                        <div key={item.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`discom-${item.value}`}
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => handleDiscomCheck(item.value, !!checked)}
                          />
                          <label 
                            htmlFor={`discom-${item.value}`} 
                            className={`text-xs cursor-pointer ${isChecked ? 'text-primary font-medium' : isDisabled ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
                          >
                            {item.label}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Subsidy Status - Show when subsidy-apply-photo is checked */}
                  {discomChecks.includes("subsidy-apply-photo") && !discomSubsidyStatus && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" className="flex-1" onClick={() => handleDiscomSubsidyStatus("approved")}>
                        <Check className="w-3 h-3 mr-1" />
                        Approved
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDiscomSubsidyStatus("rejected")}>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                      </Button>
                    </div>
                  )}
                  
                  {discomSubsidyStatus === "approved" && (
                    <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80 mt-3">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-xs font-medium text-success">Subsidy Approved</span>
                    </div>
                  )}
                  
                  {discomSubsidyStatus === "rejected" && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/30 mt-3">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-medium text-red-500">Subsidy Rejected - Pending</span>
                    </div>
                  )}
                </div>

                {/* 6. Payment Status - Two Trees */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">6️⃣ Payment Status</span>
                    {(cashToMahiConfirmed || secondInstallmentPaid) && (
                      <Badge className="bg-muted/90 text-success">Paid</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getPaymentProgress()}%</span>
                    </div>
                    <Progress value={getPaymentProgress()} className="h-2" />
                  </div>
                  
                  {/* Type Selection */}
                  {!paymentType && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-auto py-3 flex-col"
                        onClick={() => handlePaymentTypeSelect("cash-to-mahi")}
                      >
                        <IndianRupee className="w-4 h-4 mb-1" />
                        <span className="text-xs">Cash to Mahi</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-auto py-3 flex-col"
                        onClick={() => handlePaymentTypeSelect("instalments")}
                      >
                        <FileText className="w-4 h-4 mb-1" />
                        <span className="text-xs">Instalments</span>
                      </Button>
                    </div>
                  )}
                  
                  {/* Cash to Mahi - Enhanced with amounts */}
                  {paymentType === "cash-to-mahi" && (
                    <div className="space-y-3">
                      {/* Financial summary */}
                      {projectContractAmount && (
                        <div className="p-3 bg-muted/30 rounded-lg border border-muted-foreground/10 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Total Amount</span>
                            <span className="font-semibold text-foreground">{formatCurrency(projectContractAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Received</span>
                            <span className="font-medium text-foreground">{formatCurrency(totalCashReceived)}</span>
                          </div>
                          <div className="flex justify-between text-xs border-t border-muted-foreground/10 pt-1.5">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className="font-semibold text-amber-600">{formatCurrency(Math.max(0, projectContractAmount - totalCashReceived))}</span>
                          </div>
                        </div>
                      )}
                      
                      {cashToMahiConfirmed ? (
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-success">Cash to Mahi - Paid</span>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => setIsConfirmCashModalOpen(true)}>
                          <Check className="w-3 h-3 mr-1" />
                          Confirm Full Payment
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Instalments - Enhanced with editable amounts */}
                  {paymentType === "instalments" && (
                    <div className="space-y-3">
                      {/* Edit toggle */}
                      {projectContractAmount && !secondInstallmentPaid && (
                        <div className="flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-2xs text-muted-foreground"
                            onClick={() => setIsEditingInstalments(!isEditingInstalments)}
                          >
                            {isEditingInstalments ? "Done" : "Edit Amounts"}
                          </Button>
                        </div>
                      )}
                      
                      {/* Editing mode */}
                      {isEditingInstalments && (
                        <div className="p-3 bg-muted/30 rounded-lg border border-muted-foreground/10 space-y-2">
                          <div className="space-y-1.5">
                            <Label className="text-2xs text-muted-foreground">1st Instalment Amount</Label>
                            <Input
                              type="number"
                              value={firstInstalmentAmount || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setFirstInstalmentAmount(val);
                                if (projectContractAmount) {
                                  setSecondInstalmentAmount(projectContractAmount - val);
                                }
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-2xs text-muted-foreground">2nd Instalment Amount</Label>
                            <Input
                              type="number"
                              value={secondInstalmentAmount || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSecondInstalmentAmount(val);
                                if (projectContractAmount) {
                                  setFirstInstalmentAmount(projectContractAmount - val);
                                }
                              }}
                              className="h-8 text-xs"
                            />
                          </div>
                          {projectContractAmount && (
                            <p className="text-2xs text-muted-foreground text-right">
                              Total: {formatCurrency(firstInstalmentAmount + secondInstalmentAmount)} / {formatCurrency(projectContractAmount)}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* 1st Instalment */}
                      <div className={`p-2.5 rounded-lg border ${firstInstallmentPaid ? 'bg-accent border-border/80' : 'bg-muted/20 border-muted-foreground/10'}`}>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="first-installment"
                            checked={firstInstallmentPaid}
                            disabled={secondInstallmentPaid}
                            onCheckedChange={(checked) => handleFirstInstallmentCheck(!!checked)}
                          />
                          <label 
                            htmlFor="first-installment" 
                            className={`text-xs cursor-pointer flex-1 ${firstInstallmentPaid ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                          >
                            1st Installment
                          </label>
                          {firstInstalmentAmount > 0 && (
                            <span className={`text-xs font-semibold ${firstInstallmentPaid ? 'text-foreground' : 'text-foreground'}`}>
                              {formatCurrency(firstInstalmentAmount)}
                            </span>
                          )}
                        </div>
                        {firstInstallmentPaid && (
                          <p className="text-2xs text-foreground ml-6 mt-1">✓ Received</p>
                        )}
                      </div>
                      
                      {/* 2nd Instalment */}
                      <div 
                        className={`p-2.5 rounded-lg border ${
                          secondInstallmentPaid 
                            ? 'bg-accent border-border/80' 
                            : !firstInstallmentPaid 
                            ? 'bg-muted/10 border-muted-foreground/5 opacity-50' 
                            : 'bg-muted/20 border-muted-foreground/10 cursor-pointer'
                        }`}
                        onClick={() => firstInstallmentPaid && !secondInstallmentPaid && handleSecondInstallmentClick()}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="second-installment"
                            checked={secondInstallmentPaid}
                            disabled={!firstInstallmentPaid || secondInstallmentPaid}
                          />
                          <label 
                            htmlFor="second-installment" 
                            className={`text-xs flex-1 ${secondInstallmentPaid ? 'text-foreground font-medium' : !firstInstallmentPaid ? 'text-muted-foreground/40' : 'text-muted-foreground cursor-pointer'}`}
                          >
                            2nd Installment
                          </label>
                          {secondInstalmentAmount > 0 && (
                            <span className={`text-xs font-semibold ${secondInstallmentPaid ? 'text-foreground' : !firstInstallmentPaid ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                              {formatCurrency(secondInstalmentAmount)}
                            </span>
                          )}
                        </div>
                        {secondInstallmentPaid && (
                          <p className="text-2xs text-foreground ml-6 mt-1">✓ Received</p>
                        )}
                        {!firstInstallmentPaid && (
                          <p className="text-2xs text-muted-foreground/50 ml-6 mt-1">Complete 1st installment first</p>
                        )}
                      </div>
                      
                      {secondInstallmentPaid && (
                        <div className="flex items-center gap-2 p-2 bg-accent rounded-lg border border-border/80">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-xs font-medium text-success">All Instalments Paid</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. DCR & Work Completion Report */}
                <div className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">7️⃣ DCR & Completion</span>
                    {(timelineStatus?.dcrStatus === "complete" || timelineStatus?.dcrComplete) && (
                      <Badge className="bg-muted/90 text-success">Complete</Badge>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{getDcrProgress()}%</span>
                    </div>
                    <Progress value={getDcrProgress()} className="h-2" />
                  </div>
                  
                  {/* DCR Steps - Clickable like File Login */}
                  <div className="space-y-2">
                    {/* Pending - Starting state */}
                    <div 
                      className={`flex items-center justify-between text-xs cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded transition-colors`}
                      onClick={() => {
                        if (!timelineStatus?.dcrStatus || timelineStatus?.dcrStatus === "pending") {
                          handleDcrStepChange("preparation");
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {timelineStatus?.dcrStatus && timelineStatus?.dcrStatus !== "pending" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                        )}
                        <span className={!timelineStatus?.dcrStatus || timelineStatus?.dcrStatus === "pending" ? 'font-medium text-primary' : 'text-muted-foreground'}>
                          Pending {(!timelineStatus?.dcrStatus || timelineStatus?.dcrStatus === "pending") && "(Click to Start)"}
                        </span>
                      </div>
                      <span className="text-muted-foreground">-</span>
                    </div>
                    
                    {DCR_STEPS.map((step, idx) => {
                      const currentDcrStatus = timelineStatus?.dcrStatus || "pending";
                      const currentIndex = currentDcrStatus === "pending" ? -1 : DCR_STEPS.findIndex(s => s.value === currentDcrStatus);
                      const stepIndex = idx;
                      const isComplete = currentDcrStatus === "complete" || stepIndex < currentIndex;
                      const isCurrent = step.value === currentDcrStatus;
                      
                      // Fix: Allow clicking next step from current, or first step when pending
                      const isClickable = currentDcrStatus !== "complete" && (
                        stepIndex <= currentIndex + 1
                      );
                      
                      return (
                        <div 
                          key={step.value} 
                          className={`flex items-center justify-between text-xs transition-colors ${
                            isClickable 
                              ? 'cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded' 
                              : 'opacity-50 -mx-2 px-2 py-1.5'
                          }`}
                          onClick={() => isClickable && handleDcrStepChange(step.value)}
                        >
                          <div className="flex items-center gap-2">
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            ) : isCurrent ? (
                              <Circle className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className={isCurrent ? 'font-medium text-primary' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground/60'}>
                              {step.label}
                            </span>
                          </div>
                          <span className={isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'}>{step.percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Mark Complete Button */}
                  {timelineStatus?.dcrStatus === "submitted" && (
                    <Button size="sm" className="w-full mt-3" onClick={handleDcrComplete}>
                      <Check className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                </div>
                
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Resolved Blockages - View History */}
      {resolvedBlockages.length > 0 && (
        <Collapsible>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/30 -mx-6 -my-6 px-6 py-4 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-muted/90">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        View Old Blockages
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {resolvedBlockages.length} blockage{resolvedBlockages.length > 1 ? 's' : ''} resolved
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform" />
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  {resolvedBlockages.sort((a, b) => {
                    // Sort by resolution date, most recent first
                    const dateA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
                    const dateB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
                    return dateB - dateA;
                  }).map(blockage => (
                    <div key={blockage.id} className="p-4 bg-muted/40 border border-border/60 rounded-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-1.5 rounded-lg bg-muted/90 mt-0.5">
                            <Check className="w-3.5 h-3.5 text-success" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground">{blockage.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{blockage.reason}</p>
                            
                            {/* Resolution Details */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                              {blockage.resolvedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Resolved: {format(new Date(blockage.resolvedAt), "dd MMM yyyy")}
                                </span>
                              )}
                              {blockage.resolvedByName && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  By: {blockage.resolvedByName}
                                </span>
                              )}
                            </div>
                            
                            {/* Resolution Notes */}
                            {blockage.notes && blockage.notes.includes("Resolution:") && (
                              <div className="mt-2 p-2 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground">
                                  {blockage.notes.split("Resolution:")[1]?.trim() || blockage.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Cash to Mahi Confirmation Modal */}
      <Sheet open={isConfirmCashModalOpen} onOpenChange={setIsConfirmCashModalOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Confirm Cash to Mahi</SheetTitle>
            <SheetDescription>
              Are you sure you want to mark this payment as complete?
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will mark the payment status as <strong>Paid</strong> for Cash to Mahi option.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsConfirmCashModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCashToMahi}>
              <Check className="w-4 h-4 mr-1" />
              Confirm Payment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 2nd Installment Confirmation Modal */}
      <Sheet open={isConfirmInstallmentModalOpen} onOpenChange={setIsConfirmInstallmentModalOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Confirm 2nd Installment</SheetTitle>
            <SheetDescription>
              Are you sure you want to mark the 2nd installment as paid?
            </SheetDescription>
          </SheetHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will mark the payment as <strong>Complete</strong>. All installments will be marked as paid.
            </p>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsConfirmInstallmentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmSecondInstallment}>
              <Check className="w-4 h-4 mr-1" />
              Confirm Payment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Resolve Blockage Modal */}
      <Sheet open={isResolveBlockageModalOpen} onOpenChange={setIsResolveBlockageModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Resolve Blockage</SheetTitle>
            <SheetDescription>Mark this blockage as resolved</SheetDescription>
          </SheetHeader>
          
          {selectedBlockageToResolve && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <p className="font-medium text-orange-400">{selectedBlockageToResolve.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedBlockageToResolve.reason}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Resolved By *</Label>
                <Select value={resolvedBy} onValueChange={setResolvedBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who resolved" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="super-admin">Super Admin</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Resolution Date</Label>
                <Input type="date" value={resolveDate} onChange={(e) => setResolveDate(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea 
                  placeholder="How was the blockage resolved?"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsResolveBlockageModalOpen(false)}>Cancel</Button>
            <Button onClick={handleResolveBlockageSubmit}>
              <Check className="w-4 h-4 mr-1" />
              Mark Resolved
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Blockage Modal */}
      <Sheet open={isAddBlockageOpen} onOpenChange={setIsAddBlockageOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add Blockage</SheetTitle>
            <SheetDescription>Record why work has stopped on this project</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Blockage Title *</Label>
              <Input
                placeholder="e.g., Material shortage"
                value={blockageTitle}
                onChange={(e) => setBlockageTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                placeholder="Why has work stopped?"
                value={blockageReason}
                onChange={(e) => setBlockageReason(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>How to Solve</Label>
              <Textarea
                placeholder="Suggested solution"
                value={blockageHowToSolve}
                onChange={(e) => setBlockageHowToSolve(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resolve By Date</Label>
                <Input
                  type="date"
                  value={blockageResolveBy}
                  onChange={(e) => setBlockageResolveBy(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project Stage</Label>
                <Select value={blockageStage} onValueChange={setBlockageStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STAGES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Timeline Stage Selection (Mandatory) */}
            <div className="space-y-2">
              <Label>Timeline Stage *</Label>
              <Select 
                value={blockageTimelineStage} 
                onValueChange={(val) => {
                  setBlockageTimelineStage(val);
                  setBlockageSubStage("");
                  setSelectedCustomTag("");
                  setNewCustomTagName("");
                }}
              >
                <SelectTrigger className={!blockageTimelineStage ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select timeline stage..." />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKAGE_TIMELINE_STAGES.map(stage => (
                    <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Sub-Stage Selection (Conditional) */}
            {blockageTimelineStage && blockageTimelineStage !== "something-else" && (
              <div className="space-y-2">
                <Label>Sub-Stage</Label>
                <Select value={blockageSubStage} onValueChange={setBlockageSubStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCKAGE_TIMELINE_STAGES
                      .find(s => s.value === blockageTimelineStage)
                      ?.subStages.map(sub => (
                        <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Something Else - Custom Tags */}
            {blockageTimelineStage === "something-else" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <Label className="text-xs font-medium text-muted-foreground">Quick Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {customStageTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedCustomTag === tag.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCustomTag(tag.id);
                        setBlockageSubStage(tag.label);
                        setNewCustomTagName("");
                      }}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Or create new:</Label>
                  <Input
                    placeholder="Enter custom stage name..."
                    value={newCustomTagName}
                    onChange={(e) => {
                      setNewCustomTagName(e.target.value);
                      setSelectedCustomTag("");
                      setBlockageSubStage(e.target.value);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="save-tag"
                      checked={saveNewTag}
                      onCheckedChange={(checked) => setSaveNewTag(!!checked)}
                    />
                    <label htmlFor="save-tag" className="text-xs text-muted-foreground cursor-pointer">
                      Save for future use
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Assign To (optional)</Label>
              <Select value={blockageAssignedTo} onValueChange={setBlockageAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person to resolve..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea
                placeholder="Any other notes"
                value={blockageNotes}
                onChange={(e) => setBlockageNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddBlockageOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBlockage}>Add Blockage</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Ticket Modal */}
      <Sheet open={isAddTicketOpen} onOpenChange={setIsAddTicketOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Create Ticket / Task</SheetTitle>
            <SheetDescription>Assign a task to team members</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={ticketTaskType} onValueChange={setTicketTaskType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {ticketTaskType === "custom" && (
              <div className="space-y-2">
                <Label>Custom Task Type</Label>
                <Input
                  placeholder="Enter task type"
                  value={ticketCustomType}
                  onChange={(e) => setTicketCustomType(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Task Description *</Label>
              <Textarea
                placeholder="What needs to be done?"
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>How to Do (Instructions)</Label>
              <Textarea
                placeholder="Step-by-step instructions"
                value={ticketHowToDo}
                onChange={(e) => setTicketHowToDo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To *</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`emp-${emp.id}`}
                      checked={ticketAssignees.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTicketAssignees([...ticketAssignees, emp.id]);
                        } else {
                          setTicketAssignees(ticketAssignees.filter(id => id !== emp.id));
                        }
                      }}
                    />
                    <label htmlFor={`emp-${emp.id}`} className="text-sm">{emp.name}</label>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Checkbox
                    id="super-admin"
                    checked={ticketAssignSuperAdmin}
                    onCheckedChange={(checked) => setTicketAssignSuperAdmin(!!checked)}
                  />
                  <label htmlFor="super-admin" className="text-sm font-medium">Assign to Super Admin</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={ticketDueDate}
                  onChange={(e) => setTicketDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Time</Label>
                <Input
                  type="time"
                  value={ticketDueTime}
                  onChange={(e) => setTicketDueTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={ticketLocation} onValueChange={setTicketLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={projectId}>{projectName} (This Site)</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeBlockages.length > 0 && (
              <div className="space-y-2">
                <Label>Link to Blockage (optional)</Label>
                <Select value={ticketLinkedBlockage} onValueChange={setTicketLinkedBlockage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blockage to resolve" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBlockages.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddTicketOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTicket}>Create Ticket</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Photo Upload Modal */}
      <Sheet open={!!photoUploadModal?.open} onOpenChange={(open) => !open && setPhotoUploadModal(null)}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Upload media</SheetTitle>
            <SheetDescription>
              Add site photos or short videos, then submit for approval
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <input
              ref={workPhotoInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (!files?.length) return;
                const picked = Array.from(files).filter(
                  (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
                );
                const readers = picked.map(
                  (file) =>
                    new Promise<{ url: string; kind: "image" | "video" }>((resolve, reject) => {
                      const r = new FileReader();
                      r.onload = () => {
                        const url = typeof r.result === "string" ? r.result : "";
                        resolve({
                          url,
                          kind: file.type.startsWith("video/") ? "video" : "image",
                        });
                      };
                      r.onerror = () => reject(new Error("read"));
                      r.readAsDataURL(file);
                    }),
                );
                void Promise.all(readers).then((items) => {
                  const imgs = items.filter((x) => x.kind === "image" && x.url).map((x) => x.url);
                  const vids = items.filter((x) => x.kind === "video" && x.url).map((x) => x.url);
                  setPendingPhotoDataUrls((prev) => [...prev, ...imgs]);
                  setPendingVideoDataUrls((prev) => [...prev, ...vids]);
                  toast({
                    title: "Media added",
                    description: `${imgs.length} image(s), ${vids.length} video(s) attached.`,
                  });
                });
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="w-full rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-muted/30"
              onClick={() => workPhotoInputRef.current?.click()}
            >
              <Camera className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Choose photos or videos (stored as data URLs in project data)
              </p>
            </button>
            {pendingPhotoDataUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingPhotoDataUrls.map((url, i) => (
                  <button
                    key={`${i}-${url.slice(0, 32)}`}
                    type="button"
                    className="relative h-16 w-16 overflow-hidden rounded-md border"
                    onClick={() => setViewerImage({ url, fileName: `photo-${i + 1}` })}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {pendingVideoDataUrls.length > 0 && (
              <div className="flex flex-col gap-2">
                {pendingVideoDataUrls.map((url, i) => (
                  <video key={`v-${i}-${url.slice(0, 24)}`} src={url} className="max-h-40 rounded-md border" controls muted />
                ))}
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input 
                placeholder="Add any notes..." 
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPhotoUploadModal(null)}>Cancel</Button>
            <Button onClick={() => {
              if (photoUploadModal) {
                if (pendingPhotoDataUrls.length === 0 && pendingVideoDataUrls.length === 0) {
                  toast({
                    title: "Add media",
                    description: "Choose at least one photo or video before submitting.",
                    variant: "destructive",
                  });
                  return;
                }
                handleSubItemMarkComplete(
                  photoUploadModal.stageKey,
                  photoUploadModal.subItemKey,
                  pendingPhotoDataUrls.length + pendingVideoDataUrls.length,
                  uploadNotes,
                  pendingPhotoDataUrls,
                  pendingVideoDataUrls,
                );
              }
              setPhotoUploadModal(null);
              setUploadNotes("");
              setPendingPhotoDataUrls([]);
              setPendingVideoDataUrls([]);
            }}>
              <Check className="w-4 h-4 mr-1" />
              Submit for approval
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Reject Reason Modal */}
      <Sheet open={!!rejectReasonModal?.open} onOpenChange={(open) => !open && setRejectReasonModal(null)}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Reject with Reason</SheetTitle>
            <SheetDescription>
              Provide a reason for rejection (e.g., photo retake required)
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea 
                placeholder="e.g., Photo unclear - please retake with better lighting" 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setRejectReasonModal(null); setRejectReason(""); }}>Cancel</Button>
            <Button 
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (rejectReasonModal && rejectReason.trim()) {
                  handleRejectSubItem(rejectReasonModal.stageKey, rejectReasonModal.subItemKey, rejectReason);
                }
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Photo Assignment Modal */}
      <Sheet open={!!photoAssignmentModal?.open} onOpenChange={(open) => !open && setPhotoAssignmentModal(null)}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Photos Required for {photoAssignmentModal?.stageName}</SheetTitle>
            <SheetDescription>
              This stage requires photos. You can upload now or assign to someone.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {/* Info Card */}
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
              <p><strong>Site:</strong> {projectName}</p>
              <p><strong>Item:</strong> {photoAssignmentModal?.stageName}</p>
            </div>
            
            {/* Option Toggle */}
            <div className="space-y-3">
              <div 
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  uploadPhotosDirectly ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setUploadPhotosDirectly(true)}
              >
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span className="font-medium">Upload Photos Now</span>
                </div>
              </div>
              
              <div 
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  !uploadPhotosDirectly ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setUploadPhotosDirectly(false)}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Assign to Someone</span>
                </div>
              </div>
            </div>
            
            {/* Assignment Fields */}
            {!uploadPhotosDirectly && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Assign To *</Label>
                  <Select value={photoAssignTo} onValueChange={setPhotoAssignTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={photoAssignNotes}
                    onChange={(e) => setPhotoAssignNotes(e.target.value)}
                    placeholder="Any specific instructions for photos..."
                  />
                </div>
              </div>
            )}
            
            {/* Upload Area */}
            {uploadPhotosDirectly && (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Camera className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload photos</p>
              </div>
            )}
          </div>
          
          <SheetFooter>
            <Button variant="outline" onClick={() => setPhotoAssignmentModal(null)}>Cancel</Button>
            <Button onClick={handlePhotoAssignmentSubmit}>
              {uploadPhotosDirectly ? "Upload & Complete" : "Send Request"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageUrl={viewerImage?.url || ""}
        defaultFileName={viewerImage?.fileName}
      />
      {/* Task Assignment Modal */}
      {isAssignTaskOpen && (
        <TaskAssignmentModal
          isOpen={isAssignTaskOpen}
          onClose={() => {
            setIsAssignTaskOpen(false);
            setTaskModalMilestoneId(undefined);
          }}
          projectId={projectId}
          projectName={projectName}
          defaultMilestoneId={taskModalMilestoneId}
        />
      )}
    </div>
  );
}

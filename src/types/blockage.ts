// Blockage and Ticket types for Progress Report functionality

// ============ WORK STATUS STAGES (SOLAR INSTALLATION) ============
// New detailed work status stages with sub-items and media requirements

export interface WorkStatusSubItem {
  value: string;
  label: string;
  photoRequired: boolean;
  videoRequired: boolean;
}

export interface WorkStatusStage {
  value: string;
  label: string;
  subItems: WorkStatusSubItem[];
  photoRequired: boolean;
  videoRequired: boolean;
}

export const WORK_STATUS_STAGES: WorkStatusStage[] = [
  {
    value: "structure",
    label: "Structure",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "structure-procurement", label: "Procurement", photoRequired: false, videoRequired: false },
      { value: "structure-cutting", label: "Cutting & Preparation", photoRequired: false, videoRequired: false },
      { value: "structure-transport", label: "Transport", photoRequired: true, videoRequired: false },
      { value: "structure-installation", label: "Installation", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "panel",
    label: "Panel",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "panel-procurement", label: "Procurement", photoRequired: false, videoRequired: false },
      { value: "panel-transport", label: "Transport", photoRequired: true, videoRequired: false },
      { value: "panel-setup", label: "Setup", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "wiring",
    label: "Wiring",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "wiring-ac", label: "AC Wiring", photoRequired: true, videoRequired: false },
      { value: "wiring-dc", label: "DC Wiring", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "earthing",
    label: "Earthing",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "earthing-rod", label: "Rod", photoRequired: true, videoRequired: false },
      { value: "earthing-hole-chemical", label: "Hole & Chemical", photoRequired: true, videoRequired: false },
      { value: "earthing-la", label: "LA (Lightning Arrestor)", photoRequired: true, videoRequired: false },
      { value: "earthing-wiring", label: "Wiring", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "inverter",
    label: "Inverter",
    photoRequired: true,
    videoRequired: true, // MANDATORY video for inverter stage
    subItems: [
      { value: "inverter-ac", label: "AC Connections", photoRequired: true, videoRequired: false },
      { value: "inverter-dc", label: "DC Connections", photoRequired: true, videoRequired: false },
      { value: "inverter-cable-tray", label: "Cable Tray", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "civil",
    label: "Civil",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "civil-material-transport", label: "Material Transport", photoRequired: false, videoRequired: false },
      { value: "civil-pharma-supports", label: "Pharma Supports", photoRequired: true, videoRequired: false },
    ]
  },
  {
    value: "meter",
    label: "Meter",
    photoRequired: true,
    videoRequired: false,
    subItems: [
      { value: "meter-installation", label: "Meter Installation", photoRequired: true, videoRequired: false },
    ]
  },
];

// Blockage timeline stages for selection (links blockages to specific timeline stages)
export interface BlockageTimelineStage {
  value: string;
  label: string;
  subStages: { value: string; label: string }[];
}

export const BLOCKAGE_TIMELINE_STAGES: BlockageTimelineStage[] = [
  { 
    value: "file-login", 
    label: "File Login",
    subStages: [
      { value: "doc-collection", label: "Document Collection" },
      { value: "file-submission", label: "File Submission" },
      { value: "bank-doc-issue", label: "Bank Document Issue" },
    ]
  },
  { 
    value: "subsidy", 
    label: "Subsidy",
    subStages: [
      { value: "center-subsidy", label: "Center Subsidy Issue" },
      { value: "state-subsidy", label: "State Subsidy Issue" },
      { value: "documentation", label: "Documentation" },
    ]
  },
  { 
    value: "bank-file", 
    label: "Bank File",
    subStages: [
      { value: "file-preparation", label: "File Preparation" },
      { value: "bank-submission", label: "Bank Submission" },
      { value: "loan-approval", label: "Loan Approval Delay" },
    ]
  },
  { 
    value: "work-status", 
    label: "Work Status",
    subStages: [
      { value: "structure", label: "Structure" },
      { value: "panel", label: "Panel" },
      { value: "wiring", label: "Wiring" },
      { value: "earthing", label: "Earthing" },
      { value: "inverter", label: "Inverter" },
      { value: "civil", label: "Civil" },
      { value: "meter", label: "Meter" },
    ]
  },
  { 
    value: "discom", 
    label: "DISCOM",
    subStages: [
      { value: "meter-file", label: "Meter File Issue" },
      { value: "net-metering", label: "Net Metering Delay" },
      { value: "subsidy-apply", label: "Subsidy Application" },
    ]
  },
  { 
    value: "payment", 
    label: "Payment",
    subStages: [
      { value: "client-delay", label: "Client Payment Delay" },
      { value: "installment-issue", label: "Installment Issue" },
      { value: "bank-release", label: "Bank Release Delay" },
    ]
  },
  { 
    value: "dcr", 
    label: "DCR & Work Completion",
    subStages: [
      { value: "report-preparation", label: "Report Preparation" },
      { value: "documentation-collection", label: "Documentation Collection" },
      { value: "submission", label: "Submission" },
      { value: "approval", label: "Approval" },
    ]
  },
  { 
    value: "something-else", 
    label: "Something Else",
    subStages: []
  },
];

// Custom blockage stage tags for "Something Else" option
export interface CustomBlockageStageTag {
  id: string;
  label: string;
  createdAt: string;
}

export const DEFAULT_CUSTOM_STAGE_TAGS: CustomBlockageStageTag[] = [
  { id: "custom-1", label: "Custom Stage Name Tag", createdAt: "2024-01-01" }
];

// ============ BLOCKAGE & TICKET TYPES ============

export interface Blockage {
  id: string;
  projectId: string;
  title: string;
  reason: string;
  howToSolve?: string;
  resolveByDate?: string;
  projectStage: string; // e.g., "work-in-progress"
  timelineStage?: string; // e.g., "bank-file", "work-status", "discom"
  timelineSubStage?: string; // e.g., specific sub-stage within the timeline stage
  notes?: string;
  status: "active" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  createdAt: string;
  createdBy?: string;
  // New fields for assignment
  assignedTo?: string; // Employee ID or "self" or "super-admin"
  assignedToName?: string;
  assignedAt?: string;
  startDate?: string;
  /** Optional link to a Task that addresses this blockage. */
  linkedTaskId?: string;
  resolutionNote?: string;
}

export interface Ticket {
  id: string;
  projectId: string;
  taskType: "work" | "call" | "meeting" | "visit" | "custom";
  customTaskType?: string;
  description: string;
  howToDo?: string;
  assignedTo: string[]; // employee IDs
  assignToSuperAdmin?: boolean;
  dueDate: string;
  dueTime?: string;
  priority: "urgent" | "high" | "medium" | "low";
  location: string; // project ID or "office"
  linkedBlockageId?: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  createdBy?: string;
}

export interface DeletionRequest {
  id: string;
  entityType: "invoice" | "quotation" | "project" | "sale-bill";
  entityId: string;
  entityName: string;
  reason: string;
  responsiblePerson?: string;
  responsiblePersonId?: number;
  notes?: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  relatedEntities: { type: string; id: string; name: string }[];
}

// Work status approval status type
export type WorkStatusApprovalStatus = "pending" | "requested" | "approved" | "rejected" | "closed";

// Sub-item approval shape (also reused for the main-stage `subItemApprovals` map below).
export interface WorkStatusSubItemApproval {
  status: WorkStatusApprovalStatus;
  requestedAt?: string;
  requestedBy?: string;
  requestedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectionReason?: string;
  photoCount?: number;
  videoCount?: number;
  photoUrls?: string[];
  videoUrls?: string[];
  /** Free-form update label (who last touched this sub-item). */
  updatedBy?: string;
  updatedByName?: string;
  /** ISO timestamp of last meaningful change. */
  updatedAt?: string;
  /** Free-form comment for an update (rejection reason is separate). */
  notes?: string;
}

// Work status approval info per item (supports both main stages and sub-items)
export interface WorkStatusApprovalInfo {
  status: WorkStatusApprovalStatus;
  requestedAt?: string;
  requestedBy?: string;
  requestedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
  rejectionReason?: string;
  photoCount?: number;
  videoCount?: number;
  /** Optional media URLs captured at the main-stage level (mirrors sub-item shape). */
  photoUrls?: string[];
  videoUrls?: string[];
  /** Activity / audit metadata used by ProgressReportTab for "last updated" cells. */
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
  notes?: string;
  // Sub-item approvals (for expanded stages like structure, panel, etc.)
  subItemApprovals?: {
    [subItemKey: string]: WorkStatusSubItemApproval;
  };
}

// Project Timeline Status for Solar Projects (7-step process)
export interface ProjectTimelineStatus {
  projectId: string;
  
  // 1. File Login (Document / Bank Process Stage) - Sequential flow
  fileLogin: "pending" | "doc-received" | "file-login" | "submitted" | "complete";
  fileLoginComplete?: boolean;
  
  // 2. Subsidy Type - Selection based
  subsidyType: "center-78k" | "state-17k" | "both" | "not-applicable" | "";
  
  // 3. Bank File / Cash (Two separate trees + combined option)
  bankFileType: "cash" | "loan" | "cash-and-loan" | ""; // Which tree selected
  // For loan flow:
  loanStage: "file-prepare" | "file-into-bank" | "loan-apply" | "";
  loanStatus: "pending" | "approved" | "rejected" | "";
  
  // 4. Work Status (7 main stages with sub-items)
  // Values: structure, panel, wiring, earthing, inverter, civil, meter
  // Sub-items tracked in workStatusApprovals
  workStatusChecks: string[]; // Array of completed main stages
  workStatusComplete?: boolean;
  
  // 4b. Work Status Approvals (User/Admin workflow)
  workStatusApprovals?: {
    [stageKey: string]: WorkStatusApprovalInfo;
  };
  
  // 5. DISCOM (Sequential checkboxes)
  discomChecks: string[]; // Array of checked items: meter-file-submit, net-metering, subsidy-apply-photo
  discomSubsidyStatus: "pending" | "approved" | "rejected" | "";
  
  // 6. Payment Status (Two separate trees)
  paymentType: "cash-to-mahi" | "instalments" | "";
  cashToMahiConfirmed?: boolean;
  firstInstallmentPaid?: boolean;
  secondInstallmentPaid?: boolean;
  
  // 7. DCR & Work Completion Report (optional for backwards compatibility)
  dcrStatus?: "pending" | "preparation" | "documentation" | "submitted" | "complete" | "";
  dcrComplete?: boolean;
  
  updatedAt: string;
}

// Quotation sharing details
export interface QuotationShareDetails {
  id: string;
  quotationId: string;
  shareMethod: "whatsapp" | "email" | "sms" | "visit";
  contactValue?: string; // phone number or email
  sentAt: string;
  visitDate?: string;
  visitTime?: string;
  visitNotes?: string;
}

/** Line-level split when customer pays and funds are allocated between company and partner. */
export interface ClientPaymentDestinationSplitLine {
  recipient: "company" | "partner";
  amount: number;
}

// Client Payment Record for project financials (collections layer — billing is MSS→customer invoices)
export interface ClientPaymentRecord {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  paymentMode: "cash" | "upi" | "bank-transfer" | "cheque" | "neft" | "rtgs" | "imps";
  reference?: string; // cheque number, transaction ID, etc.
  notes?: string;
  recordedBy?: string;
  recordedAt: string;
  /** Who receives this payment (cash flow destination — distinct from invoicing entity). Defaults to company for legacy rows. */
  settlementRecipient?: "company" | "partner" | "split";
  /** Required when settlementRecipient is split; amounts should sum to `amount`. */
  splitLines?: ClientPaymentDestinationSplitLine[];
  /** Stage in the payment lifecycle (loan release, instalments, etc.). */
  paymentStage?: "advance" | "milestone" | "completion" | "loan_release" | "other";
}

// Project types including Solo, Partnership, and Outsourced projects
import type { ServicePreset, ServicePresetService } from "@/types/finance";

export type ProjectPartnerType = "profit" | "fixed" | "vendorship";

export interface ProjectPartner {
  partnerId: string;
  partnerName: string;
  /** Project-level role: this is the only place partner economics are defined. */
  partnerType: ProjectPartnerType;
  /** Profit partner: percentage of actual project profit. */
  sharePercentage?: number;
  /** Legacy alias for sharePercentage */
  profitSharePercent?: number;
  /** Fixed share partner: agreed fixed amount / margin from project revenue. */
  fixedAmount?: number;
  /** Vendorship partner: fee payable by the partner to the company. */
  feeAmount?: number;
  /** Snapshot of expected partner earning for this project. */
  calculatedEarning?: number;
  /** Settlement direction for display and audit. */
  settlementDirection?: "company_pays_partner" | "partner_pays_company" | "direct_to_partner";
  notes?: string;
}

export interface ProjectMaterialLedgerEntry {
  itemId: string;
  /** Links consumption to `executionLineItems[].id` when issued against BOQ. */
  baselineLineId?: string;
  openingQty: number;
  issuedQty: number;
  returnedQty: number;
  scrapAtSiteQty: number;
  consumedQty: number;
  updatedAt: string;
}

export interface PartyPayment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
}

/** MSS document studio output — stored on the project for audits and customer pack. */
export interface ProjectGeneratedDocument {
  id: string;
  docKey: string;
  title: string;
  createdAt: string;
  /** Sanitized HTML for in-app preview / print */
  bodyHtml: string;
  /** Previous row id when this row supersedes a prior generation (version history). */
  supersedesId?: string;
  /** Monotonic per docKey within a project; defaults to 1 when absent. */
  version?: number;
}

export interface ProjectTeamAssignment {
  id: string;
  teamId: string;
  teamName: string;
  startDate: string;
  endDate: string;
  notes?: string;
}

// Employee Task interface for task assignment system
export interface Task {
  id: string;
  employeeId?: string; // Optional if assigned to team
  teamId?: string;     // Optional if assigned to individual
  projectId: string;
  siteId: string;
  siteName: string;
  workType: string;
  workTag?: string;
  notes: string;
  createdDate: string;
  workDate: string;
  originalDate?: string; // Original date before any delays
  status: "created" | "sent" | "checked" | "started" | "done";
  createdBy: string;
  /** Optional link to timeline / work milestone keys (e.g. Progress Report step). */
  milestoneId?: string;
  // Multi-select work items support
  workItems?: {
    stageKey: string;
    stageName: string;
    subItems: string[];
  }[];
  dateOffset?: number; // T+n offset from base date
  /** Audit trail of past work-date moves; first entry is the original promised date. */
  delayHistory?: { from: string; to: string; reason?: string; at: string }[];
}

// Quotation material snapshot for preset tracking
export interface QuotationMaterial {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  hsn?: string;
}

/** Frozen commercial scope from quotation conversion or intake wizard. */
export interface CommercialBaselineLine {
  id: string;
  quotationMaterialId?: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
}

export interface CommercialBaseline {
  id: string;
  quotationId?: string;
  /** Customer key for referential integrity — required when known. */
  customerId: string;
  capturedAt: string;
  lines: CommercialBaselineLine[];
  materialsTotal: number;
  servicesTotal: number;
  /** Originating commercial basis from quotation / intake (Phase 4.5b). */
  basis?: "fixed" | "per_kw" | "per_sqft";
  rateValue?: number;
  /** kW or sqft quantity when basis is not fixed. */
  pricingQuantity?: number;
}

/** Execution tracking row: baseline line + issued quantity vs quoted. */
export interface ExecutionLineItem extends CommercialBaselineLine {
  source: "quotation" | "manual" | "intake";
  issuedQty: number;
}

/** Modular Project Configuration determining features and tabs */
export interface ProjectScopeConfig {
  hasMaterial: boolean;
  hasInstallation: boolean;
  vendorshipOwner: "MSS" | "PARTNER" | "CLIENT";
  vendorshipFeeAmount?: number;
  leadSource: "MSS_DIRECT" | "PARTNER" | "AGENT";
  partnerId?: string;
  agentId?: string;
  billingParty: "MSS" | "PARTNER";
  partnerBillingFeePercentage?: number;
  kNumber?: string;
  installationBy?: "MSS" | "Subcontractor" | "Partner" | "Client";
  incGiverCompanyId?: string;
  rateBasis?: "fixed" | "per_kw" | "per_sqft";
  rateValue?: number;
  profitSharePercent?: number;
  fixedRatePerKw?: number;
  partnerCoversVendorship?: boolean;
  vendorshipFeeResponsibility?: "MSS" | "PARTNER" | "CLIENT";
  vendorshipCompanyId?: string;
}

/**
 * Per-project site checklist entry — describes a planned material/item the project needs,
 * with running quantities for what has been issued / returned / consumed.
 *
 * `qtyPlanned` is the canonical "we need this much" number. It is seeded from the linked
 * quotation's BOM at project creation; super admin can edit per project. Marking items as
 * sent through Materials Sent flow bumps `qtySent` and writes a matching record into
 * `Project.materialsSent`. Cost tracking uses `qtySent * unitPrice` as actual material cost.
 */
export interface ProjectSiteChecklistItem {
  id: string;
  name: string;
  category?: string;
  unit: string;
  qtyPlanned: number;
  qtySent: number;
  qtyReturned: number;
  qtyConsumed: number;
  unitPrice?: number;
  sourceQuotationItemId?: string | number;
  /** True when super admin added/edited this item per project requirements (not from quotation). */
  addedByOverride?: boolean;
  /** Where the row originated. Legacy items without this field are treated as "quotation". */
  source?: "quotation" | "template" | "manual";
  sourceTemplateId?: string;
  sourceTemplateName?: string;
  addedByEmployeeId?: string;
  addedByEmployeeName?: string;
  addedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  /** @deprecated The 8-value kind taxonomy is being collapsed into {@link projectMode} + attribute
   *  fields. Kept for backwards compatibility while migration is in progress. `normalizeProject`
   *  keeps this in sync with the new fields. */
  projectKind?: "SOLO_EPC" | "PARTNER_EPC" | "FIXED_EPC" | "VENDOR_NETWORK" | "INC" | "INC_GIVEN" | "OUTSOURCED_INC" | "VENDORSHIP_ONLY";
  projectKindConfigSnapshot?: {
    requiredParties: string[];
    requiredCommercialFields: string[];
    allowedBillingDirections: string[];
    visibleTabs: string[];
    requiredDocuments: string[];
    forbiddenActions: string[];
  };

  // New project taxonomy (3 types + attribute fields). See [domain/projectTypes/types.ts].
  /** 3-value type: DIRECT_CLIENT | PARTNER_NETWORK | INC_GIVEN_TO_US. Field name is `projectMode`
   *  because `projectType` (residential / commercial / industrial) is already taken. */
  projectMode?: "DIRECT_CLIENT" | "PARTNER_NETWORK" | "INC_GIVEN_TO_US";
  vendorshipOwner?: "MSS" | "partner" | "none";
  partnerRole?: "epc" | "fixed_margin" | "vendor_channel" | "vendorship_only";
  executionScope?: "full" | "service_only" | "none";
  /** Per-project site checklist — seeded from quotation BOM, editable by super admin per project. */
  siteChecklist?: ProjectSiteChecklistItem[];

  /** Attaches outsourcing info to an existing project. Set when the user picks Outsourced INC
   *  in the Create Project sheet and selects an existing open project. */
  outsource?: {
    partyId?: string;
    partyName?: string;
    rateBasis: "per_kw" | "per_sqft" | "fixed";
    rateValue: number;
    quantity?: number;
    total: number;
    notes?: string;
    attachedAt: string;
  } | null;

  // Project classification (Legacy/Migration)
  type?: "EPC" | "INC" | "OTHER";
  projectType: "Residential" | "Commercial" | "Industrial";
  projectCategory: "solar" | "other";
  // ownerType coexists for backward compatibility with tests/legacy views
  ownerType?: "solo" | "partnership" | "outsourced" | string;
  
  // Modular Configuration
  scope?: ProjectScopeConfig;
  
  // Status tracking (Unified)
  /** Canonical machine label is `"New"`; legacy rows may still use `"Draft"` / `"Active"`. */
  lifecycleStatus: "New" | "Draft" | "Active" | "In Progress" | "On Hold" | "Completed";
  executionPhase?: string; // Replaces progressStage for specific phases
  /** Free-form field notes from the Execution tab (prototype). */
  executionNotes?: string;
  
  // Legacy coexisting fields enforced in normalization
  status?: "Ongoing" | "Completed" | "On Hold" | string;
  progressStage?: string;
  
  // Client details
  client: string;
  clientAddress?: string;
  address?: string; // legacy/alias for clientAddress
  state?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientGstin?: string;
  // Customer linkage — required (legacy rows hydrated at load)
  customerId?: string;

  /** Frozen commercial baseline + BOQ-derived execution rows. */
  commercialBaseline?: CommercialBaseline;
  executionLineItems?: ExecutionLineItem[];

  /** Direct / exception intake without quotation (audit). */
  directCreationReason?: string;
  
  // Project specs
  capacity: string;
  location: string;
  
  // Team
  assignees?: string[];
  teamAssignments?: ProjectTeamAssignment[];
  onSite?: number;
  
  // Financials
  contractAmount: number; // What client actually pays (from quotation.clientAgreedAmount)
  totalCost?: number;
  amountInvoiced?: number; // Total billed amount across invoices / sale bills for the project
  amountReceived: number; // Cash collected against the project
  
  // Payment type from quotation (cash or loan)
  paymentType?: "cash" | "loan" | "cash-and-loan" | "";
  // Bank documentation amount (only for loan files - higher amount for bank)
  bankDocumentationAmount?: number;
  
  // Partnership fields (when ownerType === "partnership")
  partners?: ProjectPartner[];
  totalPartnerInvestment?: number;
  
  // Outsourced fields (when ownerType === "outsourced")
  partyName?: string;
  partyContact?: string;
  partyEmail?: string;
  contractValue?: number;
  amountToParty?: number;
  partyPayments?: PartyPayment[];
  ourExpenses?: string[]; // expense IDs
  
  // Quotation & Preset linkage
  quotationId?: string;
  quotationType?: "temporary" | "final";
  presetId?: string;
  
  // Invoice linkage
  invoiceId?: string;
  /** All invoices / sale bills tied to this project (prototype); `invoiceId` may mirror the latest primary. */
  invoiceIds?: string[];
  /** When paymentType is loan, which loan record funds execution (prototype). */
  fundingLoanId?: string;

  /** Client-generated keys for idempotent material movement retries (see inventory command). */
  materialMovementDedupeIds?: string[];
  
  // Agent / Commission fields
  agentId?: string;
  agentName?: string;
  commissionRate?: number;
  commissionRateType?: "per-kw" | "per-project";
  commissionAmount?: number;
  commissionPaid?: number;

  /** Partnership / commercial mode at project level (prototype fields). */
  partnershipModel?: "profit_share" | "fixed_backend";
  mssBackendAmount?: number;
  partnerCustomerSellAmount?: number;

  /** VENDOR_NETWORK economics & ops (display + validation v1). */
  vendorNetworkCommissionType?: "per_kw" | "flat";
  vendorNetworkFeePerKw?: number;
  vendorNetworkFlatFee?: number;
  channelPartnerIdRef?: string;
  loanReceiptHandling?: "mss" | "channel" | "split";
  cashHandling?: "mss" | "channel" | "split";

  /** Vendorship Code Tracking (applies to ALL project types) */
  vendorshipCodeOwner?: "self" | "external";
  externalVendorshipEntity?: string;
  vendorshipFeePayable?: number;
  vendorshipFeeReceivable?: number;

  /** INC: labour-only vs labour + materials billing story. */
  incScope?: "labour" | "labour_and_materials";
  
  // Materials sent to site
  materialsSent?: { itemId: string; itemName: string; quantity: number; dateIssued: string; unitPrice: number; }[];
  siteMaterialLedger?: ProjectMaterialLedgerEntry[];
  
  // Media
  photos?: number;
  /** Optional gallery (prototype); `photos` is kept in sync as count when this array is used. */
  photoGallery?: { id: string; url: string; caption?: string; uploadedAt: string }[];
  documents?: string[];

  /** Platform-generated dossier rows (prototype — HTML bodies for preview/print). */
  generatedDocuments?: ProjectGeneratedDocument[];
  
  // Dates
  startDate: string;
  endDate?: string | null;
  createdAt: string;

  /** Site readiness gate for "Start project" action. Set via the Site Readiness button on ProjectDetail. */
  siteReadiness?: {
    ready: boolean;
    note?: string;
    markedAt: string;
    markedBy: string;
  };
  /** Timestamp when "Start project" was actually clicked (distinct from planned startDate). */
  startedAt?: string;
  /** Mid-project add-on work (INC_GIVEN flow). Each line picks a basis and adjusts contractAmount. */
  additionalWorkLines?: {
    id: string;
    description: string;
    basis: "fixed" | "per_kw" | "per_sqft";
    rate: number;
    qty?: number;
    total: number;
    addedAt: string;
  }[];
  /** Soft-archive marker for super_admin / cleanup. Active when null/undefined. */
  archivedAt?: string | null;
  archivedReason?: string;
}

export interface Employee {
  id: string;
  name: string;
  initial: string;
  role: string;
  phone: string;
  email?: string;
  status: "Active" | "Inactive";
  site: string;
  salary: number;
  wallet: number;
  aadhar?: string;
  dob?: string;
  joiningDate: string;
  
  // Photo URL for employee profile
  photoUrl?: string;
  
  // Attendance summary (current month)
  daysPresent: number;
  daysAbsent: number;
  holidays: number;
  
  // Payments
  advancePaid: number;
  pendingAmount: number;

  /** Termination marker. Status flips to "Inactive" simultaneously. */
  terminatedAt?: string;
  terminationReason?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: "present" | "absent" | "holiday" | "half-day" | "paid_leave";
  sites: string[];
  notes?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  status: "draft" | "sent" | "approved" | "rejected" | "withdrawn" | "converted_to_project";
  quotationType: "solar" | "other";
  enquiryId?: string;
  
  // Reference field - auto-filled from existing project/client if applicable
  referenceClientName?: string;
  
  // Customer linkage — optional for leads, required for approved quotes
  customerId?: string;
  
  // Client info
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientCity: string;
  clientState: string;
  clientAddress?: string;
  clientPincode?: string;
  clientGstin?: string;
  clientPan?: string;
  /** company | individual — drives GSTIN requirement on customer create */
  clientType?: "company" | "individual";
  /** Human-readable payment schedule (booking / milestones) for customer + invoice prefill */
  paymentTermsSummary?: string;
  agentId?: string; // Links to Agent table when source is "referral"
  
  // System details (Solar quotations only)
  systemCategory?: "residential" | "commercial" | "industrial";
  systemCapacity?: string;
  systemConfigNotes?: string; // Notes for system configuration section
  
  // Other quotation specific fields
  otherQuotationTitle?: string; // e.g., "Ladder Building", "Colour Painting"
  otherQuotationDescription?: string;
  customItems?: { title: string; description?: string; quantity: number; unit: string; rate: number; amount: number }[];
  
  // Preset & Materials linkage
  presetId?: string;
  presetSnapshot?: QuotationMaterial[];
  attachedPresetId?: string; // Inventory preset attached during quotation creation
  
  // ============ PAYMENT TYPE & FINANCIAL AMOUNTS ============
  // Payment type determines the flow in Project Timeline
  paymentType: "cash" | "loan" | "cash-and-loan" | ""; // Selected by sales person
  
  // Client Agreed Amount - What client will actually pay (used as contractAmount in Project)
  clientAgreedAmount?: number;

  /** Commercial pricing mode (Phase 4.5b) — drives project baseline and change-request deltas. */
  pricingBasis?: "fixed" | "per_kw" | "per_sqft";
  pricingRate?: number;
  /** kW or sqft depending on pricingBasis. */
  pricingQuantity?: number;
  
  // Bank Documentation Amount - ONLY for loan files (higher amount shown for bank/GST purposes)
  bankDocumentationAmount?: number;
  
  // Legacy fields (maintained for backward compatibility)
  temporaryAmount?: number; // Deprecated - use clientAgreedAmount
  finalAmount?: number; // Final negotiated amount
  totalAmount: number; // System calculated with GST
  actualPaidAmount?: number; // Sum of payments received from client (auto-calculated)
  
  // Section visibility for export/preview
  sectionVisibility?: {
    systemDetails: boolean;
    materials: boolean;
    hideAmounts: boolean;
    whatYouGet: boolean;
    paymentTerms: boolean;
    warranty: boolean;
    termsConditions: boolean;
  };
  
  // Notes for export
  notes?: string;
  
  // Share to client details
  shareHistory?: {
    method: "whatsapp" | "email" | "sms" | "visit";
    contactValue?: string;
    sentAt: string;
    visitDate?: string;
    visitTime?: string;
    visitNotes?: string;
  }[];
  
  // Status
  /** @deprecated derive from `status === "converted_to_project"` */
  /** @deprecated Derive from `status === "converted_to_project"` or `linkedProjectId`. */
  isConverted?: boolean;
  /**
   * @deprecated Legacy project link — migrated to `linkedProjectId` on hydrate (v4) and stripped from persisted state.
   * Do not write this field; use `buildQuotationProjectLinkPatch` at convert time.
   */
  convertedToProjectId?: string;
  /** Canonical project id after quotation → project conversion. */
  linkedProjectId?: string;
  convertedToInvoiceId?: string;
  rejectionReason?: string;
  withdrawnReason?: string;

  // Dates (status transition timestamps — used to render real Status History)
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  withdrawnAt?: string;
  convertedAt?: string;
  /** @deprecated kept for legacy seed compatibility; mirrors `approvedAt` */
  confirmedAt?: string;
  revisionOfQuotationId?: string;
  lifecycleLockReason?: string;
  commercialSnapshot?: {
    capturedAt: string;
    companyName: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerAddress?: string;
    customerState: string;
    customerCity: string;
    quotationType: "solar" | "other";
    systemCategory?: "residential" | "commercial" | "industrial";
    systemCapacity?: string;
    totalAmount: number;
    clientAgreedAmount?: number;
    bankDocumentationAmount?: number;
    paymentType: "cash" | "loan" | "cash-and-loan" | "";
    notes?: string;
    sectionVisibility?: {
      systemDetails: boolean;
      materials: boolean;
      hideAmounts: boolean;
      whatYouGet: boolean;
      paymentTerms: boolean;
      warranty: boolean;
      termsConditions: boolean;
    };
  };
}

// Quotation Visibility Presets
export interface QuotationVisibilityPreset {
  id: string;
  name: string;
  visibility: {
    systemDetails: boolean;
    materials: boolean;
    hideAmounts: boolean;
    whatYouGet: boolean;
    paymentTerms: boolean;
    warranty: boolean;
    termsConditions: boolean;
  };
  createdAt: string;
}

export interface InventoryMovementRecord {
  id: string;
  type: "issue" | "return" | "purchase" | "adjustment";
  siteId?: string;
  siteName?: string;
  qty: number;
  date: string;
  employeeId?: string;
  employeeName?: string;
  condition?: string;
  notes?: string;
  createdAt: string;
  /** Super-admin movement reversal markers; preserves the original row for audit. */
  reversedAt?: string;
  reversalReason?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;          // Display/issue unit (pcs, meter, foot, bag)
  stockUnit?: string;    // Purchase unit if different (kg for bolts/nuts)
  stockInPurchaseUnit?: number; // Stock in purchase unit (kg)
  perPieceWeight?: number;      // Weight per piece in grams (for kg->pcs conversion)
  perPieceLength?: number;      // Length per piece in foot or meter (for length->pcs, pcs->length conversions)
  size?: string;         // Size specification (M12x2mtr, 40x40mm, etc.)
  allowDecimalReturn?: boolean; // For items like lock fix chemical
  value: number;
  buyPrice: number;
  salePrice: number;
  hsn: string;
  notes?: string;
  minStock: number;
  alert?: boolean;
  movementHistory?: InventoryMovementRecord[];
  /** When set, item is hidden from new procurement / sale flows. */
  deactivatedAt?: string;
}

/** Solar package line items edited on Settings (persisted via AppDataContext). */
export interface SolarPackagePreset {
  id: string;
  name: string;
  category: "residential" | "commercial" | "industrial";
  capacityKW: number;
  panelBrand: string;
  panelWattage: number;
  panelCount: number;
  inverterBrand: string;
  inverterCapacity: string;
  structureType: string;
  estimatedCost: number;
}

/** Directory / team rows from Settings (persisted via AppDataContext). */
export interface SettingsTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

/** @deprecated Use Settings → masters; kept as empty export for import compatibility. */
export const DEFAULT_SOLAR_PACKAGE_PRESETS: SolarPackagePreset[] = [];

/** Empty by default; team members are added via Settings or persisted seed. */
export const DEFAULT_SETTINGS_TEAM_MEMBERS: SettingsTeamMember[] = [];

export interface InventoryPresetItem {
  inventoryItemId: string;
  name: string;
  quantity: number;
  unit: string;
}

export type { ServicePreset, ServicePresetService };

/** Checklist line on an installation site; material lines drive Need-to-Get. */
export interface SiteChecklistItem {
  id: string;
  requiresMaterial: boolean;
  inventoryItemId?: string;
  materialName?: string;
  requiredQuantity?: number;
  masterPresetId?: string;
  status?: "pending" | "dispatched" | "partially-dispatched";
}

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  leadId?: string;
  createdAt: string;
  status: "Active" | "Inactive";
  description?: string;
}

/** Site / execution location linked to a project. */
export interface SiteRecord {
  id: string;
  name: string;
  projectId: string;
  projectName?: string;
  workStartDate?: string;
  status?: "active" | "completed" | "on-hold";
  checklistItems?: SiteChecklistItem[];
  presetId?: string; // Link to SiteChecklistPreset in Masters
  archivedAt?: string | null;
}

export interface ToolMovementRecord {
  id: string;
  type: "issue" | "return";
  siteId?: string;
  siteName?: string;
  date: string;
  employeeId?: string;
  employeeName?: string;
  condition?: string;
  notes?: string;
  /** Free-text condition / handoff notes (mirrors `notes` on returns when only one field is set). */
  conditionNotes?: string;
  createdAt: string;
  reversedAt?: string;
  reversalReason?: string;
}

export interface Tool {
  id: string;
  name: string;
  assignedTo: string;
  /** FK to employees.id when issued to a person. */
  assignedToEmployeeId?: string;
  site: string;
  /** FK to sites.id when issued to a site. */
  assignedToSiteId?: string;
  status: "In Use" | "Available" | "Under Repair" | "Retired";
  lastUpdated: string;
  condition: "Good" | "Fair" | "Poor" | "Damaged";
  /** Current on-hand notes (wear, repair history, etc.). */
  conditionNotes?: string;
  category: string;
  purchaseRate: number;
  purchaseDate: string;
  movementHistory?: ToolMovementRecord[];
  retiredAt?: string;
  retiredReason?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string[];
  contact: string;
  email: string;
  address: string;
  gstin?: string;
  /** Optional primary project link for procurement / site context (prototype). */
  linkedProjectId?: string;
  outstandingAmount: number;
  purchaseHistory: { date: string; item: string; amount: number; }[];
}

// ============ ENQUIRY ============
export interface Enquiry {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerType: "individual" | "company";
  source: "website" | "phone" | "referral" | "walk-in" | "social-media" | "other";
  agentId?: string; // Links to Agent table when source is "referral"
  systemCapacity: string;
  estimatedBudget: number;
  requirements: string;
  status: "new" | "meeting_scheduled" | "quotation_sent" | "quotation_rejected" | "converted" | "lost";
  priority: "low" | "medium" | "high";
  assignedTo: string;
  meetingDate?: string;
  meetingNotes?: string;
  followUpDate?: string;
  /** Latest linked quotation (mirrors last entry in `quotationIds`). */
  quotationId?: string;
  /** All quotations created for this enquiry, oldest → newest. */
  quotationIds?: string[];
  customerId?: string;
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
  notes: { date: string; note: string; by: string; updatedBy?: string }[];
  /** Soft-archive marker. Active when null/undefined. */
  archivedAt?: string | null;
  archivedReason?: string;
}

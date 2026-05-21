import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Printer, Send, Download, Plus, Trash2, Check, Phone, Mail, Edit, FileText, Eye, UserCheck, X, Save, CheckCircle, Briefcase, MessageCircle, Calendar, Clock, MapPin, Share2, AlertTriangle, ChevronDown, Zap, CreditCard, Package, Columns2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AppSheetFormFooter } from "@/components/shared/AppSheetFormFooter";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { ToastAction } from "@/components/ui/toast";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { LifecycleTermHint } from "@/components/ui/LifecycleTermHint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { lifecycleTermSummary } from "@/lib/lifecycleTerminology";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { QuotationStaticSectionsBlock } from "@/components/quotations/QuotationStaticSectionsBlock";
import { QuotationCreateSourceGate } from "@/components/quotations/QuotationCreateSourceGate";
import {
  buildCustomerToQuotationDraft,
  buildEnquiryToQuotationDraft,
  buildQuotationCloneDraft,
  buildQuotationToProjectDraft,
  loadCreateDraft,
  parseCreateFromParam,
  resolveCreateFromOrToast,
  stripCreateFromParam,
  saveCreateDraft,
  type QuotationCloneDraft,
  type QuotationDraftFromCustomer,
  type QuotationDraftFromEnquiry,
} from "@/lib/createFromContext";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { isQuotationInFlight } from "@/lib/quotationListFilters";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { assertCanLinkNewQuotationToEnquiry } from "@/lib/enquiryQuotationCreateGate";
import { validateQuotationCreateSource } from "@/lib/quotationCreateSource";
import { isQuotationConverted, quotationLinkedProjectId } from "@/lib/quotationSelectors";
import {
  canDeleteQuotationRecord,
  PROJECT_SCOPE_CHANGE_GUIDANCE,
  QUOTATION_ONE_SHOT_CONVERSION_HELP,
} from "@/lib/quotationProjectConversionPolicy";
import type { QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import {
  formatQuotationStatusLabel,
  isQuotationFormLocked,
  quotationStatusBadgeClass,
} from "@/lib/quotationStatusUi";
import { useMasters } from "@/contexts/MastersContext";
import { ProjectKindService, type ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { projectKindConfigs } from "@/domain/projectTypes/config";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { companyInfo } from "@/components/ExportHeader";
import type { Quotation } from "@/types/project";
import type { Project } from "@/types/project";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
// AlertDialog removed
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR, formatCapacityKW } from "@/lib/formatCurrency";
import { AgingChip } from "@/components/ui/AgingChip";
import { getQuotationNoResponseAging } from "@/lib/agingHelpers";
import { useCan } from "@/hooks/useCan";
import { useCanAction } from "@/hooks/useCanAction";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { QuotationCommercialAmountDisplay } from "@/components/quotations/QuotationCommercialAmountDisplay";
import {
  hasDistinctClientAgreedAmount,
  hasPositiveQuotationAmount,
  persistQuotationAmountFields,
  QUOTATION_ZERO_AMOUNT_ERROR,
  resolveContractAmount,
  validateQuotationSendOrApprove,
} from "@/domain/quotation/quotationCommercialAmount";
import {
  QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE,
  validateQuotationPaymentTypeForSend,
} from "@/domain/quotation/quotationPaymentType";
import { isProjectPaymentType } from "@/domain/project/projectPaymentType";
import {
  buildPaymentTermsSummary,
  buildQuotationApprovalCustomerPreview,
  buildQuotationApprovalSuccessFeedback,
  type QuotationApprovalCustomerPreview,
} from "@/lib/quotationApproveCustomer";
import { QuotationApproveCustomerDialog } from "@/components/quotations/QuotationApproveCustomerDialog";
import ProjectConfirmationScreen from "@/components/projects/ProjectConfirmationScreen";
import {
  applyTeamAssignmentToProject,
  buildProjectConfirmationData,
  type ProjectTeamAssignmentDraft,
} from "@/lib/projectTeamAssignment";

interface QuotationMaterial {
  id: number;
  category: string;
  itemName: string;
  description?: string;
  size: string;
  quantity: number;
  rate: number;
  unit: string;
}

// Pre-defined materials based on uploaded PDF
const presetMaterials: Record<string, QuotationMaterial[]> = {
  "residential-3": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 540W Mono Perc Solar Panel", size: "540W", quantity: 6, rate: 13500, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Growatt 3kW On-Grid Inverter", size: "3kW", quantity: 1, rate: 35000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Elevated Structure Kit", size: "3kW", quantity: 1, rate: 18000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 4sqmm (Red & Black)", size: "4sqmm", quantity: 30, rate: 45, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 6sqmm", size: "6sqmm", quantity: 15, rate: 55, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Standard", quantity: 12, rate: 35, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "3kW", quantity: 1, rate: 3500, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "3kW", quantity: 1, rate: 2500, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Earthing Kit Complete", size: "Standard", quantity: 1, rate: 4500, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Standard", quantity: 1, rate: 2500, unit: "pcs" },
  ],
  "commercial-20": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 550W Bifacial Solar Panel", size: "550W", quantity: 36, rate: 14500, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Growatt 20kW On-Grid Inverter", size: "20kW", quantity: 1, rate: 180000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Elevated Structure Kit", size: "20kW", quantity: 1, rate: 95000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 6sqmm (Red & Black)", size: "6sqmm", quantity: 200, rate: 55, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 16sqmm 3-Phase", size: "16sqmm", quantity: 50, rate: 180, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Standard", quantity: 72, rate: 35, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "20kW", quantity: 1, rate: 12000, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "20kW", quantity: 1, rate: 8000, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Earthing Kit Complete", size: "Commercial", quantity: 2, rate: 6500, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Commercial", quantity: 2, rate: 4500, unit: "pcs" },
    { id: 11, category: "Meter", itemName: "Net Meter Bidirectional", size: "3-Phase", quantity: 1, rate: 8000, unit: "pcs" },
  ],
  "industrial-100": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 550W Bifacial Solar Panel", size: "550W", quantity: 182, rate: 14000, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Sungrow 100kW On-Grid Inverter", size: "100kW", quantity: 1, rate: 650000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Ground Mount Structure Kit", size: "100kW", quantity: 1, rate: 450000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 10sqmm (Red & Black)", size: "10sqmm", quantity: 1000, rate: 85, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 70sqmm 3-Phase Armoured", size: "70sqmm", quantity: 100, rate: 650, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Industrial", quantity: 364, rate: 40, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "100kW", quantity: 1, rate: 45000, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "100kW", quantity: 4, rate: 15000, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Industrial Earthing Kit", size: "Heavy Duty", quantity: 4, rate: 12000, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Industrial", quantity: 4, rate: 8000, unit: "pcs" },
    { id: 11, category: "Meter", itemName: "Net Meter Bidirectional", size: "3-Phase HT", quantity: 1, rate: 25000, unit: "pcs" },
    { id: 12, category: "Civil", itemName: "Foundation & Civil Work", size: "100kW", quantity: 1, rate: 150000, unit: "job" },
  ],
};

const Quotations = () => {
  const projectKindService = new ProjectKindService();
  const { currentRole } = useAppSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const quotationRef = useRef<HTMLDivElement>(null);
  const { 
    quotations: savedQuotations, 
    enquiries,
    customers: _customers,
    addCustomer: _addCustomer,
    addQuotation, 
    updateQuotation,
    recordQuotationShare,
    transitionQuotationStatus,
    reviseQuotation,
    withdrawQuotation,
    deleteQuotation,
    createProjectFromConfirmedQuotation,
    employees,
    generateId,
    partners,
    agents,
    quotationVisibilityPresets = [],
    addQuotationVisibilityPreset,
    deleteQuotationVisibilityPreset: _deleteQuotationVisibilityPreset,
    quotationTemplates = [],
    addQuotationTemplate,
    inventoryItems = [],
    projects,
    invoices,
    agentCommissionAccruals = [],
  } = useAppData();
  const canCreateQuotation = useCan("quotation", "create");
  const canEditQuotation = useCan("quotation", "edit");
  const canDeleteQuotation = useCan("quotation", "delete");
  const canApproveQuotation = useCan("quotationApprove", "edit");
  const canCreateProjectFromQuote = useCanAction("project:create_from_quote");
  
  // State for Create Project in edit/create view
  
  // View state: list, create, edit (solar-only quotations)
  const [currentView, setCurrentView] = useState<"list" | "create" | "edit">("list");
  const [lastConfirm, setLastConfirm] = useState<{
    variant: "success" | "warning" | "error";
    title: string;
    description?: string;
    customerId?: string;
    projectCreateQuotationId?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [createProjectStep, setCreateProjectStep] = useState<"form" | "confirm">("form");
  const [pendingCreateProject, setPendingCreateProject] = useState<Project | null>(null);
  const [selectedQuotationForProject, setSelectedQuotationForProject] = useState<typeof savedQuotations[0] | null>(null);
  const [projectAmountType, _setProjectAmountType] = useState<"temporary" | "final">("final");
  const [projectContractAmount, setProjectContractAmount] = useState(0);
  const [projectPaymentType, setProjectPaymentType] = useState<"cash" | "loan" | "cash-and-loan">("cash");
  const [projectBankDocAmount, setProjectBankDocAmount] = useState(0);
  const [quotationProjectKind, setQuotationProjectKind] = useState<ProjectKind>("SOLO_EPC");
  const [qPartnerIdForProject, setQPartnerIdForProject] = useState<string>("");
  const [qProfitSharePercent, setQProfitSharePercent] = useState("30");
  const [qVendorshipFee, setQVendorshipFee] = useState("");
  const [qFixedBackend, setQFixedBackend] = useState("");
  const [qFixedSell, setQFixedSell] = useState("");
  const [qChannel, setQChannel] = useState("");
  const [qExternal, setQExternal] = useState("");
  
  // Save Amounts Modal
  const [_isSaveAmountsOpen, setIsSaveAmountsOpen] = useState(false);
  const [saveAmountsQuotationId, setSaveAmountsQuotationId] = useState<string | null>(null);
  const [saveAmountTemp, setSaveAmountTemp] = useState<number | string>("");
  const [saveAmountFinal, setSaveAmountFinal] = useState<number | string>("");

  // Delete Confirmation Modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

  const quotationDeleteContext = useMemo(
    () => ({
      projects,
      accruals: agentCommissionAccruals,
      invoices,
    }),
    [projects, agentCommissionAccruals, invoices],
  );
  
  // Quotation state
  const [quotationNumber, setQuotationNumber] = useState(`Q-2024-${String(savedQuotations.length + 1).padStart(3, '0')}`);
  const [quotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<QuotationStatus>("draft");
  const formLocked = isQuotationFormLocked(status);
  const [referenceClientName, setReferenceClientName] = useState("");
  
  // Modal states
  const [isViewQuotationOpen, setIsViewQuotationOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  
  // Share to Client Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<"whatsapp" | "email" | "sms" | "visit">("whatsapp");
  const [shareContactValue, setShareContactValue] = useState("");
  const [shareVisitDate, setShareVisitDate] = useState("");
  const [shareVisitTime, setShareVisitTime] = useState("");
  const [shareVisitNotes, setShareVisitNotes] = useState("");
  
  // Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPincode, setClientPincode] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [clientPan, setClientPan] = useState("");
  const [clientType, setClientType] = useState<"company" | "individual">("individual");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [enquiryId, setEnquiryId] = useState<string | null>(null);
  const [withoutEnquiryReason, setWithoutEnquiryReason] = useState<string | null>(null);
  /** True once create flow has enquiry link or documented exception (O1). */
  const [createSourceResolved, setCreateSourceResolved] = useState(false);
  const [agentId, setAgentId] = useState("");
  
  // System configuration
  const [systemCategory, setSystemCategory] = useState("residential");
  const [systemCapacity, setSystemCapacity] = useState("3");
  const [panelBrand, setPanelBrand] = useState("Waaree");
  const [panelWattage, setPanelWattage] = useState("540");
  const [panelCount, setPanelCount] = useState("6");
  const [inverterBrand, setInverterBrand] = useState("Growatt");
  const [inverterCapacity, setInverterCapacity] = useState("3kW");
  const [structureType, setStructureType] = useState("Elevated - GI");
  const [floorHeight, setFloorHeight] = useState("1st Floor");
  const [systemConfigNotes, setSystemConfigNotes] = useState("");
  
  // Status filter for list view
  const [statusFilter, setStatusFilter] = useState<"all" | QuotationStatus>("all");
  const [pipelineFilter, setPipelineFilter] = useState<"all" | "inflight">(() =>
    searchParams.get("pipeline") === "inflight" ? "inflight" : "all",
  );
  const [listSearchQuery, setListSearchQuery] = useState("");

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (pipelineFilter === "inflight") next.set("pipeline", "inflight");
        else next.delete("pipeline");
        return next;
      },
      { replace: true },
    );
  }, [pipelineFilter, setSearchParams]);

  const QUOTE_LIST_COL_LS = "mss.quotations.listColumns.v1";
  type QuoteListColKey = "number" | "client" | "phone" | "system" | "amount" | "date" | "status";
  const DEFAULT_QUOTE_LIST_COLS: Record<QuoteListColKey, boolean> = {
    number: true,
    client: true,
    phone: true,
    system: true,
    amount: true,
    date: true,
    status: true,
  };
  const [quoteListColVis, setQuoteListColVis] = useState<Record<QuoteListColKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(QUOTE_LIST_COL_LS);
      if (!raw) return { ...DEFAULT_QUOTE_LIST_COLS };
      const parsed = JSON.parse(raw) as Partial<Record<QuoteListColKey, boolean>>;
      return { ...DEFAULT_QUOTE_LIST_COLS, ...parsed };
    } catch {
      return { ...DEFAULT_QUOTE_LIST_COLS };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(QUOTE_LIST_COL_LS, JSON.stringify(quoteListColVis));
    } catch {
      /* ignore quota / private mode */
    }
  }, [quoteListColVis]);

  const quoteListColSpan = useMemo(() => {
    let n = 1;
    (Object.keys(DEFAULT_QUOTE_LIST_COLS) as QuoteListColKey[]).forEach((k) => {
      if (quoteListColVis[k]) n += 1;
    });
    return n;
  }, [quoteListColVis]); // DEFAULT_QUOTE_LIST_COLS is module-scoped and never changes.

  const setQuoteListCol = (key: QuoteListColKey, checked: boolean) => {
    setQuoteListColVis((prev) => {
      const next = { ...prev, [key]: checked };
      const visibleCount = (Object.keys(DEFAULT_QUOTE_LIST_COLS) as QuoteListColKey[]).filter((k) => next[k]).length;
      if (visibleCount === 0) return prev;
      return next;
    });
  };

  useEffect(() => { setListPage(1); }, [statusFilter, pipelineFilter, listSearchQuery]);

  // Materials — will be populated from dynamicPresetMaterials once available
  const [materials, setMaterials] = useState<QuotationMaterial[]>(presetMaterials["residential-3"]);
  
  // Pricing
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstPercent, setGstPercent] = useState(13.8);
  const [govtSubsidy, setGovtSubsidy] = useState(78000);
  /** Empty = client agreed matches quoted total; otherwise negotiated contract amount. */
  const [clientAgreedAmountOverride, setClientAgreedAmountOverride] = useState("");
  
  // Temporary vs Final Quotation amounts
  const [bankDocumentationAmount, setBankDocumentationAmount] = useState<number | null>(null);
  const [_temporaryAmount, _setTemporaryAmount] = useState<number | null>(null);
  const [_finalAmount, _setFinalAmount] = useState<number | null>(null);
  
  // Payment Type (Cash, Loan, or Cash & Loan) - determines project timeline flow
  const [paymentType, setPaymentType] = useState<"cash" | "loan" | "cash-and-loan" | "">("");
  
  // Payment terms
  const [bookingAmount, setBookingAmount] = useState("20%");
  const [designApproval, setDesignApproval] = useState("30%");
  const [beforeDispatch, setBeforeDispatch] = useState("40%");
  const [postInstallation, setPostInstallation] = useState("10%");
  
  // Warranty
  const [panelProductWarranty, setPanelProductWarranty] = useState("12 Years");
  const [panelPerformanceWarranty, setPanelPerformanceWarranty] = useState("25 Years");
  const [inverterWarranty, setInverterWarranty] = useState("5 Years");
  const [structureWarranty, setStructureWarranty] = useState("10 Years");
  const [otherWarranty, setOtherWarranty] = useState("1 Year");
  
  // Notes / T&C
  const [notes, setNotes] = useState("• Installation includes complete wiring and commissioning\n• Net metering application assistance included\n• Free site survey and design consultation\n• AMC available after warranty period");
  
  // Terms & Conditions
  const [_termsAndConditions, _setTermsAndConditions] = useState("• Prices are subject to change without prior notice\n• All disputes subject to local jurisdiction\n• Payment terms must be adhered to as per agreement\n• Warranty is void in case of physical damage or improper handling");
  
  // Checklist items from Masters
  const { getQuotationChecklistItems } = useMasters();
  const checklistItems = getQuotationChecklistItems();
  const [_selectedChecklistItems, _setSelectedChecklistItems] = useState<string[]>(
    checklistItems.map(item => item.value)
  );
  
  // Section visibility toggles for preview/export
  const [sectionVisibility, setSectionVisibility] = useState({
    systemDetails: true,
    materials: true,
    hideAmounts: true, // Hide individual item amounts by default
    whatYouGet: true,
    paymentTerms: true,
    warranty: true,
    termsConditions: true,
  });

  // Shell skeleton ready flag
  const [shellReady, setShellReady] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShellReady(true), 80);
    return () => clearTimeout(t);
  }, []);
  
  // What You Get items
  const whatYouGet = [
    "Performance monitoring system",
    "Complete wiring and commissioning",
    "Net metering application assistance",
    "Free site survey and design consultation",
    "AMC available after warranty period"
  ];
  
  // Modals
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedQuotationTemplateId, setSelectedQuotationTemplateId] = useState<string | null>(null);

  // Visibility preset
  const [isSaveVisibilityPresetOpen, setIsSaveVisibilityPresetOpen] = useState(false);
  const [visibilityPresetName, setVisibilityPresetName] = useState("");
  
  // New material form
  const [newMaterial, setNewMaterial] = useState<Partial<QuotationMaterial>>({});

  // Calculations
  const systemCost = materials.reduce((sum, m) => sum + (m.quantity * m.rate), 0);
  const discountAmount = (systemCost * discountPercent) / 100;
  const afterDiscount = systemCost - discountAmount;
  const gstAmount = (afterDiscount * gstPercent) / 100;
  const netPrice = afterDiscount + gstAmount;
  const effectivePrice = netPrice - govtSubsidy;

  const parsedClientAgreedOverride = useMemo(() => {
    const trimmed = clientAgreedAmountOverride.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [clientAgreedAmountOverride]);

  const persistedQuotationAmounts = useMemo(
    () => persistQuotationAmountFields(effectivePrice, parsedClientAgreedOverride),
    [effectivePrice, parsedClientAgreedOverride],
  );

  const clientAgreedOverrideError =
    clientAgreedAmountOverride.trim() !== "" && parsedClientAgreedOverride == null
      ? "Enter a valid agreed amount or leave blank to match quoted total"
      : "";

  // Validation errors
  const discountError = discountAmount > systemCost ? "Discount cannot be higher than total cost" : "";
  const totalError = effectivePrice < 0 ? "Total cost cannot be negative" : "";
  const zeroAmountError =
    effectivePrice <= 0 && !totalError ? QUOTATION_ZERO_AMOUNT_ERROR : "";
  const paymentTypeError = isProjectPaymentType(paymentType)
    ? ""
    : QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE;
  const blocksSendApproveActions =
    !!discountError ||
    !!totalError ||
    !!zeroAmountError ||
    !!paymentTypeError ||
    !!clientAgreedOverrideError;

  // Reset form
  const resetForm = () => {
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setClientCity("");
    setClientState("");
    setClientAddress("");
    setClientPincode("");
    setClientGstin("");
    setClientPan("");
    setClientType("individual");
    setSystemCategory("residential");
    setSystemCapacity("3");
    setPanelBrand("Waaree");
    setPanelWattage("540");
    setPanelCount("6");
    setInverterBrand("Growatt");
    setInverterCapacity("3kW");
    setStructureType("Elevated - GI");
    setFloorHeight("1st Floor");
    setReferenceClientName("");
    setSystemConfigNotes("");
    setMaterials(dynamicPresetMaterials["residential-3"] || presetMaterials["residential-3"]);
    setDiscountPercent(0);
    setGstPercent(13.8);
    setGovtSubsidy(78000);
    setClientAgreedAmountOverride("");
    setStatus("draft");
    setActiveTab("create");
    setQuotationNumber(`Q-2024-${String(savedQuotations.length + 1).padStart(3, '0')}`);
    // Reset payment type
    setPaymentType("");
    setBankDocumentationAmount(null);
    setEnquiryId(null);
    setWithoutEnquiryReason(null);
    setCreateSourceResolved(false);
  };

  const beginNewQuotationCreate = () => {
    resetForm();
    setEditingQuotationId(null);
    setCurrentView("create");
    setCreateSourceResolved(false);
  };

  const markCreateSourceResolvedFromDraft = (draft: {
    enquiryId?: string;
    withoutEnquiryReason?: string;
  }) => {
    setCreateSourceResolved(!!(draft.enquiryId?.trim() || draft.withoutEnquiryReason?.trim()));
  };

  const applyCustomerQuotationDraft = (draft: QuotationDraftFromCustomer) => {
    setClientName(draft.customerName);
    setClientPhone(draft.customerPhone);
    if (draft.customerEmail) setClientEmail(draft.customerEmail);
    if (draft.customerAddress) setClientAddress(draft.customerAddress);
    setClientType(draft.customerType);
    if (draft.customerGstin) setClientGstin(draft.customerGstin);
    if (draft.customerPan) setClientPan(draft.customerPan);
    if (draft.customerState) setClientState(draft.customerState);
    setCustomerId(draft.customerId);
  };

  const applyQuotationCloneDraft = (draft: QuotationCloneDraft) => {
    setClientName(draft.clientName);
    setClientPhone(draft.clientPhone);
    if (draft.clientEmail) setClientEmail(draft.clientEmail);
    if (draft.clientAddress) setClientAddress(draft.clientAddress);
    if (draft.clientCity) setClientCity(draft.clientCity);
    if (draft.clientState) setClientState(draft.clientState);
    if (draft.clientPincode) setClientPincode(draft.clientPincode);
    if (draft.clientGstin) setClientGstin(draft.clientGstin);
    if (draft.clientPan) setClientPan(draft.clientPan);
    if (draft.clientType) setClientType(draft.clientType);
    if (draft.customerId) setCustomerId(draft.customerId);
    if (draft.agentId) setAgentId(draft.agentId);
    if (draft.enquiryId) setEnquiryId(draft.enquiryId);
    if (draft.withoutEnquiryReason) setWithoutEnquiryReason(draft.withoutEnquiryReason);
    if (draft.systemCategory) setSystemCategory(draft.systemCategory);
    if (draft.systemCapacity) setSystemCapacity(draft.systemCapacity);
    if (draft.systemConfigNotes) setSystemConfigNotes(draft.systemConfigNotes);
    if (draft.paymentType) setPaymentType(draft.paymentType);
    if (
      draft.totalAmount != null &&
      draft.clientAgreedAmount != null &&
      draft.clientAgreedAmount !== draft.totalAmount
    ) {
      setClientAgreedAmountOverride(String(draft.clientAgreedAmount));
    }
    setStatus("draft");
  };

  const handleCloneQuotation = (quotation: Quotation) => {
    resetForm();
    setEditingQuotationId(null);
    const draft = buildQuotationCloneDraft(quotation);
    saveCreateDraft("quotation-create-draft", draft);
    applyQuotationCloneDraft(draft);
    markCreateSourceResolvedFromDraft(draft);
    setCurrentView("create");
    setIsViewQuotationOpen(false);
    setLastConfirm({ variant: "success", title: "Quotation cloned", description: draft.banner });
  };

  const handleReviseQuotation = async (quotation: Quotation) => {
    const result = await reviseQuotation(quotation.id);
    if (!result.ok) {
      setLastConfirm({
        variant: "error",
        title: "Cannot revise",
        description: friendlyCommandErrorMessage(
          result.error,
          "Quotation is not revisable in its current status.",
        ),
      });
      return;
    }
    setIsViewQuotationOpen(false);
    setLastConfirm({
      variant: "success",
      title: "Revision created",
      description: `New draft revision opened from ${quotation.quotationNumber}.`,
    });
    if (result.revisedQuotationId) {
      setEditingQuotationId(result.revisedQuotationId);
      setCurrentView("edit");
      setActiveTab("create");
    }
  };

  const [withdrawDialogQuotation, setWithdrawDialogQuotation] = useState<Quotation | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [approveConfirm, setApproveConfirm] = useState<{
    quotationId: string;
    quotationNumber: string;
    preview: QuotationApprovalCustomerPreview;
    closeViewSheetOnDone: boolean;
  } | null>(null);

  const handleWithdrawQuotation = async () => {
    if (!withdrawDialogQuotation) return;
    const result = await withdrawQuotation(withdrawDialogQuotation.id, withdrawReason);
    if (!result.ok) {
      setLastConfirm({
        variant: "error",
        title: "Cannot withdraw",
        description: friendlyCommandErrorMessage(
          result.error,
          "Withdrawal is not allowed for this quotation.",
        ),
      });
      return;
    }
    setLastConfirm({
      variant: "warning",
      title: "Quotation withdrawn",
      description: `${withdrawDialogQuotation.quotationNumber} marked withdrawn.`,
    });
    if (editingQuotationId === withdrawDialogQuotation.id) {
      setStatus("withdrawn");
    }
    setWithdrawDialogQuotation(null);
    setWithdrawReason("");
    setIsViewQuotationOpen(false);
  };

  const applyEnquiryQuotationDraft = (draft: QuotationDraftFromEnquiry) => {
    setClientName(draft.customerName);
    setClientPhone(draft.customerPhone);
    setCustomerId(draft.customerId ?? null);
    if (draft.customerEmail) setClientEmail(draft.customerEmail);
    if (draft.customerAddress) {
      setSystemConfigNotes(`Address (from enquiry): ${draft.customerAddress}`);
    }
    if (draft.capacityHintKw > 0) setSystemCapacity(String(draft.capacityHintKw));
    if (draft.agentId) setAgentId(draft.agentId);
    setEnquiryId(draft.sourceEnquiryId);
    if (draft.notes) setSystemConfigNotes((prev) => (prev ? `${prev}\n${draft.notes}` : draft.notes ?? ""));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const createFrom = parseCreateFromParam(params.get("createFrom"));

    if (createFrom?.kind === "customer") {
      const stored = loadCreateDraft<QuotationDraftFromCustomer>("quotation-create-draft");
      const cust =
        stored?.customerId === createFrom.id
          ? _customers.find((c) => c.id === createFrom.id)
          : resolveCreateFromOrToast("customer", createFrom.id, (entityId) =>
              _customers.find((c) => c.id === entityId),
            );
      if (!cust && stored?.customerId !== createFrom.id) {
        stripCreateFromParam(params);
        navigate(`/quotations${params.toString() ? `?${params}` : ""}`, { replace: true });
        return;
      }
      resetForm();
      setEditingQuotationId(null);
      setCurrentView("create");
      setCreateSourceResolved(false);
      if (stored?.customerId === createFrom.id) {
        applyCustomerQuotationDraft(stored);
      } else if (cust) {
        const built = buildCustomerToQuotationDraft(cust);
        saveCreateDraft("quotation-create-draft", built);
        applyCustomerQuotationDraft(built);
      }
      stripCreateFromParam(params);
      navigate(`/quotations${params.toString() ? `?${params}` : ""}`, { replace: true });
      return;
    }

    if (createFrom?.kind === "enq") {
      const stored = loadCreateDraft<QuotationDraftFromEnquiry>("quotation-create-draft");
      const enquiry =
        stored?.sourceEnquiryId === createFrom.id
          ? enquiries.find((e) => e.id === createFrom.id)
          : resolveCreateFromOrToast("enq", createFrom.id, (entityId) =>
              enquiries.find((e) => e.id === entityId),
            );
      if (!enquiry && stored?.sourceEnquiryId !== createFrom.id) {
        stripCreateFromParam(params);
        navigate(`/quotations${params.toString() ? `?${params}` : ""}`, { replace: true });
        return;
      }
      if (enquiry) {
        const gate = assertCanLinkNewQuotationToEnquiry(enquiry, currentRole);
        if (!gate.ok) {
          toast({ title: "Cannot create quotation", description: gate.message, variant: "destructive" });
          stripCreateFromParam(params);
          navigate(`/quotations${params.toString() ? `?${params}` : ""}`, { replace: true });
          return;
        }
      }
      resetForm();
      setEditingQuotationId(null);
      setCurrentView("create");
      setCreateSourceResolved(true);
      if (stored?.sourceEnquiryId === createFrom.id) {
        applyEnquiryQuotationDraft(stored);
      } else if (enquiry) {
        const built = buildEnquiryToQuotationDraft(enquiry);
        saveCreateDraft("quotation-create-draft", built);
        applyEnquiryQuotationDraft(built);
      }
      stripCreateFromParam(params);
      navigate(`/quotations${params.toString() ? `?${params}` : ""}`, { replace: true });
      return;
    }

    if (params.get("create") !== "1") return;
    resetForm();
    setEditingQuotationId(null);
    setCurrentView("create");
    setCreateSourceResolved(false);

    if (params.get("from") === "enquiry") {
      const client = params.get("client");
      if (client) setClientName(decodeURIComponent(client));
      const phone = params.get("phone");
      if (phone) setClientPhone(decodeURIComponent(phone));
      const address = params.get("address");
      if (address) {
        setSystemConfigNotes(`Address (from enquiry): ${decodeURIComponent(address)}`);
      }
      const capacity = params.get("capacity");
      if (capacity) {
        const raw = decodeURIComponent(capacity).replace(/[^\d.]/g, "");
        if (raw) setSystemCapacity(raw);
      }
      const aid = params.get("agentId");
      if (aid) setAgentId(aid);
      const cid = params.get("customerId");
      if (cid) setCustomerId(cid);
      const eid = params.get("enquiryId");
      if (eid) {
        setEnquiryId(eid);
        setCreateSourceResolved(true);
      }
      const email = params.get("email");
      if (email) setClientEmail(decodeURIComponent(email));
    }

    navigate("/quotations", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when search signals create/enquiry once
  }, [location.search, navigate, enquiries, _customers]);

  // C2: handle `?quotation=<id>` / `?open=<id>` deep links from GlobalSearch / EntityInfoSheet /
  // ProjectDetail / DashboardQuotationRow (which also passes `state.focusQuotationId`).
  // Open the view sheet; toast if missing; strip the param after handle.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const stateQuotationId = (location.state as { focusQuotationId?: string } | null)?.focusQuotationId;
    const target =
      params.get("quotation") ??
      params.get("open") ??
      params.get("highlight") ??
      stateQuotationId ??
      null;
    if (!target) return;
    const found = savedQuotations.find((q) => q.id === target);
    if (found) {
      setSelectedQuotation(found);
      setIsViewQuotationOpen(true);
    } else {
      toast({
        title: "Quotation not found",
        description: `No quotation with id ${target}.`,
        variant: "destructive",
      });
    }
    params.delete("quotation");
    params.delete("open");
    params.delete("highlight");
    const remaining = params.toString();
    navigate(`/quotations${remaining ? `?${remaining}` : ""}`, {
      replace: true,
      state: stateQuotationId ? null : location.state,
    });
  }, [location.search, location.state, savedQuotations, navigate]);

  // Open save amounts confirmation modal
  const _handleOpenSaveAmounts = (quotation: Quotation) => {
    setSaveAmountsQuotationId(quotation.id);
    setSaveAmountTemp(quotation.temporaryAmount || quotation.totalAmount);
    setSaveAmountFinal(quotation.finalAmount || quotation.totalAmount);
    setIsSaveAmountsOpen(true);
  };

  // Confirm save amounts
  const _handleConfirmSaveAmounts = async () => {
    if (!saveAmountsQuotationId) {
      setIsSaveAmountsOpen(false);
      return;
    }
    const ur = await updateQuotation(saveAmountsQuotationId, {
      temporaryAmount: Number(saveAmountTemp) || 0,
      finalAmount: Number(saveAmountFinal) || 0,
      totalAmount: Number(saveAmountFinal || saveAmountTemp) || 0,
    });
    if (!ur.ok) {
      setLastConfirm({
        variant: "error",
        title: "Could not save amounts",
        description: friendlyCommandErrorMessage(ur.error, "Command failed"),
      });
      return;
    }
    setLastConfirm({ variant: "success", title: "Amounts saved", description: "Quotation amounts have been updated." });
    setIsSaveAmountsOpen(false);
    setSaveAmountsQuotationId(null);
  };

  const listStatusCounts = useMemo(() => {
    const all = savedQuotations;
    return {
      total: all.length,
      draft: all.filter((q) => q.status === "draft").length,
      sent: all.filter((q) => q.status === "sent").length,
      approved: all.filter((q) => q.status === "approved").length,
      rejected: all.filter((q) => q.status === "rejected").length,
      converted: all.filter((q) => isQuotationConverted(q)).length,
    };
  }, [savedQuotations]);

  // Filter quotations (solar only) by status + list search
  const displayedQuotations = savedQuotations.filter((q) => {
    const qsearch = listSearchQuery.trim().toLowerCase();
    if (qsearch) {
      const ref = (q.quotationNumber || "").toLowerCase();
      const client = (q.clientName || "").toLowerCase();
      const phone = (q.clientPhone || "").replace(/\s/g, "");
      if (!ref.includes(qsearch) && !client.includes(qsearch) && !phone.includes(qsearch.replace(/\s/g, ""))) {
        return false;
      }
    }
    if (pipelineFilter === "inflight" && !isQuotationInFlight(q)) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "converted") return isQuotationConverted(q);
    return q.status === statusFilter;
  });
  const listTotalPages = Math.max(1, Math.ceil(displayedQuotations.length / listPageSize) || 1);
  const safeListPage = Math.min(listPage, listTotalPages);
  const pagedQuotations = displayedQuotations.slice(
    (safeListPage - 1) * listPageSize,
    safeListPage * listPageSize
  );

  useEffect(() => {
    setListPage((p) => Math.min(p, listTotalPages));
  }, [listTotalPages]);

  // Build dynamic preset materials from inventory context, fallback to hardcoded
  const dynamicPresetMaterials = useMemo((): Record<string, QuotationMaterial[]> => {
    if (!inventoryItems || inventoryItems.length === 0) return presetMaterials;
    const baseItems = inventoryItems
      .filter(item => item.category !== "Service")
      .map((item, idx) => ({
        id: idx + 1,
        category: item.category || "Other",
        itemName: item.name,
        size: (item as any).size || "",
        quantity: 1,
        rate: (item as any).unitPrice || (item as any).buyPrice || 0,
        unit: (item as any).unit || "pcs",
      }));
    if (baseItems.length === 0) return presetMaterials;
    return {
      "residential-3": baseItems,
      "commercial-20": baseItems.map(i => ({ ...i, quantity: Math.ceil(i.quantity * 5) })),
      "industrial-100": baseItems.map(i => ({ ...i, quantity: Math.ceil(i.quantity * 25) })),
    };
  }, [inventoryItems]);

  // Load preset when category/capacity changes
  const handlePresetChange = (category: string, capacity: string) => {
    const key = `${category}-${capacity}`;
    if (dynamicPresetMaterials[key]) {
      setMaterials(dynamicPresetMaterials[key]);
      
      // Update system config based on preset
      if (category === "residential" && capacity === "3") {
        setPanelWattage("540");
        setPanelCount("6");
        setInverterCapacity("3kW");
        setGovtSubsidy(78000);
      } else if (category === "commercial" && capacity === "20") {
        setPanelWattage("550");
        setPanelCount("36");
        setInverterCapacity("20kW");
        setGovtSubsidy(0);
      } else if (category === "industrial" && capacity === "100") {
        setPanelWattage("550");
        setPanelCount("182");
        setInverterCapacity("100kW");
        setGovtSubsidy(0);
      }
    }
  };

  const handleCategoryChange = (value: string) => {
    setSystemCategory(value);
    // Set default capacity for category
    if (value === "residential") {
      setSystemCapacity("3");
      handlePresetChange(value, "3");
    } else if (value === "commercial") {
      setSystemCapacity("20");
      handlePresetChange(value, "20");
    } else if (value === "industrial") {
      setSystemCapacity("100");
      handlePresetChange(value, "100");
    }
  };

  const handleCapacityChange = (value: string) => {
    setSystemCapacity(value);
    handlePresetChange(systemCategory, value);
  };

  const handleAddMaterial = () => {
    if (newMaterial.itemName && newMaterial.quantity && newMaterial.rate) {
      setMaterials([...materials, {
        id: Date.now(),
        category: newMaterial.category || "Others",
        itemName: newMaterial.itemName,
        description: newMaterial.description || "",
        size: newMaterial.size || "-",
        quantity: newMaterial.quantity,
        rate: newMaterial.rate,
        unit: newMaterial.unit || "pcs",
      }]);
      setNewMaterial({});
      setIsAddMaterialOpen(false);
    }
  };

  const handleMaterialDescriptionChange = (id: number, description: string) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, description } : m));
  };

  const handleRemoveMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleQuantityChange = (id: number, qty: number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, quantity: qty } : m));
  };

  const handleRateChange = (id: number, rate: number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, rate: rate } : m));
  };

  const handleSaveQuotation = async () => {
    if (formLocked) {
      toast({
        title: "Quotation locked",
        description: "Terminal quotations cannot be edited. Clone or revise from the list.",
        variant: "destructive",
      });
      return;
    }
    if (!clientName) {
      toast({ title: "Error", description: "Please enter client name", variant: "destructive" });
      return;
    }
    if (discountError || totalError) {
      toast({ title: "Error", description: "Please fix validation errors", variant: "destructive" });
      return;
    }

    let resolvedEnquiryId: string | undefined = enquiryId || undefined;
    let resolvedWithoutEnquiryReason: string | undefined = withoutEnquiryReason || undefined;

    if (!editingQuotationId) {
      const linkedEnquiry = enquiryId ? enquiries.find((e) => e.id === enquiryId) : undefined;
      const sourceCheck = validateQuotationCreateSource(
        { enquiryId, withoutEnquiryReason },
        linkedEnquiry,
        currentRole,
      );
      if (!sourceCheck.ok) {
        toast({ title: "Cannot save quotation", description: sourceCheck.message, variant: "destructive" });
        return;
      }
      if (sourceCheck.mode === "enquiry") {
        resolvedEnquiryId = sourceCheck.enquiryId;
        resolvedWithoutEnquiryReason = undefined;
      } else {
        resolvedEnquiryId = undefined;
        resolvedWithoutEnquiryReason = sourceCheck.withoutEnquiryReason;
      }
    }

    const fieldPatch: Partial<Quotation> = {
      quotationNumber,
      quotationType: "solar", // Default to solar for existing flow
      clientName,
      clientPhone,
      clientEmail,
      clientCity,
      clientState,
      clientAddress: clientAddress || undefined,
      clientPincode: clientPincode || undefined,
      clientGstin: clientGstin || undefined,
      clientPan: clientPan || undefined,
      clientType,
      paymentTermsSummary: buildPaymentTermsSummary({
        booking: bookingAmount,
        designApproval,
        beforeDispatch,
        postInstallation,
      }),
      systemCategory: systemCategory as "residential" | "commercial" | "industrial",
      // Strip any trailing "kW"/"kWp" so persisted value is the bare number; display helpers re-append the unit.
      systemCapacity: systemCapacity.replace(/\s*k\s*w\s*p?\s*$/i, "").trim(),
      paymentType: isProjectPaymentType(paymentType) ? paymentType : undefined,
      ...persistedQuotationAmounts,
      bankDocumentationAmount:
        paymentType === "loan"
          ? bankDocumentationAmount || persistedQuotationAmounts.clientAgreedAmount
          : undefined,
      temporaryAmount: persistedQuotationAmounts.clientAgreedAmount,
      finalAmount: persistedQuotationAmounts.clientAgreedAmount,
      customerId: customerId || undefined,
      enquiryId: resolvedEnquiryId,
      withoutEnquiryReason: resolvedWithoutEnquiryReason,
      agentId: agentId || undefined,
      createdAt: new Date().toISOString().split("T")[0],
    };

    if (editingQuotationId) {
      const ur = await updateQuotation(editingQuotationId, fieldPatch);
      if (!ur.ok) {
        setLastConfirm({
          variant: "error",
          title: "Could not update quotation",
          description: friendlyCommandErrorMessage(ur.error, "Command failed"),
        });
        return;
      }
      setLastConfirm({ variant: "success", title: "Quotation updated", description: `${quotationNumber} has been updated` });
    } else {
      const r = await addQuotation({
        ...fieldPatch,
        status: "draft",
        id: generateId("Q"),
      } as Quotation);
      if (!r.ok) {
        setLastConfirm({
          variant: "error",
          title: "Could not save quotation",
          description: friendlyCommandErrorMessage(r.error, "Command failed"),
        });
        return;
      }
      setLastConfirm({ variant: "success", title: "Quotation saved", description: `${quotationNumber} has been saved as draft` });
    }

    setCurrentView("list");
    resetForm();
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast({ title: "Error", description: "Please enter template name", variant: "destructive" });
      return;
    }
    if (quotationTemplates.some(t => t.name.toLowerCase() === templateName.trim().toLowerCase())) {
      toast({ title: "Duplicate Name", description: "A template with this name already exists", variant: "destructive" });
      return;
    }
    addQuotationTemplate({
      id: generateId("QT"),
      name: templateName.trim(),
      segment: systemCategory as any,
      panelBrand,
      panelWattage: parseInt(panelWattage, 10) || undefined,
      inverterCapacity,
      structureType,
      materialItems: materials.map((m) => ({
        inventoryItemId: typeof m.id === "number" ? m.id : 0,
        name: m.itemName,
        quantity: m.quantity,
        unit: m.unit || "pcs",
      })),
      services: [],
      createdAt: new Date().toISOString(),
    });
    toast({ title: "Template Saved", description: `"${templateName}" has been saved to presets` });
    setIsSaveTemplateOpen(false);
    setTemplateName("");
  };

  const handleApplyQuotationBoilerplate = (templateId: string) => {
    const t = quotationTemplates.find((x) => x.id === templateId);
    if (!t) {
      toast({ title: "Template not found", variant: "destructive" });
      return;
    }
    setSystemCategory(t.segment);
    if (t.panelBrand) setPanelBrand(t.panelBrand);
    if (t.panelWattage != null) setPanelWattage(String(t.panelWattage));
    if (t.inverterCapacity) setInverterCapacity(t.inverterCapacity);
    if (t.structureType) setStructureType(t.structureType);
    if (t.materialItems.length > 0) {
      setMaterials(
        t.materialItems.map((item, idx) => ({
          id: Date.now() + idx,
          category: "Material",
          itemName: item.name,
          size: "",
          quantity: item.quantity,
          rate: 0,
          unit: item.unit,
        }))
      );
    } else {
      const cap = t.segment === "residential" ? "3" : t.segment === "commercial" ? "20" : "100";
      setSystemCapacity(cap);
      handlePresetChange(t.segment, cap);
    }
    toast({
      title: "Quotation template applied",
      description: `"${t.name}" — review material rates before sending.`,
    });
  };

  const handleExportPDF = async () => {
    if (!quotationRef.current) return;
    
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation_${quotationNumber}_${clientName.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Quotation has been saved as PDF"
      });
    } catch (_error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF",
        variant: "destructive"
      });
    }
    setIsExportingPdf(false);
  };

  const assertQuotationAmountForTransition = (
    quotationId: string,
    liveEffectivePrice?: number,
  ): string | null => {
    if (liveEffectivePrice != null) {
      return liveEffectivePrice > 0 ? null : QUOTATION_ZERO_AMOUNT_ERROR;
    }
    const q = savedQuotations.find((x) => x.id === quotationId);
    if (!q) return "Quotation not found";
    const check = validateQuotationSendOrApprove(q);
    return check.ok ? null : check.message;
  };

  const assertQuotationPaymentTypeForTransition = (
    quotationId: string,
    livePaymentType?: string,
  ): string | null => {
    if (livePaymentType !== undefined) {
      return isProjectPaymentType(livePaymentType) ? null : QUOTATION_PAYMENT_TYPE_REQUIRED_MESSAGE;
    }
    const q = savedQuotations.find((x) => x.id === quotationId);
    if (!q) return "Quotation not found";
    const check = validateQuotationPaymentTypeForSend(q);
    return check.ok ? null : check.message;
  };

  // Handle Share to Client
  const handleOpenShareModal = () => {
    if (blocksSendApproveActions) {
      toast({
        title: "Cannot share quotation",
        description: paymentTypeError || zeroAmountError || totalError || discountError,
        variant: "destructive",
      });
      return;
    }
    // Pre-fill with client details
    if (clientPhone) setShareContactValue(clientPhone);
    else if (clientEmail) setShareContactValue(clientEmail);
    setIsShareModalOpen(true);
  };

  const handleConfirmShare = async () => {
    const currentQuotation = savedQuotations.find(q => q.quotationNumber === quotationNumber);
    if (!currentQuotation && !editingQuotationId) {
      toast({ title: "Error", description: "Please save the quotation first", variant: "destructive" });
      return;
    }

    const shareEntry = {
      method: shareMethod,
      contactValue: shareMethod !== "visit" ? shareContactValue : undefined,
      sentAt: new Date().toISOString(),
      visitDate: shareMethod === "visit" ? shareVisitDate : undefined,
      visitTime: shareMethod === "visit" ? shareVisitTime : undefined,
      visitNotes: shareMethod === "visit" ? shareVisitNotes : undefined,
    };

    const quotationId = editingQuotationId || currentQuotation?.id;
    if (quotationId) {
      const amountError = assertQuotationAmountForTransition(quotationId, effectivePrice);
      if (amountError) {
        toast({ title: "Cannot share quotation", description: amountError, variant: "destructive" });
        return;
      }
      const paymentError = assertQuotationPaymentTypeForTransition(quotationId, paymentType);
      if (paymentError) {
        toast({ title: "Cannot share quotation", description: paymentError, variant: "destructive" });
        return;
      }
      if (isProjectPaymentType(paymentType)) {
        const sync = await updateQuotation(quotationId, {
          paymentType,
          ...persistedQuotationAmounts,
          finalAmount: persistedQuotationAmounts.clientAgreedAmount,
          temporaryAmount: persistedQuotationAmounts.clientAgreedAmount,
        });
        if (!sync.ok) {
          toast({
            title: "Cannot share quotation",
            description: friendlyCommandErrorMessage(
              sync.error,
              "Could not save payment type before sharing",
            ),
            variant: "destructive",
          });
          return;
        }
      }
      const result = await transitionQuotationStatus(quotationId, "sent");
      if (!result.ok) {
        toast({
          title: "Cannot Share Quotation",
          description: friendlyCommandErrorMessage(result.error, "Validation failed"),
          variant: "destructive",
        });
        return;
      }
      recordQuotationShare(quotationId, shareEntry);
      setStatus("sent");
    }

    const methodLabels = {
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      visit: "In-Person Visit",
    };

    toast({
      title: "Quotation Shared",
      description: `Quotation ${shareMethod === "visit" ? "marked as sent via" : "shared via"} ${methodLabels[shareMethod]}`,
    });

    // Reset share modal state
    setIsShareModalOpen(false);
    setShareMethod("whatsapp");
    setShareContactValue("");
    setShareVisitDate("");
    setShareVisitTime("");
    setShareVisitNotes("");
  };

  const handleMarkAsSent = async (quotationId: string) => {
    setLastConfirm(null);
    const amountError = assertQuotationAmountForTransition(
      quotationId,
      editingQuotationId === quotationId ? effectivePrice : undefined,
    );
    if (amountError) {
      toast({ title: "Cannot send quotation", description: amountError, variant: "destructive" });
      return;
    }
    const paymentError = assertQuotationPaymentTypeForTransition(
      quotationId,
      editingQuotationId === quotationId ? paymentType : undefined,
    );
    if (paymentError) {
      toast({ title: "Cannot send quotation", description: paymentError, variant: "destructive" });
      return;
    }
    if (editingQuotationId === quotationId && isProjectPaymentType(paymentType)) {
      const sync = await updateQuotation(quotationId, {
        paymentType,
        ...persistedQuotationAmounts,
        finalAmount: persistedQuotationAmounts.clientAgreedAmount,
        temporaryAmount: persistedQuotationAmounts.clientAgreedAmount,
      });
      if (!sync.ok) {
        toast({
          title: "Cannot send quotation",
          description: friendlyCommandErrorMessage(
            sync.error,
            "Could not save payment type before sending",
          ),
          variant: "destructive",
        });
        return;
      }
    }
    const result = await transitionQuotationStatus(quotationId, "sent");
    if (!result.ok) {
      toast({
        title: "Cannot send quotation",
        description: friendlyCommandErrorMessage(result.error, "Status change not allowed"),
        variant: "destructive",
      });
      return;
    }
    if (editingQuotationId === quotationId) {
      setStatus("sent");
    }
    toast({ title: "Quotation Sent", description: "Quotation has been marked as sent" });
  };

  const handleMarkAsRejected = async (quotationId: string) => {
    setLastConfirm(null);
    const result = await transitionQuotationStatus(quotationId, "rejected");
    if (!result.ok) {
      toast({
        title: "Invalid Transition",
        description: friendlyCommandErrorMessage(result.error, "Status change not allowed"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Status Updated", description: "Quotation marked as rejected" });
  };

  const resolveQuotationClientForApproval = (quotationId: string) => {
    if (editingQuotationId === quotationId) {
      return {
        clientName,
        clientPhone,
        clientEmail,
        clientAddress,
        clientCity,
        clientState,
        clientPincode,
        clientGstin,
        clientPan,
        clientType,
        paymentTermsSummary: buildPaymentTermsSummary({
          booking: bookingAmount,
          designApproval,
          beforeDispatch,
          postInstallation,
        }),
      };
    }
    const stored = savedQuotations.find((q) => q.id === quotationId);
    return stored ?? null;
  };

  const requestApproveQuotation = async (
    quotationId: string,
    options?: { closeViewSheetOnDone?: boolean },
  ) => {
    setLastConfirm(null);
    const amountError = assertQuotationAmountForTransition(
      quotationId,
      editingQuotationId === quotationId ? effectivePrice : undefined,
    );
    if (amountError) {
      toast({ title: "Cannot approve quotation", description: amountError, variant: "destructive" });
      return;
    }
    const paymentError = assertQuotationPaymentTypeForTransition(
      quotationId,
      editingQuotationId === quotationId ? paymentType : undefined,
    );
    if (paymentError) {
      toast({ title: "Cannot approve quotation", description: paymentError, variant: "destructive" });
      return;
    }
    if (editingQuotationId === quotationId && isProjectPaymentType(paymentType)) {
      const sync = await updateQuotation(quotationId, {
        paymentType,
        ...persistedQuotationAmounts,
        finalAmount: persistedQuotationAmounts.clientAgreedAmount,
        temporaryAmount: persistedQuotationAmounts.clientAgreedAmount,
      });
      if (!sync.ok) {
        toast({
          title: "Cannot approve quotation",
          description: friendlyCommandErrorMessage(
            sync.error,
            "Could not save payment type before approval",
          ),
          variant: "destructive",
        });
        return;
      }
    }
    const clientSource = resolveQuotationClientForApproval(quotationId);
    if (!clientSource) {
      toast({ title: "Cannot approve quotation", description: "Quotation not found", variant: "destructive" });
      return;
    }
    const stored = savedQuotations.find((q) => q.id === quotationId);
    const linkedCustomerId =
      editingQuotationId === quotationId ? customerId ?? stored?.customerId : stored?.customerId;
    const previewResult = buildQuotationApprovalCustomerPreview(
      { ...clientSource, customerId: linkedCustomerId ?? undefined },
      {
        existingCustomer: linkedCustomerId
          ? _customers.find((c) => c.id === linkedCustomerId)
          : undefined,
        existingCustomerIds: _customers.map((c) => c.id),
      },
    );
    if (!previewResult.ok) {
      toast({ title: "Cannot approve quotation", description: previewResult.message, variant: "destructive" });
      return;
    }
    setApproveConfirm({
      quotationId,
      quotationNumber: stored?.quotationNumber ?? quotationNumber,
      preview: previewResult.preview,
      closeViewSheetOnDone: options?.closeViewSheetOnDone ?? false,
    });
  };

  const renderLastConfirmBanner = () =>
    lastConfirm ? (
      <InlineConfirmBanner
        variant={lastConfirm.variant}
        title={lastConfirm.title}
        description={lastConfirm.description}
        actionLabel={
          lastConfirm.customerId
            ? "View customer"
            : lastConfirm.projectCreateQuotationId
              ? "Create project now"
              : undefined
        }
        onAction={
          lastConfirm.customerId
            ? () => navigate(`/customers/${lastConfirm.customerId}`)
            : lastConfirm.projectCreateQuotationId
              ? () => navigate(`/projects?createFrom=quo:${lastConfirm.projectCreateQuotationId}`)
              : undefined
        }
        onDismiss={() => setLastConfirm(null)}
      />
    ) : null;

  const handleMarkAsApproved = async (
    quotationId: string,
    approvalPreview?: QuotationApprovalCustomerPreview,
  ) => {
    const amountError = assertQuotationAmountForTransition(
      quotationId,
      editingQuotationId === quotationId ? effectivePrice : undefined,
    );
    if (amountError) {
      toast({ title: "Cannot approve quotation", description: amountError, variant: "destructive" });
      return;
    }
    const paymentError = assertQuotationPaymentTypeForTransition(
      quotationId,
      editingQuotationId === quotationId ? paymentType : undefined,
    );
    if (paymentError) {
      toast({ title: "Cannot approve quotation", description: paymentError, variant: "destructive" });
      return;
    }
    if (editingQuotationId === quotationId && isProjectPaymentType(paymentType)) {
      const sync = await updateQuotation(quotationId, {
        paymentType,
        ...persistedQuotationAmounts,
        finalAmount: persistedQuotationAmounts.clientAgreedAmount,
        temporaryAmount: persistedQuotationAmounts.clientAgreedAmount,
      });
      if (!sync.ok) {
        toast({
          title: "Cannot approve quotation",
          description: friendlyCommandErrorMessage(
            sync.error,
            "Could not save payment type before approval",
          ),
          variant: "destructive",
        });
        return;
      }
    }
    const result = await transitionQuotationStatus(quotationId, "approved");
    if (!result.ok) {
      toast({
        title: "Cannot approve quotation",
        description: friendlyCommandErrorMessage(result.error, "Status change not allowed"),
        variant: "destructive",
      });
      return;
    }
    if (editingQuotationId === quotationId) {
      setStatus("approved");
    }
    const quotation = savedQuotations.find((q) => q.id === quotationId);
    const feedback = buildQuotationApprovalSuccessFeedback(approvalPreview, {
      quotationNumber: quotation?.quotationNumber,
    });
    const canCreateProject =
      quotation && !quotationLinkedProjectId(quotation);
    setLastConfirm({
      ...feedback,
      customerId: approvalPreview?.customerId,
      projectCreateQuotationId: canCreateProject ? quotationId : undefined,
    });
    if (canCreateProject) {
      const customer = quotation.customerId
        ? _customers.find((c) => c.id === quotation.customerId)
        : undefined;
      const draft = buildQuotationToProjectDraft(quotation, customer);
      saveCreateDraft("project-create-draft", draft);
      toast({
        title: feedback.title,
        description: "Create a project when you are ready — use the banner or the button below.",
        action: (
          <ToastAction
            altText="Create project now"
            onClick={() => navigate(`/projects?createFrom=quo:${quotationId}`)}
          >
            Create project now
          </ToastAction>
        ),
      });
      return;
    }
    if (!approvalPreview) {
      toast({ title: feedback.title, description: feedback.description });
    }
  };

  const confirmApproveQuotation = async () => {
    if (!approveConfirm) return;
    const { quotationId, closeViewSheetOnDone, preview } = approveConfirm;
    setApproveConfirm(null);
    await handleMarkAsApproved(quotationId, preview);
    if (closeViewSheetOnDone) {
      setIsViewQuotationOpen(false);
    }
  };

  const renderApproveCustomerDialog = () =>
    approveConfirm ? (
      <QuotationApproveCustomerDialog
        open
        onOpenChange={(open) => {
          if (!open) setApproveConfirm(null);
        }}
        quotationNumber={approveConfirm.quotationNumber}
        preview={approveConfirm.preview}
        onConfirm={() => {
          void confirmApproveQuotation();
        }}
      />
    ) : null;

  const handleDeleteQuotation = (quotation: Quotation) => {
    const gate = canDeleteQuotationRecord(quotation, quotationDeleteContext);
    if (!gate.ok) {
      toast({
        title: "Cannot delete quotation",
        description: gate.message,
        variant: "destructive",
      });
      return;
    }
    setQuotationToDelete(quotation);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteQuotation = () => {
    if (!quotationToDelete) return;

    const result = deleteQuotation(quotationToDelete.id);
    if (!result.ok) {
      toast({
        title: "Cannot delete quotation",
        description: result.error ?? "Deletion was blocked.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Quotation deleted",
      description: `${quotationToDelete.quotationNumber} was permanently removed.`,
    });

    setIsDeleteConfirmOpen(false);
    setQuotationToDelete(null);
    if (selectedQuotation?.id === quotationToDelete.id) {
      setSelectedQuotation(null);
      setIsViewQuotationOpen(false);
    }
  };

  // Create Project from Quotation
  const handleCreateProject = (quotation: Quotation) => {
    setSelectedQuotationForProject(quotation);
    setProjectContractAmount(resolveContractAmount(quotation));
    setProjectPaymentType("cash");
    setProjectBankDocAmount(resolveContractAmount(quotation));
    setCreateProjectStep("form");
    setPendingCreateProject(null);
    setIsCreateProjectOpen(true);
  };

  const resetCreateProjectSheet = () => {
    setCreateProjectStep("form");
    setPendingCreateProject(null);
    setIsCreateProjectOpen(false);
  };

  const prepareCreateProject = async () => {
    if (!selectedQuotationForProject) return;
    if (selectedQuotationForProject.status !== "approved") {
      toast({
        title: "Approved Quotation Required",
        description: "Projects can only be created from approved quotations.",
        variant: "destructive",
      });
      return;
    }

    const projectKind = quotationProjectKind;

    if ((projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK") && !qPartnerIdForProject) {
      toast({
        title: "Partner required",
        description: "Select the one partner linked to this project.",
        variant: "destructive",
      });
      return;
    }
    if (projectKind === "FIXED_EPC" && (!qFixedBackend || !qFixedSell)) {
      toast({
        title: "Fixed EPC numbers required",
        description: "Enter MSS backend and partner sell amounts.",
        variant: "destructive",
      });
      return;
    }
    if (projectKind === "VENDOR_NETWORK" && !qVendorshipFee) {
      toast({
        title: "Vendorship fee required",
        description: "Enter the fixed fee payable by the partner.",
        variant: "destructive",
      });
      return;
    }

    const amount =
      projectContractAmount || resolveContractAmount(selectedQuotationForProject);
    const pPaymentType = projectPaymentType;

    const pRow = qPartnerIdForProject ? partners.find((p) => p.id === qPartnerIdForProject) : undefined;

    const liveQuotation =
      savedQuotations.find((q) => q.id === selectedQuotationForProject.id) ?? selectedQuotationForProject;
    const effectiveCustomerId =
      liveQuotation.customerId ?? selectedQuotationForProject.customerId;
    if (!effectiveCustomerId) {
      toast({
        title: "Customer required",
        description: "Link this quotation to a customer before creating a project.",
        variant: "destructive",
      });
      return;
    }

    const intakePayload: ProjectIntakePayload = {
      kind: projectKind,
      parties: {
        customer: selectedQuotationForProject.clientName || "Unknown Customer",
        vendorOrDiscom: projectKind === "SOLO_EPC" ? undefined : undefined,
        partner: projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK" ? pRow?.name || qPartnerIdForProject : undefined,
        channelPartner: projectKind === "VENDOR_NETWORK" ? pRow?.name || qChannel || qPartnerIdForProject : undefined,
        externalNetwork: projectKind === "VENDOR_NETWORK" ? qExternal || pRow?.name || qPartnerIdForProject : undefined,
      },
      commercial: {
        contractAmount: amount,
        paymentType: pPaymentType,
        internalCostEstimate: projectKind === "SOLO_EPC" || projectKind === "PARTNER_EPC" ? 0 : 0,
        backendPrice: projectKind === "FIXED_EPC" ? parseFloat(qFixedBackend) : undefined,
        partnerSellPrice: projectKind === "FIXED_EPC" ? parseFloat(qFixedSell) : undefined,
        commissionRule: projectKind === "VENDOR_NETWORK" ? "default_commission_rule" : undefined,
      },
    };

    const intakeValidation = projectKindService.validateIntake(intakePayload);
    if (!intakeValidation.ok) {
      toast({
        title: "Project Intake Incomplete",
        description: intakeValidation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const snap = projectKindConfigSnapshot(projectKind);
    const newProjectId = generateId("P");
    const newProject: Project = {
      id: newProjectId,
      customerId: effectiveCustomerId,
      lifecycleStatus: "New",
      executionPhase: "Intake",
      progressStage: "new",
      projectKind,
      projectKindConfigSnapshot: snap,
      name: `${selectedQuotationForProject.clientName} ${formatCapacityKW(selectedQuotationForProject.systemCapacity)}`,
      type: projectKind === "INC" ? "INC" : "EPC",
      projectType:
        selectedQuotationForProject.systemCategory === "residential"
          ? "Residential"
          : selectedQuotationForProject.systemCategory === "commercial"
            ? "Commercial"
            : "Industrial",
      projectCategory: "solar",
      ownerType:
        projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK"
          ? "partnership"
          : "solo",
      client: selectedQuotationForProject.clientName,
      clientAddress: selectedQuotationForProject.clientAddress || `${selectedQuotationForProject.clientCity}, ${selectedQuotationForProject.clientState}`,
      clientPhone: selectedQuotationForProject.clientPhone,
      clientEmail: selectedQuotationForProject.clientEmail,
      capacity: formatCapacityKW(selectedQuotationForProject.systemCapacity),
      location: `${selectedQuotationForProject.clientCity}, ${selectedQuotationForProject.clientState}`,
      onSite: 0,
      assignees: [],
      contractAmount: amount,
      totalCost: 0,
      amountReceived: 0,
      paymentType: pPaymentType,
      bankDocumentationAmount:
        pPaymentType === "loan" ? projectBankDocAmount : undefined,
      quotationId: selectedQuotationForProject.id,
      quotationType: projectAmountType,
      photos: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString().split("T")[0],
      ...(pRow && (projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK")
        ? {
            partners: [
              {
                partnerId: pRow.id,
                partnerName: pRow.name,
                partnerType:
                  projectKind === "FIXED_EPC"
                    ? ("fixed" as const)
                    : projectKind === "VENDOR_NETWORK"
                      ? ("vendorship" as const)
                      : ("profit" as const),
                sharePercentage: projectKind === "PARTNER_EPC" ? parseFloat(qProfitSharePercent || "0") : undefined,
                fixedAmount:
                  projectKind === "FIXED_EPC"
                    ? Math.max(0, (parseFloat(qFixedSell) || amount) - (parseFloat(qFixedBackend) || 0))
                    : undefined,
                feeAmount: projectKind === "VENDOR_NETWORK" ? parseFloat(qVendorshipFee || "0") : undefined,
                calculatedEarning:
                  projectKind === "FIXED_EPC"
                    ? Math.max(0, (parseFloat(qFixedSell) || amount) - (parseFloat(qFixedBackend) || 0))
                    : projectKind === "VENDOR_NETWORK"
                      ? 0
                      : undefined,
                settlementDirection: projectKind === "VENDOR_NETWORK" ? "partner_pays_company" : "company_pays_partner",
                profitSharePercent: projectKind === "PARTNER_EPC" ? parseFloat(qProfitSharePercent || "0") : 0,
              },
            ],
            totalPartnerInvestment: 0,
            partnershipModel: projectKind === "FIXED_EPC" ? ("fixed_backend" as const) : undefined,
            mssBackendAmount: projectKind === "FIXED_EPC" ? parseFloat(qFixedBackend) : undefined,
            partnerCustomerSellAmount: projectKind === "FIXED_EPC" ? parseFloat(qFixedSell) : undefined,
          }
        : {}),
      ...(projectKind === "VENDOR_NETWORK"
        ? {
            partyName: pRow?.name || qChannel,
            partyContact: "",
            contractValue: amount,
            amountToParty: 0,
            partyPayments: [],
            channelPartnerIdRef: pRow?.id,
            vendorNetworkCommissionType: "flat" as const,
            vendorNetworkFlatFee: parseFloat(qVendorshipFee || "0"),
          }
        : {}),
    };

    setPendingCreateProject(newProject);
    setCreateProjectStep("confirm");
  };

  const finalizeCreateProject = async (team: ProjectTeamAssignmentDraft) => {
    if (!pendingCreateProject || !selectedQuotationForProject) return;
    if (team.targetEndDate && team.targetEndDate < pendingCreateProject.startDate) {
      toast({
        title: "Invalid end date",
        description: "Target end date cannot be before the project start date.",
        variant: "destructive",
      });
      return;
    }
    const project = applyTeamAssignmentToProject(pendingCreateProject, team);
    const created = await createProjectFromConfirmedQuotation(project);
    if (!created.ok) {
      toast({
        title: "Project creation failed",
        description: friendlyCommandErrorMessage(created.error, "Command failed"),
        variant: "destructive",
      });
      return;
    }
    const navigateId = created.projectId ?? project.id;

    setLastConfirm(null);
    toast({
      title: "Project Created",
      description: `Project "${project.name}" has been created from quotation${selectedQuotationForProject.paymentType ? ` (${selectedQuotationForProject.paymentType === "loan" ? "Loan" : "Cash"} file)` : ""}`,
    });
    resetCreateProjectSheet();
    setSelectedQuotationForProject(null);
    setQuotationProjectKind("SOLO_EPC");
    setQPartnerIdForProject("");
    setQProfitSharePercent("30");
    setQVendorshipFee("");
    setQFixedBackend("");
    setQFixedSell("");
    setQChannel("");
    setQExternal("");
    navigate(`/projects/${navigateId}`);
  };

  const handleEditQuotation = async (quotation: Quotation) => {
    if (isQuotationFormLocked(quotation.status)) {
      const lockedHint =
        quotation.status === "withdrawn" || quotation.status === "rejected"
          ? "This quotation is terminal. Open it from the list to preview, or clone it to start a new draft."
          : "Approved or converted quotations are locked for data integrity. Clone to start a new draft.";
      toast({
        title: "Quotation locked",
        description: lockedHint,
        variant: "destructive",
      });
      return;
    }

    setEditingQuotationId(quotation.id);
    setQuotationNumber(quotation.quotationNumber);
    setClientName(quotation.clientName);
    setClientPhone(quotation.clientPhone);
    setClientEmail(quotation.clientEmail);
    setClientCity(quotation.clientCity);
    setClientState(quotation.clientState);
    setClientAddress(quotation.clientAddress ?? "");
    setClientPincode(quotation.clientPincode ?? "");
    setClientGstin(quotation.clientGstin ?? "");
    setClientPan(quotation.clientPan ?? "");
    setClientType(quotation.clientType ?? "individual");
    setCustomerId(quotation.customerId ?? null);
    setEnquiryId(quotation.enquiryId ?? null);
    setWithoutEnquiryReason(quotation.withoutEnquiryReason ?? null);
    setCreateSourceResolved(true);
    setSystemCategory(quotation.systemCategory);
    setSystemCapacity(quotation.systemCapacity);
    setStatus(quotation.status);
    setPaymentType(isProjectPaymentType(quotation.paymentType) ? quotation.paymentType : "");
    setProjectPaymentType(isProjectPaymentType(quotation.paymentType) ? quotation.paymentType : "cash");
    setClientAgreedAmountOverride(
      hasDistinctClientAgreedAmount(quotation)
        ? String(quotation.clientAgreedAmount ?? "")
        : "",
    );
    handlePresetChange(quotation.systemCategory, quotation.systemCapacity);
    setCurrentView("edit");
    setActiveTab("create");
  };

  const _handleCreateNew = () => {
    beginNewQuotationCreate();
  };

  const handleConfirmCreateFromEnquiry = (enquiry: (typeof enquiries)[number]) => {
    const built = buildEnquiryToQuotationDraft(enquiry);
    saveCreateDraft("quotation-create-draft", built);
    applyEnquiryQuotationDraft(built);
    setWithoutEnquiryReason(null);
    setCreateSourceResolved(true);
  };

  const handleConfirmCreateException = (reason: string) => {
    setEnquiryId(null);
    setWithoutEnquiryReason(reason);
    setCreateSourceResolved(true);
  };

  const getStatusColor = quotationStatusBadgeClass;
  const formatQuotationStatus = formatQuotationStatusLabel;

  // List View
  if (currentView === "list") {
    return (
      <div className="space-y-6 min-h-[calc(100vh-140px)]">
        <StickyPageHeader
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "Pipeline" },
            { label: "Quotations" },
          ]}
          subRow={
            <>
              <div className="flex min-w-0 w-full flex-1 flex-wrap items-end gap-2 sm:max-w-none">
                <Input
                  placeholder="Reference, customer, or phone"
                  className="h-9 max-w-full bg-muted/40 sm:max-w-[220px] md:max-w-xs"
                  value={listSearchQuery}
                  onChange={(e) => {
                    setListSearchQuery(e.target.value);
                    setListPage(1);
                  }}
                />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as typeof statusFilter);
                    setListPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[min(100%,160px)]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    <SelectItem value="converted_to_project">Converted to project</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 shrink-0" type="button">
                      <Columns2 className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel>List columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(
                      [
                        ["number", "Quotation #"],
                        ["client", "Client"],
                        ["phone", "Phone"],
                        ["system", "System"],
                        ["amount", "Amount"],
                        ["date", "Date"],
                        ["status", "Status"],
                      ] as const
                    ).map(([key, label]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={quoteListColVis[key]}
                        onCheckedChange={(c) => setQuoteListCol(key, c === true)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <InlineKpiStrip
                className="w-full sm:w-auto sm:justify-end"
                items={[
                  {
                    label: "Total",
                    value: listStatusCounts.total,
                    active: statusFilter === "all",
                    onClick: () => {
                      setStatusFilter("all");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Draft",
                    value: listStatusCounts.draft,
                    active: statusFilter === "draft",
                    onClick: () => {
                      setStatusFilter("draft");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Sent",
                    value: listStatusCounts.sent,
                    active: statusFilter === "sent",
                    onClick: () => {
                      setStatusFilter("sent");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Approved",
                    value: listStatusCounts.approved,
                    active: statusFilter === "approved",
                    onClick: () => {
                      setStatusFilter("approved");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Rejected",
                    value: listStatusCounts.rejected,
                    active: statusFilter === "rejected",
                    onClick: () => {
                      setStatusFilter("rejected");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Converted",
                    value: listStatusCounts.converted,
                    active: statusFilter === "converted",
                    onClick: () => {
                      setStatusFilter("converted");
                      setListPage(1);
                    },
                  },
                ]}
              />
            </>
          }
        >
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={beginNewQuotationCreate}
            disabled={!canCreateQuotation}
          >
            <Plus className="w-4 h-4 mr-2" />
            New quotation
          </Button>
        </StickyPageHeader>

        {renderLastConfirmBanner()}

        <DataTableShell
          maxHeight={listTableViewportMaxHeight(listPageSize)}
          scrollResetKey={`${safeListPage}-${listPageSize}-${displayedQuotations.length}`}
          footer={
            <TablePaginationBar
              page={safeListPage}
              pageSize={listPageSize}
              total={displayedQuotations.length}
              onPageChange={setListPage}
              onPageSizeChange={(n) => {
                setListPageSize(n);
                setListPage(1);
              }}
            />
          }
        >
          <TableHeader>
            <TableRow className={dataTableClasses.headRow}>
              {quoteListColVis.number && <TableHead>Quotation #</TableHead>}
              {quoteListColVis.client && <TableHead>Client</TableHead>}
              {quoteListColVis.phone && <TableHead>Phone</TableHead>}
              {quoteListColVis.system && <TableHead>System</TableHead>}
              {quoteListColVis.amount && <TableHead>Amount</TableHead>}
              {quoteListColVis.date && <TableHead>Date</TableHead>}
              {quoteListColVis.status && <TableHead>Status</TableHead>}
              <TableHead className="text-right w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!shellReady ? (
              Array.from({ length: Math.min(listPageSize, 5) }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: quoteListColSpan }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : pagedQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={quoteListColSpan} className="py-0">
                  <ListEmptyState
                    icon={FileText}
                    title="No quotations found"
                    description={
                      displayedQuotations.length === 0 && listSearchQuery
                        ? `No quotations match "${listSearchQuery}". Clear the search or change filters to see all rows.`
                        : "Create a quotation to start tracking proposals for customers."
                    }
                    actionLabel={canCreateQuotation ? "New quotation" : undefined}
                    onAction={canCreateQuotation ? beginNewQuotationCreate : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pagedQuotations.map((quotation) => (
              <TableRow
                key={quotation.id}
                className="cursor-pointer hover:bg-muted/50 group"
                onClick={() => {
                  setSelectedQuotation(quotation);
                  setIsViewQuotationOpen(true);
                }}
              >
                {quoteListColVis.number && (
                <TableCell className="font-medium text-primary">
                  <div className="flex items-center gap-2">
                    <span>{quotation.quotationNumber}</span>
                    <AgingChip signal={getQuotationNoResponseAging(quotation)} />
                  </div>
                </TableCell>
                )}
                {quoteListColVis.client && (
                <TableCell>
                  <EntityLink 
                    entityType="customer" 
                    entityId={quotation.customerId || ""} 
                    name={quotation.clientName} 
                  />
                </TableCell>
                )}
                {quoteListColVis.phone && (
                <TableCell className="text-muted-foreground">{quotation.clientPhone}</TableCell>
                )}
                {quoteListColVis.system && (
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {quotation.systemCategory} {formatCapacityKW(quotation.systemCapacity)}
                  </Badge>
                </TableCell>
                )}
                {quoteListColVis.amount && (
                <TableCell className="font-medium text-primary">
                  <span className="tabular-nums">{formatINR(resolveContractAmount(quotation))}</span>
                  {hasDistinctClientAgreedAmount(quotation) ? (
                    <span className="block text-2xs font-normal text-muted-foreground tabular-nums">
                      Quoted {formatINR(quotation.totalAmount)}
                    </span>
                  ) : null}
                </TableCell>
                )}
                {quoteListColVis.date && (
                <TableCell className="text-muted-foreground">{quotation.createdAt}</TableCell>
                )}
                {quoteListColVis.status && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(quotation.status)} border-0`}>
                      {formatQuotationStatus(quotation.status)}
                    </Badge>
                    {quotationLinkedProjectId(quotation) && (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        Project
                      </Badge>
                    )}
                  </div>
                </TableCell>
                )}
                <TableCell className="text-right">
                  <ChevronDown className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </DataTableShell>

        <Sheet open={isViewQuotationOpen} onOpenChange={setIsViewQuotationOpen}>
          <AppSheetContent layout="scroll" size="xl">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {selectedQuotation?.quotationNumber}
                  {selectedQuotation && (
                    <Badge className={`${getStatusColor(selectedQuotation.status)} border-0`}>
                      {formatQuotationStatus(selectedQuotation.status)}
                    </Badge>
                  )}
                </div>
                {canEditQuotation &&
                  selectedQuotation &&
                  !isQuotationConverted(selectedQuotation) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-primary/5"
                  onClick={() => {
                    if (selectedQuotation) {
                      setIsViewQuotationOpen(false);
                      handleEditQuotation(selectedQuotation);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                )}
              </SheetTitle>
            </SheetHeader>

            {selectedQuotation && (selectedQuotation.status === "withdrawn" || selectedQuotation.status === "rejected") && (
              <div className="mt-4">
                <LifecycleTerminalBanner
                  variant={selectedQuotation.status === "withdrawn" ? "withdrawn" : "rejected"}
                  title={`Quotation ${selectedQuotation.status}`}
                  description={
                    selectedQuotation.status === "withdrawn"
                      ? `${lifecycleTermSummary("quotationWithdraw")} It cannot be revised — clone it to start a new draft for re-quoting.`
                      : `${lifecycleTermSummary("quotationReject")} Clone it to revise pricing and re-quote.`
                  }
                  primaryActionLabel="Clone & re-quote"
                  onPrimaryAction={() => handleCloneQuotation(selectedQuotation)}
                />
              </div>
            )}

            {selectedQuotation && isQuotationConverted(selectedQuotation) && (
              <div className="mt-4">
                <LifecycleTerminalBanner
                  variant="completed"
                  title="Converted to project — one-shot"
                  description={
                    <>
                      <p>{QUOTATION_ONE_SHOT_CONVERSION_HELP}</p>
                      <p className="mt-1">{PROJECT_SCOPE_CHANGE_GUIDANCE}</p>
                    </>
                  }
                  primaryActionLabel="View project"
                  onPrimaryAction={() => {
                    const pid = quotationLinkedProjectId(selectedQuotation);
                    if (pid) navigate(`/projects/${pid}`);
                  }}
                  secondaryActionLabel="Clone for new quote"
                  onSecondaryAction={() => handleCloneQuotation(selectedQuotation)}
                />
              </div>
            )}

            {selectedQuotation && (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-6 pt-6">
                  {/* Header Info Card */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-semibold">
                          {selectedQuotation.clientName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">{selectedQuotation.clientName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-2xs uppercase tracking-wider h-5">
                            {selectedQuotation.systemCategory}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created {selectedQuotation.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>
                    <QuotationCommercialAmountDisplay quotation={selectedQuotation} className="text-right" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Client Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 group">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xs text-muted-foreground uppercase tracking-wider">Phone</p>
                          <p className="text-sm font-medium">{selectedQuotation.clientPhone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 group">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xs text-muted-foreground uppercase tracking-wider">Email</p>
                          <p className="text-sm font-medium">{selectedQuotation.clientEmail || "—"}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 group">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-2xs text-muted-foreground uppercase tracking-wider">Address</p>
                          <p className="text-sm font-medium leading-snug">
                            {selectedQuotation.clientAddress || `${selectedQuotation.clientCity}, ${selectedQuotation.clientState}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Operational Details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-warning/5 text-warning">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-2xs text-muted-foreground uppercase tracking-wider">System Capacity</p>
                          <p className="text-sm font-semibold">{formatCapacityKW(selectedQuotation.systemCapacity)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-2xs text-muted-foreground uppercase tracking-wider">Payment Type</p>
                          <p className="text-sm font-semibold capitalize">{selectedQuotation.paymentType || "TBD"}</p>
                        </div>
                      </div>

                      {selectedQuotation.agentId && (
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-accent/5 text-accent-foreground">
                            <UserCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-2xs text-muted-foreground uppercase tracking-wider">Referred By</p>
                            <p className="text-sm font-medium">
                              {agents.find(a => a.id === selectedQuotation.agentId)?.name || "Agent"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Material Overview */}
                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      Material Overview
                    </h4>
                    <div className="rounded-lg border bg-background overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-2xs uppercase font-bold py-2">Item</TableHead>
                            <TableHead className="text-right text-2xs uppercase font-bold py-2">Qty</TableHead>
                            <TableHead className="text-right text-2xs uppercase font-bold py-2">Rate</TableHead>
                            <TableHead className="text-right text-2xs uppercase font-bold py-2">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const items: Array<{ name: string; qty: number; unit?: string; rate: number; amount: number }> = [];
                            (selectedQuotation.presetSnapshot ?? []).forEach((m) => {
                              const qty = m.quantity || 0;
                              const rate = m.rate || 0;
                              items.push({
                                name: [m.itemName, m.size, m.description].filter(Boolean).join(" — "),
                                qty,
                                unit: m.unit,
                                rate,
                                amount: qty * rate,
                              });
                            });
                            (selectedQuotation.customItems ?? []).forEach((c) => {
                              items.push({
                                name: c.title + (c.description ? ` — ${c.description}` : ""),
                                qty: c.quantity,
                                unit: c.unit,
                                rate: c.rate,
                                amount: c.amount,
                              });
                            });
                            if (items.length === 0) {
                              return (
                                <TableEmptyRow
                                  colSpan={4}
                                  icon={FileText}
                                  title="No line items yet"
                                  description="Commercial line items appear after capture on this quotation."
                                />
                              );
                            }
                            const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
                            return (
                              <>
                                {items.map((i, idx) => (
                                  <TableRow key={idx} className="hover:bg-transparent">
                                    <TableCell className="text-xs py-2">{i.name}</TableCell>
                                    <TableCell className="text-right text-xs py-2 tabular-nums">{i.qty}{i.unit ? ` ${i.unit}` : ""}</TableCell>
                                    <TableCell className="text-right text-xs py-2 tabular-nums">{formatINR(i.rate)}</TableCell>
                                    <TableCell className="text-right text-xs py-2 tabular-nums">{formatINR(i.amount)}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="hover:bg-transparent border-t bg-muted/20">
                                  <TableCell colSpan={3} className="text-xs py-2 font-semibold text-right">Subtotal</TableCell>
                                  <TableCell className="text-right text-xs py-2 font-semibold tabular-nums">{formatINR(subtotal)}</TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-transparent">
                                  <TableCell colSpan={3} className="text-xs py-2 font-semibold text-right">Total (incl. taxes)</TableCell>
                                  <TableCell className="text-right text-xs py-2 font-semibold tabular-nums">{formatINR(selectedQuotation.totalAmount)}</TableCell>
                                </TableRow>
                              </>
                            );
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Status History — derived from real transition timestamps */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Status History
                    </h4>
                    <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                      {(() => {
                        const events: Array<{ label: string; description: string; at: string; tone: string }> = [];
                        events.push({ label: "Created (Draft)", description: "Quotation draft generated in system.", at: selectedQuotation.createdAt, tone: "primary" });
                        if (selectedQuotation.sentAt) {
                          events.push({ label: "Sent to customer", description: "Quotation shared with the customer for review.", at: selectedQuotation.sentAt, tone: "blue" });
                        }
                        if (selectedQuotation.approvedAt) {
                          events.push({ label: "Approved", description: "Customer accepted the quotation.", at: selectedQuotation.approvedAt, tone: "teal" });
                        }
                        if (selectedQuotation.rejectedAt) {
                          events.push({ label: "Rejected", description: selectedQuotation.rejectionReason || "Quotation rejected.", at: selectedQuotation.rejectedAt, tone: "destructive" });
                        }
                        if (selectedQuotation.withdrawnAt) {
                          events.push({
                            label: "Withdrawn",
                            description: selectedQuotation.withdrawnReason || "Quotation withdrawn by seller.",
                            at: selectedQuotation.withdrawnAt,
                            tone: "muted",
                          });
                        }
                        if (selectedQuotation.convertedAt || quotationLinkedProjectId(selectedQuotation)) {
                          const pid = quotationLinkedProjectId(selectedQuotation) || "";
                          events.push({
                            label: "Converted to project",
                            description: pid ? `Project ${pid} was created from this quotation.` : "Quotation converted to project.",
                            at: selectedQuotation.convertedAt || selectedQuotation.confirmedAt || selectedQuotation.approvedAt || selectedQuotation.createdAt,
                            tone: "green",
                          });
                        }
                        events.sort((a, b) => (a.at || "").localeCompare(b.at || ""));
                        const toneClass: Record<string, string> = {
                          primary: "border-primary/20 text-primary/80",
                          blue: "border-primary/20 text-primary",
                          teal: "border-primary/20 text-primary",
                          green: "border-success/20 text-success",
                          destructive: "border-destructive/20 text-destructive",
                          muted: "border-muted/40 text-muted-foreground",
                        };
                        return events.map((e, idx) => (
                          <div key={idx} className="relative pl-8 group">
                            <div className={`absolute left-0 top-[6px] h-3 w-3 rounded-full border-2 bg-background z-10 ${toneClass[e.tone] || "border-muted"}`} />
                            <div className="p-3 bg-muted/20 rounded-lg border border-border/40">
                              <div className="flex items-start justify-between mb-1">
                                <p className={`text-xs font-medium ${toneClass[e.tone]?.split(" ").find(c => c.startsWith("text-")) || "text-foreground"}`}>{e.label}</p>
                                <time className="text-2xs text-muted-foreground">{e.at}</time>
                              </div>
                              <p className="text-sm">{e.description}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="pt-6 mt-6 border-t bg-background/80 backdrop-blur-sm sticky bottom-0 z-20">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsViewQuotationOpen(false);
                          setSelectedQuotation(selectedQuotation);
                          setEditingQuotationId(selectedQuotation.id);
                          setQuotationNumber(selectedQuotation.quotationNumber);
                          setClientName(selectedQuotation.clientName);
                          setClientPhone(selectedQuotation.clientPhone);
                          setClientEmail(selectedQuotation.clientEmail || "");
                          setClientCity(selectedQuotation.clientCity);
                          setClientState(selectedQuotation.clientState);
                          setSystemCategory(selectedQuotation.systemCategory);
                          setSystemCapacity(selectedQuotation.systemCapacity);
                          setStatus(selectedQuotation.status);
                          setCurrentView("edit");
                          setActiveTab("preview");
                        }}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Preview / Print
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setIsViewQuotationOpen(false); handleOpenShareModal(); }}
                        disabled={
                          selectedQuotation.status === "rejected" ||
                          !hasPositiveQuotationAmount(selectedQuotation)
                        }
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloneQuotation(selectedQuotation)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Clone
                      </Button>
                      {(selectedQuotation.status === "draft" ||
                        selectedQuotation.status === "sent" ||
                        selectedQuotation.status === "rejected") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { void handleReviseQuotation(selectedQuotation); }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Revise
                        </Button>
                      )}
                      {selectedQuotation.status !== "withdrawn" &&
                        selectedQuotation.status !== "converted_to_project" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => { setWithdrawReason(""); setWithdrawDialogQuotation(selectedQuotation); }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            <span className="inline-flex items-center gap-1">
                              Withdraw
                              <LifecycleTermHint term="quotationWithdraw" side="bottom" />
                            </span>
                          </Button>
                        )}
                      {canDeleteQuotation &&
                        canDeleteQuotationRecord(selectedQuotation, quotationDeleteContext).ok && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteQuotation(selectedQuotation)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Send Quotation — draft only */}
                      {selectedQuotation.status === "draft" && (
                        <PermissionGatedButton
                          allowed={canEditQuotation}
                          deniedHint={PERMISSION_DENIED_HINTS.quotationSend}
                          variant="outline"
                          size="sm"
                          className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                          disabled={!hasPositiveQuotationAmount(selectedQuotation)}
                          onClick={() => { void handleMarkAsSent(selectedQuotation.id); setIsViewQuotationOpen(false); }}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Quotation
                        </PermissionGatedButton>
                      )}

                      {/* Reject — draft, sent, or approved (state machine allows) */}
                      {(selectedQuotation.status === "draft" ||
                        selectedQuotation.status === "sent" ||
                        selectedQuotation.status === "approved") && (
                        <PermissionGatedButton
                          allowed={canEditQuotation}
                          deniedHint={PERMISSION_DENIED_HINTS.quotationReject}
                          variant="destructive"
                          size="sm"
                          onClick={() => { handleMarkAsRejected(selectedQuotation.id); setIsViewQuotationOpen(false); }}
                          className="bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                        >
                          <span className="inline-flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Reject
                            <LifecycleTermHint term="quotationReject" side="bottom" />
                          </span>
                        </PermissionGatedButton>
                      )}

                      {/* Approve — sent only (disabled + tooltip when role cannot approve) */}
                      {selectedQuotation.status === "sent" && (
                        <PermissionGatedButton
                          allowed={canApproveQuotation}
                          deniedHint={PERMISSION_DENIED_HINTS.quotationApprove}
                          variant="outline"
                          size="sm"
                          className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                          disabled={!hasPositiveQuotationAmount(selectedQuotation)}
                          onClick={() => {
                            void requestApproveQuotation(selectedQuotation.id, { closeViewSheetOnDone: true });
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Quotation
                        </PermissionGatedButton>
                      )}

                      {/* Convert to Project — approved with no linked project */}
                      {selectedQuotation.status === "approved" &&
                        !quotationLinkedProjectId(selectedQuotation) && (
                        <PermissionGatedButton
                          allowed={canCreateProjectFromQuote}
                          deniedHint={PERMISSION_DENIED_HINTS.projectFromQuote}
                          size="sm"
                          className="bg-primary text-white"
                          onClick={() => { handleCreateProject(selectedQuotation); setIsViewQuotationOpen(false); }}
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Convert to Project
                        </PermissionGatedButton>
                      )}

                      {/* View Project — already converted */}
                      {(selectedQuotation.status === "converted_to_project" || quotationLinkedProjectId(selectedQuotation)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const pid = quotationLinkedProjectId(selectedQuotation);
                            if (pid) navigate(`/projects/${pid}`);
                          }}
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          View Project
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AppSheetContent>
        </Sheet>
        {renderApproveCustomerDialog()}
      </div>
    );
  }

  // Create/Edit Solar Quotation View
  if (currentView === "create" && !editingQuotationId && !createSourceResolved) {
    return (
      <PageShell className="min-h-[calc(100vh-140px)] space-y-6">
        <StickyPageHeader
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "Pipeline" },
            { label: "Quotations" },
            { label: "New" },
          ]}
          title="New quotation"
        />
        <QuotationCreateSourceGate
          enquiries={enquiries}
          actorRole={currentRole}
          onConfirmEnquiry={handleConfirmCreateFromEnquiry}
          onConfirmException={handleConfirmCreateException}
          onCancel={() => {
            setCurrentView("list");
            resetForm();
          }}
        />
      </PageShell>
    );
  }

  const linkedEnquiryForBanner = enquiryId
    ? enquiries.find((e) => e.id === enquiryId)
    : undefined;

  return (
    <PageShell className="min-h-[calc(100vh-140px)] space-y-6">
      {renderLastConfirmBanner()}

      {currentView === "create" && !editingQuotationId && (enquiryId || withoutEnquiryReason) && (
        <InlineConfirmBanner
          variant="success"
          title={enquiryId ? "Linked to enquiry" : "Exception — no enquiry"}
          description={
            enquiryId
              ? `${enquiryId}${linkedEnquiryForBanner ? ` · ${linkedEnquiryForBanner.customerName}` : ""}. Pipeline: enquiry → quotation → project.`
              : withoutEnquiryReason ?? ""
          }
        />
      )}

      {(status === "withdrawn" || status === "rejected") && (
        <LifecycleTerminalBanner
          variant={status === "withdrawn" ? "withdrawn" : "rejected"}
          title={`Quotation ${formatQuotationStatus(status)}`}
          description={
            status === "withdrawn"
              ? `${lifecycleTermSummary("quotationWithdraw")} Clone it to start a new draft for re-quoting.`
              : `${lifecycleTermSummary("quotationReject")} Revise or clone from the list to create a new draft.`
          }
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setCurrentView("list"); resetForm(); }} aria-label="Back to quotations">
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden />
            Back
          </Button>
          <TabsList>
            <TabsTrigger value="create">Create/Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-2xs uppercase tracking-wider text-muted-foreground">{currentView === "edit" ? `Edit · ${quotationNumber}` : "New"}</span>
            <Badge className={`${getStatusColor(status)} border-0`}>{formatQuotationStatus(status)}</Badge>
          </div>
        </div>

        <TabsContent value="create" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client & System */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input 
                      value={referenceClientName} 
                      onChange={(e) => setReferenceClientName(e.target.value)} 
                      placeholder="Reference name (auto-filled if from project)"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Client Name *</Label>
                      {customerId && (
                        <Badge variant="outline" className="text-2xs bg-primary/10 text-primary border-primary/20 py-0 h-4">
                          Linked: {customerId}
                        </Badge>
                      )}
                    </div>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Client type</Label>
                    <Select value={clientType} onValueChange={(v) => setClientType(v as "company" | "individual")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Textarea
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      placeholder="Street / locality"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={clientState} onChange={(e) => setClientState(e.target.value)} placeholder="State" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={clientPincode} onChange={(e) => setClientPincode(e.target.value)} placeholder="302001" />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN {clientType === "company" ? "(recommended)" : "(optional)"}</Label>
                    <Input
                      value={clientGstin}
                      onChange={(e) => setClientGstin(e.target.value.toUpperCase())}
                      placeholder="15-character GSTIN"
                      maxLength={15}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN (optional)</Label>
                    <Input
                      value={clientPan}
                      onChange={(e) => setClientPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Referred By (Agent)</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="No Agent / Direct" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / Direct</SelectItem>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* System Configuration */}
              {/* System Configuration */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Single template selector — applies the full quotation boilerplate
                      (materials + services + system metadata). Sentinel "__none__" keeps
                      Radix happy since it disallows value="". */}
                  <div className="space-y-2 pb-4 border-b">
                    <div className="flex items-center justify-between">
                      <Label>Apply template</Label>
                      {selectedQuotationTemplateId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSelectedQuotationTemplateId(null)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Select
                      value={selectedQuotationTemplateId ?? "__none__"}
                      onValueChange={(value) => {
                        if (value === "__none__") {
                          setSelectedQuotationTemplateId(null);
                          return;
                        }
                        setSelectedQuotationTemplateId(value);
                        handleApplyQuotationBoilerplate(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No template — manual entry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No template — manual entry</SelectItem>
                        {quotationTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.name} · {tpl.segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Loads materials, services, and system metadata. You can edit any field after applying.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={systemCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>System Capacity (kW)</Label>
                      <Select value={systemCapacity} onValueChange={handleCapacityChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {systemCategory === "residential" && (
                            <>
                              <SelectItem value="1">1 kW</SelectItem>
                              <SelectItem value="2">2 kW</SelectItem>
                              <SelectItem value="3">3 kW</SelectItem>
                              <SelectItem value="5">5 kW</SelectItem>
                            </>
                          )}
                          {systemCategory === "commercial" && (
                            <>
                              <SelectItem value="10">10 kW</SelectItem>
                              <SelectItem value="15">15 kW</SelectItem>
                              <SelectItem value="20">20 kW</SelectItem>
                              <SelectItem value="25">25 kW</SelectItem>
                            </>
                          )}
                          {systemCategory === "industrial" && (
                            <>
                              <SelectItem value="50">50 kW</SelectItem>
                              <SelectItem value="100">100 kW</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Panel Brand</Label>
                      <Input value={panelBrand} onChange={(e) => setPanelBrand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Wattage</Label>
                      <Input value={panelWattage} onChange={(e) => setPanelWattage(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Count</Label>
                      <Input value={panelCount} onChange={(e) => setPanelCount(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Inverter Brand</Label>
                      <Input value={inverterBrand} onChange={(e) => setInverterBrand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inverter Capacity</Label>
                      <Input value={inverterCapacity} onChange={(e) => setInverterCapacity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Structure Type</Label>
                      <Input value={structureType} onChange={(e) => setStructureType(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Floor Height</Label>
                      <Input value={floorHeight} onChange={(e) => setFloorHeight(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes / Description</Label>
                      <Input value={systemConfigNotes} onChange={(e) => setSystemConfigNotes(e.target.value)} placeholder="e.g. Roof top installation" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Materials Table */}
              <Card className="bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Material Items</CardTitle>
                    <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      {formPrimaryLabel("create", "line item")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTableShell variant="inline" maxHeight="none">
                    <TableHeader>
                      <TableRow className={dataTableClasses.headRow}>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Size/Specs</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.length === 0 ? (
                        <TableEmptyRow
                          colSpan={8}
                          icon={Package}
                          title="No material items yet"
                          description='Use Add Item or apply a template above.'
                        />
                      ) : (
                        materials.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            <TableRow className={dataTableClasses.row}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.itemName}</TableCell>
                              <TableCell className="text-muted-foreground">{item.size}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="w-16 h-8 text-center"
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="w-24 h-8 text-right"
                                  value={item.rate}
                                  onChange={(e) => handleRateChange(item.id, parseFloat(e.target.value) || 0)}
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatINR((item.quantity * item.rate))}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveMaterial(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/30">
                              <TableCell colSpan={8}>
                                <Input
                                  placeholder="Add description for this item (optional)"
                                  value={item.description || ""}
                                  onChange={(e) => handleMaterialDescriptionChange(item.id, e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))
                      )}
                      {materials.length > 0 && (
                        <TableRow className="bg-muted/40 font-semibold">
                          <TableCell colSpan={6} className="text-right">Materials subtotal</TableCell>
                          <TableCell className="text-right text-primary">
                            {formatINR(materials.reduce((sum, m) => sum + m.quantity * m.rate, 0))}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </DataTableShell>
                </CardContent>
              </Card>

              {/* What You Get Section */}
              {/* What You Get Section */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    What You Get
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {whatYouGet.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing & Terms */}
            <div className="space-y-6">
              {/* Price Breakdown */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Price Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">System Cost</span>
                    <span className="font-medium">{formatINR(systemCost)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Discount (%)</span>
                    <Input 
                      type="number" 
                      className={`w-20 h-8 text-right ${discountError ? 'border-destructive' : ''}`}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {discountError && (
                    <p className="text-xs text-destructive">{discountError}</p>
                  )}
                  {discountAmount > 0 && !discountError && (
                    <div className="flex justify-between text-primary">
                      <span>Discount Amount</span>
                      <span>-{formatINR(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">GST (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 h-8 text-right" 
                      value={gstPercent}
                      onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Amount</span>
                    <span>{formatINR(gstAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Net Price (incl. GST)</span>
                    <span>{formatINR(netPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Govt. Subsidy</span>
                    <Input 
                      type="number" 
                      className="w-28 h-8 text-right" 
                      value={govtSubsidy}
                      onChange={(e) => setGovtSubsidy(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Separator />
                  <div className={`flex justify-between text-lg font-semibold ${totalError ? "text-destructive" : ""}`}>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      Quoted total
                      <LifecycleTermHint term="quotationQuotedTotal" side="right" />
                    </span>
                    <span className="tabular-nums">{formatINR(effectivePrice)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saved as <strong>totalAmount</strong> on the quotation document (GST-inclusive, after subsidy).
                  </p>
                  {totalError && (
                    <p className="text-xs text-destructive">{totalError}</p>
                  )}
                  {zeroAmountError && (
                    <p className="text-xs text-destructive">{zeroAmountError}</p>
                  )}
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="client-agreed-amount" className="inline-flex items-center gap-1 text-sm font-medium">
                      Client agreed amount
                      <LifecycleTermHint term="quotationClientAgreedAmount" side="right" />
                    </Label>
                    <Input
                      id="client-agreed-amount"
                      type="number"
                      className={`h-9 text-right tabular-nums ${clientAgreedOverrideError ? "border-destructive" : ""}`}
                      placeholder={`Same as quoted (${effectivePrice})`}
                      value={clientAgreedAmountOverride}
                      onChange={(e) => setClientAgreedAmountOverride(e.target.value)}
                      disabled={formLocked}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to match quoted total. Project contract uses this when negotiated.
                    </p>
                    {clientAgreedOverrideError ? (
                      <p className="text-xs text-destructive">{clientAgreedOverrideError}</p>
                    ) : null}
                    {parsedClientAgreedOverride != null &&
                    parsedClientAgreedOverride !== effectivePrice ? (
                      <p className="text-xs text-primary">
                        Contract value {formatINR(parsedClientAgreedOverride)} (quoted{" "}
                        {formatINR(effectivePrice)})
                      </p>
                    ) : null}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Payment type <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Required before send or approve — drives project timeline (cash vs loan).
                    </p>
                    <Select
                      value={paymentType || undefined}
                      onValueChange={(v) => setPaymentType(v as "cash" | "loan" | "cash-and-loan")}
                    >
                      <SelectTrigger className={paymentTypeError ? "border-destructive" : undefined}>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="cash-and-loan">Combined (Cash + Loan)</SelectItem>
                      </SelectContent>
                    </Select>
                    {paymentTypeError && (
                      <p className="text-xs text-destructive">{paymentTypeError}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Terms */}
              {/* Payment Terms */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Payment Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Booking Amount</span>
                    <Input className="w-20 h-8 text-right" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">On Design Approval</span>
                    <Input className="w-20 h-8 text-right" value={designApproval} onChange={(e) => setDesignApproval(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Before Material Dispatch</span>
                    <Input className="w-20 h-8 text-right" value={beforeDispatch} onChange={(e) => setBeforeDispatch(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Post Installation</span>
                    <Input className="w-20 h-8 text-right" value={postInstallation} onChange={(e) => setPostInstallation(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Warranty */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Warranty Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Panel Product</span>
                    <Input className="w-24 h-8 text-right" value={panelProductWarranty} onChange={(e) => setPanelProductWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Panel Performance</span>
                    <Input className="w-24 h-8 text-right" value={panelPerformanceWarranty} onChange={(e) => setPanelPerformanceWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Inverter</span>
                    <Input className="w-24 h-8 text-right" value={inverterWarranty} onChange={(e) => setInverterWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Structure</span>
                    <Input className="w-24 h-8 text-right" value={structureWarranty} onChange={(e) => setStructureWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Other Components</span>
                    <Input className="w-24 h-8 text-right" value={otherWarranty} onChange={(e) => setOtherWarranty(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Preview/Export Options */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Preview/Export Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Load Preset Dropdown */}
                  {quotationVisibilityPresets.length > 0 && (
                    <div className="space-y-2 pb-3 border-b">
                      <Label className="text-xs text-muted-foreground">Load Preset</Label>
                      <Select onValueChange={(value) => {
                        const preset = quotationVisibilityPresets.find(p => p.id === value);
                        if (preset) {
                          setSectionVisibility(preset.visibility);
                          toast({ title: "Preset Loaded", description: `Applied "${preset.name}" preset` });
                        }
                      }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select a preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {quotationVisibilityPresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{preset.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">Select sections to show in preview & export:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.systemDetails} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, systemDetails: !!checked}))}
                      />
                      <span className="text-sm">System Details</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.materials} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, materials: !!checked}))}
                      />
                      <span className="text-sm">Materials Table</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox 
                        checked={sectionVisibility.hideAmounts} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, hideAmounts: !!checked}))}
                      />
                      <span className="text-sm text-muted-foreground">Hide individual amounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.whatYouGet} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, whatYouGet: !!checked}))}
                      />
                      <span className="text-sm">What You Get</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.paymentTerms} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, paymentTerms: !!checked}))}
                      />
                      <span className="text-sm">Payment Terms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.warranty} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, warranty: !!checked}))}
                      />
                      <span className="text-sm">Warranty Information</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={sectionVisibility.termsConditions}
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, termsConditions: !!checked}))}
                      />
                      <span className="text-sm">Terms & Conditions</span>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setIsSaveVisibilityPresetOpen(true)}>
                      Save as Preset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add terms, conditions, or special notes..."
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={handleSaveQuotation}
                  disabled={formLocked || !!discountError || !!totalError}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Quotation
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setIsSaveTemplateOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("preview")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleOpenShareModal}
                  disabled={blocksSendApproveActions}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share to Client
                </Button>
                
                {/* Quotation Actions — state-aware, only for saved quotations */}
                {editingQuotationId && (
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quotation Actions</p>

                    {/* Send Quotation — draft only */}
                    {status === "draft" && (
                      <PermissionGatedButton
                        allowed={canEditQuotation}
                        deniedHint={PERMISSION_DENIED_HINTS.quotationSend}
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        disabled={blocksSendApproveActions}
                        onClick={() => { void handleMarkAsSent(editingQuotationId); }}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Quotation
                      </PermissionGatedButton>
                    )}

                    {/* Approve Quotation — sent only */}
                    {status === "sent" && (
                      <PermissionGatedButton
                        allowed={canApproveQuotation}
                        deniedHint={PERMISSION_DENIED_HINTS.quotationApprove}
                        variant="outline"
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        disabled={blocksSendApproveActions}
                        onClick={() => {
                          if (editingQuotationId) void requestApproveQuotation(editingQuotationId);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Quotation
                      </PermissionGatedButton>
                    )}

                    {/* Convert to Project — approved only (and no linked project yet) */}
                    {status === "approved" && (() => {
                      const q = savedQuotations.find(qq => qq.id === editingQuotationId);
                      const alreadyLinked = !!(q && quotationLinkedProjectId(q));
                      return !alreadyLinked ? (
                        <PermissionGatedButton
                          allowed={canCreateProjectFromQuote}
                          deniedHint={PERMISSION_DENIED_HINTS.projectFromQuote}
                          className="w-full bg-primary"
                          onClick={() => { if (q) handleCreateProject(q); }}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          Convert to Project
                        </PermissionGatedButton>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const pid = q ? quotationLinkedProjectId(q) : undefined;
                            if (pid) navigate(`/projects/${pid}`);
                          }}
                        >
                          <Briefcase className="w-4 h-4 mr-2" />
                          View Project
                        </Button>
                      );
                    })()}

                    {/* Reject — draft, sent or approved (terminal-but-allowed) */}
                    {(status === "draft" || status === "sent" || status === "approved") && (
                      <PermissionGatedButton
                        allowed={canEditQuotation}
                        deniedHint={PERMISSION_DENIED_HINTS.quotationReject}
                        variant="outline"
                        className="w-full border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleMarkAsRejected(editingQuotationId);
                          setStatus("rejected");
                        }}
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <X className="w-4 h-4" />
                          Mark as Rejected
                          <LifecycleTermHint term="quotationReject" side="top" />
                        </span>
                      </PermissionGatedButton>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Default static sections — editable from Settings → Quotation sections. */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Default sections included on every quotation</h2>
            <QuotationStaticSectionsBlock variant="create" />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <div className="flex items-center justify-end gap-3 mb-6">
            <Button variant="outline" onClick={handleExportPDF} disabled={isExportingPdf}>
              <Download className="w-4 h-4 mr-2" />
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleOpenShareModal}
              disabled={formLocked || blocksSendApproveActions}
            >
              <Send className="w-4 h-4 mr-2" />
              Send to Client
            </Button>
          </div>

          <div ref={quotationRef} className="bg-background p-8 rounded-lg border max-w-4xl mx-auto pb-16">
            <div className="flex justify-between items-start mb-8 pb-6 border-b">
              <div>
                <h1 className="text-2xl font-bold text-primary">{companyInfo.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{companyInfo.address}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {companyInfo.contacts.map((contact, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {contact.phone}
                    </span>
                  ))}
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {companyInfo.email}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">GSTIN: {companyInfo.gstin}</p>
              </div>
              <div className="text-right">
                <Badge className={`${getStatusColor(status)} border-0 text-sm px-3 py-1`}>{formatQuotationStatus(status)}</Badge>
                <p className="text-2xl font-bold mt-2">{quotationNumber}</p>
                <p className="text-sm text-muted-foreground">Date: {quotationDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">QUOTATION FOR</h3>
                <p className="font-bold text-lg">{clientName || "—"}</p>
                <p className="text-sm text-muted-foreground">{clientPhone}</p>
                <p className="text-sm text-muted-foreground">{clientEmail}</p>
                <p className="text-sm text-muted-foreground">{clientCity}, {clientState}</p>
              </div>
              {sectionVisibility.systemDetails && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">SYSTEM DETAILS</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Size:</span>
                      <span className="font-medium">{systemCapacity} kWp ({systemCategory})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Solar Panels:</span>
                      <span className="font-medium">{panelCount}x {panelBrand} {panelWattage}W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inverter:</span>
                      <span className="font-medium">{inverterBrand} {inverterCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Structure:</span>
                      <span className="font-medium">{structureType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Floor Height:</span>
                      <span className="font-medium">{floorHeight}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sectionVisibility.whatYouGet && (
              <div className="mb-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-sm text-primary mb-3">WHAT YOU GET</h3>
                <div className="grid grid-cols-2 gap-2">
                  {whatYouGet.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sectionVisibility.materials && (
              <div className="mb-8">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">QUOTATION ITEMS</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Item / Service</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      {!sectionVisibility.hideAmounts && (
                        <TableHead className="text-right">Amount</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        <TableCell>
                          <p className="font-medium">{item.itemName}</p>
                          {item.size !== "-" && <p className="text-xs text-muted-foreground">{item.size}</p>}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                        {!sectionVisibility.hideAmounts && (
                          <TableCell className="text-right">{formatINR((item.quantity * item.rate))}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                {sectionVisibility.paymentTerms && (
                  <>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">PAYMENT TERMS</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Booking Amount:</span>
                        <span className="font-medium">{bookingAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>On Design Approval:</span>
                        <span className="font-medium">{designApproval}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Before Material Dispatch:</span>
                        <span className="font-medium">{beforeDispatch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Post Installation:</span>
                        <span className="font-medium">{postInstallation}</span>
                      </div>
                    </div>
                  </>
                )}

                {sectionVisibility.warranty && (
                  <>
                    <h3 className={`font-semibold text-sm text-muted-foreground mb-3 ${sectionVisibility.paymentTerms ? 'mt-6' : ''}`}>WARRANTY</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Panel Product:</span>
                        <span className="font-medium">{panelProductWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Panel Performance:</span>
                        <span className="font-medium">{panelPerformanceWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inverter:</span>
                        <span className="font-medium">{inverterWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Structure:</span>
                        <span className="font-medium">{structureWarranty}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">PRICE SUMMARY</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>System Cost:</span>
                      <span>{formatINR(systemCost)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Discount ({discountPercent}%):</span>
                        <span>-{formatINR(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>GST ({gstPercent}%):</span>
                      <span>{formatINR(gstAmount)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Net Price:</span>
                      <span>{formatINR(netPrice)}</span>
                    </div>
                    {govtSubsidy > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Govt. Subsidy:</span>
                        <span>-{formatINR(govtSubsidy)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-xl text-primary pt-2">
                      <span>Net Effective Price:</span>
                      <span>{formatINR(effectivePrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {sectionVisibility.termsConditions && notes && (
              <div className="mb-8">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">TERMS & CONDITIONS</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-lg">
                  {notes}
                </div>
              </div>
            )}
            {/* Default static sections (Why Choose MSS? / Benefits / …) */}
            <div className="pt-6 border-t space-y-3">
              <QuotationStaticSectionsBlock variant="preview" />
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-6 border-t">
              <p>This quotation is valid for 15 days from the date of issue.</p>
              <p className="mt-1">Thank you for considering {companyInfo.name} for your solar energy needs!</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Sheet */}
      <Sheet open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add Material Item</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
              <TabsTrigger value="inventory" className="flex-1">From Inventory</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newMaterial.category || ""} onValueChange={(v) => setNewMaterial({...newMaterial, category: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Structure">Structure</SelectItem>
                      <SelectItem value="Panel/Module">Panel/Module</SelectItem>
                      <SelectItem value="Wiring">Wiring</SelectItem>
                      <SelectItem value="Earthing">Earthing</SelectItem>
                      <SelectItem value="Civil">Civil</SelectItem>
                      <SelectItem value="Meter">Meter</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newMaterial.unit || ""} onValueChange={(v) => setNewMaterial({...newMaterial, unit: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="m">Meters</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="pair">Pair</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="job">Job</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  placeholder="Enter item name"
                  value={newMaterial.itemName || ""}
                  onChange={(e) => setNewMaterial({...newMaterial, itemName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Size/Specifications</Label>
                <Input 
                  placeholder="e.g., 4sqmm, 540W"
                  value={newMaterial.size || ""}
                  onChange={(e) => setNewMaterial({...newMaterial, size: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={newMaterial.quantity || ""}
                    onChange={(e) => setNewMaterial({...newMaterial, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate (₹)</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={newMaterial.rate || ""}
                    onChange={(e) => setNewMaterial({...newMaterial, rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMaterial}>{formPrimaryLabel("create", "line item")}</Button>
              </div>
            </TabsContent>
            <TabsContent value="inventory" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select from Inventory</Label>
                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  {(inventoryItems.length > 0 ? inventoryItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    stock: (item as any).quantity ?? (item as any).stock ?? 0,
                    rate: (item as any).unitPrice ?? (item as any).buyPrice ?? 0,
                  })) : [
                    { id: 1, name: "Waaree 540W Mono Perc", category: "Panel", stock: 120, rate: 13000 },
                    { id: 2, name: "Growatt 5kW Inverter", category: "Inverter", stock: 5, rate: 42000 },
                    { id: 3, name: "DC Cable 4sqmm", category: "Cable", stock: 500, rate: 45 },
                    { id: 4, name: "Structure GI Rail", category: "Structure", stock: 450, rate: 110 },
                  ]).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setNewMaterial({
                          category: item.category,
                          itemName: item.name,
                          quantity: 1,
                          rate: item.rate,
                          unit: "pcs",
                          size: "-"
                        });
                        setIsAddMaterialOpen(false);
                        // Add directly to materials
                        setMaterials([...materials, {
                          id: Date.now(),
                          category: item.category,
                          itemName: item.name,
                          size: "-",
                          quantity: 1,
                          rate: item.rate,
                          unit: "pcs",
                        }]);
                        toast({ title: "Item Added", description: `${item.name} added to materials` });
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} • Stock: {item.stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">{formatINR(item.rate)}</p>
                        <p className="text-xs text-muted-foreground">per unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <AppSheetFormFooter onCancel={() => setIsAddMaterialOpen(false)} />
            </TabsContent>
          </Tabs>
        </AppSheetContent>
      </Sheet>

      {/* Save as Template Sheet */}
      <Sheet open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Save as Template</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">System Configuration:</p>
              <p className="font-medium capitalize">{systemCategory} - {formatCapacityKW(systemCapacity)}</p>
            </div>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input 
                placeholder="e.g., Standard 5kW Residential"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate}>Save Template</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Share to Client Modal */}
      <Sheet open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Quotation to Client
            </SheetTitle>
            <SheetDescription>
              Choose how you want to share this quotation with {clientName || "the client"}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {/* Share Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "whatsapp" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="whatsapp"
                  className="sr-only"
                  checked={shareMethod === "whatsapp"}
                  onChange={() => setShareMethod("whatsapp")}
                />
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">WhatsApp</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "email" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="email"
                  className="sr-only"
                  checked={shareMethod === "email"}
                  onChange={() => setShareMethod("email")}
                />
                <Mail className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">Email</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "sms" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="sms"
                  className="sr-only"
                  checked={shareMethod === "sms"}
                  onChange={() => setShareMethod("sms")}
                />
                <Phone className="h-5 w-5 text-warning" />
                <span className="font-medium text-sm">SMS</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "visit" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="visit"
                  className="sr-only"
                  checked={shareMethod === "visit"}
                  onChange={() => setShareMethod("visit")}
                />
                <MapPin className="h-5 w-5 text-accent-foreground" />
                <span className="font-medium text-sm">In-Person</span>
              </label>
            </div>

            {/* Contact Input for WhatsApp/Email/SMS */}
            {shareMethod !== "visit" && (
              <div className="space-y-2">
                <Label>
                  {shareMethod === "email" ? "Email Address" : "Mobile Number"}
                </Label>
                <Input 
                  placeholder={shareMethod === "email" ? "email@example.com" : "+91 XXXXX XXXXX"}
                  value={shareContactValue}
                  onChange={(e) => setShareContactValue(e.target.value)}
                />
                {shareContactValue && (
                  <p className="text-xs text-muted-foreground">
                    Will be sent to: <strong>{shareContactValue}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Visit Details for In-Person */}
            {shareMethod === "visit" && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Mark this quotation as shared during an in-person visit</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Date of Visit
                    </Label>
                    <Input 
                      type="date"
                      value={shareVisitDate}
                      onChange={(e) => setShareVisitDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time (Optional)
                    </Label>
                    <Input 
                      type="time"
                      value={shareVisitTime}
                      onChange={(e) => setShareVisitTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea 
                    placeholder="Any notes about the visit..."
                    value={shareVisitNotes}
                    onChange={(e) => setShareVisitNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmShare} disabled={blocksSendApproveActions}>
              {shareMethod === "visit" ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Sent
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share
                </>
              )}
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Create Project from Quotation Sheet */}
      <Sheet
        open={isCreateProjectOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateProjectSheet();
          else setIsCreateProjectOpen(true);
        }}
      >
        <AppSheetContent layout="scroll" size="xl" mobileFullScreen>
          {createProjectStep === "confirm" && pendingCreateProject && selectedQuotationForProject ? (
            <div className="py-4">
              <ProjectConfirmationScreen
                data={buildProjectConfirmationData(pendingCreateProject, {
                  quotationNumber: selectedQuotationForProject.quotationNumber,
                })}
                employees={employees
                  .filter((e) => e.status === "Active")
                  .map((e) => ({ id: e.id, name: e.name }))}
                onEdit={() => setCreateProjectStep("form")}
                onConfirm={(team) => { void finalizeCreateProject(team); }}
              />
            </div>
          ) : (
          <>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Create Project from Quotation
            </SheetTitle>
            <SheetDescription>
              This will create a new project with data from quotation {selectedQuotationForProject?.quotationNumber}
            </SheetDescription>
          </SheetHeader>
          
          {selectedQuotationForProject && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm"><strong>Client:</strong> {selectedQuotationForProject.clientName}</p>
                <p className="text-sm"><strong>System:</strong> {selectedQuotationForProject.systemCategory} {formatCapacityKW(selectedQuotationForProject.systemCapacity)}</p>
                <p className="text-sm"><strong>Location:</strong> {selectedQuotationForProject.clientCity}, {selectedQuotationForProject.clientState}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Project Kind</Label>
                  <Select
                    value={quotationProjectKind}
                    onValueChange={(v) => setQuotationProjectKind(v as ProjectKind)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(projectKindConfigs) as ProjectKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {projectKindConfigs[k].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select
                    value={projectPaymentType}
                    onValueChange={(v) => setProjectPaymentType(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="loan">Loan</SelectItem>
                      <SelectItem value="cash-and-loan">Combined (Cash + Loan)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-1">
                    Contract amount (₹)
                    <LifecycleTermHint term="quotationClientAgreedAmount" side="top" />
                  </Label>
                  <Input 
                    type="number" 
                    value={projectContractAmount} 
                    onChange={(e) => setProjectContractAmount(parseFloat(e.target.value) || 0)} 
                  />
                  {selectedQuotationForProject &&
                  hasDistinctClientAgreedAmount(selectedQuotationForProject) ? (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Quoted {formatINR(selectedQuotationForProject.totalAmount)} → agreed{" "}
                      {formatINR(selectedQuotationForProject.clientAgreedAmount!)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Defaults to client agreed amount, else quoted total from the quotation.
                    </p>
                  )}
                </div>
                {projectPaymentType === "loan" && (
                  <div className="space-y-2">
                    <Label>Bank Documentation Amount (₹)</Label>
                    <Input 
                      type="number" 
                      value={projectBankDocAmount} 
                      onChange={(e) => setProjectBankDocAmount(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                )}
              </div>

              {(quotationProjectKind === "PARTNER_EPC" || quotationProjectKind === "FIXED_EPC" || quotationProjectKind === "VENDOR_NETWORK") && (
                <div className="space-y-2 pt-2">
                  <Label>Linked Partner</Label>
                  <Select value={qPartnerIdForProject} onValueChange={setQPartnerIdForProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {quotationProjectKind === "PARTNER_EPC" && (
                <div className="space-y-2">
                  <Label>Profit Share (%)</Label>
                  <Input type="number" value={qProfitSharePercent} onChange={(e) => setQProfitSharePercent(e.target.value)} />
                </div>
              )}

              {quotationProjectKind === "FIXED_EPC" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>MSS Backend (₹)</Label>
                    <Input type="number" value={qFixedBackend} onChange={(e) => setQFixedBackend(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Partner Sell (₹)</Label>
                    <Input type="number" value={qFixedSell} onChange={(e) => setQFixedSell(e.target.value)} />
                  </div>
                </div>
              )}

              {quotationProjectKind === "VENDOR_NETWORK" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Vendorship Fee (₹)</Label>
                    <Input
                      type="number"
                      value={qVendorshipFee}
                      onChange={(e) => setQVendorshipFee(e.target.value)}
                      placeholder="Fee payable by partner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Channel Partner Name</Label>
                    <Input
                      value={qChannel}
                      onChange={(e) => setQChannel(e.target.value)}
                      placeholder="Channel partner (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>External Network</Label>
                    <Input
                      value={qExternal}
                      onChange={(e) => setQExternal(e.target.value)}
                      placeholder="External network (optional)"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={resetCreateProjectSheet}>Cancel</Button>
            <Button onClick={() => { void prepareCreateProject(); }}>
              <Briefcase className="h-4 w-4 mr-2" />
              Review &amp; Create
            </Button>
          </div>
          </>
          )}
        </AppSheetContent>
      </Sheet>

      {/* Save Visibility Preset Sheet */}
      <Sheet open={isSaveVisibilityPresetOpen} onOpenChange={setIsSaveVisibilityPresetOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Save Visibility Preset</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input 
                placeholder="e.g., Standard Quote, Minimal Preview"
                value={visibilityPresetName}
                onChange={(e) => setVisibilityPresetName(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted/30 rounded-lg space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Settings:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className={sectionVisibility.systemDetails ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.systemDetails ? "✓" : "✗"} System Details
                </span>
                <span className={sectionVisibility.materials ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.materials ? "✓" : "✗"} Materials
                </span>
                <span className={sectionVisibility.whatYouGet ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.whatYouGet ? "✓" : "✗"} What You Get
                </span>
                <span className={sectionVisibility.paymentTerms ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.paymentTerms ? "✓" : "✗"} Payment Terms
                </span>
                <span className={sectionVisibility.warranty ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.warranty ? "✓" : "✗"} Warranty
                </span>
                <span className={sectionVisibility.termsConditions ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.termsConditions ? "✓" : "✗"} Terms & Conditions
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Hide amounts: {sectionVisibility.hideAmounts ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsSaveVisibilityPresetOpen(false);
              setVisibilityPresetName("");
            }}>Cancel</Button>
            <Button onClick={() => {
              if (!visibilityPresetName.trim()) {
                toast({ title: "Error", description: "Please enter a preset name", variant: "destructive" });
                return;
              }
              addQuotationVisibilityPreset({
                id: generateId("VP"),
                name: visibilityPresetName.trim(),
                visibility: { ...sectionVisibility },
                createdAt: new Date().toISOString(),
              });
              toast({ title: "Preset Saved", description: `"${visibilityPresetName}" preset saved successfully` });
              setIsSaveVisibilityPresetOpen(false);
              setVisibilityPresetName("");
            }}>Save Preset</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) {
            setQuotationToDelete(null);
            setDeleteReason("");
          }
        }}
        title={
          quotationToDelete
            ? `Delete quotation ${quotationToDelete.quotationNumber}?`
            : "Delete quotation?"
        }
        description={
          quotationToDelete
            ? `Permanently remove "${quotationToDelete.quotationNumber}". This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete permanently"
        onConfirm={confirmDeleteQuotation}
      />

      {renderApproveCustomerDialog()}

      <Sheet
        open={withdrawDialogQuotation != null}
        onOpenChange={(open) => { if (!open) { setWithdrawDialogQuotation(null); setWithdrawReason(""); } }}
      >
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Withdraw quotation
              <LifecycleTermHint term="quotationWithdraw" side="bottom" />
            </SheetTitle>
            <SheetDescription>
              Mark <strong>{withdrawDialogQuotation?.quotationNumber}</strong> as withdrawn.{" "}
              {lifecycleTermSummary("quotationWithdraw")} Reason is optional but recommended for the audit trail.
            </SheetDescription>
          </SheetHeader>
          <Alert className="mx-0">
            <AlertDescription className="text-xs">
              <span className="font-medium text-foreground">Not the same as Reject: </span>
              {lifecycleTermSummary("quotationWithdrawVsReject")}{" "}
              <LifecycleTermHint term="quotationWithdrawVsReject" className="align-middle" side="bottom" />
            </AlertDescription>
          </Alert>
          <div className="space-y-2 py-4">
            <Label htmlFor="withdraw-reason">Reason (optional)</Label>
            <Textarea
              id="withdraw-reason"
              placeholder="e.g. quote superseded, customer went silent, pricing error..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <SheetFooter className="mt-2 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => { setWithdrawDialogQuotation(null); setWithdrawReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { void handleWithdrawQuotation(); }}>
              Withdraw quotation
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Quotations;

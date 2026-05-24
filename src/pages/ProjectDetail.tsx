import { Building2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, Calendar, Camera, CheckCircle2, ClipboardList, Edit,
  FileText, Handshake, IndianRupee, MapPin,
  MoreVertical, Package, Plus, ReceiptText, Truck, Users, CheckSquare, User, X, Zap,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { DirectExceptionProjectBanner } from "@/components/projects/DirectExceptionProjectBanner";
import { SiteChecklistDriftBanner } from "@/components/projects/SiteChecklistDriftBanner";
import { findStaleSiteChecklistNeedToGetDrift } from "@/lib/siteChecklistNeedToGetSync";
import { projectDirectExceptionReason } from "@/lib/projectDirectException";
import {
  projectRequiresClientInvoiceForCompletion,
} from "@/lib/projectCompletionInvoice";
import { evaluateProjectCompletionReadiness } from "@/lib/projectCompletionReadiness";
import { ProjectCompletionHelpBanner } from "@/components/projects/ProjectCompletionHelpBanner";
import { useAppData } from "@/contexts/AppDataContext";
import { useMasters } from "@/contexts/MastersContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { canPerformAction } from "@/domain/policies/permissionMatrix";
import { useCan } from "@/hooks/useCan";
import { useCanAction } from "@/hooks/useCanAction";
import { useCeoOperationalReadOnly } from "@/hooks/useCeoOperationalReadOnly";
import { allowOperationalWrite } from "@/lib/ceoOperationalReadOnly";
import { CeoReadOnlySheetBanner } from "@/components/ui/CeoReadOnlySheetBanner";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import {
  canTransitionProjectStatus,
  legacyStatusFromLifecycle,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";
import { PROJECT_LIFECYCLE_FILTER_OPTIONS } from "@/lib/projectListFilters";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { ToastAction } from "@/components/ui/toast";
import { UnifiedExpenseSheet } from "@/components/expenses/UnifiedExpenseSheet";
import { TaskAssignmentSheet } from "@/components/employees/TaskAssignmentSheet";
import { ProgressReportTab } from "@/components/projects/ProgressReportTab";
import { TeamRosterTab } from "@/components/projects/TeamRosterTab";
import { filterWorkTabsBySnapshot, filterWorkTabsByRole, projectForbidsAction, projectShowsClientInvoices, projectPrimaryPartyLabel, projectShowsOutsourceSection, projectShowsMaterialSupplyToggle, defaultProjectDetailTab } from "@/lib/projectDetailTabs";
import { ProjectOutsourceSection } from "@/components/projects/ProjectOutsourceSection";
import { ProjectIncMaterialSection } from "@/components/projects/ProjectIncMaterialSection";
import { ProjectInstallmentTracker } from "@/components/projects/ProjectInstallmentTracker";
import {
  buildProjectActorScopeContext,
  isProjectVisibleToActor,
} from "@/lib/projectActorScope";
import { isQuotationConverted, quotationLinkedProjectId } from "@/lib/quotationSelectors";
import { ProjectDocumentsStudio } from "@/components/projects/ProjectDocumentsStudio";
import MaterialsSentTab from "@/components/projects/MaterialsSentTab";
import { ProjectStartActions } from "@/components/projects/ProjectStartActions";
import { SiteVisitSheet } from "@/components/projects/SiteVisitSheet";
import { ChangeRequestSheet } from "@/components/projects/ChangeRequestSheet";
import { AdditionalWorkSheet } from "@/components/projects/AdditionalWorkSheet";
import { resolveChangeRequestDeltaAmount } from "@/lib/changeRequestApproval";
import {
  buildInvoiceToPaymentDraft,
  buildProjectToExpenseDraft,
  buildProjectToInvoiceDraft,
  saveCreateDraft,
} from "@/lib/createFromContext";
import { ClientPaymentHistory } from "@/components/projects/ClientPaymentHistory";
import { clientPaymentRecordPaymentId } from "@/lib/clientPaymentReconciliation";
import { CustomerSnapshotDriftHint } from "@/components/shared/CustomerSnapshotDriftHint";
import { ProjectScopeChangeGuidance } from "@/components/shared/ProjectScopeChangeGuidance";
import { resolveProjectClientDisplay } from "@/lib/customerPipelineIdentity";
import { getTimelineCompletionPercent } from "@/lib/projectUtils";
import {
  calculateProjectPartnerEarning,
  calculateProjectVendorshipFee,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,

} from "@/domain/partners/derivePartnerEconomics";
import { resolveProjectPartnerRow } from "@/lib/projectPartnerEconomics";
import type { Payment, Expense, Invoice } from "@/types/finance";
import type { Project, ProjectPartner, ProjectPartnerType } from "@/types/project";
import { formatINR } from "@/lib/formatCurrency";
import {
  canonicalProjectKind,
  canonicalProjectMode,
  PROJECT_KIND_UI_TONES,
  projectKindUiLabel,
} from "@/lib/projectTaxonomyDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function TabCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MiniMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2" title={hint}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      {hint && <p className="text-2xs text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function PaymentRecipient({ payment }: { payment: Payment }) {
  return <Badge variant="outline">{payment.counterpartyName || "Company"}</Badge>;
}

// Outsourced work expense parsing
const OUTSRC_META = /^OUTSRC:(\d+),(\d+),([\d.]+):(.*)$/s;
function expenseToOutsourcedWorkRow(e: Expense) {
  const parsed = parseISO(e.date);
  const dateLabel = isValid(parsed) ? format(parsed, "dd MMM yyyy") : e.date;
  const m = e.notes?.match(OUTSRC_META);
  if (m) return { id: e.id, date: dateLabel, description: m[4].trim() || "Outsourced work", employees: parseInt(m[1], 10) || 0, days: parseInt(m[2], 10) || 0, ratePerDay: parseFloat(m[3]) || 0, total: e.amount };
  return { id: e.id, date: dateLabel, description: e.description ?? e.notes ?? "Outsourced work", employees: 0, days: 0, ratePerDay: 0, total: e.amount };
}

type ProjectDetailLocationState = {
  directExceptionReason?: string;
};

const ProjectDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const directExceptionFlash = (location.state as ProjectDetailLocationState | null)
    ?.directExceptionReason;
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const {
    attendanceRecords,
    customers,
    employees,
    enquiries,
    teams,
    settingsTeamMembers,
    scheduledInstallations,
    expenses,
    incomes,
    quotations,
    invoices,
    partners,
    partnerTransactions,
    payments,
    accountingReviewQueue,
    blockages,
    projects: _projects,
    saleBills,
    sites,
    inventoryItems: globalInvItems,
    siteChecklistTemplates,
    getProjectById,
    getQuotationById,
    getExpensesByProject,
    getBlockagesByProjectId,
    getOperationalTicketsByProjectId,
    getProjectTimelineForProject,
    getClientPaymentRecordsByProject,
    getTasksByProjectId,
    getSitesByProjectId,
    addTask,
    addSite,
    deleteSite,
    updateProject,
    recordProjectMaterialMovement,
    addExpense,
    addBlockage,
    resolveBlockage,
    addOperationalTicket,
    updateProjectTimelineForProject,
    recordCustomerInflow,
    deletePayment,
    applySiteChecklistFromTemplate,
    dispatchSiteMaterial,
    getSiteVisitsByProject,
    getReservationsForProject,
    getSchedulesByProject,
    getDamageByProject,
    reconcileSiteVisitToChecklist,
    getChangeRequestsByProject,
    addProjectChangeRequest: _addProjectChangeRequest,
    approveProjectChangeRequest,
    rejectProjectChangeRequest,
    vendorshipCompanies,
    getINCGiverCompanyById,
    getAccrualsByProject,
    generateId,
    canDo,
  } = useAppData();
  const { getSiteChecklistPresets } = useMasters();
  const COMPANY_STATE_CODE = (() => { try { return JSON.parse(localStorage.getItem("mss.settings.company") || "{}").companyState || "08"; } catch { return "08"; } })();

  const canDeleteClientPayment = useCanAction("finance:delete_payment");

  const project = id ? getProjectById(id) : undefined;

  const formatCurrency = (val: number) => `â‚¹ ${(val || 0).toLocaleString()}`;

  const showDocumentVault = project?.vendorshipOwner === "MSS" || project?.dealOrigin === "VENDORSHIP_ONLY";

  
  const projectAccessDenied = useMemo(() => {
    if (!project) return false;
    return !isProjectVisibleToActor(
      project,
      buildProjectActorScopeContext({
        role: currentRole,
        actorMemberId: sessionUserId,
        actorDisplayName: demoUserName,
        quotations,
        enquiries,
        teams,
        employees,
        settingsTeamMembers,
        scheduledInstallations,
      }),
    );
  }, [
    project,
    currentRole,
    sessionUserId,
    demoUserName,
    quotations,
    enquiries,
    teams,
    employees,
    settingsTeamMembers,
    scheduledInstallations,
  ]);
  const quotation = project?.quotationId ? getQuotationById(project.quotationId) : undefined;
  const linkedCustomer = useMemo(
    () => (project?.customerId ? customers.find((c) => c.id === project.customerId) : undefined),
    [customers, project?.customerId],
  );
  const projectClientDisplay = useMemo(
    () => (project ? resolveProjectClientDisplay(project, linkedCustomer) : null),
    [linkedCustomer, project],
  );

  // Drop one-shot navigation flash once persisted `directCreationReason` is on the project (T7).
  useEffect(() => {
    if (!project || !directExceptionFlash?.trim()) return;
    if (!projectDirectExceptionReason(project)) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [directExceptionFlash, location.pathname, navigate, project]);

  const photoGalleryRef = useRef(project?.photoGallery);
  useEffect(() => {
    photoGalleryRef.current = project?.photoGallery;
  }, [project?.id, project?.photoGallery]);

  const projectQuotations = useMemo(() => {
    if (!project?.id) return [];
    return quotations.filter(
      (q) =>
        q.id === project.quotationId ||
        quotationLinkedProjectId(q) === project.id ||
        (Boolean(q.customerId) && q.customerId === project.customerId && !isQuotationConverted(q)),
    );
  }, [project, quotations]);

  // Existing data (current version)
  const projectInvoices = useMemo(
    () => [...invoices, ...(saleBills ?? [])].filter((invoice) => invoice.projectId === id),
    [id, invoices, saleBills],
  );
  const requiresClientInvoiceForCompletion = useMemo(
    () => (project ? projectRequiresClientInvoiceForCompletion(project) : true),
    [project],
  );
  const completionReadiness = useMemo(() => {
    if (!project || !id) return null;
    return evaluateProjectCompletionReadiness({
      projectId: id,
      project,
      projectInvoices,
      world: {
        projects: [project],
        invoices,
        saleBills: saleBills ?? [],
        expenses,
        incomes,
        blockages: blockages.filter((b) => b.projectId === id),
        accountingReviewQueue,
        attendanceRecords,
        partnerTransactions,
      },
    });
  }, [
    project,
    id,
    projectInvoices,
    invoices,
    saleBills,
    expenses,
    incomes,
    blockages,
    accountingReviewQueue,
    attendanceRecords,
    partnerTransactions,
  ]);
  const completionBlockReason = completionReadiness?.primaryBlocker ?? null;
  const projectPayments = useMemo(
    () => payments.filter((payment) => payment.projectId === id),
    [id, payments],
  );
  const projectExpenses = useMemo(
    () => expenses.filter((expense) => expense.projectId === id),
    [id, expenses],
  );
  const projectSitesFiltered = useMemo(
    () => sites.filter((site) => site.projectId === id),
    [id, sites],
  );

  // Old features: blockages, tickets, timeline, client payments
  const projectBlockages = id ? getBlockagesByProjectId(id) : [];
  const projectTickets = id ? getOperationalTicketsByProjectId(id) : [];
  const projectTimeline = id ? getProjectTimelineForProject(id) : null;
  const clientPayments = id ? getClientPaymentRecordsByProject(id) : [];
  const projectFieldTasks = useMemo(() => (id ? getTasksByProjectId(id) : []), [getTasksByProjectId, id]);
  const projectSites = useMemo(() => (id ? getSitesByProjectId(id) : []), [id, getSitesByProjectId]);
  const hasSiteChecklistDrift = useMemo(() => {
    if (!project?.id || !canDo("project:update_commercial")) return false;
    return findStaleSiteChecklistNeedToGetDrift(_projects, sites, globalInvItems).some(
      (row) => row.projectId === project.id,
    );
  }, [_projects, canDo, globalInvItems, project?.id, sites]);

  // Categorize expenses
  const projExpenses = getExpensesByProject(project?.id ?? "");
  const transportExpenses = projExpenses.filter(e => e.category === "Transport");
  const labourExpenses = projExpenses.filter(e => e.category === "Labour" && e.subCategory !== "Outsourced");
  const materialExpenses = projExpenses.filter(e => e.category === "Material" || e.category === "Inventory");
  const outsourcedWorkRows = useMemo(() => projExpenses.filter(e => e.subCategory === "Outsourced").map(expenseToOutsourcedWorkRow), [projExpenses]);
  const _foodExpenses = projExpenses.filter(e => e.category === "food").map(e => ({ id: e.id, date: e.date, description: e.description || e.subCategory || "Food expense", whoPaid: !e.paidBy ? "Company" : e.paidBy.type === "company" ? "Company" : (e.paidBy.entityName || "Employee"), amount: e.amount }));
  const _otherExpenses = projExpenses.filter(e => e.category === "other").map(e => ({ id: e.id, date: e.date, description: e.description || e.subCategory || "Other expense", whoPaid: !e.paidBy ? "Company" : e.paidBy.type === "company" ? "Company" : (e.paidBy.entityName || "Employee"), amount: e.amount }));

  const _transportTotal = transportExpenses.reduce((s, e) => s + e.amount, 0);
  const inHouseLabourTotal = labourExpenses.reduce((s, e) => s + e.amount, 0);
  const outsourcedTotal = outsourcedWorkRows.reduce((s, e) => s + e.total, 0);
  const _labourTotal = inHouseLabourTotal + outsourcedTotal;
  const _materialTotal = materialExpenses.reduce((s, e) => s + e.amount, 0);

  const _projectDocumentedRevenue = useMemo(() => {
    if (!id) return 0;
    return [...invoices, ...(saleBills ?? [])].filter(i => i.projectId === id).reduce((s, i) => s + (i.total ?? 0), 0);
  }, [id, invoices, saleBills]);

  // Inventory items for material assignment
  const inventoryItems = globalInvItems.map(item => ({
    id: item.id, name: item.size ? `${item.name} (${item.size})` : item.name,
    quantity: item.stock, unitPrice: item.buyPrice, unit: item.unit, category: item.category, size: item.size, allowDecimalReturn: item.allowDecimalReturn,
  }));

  const _employeesList = employees.map(emp => ({ id: emp.id, name: emp.name, role: emp.role, salary: emp.salary, initial: emp.name.charAt(0) }));

  // Attendance rows for this project - filter by site IDs that belong to this project
  const projectSiteIds = sites.filter(s => s.projectId === project?.id).map(s => String(s.id));
  const attendanceRows = attendanceRecords
    .filter((record) => projectSiteIds.some(sid => record.sites?.includes(sid)))
    .map((record) => ({
      ...record,
      employeeName: employees.find((employee) => employee.id === record.employeeId)?.name ?? `Employee ${record.employeeId}`,
    }));

  // Modal states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSiteVisitOpen, setIsSiteVisitOpen] = useState(false);
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);
  const [isAdditionalWorkOpen, setIsAdditionalWorkOpen] = useState(false);

  const projectChangeRequests = useMemo(
    () => (id ? getChangeRequestsByProject(id) : []),
    [id, getChangeRequestsByProject],
  );
  const [taskAssignmentOpen, setTaskAssignmentOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isArchiveProjectOpen, setIsArchiveProjectOpen] = useState(false);
  const [archiveProjectReason, setArchiveProjectReason] = useState("");
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteWorkStart, setNewSiteWorkStart] = useState(() => new Date().toISOString().split("T")[0]);
  const [newSiteStatus, setNewSiteStatus] = useState<"active" | "completed" | "on-hold">("active");
  const [executionNotesDraft, setExecutionNotesDraft] = useState("");

  useEffect(() => {
    if (!project) return;
    setExecutionNotesDraft(project.executionNotes ?? "");
    // Intentionally narrow deps: only re-sync the draft when the project switches or the persisted note changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.executionNotes]);

  // Edit project form state
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectClient, setEditProjectClient] = useState("");
  const [editProjectLocation, setEditProjectLocation] = useState("");
  const [editProjectCapacity, setEditProjectCapacity] = useState("");
  const [editProjectContractValue, setEditProjectContractValue] = useState("");
  const [editKind, setEditKind] = useState<Project["projectKind"]>(project?.projectKind || "SOLO_EPC");
  const [editProjectType, setEditProjectType] = useState<Project["projectType"]>(project?.projectType || "Residential");
  const [editStartDate, setEditStartDate] = useState(project?.startDate || "");
  const [editCustomerId, setEditCustomerId] = useState(project?.customerId || "");
  const [editPartnerId, setEditPartnerId] = useState(project?.partners?.[0]?.partnerId || "");
  const [editPartnerType, setEditPartnerType] = useState<ProjectPartnerType>(project?.partners?.[0]?.partnerType || "profit");
  const [editPartnerShare, setEditPartnerShare] = useState("");
  const [editEndDate, setEditEndDate] = useState(project?.endDate || "");
  const [editLifecycleStatus, setEditLifecycleStatus] = useState<ProjectLifecycleStatus>(
    project?.lifecycleStatus ?? "New",
  );
  const [editProgressStage, setEditProgressStage] = useState(project?.progressStage || "");

  // Site checklist template choice
  const [siteTemplateChoice, setSiteTemplateChoice] = useState<Record<number, string>>({});
  const _defaultSiteTemplateId = useMemo(() => {
    const pt = project?.projectType;
    if (pt === "Commercial" || pt === "Industrial") return siteChecklistTemplates.find(t => t.segment === "commercial")?.id ?? siteChecklistTemplates[0]?.id ?? "";
    return siteChecklistTemplates.find(t => t.segment === "residential")?.id ?? siteChecklistTemplates[0]?.id ?? "";
  }, [project?.projectType, siteChecklistTemplates]);

  // Derived project status
  const projectLifecycle = project?.lifecycleStatus ?? "New";
  const isProjectCompleted =
    projectLifecycle === "Completed" || projectLifecycle === "Closed";
  const canViewCommercial = useCan("projectCommercial", "view");
  const canMarkProjectComplete =
    useCan("projectCommercial", "edit") || useCan("projectExecution", "edit");
  const canApproveChangeRequest = useCanAction("approval:resolve");
  const canCreateInvoice = useCanAction("finance:create_invoice");
  const ceoReadOnly = useCeoOperationalReadOnly();
  const canWriteInvoice = allowOperationalWrite(ceoReadOnly, canCreateInvoice);
  const canWriteExpense = allowOperationalWrite(
    ceoReadOnly,
    canPerformAction(currentRole, "finance:record_expense_income"),
  );
  const canWriteExecution = allowOperationalWrite(
    ceoReadOnly,
    canPerformAction(currentRole, "project:update_execution"),
  );
  const canWriteProjectComplete = allowOperationalWrite(ceoReadOnly, canMarkProjectComplete);
  const [showFinancialDetail, setShowFinancialDetail] = useState(false);
  const hasFinancialDetail = Boolean(
    project?.bankDocumentationAmount || project?.totalPartnerInvestment || project?.mssBackendAmount ||
    project?.externalVendorshipEntity || project?.loanReceiptHandling || project?.cashHandling ||
    project?.incScope || project?.vendorNetworkCommissionType || project?.commercialBaseline?.capturedAt,
  );
  const currentLifecycle = project?.lifecycleStatus ?? "New";
  const lifecycleTransitions: ProjectLifecycleStatus[] = (["New", "In Progress", "On Hold", "Completed", "Closed"] as ProjectLifecycleStatus[]).filter(
    (to) => canTransitionProjectStatus(currentLifecycle, to, currentRole ?? "admin"),
  );

  const openEditProjectModal = () => {
    if (project) {
      setEditProjectName(project.name);
      setEditProjectClient(project.client);
      setEditProjectLocation(project.location);
      setEditProjectCapacity((project.capacity || "").replace(" kW", ""));
      setEditProjectContractValue(project.contractAmount.toString());
      setEditKind(project.projectKind);
      setEditProjectType(project.projectType);
      setEditStartDate(project.startDate);
      setEditCustomerId(project.customerId);
      setEditEndDate(project.endDate || "");
      setEditLifecycleStatus(project.lifecycleStatus ?? "New");
      setEditProgressStage(project.progressStage || "");
      const p = project.partners?.[0];
      setEditPartnerId(p?.partnerId || "");
      setEditPartnerType(p?.partnerType || "profit");
      setEditPartnerShare((p?.sharePercentage ?? p?.fixedAmount ?? p?.feeAmount ?? "").toString());
    }
    setIsEditProjectOpen(true);
  };

  // Re-populate edit fields whenever edit sheet opens to avoid stale state
  useEffect(() => {
    if (isEditProjectOpen) openEditProjectModal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditProjectOpen]);

  const handleSaveEditProject = () => {
    if (!project) return;
    
    const partnerData: ProjectPartner[] | undefined = editKind !== "SOLO_EPC" && editPartnerId ? [{
      partnerId: editPartnerId,
      partnerName: partners.find(p => p.id === editPartnerId)?.name || "Unknown",
      partnerType: editPartnerType,
      sharePercentage: editPartnerType === "profit" ? parseFloat(editPartnerShare) : undefined,
      fixedAmount: editPartnerType === "fixed" ? parseFloat(editPartnerShare) : undefined,
      feeAmount: editPartnerType === "vendorship" ? parseFloat(editPartnerShare) : undefined,
      calculatedEarning: 0,
      settlementDirection: "company_pays_partner"
    }] : undefined;

    updateProject(project.id, {
      name: editProjectName || project.name,
      client: customers.find(c => c.id === editCustomerId)?.name || editProjectClient || project.client,
      customerId: editCustomerId,
      location: editProjectLocation || project.location,
      capacity: editProjectCapacity.toLowerCase().includes("kw") ? editProjectCapacity : `${editProjectCapacity || "0"} kW`,
      contractAmount: parseFloat(editProjectContractValue) || 0,
      projectKind: editKind,
      projectType: editProjectType,
      startDate: editStartDate,
      endDate: editEndDate || undefined,
      lifecycleStatus: editLifecycleStatus,
      status: legacyStatusFromLifecycle(editLifecycleStatus),
      progressStage: editProgressStage || undefined,
      partners: partnerData
    });
    setLastConfirm({ variant: "success", title: "Project updated", description: `${editProjectName || project.name} has been updated successfully` });
    setIsEditProjectOpen(false);
  };

  const handleMarkProjectCompleted = () => {
    if (!project || !id) return;
    const block = completionBlockReason;
    if (block) {
      toast({ title: "Cannot complete project", description: block, variant: "destructive" });
      return;
    }
    updateProject(project.id, {
      lifecycleStatus: "Completed",
      status: legacyStatusFromLifecycle("Completed"),
      endDate: new Date().toISOString().slice(0, 10),
    });
    const invoiceParams = new URLSearchParams({
      from: "project", client: project.client,
      address: project.clientAddress || "", contact: project.clientPhone || "",
      state: COMPANY_STATE_CODE, project: project.name, amount: project.contractAmount.toString(), projectId: id,
    });
    if (project.quotationId) invoiceParams.set("quotationId", project.quotationId);
    const invoiceUrl = `/invoices?${invoiceParams.toString()}`;
    setTimeout(() => {
      const suggestInvoice = requiresClientInvoiceForCompletion && canCreateInvoice;
      toast({
        title: "Project marked complete",
        description: suggestInvoice
          ? "Create a final invoice when you are ready."
          : requiresClientInvoiceForCompletion
            ? "Project is complete. Invoice creation requires admin or management."
            : "Project is complete.",
        action: suggestInvoice ? (
          <ToastAction altText="Create Invoice" onClick={() => navigate(invoiceUrl)}>
            Create Invoice
          </ToastAction>
        ) : undefined,
      });
    }, 200);
  };

  const handleOpenNewInvoiceForProject = () => {
    if (!project || !id) return;
    const customer = customers.find((c) => c.id === project.customerId);
    const paidIn = projectPayments
      .filter((payment) => payment.direction === "in")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const outstanding = Math.max(0, project.contractAmount - paidIn);
    const draft = buildProjectToInvoiceDraft(project, customer, outstanding);
    saveCreateDraft("invoice-create-draft", draft);
    navigate(`/invoices?createFrom=proj:${id}`);
  };

  const handleOpenExpenseForProject = () => {
    if (!project) return;
    if (isProjectCompleted) {
      toast({ title: "Project Completed", description: "Reactivate to make changes.", variant: "destructive" });
      return;
    }
    saveCreateDraft("expense-create-draft", buildProjectToExpenseDraft(project));
    setIsAddExpenseOpen(true);
  };

  const handleReconcileSiteVisit = (visitId: string) => {
    const result = reconcileSiteVisitToChecklist(visitId);
    if (!result.ok) {
      toast({
        title: "Could not reconcile",
        description: friendlyCommandErrorMessage(result.error, "Could not reconcile site visit."),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Reconciled to checklist", description: "New inventory lines were added to the site checklist." });
  };

  const handleSaveNewSite = () => {
    if (!project || !id || !newSiteName.trim()) {
      toast({ title: "Site name required", description: "Enter a site name.", variant: "destructive" });
      return;
    }
    const nextId = sites.length ? Math.max(...sites.map((s) => s.id)) + 1 : 1;
    addSite({
      id: nextId,
      name: newSiteName.trim(),
      projectId: id,
      projectName: project.name,
      workStartDate: newSiteWorkStart,
      status: newSiteStatus,
      checklistItems: [],
    });
    toast({ title: "Site added", description: `${newSiteName.trim()} saved for this project.` });
    setIsAddSiteOpen(false);
    setNewSiteName("");
  };

  const handleSaveExecutionNotes = () => {
    if (!project) return;
    updateProject(project.id, { executionNotes: executionNotesDraft });
    toast({ title: "Execution notes saved" });
  };

  const MAX_PROJECT_PHOTO_BYTES = 4 * 1024 * 1024;

  const handleProjectPhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Choose an image file.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_PROJECT_PHOTO_BYTES) {
      toast({ title: "File too large", description: "Maximum size is 4 MB per photo.", variant: "destructive" });
      return;
    }
    const pid = project.id;
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      const nextGallery = [...(photoGalleryRef.current ?? []), { id: generateId("PHO"), url, uploadedAt: new Date().toISOString() }];
      photoGalleryRef.current = nextGallery;
      updateProject(pid, { photoGallery: nextGallery, photos: nextGallery.length });
      toast({ title: "Photo added" });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProjectPhoto = (photoId: string) => {
    if (!project) return;
    const nextGallery = (project.photoGallery ?? []).filter((p) => p.id !== photoId);
    photoGalleryRef.current = nextGallery.length ? nextGallery : undefined;
    updateProject(project.id, {
      photoGallery: nextGallery.length ? nextGallery : undefined,
      photos: nextGallery.length,
    });
  };

  // Materials tab helpers
  const getPresetItems = () => {
    if (quotation?.presetSnapshot) return quotation.presetSnapshot.map(item => ({ id: item.id, itemName: item.name, category: "Material", quantity: item.quantity, unit: item.unit }));
    if (project?.presetId) {
      const preset = siteChecklistTemplates.find(p => p.id === project.presetId);
      if (preset) return preset.items.map((item, idx) => ({ id: idx + 1, itemName: item.name, category: "Material", quantity: item.quantity, unit: item.unit }));
    }
    return [];
  };
  const getProjectMaterialsForTab = () => {
    const ledger = project?.siteMaterialLedger;
    if (ledger?.length) return ledger.map(entry => { const inv = globalInvItems.find(i => i.id === entry.itemId); return { id: entry.itemId, name: inv?.size ? `${inv.name} (${inv.size})` : inv?.name ?? `Item ${entry.itemId}`, totalQuantitySent: entry.issuedQty, unitPrice: inv?.buyPrice ?? 0, unit: inv?.unit || "pcs", category: inv?.category || "Material", issues: [{ date: entry.updatedAt.split("T")[0], quantity: entry.issuedQty }] }; });
    return [];
  };

  if (!project || projectAccessDenied) {
    return (
      <PageShell className="space-y-4">
        <StickyPageHeader breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: "Not found" }]} />
        <Card><CardContent className="py-8">
          <p className="text-sm text-muted-foreground">
            {projectAccessDenied
              ? "This project is outside your role scope."
              : "Project not found."}
          </p>
          <Button className="mt-4" variant="outline" type="button" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </CardContent></Card>
      </PageShell>
    );
  }

  
  const kind = canonicalProjectKind(project);
  const projectMode = canonicalProjectMode(project);
  const showsClientInvoices = projectShowsClientInvoices(project);
  const primaryPartyLabel = projectPrimaryPartyLabel(project, kind);
  const dealOriginBadge = (
    <Badge className={`${PROJECT_KIND_UI_TONES[kind] ?? "bg-slate-100 text-slate-800"} hover:opacity-90 border`}>
      {projectKindUiLabel(kind)}
    </Badge>
  );
  const billerText = (() => {
    if (kind === "INC_GIVEN") {
      const giverId = project.scope?.incGiverCompanyId;
      return giverId ? getINCGiverCompanyById(giverId)?.name ?? "INC giver" : "INC giver";
    }
    if (kind === "VENDORSHIP_ONLY") {
      const coId = project.scope?.vendorshipCompanyId;
      const co = coId ? vendorshipCompanies?.find((c) => c.id === coId) : undefined;
      return co?.name ?? "External code owner";
    }
    switch (project.vendorshipOwner) {
      case "MSS":
        return "MSS (Direct)";
      case "PARTNER":
      case "partner":
        return "Partner";
      case "THIRD_PARTY":
        return "Third Party Code";
      case "none":
        return "N/A";
      default:
        return "Unknown";
    }
  })();
  const kpiTitle =
    kind === "VENDORSHIP_ONLY"
      ? "Vendorship Fee"
      : kind === "INC_GIVEN"
        ? "Work Value"
        : "Contract Value";
  const kpiAmount =
    kind === "VENDORSHIP_ONLY"
      ? project.vendorshipFeeReceivable ?? project.scope?.vendorshipFeeAmount ?? project.contractAmount
      : project.contractAmount;
  const showCollectedProgress = showsClientInvoices || kind === "INC_GIVEN";
  const partnerRow = resolveProjectPartnerRow(project);
  const linkedPartner = partnerRow
    ? partners.find((partner) => partner.id === partnerRow.partnerId)
    : undefined;
  const billed = projectInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = projectPayments.filter((payment) => payment.direction === "in").reduce((sum, payment) => sum + payment.amount, 0);
  // BL-1: actualCost is derived from linked expenses when project.totalCost is not stored.
  // Profit must use the same derived cost Ã”Ã‡Ã¶ otherwise profit collapses to contractAmount
  // when totalCost is 0/undefined (the historical "Profit == Contract" bug).
  const actualCost = project.totalCost && project.totalCost > 0
    ? project.totalCost
    : projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  // BL-5: Three distinct profit lenses (see audit report Round 3 BL-5).
  // - expectedProfit:  contract Ã”ÃªÃ† cost (what we'll earn if the deal completes as priced)
  // - accrualProfit:   billed   Ã”ÃªÃ† cost (what's already earned in books)
  // - realizedProfit:  collected Ã”ÃªÃ† cost (what's earned in cash)
  const projectProfit = (project.contractAmount || 0) - actualCost;
  const accrualProfit = billed - actualCost;
  const realizedProfit = collected - actualCost;
  const partnerEarning = partnerRow
    ? calculateProjectPartnerEarning({ ...project, totalCost: actualCost }, partnerRow)
    : 0;
  const vendorshipFee = partnerRow ? calculateProjectVendorshipFee(partnerRow) : 0;
  const partnerProjectTransactions = partnerRow ? partnerTransactions.filter((txn) => txn.partnerId === partnerRow.partnerId && txn.projectId === project.id) : [];
  const partnerPaid = partnerProjectTransactions.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const partnerReceived = partnerProjectTransactions.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const _pendingToPartner = Math.max(0, partnerEarning - partnerPaid);
  const _pendingFromPartner = Math.max(0, vendorshipFee - partnerReceived);
  const companyRetainedRevenue = project.contractAmount - partnerEarning;
  const _companyNet = kind === "VENDOR_NETWORK" ? projectProfit + vendorshipFee : companyRetainedRevenue - actualCost;

  const scope = project.scope;
  const docLabel = scope?.vendorshipOwner === "MSS" ? "Document Creator" : "Document Vault";
  const tabDefs = filterWorkTabsByRole(filterWorkTabsBySnapshot(project, docLabel), currentRole);
  const workTabs = (() => {
    let tabs = tabDefs;
    if (projectShowsOutsourceSection(project) && !tabs.some((t) => t.value === "outsource-execution")) {
      tabs = [
        ...tabs,
        { value: "outsource-execution", label: "Outsource Execution", snapshotKeys: ["outsource_execution"] },
      ];
    }
    return tabs;
  })();
  const defaultWorkTab = defaultProjectDetailTab(kind, workTabs);
  const tabParam = searchParams.get("tab");
  const activeWorkTab = workTabs.some((t) => t.value === tabParam) ? tabParam! : defaultWorkTab;
  const handleWorkTabChange = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", value);
        return next;
      },
      { replace: true },
    );
  };

  const projectSiteVisits = id ? getSiteVisitsByProject(id) : [];
  const projectReservations = id ? getReservationsForProject(id) : [];
  const projectSchedules = id ? getSchedulesByProject(id) : [];
  const projectMaterialDamage = id ? getDamageByProject(id) : [];

  const forbidMaterialDispatch = projectForbidsAction(project, "material_dispatch");
  const forbidWorkTracking = projectForbidsAction(project, "work_tracking");
  const forbidPartnerSettlement = projectForbidsAction(project, "partner_settlement");
  const forbidChannelFee = projectForbidsAction(project, "channel_fee");

  const contractDisplay = project?.contractAmount || 0;
  const _pendingDisplay = Math.max(0, contractDisplay - collected);

 
  return (
    <PageShell className="space-y-6 pb-20">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: project.name }]}
      />

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      {(projectDirectExceptionReason(project) || directExceptionFlash?.trim()) && (
        <DirectExceptionProjectBanner
          project={project}
          reasonOverride={directExceptionFlash}
        />
      )}

      {!isProjectCompleted && (
        <ProjectCompletionHelpBanner readiness={completionReadiness} />
      )}

      {project?.archivedAt && (
        <LifecycleTerminalBanner
          variant="archived"
          title="Project archived"
          description={
            <span>
              Archived on {new Date(project.archivedAt).toLocaleDateString()}
              {project.archivedReason ? <> â”¬Ã€ Reason: {project.archivedReason}</> : null}. Read-only Ã”Ã‡Ã¶ restore to make changes.
            </span>
          }
          primaryActionLabel="Unarchive"
          onPrimaryAction={() => {
            if (!project) return;
            updateProject(project.id, { archivedAt: null, archivedReason: undefined });
            setLastConfirm({ variant: "success", title: "Project restored", description: project.name });
          }}
        />
      )}
      {!project?.archivedAt && project?.status === "completed" && (
        <LifecycleTerminalBanner
          variant="completed"
          title="Project completed"
          description="All work signed off. Audit-only access Ã”Ã‡Ã¶ re-open from Project menu if rework is needed."
          primaryActionLabel="Open audit"
          onPrimaryAction={() => navigate("/audit/audit-logs")}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Main Identity Card (Takes up 2 cols on md screens) */}
        <Card className="md:col-span-2 bg-gradient-to-br from-slate-50 to-white shadow-sm border-slate-200">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.client}
                  </p>
                </div>
                {dealOriginBadge}
              </div>
              <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-4 w-4"/> {project.capacity}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4"/> {project.location || "No Location"}</span>
              </div>
              {project.agentName && kind === "SOLO_EPC" && (
                <p className="mt-2 text-xs text-muted-foreground">Referral agent: {project.agentName}</p>
              )}
            </div>
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</p>
                <Badge variant={project.lifecycleStatus === "Completed" ? "default" : "secondary"}>
                  {project.lifecycleStatus}
                </Badge>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{primaryPartyLabel}</p>
                <p className="font-semibold text-sm">{project.client}</p>
                {kind !== "INC_GIVEN" && kind !== "VENDORSHIP_ONLY" && (
                  <p className="text-2xs text-muted-foreground">Biller: {billerText}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPI */}
        {(showsClientInvoices || kind === "INC_GIVEN" || kind === "VENDORSHIP_ONLY") && (
        <Card className="shadow-sm">
          <CardContent className="p-6 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <IndianRupee className="h-5 w-5" />
              <span className="font-medium text-sm">{kpiTitle}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(kpiAmount)}</p>
            {showCollectedProgress && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{kind === "INC_GIVEN" ? "Collected from giver" : "Collected"}</span>
                <span className="font-medium text-emerald-600">{formatCurrency(project.amountReceived || 0)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div 
                  className="bg-emerald-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.min(100, ((project.amountReceived || 0) / (kpiAmount || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Audit / History Overview Card */}
        
        {/* Project Actions Panel */}
        <Card className="shadow-sm border-slate-200 bg-slate-50">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Quick Actions</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            {project?.archivedAt ? (
            !ceoReadOnly && (
              <Button size="sm" className="w-full" onClick={() => {
                updateProject(project.id, { archivedAt: null, archivedReason: undefined });
                setLastConfirm({ variant: "success", title: "Project restored", description: project.name });
              }}>
                <CheckCircle2 className="w-4 h-4 mr-2" /> Unarchive
              </Button>
            )
          ) : isProjectCompleted ? (
            <div className="flex flex-col gap-2 w-full">
              <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/audit/audit-logs")}>
                <FileText className="w-4 h-4 mr-2" /> Open Audit
              </Button>
              {canWriteInvoice && (
                <Button size="sm" className="w-full" onClick={handleOpenNewInvoiceForProject}>
                  <FileText className="w-4 h-4 mr-2" /> Invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full">
              {canWriteProjectComplete && (
                <Button 
                  size="sm" 
                  className="col-span-2 bg-success text-success-foreground hover:bg-success/90" 
                  disabled={Boolean(completionBlockReason)}
                  title={completionBlockReason ?? undefined}
                  onClick={handleMarkProjectCompleted}
                >
                  <CheckSquare className="w-4 h-4 mr-2" /> Complete Project
                </Button>
              )}
              {canWriteExecution && !forbidWorkTracking && (
                <Button size="sm" variant="outline" onClick={() => setTaskAssignmentOpen(true)}>
                  <ClipboardList className="w-4 h-4 mr-2" /> Task
                </Button>
              )}
              {canWriteExpense && (
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleOpenExpenseForProject}>
                  <Plus className="w-4 h-4 mr-2" /> Expense
                </Button>
              )}
              {!ceoReadOnly && (
                <Button size="sm" variant="outline" onClick={() => setIsSiteVisitOpen(true)}>
                  <MapPin className="w-4 h-4 mr-2" /> Site Visit
                </Button>
              )}
              {!ceoReadOnly && (
                <Button size="sm" variant="outline" onClick={() => openEditProjectModal()}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
              {!forbidWorkTracking && projectShowsOutsourceSection(project) && (
                <Button size="sm" variant="outline" onClick={() => handleWorkTabChange("outsource-execution")}>
                  <Users className="w-4 h-4 mr-2" /> Outsource
                </Button>
              )}
              <Button size="sm" variant="ghost" className="col-span-2 text-muted-foreground hover:text-foreground" onClick={() => {
                setArchiveProjectReason("");
                setIsArchiveProjectOpen(true);
              }}>
                Archive Project
              </Button>
            </div>
          )}
          </CardContent>
        </Card>


      </div>

      {/* Work area tabs â€” one panel visible at a time */}
      <Tabs value={activeWorkTab} onValueChange={handleWorkTabChange} className="mt-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          {workTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6 space-y-6">
          {workTabs.some((t) => t.value === "progress-report") && (
            <TabsContent value="progress-report" className="mt-0 space-y-4">
              <ProgressReportTab
            projectId={project.id}
            projectName={project.name}
            projectStatus={project.lifecycleStatus ?? project.status}
            blockages={projectBlockages}
            tickets={projectTickets}
            timelineStatus={projectTimeline}
            employees={employees}
            materialsSent={getProjectMaterialsForTab().map(m => ({ itemId: m.id, itemName: m.name, quantity: m.totalQuantitySent, dateIssued: m.issues[0]?.date || "" }))}
            projectPaymentType={project.paymentType}
            projectContractAmount={project.contractAmount}
            projectAmountReceived={project.amountReceived}
            clientPaymentRecordedTotal={clientPayments.reduce((sum, p) => sum + p.amount, 0)}
            onAddBlockage={(b) => addBlockage(b)}
            onResolveBlockage={(bId, res) =>
              resolveBlockage({
                id: bId,
                resolvedAt: res.resolvedAt,
                resolvedBy: res.resolvedBy,
                resolvedByName: res.resolvedByName,
                notesAppend: res.notes,
              })
            }
            onRecordClientCash={(amount, notes) =>
              recordCustomerInflow({
                path: "project_fifo",
                record: {
                  id: generateId("CPR"),
                  projectId: project.id,
                  date: new Date().toISOString().slice(0, 10),
                  amount,
                  paymentMode: "cash",
                  notes,
                  recordedAt: new Date().toISOString(),
                  paymentStage: "other",
                },
              })
            }
            onAddTicket={(t) => addOperationalTicket({ ...t, id: generateId("TKT"), createdAt: new Date().toISOString() })}
            onAddTask={(task) => addTask(task)}
            generateTaskId={() => generateId("TASK")}
            primarySiteId={sites.find((s) => s.projectId === project.id)?.id ?? project.id}
            primarySiteName={sites.find((s) => s.projectId === project.id)?.name ?? project.name}
            onUpdateTimeline={(updates) => updateProjectTimelineForProject(project.id, updates)}
            scope={project.scope}
            outsource={project.outsource ?? null}
            projectMode={project.projectMode}
              />
              {projectShowsMaterialSupplyToggle(project) && (
                <ProjectIncMaterialSection project={project} />
              )}
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "outsource-execution") && (
            <TabsContent value="outsource-execution" className="mt-0 space-y-4">
              <ProjectOutsourceSection project={project} />
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "field-operations") && (
            <TabsContent value="field-operations" className="mt-0 space-y-4">
              <Tabs defaultValue="team-schedule">
            <TabsList>
              <TabsTrigger value="team-schedule">Team &amp; Schedule</TabsTrigger>
              <TabsTrigger value="sites-tab">Sites</TabsTrigger>
              <TabsTrigger value="attendance-tab">Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="team-schedule" className="space-y-4 mt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <TabCard title={kind === "INC" ? "INC Execution Scope" : "Execution"} icon={<ClipboardList className="h-4 w-4 text-primary" />}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniMetric label="Start date" value={project.startDate} />
                    <MiniMetric label="End date" value={project.endDate ?? "Active"} />
                    <MiniMetric label="Sites" value={projectSitesFiltered.length} />
                    <MiniMetric label="Field tasks" value={projectFieldTasks.length} />
                  </div>
                </TabCard>
                <TabCard title="Field notes & milestones" icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}>
                  <p className="mb-2 text-xs text-muted-foreground">Log site progress, milestone completions, and follow-ups.</p>
                  <Textarea rows={5} value={executionNotesDraft} onChange={(e) => setExecutionNotesDraft(e.target.value)} placeholder="e.g. 12 Apr - Structure complete, awaiting DISCOM inspection..." className="text-sm" readOnly={ceoReadOnly} disabled={ceoReadOnly} />
                  {canWriteExecution && (
                  <div className="mt-3 flex justify-end">
                    <Button type="button" size="sm" onClick={handleSaveExecutionNotes}>Save notes</Button>
                  </div>
                  )}
                </TabCard>
              </div>
              <TabCard title="Site photos" icon={<Camera className="h-4 w-4 text-primary" />}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <input
                    id="project-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProjectPhotoAdd}
                  />
                  {!ceoReadOnly && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label htmlFor="project-photo-upload" className="cursor-pointer">
                      Add photo
                    </label>
                  </Button>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {(project.photoGallery?.length ?? project.photos ?? 0)} on file
                  </span>
                </div>
                {(project.photoGallery ?? []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {(project.photoGallery ?? []).map((ph) => (
                      <div key={ph.id} className="group relative aspect-video overflow-hidden rounded-md border bg-muted">
                        <img src={ph.url} alt="" className="h-full w-full object-cover" />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute right-1 top-1 h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleRemoveProjectPhoto(ph.id)}
                          aria-label="Remove photo"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ListEmptyState
                    density="compact"
                    icon={Camera}
                    title="No photos yet"
                    description="Upload site or handover images (stored in-browser for this prototype)."
                  />
                )}
              </TabCard>
            </TabsContent>

            <TabsContent value="sites-tab" className="mt-4">
              <TabCard title="Project Installation Sites" icon={<MapPin className="h-4 w-4 text-primary" />}>
                {projectSites.length > 0 && (
                  <div className="mb-4 flex justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setNewSiteName(""); setNewSiteWorkStart(new Date().toISOString().split("T")[0]); setNewSiteStatus("active"); setIsAddSiteOpen(true); }}>
                      <Plus className="mr-1 h-4 w-4" />Add site
                    </Button>
                  </div>
                )}
                {projectSites.length === 0 ? (
                  <ListEmptyState
                    density="compact"
                    icon={MapPin}
                    title="No sites for this project"
                    actionLabel={ceoReadOnly ? undefined : "Add site"}
                    onAction={ceoReadOnly ? undefined : () => { setNewSiteName(""); setNewSiteWorkStart(new Date().toISOString().split("T")[0]); setNewSiteStatus("active"); setIsAddSiteOpen(true); }}
                    className="rounded-lg border border-dashed bg-muted/20"
                  />
                ) : (
                  <div className="space-y-4">
                    {projectSites.map((site) => (
                      <Card key={site.id} className="overflow-hidden">
                        <CardHeader className="bg-muted/30 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="font-semibold">{site.name}</span>
                              <Badge variant="outline" className="text-2xs uppercase">{site.status || "Active"}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select value={siteTemplateChoice[site.id] || ""} onValueChange={(val) => setSiteTemplateChoice(prev => ({ ...prev, [site.id]: val }))}>
                                <SelectTrigger className="h-8 w-[200px]"><SelectValue placeholder="Select Checklist Preset" /></SelectTrigger>
                                <SelectContent>{getSiteChecklistPresets().map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8"
                                disabled={!siteTemplateChoice[site.id]}
                                onClick={() => {
                                  const preset = getSiteChecklistPresets().find(
                                    (p) => p.id === siteTemplateChoice[site.id],
                                  );
                                  if (!preset) return;
                                  const res = applySiteChecklistFromTemplate(
                                    project.id,
                                    site.id,
                                    preset,
                                  );
                                  if (res.ok) {
                                    toast({
                                      title: "Checklist Applied",
                                      description: `Applied ${preset.name} to ${site.name}`,
                                    });
                                  } else {
                                    toast({
                                      title: "Error",
                                      description: friendlyCommandErrorMessage(res.error),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Apply Preset
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          <DataTableShell variant="inline">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Material Item</TableHead>
                                <TableHead className="text-right">Required Qty</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {site.checklistItems?.length ? (
                                site.checklistItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.materialName}</TableCell>
                                    <TableCell className="text-right font-medium">{item.requiredQuantity}</TableCell>
                                    <TableCell>
                                      {item.status === "dispatched" ? (
                                        <Badge className="bg-primary/10 text-primary border-0 text-2xs"><CheckCircle2 className="w-3 h-3 mr-1" />Dispatched</Badge>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-2xs px-2 border-primary text-primary hover:bg-primary hover:text-white"
                                          onClick={async () => {
                                            const res = await dispatchSiteMaterial(
                                              project.id,
                                              site.id,
                                              item.id,
                                            );
                                            if (res.ok) {
                                              toast({
                                                title: "Material Dispatched",
                                                description: `${item.materialName} deducted from warehouse.`,
                                              });
                                            } else {
                                              toast({
                                                title: "Error",
                                                description: friendlyCommandErrorMessage(res.error),
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <Truck className="w-3 h-3 mr-1" />Dispatch
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableEmptyRow
                                  colSpan={3}
                                  icon={ClipboardList}
                                  title="No checklist items"
                                  description="Apply a preset above to initialize."
                                />
                              )}
                            </TableBody>
                          </DataTableShell>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabCard>
            </TabsContent>

            <TabsContent value="attendance-tab" className="space-y-4 mt-4">
              <TabCard title="Attendance Records" icon={<Users className="h-4 w-4 text-primary" />}>
                {attendanceRows.length === 0 ? (
                  <ListEmptyState density="compact" icon={Users} title="No attendance for this project yet" />
                ) : (
                  <DataTableShell variant="inline">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.date}</TableCell>
                          <TableCell>{row.employeeName}</TableCell>
                          <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTableShell>
                )}
              </TabCard>
              {(showsClientInvoices || kind === "INC_GIVEN") && (
              <ClientPaymentHistory
                projectId={project.id}
                clientName={project.client}
                contractAmount={project.contractAmount}
                payments={clientPayments}
                onRecordPayment={(payment) =>
                  recordCustomerInflow({
                    path: "project_fifo",
                    record: { ...payment, id: generateId("CPR"), recordedAt: new Date().toISOString() },
                  })
                }
                canDeletePayment={canDeleteClientPayment}
                onDeletePayment={(cprId) => deletePayment(clientPaymentRecordPaymentId(cprId))}
                partnerName={partnerRow?.partnerName}
                forbidPartnerSettlement={forbidPartnerSettlement}
              />
              )}
            </TabsContent>
          </Tabs>
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "financials") && (
            <TabsContent value="financials" className="mt-0 space-y-4">
              <ProjectInstallmentTracker project={project} timeline={projectTimeline ?? undefined} />
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
            <MiniMetric label={kind === "VENDORSHIP_ONLY" ? "Fee receivable" : kind === "INC_GIVEN" ? "Work value" : "Contract"} value={formatINR(kpiAmount)} />
            {showsClientInvoices && <MiniMetric label="Billed" value={formatINR(billed)} />}
            <MiniMetric label="Collected" value={formatINR(collected)} />
            {showsClientInvoices && (
              <MiniMetric label="Outstanding" value={formatINR(Math.max(0, (project.contractAmount || 0) - collected))} />
            )}
            <MiniMetric label="Actual Cost" value={formatINR(actualCost)} />
            {kind !== "VENDORSHIP_ONLY" && (
              <>
                <MiniMetric label="Profit" value={formatINR(projectProfit)} />
                <MiniMetric label="Margin" value={(project.contractAmount || 0) > 0 ? `${((projectProfit / (project.contractAmount || 1)) * 100).toFixed(1)}%` : "â€”"} />
              </>
            )}
          </div>
          {kind !== "VENDORSHIP_ONLY" && (
          <div className="grid gap-3 md:grid-cols-3 rounded-md border border-border/60 bg-muted/20 p-3">
            <MiniMetric
              label="Expected profit"
              value={formatINR(projectProfit)}
              hint="Contract âˆ’ Actual cost"
            />
            {showsClientInvoices && (
              <MiniMetric
                label="Accrual profit"
                value={formatINR(accrualProfit)}
                hint="Billed âˆ’ Actual cost"
              />
            )}
            <MiniMetric
              label="Realized profit"
              value={formatINR(realizedProfit)}
              hint="Collected âˆ’ Actual cost"
            />
          </div>
          )}

          {kind !== "VENDORSHIP_ONLY" && (
          <TabCard title="Change requests" icon={<FileText className="h-4 w-4 text-primary" />}>
            {project.quotationId && quotation && (
              <ProjectScopeChangeGuidance
                className="mb-4"
                projectId={project.id}
                quotationId={quotation.id}
                quotationNumber={quotation.quotationNumber}
              />
            )}
            <div className="mb-3 flex flex-wrap gap-2 justify-end">
              {kind === "INC_GIVEN" && !ceoReadOnly && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setIsAdditionalWorkOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Additional work
                </Button>
              )}
              {!ceoReadOnly && (
              <Button type="button" size="sm" onClick={() => setIsChangeRequestOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New change request
              </Button>
              )}
            </div>
            {projectChangeRequests.length === 0 ? (
              <ListEmptyState density="compact" icon={FileText} title="No change requests yet" />
            ) : (
              <DataTableShell variant="inline">
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectChangeRequests.map((cr) => {
                    const est = resolveChangeRequestDeltaAmount(project, cr);
                    return (
                      <TableRow key={cr.id}>
                        <TableCell className="capitalize">{cr.type.replace("-", " ")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cr.deltaKw ? `${cr.deltaKw} kW` : null}
                          {cr.deltaAmount ? ` ${formatINR(cr.deltaAmount)}` : null}
                          {!cr.deltaAmount && est > 0 ? ` ~${formatINR(est)}` : null}
                          {cr.materialDelta?.length ? ` â”¬Ã€ ${cr.materialDelta.length} material line(s)` : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {cr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {cr.status === "draft" && (
                            <>
                              <PermissionGatedButton
                                allowed={canApproveChangeRequest}
                                deniedHint={PERMISSION_DENIED_HINTS.changeRequestApprove}
                                type="button"
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  const res = approveProjectChangeRequest(cr.id);
                                  if (!res.ok) {
                                    toast({
                                      title: "Cannot approve",
                                      description: friendlyCommandErrorMessage(res.error, "Could not approve."),
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  toast({
                                    title: "Change request approved",
                                    description: res.generatedInvoiceNumber
                                      ? `Delta invoice ${res.generatedInvoiceNumber} issued to books.`
                                      : "Project commercial baseline updated.",
                                  });
                                  if (res.generatedInvoiceId) {
                                    navigate(`/invoices?invoice=${res.generatedInvoiceId}`);
                                  }
                                }}
                              >
                                Approve
                              </PermissionGatedButton>
                              <PermissionGatedButton
                                allowed={canApproveChangeRequest}
                                deniedHint={PERMISSION_DENIED_HINTS.changeRequestApprove}
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  rejectProjectChangeRequest(cr.id, "Rejected from project detail");
                                  toast({ title: "Change request rejected" });
                                }}
                              >
                                Reject
                              </PermissionGatedButton>
                            </>
                          )}
                          {cr.generatedInvoiceId && cr.status === "approved" && (() => {
                            const inv = projectInvoices.find((i) => i.id === cr.generatedInvoiceId);
                            const open =
                              inv &&
                              inv.status !== "draft" &&
                              inv.status !== "voided" &&
                              inv.total - (inv.amountReceived ?? 0) > 0.01;
                            return (
                              <span className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="link"
                                  className="h-8"
                                  onClick={() =>
                                    navigate(`/invoices?invoice=${cr.generatedInvoiceId}`)
                                  }
                                >
                                  {inv?.invoiceNumber ?? "View invoice"}
                                </Button>
                                {open && inv && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => {
                                      saveCreateDraft(
                                        "payment-create-draft",
                                        buildInvoiceToPaymentDraft(inv),
                                      );
                                      navigate(
                                        `/invoices?invoice=${cr.generatedInvoiceId}&recordPayment=1`,
                                      );
                                    }}
                                  >
                                    Record payment
                                  </Button>
                                )}
                              </span>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTableShell>
            )}
            {(project.additionalWorkLines?.length ?? 0) > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-medium">Additional work (INC)</h3>
                <DataTableShell variant="inline">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Basis</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.additionalWorkLines!.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell className="capitalize">{line.basis.replace("_", " ")}</TableCell>
                        <TableCell className="text-right">{formatINR(line.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </>
            )}
          </TabCard>
          )}

          {/* Invoices - only for kinds that bill */}
          {!showsClientInvoices && (
            <p className="text-sm text-muted-foreground rounded-md border border-dashed px-3 py-2 bg-muted/20">
              {kind === "INC_GIVEN"
                ? "Client invoices are not used for INC-given work â€” collections from the INC giver are tracked below."
                : "This project kind does not use MSS client invoicing."}
            </p>
          )}

          {showsClientInvoices && (
            <TabCard title="Invoices" icon={<ReceiptText className="h-4 w-4 text-primary" />}>
              {canWriteInvoice && (
              <div className="mb-3 flex justify-end">
                <Button type="button" size="sm" onClick={handleOpenNewInvoiceForProject}>
                  <Plus className="mr-1 h-4 w-4" />New invoice
                </Button>
              </div>
              )}
              <DataTableShell variant="inline">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.invoiceDate}</TableCell>
                      <TableCell><Badge variant="outline">{invoice.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatINR(invoice.total)}</TableCell>
                      <TableCell className="text-right">{formatINR(invoice.amountReceived ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
              {projectPayments.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 text-sm font-medium">Payment Flow</h3>
                  <DataTableShell variant="inline">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.date}</TableCell>
                          <TableCell>{payment.reference ?? "other"}</TableCell>
                          <TableCell><PaymentRecipient payment={payment} /></TableCell>
                          <TableCell>{payment.paymentMode}</TableCell>
                          <TableCell className="text-right">{formatINR(payment.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </DataTableShell>
                </>
              )}
            </TabCard>
          )}

          {/* Expenses */}
          <TabCard title="Expenses" icon={<IndianRupee className="h-4 w-4 text-primary" />}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="grid flex-1 gap-3 md:grid-cols-3">
                {!forbidMaterialDispatch && (
                  <MiniMetric label="Material" value={formatINR(projectExpenses.filter((e) => e.category === "Material").reduce((s, e) => s + e.amount, 0))} />
                )}
                <MiniMetric label="Labour" value={formatINR(projectExpenses.filter((e) => e.category === "Labour").reduce((s, e) => s + e.amount, 0))} />
                <MiniMetric label="Total" value={formatINR(actualCost)} />
              </div>
              {canWriteExpense && (
              <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />Add expense
              </Button>
              )}
            </div>
            <DataTableShell variant="inline">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.category}{expense.subCategory ? <span className="text-muted-foreground"> / {expense.subCategory}</span> : null}</TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{expense.notes ?? expense.description ?? ""}</TableCell>
                    <TableCell className="text-right">{formatINR(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          </TabCard>
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "materials-sent") && (
            <TabsContent value="materials-sent" className="mt-0 space-y-4">
              {hasSiteChecklistDrift ? <SiteChecklistDriftBanner /> : null}
              {forbidMaterialDispatch ? (
            <Card><CardContent className="py-8 text-sm text-muted-foreground">Material dispatch is disabled for this project kind.</CardContent></Card>
          ) : (
          <MaterialsSentTab
            projectName={project.name}
            projectId={project.id}
            materials={getProjectMaterialsForTab()}
            presetItems={getPresetItems().map(p => ({ id: p.id, name: p.itemName, quantity: p.quantity, unit: p.unit }))}
            inventoryItems={inventoryItems}
            siteChecklist={project.siteChecklist ?? []}
            isSuperAdmin={canDo("project:update_commercial")}
            onUpdateSiteChecklist={(next) => { updateProject(project.id, { siteChecklist: next } as Partial<typeof project>); }}
            executionLineItems={project.executionLineItems ?? []}
            onIssueMaterials={async (items, _exp, _task, meta) => {
              const gid =
                meta?.movementGroupId ??
                (typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `mvg-${Date.now()}`);
              for (const item of items) {
                await recordProjectMaterialMovement({
                  projectId: project.id,
                  itemId: item.id,
                  movementType: "IssueToSite",
                  quantity: item.quantity,
                  clientRequestId: `${gid}:issue:${item.id}:${item.quantity}`,
                });
              }
            }}
            onReturnMaterial={async (itemId, qty, movMeta) => {
              await recordProjectMaterialMovement({
                projectId: project.id,
                itemId,
                movementType: "ReturnToWarehouse",
                quantity: qty,
                clientRequestId: movMeta?.clientRequestId,
              });
              return { ok: true };
            }}
            onScrapMaterial={async (itemId, qty, movMeta) => {
              await recordProjectMaterialMovement({
                projectId: project.id,
                itemId,
                movementType: "ScrapSite",
                quantity: qty,
                clientRequestId: movMeta?.clientRequestId,
              });
              return { ok: true };
            }}
            onConsumeMaterial={async (itemId, qty, movMeta) => {
              await recordProjectMaterialMovement({
                projectId: project.id,
                itemId,
                movementType: "ConsumptionAtSite",
                quantity: qty,
                clientRequestId: movMeta?.clientRequestId,
              });
              return { ok: true };
            }}
          />
          )}
          {!forbidMaterialDispatch && (
            <TabCard title="Material reservations" icon={<Package className="h-4 w-4 text-primary" />}>
              {projectReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active reservations. Checklist lines auto-reserve stock when added to the site checklist.
                </p>
              ) : (
                <DataTableShell variant="inline">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectReservations.map((res) => {
                      const inv = globalInvItems.find((i) => i.id === res.itemId);
                      const label = inv?.size ? `${inv.name} (${inv.size})` : inv?.name ?? `Item #${res.itemId}`;
                      return (
                        <TableRow key={res.id}>
                          <TableCell className="font-medium">{label}</TableCell>
                          <TableCell className="text-right tabular-nums">{res.qty}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-2xs capitalize">
                              {res.source.replace(/-/g, " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </DataTableShell>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Reservations reduce effective stock for other projects in Need-to-get and procurement views.
              </p>
            </TabCard>
          )}
          {projectMaterialDamage.length > 0 && (
            <TabCard title="Material damage log" icon={<AlertTriangle className="h-4 w-4 text-destructive" />}>
              <DataTableShell variant="inline">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectMaterialDamage.map((dmg) => {
                    const inv = globalInvItems.find((i) => i.id === dmg.itemId);
                    return (
                      <TableRow key={dmg.id}>
                        <TableCell>{inv?.name ?? `Item #${dmg.itemId}`}</TableCell>
                        <TableCell className="capitalize">{dmg.stage}</TableCell>
                        <TableCell className="text-right">{dmg.qty}</TableCell>
                        <TableCell className="text-right">
                          {dmg.costImpact != null ? formatINR(dmg.costImpact) : "Ã”Ã‡Ã¶"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={dmg.notes}>
                          {dmg.notes?.trim() || "Ã”Ã‡Ã¶"}
                          {(dmg.photoUrls?.length ?? 0) > 0 && (
                            <span className="block text-2xs text-muted-foreground/80">
                              {dmg.photoUrls!.length} photo URL(s)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </DataTableShell>
            </TabCard>
          )}
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "team-roster") && (
            <TabsContent value="team-roster" className="mt-0 space-y-4">
              <TeamRosterTab project={project} />
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "document-creator") && (
            <TabsContent value="document-creator" className="mt-0 space-y-4">
              <ProjectDocumentsStudio
            project={project}
            quotation={quotation}
            updateProject={updateProject}
            generateId={generateId}
          />
            </TabsContent>
          )}

          {workTabs.some((t) => t.value === "vendorship") && (
            <TabsContent value="vendorship" className="mt-0 space-y-4">
              <TabCard title="Partner Economics" icon={<Users className="h-4 w-4 text-accent-foreground" />}>
            {(forbidPartnerSettlement || forbidChannelFee) && (
              <div className="mb-4 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                {forbidPartnerSettlement && (
                  <p>This project kind does not model partner settlement in MSS; record partner payouts only on projects where settlement applies.</p>
                )}
                {forbidChannelFee && (
                  <p>Channel / billing-fee offsets are not tracked for this project kind.</p>
                )}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-4">
              <MiniMetric label="Lead Origin" value={project.scope?.leadSource === "PARTNER" ? "Partner Network" : "Direct / Other"} />
              <MiniMetric label="Vendorship Fee" value={formatINR(project.scope?.vendorshipFeeAmount || 0)} />
              <MiniMetric
                label="Billing Fee (%)"
                value={forbidChannelFee ? "Ã”Ã‡Ã¶" : `${project.scope?.partnerBillingFeePercentage || 0}%`}
              />
              <MiniMetric label="Partner Earning" value={formatINR(partnerEarning)} />
            </div>
            
            {project.scope?.leadSource === "PARTNER" && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-3">
                <div className="flex items-center gap-2 font-medium text-primary">
                  <Handshake className="w-4 h-4" />
                  <span>Commercial Agreements</span>
                </div>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex justify-between">
                    <span>Vendorship Code Owner:</span>
                    <span className="text-foreground font-medium uppercase">{project.scope.vendorshipOwner}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Billing Responsibility:</span>
                    <span className="text-foreground font-medium uppercase">{project.scope.billingParty}</span>
                  </li>
                  {project.scope.partnerBillingFeePercentage ? (
                    <li className="flex justify-between">
                      <span>Billing Offset (GST Recovery):</span>
                      <span className="text-warning font-medium">-{project.scope.partnerBillingFeePercentage}% from profit</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            )}

            {linkedPartner && (
              <Button className="mt-4" variant="outline" size="sm" asChild>
                <Link to={`/partners/${linkedPartner.id}`}>Open partner profile</Link>
              </Button>
            )}
          </TabCard>
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* MODALS */}

      {/* Edit Project Modal */}
      <Sheet open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
            <SheetDescription>Update project details</SheetDescription>
          </SheetHeader>
          <CeoReadOnlySheetBanner className="py-2" />
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Project Name</Label>
                <Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} disabled={ceoReadOnly} readOnly={ceoReadOnly} />
              </div>
              
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={editCustomerId} onValueChange={setEditCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Deal Type</Label>
                <Select value={editKind} onValueChange={(v: any) => setEditKind(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLO_EPC">Solo</SelectItem>
                    <SelectItem value="PARTNER_EPC">Partner</SelectItem>
                    <SelectItem value="FIXED_EPC">Fixed</SelectItem>
                    <SelectItem value="VENDOR_NETWORK">Vendorship</SelectItem>
                    <SelectItem value="INC">INC</SelectItem>
                    <SelectItem value="INC_GIVEN">INC Given</SelectItem>
                    <SelectItem value="OUTSOURCED_INC">Outsourced INC</SelectItem>
                    <SelectItem value="VENDORSHIP_ONLY">Vendorship Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project Type</Label>
                <Select value={editProjectType} onValueChange={(v: any) => setEditProjectType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editLifecycleStatus}
                  onValueChange={(v) => setEditLifecycleStatus(v as ProjectLifecycleStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_LIFECYCLE_FILTER_OPTIONS.filter((o) => o.value !== "all").map(
                      (opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Progress Stage</Label>
                <Input value={editProgressStage} onChange={(e) => setEditProgressStage(e.target.value)} placeholder="e.g. Structure, Wiring, DISCOM..." />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editProjectLocation} onChange={(e) => setEditProjectLocation(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Capacity (kW)</Label>
                <div className="relative">
                  <Input 
                    value={editProjectCapacity} 
                    onChange={(e) => setEditProjectCapacity(e.target.value)} 
                    className="pr-12"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground text-xs font-semibold">
                    kW
                  </div>
                </div>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Contract Value (Ã”Ã©â•£)</Label>
                <Input type="number" value={editProjectContractValue} onChange={(e) => setEditProjectContractValue(e.target.value)} />
              </div>
            </div>

            {editKind !== "SOLO_EPC" && editKind !== "INC" && (
              <div className="p-4 rounded-xl bg-muted/30 border border-dashed space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Partner Economics</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Partner</Label>
                    <Select value={editPartnerId} onValueChange={setEditPartnerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Which partner?" />
                      </SelectTrigger>
                      <SelectContent>
                        {partners.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Earning Model</Label>
                    <Select value={editPartnerType} onValueChange={(v: any) => setEditPartnerType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="profit">Profit Sharing (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Share (Ã”Ã©â•£)</SelectItem>
                        <SelectItem value="vendorship">Vendorship Fee (Ã”Ã©â•£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>
                      {editPartnerType === "profit" ? "Profit Share Percentage (%)" : editPartnerType === "fixed" ? "Our Backend Rate (Ã”Ã©â•£ per kW or total)" : "Vendorship Fee Payable (Ã”Ã©â•£)"}
                    </Label>
                    <Input 
                      type="number"
                      placeholder="Enter value" 
                      value={editPartnerShare}
                      onChange={(e) => setEditPartnerShare(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>Cancel</Button>
            {!ceoReadOnly && (
            <Button onClick={handleSaveEditProject}>{formPrimaryLabel("edit")}</Button>
            )}
          </div>
        </AppSheetContent>
      </Sheet>


      {/* Unified Expense Modal */}
      {isAddExpenseOpen && (
        <UnifiedExpenseSheet
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          projectId={project.id}
          projectName={project.name}
        />
      )}

      {project && (
        <>
          <ChangeRequestSheet
            open={isChangeRequestOpen}
            onOpenChange={setIsChangeRequestOpen}
            project={project}
          />
          <AdditionalWorkSheet
            open={isAdditionalWorkOpen}
            onOpenChange={setIsAdditionalWorkOpen}
            project={project}
          />
        </>
      )}

      <SiteVisitSheet
        open={isSiteVisitOpen}
        onOpenChange={setIsSiteVisitOpen}
        project={project}
      />

      <TaskAssignmentSheet
        isOpen={taskAssignmentOpen}
        onClose={() => setTaskAssignmentOpen(false)}
        projectId={project.id}
        projectName={project.name}
      />

      <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add installation site</DialogTitle>
            <DialogDescription>Create a new site under {project.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} placeholder="e.g. Rooftop - Block A" />
            </div>
            <div className="space-y-2">
              <Label>Work start date</Label>
              <Input type="date" value={newSiteWorkStart} onChange={(e) => setNewSiteWorkStart(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newSiteStatus} onValueChange={(v) => setNewSiteStatus(v as "active" | "completed" | "on-hold")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddSiteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveNewSite}>
              Save site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isArchiveProjectOpen} onOpenChange={setIsArchiveProjectOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Archive project</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Archived projects are preserved in the audit trail and can be restored later from this menu.
            </p>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={archiveProjectReason}
                onChange={(e) => setArchiveProjectReason(e.target.value)}
                placeholder="e.g. customer cancelled, scope rebooted, paused indefinitely"
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsArchiveProjectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!project) return;
                updateProject(project.id, {
                  archivedAt: new Date().toISOString(),
                  archivedReason: archiveProjectReason.trim() || undefined,
                });
                setLastConfirm({ variant: "warning", title: "Project archived", description: project.name });
                setIsArchiveProjectOpen(false);
                setArchiveProjectReason("");
              }}
            >
              Archive
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default ProjectDetail;

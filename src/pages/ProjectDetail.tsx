import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, Briefcase, Calendar, Camera, CheckCircle2, ClipboardList, Edit,
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
import { projectDirectExceptionReason } from "@/lib/projectDirectException";
import {
  projectCompletionInvoiceBlockReason,
  projectRequiresClientInvoiceForCompletion,
} from "@/lib/projectCompletionInvoice";
import { useAppData } from "@/contexts/AppDataContext";
import { useMasters } from "@/contexts/MastersContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { canPerformAction } from "@/domain/policies/permissionMatrix";
import { useCan } from "@/hooks/useCan";
import { useCanAction } from "@/hooks/useCanAction";
import { PermissionGatedButton } from "@/components/ui/PermissionGatedButton";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import {
  canTransitionProjectStatus,
  type ProjectLifecycleStatus,
} from "@/domain/stateMachines/projectStateMachine";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { ToastAction } from "@/components/ui/toast";
import { UnifiedExpenseSheet } from "@/components/expenses/UnifiedExpenseSheet";
import { TaskAssignmentSheet } from "@/components/employees/TaskAssignmentSheet";
import { ProgressReportTab } from "@/components/projects/ProgressReportTab";
import { TeamRosterTab } from "@/components/projects/TeamRosterTab";
import { filterWorkTabsBySnapshot, filterWorkTabsByRole, projectForbidsAction } from "@/lib/projectDetailTabs";
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
import { CustomerSnapshotDriftHint } from "@/components/shared/CustomerSnapshotDriftHint";
import { ProjectScopeChangeGuidance } from "@/components/shared/ProjectScopeChangeGuidance";
import { resolveProjectClientDisplay } from "@/lib/customerPipelineIdentity";
import {
  calculateProjectPartnerEarning,
  calculateProjectProfit,
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
  PROJECT_KIND_UI_LABELS,
  PROJECT_KIND_UI_TONES,
  projectModeUiLabel,
} from "@/lib/projectTaxonomyDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatCurrency = (amount: number) => formatINR(Math.round(amount || 0));

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

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
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
    quotations,
    invoices,
    partners,
    partnerTransactions,
    payments,
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
    getAccrualsByProject,
    generateId,
    canDo,
  } = useAppData();
  const { getOutsourceWorkTags, getSiteChecklistPresets } = useMasters();
  const COMPANY_STATE_CODE = (() => { try { return JSON.parse(localStorage.getItem("mss.settings.company") || "{}").companyState || "08"; } catch { return "08"; } })();

  const project = id ? getProjectById(id) : undefined;
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
  const projectCompletionInvoiceReason = useMemo(
    () => (project ? projectCompletionInvoiceBlockReason(project, projectInvoices) : null),
    [project, projectInvoices],
  );
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
  const [isAddOutsourceOpen, setIsAddOutsourceOpen] = useState(false);
  const [_activeTab, _setActiveTab] = useState("progress-report");
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
  const [editProjectStatus, setEditProjectStatus] = useState<Project["status"]>(project?.status || "Ongoing");
  const [editProgressStage, setEditProgressStage] = useState(project?.progressStage || "");

  // Outsource work state
  const [outsourceTab, setOutsourceTab] = useState<"labour" | "other">("labour");
  const [outsourceEmployees, setOutsourceEmployees] = useState("");
  const [outsourceDays, setOutsourceDays] = useState("");
  const [outsourceRate, setOutsourceRate] = useState("");
  const [outsourceDescription, setOutsourceDescription] = useState("");
  const [otherWorkTag, setOtherWorkTag] = useState("");
  const [otherWorkAmount, setOtherWorkAmount] = useState("");
  const [otherWorkNotes, setOtherWorkNotes] = useState("");

  // Site checklist template choice
  const [siteTemplateChoice, setSiteTemplateChoice] = useState<Record<number, string>>({});
  const _defaultSiteTemplateId = useMemo(() => {
    const pt = project?.projectType;
    if (pt === "Commercial" || pt === "Industrial") return siteChecklistTemplates.find(t => t.segment === "commercial")?.id ?? siteChecklistTemplates[0]?.id ?? "";
    return siteChecklistTemplates.find(t => t.segment === "residential")?.id ?? siteChecklistTemplates[0]?.id ?? "";
  }, [project?.projectType, siteChecklistTemplates]);

  // Derived project status
  const projectStatus = project?.status || "Ongoing";
  const isProjectCompleted = projectStatus === "Completed";
  const canViewCommercial = useCan("projectCommercial", "view");
  const canMarkProjectComplete =
    useCan("projectCommercial", "edit") || useCan("projectExecution", "edit");
  const canApproveChangeRequest = useCanAction("approval:resolve");
  const canCreateInvoice = useCanAction("finance:create_invoice");
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
      setEditProjectStatus(project.status);
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
      status: editProjectStatus,
      progressStage: editProgressStage || undefined,
      partners: partnerData
    });
    setLastConfirm({ variant: "success", title: "Project updated", description: `${editProjectName || project.name} has been updated successfully` });
    setIsEditProjectOpen(false);
  };

  const handleMarkProjectCompleted = () => {
    if (!project || !id) return;
    const block = projectCompletionInvoiceReason;
    if (block) {
      toast({ title: "Cannot complete project", description: block, variant: "destructive" });
      return;
    }
    updateProject(project.id, { lifecycleStatus: "Completed", endDate: new Date().toISOString().slice(0, 10) });
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

  const handleConfirmOutsource = () => {
    if (!project || !id) return;
    let total: number, notes: string;
    if (outsourceTab === "labour") {
      const emps = parseInt(outsourceEmployees) || 0;
      const days = parseInt(outsourceDays) || 0;
      const rate = parseFloat(outsourceRate) || 0;
      total = emps * days * rate;
      notes = `OUTSRC:${emps},${days},${rate}:${outsourceDescription.trim() || "Outsourced labour"}`;
    } else {
      total = parseFloat(otherWorkAmount) || 0;
      const tagPrefix = otherWorkTag ? `[${otherWorkTag}] ` : "";
      notes = `OUTSRC:0,0,0:${tagPrefix}${otherWorkNotes.trim() || "Other outsourced work"}`;
    }
    addExpense({ id: generateId("EX"), date: new Date().toISOString().split("T")[0], amount: total, mainCategory: "site", projectId: id, projectName: project.name, category: outsourceTab === "labour" ? "Labour" : "Other", subCategory: "Outsourced", notes, paidBy: { type: "company" } } as Expense);
    toast({ title: "Outsource Work Added", description: `${formatINR(total)} recorded` });
    setIsAddOutsourceOpen(false);
    setOutsourceEmployees(""); setOutsourceDays(""); setOutsourceRate(""); setOutsourceDescription("");
    setOtherWorkTag(""); setOtherWorkAmount(""); setOtherWorkNotes("");
  };

  const projectSiteVisits = id ? getSiteVisitsByProject(id) : [];
  const projectReservations = id ? getReservationsForProject(id) : [];
  const projectSchedules = id ? getSchedulesByProject(id) : [];
  const projectMaterialDamage = id ? getDamageByProject(id) : [];

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
  const partnerRow = resolveProjectPartnerRow(project);
  const linkedPartner = partnerRow
    ? partners.find((partner) => partner.id === partnerRow.partnerId)
    : undefined;
  const projectProfit = calculateProjectProfit(project);
  const partnerEarning = partnerRow ? calculateProjectPartnerEarning(project, partnerRow) : 0;
  const vendorshipFee = partnerRow ? calculateProjectVendorshipFee(partnerRow) : 0;
  const partnerProjectTransactions = partnerRow ? partnerTransactions.filter((txn) => txn.partnerId === partnerRow.partnerId && txn.projectId === project.id) : [];
  const partnerPaid = partnerProjectTransactions.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const partnerReceived = partnerProjectTransactions.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const _pendingToPartner = Math.max(0, partnerEarning - partnerPaid);
  const _pendingFromPartner = Math.max(0, vendorshipFee - partnerReceived);
  const billed = projectInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = projectPayments.filter((payment) => payment.direction === "in").reduce((sum, payment) => sum + payment.amount, 0);
  const actualCost = project.totalCost || projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const companyRetainedRevenue = project.contractAmount - partnerEarning;
  const _companyNet = kind === "VENDOR_NETWORK" ? projectProfit + vendorshipFee : companyRetainedRevenue - actualCost;

  const scope = project.scope;
  const docLabel = scope?.vendorshipOwner === "MSS" ? "Document Creator" : "Document Vault";
  const tabDefs = filterWorkTabsByRole(filterWorkTabsBySnapshot(project, docLabel), currentRole);

  const forbidMaterialDispatch = projectForbidsAction(project, "material_dispatch");
  const forbidWorkTracking = projectForbidsAction(project, "work_tracking");
  const forbidPartnerSettlement = projectForbidsAction(project, "partner_settlement");
  const forbidChannelFee = projectForbidsAction(project, "channel_fee");

  const contractDisplay = project?.contractAmount || 0;
  const _pendingDisplay = Math.max(0, contractDisplay - collected);

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: project.name }]}
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl md:text-2xl font-semibold">{project.name}</span>
            <Badge
              variant="outline"
              className={PROJECT_KIND_UI_TONES[kind]}
              title={`${projectModeUiLabel(projectMode)} · ${PROJECT_KIND_UI_LABELS[kind]}`}
            >
              {PROJECT_KIND_UI_LABELS[kind]}
            </Badge>
            <Badge variant="secondary" className="h-5 text-2xs uppercase tracking-wider">{project.status}</Badge>
            {project.progressStage && <Badge variant="outline" className="h-5 text-2xs uppercase">{project.progressStage}</Badge>}
          </div>
        }
        subRow={
          <div className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              <span className="flex min-w-0 flex-col gap-0.5 sm:col-span-2 lg:col-span-1">
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  Client:{" "}
                  <span className="text-foreground font-medium truncate">
                    {projectClientDisplay?.name ?? project.client}
                  </span>
                  {projectClientDisplay?.customerId && (
                    <Link
                      to={`/customers/${projectClientDisplay.customerId}`}
                      className="shrink-0 text-2xs text-primary hover:underline"
                    >
                      {projectClientDisplay.customerId}
                    </Link>
                  )}
                </span>
                <CustomerSnapshotDriftHint
                  visible={Boolean(projectClientDisplay?.snapshotDiffersFromCustomer)}
                  snapshotClient={projectClientDisplay?.snapshot.client ?? project.client}
                  className="pl-5"
                />
              </span>
              <span className="flex min-w-0 items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 shrink-0" />{project.location}</span>
              <span className="flex min-w-0 items-center gap-1.5 truncate"><Zap className="w-3.5 h-3.5 shrink-0" />{project.capacity}</span>
              <span className="flex min-w-0 items-center gap-1.5 truncate"><Calendar className="w-3.5 h-3.5 shrink-0" />Started: <span className="text-foreground font-medium">{project.startDate}</span></span>
              {project.executionPhase && (
                <Badge variant="outline" className="h-5 w-fit text-2xs">Phase: {project.executionPhase}</Badge>
              )}
              {(partnerRow || linkedPartner) && (
                <Badge variant="secondary" className="h-5 w-fit bg-primary/5 text-primary border-primary/10 text-2xs">
                  <Handshake className="w-3 h-3 mr-1" />{partnerRow?.partnerName ?? linkedPartner?.name}
                </Badge>
              )}
              {project.quotationId && quotation && (
                <Badge variant="outline" className="h-5 w-fit text-2xs">
                  <FileText className="w-3 h-3 mr-1" />
                  <Link to="/quotations" state={{ focusQuotationId: project.quotationId }} className="hover:underline">
                    Quotation: {quotation.quotationNumber}
                  </Link>
                </Badge>
              )}
              {(() => {
                const accruals = getAccrualsByProject(project.id);
                if (accruals.length === 0) return null;
                const totalExpected = accruals.reduce((s, a) => s + (a.expectedAmount ?? 0), 0);
                const paid = accruals.filter((a) => a.status === "paid").length;
                const payable = accruals.filter((a) => a.status === "payable").length;
                const pending = accruals.filter((a) => a.status === "pending").length;
                return (
                  <Badge variant="outline" className="h-5 w-fit text-2xs">
                    Commission {formatINR(totalExpected)} · {pending}p / {payable}a / {paid}✓
                  </Badge>
                );
              })()}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <InlineKpiStrip
                className="w-full min-w-0 flex-wrap justify-start"
                items={[
                  { label: "Contract", value: formatCurrency(project.contractAmount) },
                  { label: "Actual cost", value: formatCurrency(actualCost) },
                  { label: "Profit", value: formatCurrency(projectProfit) },
                  { label: "Collected", value: formatCurrency(collected) },
                ]}
              />
              {hasFinancialDetail && canViewCommercial && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowFinancialDetail((v) => !v)}
                >
                  {showFinancialDetail ? "Hide financial detail" : "Show financial detail"}
                </Button>
              )}
            </div>
            {hasFinancialDetail && canViewCommercial && showFinancialDetail && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground border-t pt-3">
                {project.bankDocumentationAmount != null && (<div><span className="block text-2xs uppercase">Bank Doc Amount</span><span className="text-foreground font-medium">{formatCurrency(project.bankDocumentationAmount)}</span></div>)}
                {project.totalPartnerInvestment != null && (<div><span className="block text-2xs uppercase">Partner Investment</span><span className="text-foreground font-medium">{formatCurrency(project.totalPartnerInvestment)}</span></div>)}
                {project.mssBackendAmount != null && (<div><span className="block text-2xs uppercase">MSS Backend</span><span className="text-foreground font-medium">{formatCurrency(project.mssBackendAmount)}</span></div>)}
                {project.externalVendorshipEntity && (<div><span className="block text-2xs uppercase">External Vendorship</span><span className="text-foreground font-medium">{project.externalVendorshipEntity}</span></div>)}
                {project.loanReceiptHandling && (<div><span className="block text-2xs uppercase">Loan Receipt</span><span className="text-foreground font-medium">{project.loanReceiptHandling}</span></div>)}
                {project.cashHandling && (<div><span className="block text-2xs uppercase">Cash Handling</span><span className="text-foreground font-medium">{project.cashHandling}</span></div>)}
                {project.incScope && (<div><span className="block text-2xs uppercase">INC Scope</span><span className="text-foreground font-medium">{project.incScope}</span></div>)}
                {project.vendorNetworkCommissionType && (<div><span className="block text-2xs uppercase">Network Commission</span><span className="text-foreground font-medium">{project.vendorNetworkCommissionType}{project.vendorNetworkFeePerKw ? ` (₹${project.vendorNetworkFeePerKw}/kW)` : project.vendorNetworkFlatFee ? ` (${formatCurrency(project.vendorNetworkFlatFee)})` : ""}</span></div>)}
                {project.commercialBaseline?.capturedAt && (<div><span className="block text-2xs uppercase">Baseline Locked</span><span className="text-foreground font-medium">{new Date(project.commercialBaseline.capturedAt).toLocaleDateString()}</span></div>)}
              </div>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Phase 2.5: Schedule / Site readiness / Start project pills. */}
          <ProjectStartActions project={project} />
          {/* Primary CTA — state-derived. Filled style so it stands out from secondary outline buttons. */}
          {project?.archivedAt ? (
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                if (!project) return;
                updateProject(project.id, { archivedAt: null, archivedReason: undefined });
                setLastConfirm({ variant: "success", title: "Project restored", description: project.name });
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Unarchive
            </Button>
          ) : isProjectCompleted ? (
            <Button size="sm" className="h-8" onClick={() => navigate("/audit/audit-logs")}>
              <FileText className="w-3.5 h-3.5 mr-1.5" />Open audit
            </Button>
          ) : (
            <Button size="sm" className="h-8" onClick={handleOpenNewInvoiceForProject}>
              <FileText className="w-3.5 h-3.5 mr-1.5" />Invoice
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8" onClick={() => setIsSiteVisitOpen(true)}>
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />Site visit
          </Button>
          {canPerformAction(currentRole, "project:update_execution") && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={isProjectCompleted || forbidWorkTracking}
              title={
                forbidWorkTracking
                  ? "Work tracking is not used for this project kind."
                  : isProjectCompleted
                    ? "Reactivate the project to assign tasks."
                    : undefined
              }
              onClick={() => setTaskAssignmentOpen(true)}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
              Assign task
            </Button>
          )}
          {canPerformAction(currentRole, "finance:record_expense_income") && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive border-destructive/30"
              disabled={isProjectCompleted}
              title={isProjectCompleted ? "Reactivate the project to record expenses." : undefined}
              onClick={handleOpenExpenseForProject}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />Expense
            </Button>
          )}
          {!isProjectCompleted && canMarkProjectComplete && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-success border-success/30"
              disabled={Boolean(projectCompletionInvoiceReason)}
              title={projectCompletionInvoiceReason ?? undefined}
              onClick={handleMarkProjectCompleted}
            >
              <CheckSquare className="w-3.5 h-3.5 mr-1.5" />Complete
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => { if (isProjectCompleted || forbidWorkTracking) return; setIsAddOutsourceOpen(true); }}
                disabled={isProjectCompleted || forbidWorkTracking}
              >
                <Users className="w-4 h-4 mr-2" /> Outsource Work
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (isProjectCompleted) return; openEditProjectModal(); }} disabled={isProjectCompleted}>
                <Edit className="w-4 h-4 mr-2" /> Edit Details
              </DropdownMenuItem>
              {lifecycleTransitions.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {lifecycleTransitions.map((to) => (
                    <DropdownMenuItem
                      key={to}
                      disabled={
                        to === "Completed" &&
                        (Boolean(projectCompletionInvoiceReason) || !canMarkProjectComplete)
                      }
                      title={
                        to === "Completed"
                          ? (projectCompletionInvoiceReason ??
                            (!canMarkProjectComplete ? "Your role cannot mark projects complete." : undefined))
                          : undefined
                      }
                      onClick={() => {
                        if (!project) return;
                        if (to === "Completed") {
                          if (!canMarkProjectComplete) {
                            toast({
                              title: "Cannot mark complete",
                              description: "Your role cannot mark projects complete.",
                              variant: "destructive",
                            });
                            return;
                          }
                          const reason = projectCompletionInvoiceReason;
                          if (reason) {
                            toast({ title: "Cannot move to Completed", description: reason, variant: "destructive" });
                            return;
                          }
                        }
                        updateProject(project.id, {
                          lifecycleStatus: to,
                          status:
                            to === "Completed" || to === "Closed"
                              ? to === "Closed"
                                ? "Closed"
                                : "Completed"
                              : to === "On Hold"
                                ? "On Hold"
                                : "Ongoing",
                          ...(to === "Completed" || to === "Closed"
                            ? { endDate: new Date().toISOString().slice(0, 10) }
                            : {}),
                        });
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Move to {to}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              {project?.archivedAt ? (
                <DropdownMenuItem
                  onClick={() => {
                    if (!project) return;
                    updateProject(project.id, { archivedAt: null, archivedReason: undefined });
                    setLastConfirm({ variant: "success", title: "Project restored", description: project.name });
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Unarchive project
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    if (!project) return;
                    setArchiveProjectReason("");
                    setIsArchiveProjectOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" /> Archive project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </StickyPageHeader>

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

      {project?.archivedAt && (
        <LifecycleTerminalBanner
          variant="archived"
          title="Project archived"
          description={
            <span>
              Archived on {new Date(project.archivedAt).toLocaleDateString()}
              {project.archivedReason ? <> · Reason: {project.archivedReason}</> : null}. Read-only — restore to make changes.
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
          description="All work signed off. Audit-only access — re-open from Project menu if rework is needed."
          primaryActionLabel="Open audit"
          onPrimaryAction={() => navigate("/audit/audit-logs")}
        />
      )}

      <Tabs defaultValue={tabDefs[0]?.value ?? "progress-report"} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabDefs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* â•â•â• Progress Report â•â•â• */}
        <TabsContent value="progress-report" className="space-y-4">
          <ProgressReportTab
            projectId={project.id}
            projectName={project.name}
            projectStatus={project.status}
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
        </TabsContent>

        {/* Quotations tab removed — the linked quotation now surfaces as a chip in the header. */}

        <TabsContent value="team-roster" className="space-y-4">
          <TeamRosterTab project={project} />
        </TabsContent>

        {/* â•â•â• Document Creator â•â•â• */}
        <TabsContent value="document-creator" className="space-y-4">
          <ProjectDocumentsStudio
            project={project}
            quotation={quotation}
            updateProject={updateProject}
            generateId={generateId}
          />
        </TabsContent>

        {/* â•â•â• Materials Sent â•â•â• */}
        <TabsContent value="materials-sent" className="space-y-4">
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
                          {dmg.costImpact != null ? formatCurrency(dmg.costImpact) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={dmg.notes}>
                          {dmg.notes?.trim() || "—"}
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

        <TabsContent value="vendorship" className="space-y-4">
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
              <MiniMetric label="Vendorship Fee" value={formatCurrency(project.scope?.vendorshipFeeAmount || 0)} />
              <MiniMetric
                label="Billing Fee (%)"
                value={forbidChannelFee ? "—" : `${project.scope?.partnerBillingFeePercentage || 0}%`}
              />
              <MiniMetric label="Partner Earning" value={formatCurrency(partnerEarning)} />
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

        <TabsContent value="billing" className="space-y-4">
          <TabCard title="Company to Customer Billing" icon={<ReceiptText className="h-4 w-4 text-primary" />}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="grid flex-1 gap-3 md:grid-cols-3">
              <MiniMetric label="Contract value" value={formatCurrency(project.contractAmount)} />
              <MiniMetric label="Billed so far" value={formatCurrency(billed)} />
              <MiniMetric label="Collected so far" value={formatCurrency(collected)} />
              </div>
              <Button type="button" size="sm" className="shrink-0" onClick={handleOpenNewInvoiceForProject}>
                <Plus className="mr-1 h-4 w-4" />
                New invoice
              </Button>
            </div>
            <DataTableShell
            variant="inline" >
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
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
                    <TableCell>
                      <Badge variant="outline">{invoice.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.amountReceived)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
            <h3 className="mb-2 mt-5 text-sm font-medium">Payment flow</h3>
            <DataTableShell
            variant="inline" >
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
                    <TableCell>
                      <PaymentRecipient payment={payment} />
                    </TableCell>
                    <TableCell>{payment.paymentMode}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          </TabCard>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <TabCard title="Actual Cost" icon={<IndianRupee className="h-4 w-4 text-primary" />}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div className="grid flex-1 gap-3 md:grid-cols-4">
              <MiniMetric label="Material" value={formatCurrency(projectExpenses.filter((e) => e.category === "Material").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Labour" value={formatCurrency(projectExpenses.filter((e) => e.category === "Labour").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Transport" value={formatCurrency(projectExpenses.filter((e) => e.category === "Transport").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Total cost" value={formatCurrency(actualCost)} />
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Add expense
              </Button>
            </div>
            <DataTableShell
            variant="inline" >
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
                    <TableCell>
                      {expense.category}
                      {expense.subCategory ? <span className="text-muted-foreground"> / {expense.subCategory}</span> : null}
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground">{expense.notes ?? expense.description ?? ""}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          </TabCard>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <TabCard title={kind === "INC" ? "INC Execution Scope" : "Execution"} icon={<ClipboardList className="h-4 w-4 text-primary" />}>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniMetric label="Start date" value={project.startDate} />
                <MiniMetric label="End date" value={project.endDate ?? "Active"} />
                <MiniMetric label="Sites" value={projectSitesFiltered.length} />
                <MiniMetric label="Field tasks" value={projectFieldTasks.length} />
              </div>
            </TabCard>
            <TabCard title="Materials Summary" icon={<Package className="h-4 w-4 text-primary" />}>
              {(project.materialsSent ?? []).length === 0 ? (
                <ListEmptyState density="compact" icon={Package} title="No material movement recorded" />
              ) : (
                <div className="space-y-2">
                  {(project.materialsSent ?? []).slice(0, 5).map((item) => (
                    <div key={`${item.itemId}-${item.dateIssued}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>{item.itemName}</span>
                      <span className="font-medium">{item.quantity} - {formatCurrency(item.quantity * item.unitPrice)}</span>
                    </div>
                  ))}
                  {(project.materialsSent ?? []).length > 5 && <p className="text-xs text-muted-foreground text-center pt-1">+ {(project.materialsSent ?? []).length - 5} more items (see Materials Sent tab)</p>}
                </div>
              )}
            </TabCard>
            <TabCard title="Field notes & milestones" icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}>
              <p className="mb-2 text-xs text-muted-foreground">Log site progress, milestone completions, and follow-ups. Saved on the project record.</p>
              <Textarea
                rows={5}
                value={executionNotesDraft}
                onChange={(e) => setExecutionNotesDraft(e.target.value)}
                placeholder="e.g. 12 Apr - Structure complete, awaiting DISCOM inspection..."
                className="text-sm"
              />
              <div className="mt-3 flex justify-end">
                <Button type="button" size="sm" onClick={handleSaveExecutionNotes}>
                  Save notes
                </Button>
              </div>
            </TabCard>
            <TabCard title="Scheduled installations" icon={<Calendar className="h-4 w-4 text-primary" />}>
              {projectSchedules.length === 0 ? (
                <ListEmptyState
                  density="compact"
                  icon={Calendar}
                  title="No installs scheduled"
                  description="Use Schedule installation in the project header."
                />
              ) : (
                <div className="space-y-2">
                  {projectSchedules.map((sch) => (
                    <div key={sch.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{sch.scheduledDate}</p>
                        {sch.notes && <p className="text-xs text-muted-foreground">{sch.notes}</p>}
                        {sch.doubleBookingOverrideReason && (
                          <p className="text-xs text-warning">
                            Double-booked: {sch.doubleBookingOverrideReason}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">{sch.status.replace("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabCard>
            <TabCard title="Site visits" icon={<ClipboardList className="h-4 w-4 text-primary" />}>
              <div className="mb-3 flex justify-end">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsSiteVisitOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Record visit
                </Button>
              </div>
              {projectSiteVisits.length === 0 ? (
                <ListEmptyState
                  density="compact"
                  icon={MapPin}
                  title="No site visits yet"
                  description='Use "Record visit" to log field activity.'
                />
              ) : (
                <div className="space-y-2">
                  {projectSiteVisits.map((visit) => {
                    const installer = employees.find((e) => e.id === visit.visitedBy);
                    return (
                      <div key={visit.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{visit.visitDate}</span>
                          <Badge variant="outline">{installer?.name ?? `Employee #${visit.visitedBy}`}</Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">{visit.items.length} item(s)</p>
                        {visit.blockers && (
                          <p className="mt-1 text-warning text-xs">Blockers: {visit.blockers}</p>
                        )}
                        <div className="mt-2 flex gap-2">
                          {visit.reconciledChecklistAt ? (
                            <Badge variant="secondary" className="text-xs">
                              Reconciled {new Date(visit.reconciledChecklistAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Button type="button" size="sm" variant="outline" onClick={() => handleReconcileSiteVisit(visit.id)}>
                              Reconcile to checklist
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabCard>
          </div>
        </TabsContent>

        {/* â•â•â• Attendance â•â•â• */}
        <TabsContent value="attendance" className="space-y-4">
          <TabCard title="Attendance Records" icon={<Users className="h-4 w-4 text-primary" />}>
            {attendanceRows.length === 0 ? (
              <ListEmptyState density="compact" icon={Users} title="No attendance for this project yet" />
            ) : (
              <DataTableShell
            variant="inline" >
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

          {/* Client Payment History */}
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
            partnerName={partnerRow?.partnerName}
            forbidPartnerSettlement={forbidPartnerSettlement}
          />

          {/* Outsourced Work Log */}
          {outsourcedWorkRows.length > 0 && (
            <TabCard title="Outsourced Work Log" icon={<Briefcase className="h-4 w-4 text-warning" />}>
              <DataTableShell
            variant="inline" >
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Workers</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Rate/Day</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outsourcedWorkRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell className="text-right">{row.employees || "-"}</TableCell>
                      <TableCell className="text-right">{row.days || "-"}</TableCell>
                      <TableCell className="text-right">{row.ratePerDay ? `₹${row.ratePerDay}` : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
              <div className="mt-2 text-right text-sm font-semibold">Total Outsourced: {formatCurrency(outsourcedTotal)}</div>
            </TabCard>
          )}
        </TabsContent>
        {/* â•â•â• Sites â•â•â• */}
        <TabsContent value="sites" className="space-y-4">
          <TabCard title="Project Installation Sites" icon={<MapPin className="h-4 w-4 text-primary" />}>
            {projectSites.length > 0 && (
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNewSiteName("");
                    setNewSiteWorkStart(new Date().toISOString().split("T")[0]);
                    setNewSiteStatus("active");
                    setIsAddSiteOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add site
                </Button>
              </div>
            )}
            {projectSites.length === 0 ? (
              <ListEmptyState
                density="compact"
                icon={MapPin}
                title="No sites for this project"
                description="Add installation sites to track checklists and dispatch."
                actionLabel="Add site"
                onAction={() => {
                  setNewSiteName("");
                  setNewSiteWorkStart(new Date().toISOString().split("T")[0]);
                  setNewSiteStatus("active");
                  setIsAddSiteOpen(true);
                }}
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-destructive"
                            onClick={() => {
                              const result = deleteSite(String(site.id));
                              if (!result.ok) {
                                toast({
                                  title: "Cannot delete site",
                                  description: friendlyCommandErrorMessage(result.error, "Could not delete site."),
                                  variant: "destructive",
                                });
                                return;
                              }
                              toast({ title: "Site removed", description: site.name });
                            }}
                          >
                            Delete
                          </Button>
                          <Select 
                            value={siteTemplateChoice[site.id] || ""} 
                            onValueChange={(val) => setSiteTemplateChoice(prev => ({ ...prev, [site.id]: val }))}
                          >
                            <SelectTrigger className="h-8 w-[200px]">
                              <SelectValue placeholder="Select Checklist Preset" />
                            </SelectTrigger>
                            <SelectContent>
                              {getSiteChecklistPresets().map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-8"
                            disabled={!siteTemplateChoice[site.id]}
                            onClick={() => {
                              const preset = getSiteChecklistPresets().find(p => p.id === siteTemplateChoice[site.id]);
                              if (preset) {
                                const res = applySiteChecklistFromTemplate(project.id, site.id, preset);
                                if (res.ok) toast({ title: "Checklist Applied", description: `Applied ${preset.name} to ${site.name}` });
                                else
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
          <DataTableShell
            variant="inline">
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
                                <TableCell >{item.materialName}</TableCell>
                                <TableCell className="text-right font-medium">{item.requiredQuantity}</TableCell>
                                <TableCell>
                                  {item.status === "dispatched" ? (
                                    <Badge className="bg-primary/10 text-primary border-0 text-2xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Dispatched
                                    </Badge>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-2xs px-2 border-primary text-primary hover:bg-primary hover:text-white"
                                      onClick={async () => {
                                        const res = await dispatchSiteMaterial(project.id, site.id, item.id);
                                        if (res.ok) toast({ title: "Material Dispatched", description: `${item.materialName} deducted from warehouse.` });
                                        else
                                  toast({
                                    title: "Error",
                                    description: friendlyCommandErrorMessage(res.error),
                                    variant: "destructive",
                                  });
                                      }}
                                    >
                                      <Truck className="w-3 h-3 mr-1" />
                                      Dispatch
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

        {/* â•â•â• Team Roster â•â•â• */}
        {/* Duplicate Team Roster TabsContent removed — single panel lives earlier. */}

        {/* â•â•â• Financials (merged Billing + Costs) â•â•â• */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <MiniMetric label="Contract" value={formatCurrency(project.contractAmount)} />
            <MiniMetric label="Billed" value={formatCurrency(billed)} />
            <MiniMetric label="Collected" value={formatCurrency(collected)} />
            <MiniMetric label="Actual Cost" value={formatCurrency(actualCost)} />
            <MiniMetric label="Profit" value={formatCurrency(projectProfit)} />
          </div>

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
              {kind === "INC_GIVEN" && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setIsAdditionalWorkOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Additional work
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => setIsChangeRequestOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New change request
              </Button>
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
                          {cr.deltaAmount ? ` ₹${cr.deltaAmount.toLocaleString("en-IN")}` : null}
                          {!cr.deltaAmount && est > 0 ? ` ~₹${est.toLocaleString("en-IN")}` : null}
                          {cr.materialDelta?.length ? ` · ${cr.materialDelta.length} material line(s)` : null}
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
                        <TableCell className="text-right">{formatCurrency(line.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </>
            )}
          </TabCard>

          {/* Invoices - only for kinds that bill */}
          {!["INC_GIVEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"].includes(kind) && (
            <TabCard title="Invoices" icon={<ReceiptText className="h-4 w-4 text-primary" />}>
              <div className="mb-3 flex justify-end">
                <Button type="button" size="sm" onClick={handleOpenNewInvoiceForProject}>
                  <Plus className="mr-1 h-4 w-4" />New invoice
                </Button>
              </div>
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
                      <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(invoice.amountReceived ?? 0)}</TableCell>
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
                          <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
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
                <MiniMetric label="Material" value={formatCurrency(projectExpenses.filter((e) => e.category === "Material").reduce((s, e) => s + e.amount, 0))} />
                <MiniMetric label="Labour" value={formatCurrency(projectExpenses.filter((e) => e.category === "Labour").reduce((s, e) => s + e.amount, 0))} />
                <MiniMetric label="Total" value={formatCurrency(actualCost)} />
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />Add expense
              </Button>
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
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>
          </TabCard>
        </TabsContent>

        {/* â•â•â• Field Operations (merged Execution + Sites + Team Roster + Attendance) â•â•â• */}
        <TabsContent value="field-operations" className="space-y-4">
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
                  <Textarea rows={5} value={executionNotesDraft} onChange={(e) => setExecutionNotesDraft(e.target.value)} placeholder="e.g. 12 Apr - Structure complete, awaiting DISCOM inspection..." className="text-sm" />
                  <div className="mt-3 flex justify-end">
                    <Button type="button" size="sm" onClick={handleSaveExecutionNotes}>Save notes</Button>
                  </div>
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
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label htmlFor="project-photo-upload" className="cursor-pointer">
                      Add photo
                    </label>
                  </Button>
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
                    actionLabel="Add site"
                    onAction={() => { setNewSiteName(""); setNewSiteWorkStart(new Date().toISOString().split("T")[0]); setNewSiteStatus("active"); setIsAddSiteOpen(true); }}
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
                partnerName={partnerRow?.partnerName}
                forbidPartnerSettlement={forbidPartnerSettlement}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* â•â•â• MODALS â•â•â• */}

      {/* Edit Project Modal */}
      <Sheet open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
            <SheetDescription>Update project details</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Project Name</Label>
                <Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} />
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
                <Select value={editProjectStatus} onValueChange={(v: any) => setEditProjectStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
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
                <Label>Contract Value (₹)</Label>
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
                        <SelectItem value="fixed">Fixed Share (₹)</SelectItem>
                        <SelectItem value="vendorship">Vendorship Fee (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>
                      {editPartnerType === "profit" ? "Profit Share Percentage (%)" : editPartnerType === "fixed" ? "Our Backend Rate (₹ per kW or total)" : "Vendorship Fee Payable (₹)"}
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
            <Button onClick={handleSaveEditProject}>{formPrimaryLabel("edit")}</Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Outsource Work Modal */}
      <Sheet open={isAddOutsourceOpen} onOpenChange={(open) => {
        setIsAddOutsourceOpen(open);
        if (!open) {
          setOutsourceTab("labour");
          setOutsourceEmployees("");
          setOutsourceDays("");
          setOutsourceRate("");
          setOutsourceDescription("");
          setOtherWorkTag("");
          setOtherWorkAmount("");
          setOtherWorkNotes("");
        }
      }}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" />Outsource Work</SheetTitle>
            <SheetDescription>Record outsourced labour or other work for {project.name}</SheetDescription>
          </SheetHeader>
          <Tabs value={outsourceTab} onValueChange={(v) => setOutsourceTab(v as "labour" | "other")}>
            <TabsList className="w-full"><TabsTrigger value="labour" className="flex-1">Labour</TabsTrigger><TabsTrigger value="other" className="flex-1">Other Work</TabsTrigger></TabsList>
            <TabsContent value="labour" className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Workers</Label><Input type="number" placeholder="0" value={outsourceEmployees} onChange={(e) => setOutsourceEmployees(e.target.value)} /></div>
                <div className="space-y-2"><Label>Days</Label><Input type="number" placeholder="0" value={outsourceDays} onChange={(e) => setOutsourceDays(e.target.value)} /></div>
                <div className="space-y-2"><Label>Rate/Day (₹)</Label><Input type="number" placeholder="0" value={outsourceRate} onChange={(e) => setOutsourceRate(e.target.value)} /></div>
              </div>
              {outsourceEmployees && outsourceDays && outsourceRate && (
                <div className="p-3 bg-muted/30 rounded-lg text-sm">
                  Total: <span className="font-semibold text-primary">{formatINR((parseInt(outsourceEmployees, 10) || 0) * (parseInt(outsourceDays, 10) || 0) * (parseFloat(outsourceRate) || 0))}</span>
                </div>
              )}
              <div className="space-y-2"><Label>Description</Label><Textarea placeholder="What work was done..." value={outsourceDescription} onChange={(e) => setOutsourceDescription(e.target.value)} rows={2} /></div>
            </TabsContent>
            <TabsContent value="other" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Select value={otherWorkTag} onValueChange={setOtherWorkTag}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {getOutsourceWorkTags().map(tag => (<SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Amount (₹)</Label><Input type="number" placeholder="0" value={otherWorkAmount} onChange={(e) => setOtherWorkAmount(e.target.value)} /></div>
              <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Details..." value={otherWorkNotes} onChange={(e) => setOtherWorkNotes(e.target.value)} rows={2} /></div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddOutsourceOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmOutsource}>Confirm</Button>
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


import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Briefcase, Calendar, CheckCircle2, ClipboardList, Edit,
  FileText, Handshake, IndianRupee, LinkIcon, MapPin,
  Package, Plus, ReceiptText, Truck, Users,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useAppData } from "@/contexts/AppDataContext";
import { useMasters } from "@/contexts/MastersContext";
import { toast } from "@/hooks/use-toast";
import { UnifiedExpenseModal } from "@/components/expenses/UnifiedExpenseModal";
import { ProgressReportTab } from "@/components/projects/ProgressReportTab";
import { ProjectDocumentsStudio } from "@/components/projects/ProjectDocumentsStudio";
import MaterialsSentTab from "@/components/projects/MaterialsSentTab";
import { ClientPaymentHistory } from "@/components/projects/ClientPaymentHistory";
import {
  calculateProjectPartnerEarning,
  calculateProjectProfit,
  calculateProjectVendorshipFee,
  isPartnerCreditTransaction,
  isPartnerDebitTransaction,
  partnerProjectLabel,
} from "@/domain/partners/derivePartnerEconomics";
import type { Payment, Expense } from "@/types/finance";
import type { Project } from "@/types/project";

const formatCurrency = (amount: number) => `Rs. ${Math.round(amount || 0).toLocaleString("en-IN")}`;

const projectKindLabel: Record<NonNullable<Project["projectKind"]>, string> = {
  SOLO_EPC: "Solo",
  PARTNER_EPC: "Partner",
  FIXED_EPC: "Fixed",
  VENDOR_NETWORK: "Vendor / network",
  INC: "INC",
};

const projectKindTone: Record<NonNullable<Project["projectKind"]>, string> = {
  SOLO_EPC: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
  PARTNER_EPC: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  FIXED_EPC: "bg-amber-500/10 text-amber-800 border-amber-500/25",
  VENDOR_NETWORK: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  INC: "bg-slate-500/10 text-slate-700 border-slate-500/25",
};

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

const ProjectDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    attendanceRecords,
    employees,
    expenses,
    invoices,
    partners,
    partnerTransactions,
    payments,
    projects,
    saleBills,
    sites,
    inventoryItems: globalInvItems,
    inventoryPresets,
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
    updateProject,
    recordProjectMaterialMovement,
    addExpense,
    addBlockage,
    updateBlockage,
    addOperationalTicket,
    updateProjectTimelineForProject,
    addClientPaymentRecord,
    applySiteChecklistFromTemplate,
    dispatchSiteMaterial,
    generateId,
  } = useAppData();
  const { getOutsourceWorkTags, getSiteChecklistPresets } = useMasters();

  const project = id ? getProjectById(id) : undefined;
  const quotation = project?.quotationId ? getQuotationById(project.quotationId) : undefined;

  // Existing data (current version)
  const projectInvoices = useMemo(
    () => [...invoices, ...(saleBills ?? [])].filter((invoice) => invoice.projectId === id),
    [id, invoices, saleBills],
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
  const foodExpenses = projExpenses.filter(e => e.category === "food").map(e => ({ id: e.id, date: e.date, description: e.description || e.subCategory || "Food expense", whoPaid: !e.paidBy ? "Company" : e.paidBy.type === "company" ? "Company" : (e.paidBy.entityName || "Employee"), amount: e.amount }));
  const otherExpenses = projExpenses.filter(e => e.category === "other").map(e => ({ id: e.id, date: e.date, description: e.description || e.subCategory || "Other expense", whoPaid: !e.paidBy ? "Company" : e.paidBy.type === "company" ? "Company" : (e.paidBy.entityName || "Employee"), amount: e.amount }));

  const transportTotal = transportExpenses.reduce((s, e) => s + e.amount, 0);
  const inHouseLabourTotal = labourExpenses.reduce((s, e) => s + e.amount, 0);
  const outsourcedTotal = outsourcedWorkRows.reduce((s, e) => s + e.total, 0);
  const labourTotal = inHouseLabourTotal + outsourcedTotal;
  const materialTotal = materialExpenses.reduce((s, e) => s + e.amount, 0);

  const projectDocumentedRevenue = useMemo(() => {
    if (!id) return 0;
    return [...invoices, ...(saleBills ?? [])].filter(i => i.projectId === id).reduce((s, i) => s + (i.total ?? 0), 0);
  }, [id, invoices, saleBills]);

  // Inventory items for material assignment
  const inventoryItems = globalInvItems.map(item => ({
    id: item.id, name: item.size ? `${item.name} (${item.size})` : item.name,
    quantity: item.stock, unitPrice: item.buyPrice, unit: item.unit, category: item.category, size: item.size, allowDecimalReturn: item.allowDecimalReturn,
  }));

  const employeesList = employees.map(emp => ({ id: emp.id, name: emp.name, role: emp.role, salary: emp.salary, initial: emp.name.charAt(0) }));

  // Attendance rows for this project
  const attendanceRows = attendanceRecords
    .filter((record) => record.sites.includes(project?.id ?? ""))
    .map((record) => ({
      ...record,
      employeeName: employees.find((employee) => employee.id === record.employeeId)?.name ?? `Employee ${record.employeeId}`,
    }));

  // Modal states
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isAddOutsourceOpen, setIsAddOutsourceOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [driveLink, setDriveLink] = useState("");
  const [newLink, setNewLink] = useState("");
  const [activeTab, setActiveTab] = useState("progress-report");

  // Edit project form state
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectClient, setEditProjectClient] = useState("");
  const [editProjectLocation, setEditProjectLocation] = useState("");
  const [editProjectCapacity, setEditProjectCapacity] = useState("");
  const [editProjectContractValue, setEditProjectContractValue] = useState("");

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
  const defaultSiteTemplateId = useMemo(() => {
    const pt = project?.projectType;
    if (pt === "Commercial" || pt === "Industrial") return siteChecklistTemplates.find(t => t.segment === "commercial")?.id ?? siteChecklistTemplates[0]?.id ?? "";
    return siteChecklistTemplates.find(t => t.segment === "residential")?.id ?? siteChecklistTemplates[0]?.id ?? "";
  }, [project?.projectType, siteChecklistTemplates]);

  // Derived project status
  const projectStatus = project?.status || "Ongoing";
  const isProjectCompleted = projectStatus === "Completed";

  const openEditProjectModal = () => {
    if (project) {
      setEditProjectName(project.name);
      setEditProjectClient(project.client);
      setEditProjectLocation(project.location);
      setEditProjectCapacity(project.capacity.replace(" kW", ""));
      setEditProjectContractValue(project.contractAmount.toString());
    }
    setIsEditProjectOpen(true);
  };

  const handleSaveEditProject = () => {
    if (!project) return;
    updateProject(project.id, {
      name: editProjectName || project.name,
      client: editProjectClient || project.client,
      capacity: `${editProjectCapacity || "0"} kW`,
      location: editProjectLocation || project.location,
      contractAmount: parseFloat(editProjectContractValue) || 0,
    });
    toast({ title: "Project Updated", description: `${editProjectName || project.name} has been updated successfully` });
    setIsEditProjectOpen(false);
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
    toast({ title: "Outsource Work Added", description: `₹${total.toLocaleString()} recorded` });
    setIsAddOutsourceOpen(false);
    setOutsourceEmployees(""); setOutsourceDays(""); setOutsourceRate(""); setOutsourceDescription("");
    setOtherWorkTag(""); setOtherWorkAmount(""); setOtherWorkNotes("");
  };

  // Materials tab helpers
  const getPresetItems = () => {
    if (quotation?.presetSnapshot) return quotation.presetSnapshot.map(item => ({ id: item.id, itemName: item.name, category: "Material", quantity: item.quantity, unit: item.unit }));
    if (project?.presetId) {
      const preset = inventoryPresets.find(p => p.id === project.presetId);
      if (preset) return preset.items.map((item, idx) => ({ id: idx + 1, itemName: item.name, category: "Material", quantity: item.quantity, unit: item.unit }));
    }
    return [];
  };
  const getProjectMaterialsForTab = () => {
    const ledger = project?.siteMaterialLedger;
    if (ledger?.length) return ledger.map(entry => { const inv = globalInvItems.find(i => i.id === entry.itemId); return { id: entry.itemId, name: inv?.size ? `${inv.name} (${inv.size})` : inv?.name ?? `Item ${entry.itemId}`, totalQuantitySent: entry.issuedQty, unitPrice: inv?.buyPrice ?? 0, unit: inv?.unit || "pcs", category: inv?.category || "Material", issues: [{ date: entry.updatedAt.split("T")[0], quantity: entry.issuedQty }] }; });
    if (project?.materialsSent?.length) return project.materialsSent.map(item => ({ id: item.itemId, name: item.itemName, totalQuantitySent: item.quantity, unitPrice: item.unitPrice, unit: inventoryItems.find(inv => inv.id === item.itemId)?.unit || "pcs", category: inventoryItems.find(inv => inv.id === item.itemId)?.category || "Material", issues: [{ date: item.dateIssued, quantity: item.quantity }] }));
    return [];
  };

  if (!project) {
    return (
      <PageShell className="space-y-4">
        <StickyPageHeader breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: "Not found" }]} />
        <Card><CardContent className="py-8">
          <p className="text-sm text-muted-foreground">Project not found.</p>
          <Button className="mt-4" variant="outline" asChild><Link to="/projects">Back to projects</Link></Button>
        </CardContent></Card>
      </PageShell>
    );
  }

  const kind = project.projectKind ?? (project.dealType === "Solo" ? "SOLO_EPC" : project.dealType === "Partner" ? "PARTNER_EPC" : project.dealType === "Fixed" ? "FIXED_EPC" : project.dealType === "Vendorship" ? "VENDOR_NETWORK" : "INC");
  const partnerRow = project.partners?.[0];
  const linkedPartner = partnerRow ? partners.find((partner) => partner.id === partnerRow.partnerId) : undefined;
  const projectProfit = calculateProjectProfit(project);
  const partnerEarning = partnerRow ? calculateProjectPartnerEarning(project, partnerRow) : 0;
  const vendorshipFee = partnerRow ? calculateProjectVendorshipFee(partnerRow) : 0;
  const partnerProjectTransactions = partnerRow ? partnerTransactions.filter((txn) => txn.partnerId === partnerRow.partnerId && txn.projectId === project.id) : [];
  const partnerPaid = partnerProjectTransactions.filter(isPartnerCreditTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const partnerReceived = partnerProjectTransactions.filter(isPartnerDebitTransaction).reduce((sum, txn) => sum + txn.amount, 0);
  const pendingToPartner = Math.max(0, partnerEarning - partnerPaid);
  const pendingFromPartner = Math.max(0, vendorshipFee - partnerReceived);
  const billed = projectInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const collected = projectPayments.filter((payment) => payment.direction === "in").reduce((sum, payment) => sum + payment.amount, 0);
  const actualCost = project.totalCost || projectExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const companyRetainedRevenue = project.contractAmount - partnerEarning;
  const companyNet = kind === "VENDOR_NETWORK" ? projectProfit + vendorshipFee : companyRetainedRevenue - actualCost;

  // Merged tab definitions: operational tabs + kind-specific financial tabs
  const kindTabs =
    project.dealType === "Partner" ? [{ value: "partner", label: "Partner Financials" }]
    : project.dealType === "Fixed" ? [{ value: "fixed", label: "Fixed Margin" }]
    : project.dealType === "Vendorship" ? [{ value: "vendorship", label: "Vendorship Fee" }]
    : [];

  const baseTabs = [
    { value: "progress-report", label: "Progress Report" },
    { value: "document-creator", label: "Document Creator" },
    { value: "materials-sent", label: "Materials Sent" },
  ];

  const financialTabs = [
    { value: "billing", label: "Billing" },
    { value: "costs", label: "Costs" },
  ];

  const executionTabs = [
    { value: "execution", label: "Execution" },
    { value: "sites", label: "Sites" },
    { value: "attendance", label: "Attendance" },
  ];

  let tabDefs = [...baseTabs, ...kindTabs, ...financialTabs, ...executionTabs];

  // Logic: Solo shows everything. INC hides Document Creator and potentially others.
  if (project.dealType === "INC") {
    tabDefs = tabDefs.filter(t => t.value !== "document-creator" && t.value !== "billing" && t.value !== "costs");
  }

  const contractDisplay = project?.contractAmount || 0;
  const receivedDisplay = project?.amountReceived || 0;
  const pendingDisplay = Math.max(0, contractDisplay - receivedDisplay);

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects", to: "/projects" }, { label: project.name }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Contract", value: formatCurrency(project.contractAmount) },
              { label: "Actual cost", value: formatCurrency(actualCost) },
              { label: "Profit", value: formatCurrency(projectProfit) },
              { label: "Collected", value: formatCurrency(collected) },
            ]}
          />
        }
      >
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            List
          </Link>
        </Button>
      </StickyPageHeader>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/projects"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
                <span className="text-xl md:text-2xl font-semibold">{project.name}</span>
                <Badge variant="outline" className={projectKindTone[kind]}>{projectKindLabel[kind]}</Badge>
                <Badge variant="secondary">{project.status}</Badge>
                <Badge variant="outline">{project.progressStage}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="text-muted-foreground">Client: <span className="text-foreground font-medium">{project.client}</span></span>
                <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{project.location}</span>
                <span className="text-muted-foreground">Capacity: <span className="text-foreground font-medium">{project.capacity}</span></span>
                <span className="text-muted-foreground">Contract: <span className="text-primary font-semibold">{formatCurrency(project.contractAmount)}</span></span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm pt-2 border-t">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Start:</span><span className="font-medium">{project.startDate}</span></div>
                {quotation && <Link to={`/quotations?highlight=${quotation.id}`}><Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 cursor-pointer hover:bg-amber-500/20 flex items-center gap-1"><LinkIcon className="w-3 h-3" />From: {quotation.quotationNumber}</Badge></Link>}
                {partnerRow && <Badge className="bg-blue-500/10 text-blue-600 border-0 text-xs"><Handshake className="w-3 h-3 mr-1" />{partnerRow.partnerName}</Badge>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[160px]">
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-600/30" onClick={() => { const params = new URLSearchParams({ from: "project", client: project.client, address: project.clientAddress || "", contact: project.clientPhone || "", state: "08", project: project.name, amount: project.contractAmount.toString(), projectId: id || "" }); if (project.quotationId) params.set("quotationId", project.quotationId); navigate(`/invoices?${params.toString()}`); }}>
                <FileText className="w-4 h-4 mr-1" />Create Invoice
              </Button>
              <Button variant="outline" size="sm" className={`text-destructive border-destructive/30 ${isProjectCompleted ? 'opacity-50' : ''}`} onClick={() => { if (isProjectCompleted) { toast({ title: "Project Completed", description: "Reactivate to make changes.", variant: "destructive" }); return; } setIsAddExpenseOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />Add Expense
              </Button>
              <Button variant="outline" size="sm" className={`text-amber-600 border-amber-600/30 ${isProjectCompleted ? 'opacity-50' : ''}`} onClick={() => { if (isProjectCompleted) { toast({ title: "Project Completed", description: "Reactivate to make changes.", variant: "destructive" }); return; } setIsAddOutsourceOpen(true); }}>
                <Users className="w-4 h-4 mr-1" />Outsource Work
              </Button>
              <Button variant="outline" size="sm" className={isProjectCompleted ? 'opacity-50' : ''} onClick={() => { if (isProjectCompleted) { toast({ title: "Project Completed", description: "Reactivate to make changes.", variant: "destructive" }); return; } openEditProjectModal(); }}>
                <Edit className="w-4 h-4 mr-1" />Edit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={tabDefs[0].value} className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabDefs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══ Progress Report ═══ */}
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
            projectPaymentType={project.paymentType as any}
            projectContractAmount={project.contractAmount}
            projectAmountReceived={project.amountReceived}
            onAddBlockage={(b) => addBlockage(b)}
            onResolveBlockage={(bId) => updateBlockage(bId, { status: "resolved", resolvedAt: new Date().toISOString() })}
            onAddTicket={(t) => addOperationalTicket({ ...t, id: generateId("TKT"), createdAt: new Date().toISOString() })}
            onUpdateTimeline={(updates) => updateProjectTimelineForProject(project.id, updates)}
          />
        </TabsContent>

        {/* ═══ Document Creator ═══ */}
        <TabsContent value="document-creator" className="space-y-4">
          <ProjectDocumentsStudio
            project={project}
            quotation={quotation}
            updateProject={updateProject}
            generateId={generateId}
          />
        </TabsContent>

        {/* ═══ Materials Sent ═══ */}
        <TabsContent value="materials-sent" className="space-y-4">
          <MaterialsSentTab
            projectName={project.name}
            projectId={project.id}
            materials={getProjectMaterialsForTab()}
            presetItems={getPresetItems().map(p => ({ id: p.id, name: p.itemName, quantity: p.quantity, unit: p.unit }))}
            inventoryItems={inventoryItems}
            onIssueMaterials={async (items) => {
              for (const item of items) {
                recordProjectMaterialMovement({ projectId: project.id, itemId: item.id, movementType: "IssueToSite", quantity: item.quantity });
              }
            }}
            onReturnMaterial={async (itemId, qty) => { recordProjectMaterialMovement({ projectId: project.id, itemId, movementType: "ReturnToWarehouse", quantity: qty }); return { ok: true }; }}
            onScrapMaterial={async (itemId, qty) => { recordProjectMaterialMovement({ projectId: project.id, itemId, movementType: "ScrapSite", quantity: qty }); return { ok: true }; }}
            onConsumeMaterial={async (itemId, qty) => { recordProjectMaterialMovement({ projectId: project.id, itemId, movementType: "ConsumptionAtSite", quantity: qty }); return { ok: true }; }}
          />
        </TabsContent>

        <TabsContent value="partner" className="space-y-4">
          <TabCard title="Profit Partner Logic" icon={<Handshake className="h-4 w-4 text-blue-600" />}>
            <div className="grid gap-3 md:grid-cols-4">
              <MiniMetric label="Partner type" value={partnerProjectLabel(partnerRow)} />
              <MiniMetric label="Actual profit" value={formatCurrency(projectProfit)} />
              <MiniMetric label="Partner earning" value={formatCurrency(partnerEarning)} />
              <MiniMetric label="Pending to partner" value={formatCurrency(pendingToPartner)} />
            </div>
            {linkedPartner && (
              <Button className="mt-4" variant="outline" size="sm" asChild>
                <Link to={`/partners/${linkedPartner.id}`}>Open partner profile</Link>
              </Button>
            )}
          </TabCard>
        </TabsContent>

        <TabsContent value="fixed" className="space-y-4">
          <TabCard title="Fixed Share Logic" icon={<IndianRupee className="h-4 w-4 text-amber-700" />}>
            <div className="grid gap-3 md:grid-cols-5">
              <MiniMetric label="Sold at" value={formatCurrency(project.partnerCustomerSellAmount ?? project.contractAmount)} />
              <MiniMetric label="Company backend" value={formatCurrency(project.mssBackendAmount ?? 0)} />
              <MiniMetric label="Partner fixed share" value={formatCurrency(partnerEarning)} />
              <MiniMetric label="Paid to partner" value={formatCurrency(partnerPaid)} />
              <MiniMetric label="Pending to partner" value={formatCurrency(pendingToPartner)} />
            </div>
          </TabCard>
        </TabsContent>

        <TabsContent value="vendorship" className="space-y-4">
          <TabCard title="Vendorship Fee Logic" icon={<Users className="h-4 w-4 text-violet-700" />}>
            <div className="grid gap-3 md:grid-cols-5">
              <MiniMetric label="Partner type" value={partnerProjectLabel(partnerRow)} />
              <MiniMetric label="Revenue/profit share" value="None" />
              <MiniMetric label="Fee owed by partner" value={formatCurrency(vendorshipFee)} />
              <MiniMetric label="Received from partner" value={formatCurrency(partnerReceived)} />
              <MiniMetric label="Pending from partner" value={formatCurrency(pendingFromPartner)} />
            </div>
            {partnerRow?.notes && <p className="mt-4 text-sm text-muted-foreground">{partnerRow.notes}</p>}
          </TabCard>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <TabCard title="Company to Customer Billing" icon={<ReceiptText className="h-4 w-4 text-primary" />}>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <MiniMetric label="Contract value" value={formatCurrency(project.contractAmount)} />
              <MiniMetric label="Billed so far" value={formatCurrency(billed)} />
              <MiniMetric label="Collected so far" value={formatCurrency(collected)} />
            </div>
            <DataTableShell>
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
            <DataTableShell>
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
            <div className="mb-4 grid gap-3 md:grid-cols-4">
              <MiniMetric label="Material" value={formatCurrency(projectExpenses.filter((e) => e.category === "Material").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Labour" value={formatCurrency(projectExpenses.filter((e) => e.category === "Labour").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Transport" value={formatCurrency(projectExpenses.filter((e) => e.category === "Transport").reduce((sum, e) => sum + e.amount, 0))} />
              <MiniMetric label="Total cost" value={formatCurrency(actualCost)} />
            </div>
            <DataTableShell>
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
                <p className="text-sm text-muted-foreground">No material movement recorded.</p>
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
          </div>
        </TabsContent>

        {/* ═══ Attendance ═══ */}
        <TabsContent value="attendance" className="space-y-4">
          <TabCard title="Attendance Records" icon={<Users className="h-4 w-4 text-primary" />}>
            {attendanceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance tied to this project yet.</p>
            ) : (
              <DataTableShell>
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
            onRecordPayment={(payment) => addClientPaymentRecord({ ...payment, id: generateId("CPR"), recordedAt: new Date().toISOString() })}
            partnerName={partnerRow?.partnerName}
          />

          {/* Outsourced Work Log */}
          {outsourcedWorkRows.length > 0 && (
            <TabCard title="Outsourced Work Log" icon={<Briefcase className="h-4 w-4 text-amber-600" />}>
              <DataTableShell>
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
        {/* ═══ Sites ═══ */}
        <TabsContent value="sites" className="space-y-4">
          <TabCard title="Project Installation Sites" icon={<MapPin className="h-4 w-4 text-primary" />}>
            {projectSites.length === 0 ? (
              <div className="py-8 text-center bg-muted/20 rounded-lg border border-dashed">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No sites recorded for this project.</p>
                <Button className="mt-4" variant="outline" size="sm">Add Site</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {projectSites.map((site) => (
                  <Card key={site.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{site.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{site.status || "Active"}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
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
                                else toast({ title: "Error", description: res.error, variant: "destructive" });
                              }
                            }}
                          >
                            Apply Preset
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <DataTableShell>
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
                                <TableCell className="text-sm">{item.materialName}</TableCell>
                                <TableCell className="text-right font-medium">{item.requiredQuantity}</TableCell>
                                <TableCell>
                                  {item.status === "dispatched" ? (
                                    <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Dispatched
                                    </Badge>
                                  ) : (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-7 text-[10px] px-2 border-primary text-primary hover:bg-primary hover:text-white"
                                      onClick={async () => {
                                        const res = await dispatchSiteMaterial(project.id, site.id, item.id);
                                        if (res.ok) toast({ title: "Material Dispatched", description: `${item.materialName} deducted from warehouse.` });
                                        else toast({ title: "Error", description: res.error, variant: "destructive" });
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
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground italic">
                                No checklist items. Apply a preset above to initialize.
                              </TableCell>
                            </TableRow>
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
      </Tabs>

      {/* ═══ MODALS ═══ */}

      {/* Edit Project Modal */}
      <Sheet open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Edit Project</SheetTitle>
            <SheetDescription>Update project details</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Project Name</Label><Input value={editProjectName} onChange={(e) => setEditProjectName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Client</Label><Input value={editProjectClient} onChange={(e) => setEditProjectClient(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Location</Label><Input value={editProjectLocation} onChange={(e) => setEditProjectLocation(e.target.value)} /></div>
              <div className="space-y-2"><Label>Capacity (kW)</Label><Input type="number" value={editProjectCapacity} onChange={(e) => setEditProjectCapacity(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Contract Value (₹)</Label><Input type="number" value={editProjectContractValue} onChange={(e) => setEditProjectContractValue(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEditProject}>Save Changes</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Outsource Work Modal */}
      <Sheet open={isAddOutsourceOpen} onOpenChange={setIsAddOutsourceOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                  Total: <span className="font-semibold text-primary">₹{((parseInt(outsourceEmployees) || 0) * (parseInt(outsourceDays) || 0) * (parseFloat(outsourceRate) || 0)).toLocaleString()}</span>
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
        </SheetContent>
      </Sheet>

      {/* Unified Expense Modal */}
      {isAddExpenseOpen && (
        <UnifiedExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          projectId={project.id}
          projectName={project.name}
        />
      )}
    </PageShell>
  );
};

export default ProjectDetail;

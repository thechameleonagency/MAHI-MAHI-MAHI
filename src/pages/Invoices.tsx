import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { Plus, Search, FileText, Eye, Download, IndianRupee, Printer, Copy, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { LifecycleTerminalBanner } from "@/components/ui/LifecycleTerminalBanner";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  buildCustomerToInvoiceDraft,
  buildInvoiceDuplicateDraft,
  buildInvoiceToPaymentDraft,
  buildProjectToInvoiceDraft,
  loadCreateDraft,
  parseCreateFromParam,
  resolveCreateFromOrToast,
  stripCreateFromParam,
  stripQuickCreateParam,
  saveCreateDraft,
  type InvoiceDraftFromCustomer,
  type InvoiceDraftFromProject,
} from "@/lib/createFromContext";
import { InvoiceCreateSheet } from "@/components/invoices/InvoiceCreateSheet";
import ExportHeader from "@/components/ExportHeader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Invoice, InvoiceItem } from "@/types/finance";
import { PAYMENT_MODES } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { isActiveBill, getInvoiceOpenBalance } from "@/lib/billingSelectors";
import { getOutstandingReceivables } from "@/domain/finance/financialSemantics";
import { InvoiceLineItemsReadOnly } from "@/components/finance/InvoiceLineItemsReadOnly";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/formatCurrency";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { AgingChip } from "@/components/ui/AgingChip";
import { getInvoiceOverdueAging } from "@/lib/agingHelpers";
import { matchesOpenReceivable } from "@/lib/billingListFilters";
import { useCan } from "@/hooks/useCan";
import { sanitizeMergedBillingDocuments } from "@/lib/sanitizeBillingDocuments";
import {
  deriveInvoiceStatusAfterReceipt,
  formatInvoiceBalanceLabel,
} from "@/lib/invoicePaymentStatus";

const Invoices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlProjectId = searchParams.get("project");
  const urlCustomerId = searchParams.get("customer");
  const urlDocType = searchParams.get("type");
  const urlStatus = searchParams.get("status");
  const urlReceivable = searchParams.get("receivable");
  const {
    invoices,
    saleBills,
    payments,
    customers,
    projects,
    quotations,
    inventoryItems,
    servicePresets,
    partners,
    addInvoice,
    addSaleBill,
    updateInvoice,
    updateSaleBill,
    recordCustomerInflow,
    addPartnerTransaction,
    addCustomer,
    generateId,
  } = useAppData();
  const canCreateInvoice = useCan("invoice", "create");
  const canEditInvoice = useCan("invoice", "edit");
  const canDeleteInvoice = useCan("invoice", "delete");
  const canRecordPayment = useCan("payment", "create");
  
  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setListReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!urlStatus) return;
    const allowed = new Set(["draft", "pending", "partial", "paid", "overpaid", "overdue"]);
    if (allowed.has(urlStatus)) {
      setStatusFilter(urlStatus);
      setTablePage(1);
    }
  }, [urlStatus]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [receivableFilter, setReceivableFilter] = useState<"all" | "open">(() =>
    urlReceivable === "open" ? "open" : "all",
  );

  useEffect(() => {
    if (urlReceivable === "open") {
      setReceivableFilter("open");
      setStatusFilter("all");
      setTablePage(1);
    }
  }, [urlReceivable]);
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "invoice" | "sale-bill">("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  
  // Invoice Detail & Payment
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
  const [isEditDraftOpen, setIsEditDraftOpen] = useState(false);
  const [editDraftDueDate, setEditDraftDueDate] = useState("");
  const [editDraftNotes, setEditDraftNotes] = useState("");
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  // W5 — partner-paid-by-client routing
  const [paymentSource, setPaymentSource] = useState<"mss" | "partner" | "split">("mss");
  const [partnerPortionAmount, setPartnerPortionAmount] = useState("");
  
  // Prefill data from URL params
  const [invoicePrefill, setInvoicePrefill] = useState<{
    customerName?: string;
    customerAddress?: string;
    customerState?: string;
    customerContact?: string;
    projectId?: string;
    quotationId?: string;
    total?: number;
    items?: InvoiceItem[];
    documentType?: "invoice" | "sale-bill";
  } | undefined>(undefined);
  
  // Invoice preview ref for PDF export
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  const draftToInvoicePrefill = (
    draft: InvoiceDraftFromProject | InvoiceDraftFromCustomer,
    total?: number,
  ) => ({
    customerName: draft.customerName,
    customerAddress: draft.customerAddress,
    customerContact: "customerPhone" in draft ? draft.customerPhone : undefined,
    customerState: draft.customerState,
    customerGstin: "customerGstin" in draft ? draft.customerGstin : undefined,
    paymentTerms: "paymentTerms" in draft ? draft.paymentTerms : undefined,
    projectId: "projectId" in draft ? draft.projectId : undefined,
    quotationId: "quotationId" in draft ? draft.quotationId : undefined,
    total: total && total > 0 ? total : undefined,
    services: "services" in draft && draft.services?.length ? draft.services : undefined,
    items:
      total && total > 0 && !("services" in draft && draft.services?.length)
        ? [
            {
              description: "projectId" in draft ? `Invoice for project` : `Invoice for ${draft.customerName}`,
              hsn: "85414012",
              quantity: 1,
              rate: total,
              gstRate: 12,
            },
          ]
        : undefined,
  });

  // Handle URL parameters for prefilling invoice from quotation or project
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const createFrom = parseCreateFromParam(searchParams.get("createFrom"));

    if (createFrom?.kind === "proj") {
      const stored = loadCreateDraft<InvoiceDraftFromProject>("invoice-create-draft");
      const proj =
        stored?.projectId === createFrom.id
          ? projects.find((p) => p.id === createFrom.id)
          : resolveCreateFromOrToast("proj", createFrom.id, (entityId) =>
              projects.find((p) => p.id === entityId),
            );
      const draft =
        stored?.projectId === createFrom.id
          ? stored
          : proj
            ? buildProjectToInvoiceDraft(proj, customers.find((c) => c.id === proj.customerId))
            : null;
      stripCreateFromParam(searchParams);
      const remaining = searchParams.toString();
      if (draft) {
        setInvoicePrefill(
          draftToInvoicePrefill(draft, draft.openBalanceSuggestion || proj?.contractAmount),
        );
        setIsAddInvoiceOpen(true);
        toast({ title: "Creating invoice from project", description: draft.customerName });
      }
      navigate(`/invoices${remaining ? `?${remaining}` : ""}`, { replace: true });
      return;
    }

    if (createFrom?.kind === "customer") {
      const stored = loadCreateDraft<InvoiceDraftFromCustomer>("invoice-create-draft");
      const cust =
        stored?.customerId === createFrom.id
          ? customers.find((c) => c.id === createFrom.id)
          : resolveCreateFromOrToast("customer", createFrom.id, (entityId) =>
              customers.find((c) => c.id === entityId),
            );
      const draft =
        stored?.customerId === createFrom.id ? stored : cust ? buildCustomerToInvoiceDraft(cust) : null;
      stripCreateFromParam(searchParams);
      const remaining = searchParams.toString();
      if (draft) {
        saveCreateDraft("invoice-create-draft", draft);
        setInvoicePrefill(draftToInvoicePrefill(draft));
        setIsAddInvoiceOpen(true);
      }
      navigate(`/invoices${remaining ? `?${remaining}` : ""}`, { replace: true });
      return;
    }

    if (searchParams.get("create") === "1") {
      stripQuickCreateParam(searchParams);
      const remaining = searchParams.toString();
      if (canCreateInvoice) {
        setInvoicePrefill(undefined);
        setIsAddInvoiceOpen(true);
      }
      navigate(`/invoices${remaining ? `?${remaining}` : ""}`, { replace: true });
      return;
    }

    const from = searchParams.get('from');
    const client = searchParams.get('client');
    const amount = searchParams.get('amount');
    const quotationId = searchParams.get('quotationId');
    const projectId = searchParams.get('projectId');
    const address = searchParams.get('address');
    const contact = searchParams.get('contact');
    const state = searchParams.get('state');
    const project = searchParams.get('project');

    if (from === 'quotation' && client) {
      const parsedAmount = Number.parseFloat(amount || "0");
      const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
      const prefillData = {
        customerName: client,
        customerAddress: address || undefined,
        customerContact: contact || undefined,
        customerState: state || undefined,
        quotationId: quotationId || undefined,
        total: safeAmount,
        items: safeAmount > 0 ? [{
          description: `Solar System Installation${project ? ` - ${project}` : ''}`,
          hsn: "85414012",
          quantity: 1,
          rate: safeAmount,
          gstRate: 12
        }] : undefined,
      };
      setInvoicePrefill(prefillData);
      setTimeout(() => {
        setIsAddInvoiceOpen(true);
      }, 100);
      
      toast({
        title: "Creating Invoice from Quotation",
        description: `Prefilling invoice for ${client}`,
      });
      
      navigate('/invoices', { replace: true });
    } else if (from === 'project' && client) {
      const parsedAmount = Number.parseFloat(amount || "0");
      const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;
      const prefillData = {
        customerName: client,
        customerAddress: address || undefined,
        customerContact: contact || undefined,
        customerState: state || undefined,
        projectId: projectId || undefined,
        total: safeAmount,
        items: safeAmount > 0 ? [{
          description: `Solar System Installation - ${project || 'Project'}`,
          hsn: "85414012",
          quantity: 1,
          rate: safeAmount,
          gstRate: 12
        }] : undefined,
      };
      setInvoicePrefill(prefillData);
      setTimeout(() => {
        setIsAddInvoiceOpen(true);
      }, 100);
      
      toast({
        title: "Creating Invoice from Project",
        description: `Prefilling invoice for ${client}`,
      });
      
      navigate('/invoices', { replace: true });
    }
  }, [location.search, navigate, canCreateInvoice]);

  useEffect(() => {
    if (urlDocType === "sale-bill") setDocTypeFilter("sale-bill");
  }, [urlDocType]);

  // C1: handle `?invoice=<id>` deep link from GlobalSearch / businessAlerts / AuditLogs.
  // Open the invoice detail sheet; toast if missing; strip the param after handle.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const target = params.get("invoice");
    if (!target) return;
    const found =
      invoices.find((i) => i.id === target) ?? saleBills.find((i) => i.id === target);
    if (found) {
      setSelectedInvoice(found);
      setIsInvoiceDetailOpen(true);
      if (params.get("recordPayment") === "1") {
        const draft = buildInvoiceToPaymentDraft(found);
        saveCreateDraft("payment-create-draft", draft);
        setPaymentAmount(String(draft.amount));
        if (draft.mode) setPaymentMode(draft.mode);
        setIsRecordPaymentOpen(true);
      }
    } else {
      toast({
        title: "Invoice not found",
        description: `No invoice or sale bill with id ${target}.`,
        variant: "destructive",
      });
    }
    params.delete("invoice");
    params.delete("recordPayment");
    const remaining = params.toString();
    navigate(`/invoices${remaining ? `?${remaining}` : ""}`, { replace: true });
  }, [location.search, invoices, saleBills, navigate]);

  const handleInvoiceCreated = (
    invoice: Invoice,
    options?: { highValueJustification?: string },
  ) => {
    if (invoice.projectId) {
      const proj = projects.find((p) => p.id === invoice.projectId);
      const cap = proj?.contractAmount;
      if (typeof cap === "number" && cap > 0 && invoice.total > cap + 0.01) {
        toast({
          title: "Exceeds project contract",
          description: `Invoice total ${formatINR(invoice.total)} is above project contract ${formatINR(cap)}.`,
          variant: "destructive",
        });
        return;
      }
    }
    if (invoice.type === "sale-bill") {
      addSaleBill(invoice, options);
    } else {
      addInvoice(invoice, options);
    }
    setIsAddInvoiceOpen(false);
    setInvoicePrefill(undefined);
    setLastConfirm({ variant: "success", title: "Document created", description: `${invoice.invoiceNumber} has been created` });
  };

  const handleRecordPayment = () => {
    if (!selectedInvoice) {
      setLastConfirm({ variant: "error", title: "Select an invoice first" });
      return;
    }
    if (selectedInvoice.status === "draft") {
      setLastConfirm({ variant: "error", title: "Finalize draft first", description: "Draft documents cannot receive payments until finalized." });
      return;
    }
    if (selectedInvoice.status === "voided") {
      setLastConfirm({ variant: "error", title: "Invoice voided", description: "Voided invoices cannot receive payments." });
      return;
    }
    if (!paymentAmount) {
      setLastConfirm({ variant: "error", title: "Amount is required" });
      return;
    }

    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLastConfirm({ variant: "error", title: "Invalid amount", description: "Payment amount must be greater than zero." });
      return;
    }
    // W5 — partner-routing split + partner-receivable tracking
    const linkedProject = selectedInvoice.projectId ? projects.find(p => p.id === selectedInvoice.projectId) : undefined;
    const projectPartnerId = (linkedProject?.scope as { partnerId?: string } | undefined)?.partnerId;

    // Compute MSS / partner portions
    let mssPortion = amount;
    let partnerPortion = 0;
    if (paymentSource === "partner" && projectPartnerId) {
      mssPortion = 0;
      partnerPortion = amount;
    } else if (paymentSource === "split" && projectPartnerId) {
      partnerPortion = Number.parseFloat(partnerPortionAmount) || 0;
      if (partnerPortion < 0 || partnerPortion > amount) {
        setLastConfirm({ variant: "error", title: "Invalid split", description: "Partner portion must be between 0 and total amount." });
        return;
      }
      mssPortion = amount - partnerPortion;
    }

    // Invoice always reflects FULL collected amount (regardless of routing)
    const newReceived = (selectedInvoice.amountReceived || 0) + amount;
    const newStatus = deriveInvoiceStatusAfterReceipt({
      total: selectedInvoice.total,
      amountReceived: newReceived,
    });

    const patch = {
      amountReceived: newReceived,
      status: newStatus as Invoice["status"],
      receivedIn: paymentMode
    };
    if ((selectedInvoice.type ?? "invoice") === "sale-bill") {
      updateSaleBill(selectedInvoice.id, patch);
    } else {
      updateInvoice(selectedInvoice.id, patch);
    }

    // MSS-side Payment (recorded whenever mssPortion > 0)
    if (mssPortion > 0) {
      recordCustomerInflow({
        path: "invoice_targeted",
        payment: {
          id: generateId("PAY"),
          date: paymentDate,
          amount: mssPortion,
          direction: "in",
          paymentMode: paymentMode,
          counterpartyType: "customer",
          counterpartyId: selectedInvoice.customerId,
          counterpartyName: selectedInvoice.customerName,
          invoiceId: selectedInvoice.id,
          projectId: selectedInvoice.projectId || undefined,
          notes: `Payment for ${selectedInvoice.invoiceNumber}${paymentSource === "split" ? " (MSS portion of split)" : ""}`,
          paymentSource: paymentSource === "split" ? "split" : "mss",
          partnerId: paymentSource === "split" ? projectPartnerId : undefined,
          partnerPortion: paymentSource === "split" ? partnerPortion : undefined,
        },
      });
    }

    // Partner-side: separate Payment (counterpartyType=partner) + PartnerTransaction
    if (partnerPortion > 0 && projectPartnerId) {
      const partner = partners.find(p => p.id === projectPartnerId);
      recordCustomerInflow({
        path: "invoice_targeted",
        payment: {
          id: generateId("PAY"),
          date: paymentDate,
          amount: partnerPortion,
          direction: "in",
          paymentMode: paymentMode,
          counterpartyType: "partner",
          counterpartyId: projectPartnerId,
          counterpartyName: partner?.name ?? "Partner",
          invoiceId: selectedInvoice.id,
          projectId: selectedInvoice.projectId || undefined,
          notes: `Client paid partner on our behalf · Invoice ${selectedInvoice.invoiceNumber}`,
          paymentSource: "partner",
          partnerId: projectPartnerId,
        },
      });
      addPartnerTransaction({
        id: generateId('PT'),
        partnerId: projectPartnerId,
        partnerName: partner?.name ?? "Partner",
        date: paymentDate,
        amount: partnerPortion,
        type: "Customer Paid Partner",
        direction: "received",
        projectId: selectedInvoice.projectId || undefined,
        notes: `Client paid ${formatINR(partnerPortion)} to partner for invoice ${selectedInvoice.invoiceNumber}`,
      });
    }

    setIsRecordPaymentOpen(false);
    setPaymentAmount("");
    setPaymentMode("");
    setPaymentSource("mss");
    setPartnerPortionAmount("");
    setLastConfirm({
      variant: "success",
      title: "Payment recorded",
      description: paymentSource === "mss"
        ? `${formatINR(amount)} received`
        : paymentSource === "partner"
          ? `${formatINR(amount)} → partner ledger (Customer Paid Partner)`
          : `${formatINR(mssPortion)} to MSS + ${formatINR(partnerPortion)} → partner`,
    });
  };

  const handleVoidInvoice = () => {
    if (!selectedInvoice) return;
    if (selectedInvoice.status === "voided") {
      setLastConfirm({ variant: "warning", title: "Already voided", description: "This invoice is already voided." });
      return;
    }
    if ((selectedInvoice.amountReceived ?? 0) > 0) {
      setLastConfirm({
        variant: "error",
        title: "Cannot void",
        description: "Reverse or adjust payments before voiding this invoice.",
      });
      return;
    }
    const patch = { status: "voided" as const };
    if ((selectedInvoice.type ?? "invoice") === "sale-bill") {
      updateSaleBill(selectedInvoice.id, patch);
    } else {
      updateInvoice(selectedInvoice.id, patch);
    }
    setSelectedInvoice({ ...selectedInvoice, ...patch });
    setVoidConfirmOpen(false);
    setLastConfirm({ variant: "warning", title: "Invoice voided", description: `${selectedInvoice.invoiceNumber} is no longer billable.` });
  };

  const handleFinalizeDraft = () => {
    if (!selectedInvoice || selectedInvoice.status !== "draft") return;
    const today = new Date().toISOString().split("T")[0];
    const invDate = selectedInvoice.invoiceDate?.trim() || today;
    const due = selectedInvoice.dueDate?.trim() || invDate;
    const patch = {
      status: "pending" as const,
      invoiceDate: invDate,
      dueDate: due,
    };
    if ((selectedInvoice.type ?? "invoice") === "sale-bill") {
      updateSaleBill(selectedInvoice.id, patch);
    } else {
      updateInvoice(selectedInvoice.id, patch);
    }
    setSelectedInvoice((prev) => (prev && prev.id === selectedInvoice.id ? { ...prev, ...patch } : prev));
    setLastConfirm({ variant: "success", title: "Draft finalized", description: `${selectedInvoice.invoiceNumber} is now pending collection.` });
  };

  const handleExportPDF = async () => {
    if (!invoicePreviewRef.current || !selectedInvoice) return;
    
    try {
      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedInvoice.invoiceNumber}.pdf`);
      
      toast({ title: "PDF Exported", description: "Invoice has been exported successfully" });
    } catch (_error) {
      toast({ title: "Export Failed", description: "Could not export PDF", variant: "destructive" });
    }
  };

  const allBillingDocuments = useMemo(
    () =>
      sanitizeMergedBillingDocuments(invoices, saleBills).sort(
        (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime(),
      ),
    [invoices, saleBills],
  );

  const existingDocuments = useMemo(
    () => [...invoices, ...saleBills].map((d) => ({ invoiceNumber: d.invoiceNumber })),
    [invoices, saleBills],
  );

  const filteredInvoices = useMemo(
    () =>
      allBillingDocuments.filter((i) => {
        const matchesSearch =
          i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || i.status === statusFilter;
        const matchesReceivable =
          receivableFilter !== "open" || matchesOpenReceivable(i, payments);
        const t = i.type ?? "invoice";
        const matchesDoc =
          docTypeFilter === "all" ||
          (docTypeFilter === "invoice" && t === "invoice") ||
          (docTypeFilter === "sale-bill" && t === "sale-bill");
        const matchesProject = !urlProjectId || i.projectId === urlProjectId;
        const matchesCustomer = !urlCustomerId || i.customerId === urlCustomerId;
        return (
          matchesSearch &&
          matchesStatus &&
          matchesReceivable &&
          matchesDoc &&
          matchesProject &&
          matchesCustomer
        );
      }),
    [allBillingDocuments, searchQuery, statusFilter, receivableFilter, docTypeFilter, urlProjectId, urlCustomerId, payments],
  );

  const { pagedItems: pagedInvoices, safePage } = usePagedSlice(filteredInvoices, tablePage, tablePageSize);

  const getStatusBadge = (status: string) => (
    <StatusBadge
      status={status}
      label={
        status === "overpaid"
          ? "Overpaid"
          : status === "draft"
            ? "Draft"
            : status.charAt(0).toUpperCase() + status.slice(1)
      }
    />
  );

  const formatInvoiceRowDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
  };

  const formatDetailDate = (iso: string | undefined) => {
    if (!iso?.trim()) return "—";
    const d = new Date(iso.includes("T") ? iso : `${iso.slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN");
  };

  const invoiceOverdueAmount = (inv: Invoice) => {
    const bal = Math.max(0, inv.total - (inv.amountReceived || 0));
    if (bal < 0.01 || inv.status === "paid" || inv.status === "overpaid" || inv.status === "draft") return 0;
    const dueRaw = inv.dueDate?.trim();
    if (!dueRaw) return 0;
    const due = new Date(dueRaw.includes("T") ? dueRaw : `${dueRaw.slice(0, 10)}T23:59:59`);
    if (Number.isNaN(due.getTime())) return 0;
    return due.getTime() < Date.now() ? bal : 0;
  };
  // BL-16: KPI strip totals derive from canonical selectors so they (a) exclude
  // voided + draft documents from "Billed", (b) prefer payment-linked open balance
  // over a stored amountReceived subtract that can drift, and (c) match
  // Finance Hub / DebtorsCreditors / Audit ledger aggregates byte-for-byte.
  const totalInvoiced = allBillingDocuments
    .filter(isActiveBill)
    .reduce((sum, i) => sum + i.total, 0);
  const totalReceived = allBillingDocuments
    .filter(isActiveBill)
    .reduce((sum, i) => sum + (i.amountReceived ?? 0), 0);
  const pendingAmount = getOutstandingReceivables(invoices, payments, saleBills);
  const pendingCount = allBillingDocuments.filter(
    (i) => isActiveBill(i) && getInvoiceOpenBalance(i, payments) > 0.01,
  ).length;
  const overpaidCount = allBillingDocuments.filter((i) => i.status === "overpaid").length;

  return (
    <PageShell className="space-y-3 md:space-y-4">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Finance" },
          { label: "Invoices & sale bills" },
        ]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  placeholder="Customer or document #"
                  className="h-9 border-border bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setTablePage(1);
                  }}
                  aria-label="Search invoices"
                />
              </div>
              <Select
                value={docTypeFilter}
                onValueChange={(v) => {
                  setDocTypeFilter(v as typeof docTypeFilter);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] shrink-0 bg-muted/50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="invoice">Invoice (INV)</SelectItem>
                  <SelectItem value="sale-bill">Sale bill (SB)</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] shrink-0 bg-muted/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overpaid">Overpaid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Docs", value: allBillingDocuments.length },
                { label: "Billed", value: formatINR(totalInvoiced) },
                { label: "Received", value: formatINR(totalReceived) },
                { label: "Pending", value: formatINR(pendingAmount) },
                { label: "Open", value: pendingCount },
                {
                  label: "Overpaid",
                  value: overpaidCount,
                  active: statusFilter === "overpaid",
                  onClick: overpaidCount > 0
                    ? () => {
                        setStatusFilter("overpaid");
                        setTablePage(1);
                      }
                    : undefined,
                },
              ]}
            />
          </>
        }
      >
        <Button
          size="sm"
          onClick={() => {
            setInvoicePrefill(
              docTypeFilter === "sale-bill" ? { documentType: "sale-bill" } : undefined,
            );
            setIsAddInvoiceOpen(true);
          }}
          disabled={!canCreateInvoice}
        >
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </StickyPageHeader>

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      {/* Invoices Table */}
      <DataTableShell
        maxHeight={listTableViewportMaxHeight(tablePageSize)}
        scrollResetKey={`${safePage}-${tablePageSize}-${filteredInvoices.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={tablePageSize}
            total={filteredInvoices.length}
            onPageChange={setTablePage}
            onPageSizeChange={(n) => {
              setTablePageSize(n);
              setTablePage(1);
            }}
          />
        }
      >
        <TableHeader>
          <TableRow className={dataTableClasses.headRow}>
            <TableHead className="w-[72px]">Type</TableHead>
            <TableHead>Document #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Tax (C/S/I)</TableHead>
            <TableHead className="text-right">Overdue</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {!listReady ? (
              <ListSkeleton variant="table" count={5} columns={11} />
            ) : pagedInvoices.map((invoice) => (
              <TableRow key={invoice.id} className="border-border">
                <TableCell>
                  <Badge variant="outline" className="text-2xs font-normal">
                    {(invoice.type ?? "invoice") === "sale-bill" ? "SB" : "INV"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsInvoiceDetailOpen(true);
                      }}
                    >
                      {invoice.invoiceNumber}
                    </button>
                    <AgingChip signal={getInvoiceOverdueAging(invoice)} />
                  </div>
                </TableCell>
                <TableCell>
                  {invoice.customerId ? (
                    <EntityLink
                      entityType="customer"
                      entityId={invoice.customerId}
                      name={invoice.customerName}
                    />
                  ) : (
                    invoice.customerName
                  )}
                </TableCell>
                <TableCell className="text-right">{formatINR(invoice.total)}</TableCell>
                <TableCell className="text-right text-primary">{formatINR(invoice.amountReceived)}</TableCell>
                <TableCell
                  className={`text-right ${
                    invoice.status === "overpaid" || invoice.total - (invoice.amountReceived || 0) < -0.01
                      ? "font-medium text-violet-700 dark:text-violet-300"
                      : "text-warning"
                  }`}
                >
                  {formatInvoiceBalanceLabel(invoice.total, invoice.amountReceived || 0, invoice.status)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatINR(invoice.cgst || 0)} / {formatINR(invoice.sgst || 0)} / {formatINR(invoice.igst || 0)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {invoiceOverdueAmount(invoice) > 0 ? formatINR(invoiceOverdueAmount(invoice)) : "—"}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>{formatInvoiceRowDate(invoice.invoiceDate)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsInvoiceDetailOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {invoice.status !== "paid" && invoice.status !== "overpaid" && invoice.status !== "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsRecordPaymentOpen(true);
                        }}
                        disabled={!canRecordPayment}
                      >
                        <IndianRupee className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
      </DataTableShell>
      {filteredInvoices.length === 0 && (
        <ListEmptyState
          icon={FileText}
          title="No documents match"
          description="Try another status or search, or create a new invoice or sale bill."
          actionLabel="New document"
          onAction={() => setIsAddInvoiceOpen(true)}
        />
      )}

      {/* Create Invoice Sheet */}
      <InvoiceCreateSheet 
        open={isAddInvoiceOpen}
        onOpenChange={(open) => {
          setIsAddInvoiceOpen(open);
          if (!open) setInvoicePrefill(undefined);
        }}
        existingDocuments={existingDocuments}
        customers={customers}
        projects={projects}
        quotations={quotations}
        inventoryItems={inventoryItems}
        servicePresets={servicePresets}
        onCreated={handleInvoiceCreated}
        onCustomerCreated={(customer) => addCustomer(customer)}
        prefill={invoicePrefill}
        initialDocumentType={
          docTypeFilter === "sale-bill" && !invoicePrefill?.documentType ? "sale-bill" : undefined
        }
      />

      {/* Invoice Detail Modal */}
      <Sheet open={isInvoiceDetailOpen} onOpenChange={setIsInvoiceDetailOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedInvoice) return;
                    // Phase 2.3: Duplicate invoice — open create surface pre-filled with
                    // items/services only (NOT customer/projectId/dates per builder).
                    const dup = buildInvoiceDuplicateDraft(selectedInvoice);
                    saveCreateDraft("invoice-duplicate-draft", dup);
                    setInvoicePrefill({
                      items: dup.items as unknown as InvoiceItem[],
                    });
                    setIsInvoiceDetailOpen(false);
                    setTimeout(() => setIsAddInvoiceOpen(true), 100);
                    toast({
                      title: "Items copied",
                      description: dup.banner,
                    });
                  }}
                  title="Open Create Invoice pre-filled with these items"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                {selectedInvoice && selectedInvoice.status !== "voided" && selectedInvoice.status !== "draft" && canDeleteInvoice && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setVoidConfirmOpen(true)}
                    disabled={(selectedInvoice.amountReceived ?? 0) > 0}
                    title={(selectedInvoice.amountReceived ?? 0) > 0 ? "Clear payments before voiding" : undefined}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Void
                  </Button>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>
          
          {selectedInvoice?.status === "voided" && (
            <div className="px-6 pt-4">
              <LifecycleTerminalBanner
                variant="voided"
                title={`${selectedInvoice.invoiceNumber} voided`}
                description={
                  <span>
                    This invoice is no longer billable. Voided invoices cannot receive payments. Create a fresh draft if billing needs to resume.
                  </span>
                }
                primaryActionLabel="Duplicate as draft"
                onPrimaryAction={() => {
                  if (!selectedInvoice) return;
                  const draft = buildInvoiceDuplicateDraft(selectedInvoice);
                  saveCreateDraft("invoice-create-draft", draft);
                  setInvoicePrefill(draftToInvoicePrefill(draft, selectedInvoice.total));
                  setIsInvoiceDetailOpen(false);
                  setIsAddInvoiceOpen(true);
                }}
              />
            </div>
          )}

          {selectedInvoice && (
            <div ref={invoicePreviewRef} className="bg-background p-6">
              <ExportHeader title="TAX INVOICE" exportedBy={{ name: "Admin", role: "Manager" }} />
              
              <div className="grid grid-cols-2 gap-6 mt-6 mb-6">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Bill To:</h3>
                  <p className="font-semibold">{selectedInvoice.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.customerAddress}</p>
                  <p className="text-sm text-muted-foreground">{selectedInvoice.customerContact}</p>
                  {selectedInvoice.customerGstin && (
                    <p className="text-sm text-muted-foreground">GSTIN: {selectedInvoice.customerGstin}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">Date: {formatDetailDate(selectedInvoice.invoiceDate)}</p>
                  <p className="text-sm text-muted-foreground">Due: {formatDetailDate(selectedInvoice.dueDate)}</p>
                  <div className="mt-2">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>

              <Separator className="my-4" />

              <InvoiceLineItemsReadOnly items={selectedInvoice.items ?? []} />

              {(selectedInvoice.paymentTerms || selectedInvoice.bankAccount || selectedInvoice.notes) && (
                <div className="mt-4 rounded-lg border bg-muted/20 p-4 text-sm space-y-2">
                  {selectedInvoice.paymentTerms && (
                    <p>
                      <span className="text-muted-foreground">Payment terms: </span>
                      {selectedInvoice.paymentTerms}
                    </p>
                  )}
                  {selectedInvoice.bankAccount && (
                    <p>
                      <span className="text-muted-foreground">Bank / UPI: </span>
                      {selectedInvoice.bankAccount}
                    </p>
                  )}
                  {selectedInvoice.notes && (
                    <p className="whitespace-pre-wrap">
                      <span className="text-muted-foreground">Notes: </span>
                      {selectedInvoice.notes}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatINR(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.cgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>CGST:</span>
                      <span>{formatINR(selectedInvoice.cgst)}</span>
                    </div>
                  )}
                  {selectedInvoice.sgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>SGST:</span>
                      <span>{formatINR(selectedInvoice.sgst)}</span>
                    </div>
                  )}
                  {selectedInvoice.igst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>IGST:</span>
                      <span>{formatINR(selectedInvoice.igst)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatINR(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Received:</span>
                    <span>{formatINR(selectedInvoice.amountReceived)}</span>
                  </div>
                  <div
                    className={`flex justify-between font-semibold ${
                      selectedInvoice.status === "overpaid"
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-warning"
                    }`}
                  >
                    <span>{selectedInvoice.status === "overpaid" ? "Excess received:" : "Balance:"}</span>
                    <span>
                      {formatInvoiceBalanceLabel(
                        selectedInvoice.total,
                        selectedInvoice.amountReceived,
                        selectedInvoice.status,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="flex flex-wrap gap-2 sm:justify-end">
            {selectedInvoice?.status === "draft" && (
              <>
                {canEditInvoice && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!selectedInvoice) return;
                    setEditDraftDueDate(selectedInvoice.dueDate ?? "");
                    setEditDraftNotes((selectedInvoice as { notes?: string }).notes ?? "");
                    setIsEditDraftOpen(true);
                  }}
                >
                  Edit draft
                </Button>
                )}
                <Button type="button" onClick={handleFinalizeDraft}>
                  Finalize draft
                </Button>
              </>
            )}
            {selectedInvoice &&
              selectedInvoice.status !== "paid" &&
              selectedInvoice.status !== "overpaid" &&
              selectedInvoice.status !== "draft" && (
              <Button
                type="button"
                onClick={() => {
                  if (!selectedInvoice) return;
                  const draft = buildInvoiceToPaymentDraft(
                    selectedInvoice,
                    paymentMode as import("@/types/finance").Payment["mode"],
                  );
                  saveCreateDraft("payment-create-draft", draft);
                  setPaymentAmount(String(draft.amount));
                  if (draft.mode) setPaymentMode(draft.mode);
                  setIsInvoiceDetailOpen(false);
                  setIsRecordPaymentOpen(true);
                }}
                disabled={!canRecordPayment}
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Record Payment Sheet */}
      <Sheet open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Invoice: {selectedInvoice?.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">Customer: {selectedInvoice?.customerName}</p>
              <p className="font-semibold mt-2">
                Balance: {formatINR((selectedInvoice?.total || 0) - (selectedInvoice?.amountReceived || 0))}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input 
                type="number" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
                placeholder="Enter amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>

            {/* W5 — Payment-source routing (only when invoice's project has a partner) */}
            {(() => {
              const proj = selectedInvoice?.projectId ? projects.find(p => p.id === selectedInvoice.projectId) : undefined;
              const partnerId = (proj?.scope as { partnerId?: string } | undefined)?.partnerId;
              if (!partnerId) return null;
              const partner = partners.find(p => p.id === partnerId);
              return (
                <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <Label>Who received this payment?</Label>
                  <p className="text-xs text-muted-foreground">
                    This project has a partner ({partner?.name ?? "—"}). The client can pay MSS, the partner, or both.
                  </p>
                  <Select value={paymentSource} onValueChange={(v) => setPaymentSource(v as "mss" | "partner" | "split")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mss">MSS (us) — default</SelectItem>
                      <SelectItem value="partner">Partner (on our behalf)</SelectItem>
                      <SelectItem value="split">Split between MSS and Partner</SelectItem>
                    </SelectContent>
                  </Select>
                  {paymentSource === "split" && (
                    <div className="space-y-1 pt-2">
                      <Label className="text-xs">Partner portion (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={partnerPortionAmount}
                        onChange={(e) => setPartnerPortionAmount(e.target.value)}
                        placeholder="e.g. 5000"
                      />
                      <p className="text-2xs text-muted-foreground">
                        MSS portion = total − partner portion. Total must equal the Amount field above.
                      </p>
                    </div>
                  )}
                  {paymentSource !== "mss" && (
                    <p className="text-2xs text-muted-foreground">
                      Will create a PartnerTransaction (<span className="font-mono">Customer Paid Partner</span>) on {partner?.name ?? "the partner"}'s ledger.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsRecordPaymentOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRecordPayment}>Record Payment</Button>
            </div>
          </div>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={voidConfirmOpen}
        onOpenChange={setVoidConfirmOpen}
        title="Void invoice?"
        description={
          selectedInvoice
            ? `${selectedInvoice.invoiceNumber} will be marked voided and excluded from collections. It cannot be re-opened from the list.`
            : "This invoice will be marked voided."
        }
        confirmLabel="Void invoice"
        onConfirm={handleVoidInvoice}
      />

      <Sheet open={isEditDraftOpen} onOpenChange={setIsEditDraftOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Edit invoice draft</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="date"
                value={editDraftDueDate}
                onChange={(e) => setEditDraftDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea
                value={editDraftNotes}
                onChange={(e) => setEditDraftNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes visible only to the team"
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditDraftOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedInvoice) return;
                updateInvoice(selectedInvoice.id, {
                  dueDate: editDraftDueDate || undefined,
                  ...(editDraftNotes ? ({ notes: editDraftNotes } as Partial<typeof selectedInvoice>) : {}),
                });
                setLastConfirm({ variant: "success", title: "Draft updated", description: selectedInvoice.invoiceNumber });
                setIsEditDraftOpen(false);
              }}
            >
              Save changes
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Invoices;

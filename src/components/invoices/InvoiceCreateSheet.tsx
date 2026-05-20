import { useState, useEffect, useMemo } from "react";
import { Plus, X, Zap, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMasters } from "@/contexts/MastersContext";
import { useAppData } from "@/contexts/AppDataContext";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import {
  PERMISSION_DENIED_TOAST_TITLE,
  permissionDeniedDescriptionForAction,
} from "@/lib/permissionFeedback";
import { ClientSelectionSheet } from "./ClientSelectionSheet";
import type { Invoice, InvoiceItem, InvoiceService, Customer } from "@/types/finance";
import { PAYMENT_MODES } from "@/types/finance";
import {
  inferInvoiceOrSaleBillType,
  invoiceDocumentTypeLabel,
  nextDocumentNumber,
  buildPersistedDocumentTypeAtCreate,
  type InvoiceDocumentType,
} from "@/lib/invoiceDocumentType";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateContactPhone } from "@/lib/phoneValidators";
import { useFormDraft } from "@/hooks/useFormDraft";
import { computeGstSplit } from "@/lib/gstCalculator";
import { getCompanyStateCode } from "@/lib/companySettings";
import { quotationLinkedProjectId } from "@/lib/quotationSelectors";
import { formatINR } from "@/lib/formatCurrency";
import { BillingDirectionGuardService } from "@/application/services/BillingDirectionGuardService";
import { HighValueInvoiceJustificationBlock } from "@/components/invoices/HighValueInvoiceJustificationBlock";
import { InvoiceSubmitPreviewBanner } from "@/components/invoices/InvoiceSubmitPreviewBanner";
import {
  buildInvoiceSubmitPreview,
  deriveInvoicePaymentOutcome,
} from "@/lib/invoicePaymentStatus";
import {
  findCustomerByIdentity,
  findProjectForCustomer,
  findQuotationForCustomer,
} from "@/lib/customerMatching";

/** Sample service lines for quick pick — not loaded from masters (prototype). */
const SERVICE_PRESETS = [
  { id: "installation", label: "Installation & Commissioning", sac: "998719", rate: 15000, gstRate: 18 },
  { id: "amc", label: "Annual Maintenance Contract", sac: "998719", rate: 12000, gstRate: 18 },
  { id: "repair", label: "Repair & Service", sac: "998719", rate: 5000, gstRate: 18 },
  { id: "consultation", label: "Site Survey & Consultation", sac: "998369", rate: 3000, gstRate: 18 },
  { id: "design", label: "System Design & Engineering", sac: "998369", rate: 8000, gstRate: 18 },
  { id: "monitoring", label: "Remote Monitoring Setup", sac: "998314", rate: 5000, gstRate: 18 },
];

interface InvoiceCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All existing invoices + sale bills for INV/SB sequential numbering */
  existingDocuments?: { invoiceNumber: string }[];
  customers: Customer[];
  projects?: any[];
  quotations?: any[];
  inventoryItems?: any[];
  servicePresets?: { id: string; name: string; services: { description: string; sac: string; rate: number; gstRate: number; }[] }[];
  onCreated: (invoice: Invoice, options?: { highValueJustification?: string }) => void;
  /** Return false if the customer was not persisted (e.g. permission denied). */
  onCustomerCreated?: (customer: Customer) => boolean;
  prefill?: {
    customerId?: string;
    customerName?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerState?: string;
    customerContact?: string;
    paymentTerms?: string;
    projectId?: string;
    quotationId?: string;
    items?: InvoiceItem[];
    services?: InvoiceService[];
    total?: number;
    /** Optional explicit document type (e.g. from /invoices?type=sale-bill). */
    documentType?: InvoiceDocumentType;
  };
  /** When opening the sheet, seed document type before inference runs. */
  initialDocumentType?: InvoiceDocumentType;
}

/** GST slabs allowed for line items (matches validation in `handleCreateInvoice`). */
const CANONICAL_GST_RATES = [0, 5, 12, 18, 28] as const;

const INVOICE_CREATE_DRAFT_KEY = "invoice-create-v1";

type InvoiceCreateDraft = {
  invoiceDate: string;
  dueDate: string;
  selectedCustomerId: string;
  selectedProjectId: string;
  selectedQuotationId: string;
  buyerName: string;
  buyerAddress: string;
  buyerGstin: string;
  buyerState: string;
  buyerContact: string;
  invoiceServices: InvoiceService[];
  invoiceItems: InvoiceItem[];
  paymentTerms: string;
  selectedBankAccount: string;
  invoiceNotes: string;
  amountReceived: string;
  receivedIn: string;
  receivedDate: string;
  isAlreadyPaid: boolean;
  documentType: InvoiceDocumentType;
  documentTypeUserOverride: boolean;
};

function emptyInvoiceCreateDraft(): InvoiceCreateDraft {
  return {
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    selectedCustomerId: "",
    selectedProjectId: "",
    selectedQuotationId: "",
    buyerName: "",
    buyerAddress: "",
    buyerGstin: "",
    buyerState: "",
    buyerContact: "",
    invoiceServices: [],
    invoiceItems: [],
    paymentTerms: "",
    selectedBankAccount: "",
    invoiceNotes: "",
    amountReceived: "",
    receivedIn: "",
    receivedDate: "",
    isAlreadyPaid: false,
    documentType: "invoice",
    documentTypeUserOverride: false,
  };
}

export function InvoiceCreateSheet({
  open,
  onOpenChange,
  existingDocuments = [],
  customers,
  projects = [],
  quotations = [],
  inventoryItems = [],
  servicePresets = [],
  onCreated,
  onCustomerCreated,
  prefill,
  initialDocumentType,
}: InvoiceCreateSheetProps) {
  const { getHsnCodes, getSacCodes, getGstRates: _getGstRates, getStateCodes, getBankAccounts } = useMasters();
  const { allocateCustomerId, addCustomer, canDo } = useAppData();

  const { value: form, setValue: setForm, clearDraft } = useFormDraft(
    INVOICE_CREATE_DRAFT_KEY,
    emptyInvoiceCreateDraft(),
  );
  const {
    invoiceDate,
    dueDate,
    selectedCustomerId,
    selectedProjectId,
    selectedQuotationId,
    buyerName,
    buyerAddress,
    buyerGstin,
    buyerState,
    buyerContact,
    invoiceServices,
    invoiceItems,
    paymentTerms,
    selectedBankAccount,
    invoiceNotes,
    amountReceived,
    receivedIn,
    receivedDate,
    isAlreadyPaid,
    documentType,
    documentTypeUserOverride,
  } = form;

  const inferredDocumentType = useMemo(
    () =>
      inferInvoiceOrSaleBillType({
        projectId: selectedProjectId || undefined,
        quotationId: selectedQuotationId || undefined,
        items: invoiceItems,
        services: invoiceServices,
      }),
    [selectedProjectId, selectedQuotationId, invoiceItems, invoiceServices],
  );

  const previewDocumentNumber = useMemo(
    () => nextDocumentNumber(documentType, existingDocuments),
    [documentType, existingDocuments],
  );

  useEffect(() => {
    if (documentTypeUserOverride) return;
    if (documentType === inferredDocumentType) return;
    setForm((prev) => ({ ...prev, documentType: inferredDocumentType }));
  }, [inferredDocumentType, documentType, documentTypeUserOverride, setForm]);

  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);
  const [highValueReason, setHighValueReason] = useState("");
  const billingDirectionGuard = useMemo(() => new BillingDirectionGuardService(), []);

  // Client Selection Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [qaName, setQaName] = useState("");
  const [qaPhone, setQaPhone] = useState("");
  const [qaEmail, setQaEmail] = useState("");
  const [qaAddress, setQaAddress] = useState("");

  // Apply prefill data
  useEffect(() => {
    if (!prefill) return;
    setForm((prev) => ({
      ...prev,
      ...(prefill.customerId ? { selectedCustomerId: prefill.customerId } : {}),
      ...(prefill.customerName ? { buyerName: prefill.customerName } : {}),
      ...(prefill.customerAddress ? { buyerAddress: prefill.customerAddress } : {}),
      ...(prefill.customerGstin ? { buyerGstin: prefill.customerGstin } : {}),
      ...(prefill.customerState ? { buyerState: prefill.customerState } : {}),
      ...(prefill.customerContact ? { buyerContact: prefill.customerContact } : {}),
      ...(prefill.paymentTerms ? { paymentTerms: prefill.paymentTerms } : {}),
      ...(prefill.projectId ? { selectedProjectId: prefill.projectId } : {}),
      ...(prefill.quotationId ? { selectedQuotationId: prefill.quotationId } : {}),
      ...(prefill.items ? { invoiceItems: prefill.items } : {}),
      ...(prefill.services ? { invoiceServices: prefill.services } : {}),
      ...(prefill.documentType
        ? { documentType: prefill.documentType, documentTypeUserOverride: true }
        : {}),
    }));
  }, [prefill, setForm]);

  useEffect(() => {
    if (!open || !initialDocumentType) return;
    setForm((prev) => ({
      ...prev,
      documentType: initialDocumentType,
      documentTypeUserOverride: true,
    }));
  }, [open, initialDocumentType, setForm]);

  // Reset form
  const resetForm = () => {
    clearDraft();
    setHighValueReason("");
    setQuickAddOpen(false);
    setQaName("");
    setQaPhone("");
    setQaEmail("");
    setQaAddress("");
  };
  
  // Build effective service presets - use context presets if available, fallback to hardcoded
  const effectiveServicePresets = servicePresets && servicePresets.length > 0 
    ? servicePresets.flatMap(preset => 
        preset.services.map((s, idx) => ({
          id: `${preset.id}-${idx}`,
          label: s.description,
          sac: s.sac,
          rate: s.rate,
          gstRate: s.gstRate
        }))
      )
    : SERVICE_PRESETS;

  // Add service from preset
  const addServiceFromPreset = (presetId: string) => {
    const preset = effectiveServicePresets.find(p => p.id === presetId);
    if (preset) {
      setForm((prev) => ({
        ...prev,
        invoiceServices: [...prev.invoiceServices, {
          description: preset.label,
          sac: preset.sac,
          rate: preset.rate,
          gstRate: preset.gstRate,
        }],
      }));
    }
  };

  // Quotation selection handler - auto-links to project if converted
  const handleQuotationSelect = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId);
    setForm((prev) => {
      const next: InvoiceCreateDraft = { ...prev, selectedQuotationId: quotationId };
      if (!quotation) return next;
      next.buyerName = quotation.clientName;
      next.buyerAddress = quotation.clientAddress || "";
      next.buyerState = quotation.clientState;
      next.buyerContact = quotation.clientPhone;
      const linkedPid = quotationLinkedProjectId(quotation);
      if (linkedPid) {
        const linkedProject = projects.find((p) => String(p.id) === linkedPid);
        if (linkedProject) next.selectedProjectId = String(linkedProject.id);
      }
      const matchingCustomer = findCustomerByIdentity(customers, {
        name: quotation.clientName,
        phone: quotation.clientPhone,
      });
      if (matchingCustomer) {
        next.selectedCustomerId = matchingCustomer.id;
        next.buyerGstin = matchingCustomer.gstin || "";
        next.buyerState = matchingCustomer.state || quotation.clientState || "";
      }
      return next;
    });
  };

  // Customer selection handler - auto-links to their latest project/quotation
  const _handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setForm((prev) => {
      const next: InvoiceCreateDraft = { ...prev, selectedCustomerId: customerId };
      if (!customer) return next;
      next.buyerName = customer.name;
      next.buyerAddress = customer.address;
      next.buyerGstin = customer.gstin || "";
      next.buyerState = customer.state || "";
      next.buyerContact = customer.phone;
      const customerProject = findProjectForCustomer(projects, customer);
      if (customerProject) next.selectedProjectId = customerProject.id.toString();
      const customerQuotation = findQuotationForCustomer(quotations, customer);
      if (customerQuotation) next.selectedQuotationId = customerQuotation.id;
      return next;
    });
  };

  // Project selection handler - auto-links to quotation and customer
  const handleProjectSelect = (projectId: string) => {
    const project = projects.find(p => p.id.toString() === projectId);
    setForm((prev) => {
      const next: InvoiceCreateDraft = { ...prev, selectedProjectId: projectId };
      if (!project) return next;
      next.buyerName = project.client;
      next.buyerAddress = project.address;
      next.buyerState = project.state;
      next.buyerContact = project.clientPhone || "";
      if (project.quotationId) next.selectedQuotationId = project.quotationId;
      const matchingCustomer =
        (project.customerId
          ? customers.find((c) => c.id === project.customerId)
          : undefined) ??
        findCustomerByIdentity(customers, {
          name: project.client,
          phone: project.clientPhone,
        });
      if (matchingCustomer) {
        next.selectedCustomerId = matchingCustomer.id;
        if (matchingCustomer.gstin) next.buyerGstin = matchingCustomer.gstin;
      }
      return next;
    });
  };

  // Handle client selection from modal
  const handleClientFromModal = (customer: Customer) => {
    setForm((prev) => ({
      ...prev,
      selectedCustomerId: customer.id,
      buyerName: customer.name,
      buyerAddress: customer.address,
      buyerGstin: customer.gstin || "",
      buyerState: customer.state || "",
      buyerContact: customer.phone,
    }));
    setIsClientModalOpen(false);
  };

  const resetQuickAddFields = () => {
    setQaName("");
    setQaPhone("");
    setQaEmail("");
    setQaAddress("");
  };

  const handleQuickAddCustomerSubmit = () => {
    if (!qaName.trim() || !qaPhone.trim()) {
      setLastConfirm({ variant: "error", title: "Missing fields", description: "Name and phone are required." });
      return;
    }
    const ph = validateContactPhone(qaPhone);
    if (!ph.ok) {
      setLastConfirm({ variant: "error", title: "Invalid phone", description: (ph as { message: string }).message });
      return;
    }
    const customer: Customer = {
      id: allocateCustomerId(),
      name: qaName.trim(),
      phone: qaPhone.trim(),
      email: qaEmail.trim(),
      address: qaAddress.trim(),
      type: "individual",
      itemsBought: [],
      totalPurchases: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const ok = onCustomerCreated ? onCustomerCreated(customer) : addCustomer(customer);
    if (!ok) return;
    handleClientFromModal(customer);
    setQuickAddOpen(false);
    resetQuickAddFields();
    setLastConfirm({ variant: "success", title: "Client added", description: `${customer.name} is now selected for this document.` });
  };

  // Clear project link
  const handleClearProject = () => {
    setForm((prev) => ({ ...prev, selectedProjectId: "" }));
  };

  // Clear quotation link
  const handleClearQuotation = () => {
    setForm((prev) => ({ ...prev, selectedQuotationId: "" }));
  };

  // Service row handlers
  const addServiceRow = () => {
    setForm((prev) => ({
      ...prev,
      invoiceServices: [...prev.invoiceServices, { description: "", sac: "", rate: 0, gstRate: 18, serviceNotes: "" }],
    }));
  };

  const removeServiceRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      invoiceServices: prev.invoiceServices.filter((_, i) => i !== index),
    }));
  };

  const updateService = (index: number, field: string, value: string | number) => {
    setForm((prev) => {
      const updated = [...prev.invoiceServices];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, invoiceServices: updated };
    });
  };

  // Item row handlers
  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      invoiceItems: [...prev.invoiceItems, { description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18, itemNotes: "" }],
    }));
  };

  const removeItemRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      invoiceItems: prev.invoiceItems.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setForm((prev) => {
      const updated = [...prev.invoiceItems];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, invoiceItems: updated };
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    const servicesTotal = invoiceServices.reduce((sum, s) => sum + s.rate, 0);
    const servicesTax = invoiceServices.reduce((sum, s) => sum + (s.rate * s.gstRate / 100), 0);

    const itemsTotal = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
    const itemsTax = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate * i.gstRate / 100), 0);

    const subtotal = servicesTotal + itemsTotal;
    const totalTax = servicesTax + itemsTax;
    const effectiveGstRate = subtotal > 0 ? (totalTax / subtotal) * 100 : 0;
    const split = computeGstSplit({
      subtotal,
      gstRatePercent: effectiveGstRate,
      companyStateCode: getCompanyStateCode(),
      counterpartyStateCode: buyerState,
    });

    return {
      subtotal,
      cgst: split.cgst,
      sgst: split.sgst,
      igst: split.igst,
      total: split.total,
    };
  };

  // Create invoice handler
  const handleCreateInvoice = () => {
    if (!buyerName) {
      setLastConfirm({ variant: "error", title: "Customer name required", description: "Customer/Buyer name is required" });
      return;
    }

    const hasNonZeroLine = invoiceItems.some(i => i.rate > 0) || invoiceServices.some(s => s.rate > 0);
    if (!hasNonZeroLine) {
      setLastConfirm({ variant: "error", title: "Empty invoice", description: "Add at least one line item with a non-zero rate." });
      return;
    }

    if (!buyerState) {
      setLastConfirm({ variant: "error", title: "State required", description: "Select Place of Supply to determine IGST vs CGST/SGST split." });
      return;
    }

    if (buyerGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(buyerGstin)) {
      setLastConfirm({ variant: "error", title: "Invalid GSTIN", description: "GSTIN must be a valid 15-character format." });
      return;
    }

    const buyerPhoneCheck = validateContactPhone(buyerContact);
    if (!buyerPhoneCheck.ok) {
      setLastConfirm({ variant: "error", title: "Invalid phone", description: (buyerPhoneCheck as { message: string }).message });
      return;
    }

    const allowedGstRates = new Set([0, 5, 12, 18, 28]);
    const hasBadGst = invoiceItems.some(i => !allowedGstRates.has(i.gstRate)) || invoiceServices.some(s => !allowedGstRates.has(s.gstRate));
    if (hasBadGst) {
      setLastConfirm({ variant: "error", title: "Invalid GST rate", description: "GST rate must be 0, 5, 12, 18, or 28." });
      return;
    }

    if (invoiceItems.some(i => i.quantity <= 0)) {
      setLastConfirm({ variant: "error", title: "Invalid quantity", description: "All line item quantities must be greater than zero." });
      return;
    }

    if (selectedProjectId && !projects.find(p => p.id.toString() === selectedProjectId)) {
      setLastConfirm({ variant: "error", title: "Invalid project", description: "The selected project no longer exists." });
      return;
    }

    if (selectedQuotationId) {
      const q = quotations.find(qq => qq.id === selectedQuotationId);
      if (q?.createdAt && invoiceDate < q.createdAt) {
        setLastConfirm({ variant: "error", title: "Invalid date", description: "Invoice date cannot be earlier than the linked quotation date." });
        return;
      }
    }

    // Both invoice and sale-bill now use the same totals calculation
    const totals = calculateTotals();

    const { amountReceived: received, status } = deriveInvoicePaymentOutcome({
      total: totals.total,
      amountReceivedRaw: amountReceived,
      isAlreadyPaid,
      dueDate,
    });

    const finalReceivedIn = isAlreadyPaid && !receivedIn ? "Cash" : receivedIn;
    const finalReceivedDate = isAlreadyPaid && !receivedDate ? invoiceDate : receivedDate;

    const finalItems = invoiceItems;

    const persistedDocType = buildPersistedDocumentTypeAtCreate({
      userSelectedType: documentType,
      userOverrideLocked: documentTypeUserOverride,
      projectId: selectedProjectId || undefined,
      quotationId: selectedQuotationId || undefined,
      items: finalItems,
      services: invoiceServices,
    });
    const invoiceNumber = nextDocumentNumber(persistedDocType.type, existingDocuments);

    const highValueCheck = billingDirectionGuard.validateHighValueIssuance(totals.total, highValueReason);
    if (!highValueCheck.ok) {
      setLastConfirm({
        variant: "error",
        title: "Justification required",
        description: highValueCheck.error,
      });
      return;
    }

    const newInvoice: Invoice = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? `INV-${crypto.randomUUID()}` : `INV-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.toUpperCase(),
      invoiceNumber,
      type: persistedDocType.type,
      documentTypeSource: persistedDocType.documentTypeSource,
      customerId: selectedCustomerId || undefined,
      customerName: buyerName,
      customerAddress: buyerAddress,
      customerGstin: buyerGstin,
      customerState: buyerState,
      customerContact: buyerContact,
      projectId: selectedProjectId || undefined,
      projectName: selectedProjectId
        ? projects.find((p) => p.id.toString() === selectedProjectId)?.name
        : undefined,
      quotationId: selectedQuotationId || undefined,
      items: finalItems,
      services: invoiceServices,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total,
      amountReceived: received,
      receivedIn: finalReceivedIn || undefined,
      receivedDate: finalReceivedDate || undefined,
      status,
      invoiceDate,
      dueDate,
      createdAt: new Date().toISOString().split('T')[0],
      paymentTerms: paymentTerms || undefined,
      bankAccount: selectedBankAccount || undefined,
      notes: invoiceNotes || undefined,
    };

    onCreated(
      newInvoice,
      highValueCheck.requiresJustification
        ? { highValueJustification: highValueReason.trim() }
        : undefined,
    );
    resetForm();
    onOpenChange(false);
    // Success surfaced by parent page via its own InlineConfirmBanner.
  };

  const handleSaveDraft = () => {
    if (!buyerName.trim()) {
      setLastConfirm({ variant: "error", title: "Customer name required", description: "Customer/Buyer name is required." });
      return;
    }
    const states = getStateCodes();
    const buyerStateEff = buyerState || states[0]?.value || getCompanyStateCode();
    if (buyerGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(buyerGstin)) {
      setLastConfirm({ variant: "error", title: "Invalid GSTIN", description: "GSTIN must be a valid 15-character format." });
      return;
    }
    const buyerPhoneDraft = validateContactPhone(buyerContact);
    if (!buyerPhoneDraft.ok) {
      setLastConfirm({ variant: "error", title: "Invalid phone", description: (buyerPhoneDraft as { message: string }).message });
      return;
    }
    const allowedGstRates = new Set([0, 5, 12, 18, 28]);
    const hasBadGst =
      invoiceItems.some((i) => !allowedGstRates.has(i.gstRate)) ||
      invoiceServices.some((s) => !allowedGstRates.has(s.gstRate));
    if (hasBadGst) {
      setLastConfirm({ variant: "error", title: "Invalid GST rate", description: "GST rate must be 0, 5, 12, 18, or 28." });
      return;
    }
    if (invoiceItems.some((i) => i.quantity <= 0)) {
      setLastConfirm({ variant: "error", title: "Invalid quantity", description: "All line item quantities must be greater than zero." });
      return;
    }
    const totals = calculateTotals();
    const persistedDocType = buildPersistedDocumentTypeAtCreate({
      userSelectedType: documentType,
      userOverrideLocked: documentTypeUserOverride,
      projectId: selectedProjectId || undefined,
      quotationId: selectedQuotationId || undefined,
      items: invoiceItems,
      services: invoiceServices,
    });
    const invoiceNumber = nextDocumentNumber(persistedDocType.type, existingDocuments);
    const invDate = invoiceDate || new Date().toISOString().split("T")[0];
    const due = dueDate || invDate;
    const newInvoice: Invoice = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `INV-${crypto.randomUUID()}`
          : `INV-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.toUpperCase(),
      invoiceNumber,
      type: persistedDocType.type,
      documentTypeSource: persistedDocType.documentTypeSource,
      customerId: selectedCustomerId || undefined,
      customerName: buyerName,
      customerAddress: buyerAddress,
      customerGstin: buyerGstin,
      customerState: buyerStateEff,
      customerContact: buyerContact,
      projectId: selectedProjectId || undefined,
      projectName: selectedProjectId
        ? projects.find((p) => p.id.toString() === selectedProjectId)?.name
        : undefined,
      quotationId: selectedQuotationId || undefined,
      items: invoiceItems,
      services: invoiceServices,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      total: totals.total,
      amountReceived: 0,
      status: "draft",
      invoiceDate: invDate,
      dueDate: due,
      createdAt: new Date().toISOString().split("T")[0],
      paymentTerms: paymentTerms || undefined,
      bankAccount: selectedBankAccount || undefined,
      notes: invoiceNotes || undefined,
    };
    onCreated(newInvoice);
    resetForm();
    onOpenChange(false);
    // Draft-saved success surfaced by parent page via its own InlineConfirmBanner.
  };

  const invoiceTotals = calculateTotals();
  const paymentPreviewOutcome = useMemo(
    () =>
      deriveInvoicePaymentOutcome({
        total: invoiceTotals.total,
        amountReceivedRaw: amountReceived,
        isAlreadyPaid,
        dueDate,
      }),
    [invoiceTotals.total, amountReceived, isAlreadyPaid, dueDate],
  );
  const submitPreview = useMemo(
    () =>
      buildInvoiceSubmitPreview({
        outcome: paymentPreviewOutcome,
        total: invoiceTotals.total,
        isAlreadyPaid,
      }),
    [paymentPreviewOutcome, invoiceTotals.total, isAlreadyPaid],
  );
  const highValueIssuanceCheck = billingDirectionGuard.validateHighValueIssuance(
    invoiceTotals.total,
    highValueReason,
  );
  const createBlockedByHighValue = !highValueIssuanceCheck.ok;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <AppSheetContent layout="form" size="xxl">
        <SheetHeader>
          <SheetTitle>New invoice or sale bill</SheetTitle>
        </SheetHeader>
        {lastConfirm && (
          <InlineConfirmBanner
            variant={lastConfirm.variant}
            title={lastConfirm.title}
            description={lastConfirm.description}
            onDismiss={() => setLastConfirm(null)}
          />
        )}
        <div className="min-w-0 space-y-6 py-4">
            <div className="min-w-0 space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Document type</p>
                      <p className="text-xs text-muted-foreground">
                        Suggested: {invoiceDocumentTypeLabel(inferredDocumentType)}
                        {documentTypeUserOverride ? " · you chose an override" : " · auto-updates until you pick"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono shrink-0">
                      Next no. {previewDocumentNumber}
                    </p>
                  </div>
                  <RadioGroup
                    value={documentType}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        documentType: v as InvoiceDocumentType,
                        documentTypeUserOverride: true,
                      }))
                    }
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="invoice" id="doc-type-invoice" />
                      <Label htmlFor="doc-type-invoice" className="font-normal cursor-pointer">
                        Invoice (services)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="sale-bill" id="doc-type-sale-bill" />
                      <Label htmlFor="doc-type-sale-bill" className="font-normal cursor-pointer">
                        Sale bill (goods)
                      </Label>
                    </div>
                  </RadioGroup>
                  {documentTypeUserOverride && documentType !== inferredDocumentType && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          documentType: inferredDocumentType,
                          documentTypeUserOverride: false,
                        }))
                      }
                    >
                      Reset to suggested {invoiceDocumentTypeLabel(inferredDocumentType)}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Header Section */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setForm((prev) => ({ ...prev, invoiceDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply (State)</Label>
                  <Select value={buyerState} onValueChange={(v) => setForm((prev) => ({ ...prev, buyerState: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {getStateCodes().map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Two Column Layout: Left = Linking, Right = Client Details */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Left Column - Linking Fields */}
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium">Linked Documents</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Project Link */}
                      <div className="space-y-2">
                        <Label>Linked Project</Label>
                        <div className="flex gap-2">
                          <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                            <SelectContent>
                              {projects.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedProjectId && (
                            <Button variant="ghost" size="icon" onClick={handleClearProject} className="h-9 w-9" aria-label="Clear linked project">
                              <X className="h-4 w-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </div>
                      {/* Quotation Link */}
                      <div className="space-y-2">
                        <Label>Linked Quotation</Label>
                        <div className="flex gap-2">
                          <Select value={selectedQuotationId} onValueChange={handleQuotationSelect}>
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Select quotation (optional)" /></SelectTrigger>
                            <SelectContent>
                              {quotations.filter(q => q.status === "approved").map(q => (
                                <SelectItem key={q.id} value={q.id}>{q.quotationNumber}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedQuotationId && (
                            <Button variant="ghost" size="icon" onClick={handleClearQuotation} className="h-9 w-9" aria-label="Clear linked quotation">
                              <X className="h-4 w-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Preset Selection - Visible when project is selected */}
                      {selectedProjectId && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Load Preset (Optional)</Label>
                          <Select onValueChange={(_presetId) => {
                            // Find the preset and load items
                            const selectedProject = projects.find(p => p.id.toString() === selectedProjectId);
                            if (selectedProject) {
                              setLastConfirm({ variant: "success", title: "Preset applied", description: "Items loaded from preset" });
                            }
                          }}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select preset type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="concise">Concise (Summary Level)</SelectItem>
                              <SelectItem value="detailed">Detailed (Itemized)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Choose concise for summary or detailed for full item list
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        Selecting project auto-fills quotation and vice versa. Both are optional.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Client Details */}
                <div className="lg:col-span-2">
                  <Card className="bg-muted/30">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">Client Details</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setIsClientModalOpen(true)}>
                        <Search className="h-3 w-3 mr-1" />
                        Select Client
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Client Name *</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={buyerName} 
                              onChange={(e) => setForm((prev) => ({ ...prev, buyerName: e.target.value }))} 
                              placeholder="Click Select Client or type name" 
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Contact</Label>
                          <Input value={buyerContact} onChange={(e) => setForm((prev) => ({ ...prev, buyerContact: e.target.value }))} placeholder="+91 98765 43210" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input value={buyerAddress} onChange={(e) => setForm((prev) => ({ ...prev, buyerAddress: e.target.value }))} placeholder="Enter address" />
                        </div>
                        <div className="space-y-2">
                          <Label>GSTIN</Label>
                          <Input value={buyerGstin} onChange={(e) => setForm((prev) => ({ ...prev, buyerGstin: e.target.value }))} placeholder="e.g., 08AABCS1234A1Z5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Services Section */}
              <Card className="bg-muted/30">
                <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-sm font-medium">Services</CardTitle>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Select onValueChange={addServiceFromPreset}>
                      <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-[180px]">
                        <Zap className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Quick Add Preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {effectiveServicePresets.map(preset => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.label} (₹{preset.rate.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={addServiceRow}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Manual
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoiceServices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No services added. Use presets or add manually.</p>
                  ) : (
                    <div className="space-y-3">
                      {invoiceServices.map((service, idx) => (
                        <div key={idx} className="space-y-2 rounded-lg border bg-background/50 p-3">
                          <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
                          <div className="grid min-w-[36rem] grid-cols-12 gap-2 items-end sm:min-w-0">
                            <div className="col-span-4">
                              <Label className="text-xs">Description</Label>
                              <Input value={service.description} onChange={(e) => updateService(idx, 'description', e.target.value)} placeholder="Service description" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">SAC Code</Label>
                              <Input 
                                value={service.sac} 
                                onChange={(e) => updateService(idx, 'sac', e.target.value)} 
                                placeholder="e.g., 998719" 
                                list={`sac-list-${idx}`}
                              />
                              <datalist id={`sac-list-${idx}`}>
                                {getSacCodes().map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </datalist>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Rate (₹)</Label>
                              <Input type="number" min="0" step="0.01" value={service.rate} onChange={(e) => updateService(idx, 'rate', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={service.gstRate.toString()} onValueChange={(v) => updateService(idx, 'gstRate', parseFloat(v))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CANONICAL_GST_RATES.map((pct) => (
                                    <SelectItem key={pct} value={String(pct)}>
                                      {pct}%
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1 text-right">
                              <Label className="text-xs">Amount</Label>
                              <p className="h-9 flex items-center justify-end text-sm font-medium">₹{(service.rate * (1 + service.gstRate/100)).toLocaleString()}</p>
                            </div>
                            <div className="col-span-1">
                              <Button variant="ghost" size="sm" onClick={() => removeServiceRow(idx)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          </div>
                          {/* Per-service notes */}
                          <div className="col-span-12">
                            <Input 
                              value={service.serviceNotes || ""} 
                              onChange={(e) => updateService(idx, 'serviceNotes', e.target.value)} 
                              placeholder="Service notes / additional details (optional)"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items Section */}
              <Card className="bg-muted/30">
                <CardHeader className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-sm font-medium">Items</CardTitle>
                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Select onValueChange={(v) => {
                      const item = inventoryItems.find(i => i.id.toString() === v);
                      if (item) {
                        setForm((prev) => ({
                          ...prev,
                          invoiceItems: [...prev.invoiceItems, {
                            description: item.name,
                            hsn: item.hsn,
                            quantity: 1,
                            rate: item.price,
                            gstRate: 18,
                          }],
                        }));
                      }
                    }}>
                      <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-[180px]">
                        <SelectValue placeholder="Select from Inventory" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} (₹{item.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={addItemRow}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Manual
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoiceItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No items added. Select from inventory or add manually.</p>
                  ) : (
                    <div className="space-y-3">
                      {invoiceItems.map((item, idx) => (
                        <div key={idx} className="space-y-2 rounded-lg border bg-background/50 p-3">
                          <div className="-mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
                          <div className="grid min-w-[40rem] grid-cols-12 gap-2 items-end sm:min-w-0">
                            <div className="col-span-3">
                              <Label className="text-xs">Description</Label>
                              <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item description" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">HSN Code</Label>
                              <Input 
                                value={item.hsn} 
                                onChange={(e) => updateItem(idx, 'hsn', e.target.value)} 
                                placeholder="e.g., 85414012" 
                                list={`hsn-list-${idx}`}
                              />
                              <datalist id={`hsn-list-${idx}`}>
                                {getHsnCodes().map(h => (
                                  <option key={h.value} value={h.value}>{h.label}</option>
                                ))}
                              </datalist>
                            </div>
                            <div className="col-span-1">
                              <Label className="text-xs">Qty</Label>
                              <Input type="number" min="1" step="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Rate (₹)</Label>
                              <Input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={item.gstRate.toString()} onValueChange={(v) => updateItem(idx, 'gstRate', parseFloat(v))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CANONICAL_GST_RATES.map((pct) => (
                                    <SelectItem key={pct} value={String(pct)}>
                                      {pct}%
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1 text-right">
                              <Label className="text-xs">Amount</Label>
                              <p className="h-9 flex items-center justify-end text-sm font-medium">₹{(item.quantity * item.rate * (1 + item.gstRate/100)).toLocaleString()}</p>
                            </div>
                            <div className="col-span-1">
                              <Button variant="ghost" size="sm" onClick={() => removeItemRow(idx)}>
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          </div>
                          {/* Per-item notes/description */}
                          <div className="col-span-12">
                            <Input 
                              value={item.itemNotes || ""} 
                              onChange={(e) => updateItem(idx, 'itemNotes', e.target.value)} 
                              placeholder="Item notes / additional description (optional)"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Totals */}
              <Card className="bg-muted/30">
                <CardContent className="py-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatINR(invoiceTotals.subtotal)}</span>
                      </div>
                      {invoiceTotals.igst > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">IGST:</span>
                          <span>{formatINR(invoiceTotals.igst)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CGST:</span>
                            <span>{formatINR(invoiceTotals.cgst)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SGST:</span>
                            <span>{formatINR(invoiceTotals.sgst)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatINR(invoiceTotals.total)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Received */}
              <Card className="bg-muted/30">
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Payment Received (Optional)</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="alreadyPaid" 
                      checked={isAlreadyPaid} 
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isAlreadyPaid: checked === true }))}
                    />
                    <Label htmlFor="alreadyPaid" className="text-sm font-medium cursor-pointer">
                      Already Paid in Full
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAlreadyPaid ? (
                    <p className="text-xs text-muted-foreground">
                      Payment date defaults to invoice date ({invoiceDate}) when mode/date are left empty.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Amount Received (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountReceived}
                          onChange={(e) => setForm((prev) => ({ ...prev, amountReceived: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Received In</Label>
                        <Select value={receivedIn} onValueChange={(v) => setForm((prev) => ({ ...prev, receivedIn: v }))}>
                          <SelectTrigger><SelectValue placeholder="Payment mode" /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_MODES.map(m => (
                              <SelectItem key={m} value={m}>{m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Received</Label>
                        <Input type="date" value={receivedDate} onChange={(e) => setForm((prev) => ({ ...prev, receivedDate: e.target.value }))} />
                      </div>
                    </div>
                  )}
                  {isAlreadyPaid && invoiceTotals.total <= 0 && (
                    <p className="mt-3 text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                      Add line items with a non-zero total to preview the paid status before you create.
                    </p>
                  )}
                  {submitPreview && invoiceTotals.total > 0 && (
                    <div className="mt-3">
                      <InvoiceSubmitPreviewBanner preview={submitPreview} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={paymentTerms} onChange={(e) => setForm((prev) => ({ ...prev, paymentTerms: e.target.value }))} placeholder="e.g., 50% advance, 50% on completion" />
                </div>
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Select value={selectedBankAccount} onValueChange={(v) => setForm((prev) => ({ ...prev, selectedBankAccount: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {getBankAccounts().map(b => (
                        <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes / Terms & Conditions</Label>
                <Textarea value={invoiceNotes} onChange={(e) => setForm((prev) => ({ ...prev, invoiceNotes: e.target.value }))} placeholder="Enter any additional notes or terms" rows={3} />
              </div>

              <HighValueInvoiceJustificationBlock
                total={invoiceTotals.total}
                reason={highValueReason}
                onReasonChange={setHighValueReason}
              />
            </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={handleSaveDraft}>
              Save as draft
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              type="button"
              onClick={handleCreateInvoice}
              disabled={createBlockedByHighValue}
            >
              Create
            </Button>
          </div>
        </div>
      </AppSheetContent>
      {/* Client Selection Modal */}
      <ClientSelectionSheet
        open={isClientModalOpen}
        onOpenChange={setIsClientModalOpen}
        customers={customers}
        onSelect={handleClientFromModal}
        onAddNew={() => {
          setIsClientModalOpen(false);
          if (!canDo("customer:create")) {
            setLastConfirm({
              variant: "warning",
              title: PERMISSION_DENIED_TOAST_TITLE,
              description: permissionDeniedDescriptionForAction("customer:create"),
            });
            return;
          }
          setQuickAddOpen(true);
        }}
      />
      <Dialog
        open={quickAddOpen}
        onOpenChange={(o) => {
          setQuickAddOpen(o);
          if (!o) resetQuickAddFields();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add new client</DialogTitle>
            <DialogDescription>Create a customer record and use it on this invoice.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="qa-name">Name</Label>
              <Input id="qa-name" value={qaName} onChange={(e) => setQaName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-phone">Phone</Label>
              <Input id="qa-phone" value={qaPhone} onChange={(e) => setQaPhone(e.target.value)} placeholder="10-digit mobile" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-email">Email (optional)</Label>
              <Input id="qa-email" type="email" value={qaEmail} onChange={(e) => setQaEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-address">Address (optional)</Label>
              <Input id="qa-address" value={qaAddress} onChange={(e) => setQaAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { setQuickAddOpen(false); resetQuickAddFields(); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleQuickAddCustomerSubmit}>
              Save and select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}

import { useState, useEffect } from "react";
import { Plus, X, Eye, Zap, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMasters } from "@/contexts/MastersContext";
import { toast } from "@/hooks/use-toast";
import { ClientSelectionModal } from "./ClientSelectionModal";
import type { Invoice, InvoiceItem, InvoiceService, Customer } from "@/types/finance";
import { PAYMENT_MODES } from "@/types/finance";
import { inferInvoiceOrSaleBillType, nextDocumentNumber } from "@/lib/invoiceDocumentType";

// Service presets for quick selection
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
  onCreated: (invoice: Invoice) => void;
  onCustomerCreated?: (customer: Customer) => void;
  prefill?: {
    customerId?: string;
    customerName?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerState?: string;
    customerContact?: string;
    projectId?: string;
    quotationId?: string;
    items?: InvoiceItem[];
    services?: InvoiceService[];
    total?: number;
  };
}

const companyState = "08"; // Rajasthan

/** GST slabs allowed for line items (matches validation in `handleCreateInvoice`). */
const CANONICAL_GST_RATES = [0, 5, 12, 18, 28] as const;

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
}: InvoiceCreateSheetProps) {
  const { getHsnCodes, getSacCodes, getGstRates, getStateCodes, getBankAccounts } = useMasters();
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  
  // Buyer details
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerState, setBuyerState] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  
  // Items & Services
  const [invoiceServices, setInvoiceServices] = useState<InvoiceService[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  
  
  // Payment & Additional
  const [paymentTerms, setPaymentTerms] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  
  // Payment received (for both invoice and sale-bill)
  const [amountReceived, setAmountReceived] = useState("");
  const [receivedIn, setReceivedIn] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  
  // Already paid option - marks invoice as fully paid on creation
  const [isAlreadyPaid, setIsAlreadyPaid] = useState(false);
  
  // Client Selection Modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Apply prefill data
  useEffect(() => {
    if (prefill) {
      if (prefill.customerId) setSelectedCustomerId(prefill.customerId);
      if (prefill.customerName) setBuyerName(prefill.customerName);
      if (prefill.customerAddress) setBuyerAddress(prefill.customerAddress);
      if (prefill.customerGstin) setBuyerGstin(prefill.customerGstin);
      if (prefill.customerState) setBuyerState(prefill.customerState);
      if (prefill.customerContact) setBuyerContact(prefill.customerContact);
      if (prefill.projectId) setSelectedProjectId(prefill.projectId);
      if (prefill.quotationId) setSelectedQuotationId(prefill.quotationId);
      if (prefill.items) setInvoiceItems(prefill.items);
      if (prefill.services) setInvoiceServices(prefill.services);
    }
  }, [prefill]);

  // Reset form
  const resetForm = () => {
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate("");
    setSelectedCustomerId("");
    setSelectedProjectId("");
    setSelectedQuotationId("");
    setBuyerName("");
    setBuyerAddress("");
    setBuyerGstin("");
    setBuyerState("");
    setBuyerContact("");
    setInvoiceServices([]);
    setInvoiceItems([]);
    setPaymentTerms("");
    setSelectedBankAccount("");
    setInvoiceNotes("");
    setAmountReceived("");
    setReceivedIn("");
    setReceivedDate("");
    setIsAlreadyPaid(false);
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
      setInvoiceServices([...invoiceServices, {
        description: preset.label,
        sac: preset.sac,
        rate: preset.rate,
        gstRate: preset.gstRate
      }]);
    }
  };

  // Quotation selection handler - auto-links to project if converted
  const handleQuotationSelect = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    const quotation = quotations.find(q => q.id === quotationId);
    if (quotation) {
      setBuyerName(quotation.clientName);
      setBuyerAddress(quotation.clientAddress || "");
      setBuyerState(quotation.clientState);
      setBuyerContact(quotation.clientPhone);
      
      // Auto-link to project if quotation was converted to a project
      if (quotation.convertedToProjectId) {
        const linkedProject = projects.find(p => p.id.toString() === quotation.convertedToProjectId);
        if (linkedProject) {
          setSelectedProjectId(linkedProject.id.toString());
        }
      }
      
      // Auto-link to customer if exists
      const matchingCustomer = customers.find(c => 
        c.name === quotation.clientName || c.phone === quotation.clientPhone
      );
      if (matchingCustomer) {
        setSelectedCustomerId(matchingCustomer.id);
        setBuyerGstin(matchingCustomer.gstin || "");
        setBuyerState(matchingCustomer.state || quotation.clientState || "");
      }
    }
  };

  // Customer selection handler - auto-links to their latest project/quotation
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setBuyerName(customer.name);
      setBuyerAddress(customer.address);
      setBuyerGstin(customer.gstin || "");
      setBuyerState(customer.state || "");
      setBuyerContact(customer.phone);
      
      // Auto-link to customer's project if exists
      const customerProject = projects.find(p =>
        p.client === customer.name || p.clientPhone === customer.phone
      );
      if (customerProject) {
        setSelectedProjectId(customerProject.id.toString());
      }
      
      // Auto-link to customer's quotation if exists
      const customerQuotation = quotations.find(q => 
        q.clientName === customer.name || q.clientPhone === customer.phone
      );
      if (customerQuotation) {
        setSelectedQuotationId(customerQuotation.id);
      }
    }
  };

  // Project selection handler - auto-links to quotation and customer
  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find(p => p.id.toString() === projectId);
    if (project) {
      setBuyerName(project.client);
      setBuyerAddress(project.address);
      setBuyerState(project.state);
      setBuyerContact(project.clientPhone || "");

      // Auto-link to quotation if project was created from one
      if (project.quotationId) {
        setSelectedQuotationId(project.quotationId);
      }

      // Auto-link to matching customer
      const matchingCustomer = customers.find(c =>
        c.name === project.client || c.phone === project.clientPhone
      );
      if (matchingCustomer) {
        setSelectedCustomerId(matchingCustomer.id);
        if (matchingCustomer.gstin) {
          setBuyerGstin(matchingCustomer.gstin);
        }
      }
    }
  };

  // Handle client selection from modal
  const handleClientFromModal = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setBuyerName(customer.name);
    setBuyerAddress(customer.address);
    setBuyerGstin(customer.gstin || "");
    setBuyerState(customer.state || "");
    setBuyerContact(customer.phone);
    setIsClientModalOpen(false);
  };

  // Clear project link
  const handleClearProject = () => {
    setSelectedProjectId("");
  };

  // Clear quotation link
  const handleClearQuotation = () => {
    setSelectedQuotationId("");
  };

  // Service row handlers
  const addServiceRow = () => {
    setInvoiceServices([...invoiceServices, { description: "", sac: "", rate: 0, gstRate: 18, serviceNotes: "" }]);
  };

  const removeServiceRow = (index: number) => {
    setInvoiceServices(invoiceServices.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceServices];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceServices(updated);
  };

  // Item row handlers
  const addItemRow = () => {
    setInvoiceItems([...invoiceItems, { description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18, itemNotes: "" }]);
  };

  const removeItemRow = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceItems(updated);
  };

  // Calculate totals
  const calculateTotals = () => {
    const isIGST = buyerState && buyerState !== companyState;
    
    const servicesTotal = invoiceServices.reduce((sum, s) => sum + s.rate, 0);
    const servicesTax = invoiceServices.reduce((sum, s) => sum + (s.rate * s.gstRate / 100), 0);
    
    const itemsTotal = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
    const itemsTax = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate * i.gstRate / 100), 0);
    
    const subtotal = servicesTotal + itemsTotal;
    const totalTax = servicesTax + itemsTax;
    
    return {
      subtotal,
      cgst: isIGST ? 0 : totalTax / 2,
      sgst: isIGST ? 0 : totalTax / 2,
      igst: isIGST ? totalTax : 0,
      total: subtotal + totalTax
    };
  };

  // Create invoice handler
  const handleCreateInvoice = () => {
    if (!buyerName) {
      toast({ title: "Error", description: "Customer/Buyer name is required", variant: "destructive" });
      return;
    }

    const hasNonZeroLine = invoiceItems.some(i => i.rate > 0) || invoiceServices.some(s => s.rate > 0);
    if (!hasNonZeroLine) {
      toast({ title: "Empty Invoice", description: "Add at least one line item with a non-zero rate.", variant: "destructive" });
      return;
    }

    if (!buyerState) {
      toast({ title: "State Required", description: "Select Place of Supply to determine IGST vs CGST/SGST split.", variant: "destructive" });
      return;
    }

    if (buyerGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(buyerGstin)) {
      toast({ title: "Invalid GSTIN", description: "GSTIN must be a valid 15-character format.", variant: "destructive" });
      return;
    }

    if (buyerContact && !/^[+0-9\s\-()]{7,20}$/.test(buyerContact)) {
      toast({ title: "Invalid Phone", description: "Enter a valid phone number.", variant: "destructive" });
      return;
    }

    const allowedGstRates = new Set([0, 5, 12, 18, 28]);
    const hasBadGst = invoiceItems.some(i => !allowedGstRates.has(i.gstRate)) || invoiceServices.some(s => !allowedGstRates.has(s.gstRate));
    if (hasBadGst) {
      toast({ title: "Invalid GST Rate", description: "GST rate must be 0, 5, 12, 18, or 28.", variant: "destructive" });
      return;
    }

    if (invoiceItems.some(i => i.quantity <= 0)) {
      toast({ title: "Invalid Quantity", description: "All line item quantities must be greater than zero.", variant: "destructive" });
      return;
    }

    if (selectedProjectId && !projects.find(p => p.id.toString() === selectedProjectId)) {
      toast({ title: "Invalid Project", description: "The selected project no longer exists.", variant: "destructive" });
      return;
    }

    if (selectedQuotationId) {
      const q = quotations.find(qq => qq.id === selectedQuotationId);
      if (q?.createdAt && invoiceDate < q.createdAt) {
        toast({ title: "Invalid Date", description: "Invoice date cannot be earlier than the linked quotation date.", variant: "destructive" });
        return;
      }
    }

    // Both invoice and sale-bill now use the same totals calculation
    const totals = calculateTotals();

    const rawReceived = amountReceived.trim();
    const parsedReceived = rawReceived === "" ? 0 : (Number.isFinite(parseFloat(rawReceived)) ? parseFloat(rawReceived) : 0);

    let received: number;
    let status: Invoice["status"];

    const dueDateValid = Boolean(dueDate && !Number.isNaN(Date.parse(dueDate)));

    if (isAlreadyPaid) {
      received = totals.total;
      status = "paid";
    } else if (parsedReceived > totals.total + 0.005 && totals.total > 0) {
      received = parsedReceived;
      status = "overpaid";
    } else {
      received = Math.min(totals.total, Math.max(0, parsedReceived));
      if (received >= totals.total - 0.005 && totals.total > 0) {
        status = "paid";
      } else if (received > 0.005) {
        status = "partial";
      } else if (dueDateValid && new Date(dueDate) < new Date()) {
        status = "overdue";
      } else {
        status = "pending";
      }
    }

    const finalReceivedIn = isAlreadyPaid && !receivedIn ? "Cash" : receivedIn;
    const finalReceivedDate = isAlreadyPaid && !receivedDate ? invoiceDate : receivedDate;

    const finalItems = invoiceItems;

    const resolvedType = inferInvoiceOrSaleBillType({
      projectId: selectedProjectId || undefined,
      quotationId: selectedQuotationId || undefined,
      items: finalItems,
      services: invoiceServices,
    });
    const invoiceNumber = nextDocumentNumber(resolvedType, existingDocuments);

    const newInvoice: Invoice = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? `INV-${crypto.randomUUID()}` : `INV-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.toUpperCase(),
      invoiceNumber,
      type: resolvedType,
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

    onCreated(newInvoice);
    resetForm();
    onOpenChange(false);
    toast({
      title: `${resolvedType === "invoice" ? "Invoice" : "Sale bill"} created`,
      description: `${newInvoice.invoiceNumber} has been created successfully`,
    });
  };

  const invoiceTotals = calculateTotals();

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <AppSheetContent layout="form" size="xxl">
        <SheetHeader>
          <SheetTitle>New invoice or sale bill</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
            <div className="space-y-6">
              {/* Header Section */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply (State)</Label>
                  <Select value={buyerState} onValueChange={setBuyerState}>
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
              <div className="grid grid-cols-3 gap-4">
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
                            <Button variant="ghost" size="icon" onClick={handleClearProject} className="h-9 w-9">
                              <X className="h-4 w-4" />
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
                              {quotations.filter(q => q.status === "approved" || q.status === "confirmed").map(q => (
                                <SelectItem key={q.id} value={q.id}>{q.quotationNumber}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedQuotationId && (
                            <Button variant="ghost" size="icon" onClick={handleClearQuotation} className="h-9 w-9">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Preset Selection - Visible when project is selected */}
                      {selectedProjectId && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Load Preset (Optional)</Label>
                          <Select onValueChange={(presetId) => {
                            // Find the preset and load items
                            const selectedProject = projects.find(p => p.id.toString() === selectedProjectId);
                            if (selectedProject) {
                              toast({ title: "Preset Applied", description: "Items loaded from preset" });
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
                <div className="col-span-2">
                  <Card className="bg-muted/30">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-medium">Client Details</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => setIsClientModalOpen(true)}>
                        <Search className="h-3 w-3 mr-1" />
                        Select Client
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Client Name *</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={buyerName} 
                              onChange={(e) => setBuyerName(e.target.value)} 
                              placeholder="Click Select Client or type name" 
                              className="flex-1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Contact</Label>
                          <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="+91 98765 43210" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Address</Label>
                          <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Enter address" />
                        </div>
                        <div className="space-y-2">
                          <Label>GSTIN</Label>
                          <Input value={buyerGstin} onChange={(e) => setBuyerGstin(e.target.value)} placeholder="e.g., 08AABCS1234A1Z5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Services Section */}
              <Card className="bg-muted/30">
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Services</CardTitle>
                  <div className="flex gap-2">
                    <Select onValueChange={addServiceFromPreset}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
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
                        <div key={idx} className="space-y-2 p-3 border rounded-lg bg-background/50">
                          <div className="grid grid-cols-12 gap-2 items-end">
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
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium">Items</CardTitle>
                  <div className="flex gap-2">
                    <Select onValueChange={(v) => {
                      const item = inventoryItems.find(i => i.id.toString() === v);
                      if (item) {
                        setInvoiceItems([...invoiceItems, {
                          description: item.name,
                          hsn: item.hsn,
                          quantity: 1,
                          rate: item.price,
                          gstRate: 18
                        }]);
                      }
                    }}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
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
                        <div key={idx} className="space-y-2 p-3 border rounded-lg bg-background/50">
                          <div className="grid grid-cols-12 gap-2 items-end">
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
                        <span>₹{invoiceTotals.subtotal.toLocaleString()}</span>
                      </div>
                      {invoiceTotals.igst > 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">IGST:</span>
                          <span>₹{invoiceTotals.igst.toLocaleString()}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CGST:</span>
                            <span>₹{invoiceTotals.cgst.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SGST:</span>
                            <span>₹{invoiceTotals.sgst.toLocaleString()}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>₹{invoiceTotals.total.toLocaleString()}</span>
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
                      onCheckedChange={(checked) => setIsAlreadyPaid(checked === true)}
                    />
                    <Label htmlFor="alreadyPaid" className="text-sm font-medium cursor-pointer">
                      Already Paid in Full
                    </Label>
                  </div>
                </CardHeader>
                <CardContent>
                  {isAlreadyPaid ? (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                      <p className="text-sm text-primary font-medium">
                        ✓ This invoice will be marked as fully paid (₹{calculateTotals().total.toLocaleString()})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Payment date: {invoiceDate}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Amount Received (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Received In</Label>
                        <Select value={receivedIn} onValueChange={setReceivedIn}>
                          <SelectTrigger><SelectValue placeholder="Payment mode" /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_MODES.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Date Received</Label>
                        <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g., 50% advance, 50% on completion" />
                </div>
                <div className="space-y-2">
                  <Label>Bank Account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
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
                <Textarea value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} placeholder="Enter any additional notes or terms" rows={3} />
              </div>
            </div>
        </div>
        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground" onClick={handleCreateInvoice}>
            Create
          </Button>
        </div>
      </AppSheetContent>
      {/* Client Selection Modal */}
      <ClientSelectionModal
        open={isClientModalOpen}
        onOpenChange={setIsClientModalOpen}
        customers={customers}
        onSelect={handleClientFromModal}
        onAddNew={() => {
          setIsClientModalOpen(false);
          if (onCustomerCreated) {
            toast({ title: "Add New Client", description: "This would open the add customer form" });
          }
        }}
      />
    </Sheet>
  );
}

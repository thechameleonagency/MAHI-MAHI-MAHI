import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Plus, Search, FileText, Eye, Download, IndianRupee, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { InvoiceCreateSheet } from "@/components/invoices/InvoiceCreateSheet";
import ExportHeader from "@/components/ExportHeader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Invoice, InvoiceItem } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const Invoices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    invoices,
    saleBills,
    customers,
    projects,
    quotations,
    inventoryItems,
    servicePresets,
    addInvoice,
    addSaleBill,
    updateInvoice,
    updateSaleBill,
    addPayment,
    generateId,
  } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState<"all" | "invoice" | "sale-bill">("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  
  // Invoice Detail & Payment
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  
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
  } | undefined>(undefined);
  
  // Invoice preview ref for PDF export
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  // Handle URL parameters for prefilling invoice from quotation or project
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
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
      const parsedAmount = parseFloat(amount || '0');
      const prefillData = {
        customerName: client,
        customerAddress: address || undefined,
        customerContact: contact || undefined,
        customerState: state || undefined,
        quotationId: quotationId || undefined,
        total: parsedAmount,
        items: parsedAmount > 0 ? [{
          description: `Solar System Installation${project ? ` - ${project}` : ''}`,
          hsn: "85414012",
          quantity: 1,
          rate: parsedAmount,
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
      const parsedAmount = parseFloat(amount || '0');
      const prefillData = {
        customerName: client,
        customerAddress: address || undefined,
        customerContact: contact || undefined,
        customerState: state || undefined,
        projectId: projectId || undefined,
        total: parsedAmount,
        items: parsedAmount > 0 ? [{
          description: `Solar System Installation - ${project || 'Project'}`,
          hsn: "85414012",
          quantity: 1,
          rate: parsedAmount,
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
  }, [location.search, navigate]);

  const handleInvoiceCreated = (invoice: Invoice) => {
    if (invoice.type === "sale-bill") {
      addSaleBill(invoice);
    } else {
      addInvoice(invoice);
    }
    setIsAddInvoiceOpen(false);
    setInvoicePrefill(undefined);
    toast({ title: "Document created", description: `${invoice.invoiceNumber} has been created` });
  };

  const handleRecordPayment = () => {
    if (!selectedInvoice || !paymentAmount) {
      toast({ title: "Error", description: "Amount is required", variant: "destructive" });
      return;
    }

    const amount = parseFloat(paymentAmount);
    const newReceived = selectedInvoice.amountReceived + amount;
    const newStatus = newReceived >= selectedInvoice.total ? "paid" : "partial";

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

    addPayment({
      id: generateId('PAY'),
      date: paymentDate,
      amount,
      direction: 'in',
      paymentMode: paymentMode,
      counterpartyType: 'customer',
      counterpartyId: selectedInvoice.customerId,
      counterpartyName: selectedInvoice.customerName,
      invoiceId: selectedInvoice.id,
      notes: `Payment for ${selectedInvoice.invoiceNumber}`,
    });

    setIsRecordPaymentOpen(false);
    setPaymentAmount("");
    setPaymentMode("");
    toast({ title: "Payment Recorded", description: `₹${amount.toLocaleString()} has been recorded` });
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
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export PDF", variant: "destructive" });
    }
  };

  const allBillingDocuments = useMemo(
    () => [...invoices, ...saleBills].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()),
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
        const t = i.type ?? "invoice";
        const matchesDoc =
          docTypeFilter === "all" ||
          (docTypeFilter === "invoice" && t === "invoice") ||
          (docTypeFilter === "sale-bill" && t === "sale-bill");
        return matchesSearch && matchesStatus && matchesDoc;
      }),
    [allBillingDocuments, searchQuery, statusFilter, docTypeFilter],
  );

  const { pagedItems: pagedInvoices, safePage } = usePagedSlice(filteredInvoices, tablePage, tablePageSize);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "pending": "bg-amber-500/10 text-amber-500 border-0",
      "partial": "bg-blue-500/10 text-blue-500 border-0",
      "paid": "bg-primary/10 text-primary border-0",
      "overdue": "bg-destructive/10 text-destructive border-0",
    };
    return <Badge className={styles[status] || ""}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  // Stats
  const totalInvoiced = allBillingDocuments.reduce((sum, i) => sum + i.total, 0);
  const totalReceived = allBillingDocuments.reduce((sum, i) => sum + i.amountReceived, 0);
  const pendingAmount = totalInvoiced - totalReceived;
  const pendingCount = allBillingDocuments.filter((i) => i.status !== "paid").length;

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
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="relative max-w-full flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Customer or document #"
                  className="h-9 border-border bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setTablePage(1);
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={docTypeFilter}
                  onValueChange={(v) => {
                    setDocTypeFilter(v as typeof docTypeFilter);
                    setTablePage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[min(100%,150px)] bg-muted/50">
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
                  <SelectTrigger className="h-9 w-[min(100%,150px)] bg-muted/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Docs", value: allBillingDocuments.length },
                { label: "Billed", value: formatCurrency(totalInvoiced) },
                { label: "Received", value: formatCurrency(totalReceived) },
                { label: "Pending", value: formatCurrency(pendingAmount) },
                { label: "Open", value: pendingCount },
              ]}
            />
          </>
        }
      >
        <Button size="sm" onClick={() => setIsAddInvoiceOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New
        </Button>
      </StickyPageHeader>

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
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {pagedInvoices.map((invoice) => (
              <TableRow key={invoice.id} className="border-border">
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {(invoice.type ?? "invoice") === "sale-bill" ? "SB" : "INV"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                <TableCell className="text-right text-primary">{formatCurrency(invoice.amountReceived)}</TableCell>
                <TableCell className="text-right text-amber-500">
                  {formatCurrency(invoice.total - invoice.amountReceived)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</TableCell>
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
                    {invoice.status !== "paid" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsRecordPaymentOpen(true);
                        }}
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
        <div className="text-center py-8">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No documents match</p>
        </div>
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
        prefill={invoicePrefill}
      />

      {/* Invoice Detail Modal */}
      <Sheet open={isInvoiceDetailOpen} onOpenChange={setIsInvoiceDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </SheetTitle>
          </SheetHeader>
          
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
                  <p className="text-sm text-muted-foreground">Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')}</p>
                  <p className="text-sm text-muted-foreground">Due: {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN')}</p>
                  <div className="mt-2">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>

              <Separator className="my-4" />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">GST %</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvoice.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.hsn}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                      <TableCell className="text-right">{item.gstRate}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.quantity * item.rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  {selectedInvoice.cgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>CGST:</span>
                      <span>{formatCurrency(selectedInvoice.cgst)}</span>
                    </div>
                  )}
                  {selectedInvoice.sgst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>SGST:</span>
                      <span>{formatCurrency(selectedInvoice.sgst)}</span>
                    </div>
                  )}
                  {selectedInvoice.igst > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>IGST:</span>
                      <span>{formatCurrency(selectedInvoice.igst)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Received:</span>
                    <span>{formatCurrency(selectedInvoice.amountReceived)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-amber-500">
                    <span>Balance:</span>
                    <span>{formatCurrency(selectedInvoice.total - selectedInvoice.amountReceived)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <SheetFooter>
            {selectedInvoice && selectedInvoice.status !== "paid" && (
              <Button onClick={() => {
                setIsInvoiceDetailOpen(false);
                setIsRecordPaymentOpen(true);
              }}>
                <IndianRupee className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Record Payment Sheet */}
      <Sheet open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Invoice: {selectedInvoice?.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">Customer: {selectedInvoice?.customerName}</p>
              <p className="font-semibold mt-2">
                Balance: {formatCurrency((selectedInvoice?.total || 0) - (selectedInvoice?.amountReceived || 0))}
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
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsRecordPaymentOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleRecordPayment}>Record Payment</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Invoices;

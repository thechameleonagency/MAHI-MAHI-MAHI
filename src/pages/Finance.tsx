import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Download, TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownLeft, Receipt, Upload, Store, Phone, Mail, MapPin, X, Eye, FileText, Printer, Filter, ChevronDown, ChevronUp, Users, Building2, User, ExternalLink, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ExportHeader from "@/components/ExportHeader";
import ExportFooter from "@/components/ExportFooter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useMasters } from "@/contexts/MastersContext";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { UnifiedExpenseModal } from "@/components/expenses/UnifiedExpenseModal";
import { UnifiedIncomeModal } from "@/components/income/UnifiedIncomeModal";
import { toast } from "@/hooks/use-toast";
import { EntityLink } from "@/components/shared/EntityInfoModal";
import { Link, useNavigate } from "react-router-dom";
import { EXPENSE_MAIN_CATEGORIES } from "@/lib/expenseSchema";
import { PrototypeFinanceNotice } from "@/components/prototype/PrototypeFinanceNotice";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface InvoiceData {
  id: string;
  client: string;
  clientAddress?: string;
  clientGstin?: string;
  clientState?: string;
  clientContact?: string;
  project: string;
  amount: string;
  dueDate: string;
  invoiceDate?: string;
  status: string;
  type: 'invoice' | 'sale-bill';
  items?: { description: string; hsn: string; quantity: number; rate: number; gstRate: number; }[];
  services?: { description: string; sac: string; rate: number; gstRate: number; }[];
  subtotal?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  paymentTerms?: string;
  bankAccount?: string;
  notes?: string;
}

// Local invoice data removed - Finance page now uses contextInvoices from AppDataContext

const Finance = () => {
  const navigate = useNavigate();
  const { getHsnCodes, getSacCodes, getGstRates, getStateCodes, getBankAccounts } = useMasters();
  const {
    invoices: contextInvoices,
    saleBills: contextSaleBills,
    expenses: contextExpenses,
    payments: contextPayments,
    employees: contextEmployees,
    projects: contextProjects,
    inventoryItems: contextInventory,
    accountingReviewQueue,
    dismissAccountingReviewItem,
    retryAccountingReviewPosting,
  } = useAppData();

  const [txnTablePage, setTxnTablePage] = useState(1);
  const [txnTablePageSize, setTxnTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  // Derive revenue/expense chart data from context
  const revenueData = useMemo(() => {
    const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
    months.forEach(m => { monthlyData[m] = { revenue: 0, expenses: 0 }; });
    
    // Sum payments (revenue)
    contextPayments.forEach(p => {
      if (p.direction === "in" && p.date) {
        const month = new Date(p.date).toLocaleString('en', { month: 'short' });
        if (monthlyData[month]) monthlyData[month].revenue += p.amount;
      }
    });
    
    // Sum invoices and sale bills received amounts
    [...contextInvoices, ...contextSaleBills].forEach(inv => {
      if (inv.amountReceived && inv.invoiceDate) {
        const month = new Date(inv.invoiceDate).toLocaleString('en', { month: 'short' });
        if (monthlyData[month]) monthlyData[month].revenue += inv.amountReceived;
      }
    });
    
    // Sum expenses
    contextExpenses.forEach(exp => {
      if (exp.date) {
        const month = new Date(exp.date).toLocaleString('en', { month: 'short' });
        if (monthlyData[month]) monthlyData[month].expenses += exp.amount;
      }
    });
    
    // Return last 6 months with fallback values if empty
    const last6 = months.slice(-6);
    const result = last6.map(m => ({
      month: m,
      revenue: monthlyData[m].revenue || 0,
      expenses: monthlyData[m].expenses || 0,
    }));
    
    return result;
  }, [contextPayments, contextInvoices, contextSaleBills, contextExpenses]);
  
  // Derive transactions from context
  const transactions = useMemo(() => {
    const txns: { id: string; date: string; description: string; type: "Credit" | "Debit"; amount: string; category: string; status: string }[] = [];
    
    // Add payments as credits
    contextPayments.forEach(p => {
      if (p.direction === "in") {
        txns.push({
          id: p.id,
          date: p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          description: `Payment from ${p.counterpartyName || 'Customer'} - ${p.notes || 'Invoice Payment'}`,
          type: "Credit",
          amount: `₹${p.amount.toLocaleString()}`,
          category: "Project Income",
          status: "Completed",
        });
      }
    });
    
    // Add expenses as debits
    contextExpenses.forEach(exp => {
      txns.push({
        id: exp.id,
        date: exp.date ? new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        description: exp.description || `${exp.category} expense`,
        type: "Debit",
        amount: `₹${exp.amount.toLocaleString()}`,
        category: exp.category,
        status: "Completed",
      });
    });
    
    // Sort by date descending
    return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contextPayments, contextExpenses]);

  const { pagedItems: pagedTransactions, safePage: safeTxnPage } = usePagedSlice(
    transactions,
    txnTablePage,
    txnTablePageSize,
  );

  // Compute KPI values from context
  const kpiValues = useMemo(() => {
    const totalRevenue = contextInvoices.reduce((sum, inv) => sum + (inv.amountReceived || 0), 0) + 
                         contextPayments.filter(p => p.direction === "in").reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = contextExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const outstanding = contextInvoices.reduce((sum, inv) => sum + (inv.total - (inv.amountReceived || 0)), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    return {
      revenue: totalRevenue || 0,
      expenses: totalExpenses || 0,
      outstanding: outstanding || 0,
      profit: netProfit || 0,
    };
  }, [contextInvoices, contextPayments, contextExpenses]);
  
  // Map inventory items for local use
  const inventoryItems = contextInventory.map(item => ({
    id: item.id,
    name: item.name,
    quantity: item.stock,
    price: item.salePrice,
    hsn: item.hsn,
  }));
  
  // Map employees for local use  
  const employees = contextEmployees.map(e => ({
    id: e.id,
    name: e.name,
    initial: e.name.charAt(0),
    role: e.role,
  }));
  
  // Map projects for local use
  const projects = contextProjects.map(p => ({
    id: p.id,
    name: p.name,
    client: p.client,
    address: p.clientAddress || p.location,
    state: "08",
  }));
  
  // Note: partners, loans, repayments, partnerRepayments are now derived from context above
  
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isInvoiceDetailOpen, setIsInvoiceDetailOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, string>>({});
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  
  // Invoice preview ref
  const invoicePreviewRef = useRef<HTMLDivElement>(null);
  
  // Expense form state
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseMonth, setExpenseMonth] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedVendorForPurchase, setSelectedVendorForPurchase] = useState("");
  
  // Income form state
  const [incomeSource, setIncomeSource] = useState("");
  const [customIncomeSource, setCustomIncomeSource] = useState("");
  
  // Invoice form state
  const [invoiceType, setInvoiceType] = useState<"invoice" | "sale-bill">("invoice");
  const [invoiceSite, setInvoiceSite] = useState("");
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<Record<number, number>>({});
  
  // Enhanced invoice form state
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerState, setBuyerState] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [invoiceServices, setInvoiceServices] = useState<{ description: string; sac: string; rate: number; gstRate: number; }[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; hsn: string; quantity: number; rate: number; gstRate: number; }[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  
  // Export modal state
  const [selectedExportMonths, setSelectedExportMonths] = useState<string[]>([]);
  const [selectedExportProject, setSelectedExportProject] = useState("");
  const [exportVendorInclude, setExportVendorInclude] = useState(false);
  const [exportInvoiceInclude, setExportInvoiceInclude] = useState(false);
  const [exportInvoiceFilter, setExportInvoiceFilter] = useState("all");
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([]);
  const [selectedExportEmployees, setSelectedExportEmployees] = useState<number[]>([]);
  const [employeeExportType, setEmployeeExportType] = useState<"monthly" | "full">("full");

  // KPI Detail modals
  const [isRevenueDetailOpen, setIsRevenueDetailOpen] = useState(false);
  const [isExpenseDetailOpen, setIsExpenseDetailOpen] = useState(false);
  const [isOutstandingDetailOpen, setIsOutstandingDetailOpen] = useState(false);
  const [isProfitDetailOpen, setIsProfitDetailOpen] = useState(false);

  // Company state (for IGST calculation)
  const companyState = "08"; // Rajasthan

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Completed": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Pending": "bg-amber-500/10 text-amber-500 border-amber-500/20",
      "Paid": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "Overdue": "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const handleInvoiceStatusChange = (invoiceId: string, newStatus: string) => {
    setInvoiceStatuses(prev => ({ ...prev, [invoiceId]: newStatus }));
  };

  const getInvoiceStatus = (invoice: InvoiceData) => {
    return invoiceStatuses[invoice.id] || invoice.status;
  };

  const handleInvoiceClick = (invoice: InvoiceData) => {
    setSelectedInvoice(invoice);
    setIsInvoiceDetailOpen(true);
  };

  const handleInventoryItemToggle = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedInventoryItems(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      const newItems = { ...selectedInventoryItems };
      delete newItems[itemId];
      setSelectedInventoryItems(newItems);
    }
  };

  const getSaleBillTotal = () => {
    return Object.entries(selectedInventoryItems).reduce((sum, [itemId, qty]) => {
      const item = inventoryItems.find(i => i.id === parseInt(itemId));
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const isSiteRelatedCategory = (cat: string) => {
    return ["labour", "transport", "material", "commission"].includes(cat);
  };

  // Calculate invoice totals
  const calculateInvoiceTotals = () => {
    const isIGST = buyerState && buyerState !== companyState;
    
    let servicesTotal = invoiceServices.reduce((sum, s) => sum + s.rate, 0);
    let servicesTax = invoiceServices.reduce((sum, s) => sum + (s.rate * s.gstRate / 100), 0);
    
    let itemsTotal = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
    let itemsTax = invoiceItems.reduce((sum, i) => sum + (i.quantity * i.rate * i.gstRate / 100), 0);
    
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

  const addServiceRow = () => {
    setInvoiceServices([...invoiceServices, { description: "", sac: "", rate: 0, gstRate: 18 }]);
  };

  const addItemRow = () => {
    setInvoiceItems([...invoiceItems, { description: "", hsn: "", quantity: 1, rate: 0, gstRate: 18 }]);
  };

  const removeServiceRow = (index: number) => {
    setInvoiceServices(invoiceServices.filter((_, i) => i !== index));
  };

  const removeItemRow = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceServices];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceServices(updated);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const updated = [...invoiceItems];
    updated[index] = { ...updated[index], [field]: value };
    setInvoiceItems(updated);
  };

  const toggleExportMonth = (month: string) => {
    setSelectedExportMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const toggleExportEmployee = (empId: number) => {
    setSelectedExportEmployees(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleExportPDF = async () => {
    if (!invoicePreviewRef.current) return;
    
    const canvas = await html2canvas(invoicePreviewRef.current, { scale: 2, useCORS: true });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
    pdf.save(`${selectedInvoice?.id || 'invoice'}.pdf`);
  };

  const resetInvoiceForm = () => {
    setInvoiceType("invoice");
    setInvoiceSite("");
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate("");
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
    setSelectedInventoryItems({});
  };

  const handleCreateInvoice = () => {
    const totals = calculateInvoiceTotals();
    const newInvoice: InvoiceData = {
      id: `INV-2024-${String(invoices.length + 90).padStart(3, '0')}`,
      client: buyerName || projects.find(p => p.id.toString() === invoiceSite)?.client || "",
      clientAddress: buyerAddress,
      clientGstin: buyerGstin,
      clientState: buyerState,
      clientContact: buyerContact,
      project: projects.find(p => p.id.toString() === invoiceSite)?.name || "",
      amount: formatCurrency(totals.total),
      dueDate: dueDate,
      invoiceDate: invoiceDate,
      status: "Pending",
      type: invoiceType,
      items: invoiceItems,
      services: invoiceServices,
      ...totals,
      paymentTerms,
      bankAccount: selectedBankAccount,
      notes: invoiceNotes
    };
    
    setInvoices([newInvoice, ...invoices]);
    setIsNewInvoiceOpen(false);
    resetInvoiceForm();
  };

  const invoiceTotals = calculateInvoiceTotals();

  const financeSubRow = useMemo(
    () => (
      <InlineKpiStrip
        className="w-full flex-wrap justify-start"
        items={[
          {
            label: "Revenue",
            value: `₹${(kpiValues.revenue / 100000).toFixed(1)}L`,
            onClick: () => setIsRevenueDetailOpen(true),
          },
          {
            label: "Expenses",
            value: `₹${(kpiValues.expenses / 100000).toFixed(1)}L`,
            onClick: () => setIsExpenseDetailOpen(true),
          },
          {
            label: "Outstanding",
            value: `₹${(kpiValues.outstanding / 100000).toFixed(1)}L`,
            onClick: () => setIsOutstandingDetailOpen(true),
          },
          {
            label: "Net profit",
            value: `₹${(kpiValues.profit / 100000).toFixed(1)}L`,
            onClick: () => setIsProfitDetailOpen(true),
          },
        ]}
      />
    ),
    [kpiValues],
  );

  return (
    <PageShell className="space-y-3 px-0 md:space-y-4">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Finance" }]}
        subRow={financeSubRow}
      >
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => setIsAddExpenseOpen(true)}>
          <ArrowDownLeft className="mr-1 h-4 w-4" />
          Expense
        </Button>
        <Button variant="outline" size="sm" className="border-blue-600/30 text-blue-600" onClick={() => setIsAddIncomeOpen(true)}>
          <ArrowUpRight className="mr-1 h-4 w-4" />
          Income
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsExportModalOpen(true)}>
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      </StickyPageHeader>

      <PrototypeFinanceNotice />

      {accountingReviewQueue.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Accounting review queue
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Voucher auto-posting failed for these events — resolve manually or adjust mapping (prototype).
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2 text-sm">
              {accountingReviewQueue.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 rounded-md border border-border/80 bg-card/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="font-medium text-foreground block">
                      {item.eventType} · {item.sourceDocumentId}
                    </span>
                    <span className="text-muted-foreground text-xs sm:text-sm">
                      {item.reason} — ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const r = retryAccountingReviewPosting(item.id);
                        if (r.ok) {
                          toast({ title: "Voucher posted", description: "Event re-posted; item removed from queue." });
                        }
                      }}
                    >
                      Retry post
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        dismissAccountingReviewItem(item.id);
                        toast({ title: "Dismissed", description: "Removed from review queue (mark resolved in your process)." });
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 space-y-4 md:mt-6 md:space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v/100000}L`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(txnTablePageSize)}
                scrollResetKey={`${safeTxnPage}-${txnTablePageSize}-${transactions.length}`}
                footer={
                  <TablePaginationBar
                    page={safeTxnPage}
                    pageSize={txnTablePageSize}
                    total={transactions.length}
                    onPageChange={setTxnTablePage}
                    onPageSizeChange={(n) => {
                      setTxnTablePageSize(n);
                      setTxnTablePage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead >Date</TableHead>
                    <TableHead >Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead >Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedTransactions.map((txn) => (
                    <TableRow key={txn.id} className="border-border">
                      <TableCell className="text-muted-foreground">{txn.date}</TableCell>
                      <TableCell className="text-foreground">{txn.description}</TableCell>
                      <TableCell className={`text-right font-medium ${txn.type === "Credit" ? "text-blue-500" : "text-red-500"}`}>
                        {txn.type === "Credit" ? "+" : "-"}{txn.amount}
                      </TableCell>
                      <TableCell>{getStatusBadge(txn.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
            </CardContent>
          </Card>
              </div>

      {/* Unified Expense Modal */}
      <UnifiedExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
      />

      {/* Unified Income Modal */}
      <UnifiedIncomeModal
        isOpen={isAddIncomeOpen}
        onClose={() => setIsAddIncomeOpen(false)}
      />

      {/* Enhanced New Invoice Modal */}
      <Sheet open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Invoice</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-4">
            {/* Invoice Type Toggle */}
            <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as "invoice" | "sale-bill")}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="invoice">Invoice</TabsTrigger>
                <TabsTrigger value="sale-bill">Sale Bill</TabsTrigger>
              </TabsList>

              <TabsContent value="invoice" className="space-y-6 mt-4">
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

                {/* Buyer Details */}
                <Card className="bg-muted/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Buyer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select from Project</Label>
                      <Select value={invoiceSite} onValueChange={(v) => {
                        setInvoiceSite(v);
                        const project = projects.find(p => p.id.toString() === v);
                        if (project) {
                          setBuyerName(project.client);
                          setBuyerAddress(project.address);
                          setBuyerState(project.state);
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                        <SelectContent>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name} - {p.client}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client Name *</Label>
                        <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Enter client name" />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTIN</Label>
                        <Input value={buyerGstin} onChange={(e) => setBuyerGstin(e.target.value)} placeholder="e.g., 08AABCS1234A1Z5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Enter address" />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact</Label>
                        <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="+91 98765 43210" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Services Section */}
                <Card className="bg-muted/30">
                  <CardHeader className="py-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium">Services</CardTitle>
                    <Button variant="outline" size="sm" onClick={addServiceRow}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Service
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {invoiceServices.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No services added. Click "Add Service" to add one.</p>
                    ) : (
                      <div className="space-y-3">
                        {invoiceServices.map((service, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-4">
                              <Label className="text-xs">Description</Label>
                              <Input value={service.description} onChange={(e) => updateService(idx, 'description', e.target.value)} placeholder="Service description" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">SAC Code</Label>
                              <Select value={service.sac} onValueChange={(v) => updateService(idx, 'sac', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="SAC" /></SelectTrigger>
                                <SelectContent>
                                  {getSacCodes().map(s => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Rate (₹)</Label>
                              <Input type="number" value={service.rate} onChange={(e) => updateService(idx, 'rate', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={service.gstRate.toString()} onValueChange={(v) => updateService(idx, 'gstRate', parseFloat(v))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {getGstRates().map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
                          <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-3">
                              <Label className="text-xs">Description</Label>
                              <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item description" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">HSN Code</Label>
                              <Select value={item.hsn} onValueChange={(v) => updateItem(idx, 'hsn', v)}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="HSN" /></SelectTrigger>
                                <SelectContent>
                                  {getHsnCodes().map(h => (
                                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-1">
                              <Label className="text-xs">Qty</Label>
                              <Input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Rate (₹)</Label>
                              <Input type="number" value={item.rate} onChange={(e) => updateItem(idx, 'rate', parseFloat(e.target.value) || 0)} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={item.gstRate.toString()} onValueChange={(v) => updateItem(idx, 'gstRate', parseFloat(v))}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {getGstRates().map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
              </TabsContent>

              <TabsContent value="sale-bill" className="space-y-6 mt-4">
                {/* Header Section */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Bill Date</Label>
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

                {/* Buyer Details */}
                <Card className="bg-muted/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Buyer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client Name *</Label>
                        <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Enter client name" />
                      </div>
                      <div className="space-y-2">
                        <Label>GSTIN</Label>
                        <Input value={buyerGstin} onChange={(e) => setBuyerGstin(e.target.value)} placeholder="e.g., 08AABCS1234A1Z5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="Enter address" />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact</Label>
                        <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="+91 98765 43210" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory Items Selection */}
                <Card className="bg-muted/30">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Select Items from Inventory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                      {inventoryItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={item.id in selectedInventoryItems}
                              onCheckedChange={(checked) => handleInventoryItemToggle(item.id, checked as boolean)}
                            />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">HSN: {item.hsn} | Stock: {item.quantity} | ₹{item.price.toLocaleString()}/unit</p>
                            </div>
                          </div>
                          {item.id in selectedInventoryItems && (
                            <Input 
                              type="number" 
                              className="w-20 h-8"
                              value={selectedInventoryItems[item.id]}
                              min={1}
                              max={item.quantity}
                              onChange={(e) => setSelectedInventoryItems(prev => ({
                                ...prev,
                                [item.id]: Math.min(parseInt(e.target.value) || 1, item.quantity)
                              }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Selected items will be deducted from inventory</p>
                  </CardContent>
                </Card>

                {/* Sale Bill Totals */}
                <Card className="bg-muted/30">
                  <CardContent className="py-4">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>₹{getSaleBillTotal().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GST (18%):</span>
                          <span>₹{Math.round(getSaleBillTotal() * 0.18).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>₹{Math.round(getSaleBillTotal() * 1.18).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="e.g., Full payment on delivery" />
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
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsNewInvoiceOpen(false); resetInvoiceForm(); }}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                handleCreateInvoice();
                setSelectedInvoice(invoices[0]);
                setIsPreviewOpen(true);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={handleCreateInvoice}>
                Create {invoiceType === "invoice" ? "Invoice" : "Sale Bill"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invoice Detail Modal */}
      <Sheet open={isInvoiceDetailOpen} onOpenChange={setIsInvoiceDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invoice Details</SheetTitle>
          </SheetHeader>
          {selectedInvoice && (
            <div ref={invoicePreviewRef} className="bg-white text-black" style={{ padding: '64px 24px 200px 24px', fontSize: '12px' }}>
              <ExportHeader 
                exportedBy={{ name: "Admin", role: "Manager" }} 
                title={selectedInvoice.type === "invoice" ? "TAX INVOICE" : "SALE BILL"}
                subtitle={selectedInvoice.id}
              />
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Bill To:</h4>
                  <p className="text-sm font-medium">{selectedInvoice.client}</p>
                  {selectedInvoice.clientAddress && <p className="text-sm text-muted-foreground">{selectedInvoice.clientAddress}</p>}
                  {selectedInvoice.clientGstin && <p className="text-sm text-muted-foreground">GSTIN: {selectedInvoice.clientGstin}</p>}
                  {selectedInvoice.clientContact && <p className="text-sm text-muted-foreground">Contact: {selectedInvoice.clientContact}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm"><span className="text-muted-foreground">Invoice Date:</span> {selectedInvoice.invoiceDate}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Due Date:</span> {selectedInvoice.dueDate}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Status:</span> {getStatusBadge(getInvoiceStatus(selectedInvoice))}</p>
                </div>
              </div>

              {selectedInvoice.project && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm"><span className="text-muted-foreground">Project:</span> {selectedInvoice.project}</p>
                </div>
              )}

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
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
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.gstRate}%</TableCell>
                          <TableCell className="text-right">₹{(item.quantity * item.rate * (1 + item.gstRate/100)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end">
                <div className="w-64 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>₹{selectedInvoice.subtotal?.toLocaleString() || 0}</span>
                  </div>
                  {selectedInvoice.igst && selectedInvoice.igst > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST:</span>
                      <span>₹{selectedInvoice.igst.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CGST:</span>
                        <span>₹{selectedInvoice.cgst?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SGST:</span>
                        <span>₹{selectedInvoice.sgst?.toLocaleString() || 0}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{selectedInvoice.amount}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.paymentTerms && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm"><span className="text-muted-foreground">Payment Terms:</span> {selectedInvoice.paymentTerms}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsInvoiceDetailOpen(false)}>Close</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Export Modal */}
      <Sheet open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Export Reports</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-4">
            {/* Transactions Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <Button size="sm" disabled={selectedExportMonths.length === 0}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground mb-2 block">Select months:</Label>
                <div className="flex flex-wrap gap-2">
                  {months.map(m => (
                    <Badge 
                      key={m} 
                      variant={selectedExportMonths.includes(m) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleExportMonth(m)}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Projects Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Projects</CardTitle>
                  <Button size="sm" disabled={!selectedExportProject}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Select Project</Label>
                  <Select value={selectedExportProject} onValueChange={setSelectedExportProject}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={exportInvoiceInclude} onCheckedChange={(c) => setExportInvoiceInclude(c as boolean)} />
                    <Label className="text-sm">Include Invoices</Label>
                  </div>
                </div>
                {exportInvoiceInclude && (
                  <Select value={exportInvoiceFilter} onValueChange={setExportInvoiceFilter}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Invoices</SelectItem>
                      <SelectItem value="pending">Pending Only</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>

            {/* Vendors Export - Separate */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                  <Button size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Export all vendor details with purchase history</p>
              </CardContent>
            </Card>

            {/* Expenses Export - Multi-select */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Expenses by Category</CardTitle>
                  <Button size="sm" disabled={selectedExpenseCategories.length === 0}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground mb-2 block">Select categories (multi-select):</Label>
                <div className="flex flex-wrap gap-2">
                  {["labour", "transport", "material", "commission", "infrastructure"].map(cat => (
                    <Badge 
                      key={cat} 
                      variant={selectedExpenseCategories.includes(cat) ? "default" : "outline"} 
                      className="cursor-pointer capitalize"
                      onClick={() => setSelectedExpenseCategories(prev => 
                        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                      )}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee History Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Employee History</CardTitle>
                  <Button size="sm" disabled={selectedExportEmployees.length === 0}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label className="text-xs text-muted-foreground block">Select employees:</Label>
                <div className="flex flex-wrap gap-2">
                  {employees.map(emp => (
                    <Badge 
                      key={emp.id} 
                      variant={selectedExportEmployees.includes(emp.id) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleExportEmployee(emp.id)}
                    >
                      {emp.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="empExportType" 
                      checked={employeeExportType === "monthly"}
                      onChange={() => setEmployeeExportType("monthly")}
                      className="accent-primary"
                    />
                    <span className="text-sm">By Month</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="empExportType" 
                      checked={employeeExportType === "full"}
                      onChange={() => setEmployeeExportType("full")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Full History</span>
                  </label>
                </div>
                {employeeExportType === "monthly" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {months.map(m => (
                      <Badge 
                        key={m} 
                        variant={selectedExportMonths.includes(m) ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => toggleExportMonth(m)}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Revenue Detail Modal */}
      <Sheet open={isRevenueDetailOpen} onOpenChange={setIsRevenueDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              Total Revenue Details
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue (FY 2024-25)</p>
              <p className="text-3xl font-bold text-blue-500">₹62,40,000</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Revenue Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Project Income</span>
                  <span className="font-semibold">₹48,50,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">AMC Income</span>
                  <span className="font-semibold">₹8,40,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Service Charges</span>
                  <span className="font-semibold">₹3,20,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Government Subsidy</span>
                  <span className="font-semibold">₹2,30,000</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Monthly Trend</h4>
              <div className="grid grid-cols-6 gap-2">
                {revenueData.map((d) => (
                  <div key={d.month} className="text-center">
                    <p className="text-xs text-muted-foreground">{d.month}</p>
                    <p className="text-sm font-medium">₹{(d.revenue/100000).toFixed(1)}L</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsRevenueDetailOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Detail Modal */}
      <Sheet open={isExpenseDetailOpen} onOpenChange={setIsExpenseDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              Total Expenses Details
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Expenses (FY 2024-25)</p>
              <p className="text-3xl font-bold text-red-500">₹34,20,000</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Expense Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Material Cost</span>
                  <span className="font-semibold">₹18,50,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Labour & Payroll</span>
                  <span className="font-semibold">₹8,40,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Transport</span>
                  <span className="font-semibold">₹3,20,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Equipment & Tools</span>
                  <span className="font-semibold">₹2,10,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Overheads</span>
                  <span className="font-semibold">₹2,00,000</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExpenseDetailOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Outstanding Detail Modal */}
      <Sheet open={isOutstandingDetailOpen} onOpenChange={setIsOutstandingDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-amber-500" />
              </div>
              Outstanding Amount Details
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-3xl font-bold text-amber-500">₹18,60,000</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Outstanding by Client</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Sunrise Towers</p>
                    <p className="text-xs text-muted-foreground">Due: 25 Dec 2024</p>
                  </div>
                  <span className="font-semibold text-amber-500">₹4,50,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Green Valley</p>
                    <p className="text-xs text-destructive">Overdue: 5 days</p>
                  </div>
                  <span className="font-semibold text-destructive">₹1,80,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Metro Heights</p>
                    <p className="text-xs text-muted-foreground">Due: 30 Dec 2024</p>
                  </div>
                  <span className="font-semibold text-amber-500">₹6,20,000</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Sharma Residency</p>
                    <p className="text-xs text-muted-foreground">Due: 05 Jan 2025</p>
                  </div>
                  <span className="font-semibold text-amber-500">₹6,10,000</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive font-medium">⚠ 1 payment is overdue</p>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOutstandingDetailOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Net Profit Detail Modal */}
      <Sheet open={isProfitDetailOpen} onOpenChange={setIsProfitDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <IndianRupee className="h-4 w-4 text-primary" />
              </div>
              Net Profit Details
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Net Profit (FY 2024-25)</p>
              <p className="text-3xl font-bold text-primary">₹28,20,000</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Profit Calculation</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-blue-500/10 rounded-lg">
                  <span className="text-sm">Total Revenue</span>
                  <span className="font-semibold text-blue-500">+ ₹62,40,000</span>
                </div>
                <div className="flex justify-between p-3 bg-red-500/10 rounded-lg">
                  <span className="text-sm">Total Expenses</span>
                  <span className="font-semibold text-red-500">- ₹34,20,000</span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">Net Profit</span>
                  <span className="font-bold text-primary">₹28,20,000</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Profit by Project</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Sharma Residency</span>
                  <span className="font-semibold text-primary">₹85,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Apex Industries</span>
                  <span className="font-semibold text-primary">₹3,20,000</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Tech Park</span>
                  <span className="font-semibold text-primary">₹2,80,000</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Profit Margin: <span className="font-semibold text-primary">45.2%</span></p>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsProfitDetailOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

    </PageShell>
  );
};

export default Finance;

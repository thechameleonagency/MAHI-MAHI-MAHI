import { useState, useRef, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Download, TrendingUp, TrendingDown, IndianRupee, ArrowUpRight, ArrowDownLeft, Receipt, X, Printer, Building2, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ExportHeader from "@/components/ExportHeader";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useMasters } from "@/contexts/MastersContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { UnifiedExpenseModal } from "@/components/expenses/UnifiedExpenseModal";
import { UnifiedIncomeModal } from "@/components/income/UnifiedIncomeModal";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { PrototypeFinanceNotice } from "@/components/prototype/PrototypeFinanceNotice";
import { downloadCSV } from "@/lib/csvExport";
import { format, isValid, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINRCompact } from "@/lib/formatCurrency";
import { calculateProjectProfit } from "@/domain/partners/derivePartnerEconomics";
import type { OwnerInvestment } from "@/types/finance";

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
  const _navigate = useNavigate();
  const { getHsnCodes, getSacCodes, getGstRates, getStateCodes, getBankAccounts } = useMasters();
  const {
    invoices: contextInvoices,
    saleBills: contextSaleBills,
    expenses: contextExpenses,
    payments: contextPayments,
    employees: contextEmployees,
    projects: contextProjects,
    inventoryItems: contextInventory,
    vendors: contextVendors,
    addInvoice,
    generateId,
    addOwnerInvestment,
    accountingReviewQueue,
    dismissAccountingReviewItem,
    retryAccountingReviewPosting,
  } = useAppData();

  const { currentRole } = useAppSession();
  const canRecordExpenseIncome = ["super_admin", "admin"].includes(currentRole ?? "");

  const [txnTablePage, setTxnTablePage] = useState(1);
  const [txnTablePageSize, setTxnTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [financeShellReady, setFinanceShellReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setFinanceShellReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

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
  
  // Derive transactions from context (keep ISO for sorting / export month filters — L68)
  const transactions = useMemo(() => {
    type TxnRow = {
      id: string;
      isoDate: string;
      date: string;
      description: string;
      type: "Credit" | "Debit";
      amount: string;
      category: string;
      status: string;
    };
    const txns: TxnRow[] = [];

    const toIso = (raw: string | undefined) => {
      if (!raw?.trim()) return "";
      const d = parseISO(raw.includes("T") ? raw : `${raw.slice(0, 10)}T12:00:00`);
      return isValid(d) ? d.toISOString() : "";
    };
    const display = (iso: string) =>
      iso ? format(parseISO(iso), "dd MMM yyyy") : "";

    contextPayments.forEach((p) => {
      if (p.direction === "in") {
        const iso = toIso(p.date);
        txns.push({
          id: p.id,
          isoDate: iso,
          date: display(iso),
          description: `Payment from ${p.counterpartyName || "Customer"} - ${p.notes || "Invoice Payment"}`,
          type: "Credit",
          amount: `₹${p.amount.toLocaleString()}`,
          category: "Project Income",
          status: "Completed",
        });
      }
    });

    contextExpenses.forEach((exp) => {
      const iso = toIso(exp.date);
      txns.push({
        id: exp.id,
        isoDate: iso,
        date: display(iso),
        description: exp.description || `${exp.category} expense`,
        type: "Debit",
        amount: `₹${exp.amount.toLocaleString()}`,
        category: exp.category,
        status: "Completed",
      });
    });

    return txns.sort((a, b) => {
      const ta = a.isoDate ? parseISO(a.isoDate).getTime() : 0;
      const tb = b.isoDate ? parseISO(b.isoDate).getTime() : 0;
      return tb - ta;
    });
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

  const totalAP = useMemo(
    () => contextVendors.reduce((s, v) => s + (v.outstandingAmount || 0), 0),
    [contextVendors],
  );

  const topProfitProjects = useMemo(() =>
    contextProjects
      .map(p => ({ name: p.name, profit: calculateProjectProfit(p) }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5),
  [contextProjects]);

  const profitMargin = kpiValues.revenue > 0
    ? ((kpiValues.profit / kpiValues.revenue) * 100).toFixed(1)
    : "0.0";

  /** KPI drill-down rows derived from context (replaces hardcoded demo figures in modals). */
  const financeKpiBreakdowns = useMemo(() => {
    const today = new Date();
    const invoiceReceivedTotal = contextInvoices.reduce((s, i) => s + (i.amountReceived || 0), 0);
    const paymentsIn = contextPayments.filter((p) => p.direction === "in");
    const paymentsInTotal = paymentsIn.reduce((s, p) => s + p.amount, 0);
    const receiptBucket = new Map<string, number>();
    paymentsIn.forEach((p) => {
      const label = p.counterpartyName?.trim() || p.counterpartyType || "Other";
      receiptBucket.set(label, (receiptBucket.get(label) || 0) + p.amount);
    });
    const topReceipts = Array.from(receiptBucket.entries())
      .map(([label, amount]) => ({ label, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);

    const expenseByCategory = new Map<string, number>();
    contextExpenses.forEach((e) => {
      const key = e.category || e.mainCategory || "uncategorized";
      expenseByCategory.set(key, (expenseByCategory.get(key) || 0) + e.amount);
    });
    const expenseLines = Array.from(expenseByCategory.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const outstandingRows = contextInvoices
      .map((inv) => {
        const pending = inv.total - (inv.amountReceived || 0);
        return { inv, pending };
      })
      .filter(({ pending }) => pending > 0.01)
      .map(({ inv, pending }) => {
        const due = inv.dueDate ? parseISO(inv.dueDate) : null;
        const dueOk = due && isValid(due);
        const overdueDays = dueOk ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
        const isOverdue = dueOk && overdueDays > 0 && inv.status !== "paid";
        return {
          id: inv.id,
          customerName: inv.customerName,
          invoiceNumber: inv.invoiceNumber,
          pending,
          dueLabel: inv.dueDate ? format(parseISO(inv.dueDate), "dd MMM yyyy") : "—",
          isOverdue,
          overdueDays,
        };
      })
      .sort((a, b) => b.pending - a.pending);

    const byCustomer = new Map<string, number>();
    outstandingRows.forEach((r) => {
      byCustomer.set(r.customerName, (byCustomer.get(r.customerName) || 0) + r.pending);
    });
    let largestDebtor: { name: string; amount: number } | null = null;
    byCustomer.forEach((amount, name) => {
      if (!largestDebtor || amount > largestDebtor.amount) largestDebtor = { name, amount };
    });

    return {
      invoiceReceivedTotal,
      paymentsInTotal,
      topReceipts,
      expenseLines,
      outstandingRows,
      largestDebtor,
      overdueCount: outstandingRows.filter((r) => r.isOverdue).length,
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

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  // B1 fix: derive display invoices from context instead of isolated local state.
  // Underscore prefix: the surfaced KPI summary derives its own metrics from raw context arrays,
  // but this mapped list is kept around as the source-of-truth shape for future Finance tables.
  const _invoices: InvoiceData[] = useMemo(() => [
    ...contextInvoices.map(inv => ({
      id: inv.id,
      client: inv.customerName,
      clientAddress: inv.customerAddress,
      clientGstin: inv.customerGstin,
      clientState: inv.customerState,
      clientContact: inv.customerContact,
      project: inv.projectName ?? "",
      amount: `₹${(inv.total ?? 0).toLocaleString("en-IN")}`,
      dueDate: inv.dueDate ?? "",
      invoiceDate: inv.invoiceDate,
      status: inv.status ?? "pending",
      type: "invoice" as const,
      items: inv.items,
      services: inv.services,
      subtotal: inv.subtotal,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst,
      total: inv.total,
      paymentTerms: inv.paymentTerms,
      bankAccount: inv.bankAccount,
      notes: inv.notes,
    })),
    ...contextSaleBills.map(sb => ({
      id: sb.id,
      client: sb.customerName,
      clientAddress: sb.customerAddress,
      clientGstin: sb.customerGstin,
      clientState: sb.customerState,
      clientContact: sb.customerContact,
      project: sb.projectName ?? "",
      amount: `₹${(sb.total ?? 0).toLocaleString("en-IN")}`,
      dueDate: sb.dueDate ?? "",
      invoiceDate: sb.invoiceDate,
      status: sb.status ?? "pending",
      type: "sale-bill" as const,
      items: sb.items,
      services: sb.services,
      subtotal: sb.subtotal,
      cgst: sb.cgst,
      sgst: sb.sgst,
      igst: sb.igst,
      total: sb.total,
      paymentTerms: sb.paymentTerms,
      bankAccount: sb.bankAccount,
      notes: sb.notes,
    })),
  ], [contextInvoices, contextSaleBills]);
  
  // Invoice preview ref
  const invoicePreviewRef = useRef<HTMLDivElement>(null);
  
  // Expense / income form state lives inside the dedicated modal components now; the residual
  // useState declarations here were left over from the pre-modal form and are intentionally not
  // wired up. Kept as underscore-prefixed slots in case the inline forms come back.
  const [_expenseCategory, _setExpenseCategory] = useState("");
  const [_expenseMonth, _setExpenseMonth] = useState("");
  const [_selectedEmployee, _setSelectedEmployee] = useState("");
  const [_selectedVendorForPurchase, _setSelectedVendorForPurchase] = useState("");
  const [_incomeSource, _setIncomeSource] = useState("");
  const [_customIncomeSource, _setCustomIncomeSource] = useState("");
  
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

  useEffect(() => { setInvoiceServices([]); setInvoiceItems([]); }, [invoiceType]);

  // Export modal state
  const [selectedExportMonths, setSelectedExportMonths] = useState<string[]>([]);
  const [selectedExportProject, setSelectedExportProject] = useState("");
  const [_exportVendorInclude, _setExportVendorInclude] = useState(false);
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

  const [isOwnerInvestmentOpen, setIsOwnerInvestmentOpen] = useState(false);
  const [oiAmount, setOiAmount] = useState("");
  const [oiDate, setOiDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [oiType, setOiType] = useState<OwnerInvestment["type"]>("investment");
  const [oiProjectId, setOiProjectId] = useState("_none");
  const [oiNotes, setOiNotes] = useState("");

  // Company state (for IGST calculation)
  const companyState = "08"; // Rajasthan

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Completed": "bg-primary/10 text-primary border-primary/20",
      "Pending": "bg-amber-500/10 text-amber-500 border-amber-500/20",
      "Paid": "bg-primary/10 text-primary border-primary/20",
      "Overdue": "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const resetOwnerInvestmentForm = () => {
    setOiAmount("");
    setOiDate(format(new Date(), "yyyy-MM-dd"));
    setOiType("investment");
    setOiProjectId("_none");
    setOiNotes("");
  };

  const handleSaveOwnerInvestment = () => {
    const amt = Number.parseFloat(oiAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive amount.", variant: "destructive" });
      return;
    }
    const projId = oiProjectId === "_none" ? undefined : oiProjectId;
    const proj = projId ? contextProjects.find((p) => p.id === projId) : undefined;
    addOwnerInvestment({
      id: generateId("OW-"),
      date: oiDate,
      amount: amt,
      type: oiType,
      projectId: projId,
      projectName: proj?.name,
      notes: oiNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
    toast({ title: oiType === "investment" ? "Capital recorded" : "Withdrawal recorded", description: `${formatCurrency(amt)} on ${oiDate}.` });
    resetOwnerInvestmentForm();
    setIsOwnerInvestmentOpen(false);
  };

  const getInvoiceStatus = (invoice: InvoiceData) => invoice.status;

  const _handleInvoiceClick = (invoice: InvoiceData) => {
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

  const _isSiteRelatedCategory = (cat: string) => {
    return ["labour", "transport", "material", "commission"].includes(cat);
  };

  // Calculate invoice totals
  const calculateInvoiceTotals = () => {
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
    const linkedProject = contextProjects.find(p => p.id === invoiceSite);
    const invoiceNum = invoiceType === "invoice"
      ? `INV-${new Date().getFullYear()}-${String(contextInvoices.length + 1).padStart(3, "0")}`
      : `SB-${new Date().getFullYear()}-${String(contextSaleBills.length + 1).padStart(3, "0")}`;

    // B1 fix: create proper Invoice object and persist to context
    const newInvoice = {
      id: generateId(invoiceType === "invoice" ? "INV" : "SB"),
      invoiceNumber: invoiceNum,
      type: invoiceType,
      customerId: linkedProject?.customerId ?? "",
      customerName: buyerName || linkedProject?.client || "",
      customerAddress: buyerAddress,
      customerGstin: buyerGstin,
      customerState: buyerState,
      customerContact: buyerContact,
      projectId: invoiceSite || undefined,
      projectName: linkedProject?.name,
      billingScope: invoiceSite ? "project" as const : "company_overhead" as const,
      items: invoiceItems,
      services: invoiceServices,
      ...totals,
      status: "pending" as const,
      dueDate: dueDate,
      invoiceDate: invoiceDate,
      paymentTerms,
      bankAccount: selectedBankAccount,
      notes: invoiceNotes,
      createdAt: new Date().toISOString().split("T")[0],
    };

    addInvoice({ ...newInvoice, amountReceived: 0 });
    toast({ title: "Invoice saved", description: `${invoiceNum} added to books.` });
    setIsNewInvoiceOpen(false);
    resetInvoiceForm();
  };

  const invoiceTotals = calculateInvoiceTotals();

  const financeSubRow = useMemo(
    () =>
      !financeShellReady ? (
        <div className="flex w-full flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 min-w-[120px] flex-1 rounded-md border border-border/40" />
          ))}
        </div>
      ) : (
        <InlineKpiStrip
          className="w-full flex-wrap justify-start"
          items={[
            {
              label: "Revenue",
              value: formatINRCompact(kpiValues.revenue),
              onClick: () => setIsRevenueDetailOpen(true),
            },
            {
              label: "Expenses",
              value: formatINRCompact(kpiValues.expenses),
              onClick: () => setIsExpenseDetailOpen(true),
            },
            {
              label: "Outstanding",
              value: formatINRCompact(kpiValues.outstanding),
              onClick: () => setIsOutstandingDetailOpen(true),
            },
            {
              label: "Net profit",
              value: formatINRCompact(kpiValues.profit),
              onClick: () => setIsProfitDetailOpen(true),
            },
            {
              label: "Accounts Payable",
              value: formatINRCompact(totalAP),
            },
          ]}
        />
      ),
    [financeShellReady, kpiValues, totalAP],
  );

  return (
    <PageShell className="space-y-3 px-0 md:space-y-4">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Finance" }]}
        subRow={financeSubRow}
      >
        {canRecordExpenseIncome && (
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => setIsAddExpenseOpen(true)}>
            <ArrowDownLeft className="mr-1 h-4 w-4" />
            Expense
          </Button>
        )}
        {canRecordExpenseIncome && (
          <Button variant="outline" size="sm" className="border-primary/30 text-primary" onClick={() => setIsAddIncomeOpen(true)}>
            <ArrowUpRight className="mr-1 h-4 w-4" />
            Income
          </Button>
        )}
        {canRecordExpenseIncome && (
          <Button variant="outline" size="sm" onClick={() => setIsOwnerInvestmentOpen(true)}>
            <Building2 className="mr-1 h-4 w-4" />
            Owner capital
          </Button>
        )}
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
                      <TableCell className={`text-right font-medium ${txn.type === "Credit" ? "text-primary" : "text-red-500"}`}>
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

      <Sheet open={isOwnerInvestmentOpen} onOpenChange={(o) => { if (!o) resetOwnerInvestmentForm(); setIsOwnerInvestmentOpen(o); }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Owner capital movement</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={oiType} onValueChange={(v) => setOiType(v as OwnerInvestment["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investment">Capital investment</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal / draw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input type="number" min={0} step={0.01} value={oiAmount} onChange={(e) => setOiAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={oiDate} onChange={(e) => setOiDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link to project (optional)</Label>
              <Select value={oiProjectId} onValueChange={setOiProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="General / unallocated" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">General (no project)</SelectItem>
                  {contextProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={oiNotes} onChange={(e) => setOiNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { resetOwnerInvestmentForm(); setIsOwnerInvestmentOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveOwnerInvestment}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Enhanced New Invoice Modal */}
      <Sheet open={isNewInvoiceOpen} onOpenChange={setIsNewInvoiceOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
                              <Input type="number" value={service.rate} onChange={(e) => { const n = Number.parseFloat(e.target.value); updateService(idx, "rate", Number.isFinite(n) ? n : 0); }} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={service.gstRate.toString()} onValueChange={(v) => { const n = Number.parseFloat(v); updateService(idx, "gstRate", Number.isFinite(n) ? n : 0); }}>
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
                              <Input type="number" value={item.rate} onChange={(e) => { const n = Number.parseFloat(e.target.value); updateItem(idx, "rate", Number.isFinite(n) ? n : 0); }} />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">GST %</Label>
                              <Select value={item.gstRate.toString()} onValueChange={(v) => { const n = Number.parseFloat(v); updateItem(idx, "gstRate", Number.isFinite(n) ? n : 0); }}>
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
              <Button className="bg-primary text-primary-foreground" onClick={handleCreateInvoice}>
                Create {invoiceType === "invoice" ? "Invoice" : "Sale Bill"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invoice Detail Modal */}
      <Sheet open={isInvoiceDetailOpen} onOpenChange={setIsInvoiceDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Export Reports</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-4">
            {/* Transactions Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <Button size="sm" disabled={selectedExportMonths.length === 0} onClick={() => {
                    const rows = transactions.filter((t) => {
                      if (!t.isoDate) return false;
                      const d = parseISO(t.isoDate);
                      if (!isValid(d)) return false;
                      const abbr = format(d, "MMM");
                      return selectedExportMonths.includes(abbr);
                    });
                    downloadCSV("transactions", rows, ["date", "description", "type", "amount", "category", "status"]);
                  }}>
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
                  <Button size="sm" disabled={!selectedExportProject} onClick={() => {
                    const proj = contextProjects.find(p => p.id === selectedExportProject);
                    if (!proj) return;
                    const rows = [{ name: proj.name, client: proj.client, status: proj.status, contractAmount: proj.contractAmount, startDate: proj.startDate, endDate: proj.endDate }];
                    downloadCSV(`project_${proj.name}`, rows, ["name", "client", "status", "contractAmount", "startDate", "endDate"]);
                  }}>
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
                  <Button size="sm" onClick={() => {
                    const rows = contextVendors.map(v => ({ name: v.name, category: v.category?.join(", ") ?? "", contact: v.contact, email: v.email, outstanding: v.outstandingAmount }));
                    downloadCSV("vendors", rows, ["name", "category", "contact", "email", "outstanding"]);
                  }}>
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
                  <Button size="sm" disabled={selectedExpenseCategories.length === 0} onClick={() => {
                    const rows = contextExpenses
                      .filter(e => selectedExpenseCategories.includes(e.category))
                      .map(e => ({ date: e.date, category: e.category, description: e.description, amount: e.amount, project: e.projectId ?? "" }));
                    downloadCSV("expenses", rows, ["date", "category", "description", "amount", "project"]);
                  }}>
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
                  <Button size="sm" disabled={selectedExportEmployees.length === 0} onClick={() => {
                    const monthMatch = (dateStr: string) => {
                      if (employeeExportType !== "monthly" || selectedExportMonths.length === 0) return true;
                      if (!dateStr?.trim()) return false;
                      const d = parseISO(dateStr.includes("T") ? dateStr : `${dateStr.slice(0, 10)}T12:00:00`);
                      if (!isValid(d)) return false;
                      const m = format(d, "MMM");
                      return selectedExportMonths.includes(m);
                    };
                    const rows = contextExpenses
                      .filter(e => e.employeeId && selectedExportEmployees.includes(Number(e.employeeId)))
                      .filter(e => monthMatch(e.date))
                      .map(e => {
                        const emp = contextEmployees.find(em => em.id === Number(e.employeeId));
                        return { employee: emp?.name ?? e.employeeId, date: e.date, category: e.category, description: e.description, amount: e.amount };
                      });
                    if (rows.length === 0) {
                      toast({ title: "Nothing to export", description: "No rows match the selected employees / months.", variant: "destructive" });
                      return;
                    }
                    downloadCSV("employee_history", rows, ["employee", "date", "category", "description", "amount"]);
                  }}>
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              Total Revenue Details
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue (All Time)</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(kpiValues.revenue)}</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Revenue Breakdown</h4>
              <p className="text-xs text-muted-foreground">
                Total matches KPI: invoice <span className="font-medium">amount received</span> plus all{" "}
                <span className="font-medium">incoming payments</span> (components may overlap if the same receipt was booked twice).
              </p>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Invoices — amount received</span>
                  <span className="font-semibold">{formatCurrency(financeKpiBreakdowns.invoiceReceivedTotal)}</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Payment ledger — credits in</span>
                  <span className="font-semibold">{formatCurrency(financeKpiBreakdowns.paymentsInTotal)}</span>
                </div>
                {financeKpiBreakdowns.topReceipts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No incoming payments in ledger yet.</p>
                ) : (
                  financeKpiBreakdowns.topReceipts.map((row) => (
                    <div key={row.label} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm truncate pr-2" title={row.label}>
                        {row.label}
                      </span>
                      <span className="font-semibold shrink-0">{formatCurrency(row.amount)}</span>
                    </div>
                  ))
                )}
              </div>
              {financeKpiBreakdowns.largestDebtor && (
                <div className="p-3 rounded-lg border border-border/80 bg-card text-sm">
                  <span className="text-muted-foreground">Largest outstanding customer (unpaid invoices): </span>
                  <span className="font-medium">{financeKpiBreakdowns.largestDebtor.name}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-semibold text-amber-600">{formatCurrency(financeKpiBreakdowns.largestDebtor.amount)}</span>
                </div>
              )}
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
              <p className="text-sm text-muted-foreground">Total Expenses (All Time)</p>
              <p className="text-3xl font-bold text-red-500">{formatCurrency(kpiValues.expenses)}</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Expense Breakdown</h4>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {financeKpiBreakdowns.expenseLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No expenses recorded.</p>
                ) : (
                  financeKpiBreakdowns.expenseLines.map((row) => (
                    <div key={row.name} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm capitalize truncate pr-2">{row.name}</span>
                      <span className="font-semibold shrink-0">{formatCurrency(row.amount)}</span>
                    </div>
                  ))
                )}
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
              <p className="text-3xl font-bold text-amber-500">{formatCurrency(kpiValues.outstanding)}</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Outstanding by invoice</h4>
              <div className="space-y-2 max-h-[42vh] overflow-y-auto">
                {financeKpiBreakdowns.outstandingRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No outstanding invoice balances.</p>
                ) : (
                  financeKpiBreakdowns.outstandingRows.map((row) => (
                    <div key={row.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{row.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.invoiceNumber} · Due {row.dueLabel}
                          {row.isOverdue ? (
                            <span className="text-destructive"> · Overdue {row.overdueDays}d</span>
                          ) : null}
                        </p>
                      </div>
                      <span className={`font-semibold shrink-0 ${row.isOverdue ? "text-destructive" : "text-amber-500"}`}>
                        {formatCurrency(row.pending)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            {financeKpiBreakdowns.overdueCount > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-destructive font-medium">
                  {financeKpiBreakdowns.overdueCount} invoice{financeKpiBreakdowns.overdueCount === 1 ? "" : "s"} past due date
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOutstandingDetailOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Net Profit Detail Modal */}
      <Sheet open={isProfitDetailOpen} onOpenChange={setIsProfitDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
              <p className="text-sm text-muted-foreground">Net Profit (All Time)</p>
              <p className={`text-3xl font-bold ${kpiValues.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(kpiValues.profit)}</p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Profit Calculation</h4>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm">Total Revenue</span>
                  <span className="font-semibold text-primary">+ {formatCurrency(kpiValues.revenue)}</span>
                </div>
                <div className="flex justify-between p-3 bg-red-500/10 rounded-lg">
                  <span className="text-sm">Total Expenses</span>
                  <span className="font-semibold text-red-500">- {formatCurrency(kpiValues.expenses)}</span>
                </div>
                <div className="flex justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">Net Profit</span>
                  <span className={`font-bold ${kpiValues.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(kpiValues.profit)}</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Profit by Project (Top 5)</h4>
              <div className="space-y-2">
                {topProfitProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No project data available.</p>
                ) : topProfitProjects.map((p, i) => (
                  <div key={i} className="flex justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">{p.name}</span>
                    <span className={`font-semibold ${p.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {p.profit >= 0 ? "+" : ""}₹{Math.abs(Math.round(p.profit)).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Profit Margin: <span className="font-semibold text-primary">{profitMargin}%</span></p>
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

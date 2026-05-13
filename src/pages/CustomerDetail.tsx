import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Building2, User, FileText, Receipt, IndianRupee, Calendar, Plus, Check, Clock, AlertTriangle, ExternalLink, CreditCard, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, invoices, saleBills, projects, quotations, payments, updateInvoice, updateSaleBill } = useAppData();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("upi");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [ppiPage, setPpiPage] = useState(1);
  const [ppiSize, setPpiSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [paiPage, setPaiPage] = useState(1);
  const [paiSize, setPaiSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [sbPage, setSbPage] = useState(1);
  const [sbSize, setSbSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [phPage, setPhPage] = useState(1);
  const [phSize, setPhSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [cpPage, setCpPage] = useState(1);
  const [cpSize, setCpSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [cqPage, setCqPage] = useState(1);
  const [cqSize, setCqSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const customer = useMemo(() => customers.find(c => c.id === id), [customers, id]);

  // Get all invoices and sale bills for this customer
  const customerInvoices = useMemo(() => 
    invoices.filter(inv => inv.customerId === id || inv.customerName === customer?.name),
    [invoices, id, customer]
  );
  
  const customerSaleBills = useMemo(() => 
    saleBills.filter(sb => sb.customerId === id || sb.customerName === customer?.name),
    [saleBills, id, customer]
  );

  // Get pending and paid invoices
  const pendingInvoices = useMemo(() => 
    customerInvoices.filter(inv => inv.status === "pending" || inv.status === "partial" || inv.status === "overdue")
      .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()),
    [customerInvoices]
  );
  
  const paidInvoices = useMemo(() => 
    customerInvoices.filter(inv => inv.status === "paid"),
    [customerInvoices]
  );

  // Get customer's projects
  const customerProjects = useMemo(() => 
    projects.filter(p => p.client === customer?.name),
    [projects, customer]
  );

  // Get customer's quotations
  const customerQuotations = useMemo(() => 
    quotations.filter(q => q.clientName === customer?.name),
    [quotations, customer]
  );

  const paymentHistoryRows = useMemo(() => {
    const invRows = customerInvoices
      .filter((i) => i.amountReceived > 0)
      .map((inv) => ({
        id: inv.id,
        date: inv.receivedDate || inv.invoiceDate,
        document: inv.invoiceNumber,
        amount: inv.amountReceived,
        mode: inv.receivedIn || "N/A",
        total: inv.total,
        type: "invoice" as const,
      }));
    const sbRows = customerSaleBills
      .filter((sb) => sb.amountReceived > 0)
      .map((sb) => ({
        id: sb.id,
        date: sb.receivedDate || sb.invoiceDate,
        document: sb.invoiceNumber,
        amount: sb.amountReceived,
        mode: sb.receivedIn || "N/A",
        total: sb.total,
        type: "sale-bill" as const,
      }));
    return [...invRows, ...sbRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [customerInvoices, customerSaleBills]);

  const { pagedItems: pagedPendingInv, safePage: safePpi } = usePagedSlice(pendingInvoices, ppiPage, ppiSize);
  const { pagedItems: pagedPaidInv, safePage: safePai } = usePagedSlice(paidInvoices, paiPage, paiSize);
  const { pagedItems: pagedSaleBills, safePage: safeSb } = usePagedSlice(customerSaleBills, sbPage, sbSize);
  const { pagedItems: pagedPayHist, safePage: safePh } = usePagedSlice(paymentHistoryRows, phPage, phSize);
  const { pagedItems: pagedCustProj, safePage: safeCp } = usePagedSlice(customerProjects, cpPage, cpSize);
  const { pagedItems: pagedCustQuot, safePage: safeCq } = usePagedSlice(customerQuotations, cqPage, cqSize);

  // Calculate totals
  const totalPending = useMemo(() => 
    pendingInvoices.reduce((sum, inv) => sum + (inv.total - inv.amountReceived), 0),
    [pendingInvoices]
  );

  const totalReceived = useMemo(() => 
    customerInvoices.reduce((sum, inv) => sum + inv.amountReceived, 0),
    [customerInvoices]
  );

  // FIFO payment breakdown
  const fifoBreakdown = useMemo(() => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || pendingInvoices.length === 0) return [];

    const breakdown: { invoice: typeof pendingInvoices[0]; payAmount: number }[] = [];
    let remaining = amount;

    for (const inv of pendingInvoices) {
      if (remaining <= 0) break;
      const due = inv.total - inv.amountReceived;
      const pay = Math.min(due, remaining);
      breakdown.push({ invoice: inv, payAmount: pay });
      remaining -= pay;
    }

    return breakdown;
  }, [paymentAmount, pendingInvoices]);

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    // Apply FIFO payments
    fifoBreakdown.forEach(({ invoice, payAmount }) => {
      const newAmountReceived = invoice.amountReceived + payAmount;
      const newStatus = newAmountReceived >= invoice.total ? "paid" : "partial";
      
      if (invoice.type === "sale-bill") {
        updateSaleBill(invoice.id, { 
          amountReceived: newAmountReceived, 
          status: newStatus,
          receivedDate: paymentDate,
          receivedIn: paymentMode,
        });
      } else {
        updateInvoice(invoice.id, { 
          amountReceived: newAmountReceived, 
          status: newStatus,
          receivedDate: paymentDate,
          receivedIn: paymentMode,
        });
      }
    });

    toast({
      title: "Payment recorded",
      description: `₹${amount.toLocaleString()} applied to ${fifoBreakdown.length} invoice(s)`,
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  if (!customer) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Customer not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-blue-500/20 text-blue-400 border-0"><Check className="w-3 h-3 mr-1" />Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-0"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case "overdue":
        return <Badge className="bg-red-500/20 text-red-400 border-0"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      default:
        return <Badge className="bg-orange-500/20 text-orange-400 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Customers", to: "/customers" },
          { label: customer.name },
        ]}
        subRow={
          <>
            <div className="flex min-w-0 max-w-full flex-1 flex-col gap-1.5 text-xs sm:max-w-[55%]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {customer.phone}
                </a>
                <a href={`mailto:${customer.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {customer.email}
                </a>
              </div>
              <div className="inline-flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{customer.address}</span>
              </div>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Pending", value: `₹${totalPending.toLocaleString()}` },
                { label: "Received", value: `₹${totalReceived.toLocaleString()}` },
                { label: "Projects", value: customerProjects.length },
                { label: "Quotations", value: customerQuotations.length },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to={`/invoices?customer=${id}&create=invoice`}>
              <Plus className="h-4 w-4 mr-2" /> Create Invoice
            </Link>
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)} disabled={pendingInvoices.length === 0}>
            <IndianRupee className="h-4 w-4 mr-2" /> Record Payment
          </Button>
        </div>
      </StickyPageHeader>

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 bg-primary">
          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
            {customer.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xl font-semibold">{customer.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline" className="capitalize">
              {customer.type === "company" ? <Building2 className="mr-1 w-3 h-3" /> : <User className="mr-1 w-3 h-3" />}
              {customer.type}
            </Badge>
            {customer.gstin && <span>GSTIN: {customer.gstin}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices ({customerInvoices.length})</TabsTrigger>
          <TabsTrigger value="salebills">Sale Bills ({customerSaleBills.length})</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="projects">Projects ({customerProjects.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({customerQuotations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          {pendingInvoices.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" /> Pending Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                  maxHeight={listTableViewportMaxHeight(ppiSize)}
                  scrollResetKey={`${safePpi}-${ppiSize}-${pendingInvoices.length}`}
                  footer={
                    <TablePaginationBar
                      page={safePpi}
                      pageSize={ppiSize}
                      total={pendingInvoices.length}
                      onPageChange={setPpiPage}
                      onPageSizeChange={(n) => {
                        setPpiSize(n);
                        setPpiPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPendingInv.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{inv.projectName || "-"}</TableCell>
                        <TableCell className="text-right">₹{inv.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-400">₹{inv.amountReceived.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-orange-400">₹{(inv.total - inv.amountReceived).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </CardContent>
            </Card>
          )}

          {paidInvoices.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-400" /> Paid Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                  maxHeight={listTableViewportMaxHeight(paiSize)}
                  scrollResetKey={`${safePai}-${paiSize}-${paidInvoices.length}`}
                  footer={
                    <TablePaginationBar
                      page={safePai}
                      pageSize={paiSize}
                      total={paidInvoices.length}
                      onPageChange={setPaiPage}
                      onPageSizeChange={(n) => {
                        setPaiSize(n);
                        setPaiPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Paid On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPaidInv.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{inv.projectName || "-"}</TableCell>
                        <TableCell className="text-right">₹{inv.total.toLocaleString()}</TableCell>
                        <TableCell>{inv.receivedDate ? format(new Date(inv.receivedDate), "dd MMM yyyy") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </CardContent>
            </Card>
          )}

          {customerInvoices.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No invoices found for this customer
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="salebills">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {customerSaleBills.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(sbSize)}
                  scrollResetKey={`${safeSb}-${sbSize}-${customerSaleBills.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeSb}
                      pageSize={sbSize}
                      total={customerSaleBills.length}
                      onPageChange={setSbPage}
                      onPageSizeChange={(n) => {
                        setSbSize(n);
                        setSbPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedSaleBills.map(sb => (
                      <TableRow key={sb.id}>
                        <TableCell className="font-medium">{sb.invoiceNumber}</TableCell>
                        <TableCell>{format(new Date(sb.invoiceDate), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">₹{sb.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{sb.amountReceived.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(sb.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="px-6 py-10 text-center text-muted-foreground">
                  No sale bills found for this customer
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment History
              </CardTitle>
              <CardDescription>
                All payments received from {customer.name} across invoices and sale bills
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Payment Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Billed</p>
                    <p className="text-xl font-bold text-foreground">
                      ₹{(customerInvoices.reduce((s, i) => s + i.total, 0) + customerSaleBills.reduce((s, sb) => s + sb.total, 0)).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Received</p>
                    <p className="text-xl font-bold text-blue-500">₹{totalReceived.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-xl font-bold text-orange-500">₹{totalPending.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Records Table */}
              {paymentHistoryRows.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(phSize)}
                  scrollResetKey={`${safePh}-${phSize}-${paymentHistoryRows.length}`}
                  footer={
                    <TablePaginationBar
                      page={safePh}
                      pageSize={phSize}
                      total={paymentHistoryRows.length}
                      onPageChange={setPhPage}
                      onPageSizeChange={(n) => {
                        setPhSize(n);
                        setPhPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice/Bill</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPayHist.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.date), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {payment.type === "invoice" ? "INV" : "SB"}
                            </Badge>
                            <span className="font-medium">{payment.document}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-500">
                          ₹{payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{payment.mode}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell>
                          {payment.amount >= payment.total ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-0">
                              <Check className="h-3 w-3 mr-1" />
                              Full
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-0">
                              Partial
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payments recorded yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsPaymentModalOpen(true)} disabled={pendingInvoices.length === 0}>
                    <Plus className="h-4 w-4 mr-2" /> Record First Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {customerProjects.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(cpSize)}
                  scrollResetKey={`${safeCp}-${cpSize}-${customerProjects.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeCp}
                      pageSize={cpSize}
                      total={customerProjects.length}
                      onPageChange={setCpPage}
                      onPageSizeChange={(n) => {
                        setCpSize(n);
                        setCpPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Contract Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCustProj.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{p.projectCategory}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={p.status === "Completed" ? "bg-blue-500/20 text-blue-400" : "bg-blue-500/20 text-blue-400"}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{p.contractAmount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/projects/${p.id}`}><ExternalLink className="h-4 w-4" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="px-6 py-10 text-center text-muted-foreground">
                  No projects found for this customer
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations">
          <Card>
            <CardContent className="space-y-0 p-0 pt-4">
              {customerQuotations.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(cqSize)}
                  scrollResetKey={`${safeCq}-${cqSize}-${customerQuotations.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeCq}
                      pageSize={cqSize}
                      total={customerQuotations.length}
                      onPageChange={setCqPage}
                      onPageSizeChange={(n) => {
                        setCqSize(n);
                        setCqPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Quotation #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedCustQuot.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">{q.quotationNumber || `QUO-${q.id}`}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{q.quotationType || "solar"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            q.status === "approved" ? "bg-blue-500/20 text-blue-400" :
                            q.status === "rejected" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }>
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">₹{(q.finalAmount || q.temporaryAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>{q.createdAt ? format(new Date(q.createdAt), "dd MMM yyyy") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="px-6 py-10 text-center text-muted-foreground">
                  No quotations found for this customer
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FIFO Payment Modal */}
      <Sheet open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
            <SheetDescription>
              Payment will be applied to oldest invoices first (FIFO)
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add payment notes..."
                rows={2}
              />
            </div>

            {/* FIFO Breakdown */}
            {fifoBreakdown.length > 0 && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Payment Breakdown (FIFO)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {fifoBreakdown.map(({ invoice, payAmount }) => (
                    <div key={invoice.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                        <span className="text-muted-foreground ml-2">
                          (Due: ₹{(invoice.total - invoice.amountReceived).toLocaleString()})
                        </span>
                      </div>
                      <span className="text-blue-400 font-medium">
                        ₹{payAmount.toLocaleString()}
                        {payAmount >= invoice.total - invoice.amountReceived && (
                          <Check className="inline h-4 w-4 ml-1" />
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                    <span>Total Applied</span>
                    <span>₹{fifoBreakdown.reduce((s, b) => s + b.payAmount, 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {parseFloat(paymentAmount) > totalPending && totalPending > 0 && (
              <p className="text-sm text-yellow-400">
                Amount exceeds total pending (₹{totalPending.toLocaleString()}). Extra amount will not be applied.
              </p>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={fifoBreakdown.length === 0}>
              Record Payment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default CustomerDetail;

import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Package, IndianRupee, Calendar, Plus, Check, Clock, AlertTriangle, Store, Edit, Trash2, FileText, Receipt, Eye, Upload, X, Download } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

import { VendorBill, VendorPayment } from "@/data/inventoryData";

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    vendors, 
    projects, 
    expenses, 
    vendorBills: contextVendorBills,
    vendorPayments: contextVendorPayments,
    inventoryItems: contextInventory,
    updateVendorBill,
    addVendorBill,
    addVendorPayment,
    generateId,
  } = useAppData();
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [pbPage, setPbPage] = useState(1);
  const [pbSize, setPbSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [pdPage, setPdPage] = useState(1);
  const [pdSize, setPdSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [vhPage, setVhPage] = useState(1);
  const [vhSize, setVhSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [billItemsPage, setBillItemsPage] = useState(1);
  const [billItemsSize, setBillItemsSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  // Add Purchase Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseBillNumber, setPurchaseBillNumber] = useState("");
  const [purchaseBillDate, setPurchaseBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [purchaseDueDate, setPurchaseDueDate] = useState("");
  const [purchaseProject, setPurchaseProject] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchasePaidAmount, setPurchasePaidAmount] = useState("");
  const [purchasePaymentMode, setPurchasePaymentMode] = useState("Bank Transfer");
  
  // Purchase Items State
  const [purchaseItems, setPurchaseItems] = useState<{
    description: string;
    quantity: number;
    rate: number;
    isFromInventory: boolean;
    inventoryItemId?: number;
  }[]>([{ description: "", quantity: 1, rate: 0, isFromInventory: false }]);
  
  // Purchase Type: inventory, tools, other
  const [purchaseType, setPurchaseType] = useState<"inventory" | "tools" | "other">("inventory");
  const [addToInventory, setAddToInventory] = useState(false);
  
  // Bill Preview Modal State
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [uploadedDocumentUrl, setUploadedDocumentUrl] = useState<string | null>(null);
  
  // Check URL action params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add-purchase') {
      setIsPurchaseModalOpen(true);
    } else if (action === 'record-payment') {
      setIsPaymentModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setPbPage(1);
    setPdPage(1);
    setVhPage(1);
  }, [id]);

  // Find vendor from context
  const vendor = useMemo(() => {
    const numId = parseInt(id || "0");
    const fromContextNum = vendors.find(v => v.id === numId);
    if (fromContextNum) return { ...fromContextNum, id: String(fromContextNum.id) };
    return null;
  }, [vendors, id]);

  const vendorIdNum = parseInt(id || "0");

  // Get vendor bills from context
  const vendorBills = useMemo(() => {
    return contextVendorBills.filter(b => b.vendorId === vendorIdNum);
  }, [contextVendorBills, vendorIdNum]);

  // Get payment history from context
  const paymentHistory = useMemo(() => {
    return contextVendorPayments.filter(p => p.vendorId === vendorIdNum);
  }, [contextVendorPayments, vendorIdNum]);

  // Get pending bills sorted by date (FIFO)
  const pendingBills = useMemo(() => 
    vendorBills.filter(b => b.status !== "paid").sort((a, b) => new Date(a.billDate).getTime() - new Date(b.billDate).getTime()),
    [vendorBills]
  );

  const paidBills = useMemo(() => vendorBills.filter(b => b.status === "paid"), [vendorBills]);

  const sortedPaymentHistory = useMemo(
    () => [...paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [paymentHistory],
  );

  const { pagedItems: pagedPendingBills, safePage: safePb } = usePagedSlice(pendingBills, pbPage, pbSize);
  const { pagedItems: pagedPaidBills, safePage: safePd } = usePagedSlice(paidBills, pdPage, pdSize);
  const { pagedItems: pagedVendorPayments, safePage: safeVh } = usePagedSlice(
    sortedPaymentHistory,
    vhPage,
    vhSize,
  );

  const billLineItems = selectedBill?.items ?? [];
  const { pagedItems: pagedBillItems, safePage: safeBi } = usePagedSlice(
    billLineItems,
    billItemsPage,
    billItemsSize,
  );

  useEffect(() => {
    setBillItemsPage(1);
  }, [selectedBill?.id]);

  // Calculate totals
  const totalPending = useMemo(() => 
    pendingBills.reduce((sum, b) => sum + (b.total - b.amountPaid), 0),
    [pendingBills]
  );

  const totalPaid = useMemo(() => 
    paymentHistory.reduce((sum, p) => sum + p.amount, 0),
    [paymentHistory]
  );

  const totalPurchases = useMemo(() => 
    vendorBills.reduce((sum, b) => sum + b.total, 0),
    [vendorBills]
  );

  // FIFO payment breakdown
  const fifoBreakdown = useMemo(() => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount <= 0 || pendingBills.length === 0) return [];

    const breakdown: { bill: VendorBill; payAmount: number }[] = [];
    let remaining = amount;

    for (const bill of pendingBills) {
      if (remaining <= 0) break;
      const due = bill.total - bill.amountPaid;
      const pay = Math.min(due, remaining);
      breakdown.push({ bill, payAmount: pay });
      remaining -= pay;
    }

    return breakdown;
  }, [paymentAmount, pendingBills]);

  // Calculate purchase totals
  const purchaseSubtotal = useMemo(() => 
    purchaseItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [purchaseItems]
  );
  
  const purchaseGst = useMemo(() => Math.round(purchaseSubtotal * 0.18), [purchaseSubtotal]);
  const purchaseTotal = useMemo(() => purchaseSubtotal + purchaseGst, [purchaseSubtotal, purchaseGst]);

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    fifoBreakdown.forEach(({ bill, payAmount }) => {
      const newAmountPaid = bill.amountPaid + payAmount;
      const newStatus = newAmountPaid >= bill.total ? "paid" : "partial";
      
      updateVendorBill(bill.id, {
        amountPaid: newAmountPaid,
        status: newStatus,
      });

      addVendorPayment({
        id: generateId('VP'),
        vendorId: vendorIdNum,
        vendorName: vendor?.name || "",
        billId: bill.id,
        billNumber: bill.billNumber,
        date: paymentDate,
        amount: payAmount,
        paymentMode: paymentMode,
        notes: paymentNotes,
      });
    });

    toast({
      title: "Payment recorded",
      description: `₹${amount.toLocaleString()} paid to ${fifoBreakdown.length} bill(s)`,
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount("");
    setPaymentNotes("");
  };

  const handleAddPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { description: "", quantity: 1, rate: 0, isFromInventory: false }]);
  };

  const handleRemovePurchaseItem = (index: number) => {
    if (purchaseItems.length > 1) {
      setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    }
  };

  const handleUpdatePurchaseItem = (index: number, field: string, value: any) => {
    const updated = [...purchaseItems];
    (updated[index] as any)[field] = value;
    setPurchaseItems(updated);
  };

  const handleSelectInventoryItem = (index: number, itemId: string) => {
    const item = contextInventory.find(i => i.id === parseInt(itemId));
    if (item) {
      const updated = [...purchaseItems];
      updated[index] = {
        description: item.name,
        quantity: 1,
        rate: item.buyPrice,
        isFromInventory: true,
        inventoryItemId: item.id,
      };
      setPurchaseItems(updated);
    }
  };

  const handleAddPurchase = () => {
    if (!purchaseBillNumber) {
      toast({ title: "Bill number required", variant: "destructive" });
      return;
    }

    if (purchaseItems.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      toast({ title: "Please fill all item details", variant: "destructive" });
      return;
    }

    const paidAmount = parseFloat(purchasePaidAmount) || 0;
    const status: "pending" | "partial" | "paid" = paidAmount >= purchaseTotal ? "paid" : paidAmount > 0 ? "partial" : "pending";

    // Build items with proper structure matching VendorBill type
    const billItems = purchaseItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
    }));

    const newBill: VendorBill = {
      id: generateId('VB'),
      vendorId: vendorIdNum,
      vendorName: vendor?.name || "",
      billNumber: purchaseBillNumber,
      billDate: purchaseBillDate,
      dueDate: purchaseDueDate || undefined,
      items: billItems,
      subtotal: purchaseSubtotal,
      gst: purchaseGst,
      total: purchaseTotal,
      amountPaid: paidAmount,
      status,
      projectId: purchaseProject || undefined,
      projectName: purchaseProject ? projects.find(p => p.id.toString() === purchaseProject)?.name : undefined,
      notes: purchaseNotes || undefined,
    };

    addVendorBill(newBill);

    // If there's an initial payment, record it
    if (paidAmount > 0) {
      addVendorPayment({
        id: generateId('VP'),
        vendorId: vendorIdNum,
        vendorName: vendor?.name || "",
        billId: newBill.id,
        billNumber: purchaseBillNumber,
        date: purchaseBillDate,
        amount: paidAmount,
        paymentMode: purchasePaymentMode,
        notes: "Initial payment on purchase",
      });
    }

    toast({
      title: "Purchase recorded",
      description: `Bill ${purchaseBillNumber} for ₹${purchaseTotal.toLocaleString()} added`,
    });

    // Reset form
    setIsPurchaseModalOpen(false);
    setPurchaseBillNumber("");
    setPurchaseBillDate(format(new Date(), "yyyy-MM-dd"));
    setPurchaseDueDate("");
    setPurchaseProject("");
    setPurchaseNotes("");
    setPurchasePaidAmount("");
    setPurchaseItems([{ description: "", quantity: 1, rate: 0, isFromInventory: false }]);
  };

  if (!vendor) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Vendor not found
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
      default:
        return <Badge className="bg-orange-500/20 text-orange-400 border-0"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Inventory", to: "/inventory" },
          { label: "Vendors", to: "/vendors" },
          { label: vendor.name },
        ]}
        subRow={
          <>
            <div className="flex min-w-0 max-w-full flex-1 flex-col gap-1.5 text-xs sm:max-w-[55%]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <a href={`tel:${vendor.contact}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {vendor.contact}
                </a>
                {vendor.email && (
                  <a href={`mailto:${vendor.email}`} className="inline-flex max-w-full items-center gap-1.5 truncate hover:text-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {vendor.email}
                  </a>
                )}
              </div>
              {vendor.address && (
                <div className="inline-flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{vendor.address}</span>
                </div>
              )}
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Outstanding", value: `₹${totalPending.toLocaleString()}` },
                { label: "Total paid", value: `₹${totalPaid.toLocaleString()}` },
                { label: "Purchases", value: `₹${totalPurchases.toLocaleString()}` },
                { label: "Bills", value: `${paidBills.length}/${vendorBills.length} paid` },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsPurchaseModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Purchase
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)} disabled={pendingBills.length === 0}>
            <IndianRupee className="h-4 w-4 mr-2" /> Record Payment
          </Button>
        </div>
      </StickyPageHeader>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10">
          <Store className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-xl font-semibold">{vendor.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {(vendor.category || []).map((cat, i) => (
              <Badge key={i} variant="outline">{cat}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bills">
        <TabsList>
          <TabsTrigger value="bills">Purchase Bills ({vendorBills.length})</TabsTrigger>
          <TabsTrigger value="payments">Payment History ({paymentHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          {pendingBills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-400" /> Pending Bills ({pendingBills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                  maxHeight={listTableViewportMaxHeight(pbSize)}
                  scrollResetKey={`${safePb}-${pbSize}-${pendingBills.length}`}
                  footer={
                    <TablePaginationBar
                      page={safePb}
                      pageSize={pbSize}
                      total={pendingBills.length}
                      onPageChange={setPbPage}
                      onPageSizeChange={(n) => {
                        setPbSize(n);
                        setPbPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPendingBills.map(bill => (
                      <TableRow key={bill.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        setSelectedBill(bill);
                        setIsBillPreviewOpen(true);
                        setIsEditMode(false);
                      }}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{format(new Date(bill.billDate), "dd MMM yyyy")}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{bill.items.map(i => i.description).join(", ")}</TableCell>
                        <TableCell>{bill.projectName || "-"}</TableCell>
                        <TableCell className="text-right">₹{bill.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-400">₹{bill.amountPaid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-orange-400">₹{(bill.total - bill.amountPaid).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(bill);
                              setIsBillPreviewOpen(true);
                              setIsEditMode(false);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(bill);
                              setIsBillPreviewOpen(true);
                              setIsEditMode(true);
                            }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </CardContent>
            </Card>
          )}

          {paidBills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-blue-400" /> Paid Bills ({paidBills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                  maxHeight={listTableViewportMaxHeight(pdSize)}
                  scrollResetKey={`${safePd}-${pdSize}-${paidBills.length}`}
                  footer={
                    <TablePaginationBar
                      page={safePd}
                      pageSize={pdSize}
                      total={paidBills.length}
                      onPageChange={setPdPage}
                      onPageSizeChange={(n) => {
                        setPdSize(n);
                        setPdPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPaidBills.map(bill => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{format(new Date(bill.billDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{bill.items.map(i => i.description).join(", ")}</TableCell>
                        <TableCell>{bill.projectName || "-"}</TableCell>
                        <TableCell className="text-right">₹{bill.total.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </CardContent>
            </Card>
          )}

          {vendorBills.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No purchase bills found for this vendor</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsPurchaseModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add First Purchase
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className={paymentHistory.length > 0 ? "p-0 pt-4" : "pt-4"}>
              {paymentHistory.length > 0 ? (
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(vhSize)}
                  scrollResetKey={`${safeVh}-${vhSize}-${sortedPaymentHistory.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeVh}
                      pageSize={vhSize}
                      total={sortedPaymentHistory.length}
                      onPageChange={setVhPage}
                      onPageSizeChange={(n) => {
                        setVhSize(n);
                        setVhPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedVendorPayments.map(payment => {
                      const bill = vendorBills.find(b => b.id === payment.billId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-medium text-blue-400">₹{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{payment.paymentMode}</TableCell>
                          <TableCell>{bill?.billNumber || payment.billNumber || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{payment.notes || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </DataTableShell>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment history found</p>
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
            <SheetTitle>Record Payment to Vendor</SheetTitle>
            <SheetDescription>
              Payment will be applied to oldest bills first (FIFO)
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
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
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
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium">Payment Allocation (FIFO)</p>
                {fifoBreakdown.map(({ bill, payAmount }) => (
                  <div key={bill.id} className="flex justify-between text-sm">
                    <span>{bill.billNumber}</span>
                    <span className="text-blue-400">₹{payAmount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Purchase Modal */}
      <Sheet open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Purchase Bill</SheetTitle>
            <SheetDescription>
              Record a new purchase from {vendor.name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4">
            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bill Number *</Label>
                <Input
                  value={purchaseBillNumber}
                  onChange={(e) => setPurchaseBillNumber(e.target.value)}
                  placeholder="e.g., VB-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Bill Date *</Label>
                <Input
                  type="date"
                  value={purchaseBillDate}
                  onChange={(e) => setPurchaseBillDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={purchaseDueDate}
                  onChange={(e) => setPurchaseDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Link to Project</Label>
                <Select value={purchaseProject || "none"} onValueChange={(v) => setPurchaseProject(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase Type */}
            <div className="space-y-2">
              <Label>Purchase Type</Label>
              <Select value={purchaseType} onValueChange={(v: "inventory" | "tools" | "other") => setPurchaseType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Items (Materials)</SelectItem>
                  <SelectItem value="tools">Tools & Equipment</SelectItem>
                  <SelectItem value="other">Other Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Items</Label>
                <Button variant="outline" size="sm" onClick={handleAddPurchaseItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>

              {purchaseItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  {purchaseType === "inventory" ? (
                    <div className="col-span-5">
                      <Select 
                        value={item.inventoryItemId?.toString() || ""} 
                        onValueChange={(v) => handleSelectInventoryItem(idx, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select from inventory" />
                        </SelectTrigger>
                        <SelectContent>
                          {contextInventory.map(inv => (
                            <SelectItem key={inv.id} value={inv.id.toString()}>
                              {inv.name} (₹{inv.buyPrice})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="col-span-5">
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdatePurchaseItem(idx, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdatePurchaseItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => handleUpdatePurchaseItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                        className="pl-5"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className="text-sm font-medium">₹{(item.quantity * item.rate).toLocaleString()}</span>
                    {purchaseItems.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-2" 
                        onClick={() => handleRemovePurchaseItem(idx)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{purchaseSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>₹{purchaseGst.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">₹{purchaseTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Initial Payment */}
            <div className="border rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Initial Payment (Optional)</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Amount Paid Now</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={purchasePaidAmount}
                      onChange={(e) => setPurchasePaidAmount(e.target.value)}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Payment Mode</Label>
                  <Select value={purchasePaymentMode} onValueChange={setPurchasePaymentMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {purchasePaidAmount && parseFloat(purchasePaidAmount) > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Pending After Payment:</span>
                  <span className={parseFloat(purchasePaidAmount) >= purchaseTotal ? 'text-blue-500' : 'text-amber-500'}>
                    ₹{Math.max(0, purchaseTotal - (parseFloat(purchasePaidAmount) || 0)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="Add any notes about this purchase..."
                rows={2}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddPurchase} 
              disabled={!purchaseBillNumber || purchaseItems.some(i => !i.description)}
            >
              Add Purchase
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bill Preview/Edit Modal */}
      <Sheet open={isBillPreviewOpen} onOpenChange={setIsBillPreviewOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              {isEditMode ? "Edit Bill" : "Bill Details"} - {selectedBill?.billNumber}
            </SheetTitle>
            <SheetDescription>
              {isEditMode ? "Edit bill details below" : `Purchase bill from ${vendor.name}`}
            </SheetDescription>
          </SheetHeader>
          
          {selectedBill && (
            <div className="space-y-4">
              {/* Bill Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Bill Date</p>
                    <p className="font-medium">{format(new Date(selectedBill.billDate), "dd MMM yyyy")}</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedBill.status)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Project Link */}
              {selectedBill.projectName && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Linked to project: <span className="text-foreground font-medium">{selectedBill.projectName}</span>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="text-sm font-medium mb-2">Items</h4>
                <DataTableShell
            variant="inline" maxHeight={listTableViewportMaxHeight(billItemsSize)}
                  scrollResetKey={`${safeBi}-${billItemsSize}-${billLineItems.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeBi}
                      pageSize={billItemsSize}
                      total={billLineItems.length}
                      onPageChange={setBillItemsPage}
                      onPageSizeChange={(n) => {
                        setBillItemsSize(n);
                        setBillItemsPage(1);
                      }}
                    />
                  }
                >
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedBillItems.map((item, idx) => (
                      <TableRow key={`${item.description}-${idx}`}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </div>

              {/* Totals */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{selectedBill.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span>₹{selectedBill.gst.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">₹{selectedBill.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-blue-400">₹{selectedBill.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="text-orange-400">₹{(selectedBill.total - selectedBill.amountPaid).toLocaleString()}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedBill.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedBill.notes}</p>
                </div>
              )}

              {/* Document Upload Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Bill Document</span>
                  </div>
                  {(selectedBill as any).documentUrl ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
                        <Check className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => {
                      toast({ title: "Upload feature", description: "Document upload will be simulated" });
                      // Simulate upload
                      updateVendorBill(selectedBill.id, { documentUrl: "uploaded-doc.pdf" } as any);
                      toast({ title: "Document uploaded", description: "Bill document has been attached" });
                    }}>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Document
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload the original bill/invoice document (PDF, Image)
                </p>
              </div>
            </div>
          )}

          <SheetFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBillPreviewOpen(false)}>Close</Button>
            {!isEditMode && selectedBill && selectedBill.status !== "paid" && (
              <Button onClick={() => {
                setIsBillPreviewOpen(false);
                setPaymentAmount((selectedBill.total - selectedBill.amountPaid).toString());
                setIsPaymentModalOpen(true);
              }}>
                <IndianRupee className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default VendorDetail;
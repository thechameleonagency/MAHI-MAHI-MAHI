import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Package, IndianRupee, Plus, Check, Clock, AlertTriangle, Store, Edit, Trash2, FileText, Receipt, Eye, Upload, Download, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatINR } from "@/lib/formatCurrency";
import { formatUiDate } from "@/lib/formatUiDate";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

import { VendorBill } from "@/data/inventoryData";
import type { VendorBillStatus } from "@/types/inventory";
import { buildVendorBillToPaymentDraft, saveCreateDraft } from "@/lib/createFromContext";
import { findByRouteId, resolveRouteId } from "@/lib/resolveEntityId";
import type { ProcurementNeedLine } from "@/types/operations";
import { useCan } from "@/hooks/useCan";

function billLineSubtotal(bill: VendorBill): number {
  if (typeof bill.subtotal === "number") return bill.subtotal;
  return bill.items.reduce((s, i) => s + (i.amount ?? i.quantity * i.rate), 0);
}

function billLineGst(bill: VendorBill): number {
  if (typeof bill.gst === "number") return bill.gst;
  return Math.max(0, bill.total - billLineSubtotal(bill));
}

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    vendors, 
    projects, 
    expenses: _expenses, 
    vendorBills: contextVendorBills,
    vendorPayments: contextVendorPayments,
    inventoryItems: contextInventory,
    updateVendorBill,
    deleteVendorBill,
    addVendorBill,
    addVendorPayment,
    deleteVendorPayment,
    updateVendor,
    deleteVendor,
    generateId,
    canDo,
    procurementNeedLines,
    updateProcurementNeedLine,
  } = useAppData();

  const canDeleteVendor = useCan("vendor", "delete");
  const canDeleteVendorBill = useCan("vendorBill", "delete");

  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [confirmDeleteVendor, setConfirmDeleteVendor] = useState(false);
  const [deleteBillTarget, setDeleteBillTarget] = useState<VendorBill | null>(null);

  const [isEditVendorOpen, setIsEditVendorOpen] = useState(false);
  const [veName, setVeName] = useState("");
  const [veContact, setVeContact] = useState("");
  const [veEmail, setVeEmail] = useState("");
  const [veAddress, setVeAddress] = useState("");
  const [veGstin, setVeGstin] = useState("");
  const [veLinkedProjectId, setVeLinkedProjectId] = useState("");

  const openEditVendor = () => {
    const v = findByRouteId(vendors, id);
    if (!v) return;
    setVeName(v.name);
    setVeContact(v.contact ?? "");
    setVeEmail(v.email ?? "");
    setVeAddress(v.address ?? "");
    setVeGstin(v.gstin ?? "");
    setVeLinkedProjectId(v.linkedProjectId ?? "");
    setIsEditVendorOpen(true);
  };

  const saveVendorProfile = () => {
    const vendorId = resolveRouteId(id);
    if (!vendorId) return;
    const name = veName.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    updateVendor(vendorId, {
      name,
      contact: veContact.trim(),
      email: veEmail.trim(),
      address: veAddress.trim(),
      gstin: veGstin.trim() || undefined,
      linkedProjectId: veLinkedProjectId.trim() || undefined,
    });
    toast({ title: "Vendor updated", description: "Profile saved." });
    setIsEditVendorOpen(false);
  };

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
  const [purchaseOrderRef, setPurchaseOrderRef] = useState("");

  // Purchase Items State
  const [purchaseItems, setPurchaseItems] = useState<{
    description: string;
    quantity: number;
    rate: number;
    isFromInventory: boolean;
    inventoryItemId?: string;
  }[]>([{ description: "", quantity: 1, rate: 0, isFromInventory: false }]);
  
  // Purchase Type: inventory, tools, other
  const [purchaseType, setPurchaseType] = useState<"inventory" | "tools" | "other">("inventory");
  const [_addToInventory, _setAddToInventory] = useState(false);
  
  // Bill Preview Modal State
  const [isBillPreviewOpen, setIsBillPreviewOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const billDocInputRef = useRef<HTMLInputElement>(null);

  const [editBillNumber, setEditBillNumber] = useState("");
  const [editBillDate, setEditBillDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editBillStatus, setEditBillStatus] = useState<VendorBillStatus>("pending");
  const [editPurchaseOrderRef, setEditPurchaseOrderRef] = useState("");

  // URL action + optional purchase prefill (Need-to-Get → vendor bill)
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action) return;

    if (action === "add-purchase") {
      setIsPurchaseModalOpen(true);
      const invIdRaw = searchParams.get("inventoryItemId");
      const qtyRaw = searchParams.get("qty");
      const projectIdParam = searchParams.get("projectId");
      if (invIdRaw && qtyRaw) {
        const invId = invIdRaw.trim();
        const qty = Number.parseFloat(qtyRaw);
        const inv = contextInventory.find((x) => String(x.id) === invId);
        if (invId && Number.isFinite(qty) && qty > 0) {
          setPurchaseType("inventory");
          setPurchaseItems([
            {
              description: inv?.name ?? `Item ${invId}`,
              quantity: qty,
              rate: inv?.buyPrice ?? 0,
              isFromInventory: true,
              inventoryItemId: invId,
            },
          ]);
        }
      }
      if (projectIdParam?.trim()) {
        setPurchaseProject(projectIdParam.trim());
      }
    } else if (action === "record-payment") {
      setIsPaymentModalOpen(true);
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("action");
        next.delete("inventoryItemId");
        next.delete("qty");
        next.delete("projectId");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, contextInventory]);

  useEffect(() => {
    if (!isPurchaseModalOpen) return;
    const raw = findByRouteId(vendors, id);
    if (!raw?.linkedProjectId) return;
    setPurchaseProject((prev) => (prev?.trim() ? prev : raw.linkedProjectId!));
  }, [isPurchaseModalOpen, id, vendors]);

  useEffect(() => {
    setPbPage(1);
    setPdPage(1);
    setVhPage(1);
  }, [id]);

  useEffect(() => {
    if (!selectedBill || !isEditMode || !isBillPreviewOpen) return;
    setEditBillNumber(selectedBill.billNumber);
    const bd = selectedBill.billDate;
    setEditBillDate(bd.includes("T") ? bd.split("T")[0] : bd.slice(0, 10));
    const dd = selectedBill.dueDate || "";
    setEditDueDate(dd ? (dd.includes("T") ? dd.split("T")[0] : dd.slice(0, 10)) : "");
    setEditNotes(selectedBill.notes ?? "");
    setEditProjectId(selectedBill.projectId ?? "");
    setEditBillStatus((selectedBill.status as VendorBillStatus) || "pending");
    setEditPurchaseOrderRef(selectedBill.purchaseOrderRef ?? "");
  }, [selectedBill, isEditMode, isBillPreviewOpen]);

  const vendor = useMemo(() => findByRouteId(vendors, id), [vendors, id]);

  const vendorIdStr = vendor ? String(vendor.id) : resolveRouteId(id);

  // Get vendor bills from context — compare as strings for safety
  const vendorBills = useMemo(() => {
    return contextVendorBills.filter(b => String(b.vendorId) === String(vendorIdStr));
  }, [contextVendorBills, vendorIdStr]);

  // Get payment history from context
  const paymentHistory = useMemo(() => {
    return contextVendorPayments.filter(p => String(p.vendorId) === String(vendorIdStr));
  }, [contextVendorPayments, vendorIdStr]);

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

  const payablePendingBills = useMemo(
    () => pendingBills.filter((b) => b.status !== "draft"),
    [pendingBills],
  );

  // Calculate totals
  const totalPending = useMemo(
    () => payablePendingBills.reduce((sum, b) => sum + (b.total - b.amountPaid), 0),
    [payablePendingBills],
  );

  const totalPaid = useMemo(() => 
    paymentHistory.reduce((sum, p) => sum + p.amount, 0),
    [paymentHistory]
  );

  const totalPurchases = useMemo(() => 
    vendorBills.reduce((sum, b) => sum + b.total, 0),
    [vendorBills]
  );

  const toAcquireLines = useMemo(
    () =>
      procurementNeedLines.filter(
        (l) => String(l.vendorId) === String(vendorIdStr) && l.status !== "acquired",
      ),
    [procurementNeedLines, vendorIdStr],
  );

  const [acquireTarget, setAcquireTarget] = useState<ProcurementNeedLine | null>(null);
  const [acquireQty, setAcquireQty] = useState("");
  const [acquireRate, setAcquireRate] = useState("");

  const openAcquireSheet = (line: ProcurementNeedLine) => {
    setAcquireTarget(line);
    setAcquireQty(String(line.qtyNeeded));
    setAcquireRate(String(line.lastPurchaseRate ?? 0));
  };

  const confirmMarkAcquired = () => {
    if (!acquireTarget || !vendor) return;
    const qty = Number.parseFloat(acquireQty);
    const rate = Number.parseFloat(acquireRate);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast({ title: "Quantity required", variant: "destructive" });
      return;
    }
    if (!Number.isFinite(rate) || rate < 0) {
      toast({ title: "Rate required", variant: "destructive" });
      return;
    }
    if (!canDo("vendor:record_bill")) {
      toast({
        title: "Cannot record acquisition",
        description: "You need permission to record vendor bills.",
        variant: "destructive",
      });
      return;
    }

    const lineSubtotal = qty * rate;
    const gst = Math.round(lineSubtotal * 0.18);
    const total = lineSubtotal + gst;
    const billNumber = `ACQ-${format(new Date(), "yyyyMMdd")}-${generateId("ACQ").slice(-6)}`;
    const inventoryItemId = acquireTarget.materialId.startsWith("nm:")
      ? undefined
      : acquireTarget.materialId;
    const linkedProject = projects.find((p) => p.id === acquireTarget.projectId);

    const newBill: VendorBill = {
      id: generateId("VB"),
      vendorId: vendorIdStr,
      vendorName: vendor.name,
      billNumber,
      billDate: format(new Date(), "yyyy-MM-dd"),
      items: [
        {
          description: acquireTarget.materialName,
          quantity: qty,
          rate,
          amount: lineSubtotal,
          ...(inventoryItemId ? { inventoryItemId } : {}),
        },
      ],
      subtotal: lineSubtotal,
      gst,
      total,
      amountPaid: 0,
      status: "pending",
      projectId: acquireTarget.projectId || undefined,
      projectName: linkedProject?.name,
      notes: `Procurement line ${acquireTarget.lineKey}`,
    };

    addVendorBill(newBill);
    updateProcurementNeedLine(acquireTarget.lineKey, {
      status: "acquired",
      acquiredAt: new Date().toISOString(),
      acquiredQty: qty,
      acquiredRate: rate,
      vendorBillId: newBill.id,
    });
    toast({
      title: "Acquired & bill recorded",
      description: `${acquireTarget.materialName} — ${billNumber} (${formatINR(total)})`,
    });
    setAcquireTarget(null);
  };

  // FIFO payment breakdown
  const fifoBreakdown = useMemo(() => {
    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || payablePendingBills.length === 0) return [];

    const breakdown: { bill: VendorBill; payAmount: number }[] = [];
    let remaining = amount;

    for (const bill of payablePendingBills) {
      if (remaining <= 0) break;
      const due = bill.total - bill.amountPaid;
      const pay = Math.min(due, remaining);
      breakdown.push({ bill, payAmount: pay });
      remaining -= pay;
    }

    return breakdown;
  }, [paymentAmount, payablePendingBills]);

  // Calculate purchase totals
  const purchaseSubtotal = useMemo(() => 
    purchaseItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
    [purchaseItems]
  );
  
  const purchaseGst = useMemo(() => Math.round(purchaseSubtotal * 0.18), [purchaseSubtotal]);
  const purchaseTotal = useMemo(() => purchaseSubtotal + purchaseGst, [purchaseSubtotal, purchaseGst]);

  const purchasePaidParsed = Number.parseFloat(purchasePaidAmount);
  const hasPurchasePaid =
    purchasePaidAmount.trim() !== "" && Number.isFinite(purchasePaidParsed) && purchasePaidParsed > 0;

  const handleRecordPayment = () => {
    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (amount > totalPending + 0.01) {
      toast({
        title: "Exceeds outstanding",
        description: `Total pending across open bills is ${formatINR(totalPending)}.`,
        variant: "destructive",
      });
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
        vendorId: vendorIdStr,
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
      description: `${formatINR(amount)} paid to ${fifoBreakdown.length} bill(s)`,
    });

    setIsPaymentModalOpen(false);
    setPaymentAmount("");
    setPaymentNotes("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleSaveBillEdits = () => {
    if (!selectedBill) return;
    const num = editBillNumber.trim();
    if (!num) {
      toast({ title: "Bill number required", description: "Enter a bill number.", variant: "destructive" });
      return;
    }
    const proj = editProjectId ? projects.find((p) => p.id === editProjectId) : undefined;
    updateVendorBill(selectedBill.id, {
      billNumber: num,
      billDate: editBillDate,
      dueDate: editDueDate || undefined,
      notes: editNotes || undefined,
      projectId: editProjectId || undefined,
      projectName: proj?.name,
      status: editBillStatus,
      purchaseOrderRef: editPurchaseOrderRef.trim() || undefined,
    });
    const next = vendorBills.find((b) => b.id === selectedBill.id);
    if (next) setSelectedBill(next);
    setIsEditMode(false);
    toast({ title: "Bill updated", description: "Changes have been saved." });
  };

  const onBillDocumentSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBill) return;
    const url = URL.createObjectURL(file);
    updateVendorBill(selectedBill.id, { documentUrl: url, documentFileName: file.name });
    setSelectedBill({ ...selectedBill, documentUrl: url, documentFileName: file.name });
    toast({ title: "Document attached", description: file.name });
    e.target.value = "";
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
    const item = contextInventory.find((i) => String(i.id) === String(itemId));
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

    if (vendorBills.some(b => String(b.vendorId) === String(vendorIdStr) && b.billNumber === purchaseBillNumber)) {
      toast({ title: "Duplicate bill number", description: "A bill with this number already exists for this vendor", variant: "destructive" });
      return;
    }

    if (purchaseItems.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      toast({ title: "Please fill all item details", variant: "destructive" });
      return;
    }

    const paidRaw = Number.parseFloat(purchasePaidAmount);
    const paidAmount = Number.isFinite(paidRaw) && paidRaw > 0 ? paidRaw : 0;
    const status: "pending" | "partial" | "paid" = paidAmount >= purchaseTotal ? "paid" : paidAmount > 0 ? "partial" : "pending";

    // Build items with proper structure matching VendorBill type
    const billItems = purchaseItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
      ...(item.inventoryItemId ? { inventoryItemId: item.inventoryItemId } : {}),
    }));

    const newBill: VendorBill = {
      id: generateId('VB'),
      vendorId: vendorIdStr,
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
      purchaseOrderRef: purchaseOrderRef.trim() || undefined,
    };

    addVendorBill(newBill);

    // If there's an initial payment, record it
    if (paidAmount > 0) {
      addVendorPayment({
        id: generateId('VP'),
        vendorId: vendorIdStr,
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
      description: `Bill ${purchaseBillNumber} for ${formatINR(purchaseTotal)} added`,
    });

    // Reset form
    setIsPurchaseModalOpen(false);
    setPurchaseBillNumber("");
    setPurchaseBillDate(format(new Date(), "yyyy-MM-dd"));
    setPurchaseDueDate("");
    setPurchaseProject("");
    setPurchaseNotes("");
    setPurchasePaidAmount("");
    setPurchaseOrderRef("");
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
    const s = (status || "pending") as VendorBillStatus;
    const labels: Record<VendorBillStatus, string> = {
      draft: "Draft",
      approved: "Approved",
      disputed: "Disputed",
      pending: "Pending",
      partial: "Partial",
      paid: "Paid",
    };
    return (
      <span className="inline-flex items-center gap-1">
        {s === "paid" && <Check className="h-3 w-3 text-muted-foreground" aria-hidden />}
        {(s === "partial" || s === "pending" || s === "draft") && <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />}
        {s === "disputed" && <AlertTriangle className="h-3 w-3 text-accent-foreground" aria-hidden />}
        <StatusBadge status={s} label={labels[s] ?? s} className="text-xs" />
      </span>
    );
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
              <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
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
                {(() => {
                  const lp = vendor.linkedProjectId ? projects.find((p) => p.id === vendor.linkedProjectId) : undefined;
                  if (!lp) return null;
                  return (
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="text-2xs uppercase text-muted-foreground">Project</span>
                      <Link to={`/projects/${lp.id}`} className="font-medium hover:underline">
                        {lp.name}
                      </Link>
                    </span>
                  );
                })()}
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
                { label: "Outstanding", value: formatINR(totalPending) },
                { label: "Total paid", value: formatINR(totalPaid) },
                { label: "Purchases", value: formatINR(totalPurchases) },
                { label: "Bills", value: `${paidBills.length}/${vendorBills.length} paid` },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openEditVendor}>
            <Pencil className="h-4 w-4 mr-2" /> Edit vendor
          </Button>
          <Button variant="outline" onClick={() => setIsPurchaseModalOpen(true)} disabled={!canDo("vendor:record_bill")}>
            <Plus className="h-4 w-4 mr-2" /> Add Purchase
          </Button>
          <Button onClick={() => setIsPaymentModalOpen(true)} disabled={payablePendingBills.length === 0 || !canDo("vendor:record_payment")}>
            <IndianRupee className="h-4 w-4 mr-2" /> Record Payment
          </Button>
          {canDeleteVendor && (
            <Button
              variant="destructive"
              disabled={vendorBills.length > 0 || paymentHistory.length > 0}
              title={
                vendorBills.length > 0 || paymentHistory.length > 0
                  ? "Clear bills and payments before deleting this vendor"
                  : undefined
              }
              onClick={() => setConfirmDeleteVendor(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete vendor
            </Button>
          )}
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
      <Tabs defaultValue={toAcquireLines.length ? "acquire" : "bills"}>
        <TabsList>
          <TabsTrigger value="acquire">To acquire ({toAcquireLines.length})</TabsTrigger>
          <TabsTrigger value="bills">Purchase Bills ({vendorBills.length})</TabsTrigger>
          <TabsTrigger value="payments">Payment History ({paymentHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="acquire" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" /> Items to acquire from {vendor.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {toAcquireLines.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No open procurement lines assigned to this vendor. Assign vendors in Need to Get.
                </p>
              ) : (
                <DataTableShell variant="inline" maxHeight={listTableViewportMaxHeight(8)}>
                  <TableHeader>
                    <TableRow className={dataTableClasses.headRow}>
                      <TableHead>Material</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Need by</TableHead>
                      <TableHead className="text-right">Last rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toAcquireLines.map((line) => {
                      const proj = projects.find((p) => p.id === line.projectId);
                      return (
                        <TableRow key={line.lineKey}>
                          <TableCell className="font-medium">{line.materialName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {proj ? (
                              <Link to={`/projects/${proj.id}`} className="hover:underline">
                                {proj.name}
                              </Link>
                            ) : (
                              line.projectId || "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{line.qtyNeeded}</TableCell>
                          <TableCell>{formatUiDate(line.needByDate)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatINR(line.lastPurchaseRate)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => openAcquireSheet(line)}
                              >
                                Mark acquired
                              </Button>
                              {!line.materialId.startsWith("nm:") ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    const q = encodeURIComponent(String(line.qtyNeeded));
                                    const pid = encodeURIComponent(line.projectId || "");
                                    navigate(
                                      `/vendors/${vendorIdStr}?action=add-purchase&inventoryItemId=${encodeURIComponent(line.materialId)}&qty=${q}&projectId=${pid}`,
                                    );
                                  }}
                                >
                                  <Receipt className="mr-1 h-3 w-3" />
                                  Bill
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </DataTableShell>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          {pendingBills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" /> Pending Bills ({pendingBills.length})
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
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">GST</TableHead>
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
                        <TableCell>{formatUiDate(bill.billDate)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{bill.items.map(i => i.description).join(", ")}</TableCell>
                        <TableCell>{bill.projectName || "-"}</TableCell>
                        <TableCell className="text-right">{formatINR(billLineSubtotal(bill))}</TableCell>
                        <TableCell className="text-right">{formatINR(billLineGst(bill))}</TableCell>
                        <TableCell className="text-right">{formatINR(bill.total)}</TableCell>
                        <TableCell className="text-right text-primary">{formatINR(bill.amountPaid)}</TableCell>
                        <TableCell className="text-right text-warning">{formatINR((bill.total - bill.amountPaid))}</TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Preview bill" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(bill);
                              setIsBillPreviewOpen(true);
                              setIsEditMode(false);
                            }}>
                              <Eye className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit bill" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBill(bill);
                              setIsBillPreviewOpen(true);
                              setIsEditMode(true);
                            }}>
                              <Edit className="h-4 w-4" aria-hidden />
                            </Button>
                            {canDeleteVendorBill && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (bill.amountPaid > 0) {
                                    toast({
                                      variant: "destructive",
                                      title: "Cannot delete bill",
                                      description: "Refund or void linked payments before deleting this bill.",
                                    });
                                    return;
                                  }
                                  setDeleteBillTarget(bill);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
                  <Check className="h-4 w-4 text-primary" /> Paid Bills ({paidBills.length})
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
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedPaidBills.map(bill => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.billNumber}</TableCell>
                        <TableCell>{formatUiDate(bill.billDate)}</TableCell>
                        <TableCell>{bill.items.map(i => i.description).join(", ")}</TableCell>
                        <TableCell>{bill.projectName || "-"}</TableCell>
                        <TableCell className="text-right">{formatINR(billLineSubtotal(bill))}</TableCell>
                        <TableCell className="text-right">{formatINR(billLineGst(bill))}</TableCell>
                        <TableCell className="text-right">{formatINR(bill.total)}</TableCell>
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
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedVendorPayments.map(payment => {
                      const bill = vendorBills.find(b => b.id === payment.billId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{formatUiDate(payment.date)}</TableCell>
                          <TableCell className="font-medium text-primary">{formatINR(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentMode}</TableCell>
                          <TableCell>{bill?.billNumber || payment.billNumber || "-"}</TableCell>
                          <TableCell className="text-muted-foreground">{payment.notes || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletePaymentId(payment.id)}
                              disabled={!canDo("vendor:delete_payment")}
                              aria-label="Delete payment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
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
        <AppSheetContent layout="scroll" size="xl">
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
                <DateInput value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
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
                    <span className="text-primary">{formatINR(payAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={!paymentAmount || !(Number.isFinite(Number.parseFloat(paymentAmount)) && Number.parseFloat(paymentAmount) > 0)}
            >
              Record Payment
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Purchase Modal */}
      <Sheet open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <AppSheetContent layout="scroll" size="xl">
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
                <DateInput value={purchaseBillDate} onChange={(e) => setPurchaseBillDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <DateInput value={purchaseDueDate} onChange={(e) => setPurchaseDueDate(e.target.value)} />
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

            <div className="space-y-2">
              <Label>PO / LPO reference (optional)</Label>
              <Input
                value={purchaseOrderRef}
                onChange={(e) => setPurchaseOrderRef(e.target.value)}
                placeholder="e.g., PO-2026-0142"
              />
              <p className="text-xs text-muted-foreground">
                Prototype: free-text PO / LPO id only. A draft-to-PO workflow waits on a future PO module.
              </p>
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
                        onChange={(e) => {
                          const n = Number.parseFloat(e.target.value);
                          handleUpdatePurchaseItem(idx, "rate", Number.isFinite(n) ? n : 0);
                        }}
                        placeholder="Rate"
                        className="pl-5"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className="text-sm font-medium">{formatINR((item.quantity * item.rate))}</span>
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
                <span>{formatINR(purchaseSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>GST (18%)</span>
                <span>{formatINR(purchaseGst)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{formatINR(purchaseTotal)}</span>
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
              {hasPurchasePaid && (
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Pending After Payment:</span>
                  <span className={purchasePaidParsed >= purchaseTotal ? "text-primary" : "text-warning"}>
                    {formatINR(Math.max(0, purchaseTotal - purchasePaidParsed))}
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
              disabled={!canDo("vendor:record_bill") || !purchaseBillNumber || purchaseItems.some(i => !i.description)}
            >
              Add Purchase
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Bill Preview/Edit Modal */}
      <Sheet open={isBillPreviewOpen} onOpenChange={setIsBillPreviewOpen}>
        <AppSheetContent layout="scroll" size="xl">
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
              {/* Bill Header / edit form */}
              {isEditMode ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Bill number</Label>
                    <Input value={editBillNumber} onChange={(e) => setEditBillNumber(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bill date</Label>
                    <DateInput value={editBillDate} onChange={(e) => setEditBillDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Due date</Label>
                    <DateInput value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editBillStatus} onValueChange={(v) => setEditBillStatus(v as VendorBillStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                        <SelectItem value="pending">Pending payment</SelectItem>
                        <SelectItem value="partial">Partially paid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Linked project</Label>
                    <Select value={editProjectId || "_none"} onValueChange={(v) => setEditProjectId(v === "_none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>PO / LPO reference</Label>
                    <Input
                      value={editPurchaseOrderRef}
                      onChange={(e) => setEditPurchaseOrderRef(e.target.value)}
                      placeholder="Optional"
                    />
                    <p className="text-xs text-muted-foreground">
                      Prototype: free-text PO / LPO id only. A draft-to-PO workflow waits on a future PO module.
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={3}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Bill Date</p>
                        <p className="font-medium">{formatUiDate(selectedBill.billDate)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1">{getStatusBadge(selectedBill.status)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedBill.projectName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Linked to project: <span className="text-foreground font-medium">{selectedBill.projectName}</span>
                    </div>
                  )}
                  {selectedBill.purchaseOrderRef?.trim() ? (
                    <div className="text-sm text-muted-foreground">
                      PO / LPO: <span className="font-medium text-foreground">{selectedBill.purchaseOrderRef}</span>
                    </div>
                  ) : null}
                </>
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
                        <TableCell className="text-right">{formatINR(item.rate)}</TableCell>
                        <TableCell className="text-right">{formatINR(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </div>

              {/* Totals */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatINR((selectedBill.subtotal ?? selectedBill.total))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span>{formatINR((selectedBill.gst ?? 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatINR(selectedBill.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="text-primary">{formatINR(selectedBill.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="text-warning">{formatINR((selectedBill.total - selectedBill.amountPaid))}</span>
                </div>
              </div>

              {/* Notes (read-only view) */}
              {!isEditMode && selectedBill.notes && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedBill.notes}</p>
                </div>
              )}

              {/* Document Upload Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <input
                  ref={billDocInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={onBillDocumentSelected}
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Bill Document</span>
                  </div>
                  {selectedBill.documentUrl ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        <Check className="h-3 w-3 mr-1" />
                        {selectedBill.documentFileName || "Uploaded"}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={selectedBill.documentUrl} download={selectedBill.documentFileName || "bill-document"}>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" type="button" onClick={() => billDocInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" />
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => billDocInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Document
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload the original bill/invoice document (PDF, Image). Files are stored as a local preview URL in this prototype.
                </p>
              </div>
            </div>
          )}

          <SheetFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsBillPreviewOpen(false)}>
              Close
            </Button>
            {isEditMode && selectedBill ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancel edit
                </Button>
                <Button onClick={handleSaveBillEdits}>Save changes</Button>
              </>
            ) : (
              selectedBill &&
              selectedBill.status !== "paid" &&
              selectedBill.status !== "draft" && (
                <Button
                  onClick={() => {
                    if (!selectedBill) return;
                    const draft = buildVendorBillToPaymentDraft(selectedBill, vendor ?? undefined);
                    saveCreateDraft("vendor-payment-create-draft", draft);
                    setIsBillPreviewOpen(false);
                    setPaymentAmount(String(draft.amount));
                    if (draft.mode) setPaymentMode(draft.mode);
                    setIsPaymentModalOpen(true);
                  }}
                  disabled={!canDo("vendor:record_payment")}
                >
                  <IndianRupee className="h-4 w-4 mr-1" />
                  Record Payment
                </Button>
              )
            )}
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <Sheet open={!!acquireTarget} onOpenChange={(o) => !o && setAcquireTarget(null)}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Mark as acquired</SheetTitle>
            <SheetDescription>
              {acquireTarget?.materialName} — enter quantity and rate (last purchase rate pre-filled).
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={acquireQty}
                onChange={(e) => setAcquireQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate (₹ / unit)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={acquireRate}
                onChange={(e) => setAcquireRate(e.target.value)}
              />
              {acquireTarget ? (
                <p className="text-xs text-muted-foreground">
                  Last purchase rate: {formatINR(acquireTarget.lastPurchaseRate)}
                </p>
              ) : null}
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setAcquireTarget(null)}>
              Cancel
            </Button>
            {acquireTarget && !acquireTarget.materialId.startsWith("nm:") ? (
              <Button
                variant="outline"
                onClick={() => {
                  const q = encodeURIComponent(acquireQty || String(acquireTarget.qtyNeeded));
                  const pid = encodeURIComponent(acquireTarget.projectId || "");
                  navigate(
                    `/vendors/${vendorIdStr}?action=add-purchase&inventoryItemId=${encodeURIComponent(acquireTarget.materialId)}&qty=${q}&projectId=${pid}`,
                  );
                  setAcquireTarget(null);
                }}
              >
                <Upload className="mr-1 h-4 w-4" />
                Record bill
              </Button>
            ) : null}
            <Button onClick={confirmMarkAcquired}>Save acquired</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <Sheet open={isEditVendorOpen} onOpenChange={setIsEditVendorOpen}>
        <AppSheetContent layout="form" size="lg">
          <SheetHeader>
            <SheetTitle>Edit vendor</SheetTitle>
            <SheetDescription>Update contact details used on bills and payments.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={veName} onChange={(e) => setVeName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input value={veContact} onChange={(e) => setVeContact(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={veEmail} onChange={(e) => setVeEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={veAddress} onChange={(e) => setVeAddress(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Primary project (optional)</Label>
              <Select value={veLinkedProjectId || "_none"} onValueChange={(v) => setVeLinkedProjectId(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GSTIN (optional)</Label>
              <Input value={veGstin} onChange={(e) => setVeGstin(e.target.value)} maxLength={15} />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditVendorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveVendorProfile}>Save</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <AlertDialog open={confirmDeleteVendor} onOpenChange={setConfirmDeleteVendor}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              {vendorBills.length > 0 || paymentHistory.length > 0
                ? `This vendor has ${vendorBills.length} bill(s) and ${paymentHistory.length} payment(s). Clear them before deleting.`
                : `Permanently remove ${vendor?.name ?? "this vendor"}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={vendorBills.length > 0 || paymentHistory.length > 0 || !vendor}
              onClick={() => {
                if (!vendor || vendorBills.length > 0 || paymentHistory.length > 0) return;
                const result = deleteVendor(vendor.id);
                if (!result.ok) return;
                setConfirmDeleteVendor(false);
                navigate("/vendors");
                toast({ title: "Vendor deleted" });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => { if (!open) setDeletePaymentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment?</AlertDialogTitle>
            <AlertDialogDescription>This will reverse the payment and restore the outstanding balance on the vendor account.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletePaymentId) { deleteVendorPayment(deletePaymentId); setDeletePaymentId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DestructiveConfirmDialog
        open={!!deleteBillTarget}
        onOpenChange={(open) => { if (!open) setDeleteBillTarget(null); }}
        title={`Delete bill ${deleteBillTarget?.billNumber}?`}
        description="This will permanently remove the bill and cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteBillTarget) {
            deleteVendorBill(deleteBillTarget.id);
            toast({ title: "Bill deleted" });
            setDeleteBillTarget(null);
          }
        }}
      />
    </PageShell>
  );
};

export default VendorDetail;

import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Search, Package, AlertTriangle, History, Edit, ArrowRight, Trash2, Check, RotateCcw, AlertCircle, Eye, Truck, User, CheckCircle2, Recycle, Download, Printer } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import type { InventoryItem } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useMasters } from "@/hooks/useMasters";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { ProcurementShortfallService } from "@/application/services/ProcurementShortfallService";
import { NeedToGetDamageChip } from "@/components/need-to-get/NeedToGetDamageChip";
import { NeedToGetSheet } from "@/components/need-to-get/NeedToGetSheet";
import { format } from "date-fns";
import { downloadCSV } from "@/lib/csvExport";
import { MATERIAL_CATEGORY_ORDER, materialCategorySortKey } from "@/lib/formCategories";
import { useCan } from "@/hooks/useCan";
import { formatINR } from "@/lib/formatCurrency";
import { stripQuickCreateParam } from "@/lib/createFromContext";
import { formPrimaryLabel } from "@/lib/formActionLabels";
import { isProcurementHandoffOnly } from "@/lib/procurementHandoff";

function escapeHtmlMat(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const UNIT_OPTIONS = ["pcs", "foot", "meter", "kg"] as const;
const UNIT_LABELS: Record<string, string> = { pcs: "Pcs/Nos", foot: "Foot", meter: "Meter", kg: "Kg" };

const Materials = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateItem = useCan("inventoryItem", "create");
  const canEditItem = useCan("inventoryItem", "edit");
  const canDeleteItem = useCan("inventoryItem", "delete");
  const canIssueReturn = useCan("inventoryMovement", "create");
  const canReverseMovement = useCan("inventoryMovement", "delete");
  const { currentRole } = useAppSession();
  const {
    inventoryItems,
    projects,
    sites,
    employees,
    addTask,
    generateId,
    vendorBills,
    recordWarehouseInventoryMovement,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    reverseInventoryMovement,
    returnItemFromSite,
    getProjectQuotation,
    getSiteChecklistTemplateById,
    vendors,
    materialDamageRecords,
    materialReservations,
    getReservationsForItem,
    getDamageByItem,
    canDo,
  } = useAppData();
  /** See `procurementHandoff.ts` — controls Need-to-Get alerts and hides vendor bill shortcuts. */
  const procurementHandoffOnly = isProcurementHandoffOnly(
    currentRole,
    canDo("vendor:record_bill"),
  );
  const [pageView, setPageView] = useState<"stock" | "damage">(() => {
    const v = searchParams.get("view");
    return v === "damage" ? "damage" : "stock";
  });
  const [damageProjectFilter, setDamageProjectFilter] = useState("all");
  const [damageStageFilter, setDamageStageFilter] = useState("all");
  const _masters = useMasters();
  const needToGetService = useMemo(() => new NeedToGetService(), []);
  const [needToGetOpen, setNeedToGetOpen] = useState(false);
  const [needToGetExpanded, setNeedToGetExpanded] = useState(false);
  const [procurementExpanded, setProcurementExpanded] = useState(false);
  
  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setListReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") ?? "all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">(() =>
    searchParams.get("stock") === "low" ? "low" : "all",
  );

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        const q = searchQuery.trim();
        if (q) next.set("q", q);
        else next.delete("q");
        if (categoryFilter !== "all") next.set("category", categoryFilter);
        else next.delete("category");
        if (stockFilter === "low") next.set("stock", "low");
        else next.delete("stock");
        if (pageView !== "stock") next.set("view", pageView);
        else next.delete("view");
        return next;
      },
      { replace: true },
    );
  }, [searchQuery, categoryFilter, stockFilter, pageView, setSearchParams]);

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isIssueToSiteOpen, setIsIssueToSiteOpen] = useState(false);
  const [isReturnFromSiteOpen, setIsReturnFromSiteOpen] = useState(false);
  const [isItemHistoryOpen, setIsItemHistoryOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Confirmation states
  const [isAddItemConfirmOpen, setIsAddItemConfirmOpen] = useState(false);
  const [isEditItemConfirmOpen, setIsEditItemConfirmOpen] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);
  const [isDeleteItemConfirmOpen, setIsDeleteItemConfirmOpen] = useState(false);
  
  // Selected items
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<InventoryItem | null>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<InventoryItem | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [deactivateItemTarget, setDeactivateItemTarget] = useState<InventoryItem | null>(null);
  const [reverseMovementTarget, setReverseMovementTarget] = useState<{ itemId: string; recordId: string } | null>(null);
  const [reverseMovementReason, setReverseMovementReason] = useState("");
  
  // Issue to site state
  const [selectedItemsToIssue, setSelectedItemsToIssue] = useState<Record<string, number>>({});
  const [selectedSiteForIssue, setSelectedSiteForIssue] = useState("");
  const [issueSearchQuery, setIssueSearchQuery] = useState("");
  
  // Issue expense & task states
  const [addIssueExpense, setAddIssueExpense] = useState(false);
  const [issueExpenseType, setIssueExpenseType] = useState("transport");
  const [issueExpenseAmount, setIssueExpenseAmount] = useState("");
  const [issueExpenseNotes, setIssueExpenseNotes] = useState("");
  const [assignIssueTask, setAssignIssueTask] = useState(false);
  const [issueTaskAssignee, setIssueTaskAssignee] = useState("");
  const [issueTaskDate, setIssueTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [issueTaskNotes, setIssueTaskNotes] = useState("");
  
  // Return from site state
  const [selectedSiteForReturn, setSelectedSiteForReturn] = useState("");
  const [returnAction, setReturnAction] = useState<"return" | "transfer">("return");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnErrors, _setReturnErrors] = useState<Record<string, string>>({});
  
  // Add item form state
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemStock, setNewItemStock] = useState("");
  const [newItemPurchaseUnit, setNewItemPurchaseUnit] = useState("pcs");
  const [newItemIssueUnit, setNewItemIssueUnit] = useState("pcs");
  const [newItemBuyPrice, setNewItemBuyPrice] = useState("");
  const [newItemSalePrice, setNewItemSalePrice] = useState("");
  const [newItemHsn, setNewItemHsn] = useState("");
  const [newItemMinStock, setNewItemMinStock] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [newItemSize, setNewItemSize] = useState("");
  const [newItemPerPieceWeight, setNewItemPerPieceWeight] = useState("");
  const [newItemPerPieceLength, setNewItemPerPieceLength] = useState("");
  const [newItemAllowDecimal, setNewItemAllowDecimal] = useState(false);
  
  // Edit modal controlled unit states
  const [editPurchaseUnit, setEditPurchaseUnit] = useState("pcs");
  const [editIssueUnit, setEditIssueUnit] = useState("pcs");
  const [editPerPieceWeight, setEditPerPieceWeight] = useState("");
  const [editPerPieceLength, setEditPerPieceLength] = useState("");
  
  // Dual-unit purchase state (for add stock flow)
  const [purchaseQtyForEdit, setPurchaseQtyForEdit] = useState("");
  const [editAddStockQty, setEditAddStockQty] = useState("");
  
  // Category collapse state

  // Scrap state
  const SCRAP_ELIGIBLE_NAME_KEYS = ["Raftor", "Leg Pipe", "Perline", "Two Support"]; // structure scrap-eligible
  const [isAddToScrapOpen, setIsAddToScrapOpen] = useState(false);
  const [isViewScrapOpen, setIsViewScrapOpen] = useState(false);
  const [scrapQuantities, setScrapQuantities] = useState<Record<string, string>>({});
  const [scrapStock, setScrapStock] = useState<Record<string, number>>({});
  const [scrapConvertBack, setScrapConvertBack] = useState<Record<string, string>>({});

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(inventoryItems.map(item => item.category))];
    return cats.sort((a, b) => materialCategorySortKey(a, b));
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.size || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesStock =
        stockFilter !== "low" || item.stock <= (item.minStock || 0);
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventoryItems, searchQuery, categoryFilter, stockFilter]);

  const tableSortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const cat = materialCategorySortKey(a.category) - materialCategorySortKey(b.category);
      if (cat !== 0) return cat;
      return a.name.localeCompare(b.name);
    });
  }, [filteredItems]);

  const tableTotalPages = Math.max(1, Math.ceil(tableSortedItems.length / tablePageSize) || 1);
  const safeTablePage = Math.min(tablePage, tableTotalPages);

  useEffect(() => {
    setTablePage(1);
  }, [searchQuery, categoryFilter, stockFilter]);
  const pagedTableItems = tableSortedItems.slice(
    (safeTablePage - 1) * tablePageSize,
    safeTablePage * tablePageSize,
  );

  // Issue modal filtered items
  const filteredIssueItems = useMemo(() => {
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(issueSearchQuery.toLowerCase()) ||
      (item.size || "").toLowerCase().includes(issueSearchQuery.toLowerCase())
    );
  }, [inventoryItems, issueSearchQuery]);

  // Stats
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.stock * item.buyPrice), 0);
  const lowStockItems = inventoryItems.filter(item => item.stock <= item.minStock);
  const totalItems = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
  const needToGetRows = useMemo(
    () =>
      needToGetService.buildRows(
        sites,
        projects,
        inventoryItems,
        vendorBills,
        materialReservations ?? [],
        materialDamageRecords ?? [],
      ),
    [
      needToGetService,
      sites,
      projects,
      inventoryItems,
      vendorBills,
      materialReservations,
      materialDamageRecords,
    ],
  );
  const procurementShortfallService = useMemo(() => new ProcurementShortfallService(), []);
  const procurementShortfalls = useMemo(
    () =>
      procurementShortfallService.buildShortfalls({
        projects,
        inventoryItems,
        getProjectQuotation,
        getSiteChecklistTemplateById,
        materialReservations: materialReservations ?? [],
      }),
    [
      procurementShortfallService,
      projects,
      inventoryItems,
      getProjectQuotation,
      getSiteChecklistTemplateById,
      materialReservations,
    ],
  );

  const vendorsSorted = useMemo(() => [...vendors].sort((a, b) => a.name.localeCompare(b.name)), [vendors]);

  const exportMaterialsCsv = () => {
    if (filteredItems.length === 0) {
      toast({ title: "Nothing to export", description: "Adjust filters or add items.", variant: "destructive" });
      return;
    }
    downloadCSV(
      `materials-${format(new Date(), "yyyy-MM-dd")}.csv`,
      filteredItems.map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category,
        stock: i.stock,
        unit: i.unit,
        buyPrice: i.buyPrice,
        salePrice: i.salePrice,
        minStock: i.minStock,
      })),
      ["id", "name", "category", "stock", "unit", "buyPrice", "salePrice", "minStock"],
    );
    toast({ title: "Exported", description: "CSV matches the current filtered list." });
  };

  const printMaterialsList = () => {
    if (filteredItems.length === 0) {
      toast({ title: "Nothing to print", variant: "destructive" });
      return;
    }
    const w = window.open("", "_blank", "width=960,height=720");
    if (!w) {
      toast({ title: "Pop-up blocked", description: "Allow pop-ups to print.", variant: "destructive" });
      return;
    }
    const rows = filteredItems
      .map(
        (i) =>
          `<tr><td>${escapeHtmlMat(i.name)}</td><td>${escapeHtmlMat(i.category)}</td><td class="num">${i.stock}</td><td>${escapeHtmlMat(i.unit)}</td><td class="num">${i.buyPrice}</td><td class="num">${i.minStock}</td></tr>`,
      )
      .join("");
    w.document.write(
      `<!DOCTYPE html><html><head><title>Materials</title><style>body{font-family:system-ui;padding:16px;font-size:12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px}th{background:#f3f3f3}.num{text-align:right}</style></head><body><h1>Materials register</h1><table><thead><tr><th>Name</th><th>Category</th><th>Stock</th><th>Unit</th><th>Buy (INR)</th><th>Min</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
    );
    w.document.close();
    w.onload = () => {
      w.focus();
      w.print();
    };
  };

  const filteredDamageLog = useMemo(() => {
    return (materialDamageRecords ?? []).filter((d) => {
      if (damageProjectFilter !== "all" && d.projectId !== damageProjectFilter) return false;
      if (damageStageFilter !== "all" && d.stage !== damageStageFilter) return false;
      return true;
    });
  }, [materialDamageRecords, damageProjectFilter, damageStageFilter]);

  const damageItemName = (itemId: string) =>
    inventoryItems.find((i) => i.id === itemId)?.name ?? `Item #${itemId}`;

  // Handlers
  const handleItemSelectForIssue = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      const newSelected = { ...selectedItemsToIssue };
      delete newSelected[itemId];
      setSelectedItemsToIssue(newSelected);
    }
  };

  const handleQuantityChange = (itemId: string, qty: number) => {
    setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: qty }));
  };

  const _handleReturnQuantityChange = (itemId: string, value: string) => {
    setReturnQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const resetAddItemForm = () => {
    setNewItemName(""); setNewItemCategory(""); setNewItemStock("");
    setNewItemPurchaseUnit("pcs"); setNewItemIssueUnit("pcs");
    setNewItemBuyPrice(""); setNewItemSalePrice("");
    setNewItemHsn(""); setNewItemMinStock(""); setNewItemNotes("");
    setNewItemSize(""); setNewItemPerPieceWeight(""); setNewItemPerPieceLength("");
    setNewItemAllowDecimal(false);
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    const next = new URLSearchParams(searchParams);
    stripQuickCreateParam(next);
    setSearchParams(next, { replace: true });
    if (!canCreateItem) return;
    setPageView("stock");
    resetAddItemForm();
    setIsAddItemOpen(true);
  }, [searchParams, setSearchParams, canCreateItem]);

  const handleAddItemSave = () => {
    if (!newItemName || !newItemCategory) {
      toast({ title: "Error", description: "Name and category are required", variant: "destructive" });
      return;
    }
    const maxId = inventoryItems.reduce((m, i) => Math.max(m, i.id), 0);
    addInventoryItem({
      id: maxId + 1,
      name: newItemName.trim(),
      category: newItemCategory,
      stock: parseFloat(newItemStock) || 0,
      unit: newItemIssueUnit,
      stockUnit: newItemPurchaseUnit !== newItemIssueUnit ? newItemPurchaseUnit : undefined,
      buyPrice: parseFloat(newItemBuyPrice) || 0,
      salePrice: parseFloat(newItemSalePrice) || 0,
      value: parseFloat(newItemBuyPrice) || 0,
      hsn: newItemHsn || "",
      minStock: parseFloat(newItemMinStock) || 0,
      notes: newItemNotes || undefined,
      size: newItemSize || undefined,
      perPieceWeight: parseFloat(newItemPerPieceWeight) || undefined,
      perPieceLength: parseFloat(newItemPerPieceLength) || undefined,
      allowDecimalReturn: newItemAllowDecimal,
    });
    toast({ title: "Item Added", description: `${newItemName} has been added to inventory` });
    setIsAddItemOpen(false);
    setIsAddItemConfirmOpen(true);
    resetAddItemForm();
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItemForEdit(item);
    setEditPurchaseUnit(item.stockUnit || item.unit);
    setEditIssueUnit(item.unit);
    setEditPerPieceWeight(item.perPieceWeight?.toString() || "");
    setEditPerPieceLength(item.perPieceLength?.toString() || "");
    setPurchaseQtyForEdit("");
    setEditAddStockQty("");
    setIsEditItemOpen(true);
  };

  const handleEditItemSave = async () => {
    if (!selectedItemForEdit) return;

    const conv = getConversionInfo(editPurchaseUnit, editIssueUnit);
    const purchaseQty = parseFloat(purchaseQtyForEdit) || 0;
    const addQty = parseFloat(editAddStockQty) || 0;
    const weightFactor = parseFloat(editPerPieceWeight) || 0;
    const lengthFactor = parseFloat(editPerPieceLength) || 0;
    const factor = conv.type === "weight" ? weightFactor : lengthFactor;
    let issueUnitQty = 0;
    if (conv.type === "none") {
      issueUnitQty = addQty;
    } else if (conv.type === "auto" && purchaseQty > 0) {
      issueUnitQty = convertUnits(editPurchaseUnit, editIssueUnit, purchaseQty, factor);
    } else if ((conv.type === "weight" || conv.type === "length") && purchaseQty > 0 && factor > 0) {
      issueUnitQty = convertUnits(editPurchaseUnit, editIssueUnit, purchaseQty, factor);
    }

    if (issueUnitQty > 0) {
      const res = await recordWarehouseInventoryMovement({
        itemId: selectedItemForEdit.id,
        movementType: "PurchaseIn",
        quantity: issueUnitQty,
      });
      if (!res.ok) {
        toast({
          title: "Could not add stock",
          description: friendlyCommandErrorMessage(res.error, "Movement failed"),
          variant: "destructive",
        });
        return;
      }
    }

    setIsEditItemOpen(false);
    setIsEditItemConfirmOpen(true);
    if (issueUnitQty > 0) {
      setEditAddStockQty("");
      setPurchaseQtyForEdit("");
    }
  };

  const handleIssueSave = () => {
    if (!selectedSiteForIssue || Object.keys(selectedItemsToIssue).length === 0) {
      toast({ title: "Error", description: "Select a site and at least one item", variant: "destructive" });
      return;
    }
    
    // Handle task assignment
    if (assignIssueTask && issueTaskAssignee) {
      const assignee = employees.find(e => e.id.toString() === issueTaskAssignee);
      const site = sites.find(s => s.id.toString() === selectedSiteForIssue);
      
      addTask({
        id: generateId("TASK"),
        employeeId: issueTaskAssignee,
        projectId: site?.projectId || "",
        siteId: selectedSiteForIssue,
        siteName: site?.name || "Site",
        workType: "Material Transport",
        workTag: "Transport",
        notes: issueTaskNotes || `Transport ${Object.keys(selectedItemsToIssue).length} item(s) to site`,
        createdDate: format(new Date(), "yyyy-MM-dd"),
        workDate: issueTaskDate,
        originalDate: issueTaskDate,
        status: "sent",
        createdBy: "Admin",
        workItems: [{ stageKey: "material-transport", stageName: "Material Transport", subItems: [] }]
      });
      
      toast({ title: "Task Assigned", description: `Transport task assigned to ${assignee?.name || "employee"}` });
    }
    
    // Handle expense
    if (addIssueExpense && parseFloat(issueExpenseAmount) > 0) {
      toast({ title: "Expense Added", description: `${formatINR(parseFloat(issueExpenseAmount))} ${issueExpenseType} expense recorded` });
    }
    
    setIsIssueToSiteOpen(false);
    setIsIssueConfirmOpen(true);
    
    // Reset issue expense/task states
    setAddIssueExpense(false);
    setIssueExpenseType("transport");
    setIssueExpenseAmount("");
    setIssueExpenseNotes("");
    setAssignIssueTask(false);
    setIssueTaskAssignee("");
    setIssueTaskDate(format(new Date(), "yyyy-MM-dd"));
    setIssueTaskNotes("");
  };

  const handleReturnSave = () => {
    if (Object.keys(returnErrors).length > 0) return;
    const siteRecord = sites.find(s => String(s.id) === selectedSiteForReturn);
    const dateStr = format(new Date(), "yyyy-MM-dd");
    Object.entries(returnQuantities).forEach(([itemIdStr, qtyStr]) => {
      const qty = parseFloat(qtyStr) || 0;
      if (qty > 0) {
        returnItemFromSite(itemIdStr, selectedSiteForReturn, siteRecord?.name ?? selectedSiteForReturn, qty, dateStr);
      }
    });
    setIsReturnFromSiteOpen(false);
    setIsReturnConfirmOpen(true);
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    deleteInventoryItem(itemToDelete.id);
    toast({ title: "Item deleted", description: `${itemToDelete.name} has been removed from inventory.` });
    setIsDeleteItemConfirmOpen(false);
    setItemToDelete(null);
  };

  // Compute calculated pieces for dual-unit
  const _calcPieces = (kgStr: string, weightStr: string): number => {
    const kg = parseFloat(kgStr) || 0;
    const weight = parseFloat(weightStr) || 0;
    if (weight <= 0) return 0;
    return Math.floor((kg * 1000) / weight);
  };

  const getDisplayName = (item: InventoryItem) => {
    if (item.size) return `${item.name} (${item.size})`;
    return item.name;
  };

  // Comprehensive conversion field logic for all 16 combos
  const getConversionInfo = (purchaseUnit: string, issueUnit: string): { 
    type: 'none' | 'auto' | 'weight' | 'length'; 
    label: string; 
    hint: string; 
    resultLabel: string;
    autoFactor?: number;
  } => {
    if (purchaseUnit === issueUnit) return { type: 'none', label: '', hint: '', resultLabel: '' };
    // Auto-convert: foot <-> meter
    if (purchaseUnit === 'foot' && issueUnit === 'meter') return { type: 'auto', label: '', hint: '1 foot = 0.3048 meter', resultLabel: `Stock in ${UNIT_LABELS['meter']}`, autoFactor: 0.3048 };
    if (purchaseUnit === 'meter' && issueUnit === 'foot') return { type: 'auto', label: '', hint: '1 meter = 3.28084 foot', resultLabel: `Stock in ${UNIT_LABELS['foot']}`, autoFactor: 3.28084 };
    // Weight-based: anything involving kg (but not same unit)
    if (purchaseUnit === 'kg' && issueUnit === 'pcs') return { type: 'weight', label: 'Weight per piece (grams)', hint: 'How many grams does 1 piece weigh?', resultLabel: 'Pieces' };
    if (purchaseUnit === 'kg' && issueUnit === 'foot') return { type: 'weight', label: 'Weight per foot (grams)', hint: 'How many grams does 1 foot weigh?', resultLabel: 'Feet' };
    if (purchaseUnit === 'kg' && issueUnit === 'meter') return { type: 'weight', label: 'Weight per meter (grams)', hint: 'How many grams does 1 meter weigh?', resultLabel: 'Meters' };
    if (purchaseUnit === 'pcs' && issueUnit === 'kg') return { type: 'weight', label: 'Weight per piece (grams)', hint: 'How many grams does 1 piece weigh?', resultLabel: 'Kg' };
    if (purchaseUnit === 'foot' && issueUnit === 'kg') return { type: 'weight', label: 'Weight per foot (grams)', hint: 'How many grams does 1 foot weigh?', resultLabel: 'Kg' };
    if (purchaseUnit === 'meter' && issueUnit === 'kg') return { type: 'weight', label: 'Weight per meter (grams)', hint: 'How many grams does 1 meter weigh?', resultLabel: 'Kg' };
    // Length-based: pcs <-> foot/meter
    if (purchaseUnit === 'pcs' && issueUnit === 'foot') return { type: 'length', label: 'Length per piece (foot)', hint: 'How many foot is 1 piece?', resultLabel: 'Feet' };
    if (purchaseUnit === 'pcs' && issueUnit === 'meter') return { type: 'length', label: 'Length per piece (meter)', hint: 'How many meters is 1 piece?', resultLabel: 'Meters' };
    if (purchaseUnit === 'foot' && issueUnit === 'pcs') return { type: 'length', label: 'Length per piece (foot)', hint: 'How many foot makes 1 piece?', resultLabel: 'Pieces' };
    if (purchaseUnit === 'meter' && issueUnit === 'pcs') return { type: 'length', label: 'Length per piece (meter)', hint: 'How many meters makes 1 piece?', resultLabel: 'Pieces' };
    return { type: 'none', label: '', hint: '', resultLabel: '' };
  };

  // Universal conversion helper
  const convertUnits = (purchaseUnit: string, issueUnit: string, purchaseQty: number, factor: number): number => {
    if (purchaseUnit === issueUnit) return purchaseQty;
    if (purchaseUnit === 'foot' && issueUnit === 'meter') return +(purchaseQty * 0.3048).toFixed(2);
    if (purchaseUnit === 'meter' && issueUnit === 'foot') return +(purchaseQty * 3.28084).toFixed(2);
    // kg -> other: factor = grams per [issueUnit]
    if (purchaseUnit === 'kg') return factor > 0 ? Math.floor((purchaseQty * 1000) / factor) : 0;
    // other -> kg: factor = grams per [purchaseUnit]
    if (issueUnit === 'kg') return factor > 0 ? +((purchaseQty * factor) / 1000).toFixed(2) : 0;
    // pcs -> length: factor = length per piece
    if (purchaseUnit === 'pcs') return +(purchaseQty * factor).toFixed(2);
    // length -> pcs: factor = length per piece
    if (issueUnit === 'pcs') return factor > 0 ? Math.floor(purchaseQty / factor) : 0;
    return purchaseQty;
  };

  const _getConversionFactor = (purchaseUnit: string, issueUnit: string, weight: string, length: string): number => {
    const conv = getConversionInfo(purchaseUnit, issueUnit);
    if (conv.type === 'weight') return parseFloat(weight) || 0;
    if (conv.type === 'length') return parseFloat(length) || 0;
    return 0;
  };

  const _needsPerPieceWeight = (purchaseUnit: string, issueUnit: string) => {
    return getConversionInfo(purchaseUnit, issueUnit).type !== 'none';
  };

  // Scrap handlers
  const scrapEligibleItems = inventoryItems.filter((item) =>
    SCRAP_ELIGIBLE_NAME_KEYS.some((key) => item.name.includes(key)),
  );

  const handleAddToScrap = () => {
    let added = false;
    for (const item of scrapEligibleItems) {
      const qty = parseFloat(scrapQuantities[item.id] || "0");
      if (qty > 0 && qty <= item.stock) {
        setScrapStock(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + qty }));
        recordWarehouseInventoryMovement({
          movementType: "ScrapWarehouse",
          itemId: item.id,
          quantity: qty,
        });
        added = true;
      }
    }
    if (added) {
      toast({ title: "Added to Scrap", description: "Selected quantities have been moved to scrap." });
      setScrapQuantities({});
      setIsAddToScrapOpen(false);
    } else {
      toast({ title: "Error", description: "Enter valid quantities to scrap.", variant: "destructive" });
    }
  };

  const handleConvertBackToInventory = (itemId: string) => {
    const qty = parseFloat(scrapConvertBack[itemId] || "0");
    const available = scrapStock[itemId] || 0;
    if (qty > 0 && qty <= available) {
      setScrapStock(prev => ({ ...prev, [itemId]: prev[itemId] - qty }));
      const item = inventoryItems.find(i => i.id === itemId);
      recordWarehouseInventoryMovement({
        movementType: "PurchaseIn",
        itemId,
        quantity: qty,
      });
      setScrapConvertBack(prev => ({ ...prev, [itemId]: "" }));
      toast({ title: "Converted Back", description: `${qty} ${item?.unit || "units"} moved back to inventory.` });
    }
  };

  const handleDeleteScrap = (itemId: string) => {
    setScrapStock(prev => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    toast({ title: "Scrap Removed", description: "Scrap quantity permanently removed." });
  };

  // Unit Button Group component
  const UnitButtonGroup = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        {UNIT_OPTIONS.map(u => (
          <Button
            key={u}
            type="button"
            variant={value === u ? "default" : "outline"}
            size="sm"
            className="flex-1 h-9"
            onClick={() => onChange(u)}
          >
            {UNIT_LABELS[u]}
          </Button>
        ))}
      </div>
    </div>
  );

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Inventory", to: "/inventory" },
          { label: "Materials" },
        ]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="relative max-w-full flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search materials"
                  className="h-9 border-border bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 w-[min(100%,200px)] bg-muted/50">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "SKUs", value: inventoryItems.length },
                { label: "Units", value: totalItems.toLocaleString() },
                { label: "Value", value: formatINR(totalValue) },
                { label: "Low", value: lowStockItems.length },
                { label: "Match", value: filteredItems.length },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant={pageView === "stock" ? "default" : "outline"} onClick={() => setPageView("stock")}>
            Stock
          </Button>
          <Button size="sm" variant={pageView === "damage" ? "default" : "outline"} onClick={() => setPageView("damage")}>
            Damage log
          </Button>
          {canIssueReturn && (
            <Button size="sm" variant="outline" onClick={() => setIsIssueToSiteOpen(true)} disabled={pageView === "damage"}>
              <ArrowRight className="mr-1.5 h-4 w-4" />
              Issue
            </Button>
          )}
          {canIssueReturn && (
            <Button size="sm" variant="outline" onClick={() => setIsReturnFromSiteOpen(true)} disabled={pageView === "damage"}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Return
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { setScrapQuantities({}); setIsAddToScrapOpen(true); }}>
            <Recycle className="mr-1.5 h-4 w-4" />
            Scrap
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setScrapConvertBack({}); setIsViewScrapOpen(true); }}>
            <Eye className="mr-1.5 h-4 w-4" />
            Scrap log
          </Button>
          <Button size="sm" onClick={() => setIsAddItemOpen(true)} disabled={!canCreateItem}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </StickyPageHeader>

      {pageView === "damage" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Select value={damageProjectFilter} onValueChange={setDamageProjectFilter}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={damageStageFilter} onValueChange={setDamageStageFilter}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DataTableShell variant="inline">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Cost (INR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDamageLog.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    icon={AlertCircle}
                    title="No damage records match"
                    description="Adjust project or stage filters, or report damage from a site."
                  />
                ) : (
                  filteredDamageLog.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{format(new Date(d.reportedAt), "dd MMM yyyy")}</TableCell>
                      <TableCell>{damageItemName(d.itemId)}</TableCell>
                      <TableCell>
                        {d.projectId ? (
                          <Link to={`/projects/${d.projectId}`} className="text-primary hover:underline">
                            {projects.find((p) => p.id === d.projectId)?.name ?? d.projectId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{d.stage}</TableCell>
                      <TableCell className="text-right">{d.qty}</TableCell>
                      <TableCell className="text-right">
                        {d.costImpact ? formatINR(d.costImpact) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </DataTableShell>
          </CardContent>
        </Card>
      )}

      {pageView === "stock" && (
        <>
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Low Stock Alert</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 8).map(item => (
                <Badge key={item.id} variant="outline" className="bg-background">
                  {getDisplayName(item)} ({item.stock} {item.unit})
                </Badge>
              ))}
              {lowStockItems.length > 8 && (
                <Badge variant="outline">+{lowStockItems.length - 8} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Need-to-Get (site checklist vs warehouse) */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                <p className="font-medium text-sm">Need-to-Get (site checklists)</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground pl-6">
                Live site checklist lines vs warehouse stock — dispatch / procurement handoff.
              </p>
            </div>
            <Badge variant="outline">{needToGetRows.length} open</Badge>
          </div>
          {procurementHandoffOnly && needToGetRows.length > 0 && (
            <Alert>
              <AlertTitle>Hand off to procurement</AlertTitle>
              <AlertDescription>
                Vendor assignment and billing are handled by procurement.{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline underline-offset-2"
                  onClick={() => setNeedToGetOpen(true)}
                >
                  Open Need-to-Get report to export
                </button>
                .
              </AlertDescription>
            </Alert>
          )}
          {needToGetRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shortfalls: site checklist demand is covered by current stock.</p>
          ) : (
            <div className="space-y-2">
              {needToGetRows.slice(0, needToGetExpanded ? 8 : 4).map((row) => (
                <div
                  key={`${row.projectId}-${row.siteId}-${row.materialId}-${row.needByDate}-${row.rowKind ?? "material"}`}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.projectId ? (
                          <Link to={`/projects/${row.projectId}`} className="text-primary hover:underline">
                            {row.projectName}
                          </Link>
                        ) : (
                          row.projectName
                        )}{" "}
                        · {row.siteName}
                      </p>
                      {row.rowKind === "nonMaterial" ? (
                        <Badge variant="outline" className="mt-1 text-2xs font-normal">
                          Checklist (no SKU)
                        </Badge>
                      ) : null}
                      {row.shortfallIncludesDamage ? (
                        <NeedToGetDamageChip damageQty={row.damageQtyAttributed} className="mt-1" />
                      ) : null}
                    </div>
                    <Badge className="bg-destructive/10 text-destructive border-0">
                      {row.rowKind === "nonMaterial" ? "Status" : `Need ${row.qtyShort}`}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>Need-by: {row.needByDate}</span>
                    {row.rowKind === "nonMaterial" ? null : (
                      <span>Last purch. rate: {formatINR(row.lastPurchaseRate)}</span>
                    )}
                  </div>
                  {row.rowKind !== "nonMaterial" &&
                  row.materialId != null &&
                  !String(row.materialId).startsWith("nm:") &&
                  !procurementHandoffOnly &&
                  vendorsSorted.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {vendorsSorted.slice(0, 4).map((v) => (
                        <Button key={v.id} variant="secondary" size="sm" className="h-7 text-2xs" asChild>
                          <Link
                            to={`/vendors/${v.id}?action=add-purchase&inventoryItemId=${row.materialId}&qty=${encodeURIComponent(String(row.qtyShort))}&projectId=${encodeURIComponent(row.projectId)}`}
                          >
                            Bill · {v.name.length > 14 ? `${v.name.slice(0, 14)}…` : v.name}
                          </Link>
                        </Button>
                      ))}
                      {vendorsSorted.length > 4 ? (
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-2xs" onClick={() => setNeedToGetOpen(true)}>
                          +{vendorsSorted.length - 4} more in report
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {needToGetRows.length > 4 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setNeedToGetExpanded((v) => !v)}
              >
                {needToGetExpanded ? "Show less" : `Show ${Math.min(8, needToGetRows.length) - 4} more`}
              </Button>
            )}
            <Button className="ml-auto" type="button" size="sm" onClick={() => setNeedToGetOpen(true)}>
              Open full Need-to-Get report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* BOM / template shortfall (quotation preset vs issued) — distinct from Need-to-Get */}
      <Card className="bg-card border-border border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-medium text-sm">BOM shortfall (quotation / template)</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground pl-6">
                Required from approved quotation or site template minus already issued to the project — not live site checklist rows.
              </p>
            </div>
            <Badge variant="secondary">{procurementShortfalls.length} lines</Badge>
          </div>
          {procurementShortfalls.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No BOM gaps: issued quantities meet template requirements for linked projects.
            </p>
          ) : (
            <div className="space-y-2">
              {procurementShortfalls.slice(0, procurementExpanded ? 8 : 4).map((row) => (
                <div
                  key={`${row.projectId}-${row.itemId}`}
                  className="rounded-lg border border-dashed p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.itemName}</p>
                      <p className="text-xs text-muted-foreground">
                        <Link to={`/projects/${row.projectId}`} className="text-primary hover:underline">
                          {row.projectName}
                        </Link>
                      </p>
                    </div>
                    <Badge variant="outline" className="border-warning/40 text-warning shrink-0">
                      Short {row.shortfallQty}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Required {row.requiredQty}</span>
                    <span>Issued {row.issuedQty}</span>
                    <span>Stock (eff.) {row.availableStock}</span>
                    {row.reservedForOthers > 0 ? (
                      <span>Reserved elsewhere {row.reservedForOthers}</span>
                    ) : null}
                    <span>Need-by {row.needByDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {procurementShortfalls.length > 4 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setProcurementExpanded((v) => !v)}
            >
              {procurementExpanded ? "Show less" : `Show ${Math.min(8, procurementShortfalls.length) - 4} more`}
            </Button>
          )}
        </CardContent>
      </Card>

      <DataTableShell
        maxHeight={listTableViewportMaxHeight(tablePageSize)}
        scrollResetKey={`${safeTablePage}-${tablePageSize}-${tableSortedItems.length}`}
        footer={
          <TablePaginationBar
            page={safeTablePage}
            pageSize={tablePageSize}
            total={tableSortedItems.length}
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
            <TableHead>Material</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Size</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Buy</TableHead>
            <TableHead className="text-right">Sale</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!listReady ? (
            <ListSkeleton variant="table" count={5} columns={9} />
          ) : pagedTableItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="p-0">
                <ListEmptyState
                  icon={Package}
                  title="No materials found"
                  description="Adjust search or category filters, or add a new SKU."
                  actionLabel="Add material"
                  onAction={() => setIsAddItemOpen(true)}
                />
              </TableCell>
            </TableRow>
          ) : (
            pagedTableItems.map((item) => {
              const isLowStock = item.stock <= item.minStock;
              return (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => {
                    setSelectedItemForDetail(item);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{getDisplayName(item)}</TableCell>
                  <TableCell className="text-muted-foreground">{item.category}</TableCell>
                  <TableCell className="text-muted-foreground">{item.size ?? "—"}</TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums ${isLowStock ? "text-destructive" : ""}`}>
                    {item.stock}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(item.buyPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(item.salePrice)}</TableCell>
                  <TableCell>
                    {isLowStock ? (
                      <Badge className="bg-destructive/10 text-destructive border-0">Low</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">OK</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="History"
                        onClick={() => {
                          setSelectedItemForHistory(item);
                          setIsItemHistoryOpen(true);
                        }}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Edit"
                        onClick={() => openEditModal(item)}
                        disabled={!canEditItem}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      {canEditItem && (item.deactivatedAt ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reactivate"
                          onClick={() => updateInventoryItem(item.id, { deactivatedAt: undefined })}
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Deactivate"
                          className="text-muted-foreground"
                          onClick={() => setDeactivateItemTarget(item)}
                        >
                          Deactivate
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </DataTableShell>

        </>
      )}

      {/* Item Detail View Modal */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>{selectedItemForDetail && getDisplayName(selectedItemForDetail)}</SheetTitle>
          </SheetHeader>
          {selectedItemForDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedItemForDetail.category}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Current Stock</p>
                  <p className="font-medium text-lg">{selectedItemForDetail.stock} <span className="text-sm text-muted-foreground">{selectedItemForDetail.unit}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Buy Price</p>
                  <p className="font-medium">{formatINR(selectedItemForDetail.buyPrice)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Sale Price</p>
                  <p className="font-medium">{formatINR(selectedItemForDetail.salePrice)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">HSN Code</p>
                  <p className="font-medium">{selectedItemForDetail.hsn}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Purchase Unit</p>
                  <p className="font-medium">{selectedItemForDetail.stockUnit || selectedItemForDetail.unit}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Issue Unit</p>
                  <p className="font-medium">{selectedItemForDetail.unit}</p>
                </div>
              </div>
              {selectedItemForDetail.perPieceWeight && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Conversion Factor (Weight)</p>
                  <p className="font-medium">{selectedItemForDetail.perPieceWeight}g per {selectedItemForDetail.unit === 'pcs' ? 'piece' : selectedItemForDetail.unit}</p>
                </div>
              )}
              {selectedItemForDetail.perPieceLength && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Conversion Factor (Length)</p>
                  <p className="font-medium">{selectedItemForDetail.perPieceLength} {selectedItemForDetail.stockUnit || selectedItemForDetail.unit} per piece</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Min. Stock Alert</p>
                  <p className="font-medium">{selectedItemForDetail.minStock}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Stock Value</p>
                  <p className="font-medium">{formatINR(selectedItemForDetail.stock * selectedItemForDetail.buyPrice)}</p>
                </div>
              </div>
              {selectedItemForDetail.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedItemForDetail.notes}</p>
                </div>
              )}
              {(() => {
                const itemReservations = getReservationsForItem(selectedItemForDetail.id);
                const itemDamage = getDamageByItem(selectedItemForDetail.id);
                if (itemReservations.length === 0 && itemDamage.length === 0) return null;
                return (
                  <div className="space-y-3 border-t border-border/60 pt-4">
                    {itemReservations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Active reservations</p>
                        {itemReservations.map((res) => {
                          const proj = res.projectId ? projects.find((p) => p.id === res.projectId) : undefined;
                          return (
                            <div
                              key={res.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                            >
                              <span className="tabular-nums font-medium">{res.qty} reserved</span>
                              {res.projectId ? (
                                <Link to={`/projects/${res.projectId}`} className="text-primary hover:underline truncate">
                                  {proj?.name ?? res.projectId}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">Manual / unassigned</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {itemDamage.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Damage history</p>
                        {itemDamage.slice(0, 5).map((dmg) => {
                          const proj = dmg.projectId ? projects.find((p) => p.id === dmg.projectId) : undefined;
                          return (
                            <div
                              key={dmg.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                            >
                              <span>
                                {dmg.qty} · <span className="capitalize">{dmg.stage}</span>
                              </span>
                              {dmg.projectId ? (
                                <Link to={`/projects/${dmg.projectId}`} className="text-primary hover:underline truncate">
                                  {proj?.name ?? dmg.projectId}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2 pt-2">
                {canEditItem && (
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); openEditModal(selectedItemForDetail); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); setSelectedItemForHistory(selectedItemForDetail); setIsItemHistoryOpen(true); }}>
                  <History className="h-4 w-4 mr-2" /> History
                </Button>
                {canDeleteItem && (
                <Button variant="destructive" size="icon" aria-label="Delete material" onClick={() => { setItemToDelete(selectedItemForDetail); setIsDetailOpen(false); setIsDeleteItemConfirmOpen(true); }}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
                )}
              </div>
            </div>
          )}
        </AppSheetContent>
      </Sheet>

      {/* Add Material Modal */}
      <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Add New Material</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g., Thread Rod" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORY_ORDER.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size / Spec</Label>
                <Input value={newItemSize} onChange={(e) => setNewItemSize(e.target.value)} placeholder="e.g., M12x2mtr" />
              </div>
            </div>
            
            {/* Purchase unit FIRST - upfront buttons */}
            <UnitButtonGroup value={newItemPurchaseUnit} onChange={(v) => { setNewItemPurchaseUnit(v); if (newItemIssueUnit === newItemPurchaseUnit) setNewItemIssueUnit(v); }} label="Purchase Unit *" />
            
            {/* Issue unit SECOND - upfront buttons */}
            <UnitButtonGroup value={newItemIssueUnit} onChange={setNewItemIssueUnit} label="Issue Unit (if different from purchase)" />
            
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase rate (INR)</Label>
                <Input type="number" value={newItemBuyPrice} onChange={(e) => setNewItemBuyPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Sale rate (INR)</Label>
                <Input type="number" value={newItemSalePrice} onChange={(e) => setNewItemSalePrice(e.target.value)} placeholder="0" />
              </div>
            </div>
            {/* Purchase quantity section - adapts to unit combo */}
            {(() => {
              const conv = getConversionInfo(newItemPurchaseUnit, newItemIssueUnit);
              const purchaseQty = parseFloat(newItemStock) || 0;
              const weightFactor = parseFloat(newItemPerPieceWeight) || 0;
              const lengthFactor = parseFloat(newItemPerPieceLength) || 0;
              const factor = conv.type === 'weight' ? weightFactor : lengthFactor;
              const convertedQty = conv.type !== 'none' ? convertUnits(newItemPurchaseUnit, newItemIssueUnit, purchaseQty, factor) : purchaseQty;

              return (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                  <Label className="font-semibold text-sm">
                    {conv.type === 'none' ? `Initial Stock (${UNIT_LABELS[newItemPurchaseUnit]})` : `Initial Stock — Purchase in ${UNIT_LABELS[newItemPurchaseUnit]}, Issue in ${UNIT_LABELS[newItemIssueUnit]}`}
                  </Label>
                  
                  <div className={`grid gap-3 ${conv.type === 'none' || conv.type === 'auto' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <div className="space-y-1">
                      <Label className="text-xs">Purchase Qty ({UNIT_LABELS[newItemPurchaseUnit]})</Label>
                      <Input type="number" value={newItemStock} onChange={(e) => setNewItemStock(e.target.value)} placeholder="0" />
                    </div>
                    
                    {conv.type === 'weight' && (
                      <div className="space-y-1">
                        <Label className="text-xs">{conv.label}</Label>
                        <Input type="number" value={newItemPerPieceWeight} onChange={(e) => setNewItemPerPieceWeight(e.target.value)} placeholder="e.g., 850" />
                        <p className="text-2xs text-muted-foreground">{conv.hint}</p>
                      </div>
                    )}
                    
                    {conv.type === 'length' && (
                      <div className="space-y-1">
                        <Label className="text-xs">{conv.label}</Label>
                        <Input type="number" value={newItemPerPieceLength} onChange={(e) => setNewItemPerPieceLength(e.target.value)} placeholder="e.g., 14" />
                        <p className="text-2xs text-muted-foreground">{conv.hint}</p>
                      </div>
                    )}
                  </div>
                  
                  {conv.type === 'auto' && purchaseQty > 0 && (
                    <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded">
                      = {convertedQty} {UNIT_LABELS[newItemIssueUnit]} <span className="text-xs font-normal text-muted-foreground">({conv.hint})</span>
                    </div>
                  )}
                  
                  {(conv.type === 'weight' || conv.type === 'length') && purchaseQty > 0 && factor > 0 && (
                    <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded">
                      = {convertedQty} {conv.resultLabel}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>HSN Code</Label>
                <Input value={newItemHsn} onChange={(e) => setNewItemHsn(e.target.value)} placeholder="8541" />
              </div>
              <div className="space-y-2">
                <Label>Min. Stock</Label>
                <Input type="number" value={newItemMinStock} onChange={(e) => setNewItemMinStock(e.target.value)} placeholder="5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={newItemNotes} onChange={(e) => setNewItemNotes(e.target.value)} placeholder="Additional notes..." />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="allow-decimal-add" checked={newItemAllowDecimal} onCheckedChange={(c) => setNewItemAllowDecimal(!!c)} />
              <Label htmlFor="allow-decimal-add" className="text-sm cursor-pointer">Allow decimal return (partial units)</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItemSave}>{formPrimaryLabel("create", "item")}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Item Confirmation */}
      <Sheet open={isAddItemConfirmOpen} onOpenChange={setIsAddItemConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Item Added Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The item has been added to your inventory.</p>
          <SheetFooter>
            <Button onClick={() => setIsAddItemConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Item Modal */}
      <Sheet open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit: {selectedItemForEdit && getDisplayName(selectedItemForEdit)}</SheetTitle>
          </SheetHeader>
          {selectedItemForEdit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input defaultValue={selectedItemForEdit.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select defaultValue={selectedItemForEdit.category}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORY_ORDER.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Size / Spec</Label>
                  <Input defaultValue={selectedItemForEdit.size || ""} />
                </div>
              </div>
              
              {/* Purchase unit */}
              <UnitButtonGroup value={editPurchaseUnit} onChange={(v) => { setEditPurchaseUnit(v); }} label="Purchase Unit" />
              
              {/* Issue unit */}
              <UnitButtonGroup value={editIssueUnit} onChange={setEditIssueUnit} label="Issue Unit" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase rate (INR)</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.buyPrice} />
                </div>
                <div className="space-y-2">
                  <Label>Sale rate (INR)</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.salePrice} />
                </div>
              </div>
              
              {/* Add Stock Section - adapts to all 16 unit combos */}
              {(() => {
                const conv = getConversionInfo(editPurchaseUnit, editIssueUnit);
                const purchaseQty = parseFloat(purchaseQtyForEdit) || 0;
                const addQty = parseFloat(editAddStockQty) || 0;
                const weightFactor = parseFloat(editPerPieceWeight) || 0;
                const lengthFactor = parseFloat(editPerPieceLength) || 0;
                const factor = conv.type === 'weight' ? weightFactor : lengthFactor;
                const convertedQty = conv.type !== 'none' ? convertUnits(editPurchaseUnit, editIssueUnit, purchaseQty, factor) : 0;

                if (conv.type === 'none') {
                  // Same unit - simple add stock
                  return (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                      <Label className="font-semibold text-sm">Stock ({UNIT_LABELS[editPurchaseUnit]})</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Current Stock</Label>
                          <Input type="number" defaultValue={selectedItemForEdit.stock} readOnly className="bg-muted/50" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Add Stock</Label>
                          <Input type="number" value={editAddStockQty} onChange={(e) => setEditAddStockQty(e.target.value)} placeholder="0" />
                        </div>
                      </div>
                      {addQty > 0 && (
                        <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded">
                          Total Stock: {selectedItemForEdit.stock + addQty} {UNIT_LABELS[editIssueUnit]}
                        </div>
                      )}
                    </div>
                  );
                }

                // Dual-unit: auto, weight, or length
                return (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                    <Label className="font-semibold text-sm">Add Stock — Purchase in {UNIT_LABELS[editPurchaseUnit]}, Issue in {UNIT_LABELS[editIssueUnit]}</Label>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Current Stock ({UNIT_LABELS[editIssueUnit]})</Label>
                      <Input type="number" defaultValue={selectedItemForEdit.stock} readOnly className="bg-muted/50" />
                    </div>
                    
                    <div className={`grid gap-3 ${conv.type === 'auto' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      <div className="space-y-1">
                        <Label className="text-xs">Purchase Qty ({UNIT_LABELS[editPurchaseUnit]})</Label>
                        <Input type="number" value={purchaseQtyForEdit} onChange={(e) => setPurchaseQtyForEdit(e.target.value)} placeholder="0" />
                      </div>
                      
                      {conv.type === 'weight' && (
                        <div className="space-y-1">
                          <Label className="text-xs">{conv.label}</Label>
                          <Input type="number" value={editPerPieceWeight} onChange={(e) => setEditPerPieceWeight(e.target.value)} placeholder="e.g., 850" />
                          <p className="text-2xs text-muted-foreground">{conv.hint}</p>
                        </div>
                      )}
                      
                      {conv.type === 'length' && (
                        <div className="space-y-1">
                          <Label className="text-xs">{conv.label}</Label>
                          <Input type="number" value={editPerPieceLength} onChange={(e) => setEditPerPieceLength(e.target.value)} placeholder="e.g., 14" />
                          <p className="text-2xs text-muted-foreground">{conv.hint}</p>
                        </div>
                      )}
                    </div>
                    
                    {conv.type === 'auto' && purchaseQty > 0 && (
                      <div className="text-sm font-medium text-primary">
                        = {convertedQty} {UNIT_LABELS[editIssueUnit]} <span className="text-xs font-normal text-muted-foreground">({conv.hint})</span>
                      </div>
                    )}
                    
                    {(conv.type === 'weight' || conv.type === 'length') && purchaseQty > 0 && factor > 0 && (
                      <div className="text-sm font-medium text-primary">
                        = {convertedQty} {conv.resultLabel}
                      </div>
                    )}
                    
                    {purchaseQty > 0 && (conv.type === 'auto' || factor > 0) && convertedQty > 0 && (
                      <div className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded">
                        Total Stock: {selectedItemForEdit.stock} + {convertedQty} = {selectedItemForEdit.stock + convertedQty} {UNIT_LABELS[editIssueUnit]}
                      </div>
                    )}
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>HSN Code</Label>
                  <Input defaultValue={selectedItemForEdit.hsn} />
                </div>
                <div className="space-y-2">
                  <Label>Min. Stock Alert</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.minStock} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea defaultValue={selectedItemForEdit.notes} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="allow-decimal-edit" checked={selectedItemForEdit.allowDecimalReturn || false} />
                <Label htmlFor="allow-decimal-edit" className="text-sm cursor-pointer">Allow decimal return (partial units)</Label>
              </div>
              
              {/* Delete Button */}
              <div className="pt-4 border-t mt-4">
                <Button variant="destructive" size="sm" className="w-full"
                  onClick={() => { setItemToDelete(selectedItemForEdit); setIsEditItemOpen(false); setIsDeleteItemConfirmOpen(true); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Item
                </Button>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditItemOpen(false)}>Cancel</Button>
            <Button onClick={handleEditItemSave}>{formPrimaryLabel("edit")}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Item Confirmation */}
      <Sheet open={isEditItemConfirmOpen} onOpenChange={setIsEditItemConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" /> Changes Saved
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Item details have been updated successfully.</p>
          <SheetFooter><Button onClick={() => setIsEditItemConfirmOpen(false)}>Done</Button></SheetFooter>
        </AppSheetContent>
      </Sheet>

      <DestructiveConfirmDialog
        open={isDeleteItemConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteItemConfirmOpen(open);
          if (!open) setItemToDelete(null);
        }}
        title={itemToDelete ? `Delete ${itemToDelete.name}?` : "Delete item?"}
        description={
          itemToDelete ? (
            <>
              Permanently remove SKU <strong>{itemToDelete.id}</strong> ({itemToDelete.name}) from inventory. Movement
              history for this item will no longer appear in lists.
            </>
          ) : (
            "Permanently remove this inventory item."
          )
        }
        typedConfirmation={itemToDelete?.id}
        confirmLabel="Delete item"
        onConfirm={handleDeleteItem}
      />

      {/* Item History Modal */}
      <Sheet open={isItemHistoryOpen} onOpenChange={setIsItemHistoryOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Movement History: {selectedItemForHistory && getDisplayName(selectedItemForHistory)}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {(selectedItemForHistory?.movementHistory ?? []).length === 0 && (
              <ListEmptyState
                density="compact"
                icon={History}
                title="No movements yet"
                description="Issues, returns, and purchases for this SKU will appear here."
              />
            )}
            {(selectedItemForHistory?.movementHistory ?? []).map((record) => {
              const action =
                record.type === "issue"
                  ? "Issued to site"
                  : record.type === "return"
                    ? "Returned to stock"
                    : record.type === "purchase"
                      ? "Purchase / inward"
                      : "Adjustment";
              const isIn = record.type === "return" || record.type === "purchase" || record.type === "adjustment";
              return (
                <div key={record.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{action}</p>
                    <p className="text-xs text-muted-foreground">
                      {record.siteName ?? "—"}
                      {record.employeeName ? ` • ${record.employeeName}` : ""}
                    </p>
                    {record.reversedAt && (
                      <p className="text-xs text-destructive">
                        Reversed {record.reversedAt.slice(0, 10)}{record.reversalReason ? ` — ${record.reversalReason}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${record.reversedAt ? "line-through text-muted-foreground" : isIn ? "text-primary" : "text-warning"}`}>
                      {isIn ? "+" : "-"}
                      {record.qty}
                    </p>
                    <p className="text-xs text-muted-foreground">{record.date}</p>
                  </div>
                  {!record.reversedAt && selectedItemForHistory && canReverseMovement && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReverseMovementTarget({ itemId: selectedItemForHistory.id, recordId: record.id });
                        setReverseMovementReason("");
                      }}
                    >
                      Reverse
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Issue to Site Modal - with expense & task options */}
      <Sheet open={isIssueToSiteOpen} onOpenChange={setIsIssueToSiteOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Issue Items to Site
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site *</Label>
              <Select value={selectedSiteForIssue} onValueChange={setSelectedSiteForIssue}>
                <SelectTrigger><SelectValue placeholder="Choose site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Items</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search inventory items..." 
                  className="pl-9"
                  value={issueSearchQuery}
                  onChange={(e) => setIssueSearchQuery(e.target.value)}
                />
              </div>
              <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                {filteredIssueItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedItemsToIssue[item.id] !== undefined}
                        onCheckedChange={(checked) => handleItemSelectForIssue(item.id, checked as boolean)}
                      />
                      <div>
                        <p className="font-medium text-sm">{getDisplayName(item)}</p>
                        <p className="text-xs text-muted-foreground">
                          Available: {item.stock} {item.unit}
                          {item.stock === 0 && <span className="text-destructive ml-1">(Out of stock)</span>}
                        </p>
                      </div>
                    </div>
                    {selectedItemsToIssue[item.id] !== undefined && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Qty:</Label>
                        <Input 
                          type="number" className="w-20 h-8" 
                          value={selectedItemsToIssue[item.id]}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          max={item.stock} min={1}
                        />
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add Expense Option */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="issue-expense" checked={addIssueExpense} onCheckedChange={(checked) => setAddIssueExpense(!!checked)} />
                <Label htmlFor="issue-expense" className="cursor-pointer">Add related expense (transport, etc.)</Label>
              </div>
              {addIssueExpense && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Expense Type</Label>
                      <Select value={issueExpenseType} onValueChange={setIssueExpenseType}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="loading">Loading/Unloading</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Amount (INR)</Label>
                      <Input type="number" className="h-8" placeholder="0" value={issueExpenseAmount} onChange={(e) => setIssueExpenseAmount(e.target.value)} />
                    </div>
                  </div>
                  <Input placeholder="Expense notes (optional)" value={issueExpenseNotes} onChange={(e) => setIssueExpenseNotes(e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
            
            {/* Assign Transport Task Option */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="issue-task" checked={assignIssueTask} onCheckedChange={(checked) => setAssignIssueTask(!!checked)} />
                <Label htmlFor="issue-task" className="cursor-pointer flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Assign transport task to someone
                </Label>
              </div>
              {assignIssueTask && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Assign To *</Label>
                      <Select value={issueTaskAssignee} onValueChange={setIssueTaskAssignee}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select employee" /></SelectTrigger>
                        <SelectContent>
                          {employees.filter(e => e.status === "Active").map(emp => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Task Date</Label>
                      <Input type="date" className="h-8" value={issueTaskDate} onChange={(e) => setIssueTaskDate(e.target.value)} />
                    </div>
                  </div>
                  <Textarea placeholder="Task notes (optional)" value={issueTaskNotes} onChange={(e) => setIssueTaskNotes(e.target.value)} rows={2} className="text-sm" />
                </div>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToSiteOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueSave} disabled={Object.keys(selectedItemsToIssue).length === 0 || !selectedSiteForIssue}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Issue Items
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Issue Confirmation */}
      <Sheet open={isIssueConfirmOpen} onOpenChange={setIsIssueConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" /> Items Issued Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">
            {Object.keys(selectedItemsToIssue).length} item(s) have been issued to the selected site.
          </p>
          <SheetFooter>
            <Button onClick={() => { setIsIssueConfirmOpen(false); setSelectedItemsToIssue({}); setSelectedSiteForIssue(""); }}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return from Site Modal */}
      <Sheet open={isReturnFromSiteOpen} onOpenChange={setIsReturnFromSiteOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Return Items from Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site</Label>
              <Select value={selectedSiteForReturn} onValueChange={setSelectedSiteForReturn}>
                <SelectTrigger><SelectValue placeholder="Choose site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedSiteForReturn && (
              <>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={returnAction} onValueChange={(v) => setReturnAction(v as "return" | "transfer")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return to Warehouse</SelectItem>
                      <SelectItem value="transfer">Transfer to Another Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ListEmptyState
                  density="compact"
                  icon={Package}
                  title="Select site items to return"
                  description="Choose a site above, then pick materials to send back to stock."
                />
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnFromSiteOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnSave} disabled={!selectedSiteForReturn || Object.keys(returnErrors).length > 0}>
              Confirm Return
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return Confirmation */}
      <Sheet open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" /> Items Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Items have been returned to warehouse.</p>
          <SheetFooter>
            <Button onClick={() => { setIsReturnConfirmOpen(false); setReturnQuantities({}); setSelectedSiteForReturn(""); }}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add to Scrap Modal */}
      <Sheet open={isAddToScrapOpen} onOpenChange={setIsAddToScrapOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-primary" /> Add to Scrap
            </SheetTitle>
            <SheetDescription>Convert pipe items to scrap. Quantity is in purchase unit (foot).</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {scrapEligibleItems.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{getDisplayName(item)}</p>
                  <p className="text-xs text-muted-foreground">Available: {item.stock} {item.stockUnit || item.unit}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24 h-8"
                    placeholder="Qty"
                    value={scrapQuantities[item.id] || ""}
                    onChange={(e) => setScrapQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                    max={item.stock}
                    min={0}
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">ft</span>
                </div>
              </div>
            ))}
            {scrapEligibleItems.length === 0 && (
              <ListEmptyState
                density="compact"
                icon={Recycle}
                title="No scrap-eligible pipe stock"
                description="Only pipe-category items with stock can be converted to scrap."
              />
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddToScrapOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToScrap}>
              <Recycle className="w-4 h-4 mr-2" /> Convert to Scrap
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* View Scrap Modal */}
      <Sheet open={isViewScrapOpen} onOpenChange={setIsViewScrapOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Scrap Inventory
            </SheetTitle>
            <SheetDescription>View and manage scrapped pipe items.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            {scrapEligibleItems.map(item => {
              const scrapQty = scrapStock[item.id] || 0;
              if (scrapQty <= 0) return null;
              return (
                <div key={item.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{getDisplayName(item)}</p>
                      <p className="text-xs text-muted-foreground">Scrap: <span className="font-semibold text-foreground">{scrapQty} ft</span></p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteScrap(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 flex-1"
                      placeholder="Qty to convert back"
                      value={scrapConvertBack[item.id] || ""}
                      onChange={(e) => setScrapConvertBack(prev => ({ ...prev, [item.id]: e.target.value }))}
                      max={scrapQty}
                      min={0}
                    />
                    <Button size="sm" variant="outline" onClick={() => handleConvertBackToInventory(item.id)}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Back to Stock
                    </Button>
                  </div>
                </div>
              );
            })}
            {Object.values(scrapStock).every(v => !v || v <= 0) && (
              <ListEmptyState
                density="compact"
                icon={Recycle}
                title="No scrap items yet"
                description='Use "Add to Scrap" to convert pipe items.'
              />
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsViewScrapOpen(false)}>Close</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <NeedToGetSheet open={needToGetOpen} onOpenChange={setNeedToGetOpen} />

      <DestructiveConfirmDialog
        open={!!deactivateItemTarget}
        onOpenChange={(open) => { if (!open) setDeactivateItemTarget(null); }}
        title={`Deactivate "${deactivateItemTarget?.name}"?`}
        description="It will be hidden from new procurement and sale flows. You can reactivate it later."
        confirmLabel="Deactivate"
        onConfirm={() => {
          if (deactivateItemTarget) {
            updateInventoryItem(deactivateItemTarget.id, { deactivatedAt: new Date().toISOString() });
            setDeactivateItemTarget(null);
          }
        }}
      />

      <Sheet
        open={!!reverseMovementTarget}
        onOpenChange={(open) => { if (!open) { setReverseMovementTarget(null); setReverseMovementReason(""); } }}
      >
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Reverse inventory movement</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Reversing a movement restores the original on-hand quantity and is logged as a super-admin action.
              The original record stays in the audit trail, marked as reversed.
            </p>
            <div className="space-y-2">
              <Label>Reversal reason</Label>
              <Textarea
                value={reverseMovementReason}
                onChange={(e) => setReverseMovementReason(e.target.value)}
                placeholder="e.g. wrong item issued, qty entered as 100 instead of 10"
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setReverseMovementTarget(null); setReverseMovementReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!reverseMovementTarget) return;
                const res = reverseInventoryMovement(
                  reverseMovementTarget.itemId,
                  reverseMovementTarget.recordId,
                  reverseMovementReason.trim() || undefined,
                );
                if (!res.ok) {
                  toast({
                    variant: "destructive",
                    title: "Cannot reverse",
                    description: friendlyCommandErrorMessage(res.error, "Could not reverse movement."),
                  });
                  return;
                }
                setReverseMovementTarget(null);
                setReverseMovementReason("");
              }}
            >
              Reverse movement
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Materials;

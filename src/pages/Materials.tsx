import { useState, useMemo } from "react";
import { Plus, Search, Package, AlertTriangle, History, Edit, ArrowRight, Trash2, Check, RotateCcw, AlertCircle, ChevronDown, ChevronRight, Layers, Eye, Truck, User, Send, CheckCircle2, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import type { InventoryItem } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useMasters } from "@/hooks/useMasters";
import { NeedToGetService } from "@/application/services/NeedToGetService";
import { NeedToGetModal } from "@/components/need-to-get/NeedToGetModal";
import { format } from "date-fns";

const itemMovementHistory = [
  { date: "18 Dec 2024", action: "Issued to Site", site: "Sharma Residency", quantity: 10, by: "Admin" },
  { date: "15 Dec 2024", action: "Returned to Stock", site: "Apex Industries", quantity: 5, by: "Rajesh Kumar" },
  { date: "10 Dec 2024", action: "Issued to Site", site: "Apex Industries", quantity: 15, by: "Admin" },
  { date: "05 Dec 2024", action: "Added to Stock", site: "-", quantity: 50, by: "Admin" },
];

const CATEGORY_ORDER = ["Structure", "Panel/Module", "Wiring", "Earthing", "Meter"];
const UNIT_OPTIONS = ["pcs", "foot", "meter", "kg"] as const;
const UNIT_LABELS: Record<string, string> = { pcs: "Pcs/Nos", foot: "Foot", meter: "Meter", kg: "Kg" };

const Materials = () => {
  const { inventoryItems, projects, sites, employees, addTask, generateId, vendorBills, recordWarehouseInventoryMovement } = useAppData();
  const masters = useMasters();
  const needToGetService = useMemo(() => new NeedToGetService(), []);
  const [needToGetOpen, setNeedToGetOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupByCategory, setGroupByCategory] = useState(true);
  
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
  
  // Issue to site state
  const [selectedItemsToIssue, setSelectedItemsToIssue] = useState<Record<number, number>>({});
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
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [returnErrors, setReturnErrors] = useState<Record<number, string>>({});
  
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
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Scrap state
  const SCRAP_ELIGIBLE_IDS = [7, 6, 10, 15]; // Raftor, Leg Pipe, Perline Channel, Two Support C-Channel
  const [isAddToScrapOpen, setIsAddToScrapOpen] = useState(false);
  const [isViewScrapOpen, setIsViewScrapOpen] = useState(false);
  const [scrapQuantities, setScrapQuantities] = useState<Record<number, string>>({});
  const [scrapStock, setScrapStock] = useState<Record<number, number>>({});
  const [scrapConvertBack, setScrapConvertBack] = useState<Record<number, string>>({});

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(inventoryItems.map(item => item.category))];
    return cats.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.size || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchQuery, categoryFilter]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!groupByCategory) return { "All Items": filteredItems };
    const groups: Record<string, InventoryItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    const sorted: Record<string, InventoryItem[]> = {};
    for (const cat of CATEGORY_ORDER) {
      if (groups[cat]) sorted[cat] = groups[cat];
    }
    for (const cat in groups) {
      if (!sorted[cat]) sorted[cat] = groups[cat];
    }
    return sorted;
  }, [filteredItems, groupByCategory]);

  // Issue modal filtered items
  const filteredIssueItems = useMemo(() => {
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(issueSearchQuery.toLowerCase()) ||
      (item.size || "").toLowerCase().includes(issueSearchQuery.toLowerCase())
    );
  }, [inventoryItems, issueSearchQuery]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  // Stats
  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.stock * item.buyPrice), 0);
  const lowStockItems = inventoryItems.filter(item => item.stock <= item.minStock);
  const totalItems = inventoryItems.reduce((sum, item) => sum + item.stock, 0);
  const needToGetRows = useMemo(
    () => needToGetService.buildRows(sites, projects, inventoryItems, vendorBills),
    [needToGetService, sites, projects, inventoryItems, vendorBills],
  );

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Handlers
  const handleItemSelectForIssue = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: 1 }));
    } else {
      const newSelected = { ...selectedItemsToIssue };
      delete newSelected[itemId];
      setSelectedItemsToIssue(newSelected);
    }
  };

  const handleQuantityChange = (itemId: number, qty: number) => {
    setSelectedItemsToIssue(prev => ({ ...prev, [itemId]: qty }));
  };

  const handleReturnQuantityChange = (itemId: number, value: string) => {
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

  const handleAddItemSave = () => {
    if (!newItemName || !newItemCategory) {
      toast({ title: "Error", description: "Name and category are required", variant: "destructive" });
      return;
    }
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
        toast({ title: "Could not add stock", description: res.error ?? "Movement failed", variant: "destructive" });
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
        employeeId: parseInt(issueTaskAssignee),
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
      toast({ title: "Expense Added", description: `₹${parseFloat(issueExpenseAmount).toLocaleString()} ${issueExpenseType} expense recorded` });
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
    setIsReturnFromSiteOpen(false);
    setIsReturnConfirmOpen(true);
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    toast({ title: "Item Deleted", description: `${itemToDelete.name} has been removed from inventory.` });
    setIsDeleteItemConfirmOpen(false);
    setItemToDelete(null);
  };

  // Compute calculated pieces for dual-unit
  const calcPieces = (kgStr: string, weightStr: string): number => {
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

  const getConversionFactor = (purchaseUnit: string, issueUnit: string, weight: string, length: string): number => {
    const conv = getConversionInfo(purchaseUnit, issueUnit);
    if (conv.type === 'weight') return parseFloat(weight) || 0;
    if (conv.type === 'length') return parseFloat(length) || 0;
    return 0;
  };

  const needsPerPieceWeight = (purchaseUnit: string, issueUnit: string) => {
    return getConversionInfo(purchaseUnit, issueUnit).type !== 'none';
  };

  // Scrap handlers
  const scrapEligibleItems = inventoryItems.filter(item => SCRAP_ELIGIBLE_IDS.includes(item.id));

  const handleAddToScrap = () => {
    let added = false;
    for (const item of scrapEligibleItems) {
      const qty = parseFloat(scrapQuantities[item.id] || "0");
      if (qty > 0 && qty <= item.stock) {
        setScrapStock(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + qty }));
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

  const handleConvertBackToInventory = (itemId: number) => {
    const qty = parseFloat(scrapConvertBack[itemId] || "0");
    const available = scrapStock[itemId] || 0;
    if (qty > 0 && qty <= available) {
      setScrapStock(prev => ({ ...prev, [itemId]: prev[itemId] - qty }));
      setScrapConvertBack(prev => ({ ...prev, [itemId]: "" }));
      toast({ title: "Converted Back", description: `${qty} foot moved back to inventory.` });
    }
  };

  const handleDeleteScrap = (itemId: number) => {
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

  // Item card component - clickable, clean, no unnecessary badges
  const ItemCard = ({ item }: { item: InventoryItem }) => {
    const isLowStock = item.stock <= item.minStock;
    return (
      <Card 
        className={`transition-all hover:border-primary/30 cursor-pointer group ${isLowStock ? "border-destructive/30 bg-destructive/5" : ""}`}
        onClick={() => { setSelectedItemForDetail(item); setIsDetailOpen(true); }}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{item.name}</h3>
              {item.size && (
                <span className="text-xs text-muted-foreground">{item.size}</span>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-lg font-bold ${isLowStock ? "text-destructive" : "text-foreground"}`}>
                  {item.stock}
                </span>
                <span className="text-xs text-muted-foreground">{item.unit}</span>
              </div>
              {isLowStock && (
                <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">Low</Badge>
              )}
            </div>
          </div>
          
          {/* Prices */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t text-xs">
            <div className="flex gap-3">
              <span className="text-muted-foreground">Buy: <span className="text-foreground font-medium">{formatCurrency(item.buyPrice)}</span></span>
              <span className="text-muted-foreground">Sale: <span className="text-foreground font-medium">{formatCurrency(item.salePrice)}</span></span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button 
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); setSelectedItemForHistory(item); setIsItemHistoryOpen(true); }}
              >
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
                <Button
                  variant={groupByCategory ? "default" : "outline"}
                  size="sm"
                  className="h-9"
                  onClick={() => setGroupByCategory(!groupByCategory)}
                >
                  <Layers className="mr-1 h-4 w-4" />
                  Group
                </Button>
              </div>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "SKUs", value: inventoryItems.length },
                { label: "Units", value: totalItems.toLocaleString() },
                { label: "Value", value: formatCurrency(totalValue) },
                { label: "Low", value: lowStockItems.length },
                { label: "Match", value: filteredItems.length },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setIsIssueToSiteOpen(true)}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Issue
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsReturnFromSiteOpen(true)}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Return
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setScrapQuantities({}); setIsAddToScrapOpen(true); }}>
            <Recycle className="mr-1.5 h-4 w-4" />
            Scrap
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setScrapConvertBack({}); setIsViewScrapOpen(true); }}>
            <Eye className="mr-1.5 h-4 w-4" />
            Scrap log
          </Button>
          <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </StickyPageHeader>

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
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <p className="font-medium text-sm">Need-to-Get (active sites)</p>
            </div>
            <Badge variant="outline">{needToGetRows.length} open</Badge>
          </div>
          {needToGetRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shortfalls: site checklist demand is covered by current stock.</p>
          ) : (
            <div className="space-y-2">
              {needToGetRows.slice(0, 10).map((row) => (
                <div key={`${row.projectId}-${row.siteId}-${row.materialId}`} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.projectName} · {row.siteName}
                      </p>
                    </div>
                    <Badge className="bg-destructive/10 text-destructive border-0">Need {row.qtyShort}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>Need-by: {row.needByDate}</span>
                    <span>Last purch. rate: {formatCurrency(row.lastPurchaseRate)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button className="w-full" type="button" onClick={() => setNeedToGetOpen(true)}>
            Open full Need-to-Get report
          </Button>
        </CardContent>
      </Card>

      {/* Materials Cards - Grouped by Category */}
      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => {
          const isCollapsed = collapsedCategories.has(category);
          const categoryLowStock = items.filter(i => i.stock <= i.minStock).length;
          
          if (groupByCategory) {
            return (
              <Collapsible key={category} open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h2 className="font-semibold text-sm">{category}</h2>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      {categoryLowStock > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                          {categoryLowStock} low
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {items.reduce((s, i) => s + i.stock, 0)} total units
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                    {items.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          }
          
          return (
            <div key={category} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          );
        })}
        
        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No materials found</p>
          </div>
        )}
      </div>

      {/* Item Detail View Modal */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                  <p className="font-medium">{formatCurrency(selectedItemForDetail.buyPrice)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Sale Price</p>
                  <p className="font-medium">{formatCurrency(selectedItemForDetail.salePrice)}</p>
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
                  <p className="font-medium">{formatCurrency(selectedItemForDetail.stock * selectedItemForDetail.buyPrice)}</p>
                </div>
              </div>
              {selectedItemForDetail.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedItemForDetail.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); openEditModal(selectedItemForDetail); }}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); setSelectedItemForHistory(selectedItemForDetail); setIsItemHistoryOpen(true); }}>
                  <History className="h-4 w-4 mr-2" /> History
                </Button>
                <Button variant="destructive" size="icon" onClick={() => { setItemToDelete(selectedItemForDetail); setIsDetailOpen(false); setIsDeleteItemConfirmOpen(true); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Material Modal */}
      <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                    {CATEGORY_ORDER.map((cat) => (
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
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" value={newItemBuyPrice} onChange={(e) => setNewItemBuyPrice(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Sale Rate (₹)</Label>
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
                        <p className="text-[10px] text-muted-foreground">{conv.hint}</p>
                      </div>
                    )}
                    
                    {conv.type === 'length' && (
                      <div className="space-y-1">
                        <Label className="text-xs">{conv.label}</Label>
                        <Input type="number" value={newItemPerPieceLength} onChange={(e) => setNewItemPerPieceLength(e.target.value)} placeholder="e.g., 14" />
                        <p className="text-[10px] text-muted-foreground">{conv.hint}</p>
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
            <Button onClick={handleAddItemSave}>Add Item</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Item Confirmation */}
      <Sheet open={isAddItemConfirmOpen} onOpenChange={setIsAddItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Edit Item Modal */}
      <Sheet open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                      {CATEGORY_ORDER.map((cat) => (
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
                  <Label>Purchase Rate (₹)</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.buyPrice} />
                </div>
                <div className="space-y-2">
                  <Label>Sale Rate (₹)</Label>
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
                          <p className="text-[10px] text-muted-foreground">{conv.hint}</p>
                        </div>
                      )}
                      
                      {conv.type === 'length' && (
                        <div className="space-y-1">
                          <Label className="text-xs">{conv.label}</Label>
                          <Input type="number" value={editPerPieceLength} onChange={(e) => setEditPerPieceLength(e.target.value)} placeholder="e.g., 14" />
                          <p className="text-[10px] text-muted-foreground">{conv.hint}</p>
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
            <Button onClick={handleEditItemSave}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Item Confirmation */}
      <Sheet open={isEditItemConfirmOpen} onOpenChange={setIsEditItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" /> Changes Saved
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Item details have been updated successfully.</p>
          <SheetFooter><Button onClick={() => setIsEditItemConfirmOpen(false)}>Done</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Item Confirmation */}
      <Sheet open={isDeleteItemConfirmOpen} onOpenChange={setIsDeleteItemConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete Item
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{itemToDelete?.name}</span>?
            </p>
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                This action cannot be undone. All history and records for this item will be permanently removed.
              </p>
            </div>
          </div>
          <SheetFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setIsDeleteItemConfirmOpen(false); setItemToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteItem}><Trash2 className="w-4 h-4 mr-2" /> Delete Item</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Item History Modal */}
      <Sheet open={isItemHistoryOpen} onOpenChange={setIsItemHistoryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Movement History: {selectedItemForHistory && getDisplayName(selectedItemForHistory)}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {itemMovementHistory.map((record, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{record.action}</p>
                  <p className="text-xs text-muted-foreground">{record.site} • By {record.by}</p>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${record.action.includes("Added") || record.action.includes("Returned") ? "text-primary" : "text-amber-600"}`}>
                    {record.action.includes("Added") || record.action.includes("Returned") ? "+" : "-"}{record.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">{record.date}</p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Issue to Site Modal - with expense & task options */}
      <Sheet open={isIssueToSiteOpen} onOpenChange={setIsIssueToSiteOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
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
                      <Label className="text-xs">Amount (₹)</Label>
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
        </SheetContent>
      </Sheet>

      {/* Issue Confirmation */}
      <Sheet open={isIssueConfirmOpen} onOpenChange={setIsIssueConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Return from Site Modal */}
      <Sheet open={isReturnFromSiteOpen} onOpenChange={setIsReturnFromSiteOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select items from the site to return</p>
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnFromSiteOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnSave} disabled={!selectedSiteForReturn || Object.keys(returnErrors).length > 0}>
              Confirm Return
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return Confirmation */}
      <Sheet open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" /> Items Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Items have been returned to warehouse.</p>
          <SheetFooter>
            <Button onClick={() => { setIsReturnConfirmOpen(false); setReturnQuantities({}); setSelectedSiteForReturn(""); }}>Done</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add to Scrap Modal */}
      <Sheet open={isAddToScrapOpen} onOpenChange={setIsAddToScrapOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
              <p className="text-center text-muted-foreground py-4">No scrap-eligible pipe items found in inventory.</p>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddToScrapOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToScrap}>
              <Recycle className="w-4 h-4 mr-2" /> Convert to Scrap
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View Scrap Modal */}
      <Sheet open={isViewScrapOpen} onOpenChange={setIsViewScrapOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
              <div className="text-center py-8 text-muted-foreground">
                <Recycle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No scrap items yet. Use "Add to Scrap" to convert pipe items.</p>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsViewScrapOpen(false)}>Close</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <NeedToGetModal open={needToGetOpen} onOpenChange={setNeedToGetOpen} />
    </PageShell>
  );
};

export default Materials;

import { useMemo, useState } from "react";
import { Plus, RotateCcw, AlertTriangle, Edit, Wrench, Package, History, ArrowRight, Trash2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useMasters } from "@/hooks/useMasters";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

// Global data is pulled from AppDataContext

// Global data is pulled from AppDataContext

const Inventory = () => {
  const masters = useMasters();
  const { inventoryItems: inventoryItemsData, tools: toolsDataList, sites, employees } = useAppData();
  
  const [activeTab, setActiveTab] = useState("stock");
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isIssueToSiteOpen, setIsIssueToSiteOpen] = useState(false);
  const [isReturnFromSiteOpen, setIsReturnFromSiteOpen] = useState(false);
  const [isItemHistoryOpen, setIsItemHistoryOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [isIssueToolOpen, setIsIssueToolOpen] = useState(false);
  const [isReturnToolOpen, setIsReturnToolOpen] = useState(false);
  const [isToolHistoryOpen, setIsToolHistoryOpen] = useState(false);
  const [isEditToolOpen, setIsEditToolOpen] = useState(false);
  const [selectedToolForHistory, setSelectedToolForHistory] = useState<typeof toolsDataList[0] | null>(null);
  const [selectedToolForEdit, setSelectedToolForEdit] = useState<typeof toolsDataList[0] | null>(null);
  const [issueToolAction, setIssueToolAction] = useState<"new" | "transfer">("new");
  
  // Confirmation states
  const [isAddItemConfirmOpen, setIsAddItemConfirmOpen] = useState(false);
  const [isEditItemConfirmOpen, setIsEditItemConfirmOpen] = useState(false);
  const [isIssueConfirmOpen, setIsIssueConfirmOpen] = useState(false);
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);
  const [isAddToolConfirmOpen, setIsAddToolConfirmOpen] = useState(false);
  const [isIssueToolConfirmOpen, setIsIssueToolConfirmOpen] = useState(false);
  const [isReturnToolConfirmOpen, setIsReturnToolConfirmOpen] = useState(false);
  
  // Delete confirmation states
  const [isDeleteItemConfirmOpen, setIsDeleteItemConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<typeof inventoryItems[0] | null>(null);
  
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<typeof inventoryItems[0] | null>(null);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<typeof inventoryItems[0] | null>(null);
  const [selectedSiteForReturn, setSelectedSiteForReturn] = useState("");
  const [selectedItemsToIssue, setSelectedItemsToIssue] = useState<Record<number, number>>({});
  const [returnAction, setReturnAction] = useState<"return" | "transfer">("return");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Return quantity validation
  const [returnQuantities, setReturnQuantities] = useState<Record<number, string>>({});
  const [returnErrors, setReturnErrors] = useState<Record<number, string>>({});
  
  // Selected tool for issue modal
  const [selectedToolId, setSelectedToolId] = useState("");

  const [stockPage, setStockPage] = useState(1);
  const [stockPageSize, setStockPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [toolsSearchQuery, setToolsSearchQuery] = useState("");
  const [toolsStatusFilter, setToolsStatusFilter] = useState("all");
  const [toolsPage, setToolsPage] = useState(1);
  const [toolsPageSize, setToolsPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const handleItemHistoryClick = (item: any) => {
    setSelectedItemForHistory(item);
    setIsItemHistoryOpen(true);
  };

  const handleEditItemClick = (item: any) => {
    setSelectedItemForEdit(item);
    setIsEditItemOpen(true);
  };

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

  const sitesWithIssuedItems = useMemo(() => {
    return sites.map(site => ({
      id: site.id,
      name: site.name,
      items: (site.ledger || []).filter(l => l.movementType === "IssueToSite").map(l => ({
        id: l.itemId,
        name: l.itemName || "Unknown Item",
        issuedQty: l.quantity,
        returnableQty: l.quantity
      }))
    }));
  }, [sites]);

  // Return quantity change with validation
  const handleReturnQuantityChange = (itemId: number, value: string) => {
    const siteItems = sitesWithIssuedItems.find(s => s.name === selectedSiteForReturn)?.items || [];
    const item = siteItems.find(i => i.id === itemId);
    const numValue = parseFloat(value) || 0;
    
    setReturnQuantities(prev => ({ ...prev, [itemId]: value }));
    
    if (item && numValue > (item.issuedQty || 0)) {
      setReturnErrors(prev => ({ ...prev, [itemId]: "Can't return what wasn't issued" }));
    } else {
      setReturnErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[itemId];
        return newErrors;
      });
    }
  };

  const filteredItems = useMemo(
    () =>
      inventoryItemsData.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [inventoryItemsData, searchQuery],
  );

  const filteredToolsList = useMemo(
    () =>
      toolsDataList.filter((t) => {
        const q = toolsSearchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.site.toLowerCase().includes(q) ||
          (t.assignedTo !== "-" && t.assignedTo.toLowerCase().includes(q));
        const matchesStatus =
          toolsStatusFilter === "all" ||
          (toolsStatusFilter === "available" && t.status === "Available") ||
          (toolsStatusFilter === "in-use" && t.status === "In Use");
        return matchesSearch && matchesStatus;
      }),
    [toolsDataList, toolsSearchQuery, toolsStatusFilter],
  );

  const { pagedItems: pagedStockItems, safePage: safeStockPage } = usePagedSlice(
    filteredItems,
    stockPage,
    stockPageSize,
  );
  const { pagedItems: pagedToolsRows, safePage: safeToolsPage } = usePagedSlice(
    filteredToolsList,
    toolsPage,
    toolsPageSize,
  );

  const toolsInUse = toolsDataList.filter(t => t.status === "In Use");
  const toolsAvailableCount = toolsDataList.filter((t) => t.status === "Available").length;
  const lowStockCount = filteredItems.filter(
    (item) => item.alert === true || (item.minStock != null && item.stock <= item.minStock),
  ).length;
  const stockValueTotal = filteredItems.reduce((sum, item) => sum + (item.value || 0), 0);

  // Get selected tool's condition for issue modal
  const getSelectedToolCondition = () => {
    if (!selectedToolId) return null;
    const tool = toolsDataList.find(t => t.id.toString() === selectedToolId);
    return tool?.condition || null;
  };

  const handleAddItemSave = () => {
    setIsAddItemOpen(false);
    setIsAddItemConfirmOpen(true);
  };

  const handleEditItemSave = () => {
    setIsEditItemOpen(false);
    setIsEditItemConfirmOpen(true);
  };

  const handleIssueSave = () => {
    setIsIssueToSiteOpen(false);
    setIsIssueConfirmOpen(true);
  };

  const handleReturnSave = () => {
    // Check for any errors before saving
    if (Object.keys(returnErrors).length > 0) return;
    setIsReturnFromSiteOpen(false);
    setIsReturnConfirmOpen(true);
  };

  const handleAddToolSave = () => {
    setIsAddToolOpen(false);
    setIsAddToolConfirmOpen(true);
  };

  const handleIssueToolSave = () => {
    setIsIssueToolOpen(false);
    setIsIssueToolConfirmOpen(true);
  };

  const handleReturnToolSave = () => {
    setIsReturnToolOpen(false);
    setIsReturnToolConfirmOpen(true);
  };

  return (
    <PageShell className="space-y-4 px-2 md:space-y-6 md:px-0">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Inventory" }]}
        subRow={
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="h-9 w-full bg-secondary sm:w-auto">
                <TabsTrigger value="stock" className="flex-1 gap-1 text-xs sm:flex-none sm:text-sm">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Stock</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex-1 gap-1 text-xs sm:flex-none sm:text-sm">
                  <Wrench className="h-4 w-4" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={
                activeTab === "stock"
                  ? [
                      { label: "Line items", value: filteredItems.length },
                      { label: "Low / alert", value: lowStockCount },
                      { label: "Stock value", value: `₹${Math.round(stockValueTotal).toLocaleString("en-IN")}` },
                    ]
                  : [
                      { label: "Tools", value: toolsDataList.length },
                      { label: "In use", value: toolsInUse.length },
                      { label: "Available", value: toolsAvailableCount },
                    ]
              }
            />
          </>
        }
      />

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <>
          {/* Filters & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input 
                placeholder="Search inventory..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setStockPage(1);
                }}
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {masters.getInventoryCategories().map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setIsIssueToSiteOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Issue to Site
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setIsReturnFromSiteOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Return from Site
              </Button>
              <Button className="bg-primary text-primary-foreground text-sm" onClick={() => setIsAddItemOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>

          {/* Stock Table */}
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(stockPageSize)}
            scrollResetKey={`${safeStockPage}-${stockPageSize}-${filteredItems.length}`}
            footer={
              <TablePaginationBar
                page={safeStockPage}
                pageSize={stockPageSize}
                total={filteredItems.length}
                onPageChange={setStockPage}
                onPageSizeChange={(n) => {
                  setStockPageSize(n);
                  setStockPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="min-w-[180px]">Item Name</TableHead>
                <TableHead className="min-w-[100px]">Category</TableHead>
                <TableHead className="text-right min-w-[80px]">Qty</TableHead>
                <TableHead className="text-right min-w-[100px]">Purchase Rate</TableHead>
                <TableHead className="text-right min-w-[100px]">Sale Rate</TableHead>
                <TableHead className="min-w-[80px]">HSN</TableHead>
                <TableHead className="min-w-[120px]">Notes</TableHead>
                <TableHead className="min-w-[60px]">Unit</TableHead>
                <TableHead className="text-right min-w-[120px]">Total Value</TableHead>
                <TableHead className="text-center min-w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedStockItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.alert && <AlertTriangle className="w-4 h-4 text-destructive" />}
                        <span className="text-primary font-medium text-sm">{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell className="text-right font-medium">{item.stock}</TableCell>
                    <TableCell className="text-right">₹{item.buyPrice.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.salePrice?.toLocaleString() || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.hsn || "-"}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-[120px]" title={item.notes}>{item.notes || "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                    <TableCell className="text-right">₹{item.value.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleItemHistoryClick(item)}
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEditItemClick(item)}
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </DataTableShell>
        </>
      )}

      {/* Tools Tab */}
      {activeTab === "tools" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search tools..."
                value={toolsSearchQuery}
                onChange={(e) => {
                  setToolsSearchQuery(e.target.value);
                  setToolsPage(1);
                }}
              />
            </div>
            <Select
              value={toolsStatusFilter}
              onValueChange={(v) => {
                setToolsStatusFilter(v);
                setToolsPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in-use">In Use</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="text-sm" onClick={() => setIsIssueToolOpen(true)}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Issue Tool to Site
              </Button>
              <Button variant="outline" className="text-sm" onClick={() => setIsReturnToolOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Return to Warehouse
              </Button>
              <Button className="bg-primary text-primary-foreground" onClick={() => setIsAddToolOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </div>

          <DataTableShell
            maxHeight={listTableViewportMaxHeight(toolsPageSize)}
            scrollResetKey={`${safeToolsPage}-${toolsPageSize}-${filteredToolsList.length}`}
            footer={
              <TablePaginationBar
                page={safeToolsPage}
                pageSize={toolsPageSize}
                total={filteredToolsList.length}
                onPageChange={setToolsPage}
                onPageSizeChange={(n) => {
                  setToolsPageSize(n);
                  setToolsPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead className="min-w-[180px]">Tool Name</TableHead>
                <TableHead className="min-w-[120px]">Assigned To</TableHead>
                <TableHead className="min-w-[120px]">Site</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[100px]">Condition</TableHead>
                <TableHead className="min-w-[100px]">Last Updated</TableHead>
                <TableHead className="min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {pagedToolsRows.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell className={tool.assignedTo === "-" ? "text-muted-foreground text-sm" : "text-sm"}>
                      {tool.assignedTo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tool.site}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${tool.status === "Available" 
                        ? "bg-primary/10 text-primary border-0" 
                        : "bg-amber-500/10 text-amber-600 border-0"}`}
                      >
                        {tool.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tool.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tool.lastUpdated}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          title="Movement History"
                          onClick={() => {
                            setSelectedToolForHistory(tool);
                            setIsToolHistoryOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          title="Edit"
                          onClick={() => {
                            setSelectedToolForEdit(tool);
                            setIsEditToolOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </DataTableShell>
        </>
      )}


      {/* Add Item Modal */}
      <Sheet open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Add Inventory Item</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input placeholder="e.g., Waaree 540W Panel" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {masters.getInventoryCategories().map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="m">Meters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="pair">Pair</SelectItem>
                    <SelectItem value="bag">Bag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Sale Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>HSN Code</Label>
                <Input placeholder="e.g., 8541" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST Rate (%) *</Label>
                <Select defaultValue="18">
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST Rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Required for invoicing</p>
              </div>
              <div className="space-y-2">
                <Label>Min. Stock Alert</Label>
                <Input type="number" placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
            <Button onClick={handleAddItemSave}>Add Item</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Item Confirmation */}
      <Sheet open={isAddItemConfirmOpen} onOpenChange={setIsAddItemConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Item Added Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The inventory item has been added successfully.</p>
          <SheetFooter>
            <Button onClick={() => setIsAddItemConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Item Modal */}
      <Sheet open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Edit Item: {selectedItemForEdit?.name}</SheetTitle>
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
                  <Select defaultValue={selectedItemForEdit.category.toLowerCase()}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {masters.getInventoryCategories().map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select defaultValue={selectedItemForEdit.unit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="m">Meters</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="pair">Pair</SelectItem>
                      <SelectItem value="bag">Bag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" defaultValue={selectedItemForEdit.stock} />
                </div>
                <div className="space-y-2">
                  <Label>HSN Code</Label>
                  <Input defaultValue={selectedItemForEdit.hsn} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Min. Stock Alert</Label>
                <Input type="number" defaultValue={selectedItemForEdit.minStock} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea defaultValue={selectedItemForEdit.notes} />
              </div>
              
              {/* Delete Button Section */}
              <div className="pt-4 border-t mt-4">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setItemToDelete(selectedItemForEdit);
                    setIsEditItemOpen(false);
                    setIsDeleteItemConfirmOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </Button>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditItemOpen(false)}>Cancel</Button>
            <Button onClick={handleEditItemSave}>Save Changes</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Item Confirmation */}
      <Sheet open={isEditItemConfirmOpen} onOpenChange={setIsEditItemConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Changes Saved
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">Item details have been updated successfully.</p>
          <SheetFooter>
            <Button onClick={() => setIsEditItemConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Delete Item Confirmation Modal */}
      <Sheet open={isDeleteItemConfirmOpen} onOpenChange={setIsDeleteItemConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Item
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
            <Button variant="outline" onClick={() => {
              setIsDeleteItemConfirmOpen(false);
              setItemToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                toast({ 
                  title: "Item Deleted", 
                  description: `${itemToDelete?.name} has been removed from inventory.` 
                });
                setIsDeleteItemConfirmOpen(false);
                setItemToDelete(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Item
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Item History Modal */}
      <Sheet open={isItemHistoryOpen} onOpenChange={setIsItemHistoryOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Movement History: {selectedItemForHistory?.name}</SheetTitle>
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
        </AppSheetContent>
      </Sheet>

      {/* Issue to Site Modal */}
      <Sheet open={isIssueToSiteOpen} onOpenChange={setIsIssueToSiteOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Issue Items to Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Items</Label>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {inventoryItems.slice(0, 15).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedItemsToIssue[item.id] !== undefined}
                        onCheckedChange={(checked) => handleItemSelectForIssue(item.id, checked as boolean)}
                      />
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Available: {item.stock} {item.unit}</p>
                      </div>
                    </div>
                    {selectedItemsToIssue[item.id] !== undefined && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Qty:</Label>
                        <Input 
                          type="number" 
                          className="w-20 h-8" 
                          value={selectedItemsToIssue[item.id]}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          max={item.stock}
                          min={1}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToSiteOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueSave} disabled={Object.keys(selectedItemsToIssue).length === 0}>
              Issue Items
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Issue Confirmation */}
      <Sheet open={isIssueConfirmOpen} onOpenChange={setIsIssueConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Items Issued Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">
            {Object.keys(selectedItemsToIssue).length} item(s) have been issued to the selected site.
          </p>
          <SheetFooter>
            <Button onClick={() => { setIsIssueConfirmOpen(false); setSelectedItemsToIssue({}); }}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return from Site Modal */}
      <Sheet open={isReturnFromSiteOpen} onOpenChange={setIsReturnFromSiteOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Return Items from Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Site</Label>
              <Select value={selectedSiteForReturn} onValueChange={setSelectedSiteForReturn}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sitesWithIssuedItems.map((site) => (
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="return">Return to Warehouse</SelectItem>
                      <SelectItem value="transfer">Transfer to Another Site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Items at this Site</Label>
                  <div className="border rounded-lg">
                    {sitesWithIssuedItems.find(s => s.name === selectedSiteForReturn)?.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-0">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Issued: {item.issuedQty}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Return Qty:</Label>
                            <Input 
                              type="number" 
                              className={`w-20 h-8 ${returnErrors[item.id] ? 'border-destructive' : ''}`}
                              value={returnQuantities[item.id] || ""}
                              onChange={(e) => handleReturnQuantityChange(item.id, e.target.value)}
                              max={item.issuedQty}
                              min={0}
                            />
                          </div>
                          {returnErrors[item.id] && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {returnErrors[item.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnFromSiteOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleReturnSave} 
              disabled={!selectedSiteForReturn || Object.keys(returnErrors).length > 0}
            >
              Confirm Return
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return Confirmation */}
      <Sheet open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Items Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">
            Items have been {returnAction === "return" ? "returned to warehouse" : "transferred"} successfully.
          </p>
          <SheetFooter>
            <Button onClick={() => { setIsReturnConfirmOpen(false); setSelectedSiteForReturn(""); setReturnQuantities({}); }}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Tool Modal */}
      <Sheet open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Add New Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input placeholder="e.g., Drill Machine" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {masters.getToolCategories().map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToolSave}>Add Tool</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Add Tool Confirmation */}
      <Sheet open={isAddToolConfirmOpen} onOpenChange={setIsAddToolConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Added Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been added to the inventory.</p>
          <SheetFooter>
            <Button onClick={() => setIsAddToolConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Issue Tool Modal */}
      <Sheet open={isIssueToolOpen} onOpenChange={setIsIssueToolOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Issue Tool to Site</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={issueToolAction} onValueChange={(v) => setIssueToolAction(v as "new" | "transfer")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Issue from Warehouse</SelectItem>
                  <SelectItem value="transfer">Transfer from Another Site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select Tool</Label>
              <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tool" />
                </SelectTrigger>
                <SelectContent>
                  {issueToolAction === "new" 
                    ? toolsDataList.filter(t => t.status === "Available").map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>{tool.name}</SelectItem>
                      ))
                    : toolsDataList.filter(t => t.status === "In Use").map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>
                          {tool.name} - {tool.site} ({tool.assignedTo})
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
            {selectedToolId && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Condition: <span className="font-medium text-foreground">{getSelectedToolCondition()}</span></p>
                {issueToolAction === "transfer" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Current Location: <span className="font-medium text-foreground">
                      {toolsData.find(t => t.id.toString() === selectedToolId)?.site}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{issueToolAction === "transfer" ? "Transfer to Site" : "Assign to Site"}</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Person</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose person" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToolOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueToolSave}>{issueToolAction === "transfer" ? "Transfer Tool" : "Issue Tool"}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Tool Movement History Modal */}
      <Sheet open={isToolHistoryOpen} onOpenChange={setIsToolHistoryOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Movement History - {selectedToolForHistory?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="font-medium">{selectedToolForHistory?.status}</p>
              </div>
              <Badge variant="outline">{selectedToolForHistory?.condition}</Badge>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Movement Log</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Current location */}
                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {selectedToolForHistory?.status === "Available" 
                        ? "Returned to Warehouse" 
                        : `Issued to ${selectedToolForHistory?.site}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedToolForHistory?.lastUpdated}</p>
                    {selectedToolForHistory?.status === "In Use" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Assigned to: {selectedToolForHistory?.assignedTo}
                      </p>
                    )}
                    <Badge variant="outline" className="mt-1 text-xs">
                      Condition: {selectedToolForHistory?.condition}
                    </Badge>
                  </div>
                </div>
                {/* Sample history entries */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Issued to Site</p>
                    <p className="text-xs text-muted-foreground">10 Dec 2024</p>
                    <Badge variant="outline" className="mt-1 text-xs">Condition: Good</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Returned to Warehouse</p>
                    <p className="text-xs text-muted-foreground">05 Dec 2024</p>
                    <Badge variant="outline" className="mt-1 text-xs">Condition: Good</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Added to Inventory</p>
                    <p className="text-xs text-muted-foreground">{selectedToolForHistory?.purchaseDate}</p>
                    <p className="text-xs text-muted-foreground">Purchase Rate: ₹{selectedToolForHistory?.purchaseRate?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsToolHistoryOpen(false)}>Close</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Edit Tool Modal */}
      <Sheet open={isEditToolOpen} onOpenChange={setIsEditToolOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Edit Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input defaultValue={selectedToolForEdit?.name} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue={selectedToolForEdit?.category?.toLowerCase().replace(" ", "-")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {masters.getToolCategories().map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" defaultValue={selectedToolForEdit?.purchaseRate} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" defaultValue={selectedToolForEdit?.purchaseDate} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select defaultValue={selectedToolForEdit?.condition?.toLowerCase()}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t">
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setIsEditToolOpen(false);
                  // In real app, would delete the tool
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tool
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditToolOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsEditToolOpen(false)}>Save Changes</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Issue Tool Confirmation */}
      <Sheet open={isIssueToolConfirmOpen} onOpenChange={setIsIssueToolConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Issued Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been issued to the selected site and person.</p>
          <SheetFooter>
            <Button onClick={() => { setIsIssueToolConfirmOpen(false); setSelectedToolId(""); }}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return Tool Modal */}
      <Sheet open={isReturnToolOpen} onOpenChange={setIsReturnToolOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle>Return Tool to Warehouse</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tool (Currently In Use)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose tool" />
                </SelectTrigger>
                <SelectContent>
                  {toolsInUse.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id.toString()}>
                      {tool.name} - {tool.site} ({tool.assignedTo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condition on Return</Label>
              <Select defaultValue="good">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Needs Repair</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea placeholder="Any remarks about the tool condition..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnToolOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnToolSave}>Return Tool</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return Tool Confirmation */}
      <Sheet open={isReturnToolConfirmOpen} onOpenChange={setIsReturnToolConfirmOpen}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Tool Returned Successfully
            </SheetTitle>
          </SheetHeader>
          <p className="text-muted-foreground">The tool has been returned to the warehouse.</p>
          <SheetFooter>
            <Button onClick={() => setIsReturnToolConfirmOpen(false)}>Done</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Inventory;

import { useState, useMemo } from "react";
import { Plus, Search, Wrench, User, MapPin, Check, RotateCcw, ArrowRight, History, Edit, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tool } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { toast } from "@/hooks/use-toast";

const toolCategories = [
  { value: "power-tool", label: "Power Tool" },
  { value: "hand-tool", label: "Hand Tool" },
  { value: "measuring-tool", label: "Measuring Tool" },
  { value: "safety-equipment", label: "Safety Equipment" },
  { value: "machinery", label: "Machinery" },
  { value: "digging-tool", label: "Digging Tool" },
  { value: "others", label: "Others" },
];

const Tools = () => {
  const { tools, employees, projects } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal states
  const [isAddToolOpen, setIsAddToolOpen] = useState(false);
  const [isAddToolConfirmOpen, setIsAddToolConfirmOpen] = useState(false);
  const [isEditToolOpen, setIsEditToolOpen] = useState(false);
  const [isIssueToolOpen, setIsIssueToolOpen] = useState(false);
  const [isIssueToolConfirmOpen, setIsIssueToolConfirmOpen] = useState(false);
  const [isReturnToolOpen, setIsReturnToolOpen] = useState(false);
  const [isReturnToolConfirmOpen, setIsReturnToolConfirmOpen] = useState(false);
  const [isToolHistoryOpen, setIsToolHistoryOpen] = useState(false);
  
  // Selection states
  const [selectedToolId, setSelectedToolId] = useState("");
  const [selectedToolForEdit, setSelectedToolForEdit] = useState<Tool | null>(null);
  const [selectedToolForHistory, setSelectedToolForHistory] = useState<Tool | null>(null);
  const [issueToolAction, setIssueToolAction] = useState<"new" | "transfer">("new");
  
  // Form states for Add Tool
  const [newToolName, setNewToolName] = useState("");
  const [newToolCategory, setNewToolCategory] = useState("");
  const [newToolPurchaseRate, setNewToolPurchaseRate] = useState("");
  const [newToolPurchaseDate, setNewToolPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [newToolCondition, setNewToolCondition] = useState("Good");
  
  // Form states for Return Tool
  const [returnCondition, setReturnCondition] = useState("Good");
  const [returnNotes, setReturnNotes] = useState("");
  
  // Get sites from projects
  const sites = projects.map(p => ({ id: p.id, name: p.name }));
  
  // Get unique categories
  const categories = [...new Set(tools.map(tool => tool.category))];

  const filteredTools = useMemo(
    () =>
      tools.filter((tool) => {
        const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || tool.status === statusFilter;
        const matchesCategory = categoryFilter === "all" || tool.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      }),
    [tools, searchQuery, statusFilter, categoryFilter],
  );

  const { pagedItems: pagedTools, safePage } = usePagedSlice(filteredTools, tablePage, tablePageSize);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  // Stats
  const totalTools = tools.length;
  const inUse = tools.filter(t => t.status === "In Use").length;
  const available = tools.filter(t => t.status === "Available").length;
  const underRepair = tools.filter(t => t.status === "Under Repair").length;
  
  const toolsInUse = tools.filter(t => t.status === "In Use");
  const toolsAvailable = tools.filter(t => t.status === "Available");

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "In Use": "bg-blue-500/10 text-blue-500 border-0",
      "Available": "bg-primary/10 text-primary border-0",
      "Under Repair": "bg-amber-500/10 text-amber-500 border-0",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const styles: Record<string, string> = {
      "Good": "bg-primary/10 text-primary border-0",
      "Fair": "bg-amber-500/10 text-amber-500 border-0",
      "Poor": "bg-destructive/10 text-destructive border-0",
    };
    return <Badge className={styles[condition] || ""}>{condition}</Badge>;
  };
  
  const getSelectedToolCondition = () => {
    if (!selectedToolId) return null;
    const tool = tools.find(t => t.id.toString() === selectedToolId);
    return tool?.condition || null;
  };

  // Handlers
  const handleAddToolSave = () => {
    if (!newToolName || !newToolCategory) {
      toast({ title: "Error", description: "Name and category are required", variant: "destructive" });
      return;
    }
    setIsAddToolOpen(false);
    setIsAddToolConfirmOpen(true);
    // Reset form
    setNewToolName("");
    setNewToolCategory("");
    setNewToolPurchaseRate("");
    setNewToolPurchaseDate(new Date().toISOString().split('T')[0]);
    setNewToolCondition("Good");
  };

  const handleIssueToolSave = () => {
    setIsIssueToolOpen(false);
    setIsIssueToolConfirmOpen(true);
  };

  const handleReturnToolSave = () => {
    setIsReturnToolOpen(false);
    setIsReturnToolConfirmOpen(true);
    setReturnCondition("Good");
    setReturnNotes("");
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Inventory", to: "/inventory" },
          { label: "Tools" },
        ]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="relative max-w-full flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tools"
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
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In use</SelectItem>
                    <SelectItem value="Under Repair">Under repair</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => {
                    setCategoryFilter(v);
                    setTablePage(1);
                  }}
                >
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
                { label: "Total", value: totalTools },
                { label: "Avail", value: available },
                { label: "In use", value: inUse },
                { label: "Repair", value: underRepair },
                { label: "Match", value: filteredTools.length },
              ]}
            />
          </>
        }
      >
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setIsIssueToolOpen(true)}>
            <ArrowRight className="mr-1.5 h-4 w-4" />
            Issue
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsReturnToolOpen(true)}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Return
          </Button>
          <Button size="sm" onClick={() => setIsAddToolOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </StickyPageHeader>

      {/* Tools Table */}
      <DataTableShell
        maxHeight={listTableViewportMaxHeight(tablePageSize)}
        scrollResetKey={`${safePage}-${tablePageSize}-${filteredTools.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={tablePageSize}
            total={filteredTools.length}
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
            <TableHead className="min-w-[180px]">Tool Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {pagedTools.map((tool) => (
              <TableRow key={tool.id} className="border-border">
                <TableCell className="font-medium">{tool.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{tool.category}</Badge>
                </TableCell>
                <TableCell>
                  {tool.assignedTo !== "-" ? (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{tool.assignedTo}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{tool.site}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(tool.status)}</TableCell>
                <TableCell>{getConditionBadge(tool.condition)}</TableCell>
                <TableCell className="text-muted-foreground">{tool.lastUpdated}</TableCell>
                <TableCell className="text-right">{formatCurrency(tool.purchaseRate)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
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
      {filteredTools.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tools found</p>
        </div>
      )}

      {/* Add Tool Modal */}
      <Sheet open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add New Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name *</Label>
              <Input 
                placeholder="e.g., Drill Machine" 
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={newToolCategory} onValueChange={setNewToolCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {toolCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.label}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={newToolPurchaseRate}
                  onChange={(e) => setNewToolPurchaseRate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input 
                  type="date" 
                  value={newToolPurchaseDate}
                  onChange={(e) => setNewToolPurchaseDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={newToolCondition} onValueChange={setNewToolCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddToolOpen(false)}>Cancel</Button>
            <Button onClick={handleAddToolSave}>Add Tool</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Tool Confirmation */}
      <Sheet open={isAddToolConfirmOpen} onOpenChange={setIsAddToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Issue Tool Modal */}
      <Sheet open={isIssueToolOpen} onOpenChange={setIsIssueToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                    ? toolsAvailable.map((tool) => (
                        <SelectItem key={tool.id} value={tool.id.toString()}>{tool.name}</SelectItem>
                      ))
                    : toolsInUse.map((tool) => (
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
                      {tools.find(t => t.id.toString() === selectedToolId)?.site}
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
        </SheetContent>
      </Sheet>

      {/* Issue Tool Confirmation */}
      <Sheet open={isIssueToolConfirmOpen} onOpenChange={setIsIssueToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Return Tool Modal */}
      <Sheet open={isReturnToolOpen} onOpenChange={setIsReturnToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
              <Select value={returnCondition} onValueChange={setReturnCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Needs Repair</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea 
                placeholder="Any remarks about the tool condition..." 
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnToolOpen(false)}>Cancel</Button>
            <Button onClick={handleReturnToolSave}>Return Tool</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Return Tool Confirmation */}
      <Sheet open={isReturnToolConfirmOpen} onOpenChange={setIsReturnToolConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Tool Movement History Modal */}
      <Sheet open={isToolHistoryOpen} onOpenChange={setIsToolHistoryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        </SheetContent>
      </Sheet>

      {/* Edit Tool Modal */}
      <Sheet open={isEditToolOpen} onOpenChange={setIsEditToolOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
                  {toolCategories.map((cat) => (
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
                  toast({ title: "Tool Deleted", description: `${selectedToolForEdit?.name} has been removed.` });
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tool
              </Button>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditToolOpen(false)}>Cancel</Button>
            <Button onClick={() => { 
              setIsEditToolOpen(false); 
              toast({ title: "Tool Updated", description: "Changes saved successfully." });
            }}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Tools;

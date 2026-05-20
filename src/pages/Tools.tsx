import { useState, useMemo } from "react";
import { useCan } from "@/hooks/useCan";
import { Plus, Search, Wrench, User, MapPin, Check, RotateCcw, ArrowRight, History, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tool } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { toast } from "@/hooks/use-toast";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { TOOL_CATEGORY_SELECT_ITEMS } from "@/lib/formCategories";
import { formatINR } from "@/lib/formatCurrency";

const Tools = () => {
  const { tools, employees, sites, addTool, updateTool, deleteTool, reverseToolMovement, issueTool, returnTool, generateId: _generateId } = useAppData();
  const canCreateTool = useCan("tool", "create");
  const canEditTool = useCan("tool", "edit");
  const canDeleteTool = useCan("tool", "delete");
  
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
  
  // Form states for Issue Tool (A6 — wire missing state)
  const [issueSiteId, setIssueSiteId] = useState("");
  const [issuePersonId, setIssuePersonId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [issueHandoffNotes, setIssueHandoffNotes] = useState("");

  // Form states for Return Tool (A7 — wire missing state)
  const [returnToolId, setReturnToolId] = useState("");
  const [returnCondition, setReturnCondition] = useState<Tool["condition"]>("Good");
  const [returnNotes, setReturnNotes] = useState("");

  // Edit form controlled state (B12 — currently uses defaultValue, no save)
  const [editToolName, setEditToolName] = useState("");
  const [editToolCategory, setEditToolCategory] = useState("");
  const [editToolPurchaseRate, setEditToolPurchaseRate] = useState("");
  const [editToolPurchaseDate, setEditToolPurchaseDate] = useState("");
  const [editToolCondition, setEditToolCondition] = useState<Tool["condition"]>("Good");
  const [editToolConditionNotes, setEditToolConditionNotes] = useState("");

  // Retire / reverse dialog state
  const [retireToolTarget, setRetireToolTarget] = useState<Tool | null>(null);
  const [retireReason, setRetireReason] = useState("");
  const [reverseTarget, setReverseTarget] = useState<{ toolId: number; recordId: string } | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  
  const siteLabelForTool = (tool: Tool) => {
    if (tool.assignedToSiteId) {
      const site = sites.find((s) => String(s.id) === tool.assignedToSiteId);
      return site?.name ?? tool.site;
    }
    return tool.site || "—";
  };

  const assigneeLabelForTool = (tool: Tool) => {
    if (tool.assignedToEmployeeId) {
      const emp = employees.find((e) => String(e.id) === tool.assignedToEmployeeId);
      return emp?.name ?? tool.assignedTo;
    }
    return tool.assignedTo || "—";
  };

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

  // Stats
  const totalTools = tools.length;
  const inUse = tools.filter(t => t.status === "In Use").length;
  const available = tools.filter(t => t.status === "Available").length;
  const underRepair = tools.filter(t => t.status === "Under Repair").length;
  
  const toolsInUse = tools.filter(t => t.status === "In Use");
  const toolsAvailable = tools.filter(t => t.status === "Available");

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "In Use": "bg-primary/10 text-primary border-0",
      "Available": "bg-primary/10 text-primary border-0",
      "Under Repair": "bg-warning/10 text-warning border-0",
    };
    return <Badge className={styles[status] || ""}>{status}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const styles: Record<string, string> = {
      "Good": "bg-primary/10 text-primary border-0",
      "Fair": "bg-warning/10 text-warning border-0",
      "Poor": "bg-destructive/10 text-destructive border-0",
      "Damaged": "bg-destructive/15 text-destructive border-0",
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
    // B9 — actually persist to context
    const newTool: import("@/types/project").Tool = {
      id: Date.now(),
      name: newToolName,
      category: newToolCategory,
      status: "Available",
      condition: newToolCondition as Tool["condition"],
      site: "",
      assignedTo: "-",
      purchaseRate: parseFloat(newToolPurchaseRate) || 0,
      purchaseDate: newToolPurchaseDate,
      lastUpdated: new Date().toISOString().split("T")[0],
    };
    addTool(newTool);
    setIsAddToolOpen(false);
    setIsAddToolConfirmOpen(true);
    setNewToolName("");
    setNewToolCategory("");
    setNewToolPurchaseRate("");
    setNewToolPurchaseDate(new Date().toISOString().split("T")[0]);
    setNewToolCondition("Good");
  };

  const handleIssueToolSave = () => {
    if (!selectedToolId || !issueSiteId) {
      toast({ title: "Error", description: "Select a tool and site", variant: "destructive" });
      return;
    }
    // B10 — actually persist to context
    const site = sites.find((s) => String(s.id) === issueSiteId);
    const emp = employees.find((e) => e.id.toString() === issuePersonId);
    issueTool(
      selectedToolId,
      issueSiteId,
      site?.name ?? issueSiteId,
      issueDate,
      issuePersonId || undefined,
      emp?.name || undefined,
      issueHandoffNotes || undefined,
    );
    setIsIssueToolOpen(false);
    setIsIssueToolConfirmOpen(true);
    setIssueSiteId("");
    setIssuePersonId("");
    setIssueHandoffNotes("");
  };

  const handleReturnToolSave = () => {
    if (!returnToolId) {
      toast({ title: "Error", description: "Select a tool to return", variant: "destructive" });
      return;
    }
    // B11 — actually persist to context
    returnTool(
      returnToolId,
      returnCondition,
      new Date().toISOString().split("T")[0],
      returnNotes || undefined,
    );
    setIsReturnToolOpen(false);
    setIsReturnToolConfirmOpen(true);
    setReturnToolId("");
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
          <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Search tools"
                className="h-9 border-border bg-muted/50 pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setTablePage(1);
                }}
                aria-label="Search tools"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setTablePage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] shrink-0 bg-muted/50">
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
              <SelectTrigger className="h-9 w-[200px] shrink-0 bg-muted/50">
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
            <InlineKpiStrip
              singleRow
              className="min-w-0 flex-1"
              items={[
                { label: "Total", value: totalTools },
                { label: "Avail", value: available },
                { label: "In use", value: inUse },
                { label: "Repair", value: underRepair },
                { label: "Match", value: filteredTools.length },
              ]}
            />
          </div>
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
          <Button size="sm" onClick={() => setIsAddToolOpen(true)} disabled={!canCreateTool}>
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
                  {assigneeLabelForTool(tool) !== "—" && assigneeLabelForTool(tool) !== "-" ? (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{assigneeLabelForTool(tool)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{siteLabelForTool(tool)}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(tool.status)}</TableCell>
                <TableCell>{getConditionBadge(tool.condition)}</TableCell>
                <TableCell className="text-muted-foreground">{tool.lastUpdated}</TableCell>
                <TableCell className="text-right">{formatINR(tool.purchaseRate)}</TableCell>
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
                    {canEditTool && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => {
                        setSelectedToolForEdit(tool);
                        setEditToolName(tool.name);
                        setEditToolCategory(tool.category);
                        setEditToolPurchaseRate(tool.purchaseRate.toString());
                        setEditToolPurchaseDate(tool.purchaseDate);
                        setEditToolCondition(tool.condition as Tool["condition"]);
                        setEditToolConditionNotes(tool.conditionNotes ?? "");
                        setIsEditToolOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    )}
                    {canDeleteTool && (tool.status === "Retired" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Reinstate"
                        onClick={() => updateTool(tool.id, { status: "Available", retiredAt: undefined, retiredReason: undefined })}
                      >
                        Reinstate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Retire"
                        className="text-muted-foreground"
                        onClick={() => {
                          setRetireReason("");
                          setRetireToolTarget(tool);
                        }}
                      >
                        Retire
                      </Button>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
      </DataTableShell>
      {filteredTools.length === 0 && (
        <ListEmptyState
          icon={Wrench}
          title="No tools match this view"
          description="Adjust filters or add a new tool to the register."
          actionLabel="Add tool"
          onAction={() => setIsAddToolOpen(true)}
        />
      )}

      {/* Add Tool Modal */}
      <Sheet open={isAddToolOpen} onOpenChange={setIsAddToolOpen}>
        <AppSheetContent layout="scroll" size="xl">
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
                  {TOOL_CATEGORY_SELECT_ITEMS.map((cat) => (
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
                <DateInput value={newToolPurchaseDate} onChange={(e) => setNewToolPurchaseDate(e.target.value)} />
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
                  <SelectItem value="Damaged">Damaged</SelectItem>
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
        <AppSheetContent layout="scroll" size="xl">
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
        <AppSheetContent layout="scroll" size="xl">
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
                      {(() => {
                        const t = tools.find((x) => x.id.toString() === selectedToolId);
                        return t ? siteLabelForTool(t) : "";
                      })()}
                    </span>
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{issueToolAction === "transfer" ? "Transfer to Site" : "Assign to Site"} *</Label>
              <Select value={issueSiteId} onValueChange={setIssueSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={`${site.projectId}-${site.id}`} value={String(site.id)}>
                      {site.name}
                      {site.projectName ? ` (${site.projectName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to Person</Label>
              <Select value={issuePersonId} onValueChange={setIssuePersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose person (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue date</Label>
              <DateInput className="w-full" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Handoff / condition notes (optional)</Label>
              <Textarea
                placeholder="Condition at issue, accessories included, damage already present…"
                value={issueHandoffNotes}
                onChange={(e) => setIssueHandoffNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueToolOpen(false)}>Cancel</Button>
            <Button onClick={handleIssueToolSave}>{issueToolAction === "transfer" ? "Transfer Tool" : "Issue Tool"}</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Issue Tool Confirmation */}
      <Sheet open={isIssueToolConfirmOpen} onOpenChange={setIsIssueToolConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
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
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Return Tool to Warehouse</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Tool (Currently In Use) *</Label>
              <Select value={returnToolId} onValueChange={setReturnToolId}>
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
              <Select value={returnCondition} onValueChange={(v) => setReturnCondition(v as "Good" | "Fair" | "Damaged" | "Poor")}>
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
        </AppSheetContent>
      </Sheet>

      {/* Return Tool Confirmation */}
      <Sheet open={isReturnToolConfirmOpen} onOpenChange={setIsReturnToolConfirmOpen}>
        <AppSheetContent layout="scroll" size="xl">
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

      {/* Tool Movement History Modal */}
      <Sheet open={isToolHistoryOpen} onOpenChange={setIsToolHistoryOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Movement History - {selectedToolForHistory?.name}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="font-medium">{selectedToolForHistory?.status}</p>
                {selectedToolForHistory?.conditionNotes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Notes: <span className="text-foreground">{selectedToolForHistory.conditionNotes}</span>
                  </p>
                ) : null}
              </div>
              <Badge variant="outline">{selectedToolForHistory?.condition}</Badge>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Movement Log</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {/* Added to inventory entry */}
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Added to Inventory</p>
                    <p className="text-xs text-muted-foreground">{selectedToolForHistory?.purchaseDate}</p>
                    <p className="text-xs text-muted-foreground">Purchase rate: {formatINR(selectedToolForHistory?.purchaseRate ?? 0)}</p>
                  </div>
                </div>
                {/* Real movement history — B14 fix */}
                {(selectedToolForHistory?.movementHistory ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No movement recorded yet.</p>
                )}
                {(selectedToolForHistory?.movementHistory ?? []).map((rec, idx) => (
                  <div key={rec.id ?? idx} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {rec.type === "issue" ? <ArrowRight className="h-4 w-4 text-warning" /> : <RotateCcw className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${rec.reversedAt ? "line-through text-muted-foreground" : ""}`}>
                        {rec.type === "issue" ? `Issued to ${rec.siteName ?? "site"}` : "Returned to Warehouse"}
                      </p>
                      <p className="text-xs text-muted-foreground">{rec.date}{rec.employeeName ? ` • ${rec.employeeName}` : ""}</p>
                      {rec.condition && <Badge variant="outline" className="mt-1 text-xs">Condition: {rec.condition}</Badge>}
                      {(rec.conditionNotes ?? rec.notes)?.trim() ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Notes: <span className="text-foreground">{rec.conditionNotes ?? rec.notes}</span>
                        </p>
                      ) : null}
                      {rec.reversedAt && (
                        <p className="mt-1 text-xs text-destructive">
                          Reversed {rec.reversedAt.slice(0, 10)}{rec.reversalReason ? ` — ${rec.reversalReason}` : ""}
                        </p>
                      )}
                    </div>
                    {!rec.reversedAt && selectedToolForHistory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReverseReason("");
                          setReverseTarget({ toolId: selectedToolForHistory!.id, recordId: rec.id });
                        }}
                      >
                        Reverse
                      </Button>
                    )}
                  </div>
                ))}
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
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Edit Tool</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tool Name</Label>
              <Input value={editToolName} onChange={e => setEditToolName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editToolCategory} onValueChange={setEditToolCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_CATEGORY_SELECT_ITEMS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.label}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Rate (₹)</Label>
                <Input type="number" value={editToolPurchaseRate} onChange={e => setEditToolPurchaseRate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <DateInput value={editToolPurchaseDate} onChange={(e) => setEditToolPurchaseDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select value={editToolCondition} onValueChange={(v) => setEditToolCondition(v as Tool["condition"])}>
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
              <Label>Condition notes (on hand)</Label>
              <Textarea
                rows={3}
                placeholder="Wear, repairs, missing parts…"
                value={editToolConditionNotes}
                onChange={(e) => setEditToolConditionNotes(e.target.value)}
              />
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (!selectedToolForEdit) return;
                  deleteTool(selectedToolForEdit.id); // B13
                  setIsEditToolOpen(false);
                  toast({ title: "Tool Deleted", description: `${selectedToolForEdit.name} has been removed.` });
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
              if (!selectedToolForEdit) return;
              updateTool(selectedToolForEdit.id, {
                name: editToolName,
                category: editToolCategory,
                purchaseRate: parseFloat(editToolPurchaseRate) || 0,
                purchaseDate: editToolPurchaseDate,
                condition: editToolCondition,
                conditionNotes: editToolConditionNotes.trim() || undefined,
                lastUpdated: new Date().toISOString().split("T")[0],
              });
              setIsEditToolOpen(false);
              toast({ title: "Tool Updated", description: "Changes saved successfully." });
            }}>Save Changes</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Retire Tool Dialog */}
      <DestructiveConfirmDialog
        open={!!retireToolTarget}
        onOpenChange={(open) => { if (!open) setRetireToolTarget(null); }}
        title={`Retire "${retireToolTarget?.name}"?`}
        description="It will be excluded from issue/return flows. You can reinstate it later."
        confirmLabel="Retire"
        onConfirm={() => {
          if (retireToolTarget) {
            updateTool(retireToolTarget.id, {
              status: "Retired",
              retiredAt: new Date().toISOString(),
              retiredReason: retireReason.trim() || undefined,
            });
            setRetireToolTarget(null);
          }
        }}
      />

      {/* Reverse Movement Dialog */}
      <DestructiveConfirmDialog
        open={!!reverseTarget}
        onOpenChange={(open) => { if (!open) setReverseTarget(null); }}
        title="Reverse this movement?"
        description="This will undo the selected issue or return record."
        confirmLabel="Reverse"
        onConfirm={() => {
          if (reverseTarget) {
            const res = reverseToolMovement(reverseTarget.toolId, reverseTarget.recordId, reverseReason.trim() || undefined);
            if (!res.ok) toast({ variant: "destructive", title: "Cannot reverse", description: res.error });
            setReverseTarget(null);
          }
        }}
      />
    </PageShell>
  );
};

export default Tools;

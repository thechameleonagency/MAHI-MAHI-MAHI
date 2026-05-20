import { useState, useMemo, useEffect, useRef } from "react";
import { Package, Check, AlertTriangle, ArrowUp, ArrowDown, Plus, Send, Truck, Calendar, CheckCircle2, Wrench, ChevronDown, ChevronRight, User, RotateCcw, ShieldAlert, MoreHorizontal } from "lucide-react";
import { MaterialDamageSheet } from "@/components/projects/MaterialDamageSheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatUiDate } from "@/lib/formatUiDate";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import type { ExecutionLineItem, ProjectSiteChecklistItem } from "@/types/project";
import { findInventoryItemForMaterial, findPresetForMaterial } from "@/lib/inventoryPresetMatch";
import { inferTransportWorkKind, resolveSiteForMaterialIssue } from "@/lib/materialIssueTransportTask";

interface MaterialIssue {
  date: string;
  quantity: number;
}

interface MaterialItem {
  id: number;
  name: string;
  totalQuantitySent: number;
  unitPrice: number;
  unit: string;
  category?: string;
  issues: MaterialIssue[];
}

interface PresetItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  category?: string;
  size?: string;
  allowDecimalReturn?: boolean;
}

interface ToolAssigned {
  id: number;
  name: string;
  assignedTo: string;
  dateIssued: string;
  status?: string;
}

export type MaterialMovementCallMeta = { clientRequestId?: string };

interface MaterialsSentTabProps {
  projectName: string;
  projectId?: string;
  materials: MaterialItem[];
  presetItems: PresetItem[];
  inventoryItems: InventoryItem[];
  /** Per-project site checklist (planned items, qty issued, etc.). Seeded from quotation BOM. */
  siteChecklist?: ProjectSiteChecklistItem[];
  /** Super-admin only: lets the user mutate the per-project site checklist. */
  isSuperAdmin?: boolean;
  onUpdateSiteChecklist?: (next: ProjectSiteChecklistItem[]) => void;
  /** When present, show quoted vs issued variance from commercial baseline / execution rows. */
  executionLineItems?: ExecutionLineItem[];
  toolsAssigned?: ToolAssigned[];
  onIssueMaterials?: (
    items: { id: number; quantity: number; notes?: string }[],
    expenses?: { type: string; amount: number; notes?: string }[],
    taskInfo?: { assigneeId: number; notes: string },
    meta?: { movementGroupId?: string },
  ) => void | Promise<void>;
  onReturnMaterial?: (
    itemId: string,
    quantity: number,
    meta?: MaterialMovementCallMeta,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  onScrapMaterial?: (
    itemId: string,
    quantity: number,
    meta?: MaterialMovementCallMeta,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
  onConsumeMaterial?: (
    itemId: string,
    quantity: number,
    meta?: MaterialMovementCallMeta,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}

type MatchStatus = "match" | "over" | "under" | "no-preset";

const CATEGORY_ORDER = ["Structure", "Panel/Module", "Wiring", "Earthing", "Meter", "Civil"];

function newMovementClientId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function findExecutionLineForMaterial(
  materialId: number,
  materialName: string,
  lines: ExecutionLineItem[] | undefined,
): ExecutionLineItem | undefined {
  if (!lines?.length) return undefined;
  const byId = lines.find((l) => l.inventoryItemId === materialId || l.quotationMaterialId === materialId);
  if (byId) return byId;
  const n = materialName.toLowerCase();
  return lines.find((l) => {
    const d = (l.description || "").toLowerCase();
    return d && (n.includes(d.slice(0, 12)) || d.includes(n.slice(0, 12)));
  });
}

export default function MaterialsSentTab({
  projectName,
  projectId,
  materials,
  presetItems,
  inventoryItems: _inventoryItems,
  siteChecklist = [],
  isSuperAdmin = false,
  onUpdateSiteChecklist,
  executionLineItems,
  toolsAssigned = [],
  onIssueMaterials,
  onReturnMaterial,
  onScrapMaterial,
  onConsumeMaterial,
}: MaterialsSentTabProps) {
  const { employees, addTask, generateId, sites, inventoryItems: globalInventoryItems, getDamageByItem, siteChecklistTemplates = [] } = useAppData();
  const { currentRole } = useAppSession();
  const [damageSheet, setDamageSheet] = useState<{ itemId: string; itemName: string; unitPrice: number } | null>(null);
  const [isAddChecklistItemOpen, setIsAddChecklistItemOpen] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistUnit, setNewChecklistUnit] = useState("pcs");
  const [newChecklistQty, setNewChecklistQty] = useState("");
  const [isAttachTemplateOpen, setIsAttachTemplateOpen] = useState(false);
  const [attachTemplateId, setAttachTemplateId] = useState<string>("");

  const issueMovementGroupIdRef = useRef<string | null>(null);
  const sendMoreMovementGroupIdRef = useRef<string | null>(null);
  const returnMovementIdRef = useRef<string | null>(null);
  const scrapMovementIdRef = useRef<string | null>(null);
  const consumeMovementIdRef = useRef<string | null>(null);

  const [toolsPage, setToolsPage] = useState(1);
  const [toolsPageSize, setToolsPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: pagedTools, safePage: safeToolsPage } = usePagedSlice(toolsAssigned, toolsPage, toolsPageSize);

  useEffect(() => {
    setToolsPage(1);
  }, [toolsAssigned.length]);

  const [isToolsSectionOpen, setIsToolsSectionOpen] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [issuingItems, setIssuingItems] = useState<Record<number, number>>({});
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isSendMoreModalOpen, setIsSendMoreModalOpen] = useState(false);
  const [selectedMaterialForSendMore, setSelectedMaterialForSendMore] = useState<MaterialItem | null>(null);
  const [sendMoreQuantity, setSendMoreQuantity] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  
  // Return to warehouse
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnMaterial, setReturnMaterial] = useState<MaterialItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [scrapMaterial, setScrapMaterial] = useState<MaterialItem | null>(null);
  const [scrapQuantity, setScrapQuantity] = useState("");
  const [isConsumeModalOpen, setIsConsumeModalOpen] = useState(false);
  const [consumeMaterial, setConsumeMaterial] = useState<MaterialItem | null>(null);
  const [consumeQuantity, setConsumeQuantity] = useState("");
  
  // Expense during issue
  const [addExpenseWithIssue, setAddExpenseWithIssue] = useState(false);
  const [expenseType, setExpenseType] = useState("transport");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  
  // Task assignment during issue
  const [assignTaskWithIssue, setAssignTaskWithIssue] = useState(false);
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Category collapse state
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isIssueModalOpen && !issueMovementGroupIdRef.current) {
      issueMovementGroupIdRef.current = newMovementClientId();
    }
    if (!isIssueModalOpen) issueMovementGroupIdRef.current = null;
  }, [isIssueModalOpen]);

  useEffect(() => {
    if (isSendMoreModalOpen && !sendMoreMovementGroupIdRef.current) {
      sendMoreMovementGroupIdRef.current = newMovementClientId();
    }
    if (!isSendMoreModalOpen) sendMoreMovementGroupIdRef.current = null;
  }, [isSendMoreModalOpen]);

  useEffect(() => {
    if (isReturnModalOpen && !returnMovementIdRef.current) {
      returnMovementIdRef.current = newMovementClientId();
    }
    if (!isReturnModalOpen) returnMovementIdRef.current = null;
  }, [isReturnModalOpen]);

  useEffect(() => {
    if (isScrapModalOpen && !scrapMovementIdRef.current) {
      scrapMovementIdRef.current = newMovementClientId();
    }
    if (!isScrapModalOpen) scrapMovementIdRef.current = null;
  }, [isScrapModalOpen]);

  useEffect(() => {
    if (isConsumeModalOpen && !consumeMovementIdRef.current) {
      consumeMovementIdRef.current = newMovementClientId();
    }
    if (!isConsumeModalOpen) consumeMovementIdRef.current = null;
  }, [isConsumeModalOpen]);

  // Match materials against preset (inventory id first; name substring only when ≥6 chars)
  const getMatchStatus = (material: MaterialItem): { status: MatchStatus; preset?: PresetItem; difference: number } => {
    const preset = findPresetForMaterial(material, presetItems);

    if (!preset) return { status: "no-preset", difference: 0 };
    
    const difference = material.totalQuantitySent - preset.quantity;
    if (difference === 0) return { status: "match", preset, difference: 0 };
    else if (difference > 0) return { status: "over", preset, difference };
    else return { status: "under", preset, difference };
  };

  const materialsWithStatus = useMemo(() => {
    return materials.map(m => ({
      ...m,
      matchInfo: getMatchStatus(m)
    }));
  }, [materials, presetItems]);

  // Group materials by category
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, typeof materialsWithStatus> = {};
    
    for (const mat of materialsWithStatus) {
      // Try to find category from global inventory
      const invItem = findInventoryItemForMaterial(mat, globalInventoryItems);
      const category = mat.category || invItem?.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(mat);
    }
    
    // Sort by category order
    const sorted: Record<string, typeof materialsWithStatus> = {};
    for (const cat of CATEGORY_ORDER) {
      if (groups[cat]) sorted[cat] = groups[cat];
    }
    for (const cat in groups) {
      if (!sorted[cat]) sorted[cat] = groups[cat];
    }
    return sorted;
  }, [materialsWithStatus, globalInventoryItems]);

  const totalValue = materials.reduce((sum, m) => sum + (m.totalQuantitySent * m.unitPrice), 0);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
      setIssuingItems(prev => ({ ...prev, [id]: 1 }));
    } else {
      newSelected.delete(id);
      const newIssuing = { ...issuingItems };
      delete newIssuing[id];
      setIssuingItems(newIssuing);
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (id: number, quantity: number) => {
    setIssuingItems(prev => ({ ...prev, [id]: quantity }));
  };

  const handleOpenIssueModal = () => {
    if (selectedItems.size === 0) {
      toast({ title: "No Items Selected", description: "Please select items to issue", variant: "destructive" });
      return;
    }
    setIsIssueModalOpen(true);
  };

  const handleConfirmIssue = async () => {
    const itemsToIssue = Array.from(selectedItems).map(id => ({
      id,
      quantity: issuingItems[id] || 1,
      notes: issueNotes
    }));
    
    const expenses = addExpenseWithIssue && parseFloat(expenseAmount) > 0 
      ? [{ type: expenseType, amount: parseFloat(expenseAmount), notes: expenseNotes }]
      : undefined;
    
    const taskInfo = assignTaskWithIssue && taskAssignee
      ? { assigneeId: taskAssignee, notes: taskNotes }
      : undefined;

    await onIssueMaterials?.(itemsToIssue, expenses, taskInfo, {
      movementGroupId: issueMovementGroupIdRef.current ?? undefined,
    });
    
    // Create transport task if assigned
    if (assignTaskWithIssue && taskAssignee) {
      if (!projectId) {
        toast({
          title: "Cannot assign transport task",
          description: "Project linkage is missing — save the task from a project with a valid id.",
          variant: "destructive",
        });
      } else {
        const assignee = employees.find((e) => e.id.toString() === taskAssignee);
        const site = resolveSiteForMaterialIssue(sites, projectId, projectName);
        const materialNames = itemsToIssue.map((item) => {
          const mat = materials.find((m) => m.id === item.id);
          return mat?.name ?? "";
        });
        const { workType, stageKey } = inferTransportWorkKind(materialNames);

        addTask({
          id: generateId("TASK"),
          employeeId: taskAssignee,
          projectId,
          siteId: site.siteId,
          siteName: site.siteName,
          workType,
          workTag: "Transport",
          notes: taskNotes || `Transport ${itemsToIssue.length} item(s) to site`,
          createdDate: format(new Date(), "yyyy-MM-dd"),
          workDate: taskDate,
          originalDate: taskDate,
          status: "sent",
          createdBy: "Admin",
          workItems: [{ stageKey, stageName: workType, subItems: [] }],
        });

        toast({
          title: "Task Assigned",
          description: `Transport task assigned to ${assignee?.name || "employee"}`,
        });
      }
    }
    
    toast({ title: "Materials Issued", description: `${itemsToIssue.length} item(s) issued to ${projectName}` });
    
    // Reset
    setSelectedItems(new Set());
    setIssuingItems({});
    setIssueNotes("");
    setAddExpenseWithIssue(false);
    setExpenseType("transport");
    setExpenseAmount("");
    setExpenseNotes("");
    setAssignTaskWithIssue(false);
    setTaskAssignee("");
    setTaskNotes("");
    setTaskDate(format(new Date(), "yyyy-MM-dd"));
    setIsIssueModalOpen(false);
  };

  const handleOpenSendMore = (material: MaterialItem) => {
    setSelectedMaterialForSendMore(material);
    setSendMoreQuantity("");
    setIsSendMoreModalOpen(true);
  };

  const handleConfirmSendMore = async () => {
    if (!selectedMaterialForSendMore || !sendMoreQuantity) return;
    await onIssueMaterials?.(
      [{ id: selectedMaterialForSendMore.id, quantity: parseInt(sendMoreQuantity) }],
      undefined,
      undefined,
      { movementGroupId: sendMoreMovementGroupIdRef.current ?? undefined },
    );
    toast({ title: "Material Sent", description: `${sendMoreQuantity} units of ${selectedMaterialForSendMore.name} sent to site` });
    setSendMoreQuantity("");
    setSelectedMaterialForSendMore(null);
    setIsSendMoreModalOpen(false);
  };

  const handleOpenReturn = (material: MaterialItem) => {
    setReturnMaterial(material);
    setReturnQuantity("");
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!returnMaterial || !returnQuantity) return;
    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > returnMaterial.totalQuantitySent) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const result = (await (onReturnMaterial?.(returnMaterial.id, qty, {
      clientRequestId: returnMovementIdRef.current ?? undefined,
    }) ?? Promise.resolve({ ok: true }))) as { ok: boolean; error?: string };
    if (!result.ok) {
      toast({ title: "Return Failed", description: result.error || "Unable to return material", variant: "destructive" });
      return;
    }
    toast({ title: "Items Returned", description: `${qty} ${returnMaterial.unit} of ${returnMaterial.name} returned to warehouse` });
    setReturnMaterial(null);
    setReturnQuantity("");
    setIsReturnModalOpen(false);
  };

  const handleOpenScrap = (material: MaterialItem) => {
    setScrapMaterial(material);
    setScrapQuantity("");
    setIsScrapModalOpen(true);
  };

  const handleConfirmScrap = async () => {
    if (!scrapMaterial || !scrapQuantity) return;
    const qty = parseFloat(scrapQuantity);
    if (qty <= 0 || qty > scrapMaterial.totalQuantitySent) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const result = (await (onScrapMaterial?.(scrapMaterial.id, qty, {
      clientRequestId: scrapMovementIdRef.current ?? undefined,
    }) ?? Promise.resolve({ ok: true }))) as { ok: boolean; error?: string };
    if (!result.ok) {
      toast({ title: "Scrap Failed", description: result.error || "Unable to scrap material", variant: "destructive" });
      return;
    }
    toast({ title: "Material Scrapped", description: `${qty} ${scrapMaterial.unit} of ${scrapMaterial.name} marked as scrap at site` });
    setScrapMaterial(null);
    setScrapQuantity("");
    setIsScrapModalOpen(false);
  };

  const handleOpenConsume = (material: MaterialItem) => {
    setConsumeMaterial(material);
    setConsumeQuantity("");
    setIsConsumeModalOpen(true);
  };

  const handleConfirmConsume = async () => {
    if (!consumeMaterial || !consumeQuantity) return;
    const qty = parseFloat(consumeQuantity);
    if (qty <= 0 || qty > consumeMaterial.totalQuantitySent) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const result = (await (onConsumeMaterial?.(consumeMaterial.id, qty, {
      clientRequestId: consumeMovementIdRef.current ?? undefined,
    }) ?? Promise.resolve({ ok: true }))) as { ok: boolean; error?: string };
    if (!result.ok) {
      toast({ title: "Consumption Failed", description: result.error || "Unable to record consumption", variant: "destructive" });
      return;
    }
    toast({ title: "Consumption Recorded", description: `${qty} ${consumeMaterial.unit} of ${consumeMaterial.name} marked consumed at site` });
    setConsumeMaterial(null);
    setConsumeQuantity("");
    setIsConsumeModalOpen(false);
  };

  const getStatusBadge = (status: MatchStatus, difference: number) => {
    switch (status) {
      case "match":
        return <Badge className="bg-primary/10 text-primary border-0 flex items-center gap-1"><Check className="w-3 h-3" /> Match</Badge>;
      case "over":
        return <Badge className="bg-destructive/10 text-destructive border-0 flex items-center gap-1"><ArrowUp className="w-3 h-3" /> +{difference} Over</Badge>;
      case "under":
        return <Badge className="bg-warning/10 text-warning border-0 flex items-center gap-1"><ArrowDown className="w-3 h-3" /> {difference} Under</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Not in Preset</Badge>;
    }
  };

  // Check if an item allows decimal return
  const getAllowDecimal = (material: MaterialItem): boolean => {
    const invItem = globalInventoryItems.find(i => i.id === material.id);
    return invItem?.allowDecimalReturn || false;
  };

  return (
    <div className="space-y-6">
      {/* Site Checklist — planned vs sent comparison driven by per-project checklist */}
      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Site Checklist
            <Badge variant="outline" className="ml-1 font-normal text-2xs">
              {siteChecklist.length} item{siteChecklist.length === 1 ? "" : "s"}
            </Badge>
          </CardTitle>
          {isSuperAdmin && onUpdateSiteChecklist && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAttachTemplateId("");
                  setIsAttachTemplateOpen(true);
                }}
                disabled={siteChecklistTemplates.length === 0}
                title={siteChecklistTemplates.length === 0 ? "No templates available" : undefined}
              >
                Attach template
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewChecklistName("");
                  setNewChecklistUnit("pcs");
                  setNewChecklistQty("");
                  setIsAddChecklistItemOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {siteChecklist.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No site checklist attached to this project yet. The checklist seeds from the linked quotation's BOM when the project is created.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Item</th>
                  <th className="px-4 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Source</th>
                  <th className="px-4 py-2 text-right text-2xs uppercase tracking-wide text-muted-foreground">Planned</th>
                  <th className="px-4 py-2 text-right text-2xs uppercase tracking-wide text-muted-foreground">Sent</th>
                  <th className="px-4 py-2 text-right text-2xs uppercase tracking-wide text-muted-foreground">Delta</th>
                  <th className="px-4 py-2 text-right text-2xs uppercase tracking-wide text-muted-foreground">Returned</th>
                  <th className="px-4 py-2 text-right text-2xs uppercase tracking-wide text-muted-foreground">Consumed</th>
                  <th className="px-4 py-2 text-left text-2xs uppercase tracking-wide text-muted-foreground">Status</th>
                  {isSuperAdmin && onUpdateSiteChecklist && <th className="w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {siteChecklist.map((item) => {
                  const status =
                    item.qtySent >= item.qtyPlanned
                      ? "Fully sent"
                      : item.qtySent > 0
                        ? "Partially sent"
                        : "Pending";
                  const statusTone =
                    item.qtySent >= item.qtyPlanned
                      ? "border-success/30 bg-success/10 text-success"
                      : item.qtySent > 0
                        ? "border-warning/30 bg-warning/10 text-warning"
                        : "border-border bg-muted text-muted-foreground";
                  // Resolve source: explicit `source` first, then legacy markers, default "quotation".
                  const resolvedSource: "quotation" | "template" | "manual" =
                    item.source
                      ?? (item.addedByOverride ? "manual" : item.sourceTemplateId ? "template" : "quotation");
                  const delta = item.qtyPlanned - item.qtySent;
                  const deltaChip =
                    delta === 0
                      ? { label: "OK", className: "bg-success/10 text-success border-success/30" }
                      : delta > 0
                        ? { label: `Short ${delta}`, className: "bg-warning/10 text-warning border-warning/30" }
                        : { label: `Over ${-delta}`, className: "bg-destructive/10 text-destructive border-destructive/30" };
                  return (
                    <tr key={item.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-2">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-2xs text-muted-foreground">
                          {item.unit}
                          {item.category ? ` · ${item.category}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2">
                        {resolvedSource === "quotation" && (
                          <Badge variant="outline" className="text-2xs bg-primary/10 text-primary border-primary/30">Quot</Badge>
                        )}
                        {resolvedSource === "template" && (
                          <Badge variant="outline" className="text-2xs bg-accent/30 text-accent-foreground border-accent/40">
                            {item.sourceTemplateName ? `Tmpl · ${item.sourceTemplateName}` : "Template"}
                          </Badge>
                        )}
                        {resolvedSource === "manual" && (
                          <Badge variant="outline" className="text-2xs bg-warning/10 text-warning border-warning/30">
                            {item.addedByEmployeeName
                              ? `Manual · ${item.addedByEmployeeName}`
                              : `Manual · ${currentRole.replace("_", " ")}`}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.qtyPlanned}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.qtySent}</td>
                      <td className="px-4 py-2 text-right">
                        <Badge variant="outline" className={`text-2xs ${deltaChip.className}`}>{deltaChip.label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.qtyReturned}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{item.qtyConsumed}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className={`text-2xs ${statusTone}`}>{status}</Badge>
                      </td>
                      {isSuperAdmin && onUpdateSiteChecklist && (
                        <td className="px-2 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            title="Remove from checklist"
                            onClick={() => onUpdateSiteChecklist(siteChecklist.filter((i) => i.id !== item.id))}
                          >
                            <RotateCcw className="h-3.5 w-3.5 rotate-180" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Materials Sent to Site</h2>
          <p className="text-sm text-muted-foreground">
            Total Value: <span className="text-primary font-semibold">₹{totalValue.toLocaleString()}</span>
            {presetItems.length > 0 && (
              <span className="ml-2">• Matched against {presetItems.length} preset items</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <Button onClick={handleOpenIssueModal}>
              <Send className="w-4 h-4 mr-2" />
              Issue Selected ({selectedItems.size})
            </Button>
          )}
        </div>
      </div>

      {/* Materials by Category */}
      {materialsWithStatus.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No materials sent to this project yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMaterials).map(([category, catMaterials]) => {
            const isCollapsed = collapsedCategories.has(category);
            const catValue = catMaterials.reduce((s, m) => s + (m.totalQuantitySent * m.unitPrice), 0);
            
            return (
              <Collapsible key={category} open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <h3 className="font-semibold text-sm">{category}</h3>
                      <Badge variant="secondary" className="text-xs">{catMaterials.length} items</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">₹{catValue.toLocaleString()}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 mt-3">
                    {catMaterials.map((material) => {
                      const isSelected = selectedItems.has(material.id);
                      const { status, preset, difference } = material.matchInfo;
                      
                      return (
                        <Card 
                          key={material.id} 
                          className={`transition-all ${isSelected ? "border-primary/50 bg-primary/5" : "hover:border-primary/30"}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="pt-1">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleSelectItem(material.id, !!checked)}
                                />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <h3 className="font-semibold text-base">{material.name}</h3>
                                      {getStatusBadge(status, difference)}
                                      {getDamageByItem(material.id).length > 0 && (
                                        <Badge variant="outline" className="text-2xs border-accent/40 text-accent-foreground">
                                          Damage {getDamageByItem(material.id).length}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {preset && (
                                      <p className="text-xs text-muted-foreground mb-2">
                                        Preset requires: {preset.quantity} {preset.unit || material.unit}
                                      </p>
                                    )}
                                    {(() => {
                                      const ex = findExecutionLineForMaterial(material.id, material.name, executionLineItems);
                                      if (!ex) return null;
                                      const vsBoq = material.totalQuantitySent - ex.quantity;
                                      return (
                                        <p
                                          className={`text-xs mb-2 ${
                                            vsBoq === 0 ? "text-muted-foreground" : vsBoq > 0 ? "text-warning" : "text-primary"
                                          }`}
                                        >
                                          BOQ {ex.quantity} {ex.unit} • Ledger issued {ex.issuedQty} • On-site sent {material.totalQuantitySent}
                                          {vsBoq !== 0 && (
                                            <span className="font-medium"> ({vsBoq > 0 ? "+" : ""}{vsBoq} vs BOQ qty)</span>
                                          )}
                                        </p>
                                      );
                                    })()}
                                    
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {material.issues.map((issue, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs font-normal">
                                          <Calendar className="w-3 h-3 mr-1" />
                                          {formatUiDate(issue.date, "dd MMM")}: <span className="font-medium ml-1">{issue.quantity}</span>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right shrink-0">
                                    <div className="flex items-baseline gap-2 justify-end">
                                      <span className="text-2xl font-bold">{material.totalQuantitySent}</span>
                                      <span className="text-sm text-muted-foreground">{material.unit}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      @ ₹{material.unitPrice.toLocaleString()}/{material.unit}
                                    </p>
                                    <p className="text-base font-semibold text-primary mt-1">
                                      ₹{(material.totalQuantitySent * material.unitPrice).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Actions Row — primary inline; secondary in More menu below md (O12) */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2 flex-wrap">
                                  <div className="flex flex-wrap gap-2 items-center min-w-0">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenSendMore(material)}>
                                      <Plus className="w-3 h-3 mr-1" /> Send More
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="md:hidden shrink-0">
                                          <MoreHorizontal className="w-3.5 h-3.5 mr-1" />
                                          More
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-52">
                                        <DropdownMenuItem onClick={() => handleOpenReturn(material)}>
                                          <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                          Return unused
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenConsume(material)}>
                                          <Check className="w-3.5 h-3.5 mr-2" />
                                          Consume
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenScrap(material)}>
                                          <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                                          Scrap
                                        </DropdownMenuItem>
                                        {projectId ? (
                                          <DropdownMenuItem
                                            onClick={() =>
                                              setDamageSheet({
                                                itemId: material.id,
                                                itemName: material.name,
                                                unitPrice: material.unitPrice,
                                              })
                                            }
                                          >
                                            <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                                            Report damage
                                          </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleSelectItem(material.id, !isSelected)}>
                                          {isSelected ? "Remove from issue list" : "Add to issue list"}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hidden md:inline-flex"
                                      onClick={() => handleOpenReturn(material)}
                                    >
                                      <RotateCcw className="w-3 h-3 mr-1" /> Return Unused
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hidden md:inline-flex"
                                      onClick={() => handleOpenConsume(material)}
                                    >
                                      <Check className="w-3 h-3 mr-1" /> Consume
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hidden md:inline-flex"
                                      onClick={() => handleOpenScrap(material)}
                                    >
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Scrap
                                    </Button>
                                    {projectId && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="hidden md:inline-flex border-accent/30 text-accent-foreground"
                                        onClick={() =>
                                          setDamageSheet({
                                            itemId: material.id,
                                            itemName: material.name,
                                            unitPrice: material.unitPrice,
                                          })
                                        }
                                      >
                                        <ShieldAlert className="w-3 h-3 mr-1" /> Report damage
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="hidden md:inline-flex"
                                      onClick={() => handleSelectItem(material.id, !isSelected)}
                                    >
                                      {isSelected ? "Remove from Issue List" : "Add to Issue List"}
                                    </Button>
                                  </div>
                                  
                                  {isSelected && (
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs">Issue Qty:</Label>
                                      <Input
                                        type="number"
                                        className="w-20 h-8 text-center"
                                        value={issuingItems[material.id] || 1}
                                        min={1}
                                        onChange={(e) => handleQuantityChange(material.id, parseInt(e.target.value) || 1)}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Tools Assigned Section */}
      {toolsAssigned.length > 0 && (
        <Collapsible open={isToolsSectionOpen} onOpenChange={setIsToolsSectionOpen}>
          <Card className="mt-6">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Tools Assigned to Site</CardTitle>
                    <Badge variant="secondary" className="ml-2">{toolsAssigned.length}</Badge>
                  </div>
                  {isToolsSectionOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <DataTableShell
                  maxHeight={listTableViewportMaxHeight(toolsPageSize)}
                  scrollResetKey={`${safeToolsPage}-${toolsPageSize}-${toolsAssigned.length}`}
                  footer={
                    <TablePaginationBar
                      page={safeToolsPage}
                      pageSize={toolsPageSize}
                      total={toolsAssigned.length}
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
                      <TableHead>Tool Name</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date Issued</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedTools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell className="font-medium">{tool.name}</TableCell>
                        <TableCell>{tool.assignedTo}</TableCell>
                        <TableCell>{tool.dateIssued}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              tool.status === "Returned"
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-warning/30 bg-warning/10 text-warning"
                            }
                          >
                            {tool.status || "In Use"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </DataTableShell>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Issue Confirmation Modal - with expense & task assignment options */}
      <Sheet open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" /> Confirm Issue
            </SheetTitle>
            <SheetDescription>Review items to be issued to {projectName}</SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Items Summary */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Array.from(selectedItems).map(id => {
                const material = materials.find(m => m.id === id);
                if (!material) return null;
                const qty = issuingItems[id] || 1;
                return (
                  <div key={id} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                    <span className="text-sm">{material.name}</span>
                    <span className="font-medium">Qty: {qty}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Issue Notes */}
            <div className="space-y-2">
              <Label>Issue Notes (Optional)</Label>
              <Textarea placeholder="Add notes for this issue..." value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} rows={2} />
            </div>
            
            {/* Add Expense Option */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="add-expense" checked={addExpenseWithIssue} onCheckedChange={(checked) => setAddExpenseWithIssue(!!checked)} />
                <Label htmlFor="add-expense" className="cursor-pointer">Add related expense (transport, etc.)</Label>
              </div>
              
              {addExpenseWithIssue && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Expense Type</Label>
                      <Select value={expenseType} onValueChange={setExpenseType}>
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
                      <Input type="number" className="h-8" placeholder="0" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
                    </div>
                  </div>
                  <Input placeholder="Expense notes (optional)" value={expenseNotes} onChange={(e) => setExpenseNotes(e.target.value)} className="h-8 text-sm" />
                </div>
              )}
            </div>
            
            {/* Assign Transport Task Option */}
            <div className="space-y-3 p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox id="assign-task" checked={assignTaskWithIssue} onCheckedChange={(checked) => setAssignTaskWithIssue(!!checked)} />
                <Label htmlFor="assign-task" className="cursor-pointer flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Assign transport task to someone
                </Label>
              </div>
              
              {assignTaskWithIssue && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Assign To *</Label>
                      <Select value={taskAssignee} onValueChange={setTaskAssignee}>
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
                      <Input type="date" className="h-8" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                    </div>
                  </div>
                  <Textarea placeholder="Task notes (optional)" value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} rows={2} className="text-sm" />
                </div>
              )}
            </div>
          </div>
          
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsIssueModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmIssue}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Issue
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Send More Modal */}
      <Sheet open={isSendMoreModalOpen} onOpenChange={setIsSendMoreModalOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Send More</SheetTitle>
            <SheetDescription>{selectedMaterialForSendMore?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Sent:</span>
                <span className="font-medium">{selectedMaterialForSendMore?.totalQuantitySent} {selectedMaterialForSendMore?.unit}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Send</Label>
              <Input type="number" placeholder="Enter quantity" value={sendMoreQuantity} onChange={(e) => setSendMoreQuantity(e.target.value)} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsSendMoreModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmSendMore} disabled={!sendMoreQuantity}>
              <Send className="w-4 h-4 mr-2" /> Send
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Return to Warehouse Modal */}
      <Sheet open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" /> Return to Warehouse
            </SheetTitle>
            <SheetDescription>{returnMaterial?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Issued:</span>
                <span className="font-medium">{returnMaterial?.totalQuantitySent} {returnMaterial?.unit}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Return Quantity</Label>
              <Input 
                type="number" 
                placeholder="Enter quantity to return" 
                value={returnQuantity} 
                onChange={(e) => setReturnQuantity(e.target.value)}
                step={returnMaterial && getAllowDecimal({ ...returnMaterial }) ? "0.1" : "1"}
                max={returnMaterial?.totalQuantitySent}
                min={0}
              />
              {returnMaterial && getAllowDecimal({ ...returnMaterial }) && (
                <p className="text-xs text-muted-foreground">Decimal values allowed for this item</p>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmReturn} disabled={!returnQuantity || parseFloat(returnQuantity) <= 0}>
              <RotateCcw className="w-4 h-4 mr-2" /> Confirm Return
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Scrap at Site Modal */}
      <Sheet open={isScrapModalOpen} onOpenChange={setIsScrapModalOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Scrap at Site</SheetTitle>
            <SheetDescription>{scrapMaterial?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <Label>Scrap Quantity</Label>
            <Input type="number" value={scrapQuantity} onChange={(e) => setScrapQuantity(e.target.value)} min={0} />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsScrapModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmScrap} disabled={!scrapQuantity || parseFloat(scrapQuantity) <= 0}>Confirm Scrap</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {/* Consumption Modal */}
      <Sheet open={isConsumeModalOpen} onOpenChange={setIsConsumeModalOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Record Site Consumption</SheetTitle>
            <SheetDescription>{consumeMaterial?.name}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <Label>Consumed Quantity</Label>
            <Input type="number" value={consumeQuantity} onChange={(e) => setConsumeQuantity(e.target.value)} min={0} />
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsConsumeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmConsume} disabled={!consumeQuantity || parseFloat(consumeQuantity) <= 0}>Record</Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      {projectId && damageSheet && (
        <MaterialDamageSheet
          open={Boolean(damageSheet)}
          onOpenChange={(open) => !open && setDamageSheet(null)}
          projectId={projectId}
          projectName={projectName}
          itemId={damageSheet.itemId}
          itemName={damageSheet.itemName}
          defaultUnitCost={damageSheet.unitPrice}
          onReported={() => setDamageSheet(null)}
        />
      )}

      <Sheet open={isAddChecklistItemOpen} onOpenChange={setIsAddChecklistItemOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Add custom checklist item</SheetTitle>
            <SheetDescription>Adds an item to this project's site checklist only — does not affect the master inventory.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Item name</Label>
              <Input
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                placeholder="e.g. extra fasteners"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={newChecklistUnit} onValueChange={setNewChecklistUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">pcs</SelectItem>
                  <SelectItem value="m">m</SelectItem>
                  <SelectItem value="foot">foot</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Planned quantity</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={newChecklistQty}
                onChange={(e) => setNewChecklistQty(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAddChecklistItemOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!onUpdateSiteChecklist) return;
                const name = newChecklistName.trim();
                const qty = Number(newChecklistQty);
                if (!name || !Number.isFinite(qty) || qty <= 0) return;
                const actorLabel = currentRole.replace("_", " ");
                const newItem: ProjectSiteChecklistItem = {
                  id: `cl-${Date.now()}`,
                  name,
                  unit: newChecklistUnit,
                  qtyPlanned: qty,
                  qtySent: 0,
                  qtyReturned: 0,
                  qtyConsumed: 0,
                  addedByOverride: true,
                  source: "manual",
                  addedByEmployeeName: actorLabel,
                  addedAt: new Date().toISOString(),
                };
                onUpdateSiteChecklist([...siteChecklist, newItem]);
                setIsAddChecklistItemOpen(false);
              }}
            >
              Add item
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>

      <Sheet open={isAttachTemplateOpen} onOpenChange={setIsAttachTemplateOpen}>
        <AppSheetContent layout="form" size="md">
          <SheetHeader>
            <SheetTitle>Attach site checklist template</SheetTitle>
            <SheetDescription>
              Appends items from the selected template. Existing rows are kept; duplicate items (by name + unit) bump <span className="font-medium">qtyPlanned</span> to the higher of the two.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={attachTemplateId || "__none__"} onValueChange={(v) => setAttachTemplateId(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Pick a template</SelectItem>
                  {siteChecklistTemplates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name} · {tpl.segment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {attachTemplateId && (() => {
              const tpl = siteChecklistTemplates.find((t) => t.id === attachTemplateId);
              if (!tpl) return null;
              return (
                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <p className="font-medium mb-2">{tpl.items.length} item{tpl.items.length === 1 ? "" : "s"} in this template</p>
                  <ul className="space-y-1 max-h-40 overflow-auto">
                    {tpl.items.map((it) => (
                      <li key={`${it.inventoryItemId}-${it.name}`} className="flex justify-between">
                        <span>{it.name}</span>
                        <span className="text-muted-foreground">{it.quantity} {it.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
          <SheetFooter className="mt-6 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAttachTemplateOpen(false)}>Cancel</Button>
            <Button
              disabled={!attachTemplateId}
              onClick={() => {
                if (!onUpdateSiteChecklist || !attachTemplateId) return;
                const tpl = siteChecklistTemplates.find((t) => t.id === attachTemplateId);
                if (!tpl) return;
                const now = new Date().toISOString();
                const actorLabel = currentRole.replace("_", " ");
                const merged: ProjectSiteChecklistItem[] = [...siteChecklist];
                tpl.items.forEach((it, idx) => {
                  const dupIdx = merged.findIndex(
                    (x) => x.name.toLowerCase() === it.name.toLowerCase() && x.unit === it.unit,
                  );
                  if (dupIdx >= 0) {
                    merged[dupIdx] = {
                      ...merged[dupIdx],
                      qtyPlanned: Math.max(merged[dupIdx].qtyPlanned, it.quantity),
                    };
                  } else {
                    merged.push({
                      id: `cl-${Date.now()}-${idx}`,
                      name: it.name,
                      unit: it.unit,
                      qtyPlanned: it.quantity,
                      qtySent: 0,
                      qtyReturned: 0,
                      qtyConsumed: 0,
                      source: "template",
                      sourceTemplateId: tpl.id,
                      sourceTemplateName: tpl.name,
                      addedByEmployeeName: actorLabel,
                      addedAt: now,
                    });
                  }
                });
                onUpdateSiteChecklist(merged);
                setIsAttachTemplateOpen(false);
              }}
            >
              Attach
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </div>
  );
}

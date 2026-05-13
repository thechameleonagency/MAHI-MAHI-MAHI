import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NeedToGetService,
  aggregateNeedToGetRows,
  countActiveSitesByProjectId,
  needToGetLocationLabel as needToGetLocationLabelFn,
  type NeedToGetRow,
  type NeedToGetViewRow,
  type NeedToGetGroupMode,
} from "@/application/services/NeedToGetService";
import { AppSheetContent, AppSheetHeaderWithActions } from "@/components/shared/AppSheetLayout";
import { dataTableClasses, DEFAULT_TABLE_PAGE_SIZE, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { useAppData } from "@/contexts/AppDataContext";
import { ChevronDown, Download, Printer, Share2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type NeedToGetModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GROUP_LABELS: Record<NeedToGetGroupMode, string> = {
  flat: "Flat list",
  project: "By project",
  site: "By site",
  material: "By material",
  needBy: "By need-by date",
};

/** Explains how rows merge for the selected mode (shown under filters). */
const GROUP_MERGE_HINT: Record<NeedToGetGroupMode, string> = {
  flat:
    "One row per site, material, and need-by date. Duplicate checklist lines at the same site collapse into one quantity.",
  project:
    "Combines rows inside each project when material and need-by date match (multiple sites roll into one line per project).",
  site:
    "Combines duplicate keys within the same site only (same material + same need-by date).",
  material:
    "Totals each material across the current filter. Need-by shows the earliest date among merged lines.",
  needBy:
    "Combines the same material on the same need-by date across projects and sites.",
};

function digitsForWhatsApp(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.startsWith("91") && d.length >= 12) return d;
  return d;
}

function buildNeedToGetPdf(rows: NeedToGetViewRow[]): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 10;
  let y = 14;
  pdf.setFontSize(12);
  pdf.text("Need to Get — procurement shortfalls", margin, y);
  y += 7;
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(`Generated ${format(new Date(), "yyyy-MM-dd HH:mm")}`, margin, y);
  y += 8;
  pdf.setTextColor(0);

  const lineH = 5;
  const pageBottom = 285;

  pdf.setFont("helvetica", "bold");
  pdf.text("Material", margin, y);
  pdf.text("Where", margin + 58, y);
  pdf.text("Qty", margin + 112, y);
  pdf.text("Need by", margin + 124, y);
  pdf.text("Rate", margin + 156, y);
  pdf.text("Est.", margin + 176, y);
  y += lineH;
  pdf.setDrawColor(200);
  pdf.line(margin, y - 1, pdf.internal.pageSize.getWidth() - margin, y - 1);
  y += 3;
  pdf.setFont("helvetica", "normal");

  for (const r of rows) {
    if (y > pageBottom) {
      pdf.addPage();
      y = 14;
    }
    const loc = r.displayWhere;
    const lineEst = r.rowKind === "nonMaterial" ? 0 : r.qtyShort * r.lastPurchaseRate;
    const qtyCell = r.rowKind === "nonMaterial" ? "—" : String(r.qtyShort);
    pdf.text(r.materialName.substring(0, 28), margin, y);
    pdf.text(loc.substring(0, 26), margin + 58, y);
    pdf.text(qtyCell, margin + 112, y);
    pdf.text(r.needByDate, margin + 124, y);
    pdf.text(r.rowKind === "nonMaterial" ? "—" : `Rs ${r.lastPurchaseRate.toLocaleString("en-IN")}`, margin + 156, y);
    pdf.text(r.rowKind === "nonMaterial" ? "—" : `Rs ${lineEst.toLocaleString("en-IN")}`, margin + 176, y);
    y += lineH;
  }

  return pdf.output("blob");
}

function openPrintWindow(title: string, rows: NeedToGetViewRow[]) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    toast({ title: "Pop-up blocked", description: "Allow pop-ups to print the table.", variant: "destructive" });
    return;
  }
  const rowsHtml = rows
    .map((r) => {
      const loc = escapeHtml(r.displayWhere);
      const est = r.rowKind === "nonMaterial" ? 0 : r.qtyShort * r.lastPurchaseRate;
      const qty = r.rowKind === "nonMaterial" ? "—" : String(r.qtyShort);
      const rate = r.rowKind === "nonMaterial" ? "—" : `₹${r.lastPurchaseRate.toLocaleString("en-IN")}`;
      const estStr = r.rowKind === "nonMaterial" ? "—" : `₹${est.toLocaleString("en-IN")}`;
      return `<tr><td class="mat">${escapeHtml(r.materialName)}</td><td class="muted">${loc}</td><td class="num">${qty}</td><td>${escapeHtml(r.needByDate)}</td><td class="num">${rate}</td><td class="num">${estStr}</td></tr>`;
    })
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:16px;font-size:12px}
    h1{font-size:16px;margin:0 0 12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:6px;text-align:left}
    th{background:#f3f3f3;font-weight:600}
    td.num,th:nth-child(n+3){text-align:right}
    td.mat{font-weight:600}
    td.muted{color:#444;font-size:11px}
  </style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <table><thead><tr><th>Material</th><th>Where</th><th>Qty short</th><th>Need by</th><th>Unit rate</th><th>Est. ₹</th></tr></thead>
  <tbody>${rowsHtml}</tbody></table>
  </body></html>`);
  w.document.close();
  const runPrint = () => {
    w.focus();
    w.print();
  };
  if (w.document.readyState === "complete") {
    window.setTimeout(runPrint, 0);
  } else {
    w.addEventListener("load", () => window.setTimeout(runPrint, 0));
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function needToGetOrderedRowKey(r: NeedToGetViewRow) {
  return `${r.projectId}|${r.siteId}|${r.materialId}|${r.needByDate}`;
}

export function NeedToGetModal({ open, onOpenChange }: NeedToGetModalProps) {
  const { sites, projects, inventoryItems, vendorBills, employees, vendors } = useAppData();
  const navigate = useNavigate();
  const service = useMemo(() => new NeedToGetService(), []);

  const allRows = useMemo(
    () => service.buildRows(sites, projects, inventoryItems, vendorBills),
    [service, sites, projects, inventoryItems, vendorBills],
  );

  const activeSitesPerProject = useMemo(() => countActiveSitesByProjectId(sites), [sites]);

  const getLocationLabel = useCallback(
    (row: NeedToGetRow) => needToGetLocationLabelFn(row, activeSitesPerProject, projects),
    [activeSitesPerProject, projects],
  );

  const [projectFilter, setProjectFilter] = useState<string[]>([]);
  const [siteFilter, setSiteFilter] = useState<number[]>([]);
  const [materialFilter, setMaterialFilter] = useState<number[]>([]);
  const [needByBefore, setNeedByBefore] = useState("");
  const [groupMode, setGroupMode] = useState<NeedToGetGroupMode>("flat");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmployeeId, setShareEmployeeId] = useState<string>("");
  const [sharePhone, setSharePhone] = useState("");
  const [shareNote, setShareNote] = useState("");
  /** Ordered rows persisted to localStorage so marks survive modal close/reload. */
  const [orderedKeys, setOrderedKeys] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("mss.needToGet.ordered") || "[]")); } catch { return new Set(); }
  });

  const projectOptions = useMemo(() => {
    const s = new Set<string>();
    allRows.forEach((r) => {
      if (r.projectId) s.add(r.projectId);
    });
    return [...s].sort();
  }, [allRows]);

  /** Sites constrained to rows visible under current project filter (subset of selected projects). */
  const siteOptions = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of allRows) {
      if (projectFilter.length > 0 && !projectFilter.includes(r.projectId)) continue;
      m.set(r.siteId, r.siteName);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows, projectFilter]);

  const allowedSiteIds = useMemo(() => new Set(siteOptions.map(([id]) => id)), [siteOptions]);

  useEffect(() => {
    setSiteFilter((prev) => {
      const next = prev.filter((id) => allowedSiteIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [allowedSiteIds]);

  const materialOptions = useMemo(() => {
    const m = new Map<number, string>();
    allRows.forEach((r) => m.set(r.materialId, r.materialName));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allRows]);

  const filtered = useMemo(() => {
    return allRows.filter((r) => {
      if (projectFilter.length && !projectFilter.includes(r.projectId)) return false;
      if (siteFilter.length && !siteFilter.includes(r.siteId)) return false;
      if (materialFilter.length && !materialFilter.includes(r.materialId)) return false;
      if (needByBefore && r.needByDate > needByBefore) return false;
      return true;
    });
  }, [allRows, projectFilter, siteFilter, materialFilter, needByBefore]);

  const displayRows = useMemo(
    () => aggregateNeedToGetRows(filtered, groupMode, getLocationLabel),
    [filtered, groupMode, getLocationLabel],
  );

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayRows.slice(start, start + pageSize);
  }, [displayRows, page, pageSize]);

  /** Under “flat” grouping, first row of each location block gets a visual separator. */
  const rowBandForPage = useMemo(() => {
    return pageRows.map((r, i) => {
      if (groupMode !== "flat") return "default";
      if (i === 0) return "group-start";
      return r.displayWhere !== pageRows[i - 1].displayWhere ? "group-start" : "default";
    });
  }, [pageRows, groupMode]);

  const totalShortQty = useMemo(
    () => displayRows.reduce((s, r) => s + (r.rowKind === "nonMaterial" ? 0 : r.qtyShort), 0),
    [displayRows],
  );
  const nonMaterialCount = useMemo(
    () => displayRows.filter((r) => r.rowKind === "nonMaterial").length,
    [displayRows],
  );
  const totalValue = useMemo(
    () => displayRows.reduce((s, r) => s + (r.rowKind === "nonMaterial" ? 0 : r.qtyShort * r.lastPurchaseRate), 0),
    [displayRows],
  );

  const vendorsSorted = useMemo(
    () => [...vendors].sort((a, b) => a.name.localeCompare(b.name)),
    [vendors],
  );

  const canUseActions = displayRows.length >= 1;

  const toggleOrderedRow = (r: NeedToGetViewRow) => {
    const k = needToGetOrderedRowKey(r);
    setOrderedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      localStorage.setItem("mss.needToGet.ordered", JSON.stringify([...next]));
      return next;
    });
  };

  const clearOrderedRows = () => {
    setOrderedKeys(new Set());
    localStorage.removeItem("mss.needToGet.ordered");
  };

  const exportCsv = () => {
    if (!canUseActions) return;
    const header = ["Material", "Where", "Qty short", "Need by", "Last purch. rate", "Line est (₹)"];
    const lines = [
      header.join(","),
      ...displayRows.map((r) => {
        const isNm = r.rowKind === "nonMaterial";
        const qty = isNm ? "status" : r.qtyShort;
        const rate = isNm ? "" : r.lastPurchaseRate;
        const est = isNm ? "" : r.qtyShort * r.lastPurchaseRate;
        return [r.materialName, r.displayWhere, qty, r.needByDate, rate, est]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `need-to-get-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "CSV contains the current filtered table only." });
  };

  const exportPdf = () => {
    if (!canUseActions) return;
    const blob = buildNeedToGetPdf(displayRows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `need-to-get-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "PDF contains the current filtered table only." });
  };

  const printTable = () => {
    if (!canUseActions) return;
    openPrintWindow("Need to Get — procurement shortfalls", displayRows);
  };

  const handleShareSubmit = () => {
    if (!canUseActions) return;
    const blob = buildNeedToGetPdf(displayRows);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `need-to-get-${format(new Date(), "yyyy-MM-dd")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);

    const digits = digitsForWhatsApp(sharePhone.trim());
    const defaultMsg =
      shareNote.trim() ||
      "Need-to-Get procurement shortfall list — PDF downloaded to your device. Attach the downloaded file here to share.";
    if (digits.length < 10) {
      toast({
        title: "Enter a WhatsApp number",
        description: "Choose an employee or type a mobile number.",
        variant: "destructive",
      });
      return;
    }

    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(defaultMsg)}`, "_blank", "noopener,noreferrer");
    toast({
      title: "WhatsApp opened",
      description: "The PDF was saved to your downloads — attach it in WhatsApp if your client allows file sharing.",
    });
    setShareOpen(false);
  };

  const toggleProject = (id: string) => {
    setProjectFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPage(1);
  };
  const toggleSite = (id: number) => {
    setSiteFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPage(1);
  };
  const toggleMaterial = (id: number) => {
    setMaterialFilter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPage(1);
  };

  const filterTriggerClass =
    "h-9 justify-between gap-2 font-normal text-left border border-input bg-background px-3 text-sm hover:bg-accent/50";

  const selectedProjectLabel =
    projectFilter.length === 0
      ? "All projects"
      : `${projectFilter.length} project${projectFilter.length === 1 ? "" : "s"}`;
  const selectedSiteLabel =
    siteFilter.length === 0 ? "All sites" : `${siteFilter.length} site${siteFilter.length === 1 ? "" : "s"}`;
  const selectedMaterialLabel =
    materialFilter.length === 0
      ? "All materials"
      : `${materialFilter.length} material${materialFilter.length === 1 ? "" : "s"}`;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) clearOrderedRows();
          onOpenChange(v);
        }}
      >
        <AppSheetContent layout="document" size="wide" className="print:max-w-none">
          <AppSheetHeaderWithActions
            title="Need to Get — procurement shortfalls"
            description={<SheetDescription className="sr-only">Materials short vs warehouse stock; filters respect project-first site narrowing; export reflects the table only.</SheetDescription>}
            actions={
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={!canUseActions}>
                      <Download className="mr-1 h-4 w-4" />
                      Export
                      <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportCsv}>Export as CSV (table only)</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportPdf}>Export as PDF (table only)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button type="button" variant="outline" size="sm" disabled={!canUseActions} onClick={printTable}>
                  <Printer className="mr-1 h-4 w-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canUseActions}
                  onClick={() => {
                    setShareOpen(true);
                    setShareEmployeeId("");
                    setSharePhone("");
                    setShareNote("");
                  }}
                >
                  <Share2 className="mr-1 h-4 w-4" />
                  Share
                </Button>
              </>
            }
          />

          <p className="text-xs text-muted-foreground print:hidden">
            Multi-site projects show the site in &ldquo;Where&rdquo;; single-site projects show the project name. Filters: pick projects first, then
            sites. Status-only checklist lines (no SKU) appear with qty &ldquo;—&rdquo;; use vendor bill for material shortfalls only.
          </p>
          <p className="text-xs text-muted-foreground print:hidden">
            <span className="font-medium text-foreground/90">Row merge ({GROUP_LABELS[groupMode]}):</span> {GROUP_MERGE_HINT[groupMode]}
          </p>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={clearOrderedRows} disabled={orderedKeys.size === 0}>
              Clear ordered
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[9.5rem]", filterTriggerClass)} type="button">
                  Projects
                  <span className="truncate text-muted-foreground">· {selectedProjectLabel}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-xs font-medium">Projects</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setProjectFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-52 p-2">
                  <div className="space-y-1.5">
                    {projectOptions.map((pid) => (
                      <label key={pid} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox checked={projectFilter.includes(pid)} onCheckedChange={() => toggleProject(pid)} />
                        <span className="min-w-0">{projects.find((p) => p.id === pid)?.name || pid}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[9.5rem]", filterTriggerClass)} type="button">
                  Sites
                  <span className="truncate text-muted-foreground">· {selectedSiteLabel}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-xs font-medium">Sites</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSiteFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-52 p-2">
                  {siteOptions.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">
                      {projectFilter.length ? "No shortfall rows under selected projects — clear project filter." : "No sites."}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {siteOptions.map(([sid, name]) => (
                        <label key={sid} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox checked={siteFilter.includes(sid)} onCheckedChange={() => toggleSite(sid)} />
                          <span className="min-w-0">{name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[10rem]", filterTriggerClass)} type="button">
                  Materials
                  <span className="truncate text-muted-foreground">· {selectedMaterialLabel}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <span className="text-xs font-medium">Materials</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setMaterialFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-52 p-2">
                  <div className="space-y-1.5">
                    {materialOptions.map(([mid, name]) => (
                      <label key={mid} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox checked={materialFilter.includes(mid)} onCheckedChange={() => toggleMaterial(mid)} />
                        <span className="min-w-0">{name}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[10rem]", filterTriggerClass)} type="button">
                  Need-by date
                  <span className="truncate text-muted-foreground">
                    {needByBefore ? `≤ ${needByBefore}` : "Any"}
                  </span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-2">
                  <Label className="text-xs">Need-by on or before</Label>
                  <Input
                    type="date"
                    value={needByBefore}
                    onChange={(e) => {
                      setNeedByBefore(e.target.value);
                      setPage(1);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      setNeedByBefore("");
                      setPage(1);
                    }}
                  >
                    Clear date filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("min-w-[10rem]", filterTriggerClass)} type="button">
                  Group / sort
                  <span className="truncate text-muted-foreground">· {GROUP_LABELS[groupMode]}</span>
                  <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="border-b px-3 py-2 text-xs font-medium">Group / sort view</div>
                <div className="flex flex-col p-2">
                  {(Object.keys(GROUP_LABELS) as NeedToGetGroupMode[]).map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={groupMode === mode ? "secondary" : "ghost"}
                      size="sm"
                      className="justify-start font-normal"
                      onClick={() => {
                        setGroupMode(mode);
                        setPage(1);
                      }}
                    >
                      {GROUP_LABELS[mode]}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <DataTableShell
            variant="inline" className="print:border-0"
            maxHeight={listTableViewportMaxHeight(pageSize)}
            scrollResetKey={`${page}-${pageSize}-${displayRows.length}`}
            footer={
              <div className="print:hidden">
                <TablePaginationBar
                  page={page}
                  pageSize={pageSize}
                  total={displayRows.length}
                  onPageChange={setPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                  }}
                />
              </div>
            }
          >
            <TableHeader>
                <TableRow className={dataTableClasses.headRow}>
                  <TableHead className="w-[4.5rem] text-center">Ordered</TableHead>
                  <TableHead className="min-w-[8.5rem]">Material</TableHead>
                  <TableHead className="min-w-[9rem]">Where</TableHead>
                  <TableHead className="text-right">Short qty</TableHead>
                  <TableHead>Need by</TableHead>
                  <TableHead className="text-right">₹ / unit</TableHead>
                  <TableHead className="text-right">Est. ₹</TableHead>
                  <TableHead className="w-[7rem] print:hidden">Bill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No shortfalls for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pageRows.map((r, idx) => {
                    const band = rowBandForPage[idx];
                    const isNonMaterial = r.rowKind === "nonMaterial";
                    const lineVal = isNonMaterial ? 0 : r.qtyShort * r.lastPurchaseRate;
                    const oKey = needToGetOrderedRowKey(r);
                    const isOrdered = orderedKeys.has(oKey);
                    return (
                      <TableRow
                        key={`${r.materialId}-${r.displayWhere}-${r.needByDate}-${idx}`}
                        className={cn(
                          "hover:bg-muted/30",
                          groupMode === "flat" &&
                            band === "group-start" &&
                            !(page === 1 && idx === 0) &&
                            "border-t-2 border-t-border/70 bg-muted/15",
                        )}
                      >
                        <TableCell className="align-top">
                          <div className="flex flex-col items-center gap-1 pt-0.5">
                            <Checkbox
                              checked={isOrdered}
                              onCheckedChange={() => toggleOrderedRow(r)}
                              aria-label="Mark line as ordered"
                            />
                            {isOrdered ? (
                              <Badge className="border-0 bg-emerald-600/15 px-1.5 py-0 text-[9px] font-semibold uppercase text-emerald-700">
                                Ordered
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium leading-snug">{r.materialName}</span>
                            {isNonMaterial ? (
                              <Badge variant="outline" className="w-fit text-2xs font-normal">
                                Checklist (no SKU)
                              </Badge>
                            ) : null}
                            {r.mergedCount != null && r.mergedCount > 1 ? (
                              <span className="text-2xs text-muted-foreground/90">
                                {r.mergedCount} demand lines merged
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-muted-foreground">
                          <span className="text-sm leading-snug">{r.displayWhere}</span>
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums font-medium">
                          {isNonMaterial ? "—" : r.qtyShort}
                        </TableCell>
                        <TableCell className="align-top">{r.needByDate}</TableCell>
                        <TableCell className="text-right align-top tabular-nums">
                          {isNonMaterial ? "—" : `₹${r.lastPurchaseRate.toLocaleString("en-IN")}`}
                        </TableCell>
                        <TableCell className="text-right align-top tabular-nums font-medium">
                          {isNonMaterial ? "—" : `₹${lineVal.toLocaleString("en-IN")}`}
                        </TableCell>
                        <TableCell className="align-top print:hidden">
                          {!isNonMaterial && r.materialId > 0 && vendorsSorted.length > 0 ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                                  Vendor bill
                                  <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="max-h-56 overflow-y-auto">
                                {vendorsSorted.map((v) => (
                                  <DropdownMenuItem
                                    key={v.id}
                                    onClick={() => {
                                      const q = encodeURIComponent(String(r.qtyShort));
                                      const pid = encodeURIComponent(r.projectId || "");
                                      navigate(
                                        `/vendors/${v.id}?action=add-purchase&inventoryItemId=${r.materialId}&qty=${q}&projectId=${pid}`,
                                      );
                                      toast({
                                        title: "Opening vendor",
                                        description: `Prefilling purchase for ${r.materialName} (${r.qtyShort} units).`,
                                      });
                                    }}
                                  >
                                    {v.name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : isNonMaterial ? (
                            <span className="text-2xs text-muted-foreground">—</span>
                          ) : (
                            <span className="text-2xs text-muted-foreground">Add a vendor</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              <TableFooter>
                <TableRow className={dataTableClasses.footRow}>
                  <TableCell />
                  <TableCell colSpan={2}>
                    <div className="flex flex-col gap-0.5">
                      <span>Totals (filtered)</span>
                      {nonMaterialCount > 0 ? (
                        <span className="text-2xs font-normal text-muted-foreground">
                          {nonMaterialCount} checklist line{nonMaterialCount === 1 ? "" : "s"} (no SKU) excluded from qty/₹ totals
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{totalShortQty}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    ₹{totalValue.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="print:hidden" />
                </TableRow>
              </TableFooter>
          </DataTableShell>
        </AppSheetContent>
      </Sheet>

      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <AppSheetContent layout="form" size="sm" className="print:hidden">
          <SheetHeader>
            <SheetTitle>Share Need-to-Get (PDF)</SheetTitle>
            <SheetDescription>
              We generate a PDF of the filtered table and download it, then open WhatsApp with the number below. Attach the
              downloaded PDF in WhatsApp — web chat cannot attach files automatically.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Team member</Label>
              <Select
                value={shareEmployeeId || undefined}
                onValueChange={(v) => {
                  setShareEmployeeId(v);
                  const emp = employees.find((e) => String(e.id) === v);
                  if (emp?.phone) setSharePhone(emp.phone);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee (fills phone)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No employees in demo data</div>
                  ) : (
                    employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name} — {e.phone}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntp-share-phone">WhatsApp number</Label>
              <Input
                id="ntp-share-phone"
                placeholder="e.g. 9876543210 or +91 9876543210"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ntp-share-note">Message (optional)</Label>
              <Textarea
                id="ntp-share-note"
                rows={3}
                placeholder="Short note prefilled into WhatsApp; PDF downloads separately."
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShareOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleShareSubmit} disabled={!canUseActions}>
              Download PDF &amp; open WhatsApp
            </Button>
          </SheetFooter>
        </AppSheetContent>
      </Sheet>
    </>
  );
}

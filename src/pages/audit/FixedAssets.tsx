import { useMemo, useState } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { differenceInDays, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { toast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/formatCurrency";

const FixedAssets = () => {
  const { tools } = useAppData();
  const [method, setMethod] = useState<"wdv" | "slm">("wdv");
  const [wdvPercent, setWdvPercent] = useState(15);
  const [slmLifeYears, setSlmLifeYears] = useState(10);
  const [residualPercent, setResidualPercent] = useState(5);
  const depreciationRate = wdvPercent / 100;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const now = new Date();

  const assetsWithDepreciation = useMemo(() => {
    return tools.map(tool => {
      const cost = tool.purchaseRate || 0;
      const purchaseDate = tool.purchaseDate ? parseISO(tool.purchaseDate) : now;
      const yearsUsed = differenceInDays(now, purchaseDate) / 365;
      const wholeYears = Math.max(0, Math.floor(yearsUsed));

      let accumulatedDepreciation: number;
      if (method === "wdv") {
        // WDV: Book Value = Cost * (1 - rate)^years (whole completed years only)
        accumulatedDepreciation = cost - cost * Math.pow(1 - depreciationRate, wholeYears);
      } else {
        // SLM: Depreciation = (Cost - Residual) / Useful Life * years
        const residual = cost * (residualPercent / 100);
        accumulatedDepreciation = Math.min(
          ((cost - residual) / slmLifeYears) * wholeYears,
          cost - residual,
        );
      }

      const bookValue = Math.max(0, cost - accumulatedDepreciation);
      return { ...tool, cost, accumulatedDepreciation, bookValue, yearsUsed };
    });
  }, [tools, method, depreciationRate, slmLifeYears, residualPercent]);

  const stats = useMemo(() => {
    const totalCost = assetsWithDepreciation.reduce((s, a) => s + a.cost, 0);
    const totalDepreciation = assetsWithDepreciation.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const netBookValue = assetsWithDepreciation.reduce((s, a) => s + a.bookValue, 0);
    return { totalCost, totalDepreciation, netBookValue, count: assetsWithDepreciation.length };
  }, [assetsWithDepreciation]);

  const _fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const { pagedItems: pagedAssets, safePage } = usePagedSlice(assetsWithDepreciation, page, pageSize);

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Fixed assets" },
        ]}
        subRow={
          <>
            <Select value={method} onValueChange={(v) => setMethod(v as "wdv" | "slm")}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wdv">Written Down Value (WDV)</SelectItem>
                <SelectItem value="slm">Straight Line (SLM)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-end gap-3 border-l border-border pl-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">WDV % / yr</Label>
                <Input
                  type="number"
                  className="h-8 w-20 text-xs"
                  min={1}
                  max={100}
                  value={wdvPercent}
                  onChange={(e) => setWdvPercent(Math.min(100, Math.max(1, parseFloat(e.target.value) || 0)))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">SLM life (yrs)</Label>
                <Input
                  type="number"
                  className="h-8 w-20 text-xs"
                  min={1}
                  max={60}
                  value={slmLifeYears}
                  onChange={(e) => setSlmLifeYears(Math.min(60, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Residual % of cost</Label>
                <Input
                  type="number"
                  className="h-8 w-20 text-xs"
                  min={0}
                  max={50}
                  value={residualPercent}
                  onChange={(e) => setResidualPercent(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
                />
              </div>
            </div>
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Asset cost", value: formatINR(stats.totalCost) },
                { label: "Depreciation", value: formatINR(stats.totalDepreciation) },
                { label: "Net book", value: formatINR(stats.netBookValue) },
                { label: "Assets", value: stats.count },
              ]}
            />
          </>
        }
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (assetsWithDepreciation.length === 0) {
              toast({ title: "Nothing to export", description: "No tools/assets in register.", variant: "destructive" });
              return;
            }
            downloadCSV(
              `fixed_assets_${method}.csv`,
              assetsWithDepreciation.map((a) => ({
                id: a.id,
                name: a.name,
                cost: a.cost,
                accumulatedDepreciation: a.accumulatedDepreciation,
                bookValue: a.bookValue,
                yearsHeld: Math.round(a.yearsUsed * 10) / 10,
              })),
              ["id", "name", "cost", "accumulatedDepreciation", "bookValue", "yearsHeld"],
            );
            toast({ title: "Exported", description: `${assetsWithDepreciation.length} assets.` });
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </StickyPageHeader>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Register ({method === "wdv" ? "WDV" : "SLM"} @ {method === "wdv" ? "15%" : "10 yrs"})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTableShell
            variant="inline"
            maxHeight={listTableViewportMaxHeight(pageSize)}
            scrollResetKey={`${safePage}-${pageSize}-${method}-${assetsWithDepreciation.length}`}
            footer={
              <TablePaginationBar
                page={safePage}
                pageSize={pageSize}
                total={assetsWithDepreciation.length}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Depreciation</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {asset.category}
                    </Badge>
                  </TableCell>
                  <TableCell >{asset.purchaseDate || "-"}</TableCell>
                  <TableCell className="text-right">{formatINR(asset.cost)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatINR(asset.accumulatedDepreciation)}</TableCell>
                  <TableCell className="text-right font-medium">{formatINR(asset.bookValue)}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === "In Use" ? "default" : "secondary"} className="text-xs">
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{asset.site}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default FixedAssets;

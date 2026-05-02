import { useMemo, useState, useEffect } from "react";
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
import { differenceInDays, parseISO } from "date-fns";

const DEPRECIATION_RATE = 0.15; // 15% WDV default for tools/equipment
const USEFUL_LIFE_YEARS = 10; // For SLM

const FixedAssets = () => {
  const { tools } = useAppData();
  const [method, setMethod] = useState<"wdv" | "slm">("wdv");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const now = new Date();

  const assetsWithDepreciation = useMemo(() => {
    return tools.map(tool => {
      const cost = tool.purchaseRate || 0;
      const purchaseDate = tool.purchaseDate ? parseISO(tool.purchaseDate) : now;
      const yearsUsed = differenceInDays(now, purchaseDate) / 365;

      let accumulatedDepreciation: number;
      if (method === "wdv") {
        // WDV: Book Value = Cost * (1 - rate)^years
        accumulatedDepreciation = cost - cost * Math.pow(1 - DEPRECIATION_RATE, yearsUsed);
      } else {
        // SLM: Depreciation = (Cost - Residual) / Useful Life * years
        const residual = cost * 0.05;
        accumulatedDepreciation = Math.min(((cost - residual) / USEFUL_LIFE_YEARS) * yearsUsed, cost - residual);
      }

      const bookValue = Math.max(0, cost - accumulatedDepreciation);
      return { ...tool, cost, accumulatedDepreciation, bookValue, yearsUsed };
    });
  }, [tools, method]);

  const stats = useMemo(() => {
    const totalCost = assetsWithDepreciation.reduce((s, a) => s + a.cost, 0);
    const totalDepreciation = assetsWithDepreciation.reduce((s, a) => s + a.accumulatedDepreciation, 0);
    const netBookValue = assetsWithDepreciation.reduce((s, a) => s + a.bookValue, 0);
    return { totalCost, totalDepreciation, netBookValue, count: assetsWithDepreciation.length };
  }, [assetsWithDepreciation]);

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Asset cost", value: fmt(stats.totalCost) },
                { label: "Depreciation", value: fmt(stats.totalDepreciation) },
                { label: "Net book", value: fmt(stats.netBookValue) },
                { label: "Assets", value: stats.count },
              ]}
            />
          </>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Asset Register ({method === "wdv" ? "WDV" : "SLM"} @ {method === "wdv" ? "15%" : "10 yrs"})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <DataTableShell
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
                  <TableCell className="text-sm font-medium">{asset.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {asset.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{asset.purchaseDate || "-"}</TableCell>
                  <TableCell className="text-right text-sm">{fmt(asset.cost)}</TableCell>
                  <TableCell className="text-right text-sm text-orange-600">{fmt(asset.accumulatedDepreciation)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(asset.bookValue)}</TableCell>
                  <TableCell>
                    <Badge variant={asset.status === "In Use" ? "default" : "secondary"} className="text-xs">
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{asset.site}</TableCell>
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

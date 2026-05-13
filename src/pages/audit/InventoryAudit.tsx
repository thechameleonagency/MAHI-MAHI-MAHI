import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import type { InventoryItem } from "@/types/project";

type MovementRow = {
  date: string;
  item: string;
  type: string;
  qty: number;
  unitPrice: number;
  total: number;
  ref: string;
  refId: string;
};

function StockCategoryTable({
  category,
  items,
  fmt,
}: {
  category: string;
  items: InventoryItem[];
  fmt: (v: number) => string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: pagedStock, safePage } = usePagedSlice(items, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [category, items.length]);

  return (
    <div>
      <div className="border-y border-border bg-muted/50 px-4 py-2">
        <span className="text-sm font-semibold text-foreground">{category}</span>
        <span className="ml-2 text-xs text-muted-foreground">({items.length} items)</span>
      </div>
      <DataTableShell
        className="rounded-none border-x-0 border-t-0 border-b shadow-none dark:border-border"
        maxHeight={listTableViewportMaxHeight(pageSize)}
        scrollResetKey={`${category}-${safePage}-${pageSize}-${items.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={pageSize}
            total={items.length}
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
            <TableHead>Item</TableHead>
            <TableHead>HSN</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead className="text-right">Buy Price</TableHead>
            <TableHead className="text-right">Stock Value</TableHead>
            <TableHead className="text-right">Sale Value</TableHead>
            <TableHead className="text-right">Min Stock</TableHead>
            <TableHead>Alert</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedStock.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.name}
                {item.size ? ` (${item.size})` : ""}
              </TableCell>
              <TableCell className="text-muted-foreground">{item.hsn}</TableCell>
              <TableCell className="text-right">{item.stock}</TableCell>
              <TableCell className="text-muted-foreground">{item.unit}</TableCell>
              <TableCell className="text-right">{fmt(item.buyPrice)}</TableCell>
              <TableCell className="text-right font-medium">{fmt(item.stock * item.buyPrice)}</TableCell>
              <TableCell className="text-right">{fmt(item.stock * item.salePrice)}</TableCell>
              <TableCell className="text-right">{item.minStock || "-"}</TableCell>
              <TableCell>
                {item.stock <= (item.minStock || 0) && (
                  <Badge variant="destructive" className="text-xs">
                    Low
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  );
}

const InventoryAudit = () => {
  const { inventoryItems, projects, vendorBills } = useAppData();
  const [valuation, setValuation] = useState<"weighted" | "fifo">("weighted");
  const [mainTab, setMainTab] = useState("summary");
  const [movPage, setMovPage] = useState(1);
  const [movSize, setMovSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const stats = useMemo(() => {
    const totalValue = inventoryItems.reduce((s, i) => s + i.stock * i.buyPrice, 0);
    const totalSaleValue = inventoryItems.reduce((s, i) => s + i.stock * i.salePrice, 0);
    const totalUnits = inventoryItems.reduce((s, i) => s + i.stock, 0);
    const lowStock = inventoryItems.filter((i) => i.stock <= (i.minStock || 0)).length;
    const deadStock = inventoryItems.filter((i) => i.stock > 0 && i.stock <= 2).length;
    return { totalValue, totalSaleValue, totalUnits, lowStock, deadStock };
  }, [inventoryItems]);

  const grouped = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    inventoryItems.forEach((item) => {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [inventoryItems]);

  const movements = useMemo(() => {
    const moves: MovementRow[] = [];
    projects.forEach((p) => {
      if (p.materialsSent) {
        p.materialsSent.forEach((ms: { date?: string; itemName?: string; name?: string; quantity?: number; rate?: number }) => {
          moves.push({
            date: ms.date || p.startDate || "",
            item: ms.itemName || ms.name || "Unknown",
            type: "Consumption",
            qty: ms.quantity || 0,
            unitPrice: ms.rate || 0,
            total: (ms.quantity || 0) * (ms.rate || 0),
            ref: p.name,
            refId: p.id,
          });
        });
      }
    });
    vendorBills.forEach((bill) => {
      bill.items?.forEach((item) => {
        moves.push({
          date: bill.billDate,
          item: item.description || item.name || "Unknown",
          type: "Purchase",
          qty: item.quantity,
          unitPrice: item.rate,
          total: item.amount || item.quantity * item.rate,
          ref: bill.vendorName || `Vendor ${bill.vendorId}`,
          refId: String(bill.vendorId),
        });
      });
    });
    return moves.sort((a, b) => b.date.localeCompare(a.date));
  }, [projects, vendorBills]);

  const { pagedItems: pagedMovements, safePage: safeMovPage } = usePagedSlice(movements, movPage, movSize);

  useEffect(() => {
    setMovPage(1);
  }, [movements.length]);

  useEffect(() => {
    if (mainTab === "movements") setMovPage(1);
  }, [mainTab]);

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  const valuationSubtitle: ReactNode =
    valuation === "weighted" ? "Weighted Avg" : "FIFO";

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Inventory" },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "Stock value", value: fmt(stats.totalValue) },
              { label: "Sale value", value: fmt(stats.totalSaleValue) },
              { label: "Units", value: stats.totalUnits.toLocaleString("en-IN") },
              { label: "Low stock", value: stats.lowStock },
              { label: "Dead stock", value: stats.deadStock },
            ]}
          />
        }
      />

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="summary">Stock Summary</TabsTrigger>
          <TabsTrigger value="movements">Movement Log</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Stock Summary ({valuationSubtitle})</CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant={valuation === "weighted" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setValuation("weighted")}
                  >
                    Weighted Avg
                  </Badge>
                  <Badge
                    variant={valuation === "fifo" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setValuation("fifo")}
                  >
                    FIFO
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {Object.entries(grouped).map(([category, items]) => (
                <StockCategoryTable key={category} category={category} items={items} fmt={fmt} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock Movement Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(movSize)}
                scrollResetKey={`${safeMovPage}-${movSize}-${movements.length}`}
                footer={
                  <TablePaginationBar
                    page={safeMovPage}
                    pageSize={movSize}
                    total={movements.length}
                    onPageChange={setMovPage}
                    onPageSizeChange={(n) => {
                      setMovSize(n);
                      setMovPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No stock movements recorded
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedMovements.map((m, i) => (
                    <TableRow key={`${m.refId}-${m.date}-${m.item}-${i}`}>
                      <TableCell >{m.date}</TableCell>
                      <TableCell className="font-medium">{m.item}</TableCell>
                      <TableCell>
                        <Badge variant={m.type === "Purchase" ? "default" : "secondary"} className="text-xs">
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.qty}</TableCell>
                      <TableCell className="text-right">{fmt(m.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{fmt(m.total)}</TableCell>
                      <TableCell className="cursor-pointer text-primary hover:underline">{m.ref}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default InventoryAudit;

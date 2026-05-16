import { useMemo, useState, useEffect } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { formatINR } from "@/lib/formatCurrency";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1);
  return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") };
});

const GSTCompliance = () => {
  const { invoices, saleBills, vendorBills, vendors } = useAppData();
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [gstTab, setGstTab] = useState("sales");
  const [salesPage, setSalesPage] = useState(1);
  const [salesSize, setSalesSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [purPage, setPurPage] = useState(1);
  const [purSize, setPurSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const filterByMonth = (dateStr: string) => {
    if (selectedMonth === "all") return true;
    try {
      return format(parseISO(dateStr), "yyyy-MM") === selectedMonth;
    } catch { return false; }
  };

  const salesRegister = useMemo(() => {
    return [...invoices, ...saleBills].filter(inv => filterByMonth(inv.invoiceDate)).map(inv => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      customer: inv.customerName,
      gstin: inv.customerGstin || "",
      placeOfSupply: inv.customerState || "",
      taxableValue: inv.subtotal,
      cgst: inv.cgst || 0,
      sgst: inv.sgst || 0,
      igst: inv.igst || 0,
      total: inv.total,
      type: inv.type,
    }));
  }, [invoices, saleBills, selectedMonth]);

  const purchaseRegister = useMemo(() => {
    return vendorBills.filter(b => filterByMonth(b.billDate)).map(bill => ({
      id: bill.id,
      billNumber: bill.billNumber,
      date: bill.billDate,
      vendor: bill.vendorName || `Vendor ${bill.vendorId}`,
      vendorId: bill.vendorId,
      gstin: vendors.find(v => v.id.toString() === String(bill.vendorId))?.gstin ?? "",
      taxableValue: (bill.subtotal || bill.total - (bill.gst || 0)),
      gstInput: bill.gst || 0,
      total: bill.total,
    }));
  }, [vendorBills, selectedMonth]);

  const gstSummary = useMemo(() => {
    const outputGST = salesRegister.reduce((s, r) => s + r.cgst + r.sgst + r.igst, 0);
    const inputGST = purchaseRegister.reduce((s, r) => s + r.gstInput, 0);
    return { outputGST, inputGST, netPayable: outputGST - inputGST };
  }, [salesRegister, purchaseRegister]);

  // GSTR-1: B2B vs B2C
  const gstr1 = useMemo(() => {
    const b2b = salesRegister.filter(r => r.gstin);
    const b2c = salesRegister.filter(r => !r.gstin);
    return { b2b, b2c };
  }, [salesRegister]);

  useEffect(() => {
    setSalesPage(1);
    setPurPage(1);
  }, [selectedMonth]);

  const { pagedItems: pagedSales, safePage: safeSales } = usePagedSlice(salesRegister, salesPage, salesSize);
  const { pagedItems: pagedPurchase, safePage: safePur } = usePagedSlice(purchaseRegister, purPage, purSize);

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "GST" },
        ]}
        subRow={
          <>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Output GST", value: formatINR(gstSummary.outputGST) },
                { label: "Input GST", value: formatINR(gstSummary.inputGST) },
                { label: "Net payable", value: formatINR(gstSummary.netPayable) },
              ]}
            />
          </>
        }
      />

      <Tabs value={gstTab} onValueChange={setGstTab}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="sales">Sales Register ({salesRegister.length})</TabsTrigger>
            <TabsTrigger value="purchase">Purchase Register ({purchaseRegister.length})</TabsTrigger>
            <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
            <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
            if (gstTab === "sales" || gstTab === "gstr1") {
              downloadCSV(`GSTR1_Sales_${selectedMonth}.csv`, salesRegister.map(r => ({
                "Invoice #": r.invoiceNumber, "Date": r.date, "Customer": r.customer,
                "GSTIN": r.gstin || "", "Place of Supply": r.placeOfSupply || "",
                "Taxable Value": r.taxableValue, "CGST": r.cgst, "SGST": r.sgst, "IGST": r.igst, "Total": r.total,
              })), ["Invoice #", "Date", "Customer", "GSTIN", "Place of Supply", "Taxable Value", "CGST", "SGST", "IGST", "Total"]);
            } else if (gstTab === "purchase") {
              downloadCSV(`GST_Purchase_${selectedMonth}.csv`, purchaseRegister.map(r => ({
                "Bill #": r.billNumber, "Date": r.date, "Vendor": r.vendor, "GSTIN": r.gstin || "",
                "Taxable Value": r.taxableValue, "GST Input": r.gstInput, "Total": r.total,
              })), ["Bill #", "Date", "Vendor", "GSTIN", "Taxable Value", "GST Input", "Total"]);
            } else {
              downloadCSV(`GSTR3B_Summary_${selectedMonth}.csv`, [
                { "Section": "3.1 Outward Supplies (Taxable)", "Amount": salesRegister.reduce((s, r) => s + r.taxableValue, 0) },
                { "Section": "3.1 Output Tax (CGST+SGST+IGST)", "Amount": gstSummary.outputGST },
                { "Section": "4. Input Tax Credit", "Amount": gstSummary.inputGST },
                { "Section": "6.1 Net Tax Payable", "Amount": gstSummary.netPayable },
              ], ["Section", "Amount"]);
            }
          }}>
            <Download className="w-3 h-3 mr-1" />
            Export CSV
          </Button>
        </div>

        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(salesSize)}
                scrollResetKey={`${safeSales}-${salesSize}-${salesRegister.length}`}
                footer={
                  <TablePaginationBar
                    page={safeSales}
                    pageSize={salesSize}
                    total={salesRegister.length}
                    onPageChange={setSalesPage}
                    onPageSizeChange={(n) => {
                      setSalesSize(n);
                      setSalesPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Place of Supply</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRegister.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        No sales records
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedSales.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="cursor-pointer font-medium text-primary hover:underline">
                        {r.invoiceNumber}
                      </TableCell>
                      <TableCell >{r.date}</TableCell>
                      <TableCell >{r.customer}</TableCell>
                      <TableCell className="text-muted-foreground">{r.gstin || "-"}</TableCell>
                      <TableCell >{r.placeOfSupply || "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(r.taxableValue)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.cgst)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.sgst)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.igst)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {salesRegister.length > 0 && (
                  <TableFooter>
                    <TableRow className={dataTableClasses.footRow}>
                      <TableCell colSpan={5} className="font-medium">
                        Total (all rows)
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(salesRegister.reduce((s, r) => s + r.taxableValue, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(salesRegister.reduce((s, r) => s + r.cgst, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(salesRegister.reduce((s, r) => s + r.sgst, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(salesRegister.reduce((s, r) => s + r.igst, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(salesRegister.reduce((s, r) => s + r.total, 0))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </DataTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase" className="mt-4">
          <Card>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(purSize)}
                scrollResetKey={`${safePur}-${purSize}-${purchaseRegister.length}`}
                footer={
                  <TablePaginationBar
                    page={safePur}
                    pageSize={purSize}
                    total={purchaseRegister.length}
                    onPageChange={setPurPage}
                    onPageSizeChange={(n) => {
                      setPurSize(n);
                      setPurPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">GST Input</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRegister.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No purchase records
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedPurchase.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.billNumber}</TableCell>
                      <TableCell >{r.date}</TableCell>
                      <TableCell className="cursor-pointer text-primary hover:underline">{r.vendor}</TableCell>
                      <TableCell className="text-muted-foreground">{r.gstin || "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(r.taxableValue)}</TableCell>
                      <TableCell className="text-right">{formatINR(r.gstInput)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(r.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                {purchaseRegister.length > 0 && (
                  <TableFooter>
                    <TableRow className={dataTableClasses.footRow}>
                      <TableCell colSpan={4} className="font-medium">
                        Total (all rows)
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(purchaseRegister.reduce((s, r) => s + r.taxableValue, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(purchaseRegister.reduce((s, r) => s + r.gstInput, 0))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatINR(purchaseRegister.reduce((s, r) => s + r.total, 0))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </DataTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gstr1" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">B2B Supplies (With GSTIN) — {gstr1.b2b.length} records</CardTitle>
              </CardHeader>
              <CardContent>
                {gstr1.b2b.length === 0 ? <p className="text-sm text-muted-foreground">No B2B transactions</p> : (
                  <div className="space-y-2">
                    {gstr1.b2b.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-2 rounded border border-border">
                        <div>
                          <span className="text-sm font-medium">{r.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.customer} • GSTIN: {r.gstin}</span>
                        </div>
                        <span className="text-sm font-medium">{formatINR(r.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">B2C Supplies (Without GSTIN) — {gstr1.b2c.length} records</CardTitle>
              </CardHeader>
              <CardContent>
                {gstr1.b2c.length === 0 ? <p className="text-sm text-muted-foreground">No B2C transactions</p> : (
                  <div className="space-y-2">
                    {gstr1.b2c.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-2 rounded border border-border">
                        <div>
                          <span className="text-sm font-medium">{r.invoiceNumber}</span>
                          <span className="text-xs text-muted-foreground ml-2">{r.customer}</span>
                        </div>
                        <span className="text-sm font-medium">{formatINR(r.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gstr3b" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">GSTR-3B Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-lg">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">3.1 Outward Supplies (Taxable)</span>
                  <span className="text-sm font-bold">{formatINR(salesRegister.reduce((s, r) => s + r.taxableValue, 0))}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">3.1 Output Tax (CGST + SGST + IGST)</span>
                  <span className="text-sm font-bold text-primary">{formatINR(gstSummary.outputGST)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-sm font-medium text-foreground">4. Input Tax Credit</span>
                  <span className="text-sm font-bold text-primary">{formatINR(gstSummary.inputGST)}</span>
                </div>
                <div className="flex justify-between py-4 bg-muted/50 px-3 rounded-lg">
                  <span className="text-sm font-bold text-foreground">6.1 Net Tax Payable</span>
                  <span className="text-lg font-bold text-orange-600">{formatINR(gstSummary.netPayable)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};

export default GSTCompliance;

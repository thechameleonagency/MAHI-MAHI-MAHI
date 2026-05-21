import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, IndianRupee } from "lucide-react";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { downloadCSV } from "@/lib/csvExport";
import { toast } from "@/hooks/use-toast";
import { formatINR, formatINRChartAxis } from "@/lib/formatCurrency";
import { debtorCreditorSummary } from "@/lib/audit";

const DebtorsCreditors = () => {
  const { invoices, saleBills, vendorBills, customers, payments } = useAppData();
  const navigate = useNavigate();
  const [dcTab, setDcTab] = useState("debtors");
  const [debPage, setDebPage] = useState(1);
  const [debSize, setDebSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [credPage, setCredPage] = useState(1);
  const [credSize, setCredSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const dcSummary = useMemo(
    () => debtorCreditorSummary(invoices, saleBills, vendorBills, payments),
    [invoices, saleBills, vendorBills, payments],
  );
  const { debtors, creditors, totalReceivables, totalPayables, overdueReceivables, overduePayables, debtorBuckets, creditorBuckets } =
    dcSummary;
  const stats = {
    totalReceivables,
    overdueReceivables,
    totalPayables,
    overduePayables,
  };

  const agingData = useMemo(
    () =>
      debtorBuckets.map((b, i) => ({
        bucket: b.label,
        Receivables: b.amount,
        Payables: creditorBuckets[i]?.amount ?? 0,
      })),
    [debtorBuckets, creditorBuckets],
  );

  const { pagedItems: pagedDebtors, safePage: safeDeb } = usePagedSlice(debtors, debPage, debSize);
  const { pagedItems: pagedCreditors, safePage: safeCred } = usePagedSlice(creditors, credPage, credSize);

  useEffect(() => {
    setDebPage(1);
    setCredPage(1);
  }, [debtors.length, creditors.length]);

  useEffect(() => {
    if (dcTab === "debtors") setDebPage(1);
    else setCredPage(1);
  }, [dcTab]);

  const openCustomer = (customerId: string | undefined, customerName: string) => {
    if (!customerId) {
      toast({
        title: "Customer not linked",
        description: `"${customerName}" has no customer record ID on file.`,
        variant: "destructive",
      });
      return;
    }
    if (!customers.some((c) => c.id === customerId)) {
      toast({
        title: "Customer not found",
        description: "This customer may have been removed.",
        variant: "destructive",
      });
      return;
    }
    navigate(`/customers/${customerId}`);
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Debtors & creditors" },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "Receivables", value: formatINR(stats.totalReceivables) },
              { label: "Recv. overdue", value: formatINR(stats.overdueReceivables) },
              { label: "Payables", value: formatINR(stats.totalPayables) },
              { label: "Pay. overdue", value: formatINR(stats.overduePayables) },
            ]}
          />
        }
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            if (dcTab === "debtors") {
              if (debtors.length === 0) {
                toast({ title: "Nothing to export", description: "No debtor rows.", variant: "destructive" });
                return;
              }
              downloadCSV(
                "debtors_aging.csv",
                debtors.map((d) => ({
                  customer: d.customerName,
                  invoice: d.invoiceNumber,
                  outstanding: d.outstanding,
                  agingDays: d.daysOverdue,
                  dueDate: d.dueDate || "",
                  status: d.status,
                })),
                ["customer", "invoice", "outstanding", "agingDays", "dueDate", "status"],
              );
            } else {
              if (creditors.length === 0) {
                toast({ title: "Nothing to export", description: "No creditor rows.", variant: "destructive" });
                return;
              }
              downloadCSV(
                "creditors_aging.csv",
                creditors.map((c) => ({
                  vendor: c.vendorName,
                  bill: c.billNumber,
                  outstanding: c.outstanding,
                  agingDays: c.daysOverdue,
                  dueDate: c.dueDate || "",
                  status: c.status,
                })),
                ["vendor", "bill", "outstanding", "agingDays", "dueDate", "status"],
              );
            }
            toast({ title: "Exported", description: "CSV downloaded." });
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Export {dcTab === "debtors" ? "debtors" : "creditors"}
        </Button>
      </StickyPageHeader>

      {/* Aging Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aging Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="bucket" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={formatINRChartAxis} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Legend />
              <Bar dataKey="Receivables" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Payables" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs value={dcTab} onValueChange={setDcTab}>
        <TabsList>
          <TabsTrigger value="debtors">Debtors ({debtors.length})</TabsTrigger>
          <TabsTrigger value="creditors">Creditors ({creditors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="debtors" className="mt-4">
          <Card>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(debSize)}
                scrollResetKey={`${safeDeb}-${debSize}-${debtors.length}`}
                footer={
                  <TablePaginationBar
                    page={safeDeb}
                    pageSize={debSize}
                    total={debtors.length}
                    onPageChange={setDebPage}
                    onPageSizeChange={(n) => {
                      setDebSize(n);
                      setDebPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtors.length === 0 && (
                    <TableEmptyRow colSpan={8} icon={IndianRupee} title="No outstanding receivables" />
                  )}
                  {pagedDebtors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell
                        className="cursor-pointer font-medium text-primary hover:underline"
                        onClick={() => openCustomer(d.customerId, d.customerName)}
                      >
                        {d.customerName}
                      </TableCell>
                      <TableCell className="cursor-pointer text-primary hover:underline">{d.invoiceNumber}</TableCell>
                      <TableCell className="text-right">{formatINR(d.total)}</TableCell>
                      <TableCell className="text-right">{formatINR(d.amountReceived)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(d.outstanding)}</TableCell>
                      <TableCell >{d.dueDate || "-"}</TableCell>
                      <TableCell className="text-right">
                        {d.daysOverdue > 0 ? (
                          <span className="font-medium text-destructive">{d.daysOverdue}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} className="text-xs" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </DataTableShell>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="creditors" className="mt-4">
          <Card>
            <CardContent className="p-0">
          <DataTableShell
            variant="inline"
                maxHeight={listTableViewportMaxHeight(credSize)}
                scrollResetKey={`${safeCred}-${credSize}-${creditors.length}`}
                footer={
                  <TablePaginationBar
                    page={safeCred}
                    pageSize={credSize}
                    total={creditors.length}
                    onPageChange={setCredPage}
                    onPageSizeChange={(n) => {
                      setCredSize(n);
                      setCredPage(1);
                    }}
                  />
                }
              >
                <TableHeader>
                  <TableRow className={dataTableClasses.headRow}>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bill #</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Days Overdue</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditors.length === 0 && (
                    <TableEmptyRow colSpan={8} icon={IndianRupee} title="No outstanding payables" />
                  )}
                  {pagedCreditors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell
                        className="cursor-pointer font-medium text-primary hover:underline"
                        onClick={() => navigate(`/vendors/${c.vendorId}`)}
                      >
                        {c.vendorName || `Vendor ${c.vendorId}`}
                      </TableCell>
                      <TableCell >{c.billNumber}</TableCell>
                      <TableCell className="text-right">{formatINR(c.total)}</TableCell>
                      <TableCell className="text-right">{formatINR(c.amountPaid)}</TableCell>
                      <TableCell className="text-right font-medium">{formatINR(c.outstanding)}</TableCell>
                      <TableCell >{c.dueDate || "-"}</TableCell>
                      <TableCell className="text-right">
                        {c.daysOverdue > 0 ? (
                          <span className="font-medium text-destructive">{c.daysOverdue}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} className="text-xs" />
                      </TableCell>
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

export default DebtorsCreditors;

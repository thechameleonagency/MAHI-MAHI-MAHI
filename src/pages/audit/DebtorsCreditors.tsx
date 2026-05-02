import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { differenceInDays, parseISO } from "date-fns";

const DebtorsCreditors = () => {
  const { invoices, saleBills, vendorBills } = useAppData();
  const navigate = useNavigate();
  const now = new Date();
  const [dcTab, setDcTab] = useState("debtors");
  const [debPage, setDebPage] = useState(1);
  const [debSize, setDebSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [credPage, setCredPage] = useState(1);
  const [credSize, setCredSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const debtors = useMemo(() => {
    const allInv = [...invoices, ...saleBills].filter(i => i.status !== "paid");
    return allInv.map(inv => {
      const outstanding = inv.total - inv.amountReceived;
      const daysOverdue = inv.dueDate ? Math.max(0, differenceInDays(now, parseISO(inv.dueDate))) : 0;
      return { ...inv, outstanding, daysOverdue };
    }).sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices, saleBills]);

  const creditors = useMemo(() => {
    return vendorBills.filter(b => b.status !== "paid").map(bill => {
      const outstanding = bill.total - bill.amountPaid;
      const daysOverdue = bill.dueDate ? Math.max(0, differenceInDays(now, parseISO(bill.dueDate))) : 0;
      return { ...bill, outstanding, daysOverdue };
    }).sort((a, b) => b.outstanding - a.outstanding);
  }, [vendorBills]);

  const stats = useMemo(() => {
    const totalReceivables = debtors.reduce((s, d) => s + d.outstanding, 0);
    const overdueReceivables = debtors.filter(d => d.daysOverdue > 0).reduce((s, d) => s + d.outstanding, 0);
    const totalPayables = creditors.reduce((s, c) => s + c.outstanding, 0);
    const overduePayables = creditors.filter(c => c.daysOverdue > 0).reduce((s, c) => s + c.outstanding, 0);
    return { totalReceivables, overdueReceivables, totalPayables, overduePayables };
  }, [debtors, creditors]);

  // Aging data
  const agingData = useMemo(() => {
    const calcAging = (items: { outstanding: number; daysOverdue: number }[]) => {
      const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      items.forEach(item => {
        if (item.daysOverdue <= 30) buckets["0-30"] += item.outstanding;
        else if (item.daysOverdue <= 60) buckets["31-60"] += item.outstanding;
        else if (item.daysOverdue <= 90) buckets["61-90"] += item.outstanding;
        else buckets["90+"] += item.outstanding;
      });
      return buckets;
    };
    const debtorAging = calcAging(debtors);
    const creditorAging = calcAging(creditors);
    return [
      { bucket: "0-30 days", Receivables: debtorAging["0-30"], Payables: creditorAging["0-30"] },
      { bucket: "31-60 days", Receivables: debtorAging["31-60"], Payables: creditorAging["31-60"] },
      { bucket: "61-90 days", Receivables: debtorAging["61-90"], Payables: creditorAging["61-90"] },
      { bucket: "90+ days", Receivables: debtorAging["90+"], Payables: creditorAging["90+"] },
    ];
  }, [debtors, creditors]);

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

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

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
              { label: "Receivables", value: fmt(stats.totalReceivables) },
              { label: "Recv. overdue", value: fmt(stats.overdueReceivables) },
              { label: "Payables", value: fmt(stats.totalPayables) },
              { label: "Pay. overdue", value: fmt(stats.overduePayables) },
            ]}
          />
        }
      />

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
              <YAxis className="text-xs" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
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
            <CardContent className="p-0 pt-4">
              <DataTableShell
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
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No outstanding receivables
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedDebtors.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell
                        className="cursor-pointer text-sm font-medium text-primary hover:underline"
                        onClick={() => d.customerId && navigate(`/customers/${d.customerId}`)}
                      >
                        {d.customerName}
                      </TableCell>
                      <TableCell className="cursor-pointer text-sm text-primary hover:underline">{d.invoiceNumber}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(d.total)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(d.amountReceived)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(d.outstanding)}</TableCell>
                      <TableCell className="text-sm">{d.dueDate || "-"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {d.daysOverdue > 0 ? (
                          <span className="font-medium text-destructive">{d.daysOverdue}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            d.status === "overdue"
                              ? "destructive"
                              : d.status === "partial"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {d.status}
                        </Badge>
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
            <CardContent className="p-0 pt-4">
              <DataTableShell
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
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No outstanding payables
                      </TableCell>
                    </TableRow>
                  )}
                  {pagedCreditors.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell
                        className="cursor-pointer text-sm font-medium text-primary hover:underline"
                        onClick={() => navigate(`/vendors/${c.vendorId}`)}
                      >
                        {c.vendorName || `Vendor ${c.vendorId}`}
                      </TableCell>
                      <TableCell className="text-sm">{c.billNumber}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.total)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(c.amountPaid)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(c.outstanding)}</TableCell>
                      <TableCell className="text-sm">{c.dueDate || "-"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {c.daysOverdue > 0 ? (
                          <span className="font-medium text-destructive">{c.daysOverdue}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "pending" ? "secondary" : "outline"} className="text-xs">
                          {c.status}
                        </Badge>
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

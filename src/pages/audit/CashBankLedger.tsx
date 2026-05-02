import { useMemo, useState, useEffect } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
const CashBankLedger = () => {
  const { payments, expenses, incomes, vendorPayments, loanRepayments } = useAppData();
  const [accountFilter, setAccountFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const normalizeMode = (mode?: string): string => {
    if (!mode) return "Other";
    const m = mode.toLowerCase();
    if (m.includes("cash")) return "Cash";
    if (m.includes("bank") || m.includes("transfer") || m.includes("neft") || m.includes("rtgs")) return "Bank";
    if (m.includes("upi")) return "UPI";
    if (m.includes("cheque")) return "Cheque";
    return "Other";
  };

  const ledgerEntries = useMemo(() => {
    const entries: { date: string; description: string; account: string; debit: number; credit: number; reference: string; type: string }[] = [];

    // Payments received
    payments.filter(p => p.direction === "in").forEach(p => {
      entries.push({
        date: p.date, description: `Payment from ${p.counterpartyName || "Customer"}`,
        account: normalizeMode(p.paymentMode), debit: p.amount, credit: 0,
        reference: p.invoiceId || p.id, type: "payment_received",
      });
    });

    // Payments paid
    payments.filter(p => p.direction === "out").forEach(p => {
      entries.push({
        date: p.date, description: `Payment to ${p.counterpartyName || "Vendor"}`,
        account: normalizeMode(p.paymentMode), debit: 0, credit: p.amount,
        reference: p.id, type: "payment_paid",
      });
    });

    // Expenses
    expenses.forEach(e => {
      entries.push({
        date: e.date, description: `Expense: ${e.category}${e.projectName ? ` (${e.projectName})` : ""}`,
        account: normalizeMode(e.paymentMode), debit: 0, credit: e.amount,
        reference: e.id, type: "expense",
      });
    });

    // Incomes (non-outgoing)
    incomes.filter(i => !i.isOutgoing).forEach(i => {
      entries.push({
        date: i.date, description: `Income: ${i.category}${i.projectName ? ` (${i.projectName})` : ""}`,
        account: normalizeMode(i.paymentMode), debit: i.amount, credit: 0,
        reference: i.id, type: "income",
      });
    });

    // Outgoing incomes (loans given, etc.)
    incomes.filter(i => i.isOutgoing).forEach(i => {
      entries.push({
        date: i.date, description: `Outgoing: ${i.category}`,
        account: normalizeMode(i.paymentMode), debit: 0, credit: i.amount,
        reference: i.id, type: "outgoing",
      });
    });

    // Vendor payments
    vendorPayments.forEach(vp => {
      entries.push({
        date: vp.date, description: `Vendor payment: ${vp.vendorName || "Vendor"}`,
        account: normalizeMode(vp.paymentMode || vp.mode), debit: 0, credit: vp.amount,
        reference: vp.billNumber || vp.id, type: "vendor_payment",
      });
    });

    // Loan repayments
    loanRepayments.forEach(lr => {
      entries.push({
        date: lr.date, description: `Loan repayment: ${lr.loanSource}`,
        account: "Bank", debit: 0, credit: lr.totalPaid,
        reference: lr.loanId, type: "loan_repayment",
      });
    });

    // Sort by date desc
    entries.sort((a, b) => b.date.localeCompare(a.date));

    // Filter
    if (accountFilter !== "all") {
      return entries.filter(e => e.account === accountFilter);
    }
    return entries;
  }, [payments, expenses, incomes, vendorPayments, loanRepayments, accountFilter]);

  // Running balance
  const entriesWithBalance = useMemo(() => {
    const sorted = [...ledgerEntries].reverse();
    let balance = 0;
    const result = sorted.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
    return result.reverse();
  }, [ledgerEntries]);

  useEffect(() => {
    setPage(1);
  }, [accountFilter]);

  const { pagedItems: pagedLedger, safePage } = usePagedSlice(entriesWithBalance, page, pageSize);

  const totals = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
    return { totalDebit, totalCredit, net: totalDebit - totalCredit };
  }, [ledgerEntries]);

  const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`;

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Cash & bank" },
        ]}
        subRow={
          <>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Debit (inflow)", value: fmt(totals.totalDebit) },
                { label: "Credit (outflow)", value: fmt(totals.totalCredit) },
                { label: "Net", value: fmt(totals.net) },
              ]}
            />
          </>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction Ledger ({entriesWithBalance.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(pageSize)}
            scrollResetKey={`${safePage}-${pageSize}-${entriesWithBalance.length}`}
            footer={
              <TablePaginationBar
                page={safePage}
                pageSize={pageSize}
                total={entriesWithBalance.length}
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
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entriesWithBalance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions
                  </TableCell>
                </TableRow>
              )}
              {pagedLedger.map((e, i) => (
                <TableRow key={`${e.reference}-${e.date}-${i}`}>
                  <TableCell className="text-sm">{e.date}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {e.account}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {e.debit > 0 ? <span className="font-medium text-primary">{fmt(e.debit)}</span> : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {e.credit > 0 ? <span className="font-medium text-destructive">{fmt(e.credit)}</span> : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{fmt(e.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default CashBankLedger;

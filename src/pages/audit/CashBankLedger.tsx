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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { formatINR } from "@/lib/formatCurrency";
import { toast } from "@/hooks/use-toast";

const CashBankLedger = () => {
  const { payments, expenses, incomes, vendorPayments, loanRepayments } = useAppData();
  const [openingBalance, setOpeningBalance] = useState(0);
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
        account: normalizeMode(vp.paymentMode), debit: 0, credit: vp.amount,
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
    let balance = openingBalance;
    const result = sorted.map(e => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });
    return result.reverse();
  }, [ledgerEntries, openingBalance]);

  useEffect(() => {
    setPage(1);
  }, [accountFilter]);

  const { pagedItems: pagedLedger, safePage } = usePagedSlice(entriesWithBalance, page, pageSize);

  const totals = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
    return { totalDebit, totalCredit, net: totalDebit - totalCredit };
  }, [ledgerEntries]);

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
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Opening balance</Label>
              <Input
                type="number"
                className="h-8 w-28 text-xs"
                value={Number.isFinite(openingBalance) ? openingBalance : 0}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              />
            </div>
            <InlineKpiStrip
              className="w-full min-w-0 sm:justify-end"
              items={[
                { label: "Debit (inflow)", value: formatINR(totals.totalDebit) },
                { label: "Credit (outflow)", value: formatINR(totals.totalCredit) },
                { label: "Net", value: formatINR(totals.net) },
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
            if (entriesWithBalance.length === 0) {
              toast({ title: "Nothing to export", description: "No ledger rows for the current filter.", variant: "destructive" });
              return;
            }
            downloadCSV(
              `cash_bank_ledger_${accountFilter}.csv`,
              entriesWithBalance.map((e) => ({
                date: e.date,
                description: e.description,
                account: e.account,
                debit: e.debit,
                credit: e.credit,
                balance: e.balance,
                type: e.type,
                reference: e.reference,
              })),
              ["date", "description", "account", "debit", "credit", "balance", "type", "reference"],
            );
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </StickyPageHeader>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaction Ledger ({entriesWithBalance.length} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTableShell
            variant="inline"
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
                  <TableCell >{e.date}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {e.account}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.debit > 0 ? <span className="font-medium text-primary">{formatINR(e.debit)}</span> : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.credit > 0 ? <span className="font-medium text-destructive">{formatINR(e.credit)}</span> : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatINR(e.balance)}</TableCell>
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

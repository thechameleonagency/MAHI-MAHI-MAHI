import { useState, useMemo, useEffect } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { ChevronRight, ChevronDown, Search, Building2, Layers, ShieldCheck, Download, FileText } from "lucide-react";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/csvExport";
import { formatINR } from "@/lib/formatCurrency";
import { getInvoiceAmountReceived, getInvoiceOpenBalance } from "@/lib/billingSelectors";
import { getOutstandingReceivables } from "@/domain/finance/financialSemantics";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_GROUPS, LEDGER_ACCOUNTS, VOUCHER_TYPES,
  getSubGroups, getLedgersByGroup, getAllLedgersUnderGroup,
  type AccountGroup, type Ledger, type AccountNature,
} from "@/services/finance/chartOfAccounts";
import { listVoucherPostingRules, validatePostingAccountMap } from "@/lib/audit";

/** Paginated ledger detail grid — rows are pre-rendered string cells */
function ChartDetailLedgerTable({
  columns,
  rows,
  resetKey,
}: {
  columns: string[];
  rows: string[][];
  resetKey: string;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const { pagedItems: pagedRows, safePage } = usePagedSlice(rows, page, pageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  return (
    <DataTableShell
      maxHeight={listTableViewportMaxHeight(pageSize)}
      scrollResetKey={`${resetKey}-${safePage}-${pageSize}-${rows.length}`}
      footer={
        <TablePaginationBar
          page={safePage}
          pageSize={pageSize}
          total={rows.length}
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
          {columns.map((col) => (
            <TableHead key={col} >
              {col}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmptyRow colSpan={columns.length} icon={FileText} title="No records found" />
        ) : (
          pagedRows.map((row, i) => (
            <TableRow key={`${resetKey}-${i}`}>
              {row.map((cell, j) => (
                <TableCell key={j} >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </DataTableShell>
  );
}

const natureColors: Record<AccountNature, { bg: string; text: string; badge: string }> = {
  asset: { bg: "bg-primary/10", text: "text-primary dark:text-primary", badge: "bg-primary/20 text-primary text-primary border-primary/30" },
  liability: { bg: "bg-accent/10", text: "text-accent-foreground dark:text-accent-foreground", badge: "bg-accent/20 text-accent-foreground dark:text-accent-foreground border-accent/30" },
  income: { bg: "bg-primary/10", text: "text-primary dark:text-primary", badge: "bg-primary/20 text-primary text-primary border-primary/30" },
  expense: { bg: "bg-warning/10", text: "text-warning dark:text-warning", badge: "bg-warning/20 text-warning dark:text-warning border-warning/30" },
};

const ChartOfAccounts = () => {
  const { customers, vendors, inventoryItems, tools, invoices, saleBills, vendorBills, vendorPayments, expenses, incomes, loans, loanRepayments, payments, partners, partnerTransactions, ownerInvestments } = useAppData();
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["current-assets", "current-liabilities"]));
  const [selectedItem, setSelectedItem] = useState<{ type: "group" | "ledger"; id: string } | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compute balances for key ledgers
  const balances = useMemo(() => {
    const allInvoices = [...invoices, ...saleBills];
    const receivables = getOutstandingReceivables(invoices, payments, saleBills);
    const payables = vendorBills.filter(b => b.status !== "paid").reduce((s, b) => s + (b.total - b.amountPaid), 0);
    const inventoryValue = inventoryItems.reduce((s, item) => s + item.stock * item.buyPrice, 0);
    const toolsValue = tools.reduce((s, t) => s + t.purchaseRate, 0);
    const totalSales = allInvoices.reduce((s, i) => s + i.total, 0);
    const totalPurchases = vendorBills.reduce((s, b) => s + b.total, 0);
    const loanOutstandingTotal = loans.reduce((s, l) => s + l.outstanding, 0);
    const gstCollected = allInvoices.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
    const gstInput = vendorBills.reduce((s, b) => s + (b.gst || 0), 0);
    const ownerCapital = ownerInvestments.reduce((s, o) => s + o.amount, 0);
    const partnerCapital = partnerTransactions.filter(t => t.type === "Investment").reduce((s, t) => s + t.amount, 0);
    const customerAdvances = payments.filter(p => p.notes?.toLowerCase().includes("advance")).reduce((s, p) => s + p.amount, 0);
    
    const directExp = expenses.filter(e => ["employee", "site", "partner"].includes(e.mainCategory)).reduce((s, e) => s + e.amount, 0);
    const indirectExp = expenses.filter(e => ["company", "office"].includes(e.mainCategory)).reduce((s, e) => s + e.amount, 0);
    const ownerDrawings = expenses.filter(e => e.mainCategory === "owner").reduce((s, e) => s + e.amount, 0);

    return {
      "sundry-debtors": receivables,
      "trade-receivables": receivables,
      "sundry-creditors": payables,
      "trade-payables": payables,
      "stock-in-hand": inventoryValue,
      "fixed-assets": toolsValue,
      "tools-equipment": toolsValue,
      "sales-accounts": totalSales,
      "solar-sales": invoices.reduce((s, i) => s + i.total, 0),
      "material-sales": saleBills.reduce((s, i) => s + i.total, 0),
      "purchase-accounts": totalPurchases,
      "material-purchases": totalPurchases,
      "direct-expenses": directExp,
      "indirect-expenses": indirectExp,
      "loans-liability": loanOutstandingTotal,
      "bank-loan-ledger": loans.filter(l => l.sourceType === "bank").reduce((s, l) => s + l.outstanding, 0),
      "personal-borrowing": loans.filter(l => l.sourceType === "person").reduce((s, l) => s + l.outstanding, 0),
      "duties-taxes": gstCollected - gstInput,
      "gst-payable": gstCollected - gstInput,
      "capital-account": ownerCapital + partnerCapital,
      "owner-capital": ownerCapital,
      "partner-capital": partnerCapital,
      "owner-drawings": ownerDrawings,
      "advances-from-customers": customerAdvances,
      "current-assets": receivables + inventoryValue,
      "current-liabilities": payables + (gstCollected - gstInput),
    } as Record<string, number>;
  }, [invoices, saleBills, vendorBills, inventoryItems, tools, expenses, incomes, loans, payments, ownerInvestments, partnerTransactions, vendors, customers, vendorPayments, partners]);

  const getBalance = (id: string): number => balances[id] || 0;

  // Detail panel data based on selection
  const detailData = useMemo(() => {
    if (!selectedItem) return null;
    const id = selectedItem.id;

    if (id === "sundry-debtors" || id === "trade-receivables") {
      const allInv = [...invoices, ...saleBills];
      const unpaid = allInv.filter(
        (i) => i.status !== "paid" && i.status !== "voided" && i.status !== "draft" && getInvoiceOpenBalance(i, payments) > 0,
      );
      return {
        title: "Sundry Debtors — Customer Ledgers",
        kpis: [
          { label: "Total Receivable", value: formatINR(unpaid.reduce((s, i) => s + getInvoiceOpenBalance(i, payments), 0)) },
          { label: "Unpaid Invoices", value: unpaid.length.toString() },
          { label: "Customers", value: new Set(unpaid.map(i => i.customerName)).size.toString() },
        ],
        columns: ["Customer", "Invoice", "Total", "Received", "Outstanding"],
        rows: unpaid.map((i) => {
          const received = getInvoiceAmountReceived(i.id, payments, i);
          const outstanding = getInvoiceOpenBalance(i, payments);
          return [i.customerName, i.invoiceNumber, formatINR(i.total), formatINR(received), formatINR(outstanding)];
        }),
      };
    }

    if (id === "sundry-creditors" || id === "trade-payables") {
      const unpaid = vendorBills.filter(b => b.status !== "paid");
      return {
        title: "Sundry Creditors — Vendor Ledgers",
        kpis: [
          { label: "Total Payable", value: formatINR(unpaid.reduce((s, b) => s + (b.total - b.amountPaid), 0)) },
          { label: "Unpaid Bills", value: unpaid.length.toString() },
          { label: "Vendors", value: new Set(unpaid.map(b => b.vendorName)).size.toString() },
        ],
        columns: ["Vendor", "Bill #", "Total", "Paid", "Outstanding"],
        rows: unpaid.map(b => [b.vendorName, b.billNumber, formatINR(b.total), formatINR(b.amountPaid), formatINR(b.total - b.amountPaid)]),
      };
    }

    if (id === "stock-in-hand" || id.endsWith("-stock")) {
      return {
        title: "Stock-in-Hand — Inventory Valuation",
        kpis: [
          { label: "Total Items", value: inventoryItems.length.toString() },
          { label: "Total Valuation", value: formatINR(inventoryItems.reduce((s, i) => s + i.stock * i.buyPrice, 0)) },
          { label: "Low Stock Items", value: inventoryItems.filter(i => i.stock <= i.minStock).length.toString() },
        ],
        columns: ["Item", "Category", "Stock", "Buy Price", "Valuation"],
        rows: inventoryItems.map(i => [i.name, i.category, i.stock.toString(), formatINR(i.buyPrice), formatINR(i.stock * i.buyPrice)]),
      };
    }

    if (id === "fixed-assets" || id === "tools-equipment") {
      return {
        title: "Fixed Assets — Tools & Equipment",
        kpis: [
          { label: "Total Tools", value: tools.length.toString() },
          { label: "Total Value", value: formatINR(tools.reduce((s, t) => s + t.purchaseRate, 0)) },
        ],
        columns: ["Tool", "Category", "Purchase Price", "Purchase Date", "Status"],
        rows: tools.map(t => [t.name, t.category, formatINR(t.purchaseRate), t.purchaseDate, t.status]),
      };
    }

    if (id === "sales-accounts" || id === "solar-sales" || id === "material-sales" || id === "service-sales") {
      const allInv = [...invoices, ...saleBills];
      return {
        title: "Sales Accounts — Revenue Ledger",
        kpis: [
          { label: "Total Revenue", value: formatINR(allInv.reduce((s, i) => s + i.total, 0)) },
          { label: "Invoices", value: invoices.length.toString() },
          { label: "Sale Bills", value: saleBills.length.toString() },
        ],
        columns: ["Invoice #", "Customer", "Date", "Total", "Status"],
        rows: allInv.map(i => [i.invoiceNumber, i.customerName, i.invoiceDate, formatINR(i.total), i.status]),
      };
    }

    if (id === "purchase-accounts" || id === "material-purchases") {
      return {
        title: "Purchase Accounts — Vendor Bills",
        kpis: [
          { label: "Total Purchases", value: formatINR(vendorBills.reduce((s, b) => s + b.total, 0)) },
          { label: "Bills", value: vendorBills.length.toString() },
        ],
        columns: ["Bill #", "Vendor", "Date", "Total", "Status"],
        rows: vendorBills.map(b => [b.billNumber, b.vendorName, b.billDate, formatINR(b.total), b.status]),
      };
    }

    if (id === "direct-expenses" || id === "indirect-expenses") {
      const filtered = id === "direct-expenses"
        ? expenses.filter(e => ["employee", "site", "partner"].includes(e.mainCategory))
        : expenses.filter(e => ["company", "office"].includes(e.mainCategory));
      return {
        title: id === "direct-expenses" ? "Direct Expenses" : "Indirect Expenses",
        kpis: [
          { label: "Total", value: formatINR(filtered.reduce((s, e) => s + e.amount, 0)) },
          { label: "Entries", value: filtered.length.toString() },
        ],
        columns: ["Date", "Category", "Description", "Amount"],
        rows: filtered.map(e => [e.date, e.category, e.description || e.category, formatINR(e.amount)]),
      };
    }

    if (id === "loans-liability" || id === "bank-loan" || id === "unsecured-loan" || id === "bank-loan-ledger" || id === "personal-borrowing") {
      return {
        title: "Loans — Outstanding Balances",
        kpis: [
          { label: "Total Loans", value: formatINR(loans.reduce((s, l) => s + l.principal, 0)) },
          { label: "Total Repaid", value: formatINR(loanRepayments.reduce((s, r) => s + r.totalPaid, 0)) },
          { label: "Active Loans", value: loans.filter(l => l.status === "Active").length.toString() },
        ],
        columns: ["Source", "Type", "Principal", "EMI", "Status"],
        rows: loans.map(l => [l.source, l.sourceType, formatINR(l.principal), l.emiAmount ? formatINR(l.emiAmount) : "—", l.status]),
      };
    }

    if (id === "capital-account" || id === "owner-capital" || id === "partner-capital") {
      return {
        title: "Capital Account",
        kpis: [
          { label: "Owner Capital", value: formatINR(ownerInvestments.reduce((s, o) => s + o.amount, 0)) },
          { label: "Partner Capital", value: formatINR(partnerTransactions.filter(t => t.type === "Investment").reduce((s, t) => s + t.amount, 0)) },
          { label: "Partners", value: partners.length.toString() },
        ],
        columns: ["Type", "Name", "Amount", "Date"],
        rows: [
          ...ownerInvestments.map(o => ["Owner Investment", "MK", formatINR(o.amount), o.date]),
          ...partnerTransactions.filter(t => t.type === "Investment").map(t => {
            const p = partners.find(pt => pt.id === t.partnerId);
            return ["Partner Investment", p?.name || "—", formatINR(t.amount), t.date];
          }),
        ],
      };
    }

    // Default: show ledgers in group
    const group = ACCOUNT_GROUPS.find(g => g.id === id);
    if (group) {
      const ledgers = getAllLedgersUnderGroup(id);
      return {
        title: group.name,
        kpis: [{ label: "Ledger Accounts", value: ledgers.length.toString() }],
        columns: ["Ledger", "Description", "Sources"],
        rows: ledgers.map(l => [l.name, l.description || "", l.sources.join(", ")]),
      };
    }

    const ledger = LEDGER_ACCOUNTS.find(l => l.id === id);
    if (ledger) {
      return {
        title: ledger.name,
        kpis: [{ label: "Balance", value: formatINR(getBalance(id)) }],
        columns: ["Property", "Value"],
        rows: [
          ["Group", ACCOUNT_GROUPS.find(g => g.id === ledger.groupId)?.name || "—"],
          ["Nature", ledger.nature],
          ["Sources", ledger.sources.join(", ")],
          ["Description", ledger.description || "—"],
        ],
      };
    }

    return null;
    // Intentionally exclude `getBalance` — it's recomputed on each render but reads the same dependencies already listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem, invoices, saleBills, vendorBills, inventoryItems, tools, expenses, loans, loanRepayments, payments, ownerInvestments, partnerTransactions, partners, balances]);

  // Filter groups/ledgers by search
  const primaryGroups = ACCOUNT_GROUPS.filter(g => g.parentId === null);
  const matchesSearch = (name: string) => !search || name.toLowerCase().includes(search.toLowerCase());

  const renderGroupNode = (group: AccountGroup, depth: number = 0) => {
    const subGroups = getSubGroups(group.id);
    const ledgers = getLedgersByGroup(group.id);
    const hasChildren = subGroups.length > 0 || ledgers.length > 0;
    const isExpanded = expandedGroups.has(group.id);
    const isSelected = selectedItem?.id === group.id;
    const colors = natureColors[group.nature];
    const balance = getBalance(group.id);

    // Search filtering
    const childGroupsMatch = subGroups.some(sg => matchesSearch(sg.name) || getLedgersByGroup(sg.id).some(l => matchesSearch(l.name)));
    const childLedgersMatch = ledgers.some(l => matchesSearch(l.name));
    const selfMatch = matchesSearch(group.name);
    if (search && !selfMatch && !childGroupsMatch && !childLedgersMatch) return null;

    return (
      <div key={group.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors",
            depth === 0 ? `border ${colors.bg} mb-1` : "hover:bg-muted/50",
            isSelected && "ring-2 ring-primary/50"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            if (hasChildren) toggleGroup(group.id);
            setSelectedItem({ type: "group", id: group.id });
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <div className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className={cn("text-sm font-medium flex-1", depth === 0 ? colors.text : "text-foreground")}>{group.name}</span>
          {balance > 0 && <span className="text-xs tabular-nums text-muted-foreground">{formatINR(balance)}</span>}
          {depth === 0 && (
            <Badge variant="outline" className={cn("text-2xs px-1.5 py-0 shrink-0", colors.badge)}>
              {group.nature}
            </Badge>
          )}
        </div>
        {isExpanded && (
          <div>
            {subGroups.map(sg => renderGroupNode(sg, depth + 1))}
            {ledgers.map(l => renderLedgerNode(l, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const postingRules = useMemo(() => listVoucherPostingRules(), []);
  const postingValidation = useMemo(() => validatePostingAccountMap(), []);

  const natureStripItems = useMemo(
    () =>
      (["asset", "liability", "income", "expense"] as AccountNature[]).map((nature) => {
        const groups = ACCOUNT_GROUPS.filter((g) => g.nature === nature && g.parentId === null);
        const totalLedgers = groups.reduce((s, g) => s + getAllLedgersUnderGroup(g.id).length, 0);
        const label =
          nature === "asset"
            ? "Assets"
            : nature === "liability"
              ? "Liabilities"
              : nature === "income"
                ? "Income"
                : "Expenses";
        return { label, value: `${groups.length} · ${totalLedgers}` };
      }),
    [],
  );

  const renderLedgerNode = (ledger: Ledger, depth: number) => {
    const isSelected = selectedItem?.type === "ledger" && selectedItem?.id === ledger.id;
    const balance = getBalance(ledger.id);

    if (search && !matchesSearch(ledger.name)) return null;

    return (
      <div
        key={ledger.id}
        className={cn(
          "flex items-center gap-2 py-1.5 px-3 rounded-md cursor-pointer transition-colors hover:bg-muted/50",
          isSelected && "bg-primary/10 ring-1 ring-primary/30"
        )}
        style={{ paddingLeft: `${12 + depth * 16 + 16}px` }}
        onClick={() => setSelectedItem({ type: "ledger", id: ledger.id })}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">{ledger.name}</span>
        {balance > 0 && <span className="text-xs tabular-nums text-muted-foreground">{formatINR(balance)}</span>}
      </div>
    );
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Chart of accounts" },
        ]}
        subRow={
          <InlineKpiStrip className="w-full min-w-0 flex-wrap justify-start" items={natureStripItems} />
        }
      >
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => {
            const rows = LEDGER_ACCOUNTS.map((l) => ({
              id: l.id,
              name: l.name,
              group: l.groupId,
              nature: l.nature,
              balance: getBalance(l.id),
            }));
            downloadCSV("chart_of_accounts.csv", rows, ["id", "name", "group", "nature", "balance"]);
            toast({ title: "Exported", description: `${rows.length} ledgers exported to CSV.` });
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Export CSV
        </Button>
      </StickyPageHeader>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Panel - Tree */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Account Hierarchy
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh] px-3 pb-3">
              <div className="space-y-1">
                {/* Liabilities */}
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-3 pb-1">Liabilities</p>
                {primaryGroups.filter(g => g.nature === "liability").map(g => renderGroupNode(g))}

                {/* Assets */}
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Assets</p>
                {primaryGroups.filter(g => g.nature === "asset").map(g => renderGroupNode(g))}

                {/* Income */}
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Income</p>
                {primaryGroups.filter(g => g.nature === "income").map(g => renderGroupNode(g))}

                {/* Expenses */}
                <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Expenses</p>
                {primaryGroups.filter(g => g.nature === "expense").map(g => renderGroupNode(g))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Panel - Details */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            {detailData ? (
              <div>
                <div className="p-4 border-b border-border">
                  <h3 className="text-base font-semibold text-foreground">{detailData.title}</h3>
                  <div className="flex flex-wrap gap-4 mt-3">
                    {detailData.kpis.map(kpi => (
                      <div key={kpi.label}>
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-0 pb-4 pt-2">
                  <ChartDetailLedgerTable
                    columns={detailData.columns}
                    rows={detailData.rows}
                    resetKey={selectedItem ? `${selectedItem.type}-${selectedItem.id}` : "none"}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-medium text-foreground mb-1">Select an Account</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Click on any account group or ledger in the hierarchy to view its details, balances, and related records.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Auto-posting rules (VoucherPostingService ↔ COA) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Auto-Posting Rules (VoucherPostingService)
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {postingValidation.ok
              ? "All posting account codes map to Chart of Accounts ledgers."
              : `Mapping gaps: ${[...postingValidation.unmapped, ...postingValidation.missingLedgers].join(", ")}`}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ChartDetailLedgerTable
            columns={["Event", "Side", "Posting code", "COA ledger"]}
            rows={postingRules.map((r) => [
              r.eventType,
              r.side,
              r.accountCode,
              r.mapped ? r.ledgerName : `${r.ledgerName} (unmapped)`,
            ])}
            resetKey={`posting-${postingRules.length}-${postingValidation.ok}`}
          />
        </CardContent>
      </Card>

      {/* Voucher Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Voucher Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {VOUCHER_TYPES.map(v => (
              <div key={v.type} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{v.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{v.description}</p>
                <div className="space-y-1">
                  <div className="flex items-start gap-1">
                    <span className="text-2xs font-medium text-primary shrink-0">Dr:</span>
                    <div className="flex flex-wrap gap-1">
                      {v.debitLedgers.slice(0, 3).map(l => {
                        const ledger = LEDGER_ACCOUNTS.find(la => la.id === l);
                        return <Badge key={l} variant="secondary" className="text-2xs px-1 py-0">{ledger?.name || l}</Badge>;
                      })}
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-2xs font-medium text-accent-foreground shrink-0">Cr:</span>
                    <div className="flex flex-wrap gap-1">
                      {v.creditLedgers.slice(0, 3).map(l => {
                        const ledger = LEDGER_ACCOUNTS.find(la => la.id === l);
                        return <Badge key={l} variant="secondary" className="text-2xs px-1 py-0">{ledger?.name || l}</Badge>;
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {v.operationalSources.map(s => (
                    <Badge key={s} variant="outline" className="text-2xs px-1.5 py-0 border-primary/30 text-primary">{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default ChartOfAccounts;

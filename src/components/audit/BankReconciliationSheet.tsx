import { Fragment, useState, useMemo, useCallback, useEffect } from "react";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { AppSheetFormFooter } from "@/components/shared/AppSheetFormFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { Upload, FileText, CheckCircle2, AlertTriangle, Copy, Landmark, X, Search, Download, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildReconciliationMatchDetailLines,
  reconciliationResultRowKey,
} from "@/lib/bankReconciliationDisplay";
import { toBankReconciliationMatchInputs } from "@/lib/bankReconciliationLink";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { fileExceedsLimit, MAX_UPLOAD_BYTES } from "@/lib/fileLimits";
import { formatINR } from "@/lib/formatCurrency";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";
import type {
  BankReconciliationStatement,
  BankStatementTransaction,
} from "@/types/finance";

/** @deprecated Use `BankReconciliationStatement` from `@/types/finance`. */
export type UploadedStatement = BankReconciliationStatement;

type BankTransaction = BankStatementTransaction;

type FlagType = "matched" | "unmatched" | "duplicate" | "bank-charge" | "possible-match";

interface ReconciliationEntry {
  bankTransaction: BankTransaction;
  flag: FlagType;
  matchedLedgerEntry?: {
    id: string;
    type: string;
    description: string;
    amount: number;
    date: string;
  };
  notes?: string;
  statementId: string;
  statementName: string;
}

const BANK_CHARGE_KEYWORDS = [
  "bank charge", "service charge", "sms charge", "annual fee", "maintenance charge",
  "interest charge", "penalty", "min bal", "minimum balance", "ach charge",
  "neft charge", "rtgs charge", "imps charge", "cheque return", "ecs charge",
  "gst on charge", "folio charge", "debit card fee", "atm charge",
];

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const formats = [
    /^(\d{2})[/-](\d{2})[/-](\d{4})$/,
    /^(\d{4})[/-](\d{2})[/-](\d{2})$/,
  ];

  const m1 = dateStr.match(formats[0]);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  const m2 = dateStr.match(formats[1]);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

  return dateStr;
};

const parseBankAmount = (raw: string | undefined): number => {
  if (!raw?.trim()) return 0;
  const cleaned = raw.replace(/[₹Rs.\s]/gi, "").replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const isValidBankDate = (dateStr: string): boolean => {
  const normalized = normalizeDate(dateStr);
  if (!normalized) return false;
  const d = parseISO(normalized);
  return isValid(d);
};

const parseCSV = (content: string): { transactions: BankTransaction[]; skippedInvalid: number } => {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return { transactions: [], skippedInvalid: 0 };

  const header = lines[0].toLowerCase();
  const headers = header.split(",").map(h => h.trim().replace(/"/g, ""));

  const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("txn") || h.includes("value"));
  const descIdx = headers.findIndex(h => h.includes("description") || h.includes("narration") || h.includes("particular") || h.includes("remark"));
  const debitIdx = headers.findIndex(h => h.includes("debit") || h.includes("withdrawal") || h.includes("dr"));
  const creditIdx = headers.findIndex(h => h.includes("credit") || h.includes("deposit") || h.includes("cr"));
  const balIdx = headers.findIndex(h => h.includes("balance") || h.includes("closing"));
  const refIdx = headers.findIndex(h => h.includes("ref") || h.includes("chq") || h.includes("utr"));

  const mapRow = (cols: string[], rawLine: string): BankTransaction | null => {
    const date = dateIdx >= 0 ? cols[dateIdx] || "" : cols[0] || "";
    if (!isValidBankDate(date)) return null;
    return {
      date,
      description: (descIdx >= 0 ? cols[descIdx] : cols[1]) || "",
      debit: debitIdx >= 0 ? parseBankAmount(cols[debitIdx]) : parseBankAmount(cols[2]),
      credit: creditIdx >= 0 ? parseBankAmount(cols[creditIdx]) : parseBankAmount(cols[3]),
      balance: balIdx >= 0 ? parseBankAmount(cols[balIdx]) : parseBankAmount(cols[4]),
      reference: refIdx >= 0 ? cols[refIdx] : cols[5] || "",
      rawLine,
    };
  };

  let skippedInvalid = 0;
  const dataLines = lines.slice(1).filter((l) => l.trim());

  if (dateIdx === -1 || descIdx === -1) {
    const transactions: BankTransaction[] = [];
    for (const line of dataLines) {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      const row = mapRow(cols, line);
      if (row) transactions.push(row);
      else skippedInvalid += 1;
    }
    return { transactions, skippedInvalid };
  }

  const transactions: BankTransaction[] = [];
  for (const line of dataLines) {
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
    const row = mapRow(cols, line);
    if (row) transactions.push(row);
    else skippedInvalid += 1;
  }
  return { transactions, skippedInvalid };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BankReconciliationSheet = ({ open, onOpenChange }: Props) => {
  const {
    expenses,
    incomes,
    payments,
    vendorPayments,
    bankReconciliationStatements,
    setBankReconciliationStatements,
    syncBankReconciliationLinks,
    clearBankReconciliationLinksForStatement,
  } = useAppData();
  const [statements, setStatements] = useState<BankReconciliationStatement[]>(
    () => bankReconciliationStatements ?? [],
  );
  const [activeTab, setActiveTab] = useState("upload");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(() => new Set());

  // Hydrate from context whenever the modal re-opens so prior uploads survive close/reopen (B13).
  useEffect(() => {
    if (open) setStatements(bankReconciliationStatements ?? []);
  }, [open, bankReconciliationStatements]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
    },
    [onOpenChange],
  );

  /** B2.16: min/max statement dates from uploaded CSVs (prototype “period” for sanity checks). */
  const statementDateWindow = useMemo(() => {
    const dates: Date[] = [];
    for (const stmt of statements) {
      for (const t of stmt.transactions) {
        const n = normalizeDate(t.date);
        if (!n) continue;
        const d = parseISO(n);
        if (isValid(d)) dates.push(d);
      }
    }
    if (!dates.length) return null;
    dates.sort((a, b) => a.getTime() - b.getTime());
    return { start: dates[0], end: dates[dates.length - 1] };
  }, [statements]);

  // Build ledger entries from all financial data
  const ledgerEntries = useMemo(() => {
    const entries: {
      id: string;
      type: string;
      description: string;
      amount: number;
      date: string;
      direction: "debit" | "credit";
      reconciledWith?: import("@/types/finance").BankReconciliationLink;
    }[] = [];

    expenses.forEach(e => {
      entries.push({
        id: e.id,
        type: "Expense",
        description: `${e.category}${e.subCategory ? ` - ${e.subCategory}` : ""}${e.notes ? ` (${e.notes})` : ""}`,
        amount: e.amount,
        date: e.date,
        direction: "debit",
        reconciledWith: e.reconciledWith,
      });
    });

    incomes.forEach(inc => {
      entries.push({
        id: inc.id,
        type: "Income",
        description: `${inc.category}${inc.projectName ? ` - ${inc.projectName}` : ""}${inc.notes ? ` (${inc.notes})` : ""}`,
        amount: inc.amount,
        date: inc.date,
        direction: "credit",
        reconciledWith: inc.reconciledWith,
      });
    });

    payments.forEach(p => {
      entries.push({
        id: p.id,
        type: p.direction === "in" ? "Payment Received" : "Payment Paid",
        description: `${p.counterpartyName || ""}${p.notes ? ` (${p.notes})` : ""}`,
        amount: p.amount,
        date: p.date,
        direction: p.direction === "in" ? "credit" : "debit",
        reconciledWith: p.reconciledWith,
      });
    });

    vendorPayments.forEach(vp => {
      entries.push({
        id: vp.id,
        type: "Vendor Payment",
        description: `Vendor Bill ${vp.billId}${vp.reference ? ` - ${vp.reference}` : ""}`,
        amount: vp.amount,
        date: vp.date,
        direction: "debit",
        reconciledWith: vp.reconciledWith,
      });
    });

    return entries;
  }, [expenses, incomes, payments, vendorPayments]);

  // Reconcile uploaded statements against ledger
  const reconciliationResults = useMemo((): ReconciliationEntry[] => {
    if (statements.length === 0) return [];

    const results: ReconciliationEntry[] = [];
    const usedLedgerIds = new Set<string>();
    const seenAmounts = new Map<string, number>(); // track for duplicates

    for (const stmt of statements) {
      for (const txn of stmt.transactions) {
        const txnAmount = txn.debit || txn.credit;
        if (txnAmount === 0) continue;

        const txnDate = normalizeDate(txn.date);
        const desc = txn.description.toLowerCase();

        // Check bank charges first
        const isBankCharge = BANK_CHARGE_KEYWORDS.some(kw => desc.includes(kw));
        if (isBankCharge) {
          results.push({
            bankTransaction: txn,
            flag: "bank-charge",
            notes: "Auto-detected bank charge/fee",
            statementId: stmt.id,
            statementName: stmt.fileName,
          });
          continue;
        }

        // Check for duplicates within uploaded statements
        const dupeKey = `${txnDate}-${txnAmount}`;
        const dupeCount = seenAmounts.get(dupeKey) || 0;
        seenAmounts.set(dupeKey, dupeCount + 1);
        if (dupeCount > 0) {
          results.push({
            bankTransaction: txn,
            flag: "duplicate",
            notes: `Duplicate: same amount ₹${txnAmount.toLocaleString("en-IN")} on ${txnDate} appears ${dupeCount + 1} times`,
            statementId: stmt.id,
            statementName: stmt.fileName,
          });
          continue;
        }

        // Try exact match (amount + date within 2 days)
        const direction = txn.debit > 0 ? "debit" : "credit";
        let matched = false;

        for (const entry of ledgerEntries) {
          if (usedLedgerIds.has(entry.id)) continue;
          if (Math.abs(entry.amount - txnAmount) > 0.5) continue;
          if (entry.direction !== direction) continue;

          // Date match: within 3 days
          try {
            const entryDate = parseISO(entry.date);
            const bankDate = parseISO(txnDate);
            const diffDays = Math.abs((entryDate.getTime() - bankDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
              usedLedgerIds.add(entry.id);
              results.push({
                bankTransaction: txn,
                flag: "matched",
                matchedLedgerEntry: { id: entry.id, type: entry.type, description: entry.description, amount: entry.amount, date: entry.date },
                statementId: stmt.id,
                statementName: stmt.fileName,
              });
              matched = true;
              break;
            }
          } catch { /* skip date parse errors */ }
        }

        if (!matched) {
          // Try possible match (same amount, any date)
          const possibleMatch = ledgerEntries.find(
            e => !usedLedgerIds.has(e.id) && Math.abs(e.amount - txnAmount) < 1 && e.direction === direction
          );

          if (possibleMatch) {
            results.push({
              bankTransaction: txn,
              flag: "possible-match",
              matchedLedgerEntry: {
                id: possibleMatch.id,
                type: possibleMatch.type,
                description: possibleMatch.description,
                amount: possibleMatch.amount,
                date: possibleMatch.date,
                reconciledWith: possibleMatch.reconciledWith,
              },
              notes: "Amount matches but date differs significantly",
              statementId: stmt.id,
              statementName: stmt.fileName,
            });
          } else {
            results.push({
              bankTransaction: txn,
              flag: "unmatched",
              notes: "No matching ledger entry found",
              statementId: stmt.id,
              statementName: stmt.fileName,
            });
          }
        }
      }
    }

    return results;
  }, [statements, ledgerEntries]);

  const handleSave = useCallback(() => {
    setBankReconciliationStatements?.(statements);
    const matches = toBankReconciliationMatchInputs(reconciliationResults, normalizeDate);
    syncBankReconciliationLinks?.(
      statements.map((s) => s.id),
      matches,
    );
    const linkedCount = matches.length;
    toast({
      title: "Reconciliation saved",
      description:
        linkedCount > 0
          ? `${linkedCount} ledger row(s) tagged with bank statement links.`
          : "Uploaded statements are stored for this session.",
    });
  }, [reconciliationResults, statements, setBankReconciliationStatements, syncBankReconciliationLinks]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: "bank" | "cash") => {
    const files = e.target.files;
    if (!files) return;

    const wasEmpty = statements.length === 0;

    for (const file of Array.from(files)) {
      if (fileExceedsLimit(file)) {
        toast({ title: `${file.name}: File exceeds ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit`, variant: "destructive" });
        continue;
      }
      if (!file.name.endsWith(".csv")) {
        toast({ title: `${file.name}: Only CSV files supported`, variant: "destructive" });
        continue;
      }

      const content = await file.text();
      const { transactions, skippedInvalid } = parseCSV(content);

      if (transactions.length === 0) {
        toast({
          title: `${file.name}: No valid transactions`,
          description:
            skippedInvalid > 0
              ? `${skippedInvalid} row(s) skipped — check date format (DD/MM/YYYY or YYYY-MM-DD).`
              : "Check CSV format and column headers.",
          variant: "destructive",
        });
        continue;
      }

      if (skippedInvalid > 0) {
        toast({
          title: `${file.name}: ${skippedInvalid} row(s) skipped`,
          description: "Rows with unparseable dates were not imported.",
        });
      }

      const parsedDates = transactions
        .map((t) => normalizeDate(t.date))
        .filter(Boolean)
        .map((d) => parseISO(d!))
        .filter(isValid);
      if (parsedDates.length === 0) {
        toast({ title: `${file.name}: No parsable dates — row matching will be unreliable.` });
      } else {
        parsedDates.sort((a, b) => a.getTime() - b.getTime());
        const minT = parsedDates[0].getTime();
        const maxT = parsedDates[parsedDates.length - 1].getTime();
        const dayMs = 1000 * 60 * 60 * 24;
        const spanDays = (maxT - minT) / dayMs;
        if (spanDays > 400) {
          toast({
            title: `${file.name}: date range spans about ${Math.round(spanDays)} days — check column mapping and date format.`,
          });
        }
        if (statements.length > 0) {
          let exMin = Infinity;
          let exMax = -Infinity;
          for (const stmt of statements) {
            for (const t of stmt.transactions) {
              const n = normalizeDate(t.date);
              if (!n) continue;
              const d = parseISO(n);
              if (!isValid(d)) continue;
              exMin = Math.min(exMin, d.getTime());
              exMax = Math.max(exMax, d.getTime());
            }
          }
          if (exMin !== Infinity && maxT < exMin - 365 * dayMs) {
            toast({ title: `${file.name}: dates are more than a year before prior uploads — confirm period.` });
          }
          if (exMax !== -Infinity && minT > exMax + 365 * dayMs) {
            toast({ title: `${file.name}: dates are more than a year after prior uploads — confirm period.` });
          }
        }
      }

      setStatements(prev => [
        ...prev,
        {
          id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
          type,
          transactions,
          uploadedAt: new Date().toISOString(),
        },
      ]);

      toast({ title: `${file.name}: ${transactions.length} transactions imported` });
    }

    e.target.value = "";
    // Switch to results tab after the first successful upload (was empty before this upload)
    if (wasEmpty) {
      setActiveTab("results");
    }
  }, [statements]);

  const removeStatement = (id: string) => {
    setStatements(prev => prev.filter(s => s.id !== id));
    clearBankReconciliationLinksForStatement?.(id);
  };

  const flagCounts = useMemo(() => {
    const counts = { matched: 0, unmatched: 0, duplicate: 0, "bank-charge": 0, "possible-match": 0 };
    reconciliationResults.forEach(r => counts[r.flag]++);
    return counts;
  }, [reconciliationResults]);

  const filteredResults = useMemo(() => {
    if (!searchQuery) return reconciliationResults;
    const q = searchQuery.toLowerCase();
    return reconciliationResults.filter(r =>
      r.bankTransaction.description.toLowerCase().includes(q) ||
      r.flag.includes(q) ||
      r.matchedLedgerEntry?.description.toLowerCase().includes(q) ||
      r.statementName.toLowerCase().includes(q)
    );
  }, [reconciliationResults, searchQuery]);

  const getFlagBadge = (flag: FlagType) => {
    switch (flag) {
      case "matched":
        return <Badge className="bg-primary/15 text-primary border-primary text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Matched</Badge>;
      case "unmatched":
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Unmatched</Badge>;
      case "duplicate":
        return <Badge className="bg-warning/15 text-warning border-warning text-xs"><Copy className="w-3 h-3 mr-1" />Duplicate</Badge>;
      case "bank-charge":
        return <Badge className="bg-primary/15 text-primary border-primary/30 text-xs"><Landmark className="w-3 h-3 mr-1" />Bank Charge</Badge>;
      case "possible-match":
        return <Badge className="bg-accent/30 text-accent-foreground border-accent text-xs"><Search className="w-3 h-3 mr-1" />Possible Match</Badge>;
    }
  };

  const bankMoney = (v: number) => (v ? formatINR(v) : "-");

  const toggleRowExpanded = useCallback((rowKey: string) => {
    setExpandedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  }, []);

  const exportResults = () => {
    if (reconciliationResults.length === 0) return;
    const csvLines = [
      "Statement,Date,Description,Debit,Credit,Flag,Matched Entry,Notes",
      ...reconciliationResults.map(r =>
        [
          r.statementName,
          r.bankTransaction.date,
          `"${r.bankTransaction.description}"`,
          r.bankTransaction.debit || "",
          r.bankTransaction.credit || "",
          r.flag,
          r.matchedLedgerEntry ? `"${r.matchedLedgerEntry.type}: ${r.matchedLedgerEntry.description}"` : "",
          r.notes ? `"${r.notes}"` : "",
        ].join(",")
      ),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported" });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <AppSheetContent layout="document" size="wide" mobileFullScreen className="gap-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Landmark className="w-5 h-5 text-primary" />
            Verify Against Cash & Bank Statements
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-full max-w-sm">
            <TabsTrigger value="upload">Upload Statements</TabsTrigger>
            <TabsTrigger value="results" disabled={statements.length === 0}>
              Results {reconciliationResults.length > 0 && `(${reconciliationResults.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1 space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Statement Upload */}
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <Landmark className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground mb-1">Bank Statement</h3>
                  <p className="text-xs text-muted-foreground mb-4">Upload CSV from your bank portal</p>
                  <Label htmlFor="bank-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose Files
                    </div>
                    <Input
                      id="bank-upload"
                      type="file"
                      accept=".csv"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "bank")}
                    />
                  </Label>
                </CardContent>
              </Card>

              {/* Cash Statement Upload */}
              <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6 text-center">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground mb-1">Cash Statement</h3>
                  <p className="text-xs text-muted-foreground mb-4">Upload cash register or petty cash CSV</p>
                  <Label htmlFor="cash-upload" className="cursor-pointer">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose Files
                    </div>
                    <Input
                      id="cash-upload"
                      type="file"
                      accept=".csv"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "cash")}
                    />
                  </Label>
                </CardContent>
              </Card>
            </div>

            {statementDateWindow && (
              <Card className="border-primary/20 bg-muted/30">
                <CardContent className="p-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Statement date window (all uploads):</span>
                  <span className="font-medium text-foreground">
                    {format(statementDateWindow.start, "dd MMM yyyy")} – {format(statementDateWindow.end, "dd MMM yyyy")}
                  </span>
                </CardContent>
              </Card>
            )}

            {/* Uploaded statements list */}
            {statements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Uploaded Statements ({statements.length})</h4>
                {statements.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-3">
                      {s.type === "bank" ? <Landmark className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium text-foreground">{s.fileName}</p>
                        <p className="text-xs text-muted-foreground">{s.transactions.length} transactions • {s.type === "bank" ? "Bank" : "Cash"}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Remove statement" onClick={() => removeStatement(s.id)}>
                      <X className="w-4 h-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button className="w-full mt-2" onClick={() => setActiveTab("results")}>
                  Run Reconciliation
                </Button>
              </div>
            )}

            {/* CSV Format Guide */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2">Expected CSV Format</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Your CSV should have headers like: <span className="font-mono text-foreground">Date, Description/Narration, Debit/Withdrawal, Credit/Deposit, Balance</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Most Indian banks (SBI, HDFC, ICICI, Axis, Kotak) export in compatible formats. Download your statement as CSV from net banking.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-4 flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
            {/* Summary KPIs */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Matched", count: flagCounts.matched, color: "text-primary" },
                { label: "Unmatched", count: flagCounts.unmatched, color: "text-destructive" },
                { label: "Possible", count: flagCounts["possible-match"], color: "text-accent-foreground" },
                { label: "Duplicates", count: flagCounts.duplicate, color: "text-warning" },
                { label: "Bank Charges", count: flagCounts["bank-charge"], color: "text-primary" },
              ].map(k => (
                <Card key={k.label}>
                  <CardContent className="p-3 text-center">
                    <p className={`text-xl font-bold ${k.color}`}>{k.count}</p>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search + Export */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportResults} disabled={reconciliationResults.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>

            {/* Results Table — horizontal + vertical scroll on narrow viewports (MR4) */}
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border"
              role="region"
              aria-label="Reconciliation results table"
            >
              <div className="min-h-0 flex-1 overflow-auto">
                <Table noViewport className="min-w-[40rem] md:min-w-[52rem] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[12rem]">Description</TableHead>
                    <TableHead className="w-[90px] text-right">Debit</TableHead>
                    <TableHead className="w-[90px] text-right">Credit</TableHead>
                    <TableHead className="w-[120px] md:min-w-[120px]">Flag</TableHead>
                    <TableHead className="min-w-[14rem] hidden md:table-cell">Matched Ledger Entry</TableHead>
                    <TableHead className="w-[140px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length === 0 && (
                    <TableEmptyRow
                      colSpan={7}
                      icon={statements.length === 0 ? Upload : Search}
                      title={statements.length === 0 ? "Upload statements to begin" : "No results found"}
                      description={statements.length === 0 ? "Import bank CSV or statement files first." : "Try adjusting search or filters."}
                    />
                  )}
                  {filteredResults.map((r, i) => {
                    const rowKey = reconciliationResultRowKey(r.statementId, i);
                    const isExpanded = expandedRowKeys.has(rowKey);
                    const matchLines = buildReconciliationMatchDetailLines(r);
                    const rowTone =
                      r.flag === "unmatched" ? "bg-destructive/5" :
                      r.flag === "duplicate" ? "bg-warning/5" :
                      r.flag === "bank-charge" ? "bg-primary/5" :
                      r.flag === "possible-match" ? "bg-accent/30" :
                      "";
                    return (
                      <Fragment key={rowKey}>
                        <TableRow className={rowTone}>
                          <TableCell className="font-mono">{r.bankTransaction.date}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={r.bankTransaction.description}>
                            {r.bankTransaction.description}
                          </TableCell>
                          <TableCell className="text-right font-mono">{bankMoney(r.bankTransaction.debit)}</TableCell>
                          <TableCell className="text-right font-mono">{bankMoney(r.bankTransaction.credit)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getFlagBadge(r.flag)}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 md:hidden"
                                aria-expanded={isExpanded}
                                aria-label={
                                  isExpanded
                                    ? "Hide match details"
                                    : r.matchedLedgerEntry
                                      ? "Show matched ledger entry"
                                      : "Show reconciliation note"
                                }
                                onClick={() => toggleRowExpanded(rowKey)}
                              >
                                <ChevronDown
                                  className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
                                  aria-hidden
                                />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {r.matchedLedgerEntry ? (
                              <div title={`${r.matchedLedgerEntry.type}: ${r.matchedLedgerEntry.description}`}>
                                <span className="font-medium text-foreground">{r.matchedLedgerEntry.type}</span>
                                <span className="text-muted-foreground"> — {r.matchedLedgerEntry.description.slice(0, 40)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">{r.notes || "-"}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate" title={r.statementName}>
                            {r.statementName}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className={cn("md:hidden", rowTone)}>
                            <TableCell colSpan={7} className="border-t border-border/60 bg-muted/20 py-3">
                              <dl className="grid grid-cols-[minmax(5.5rem,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
                                {matchLines.map((line) => (
                                  <Fragment key={`${rowKey}-${line.label}`}>
                                    <dt className="text-muted-foreground">{line.label}</dt>
                                    <dd className="text-foreground break-words">{line.value}</dd>
                                  </Fragment>
                                ))}
                              </dl>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AppSheetFormFooter onCancel={() => handleOpenChange(false)}>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!setBankReconciliationStatements || !syncBankReconciliationLinks}
          >
            Save
          </Button>
        </AppSheetFormFooter>
      </AppSheetContent>
    </Sheet>
  );
};

export default BankReconciliationSheet;

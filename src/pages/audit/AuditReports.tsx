import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, TrendingUp, Package, Scale, BookOpen, Wallet, HardDrive, IndianRupee, FileSpreadsheet, Database } from "lucide-react";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { toast } from "@/hooks/use-toast";
import {
  buildCashBankEntries,
  computeGstSummary,
  computeProfitLoss,
  debtorCreditorSummary,
} from "@/lib/audit";
import { getInvoiceAmountReceived } from "@/lib/billingSelectors";

const AuditReports = () => {
  const {
    invoices,
    saleBills,
    expenses,
    incomes,
    vendorBills,
    inventoryItems,
    tools,
    payments,
    vendorPayments,
    loanRepayments,
    materialDamageRecords,
  } = useAppData();

  const downloadCSV = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No data", description: "No records to export", variant: "destructive" });
      return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        const str = String(val ?? "").replace(/"/g, '""');
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `${filename}.csv exported successfully` });
  };

  const reports = [
    {
      title: "Sales Register",
      description: "All invoices and sale bills with GST breakdown",
      icon: FileText,
      records: [...invoices, ...saleBills].length,
      onExport: () => downloadCSV(
        [...invoices, ...saleBills].map(inv => ({
          "Invoice #": inv.invoiceNumber, Date: inv.invoiceDate, Customer: inv.customerName,
          GSTIN: inv.customerGstin || "", "Place of Supply": inv.customerState || "",
          Subtotal: inv.subtotal, CGST: inv.cgst, SGST: inv.sgst, IGST: inv.igst, Total: inv.total,
          "Amount Received": getInvoiceAmountReceived(inv.id, payments, inv), Status: inv.status,
        })), "sales_register"),
    },
    {
      title: "Purchase Register",
      description: "Vendor bills with GST input credit",
      icon: FileSpreadsheet,
      records: vendorBills.length,
      onExport: () => downloadCSV(
        vendorBills.map(b => ({
          "Bill #": b.billNumber, Date: b.billDate, Vendor: b.vendorName || `Vendor ${b.vendorId}`,
          Subtotal: b.subtotal || 0, GST: b.gst || 0, Total: b.total,
          "Amount Paid": b.amountPaid, Status: b.status,
        })), "purchase_register"),
    },
    {
      title: "Profit & Loss",
      description: "Revenue, COGS, and expense summary",
      icon: TrendingUp,
      records: null,
      onExport: () => {
        const pl = computeProfitLoss(
          {
            invoices,
            saleBills,
            expenses,
            incomes,
            vendorBills,
            inventoryItems,
            materialDamageRecords,
            payments,
          },
          () => true,
          "accrual",
        );
        downloadCSV(
          [
            { "Line Item": "Revenue (accrual)", Amount: pl.revenueTotal },
            { "Line Item": "COGS", Amount: pl.cogs },
            { "Line Item": "Damage write-off", Amount: pl.damageWriteOff },
            { "Line Item": "Agent / commission", Amount: pl.agentAndCommission },
            { "Line Item": "Partner share", Amount: pl.partnerShare },
            { "Line Item": "Direct expenses", Amount: pl.totalDirect },
            { "Line Item": "Indirect expenses", Amount: pl.totalIndirect },
            { "Line Item": "Net profit", Amount: pl.netProfit },
          ],
          "profit_loss",
        );
      },
    },
    {
      title: "Debtors Report",
      description: "Outstanding receivables from customers",
      icon: Scale,
      records: [...invoices, ...saleBills].filter(i => i.status !== "paid").length,
      onExport: () => {
        const dc = debtorCreditorSummary(invoices, saleBills, vendorBills, payments);
        downloadCSV(
          dc.debtors.map((inv) => ({
            Customer: inv.customerName,
            "Invoice #": inv.invoiceNumber,
            Total: inv.total,
            Received: inv.amountReceived,
            Outstanding: inv.outstanding,
            "Days overdue": inv.daysOverdue,
            Status: inv.status,
          })),
          "debtors_report",
        );
      },
    },
    {
      title: "Creditors Report",
      description: "Outstanding payables to vendors",
      icon: Scale,
      records: vendorBills.filter(b => b.status !== "paid").length,
      onExport: () => downloadCSV(
        vendorBills.filter(b => b.status !== "paid").map(b => ({
          Vendor: b.vendorName || `Vendor ${b.vendorId}`, "Bill #": b.billNumber,
          Total: b.total, Paid: b.amountPaid, Outstanding: b.total - b.amountPaid,
          "Due Date": b.dueDate || "", Status: b.status,
        })), "creditors_report"),
    },
    {
      title: "Inventory Valuation",
      description: "Current stock with buy and sale values",
      icon: Package,
      records: inventoryItems.length,
      onExport: () => downloadCSV(
        inventoryItems.map(item => ({
          Item: item.name, Category: item.category, HSN: item.hsn, Qty: item.stock,
          Unit: item.unit, "Buy Price": item.buyPrice, "Stock Value": item.stock * item.buyPrice,
          "Sale Price": item.salePrice, "Sale Value": item.stock * item.salePrice,
        })), "inventory_valuation"),
    },
    {
      title: "GST Summary",
      description: "Output vs Input GST with net payable",
      icon: BookOpen,
      records: null,
      onExport: () => {
        const gst = computeGstSummary(invoices, saleBills, vendorBills, () => true);
        downloadCSV(
          [
            { Item: "Output GST (CGST+SGST+IGST)", Amount: gst.outputGST },
            { Item: "Input GST Credit", Amount: gst.inputGST },
            { Item: "Net GST Payable", Amount: gst.netPayable },
            { Item: "Reverse-charge bills (notes)", Amount: gst.reverseChargeCount },
          ],
          "gst_summary",
        );
      },
    },
    {
      title: "Expense Report",
      description: "All expenses by category",
      icon: IndianRupee,
      records: expenses.length,
      onExport: () => downloadCSV(
        expenses.map(e => ({
          Date: e.date, "Main Category": e.mainCategory || "", Category: e.category,
          "Sub Category": e.subCategory || "", Amount: e.amount,
          Project: e.projectName || "", "Paid By": e.paidBy?.entityName || e.paidBy?.type || "",
          Mode: e.paymentMode || "", Notes: e.notes || "",
        })), "expense_report"),
    },
    {
      title: "Fixed Assets",
      description: "Tools and equipment with depreciation",
      icon: HardDrive,
      records: tools.length,
      onExport: () => downloadCSV(
        tools.map(t => ({
          Asset: t.name, Category: t.category, "Purchase Date": t.purchaseDate || "",
          Cost: t.purchaseRate || 0, Status: t.status, Location: t.site, "Assigned To": t.assignedTo,
        })), "fixed_assets"),
    },
    {
      title: "Cash & Bank Ledger",
      description: "All payment transactions",
      icon: Wallet,
      records: buildCashBankEntries({ payments, expenses, incomes, vendorPayments, loanRepayments }).length,
      onExport: () => {
        const rows = buildCashBankEntries({
          payments,
          expenses,
          incomes,
          vendorPayments,
          loanRepayments,
        });
        downloadCSV(
          rows.map((r) => ({
            Date: r.date,
            Description: r.description,
            Account: r.account,
            Debit: r.debit,
            Credit: r.credit,
            Type: r.type,
            Reference: r.reference,
          })),
          "cash_bank_ledger",
        );
      },
    },
  ];

  const salesDocCount = invoices.length + saleBills.length;
  const hasAuditData =
    salesDocCount > 0 ||
    vendorBills.length > 0 ||
    expenses.length > 0 ||
    payments.length > 0 ||
    inventoryItems.length > 0 ||
    tools.length > 0;

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Audit", to: "/audit" },
          { label: "Reports" },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "CSV reports", value: reports.length },
              { label: "Sales register rows", value: salesDocCount },
              { label: "Purchase bills", value: vendorBills.length },
              { label: "Payment rows", value: payments.length },
            ]}
          />
        }
      />

      {!hasAuditData ? (
        <ListEmptyState
          icon={Database}
          title="No audit data yet"
          description="Add invoices, expenses, vendor bills, or payments to generate CSV reports."
        />
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(report => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <report.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{report.title}</CardTitle>
                  <CardDescription className="text-xs">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {report.records !== null ? (
                  <Badge variant="outline" className="text-xs">{report.records} records</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Summary</Badge>
                )}
                <Button size="sm" variant="outline" onClick={report.onExport} className="gap-1">
                  <Download className="w-3 h-3" />
                  CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}
    </PageShell>
  );
};

export default AuditReports;

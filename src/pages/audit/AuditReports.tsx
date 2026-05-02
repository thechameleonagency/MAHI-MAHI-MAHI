import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, TrendingUp, Package, Scale, BookOpen, Wallet, HardDrive, IndianRupee, FileSpreadsheet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AuditReports = () => {
  const { invoices, saleBills, expenses, incomes, vendorBills, inventoryItems, tools, payments } = useAppData();

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
          "Amount Received": inv.amountReceived, Status: inv.status,
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
        const allInv = [...invoices, ...saleBills];
        const revenue = allInv.reduce((s, i) => s + i.total, 0);
        const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
        downloadCSV([
          { "Line Item": "Total Revenue", Amount: revenue },
          { "Line Item": "Total Expenses", Amount: totalExp },
          { "Line Item": "Net Profit", Amount: revenue - totalExp },
        ], "profit_loss");
      },
    },
    {
      title: "Debtors Report",
      description: "Outstanding receivables from customers",
      icon: Scale,
      records: [...invoices, ...saleBills].filter(i => i.status !== "paid").length,
      onExport: () => downloadCSV(
        [...invoices, ...saleBills].filter(i => i.status !== "paid").map(inv => ({
          Customer: inv.customerName, "Invoice #": inv.invoiceNumber,
          Total: inv.total, Received: inv.amountReceived, Outstanding: inv.total - inv.amountReceived,
          "Due Date": inv.dueDate || "", Status: inv.status,
        })), "debtors_report"),
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
        const allInv = [...invoices, ...saleBills];
        const outputGST = allInv.reduce((s, i) => s + (i.cgst || 0) + (i.sgst || 0) + (i.igst || 0), 0);
        const inputGST = vendorBills.reduce((s, b) => s + (b.gst || 0), 0);
        downloadCSV([
          { Item: "Output GST (CGST+SGST+IGST)", Amount: outputGST },
          { Item: "Input GST Credit", Amount: inputGST },
          { Item: "Net GST Payable", Amount: outputGST - inputGST },
        ], "gst_summary");
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
      records: payments.length,
      onExport: () => downloadCSV(
        payments.map(p => ({
          Date: p.date, Type: p.direction === "in" ? "Received" : "Paid", Amount: p.amount, Mode: p.paymentMode,
          Counterparty: p.counterpartyName || "",
          Project: p.projectName || "", Reference: p.reference || "",
        })), "cash_bank_ledger"),
    },
  ];

  const salesDocCount = invoices.length + saleBills.length;

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
    </PageShell>
  );
};

export default AuditReports;

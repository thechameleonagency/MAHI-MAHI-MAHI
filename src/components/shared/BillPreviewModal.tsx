import { useState } from "react";
import { Eye, Download, Edit, Upload, X, FileText, Calendar, IndianRupee, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { fileExceedsLimit, MAX_UPLOAD_BYTES } from "@/lib/fileLimits";

interface BillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface BillPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: {
    id: string;
    billNumber: string;
    billDate: string;
    dueDate?: string;
    vendorName?: string;
    customerName?: string;
    items: BillItem[];
    subtotal: number;
    gst: number;
    total: number;
    amountPaid: number;
    status: "pending" | "partial" | "paid" | "overpaid";
    projectName?: string;
    notes?: string;
    documentUrl?: string;
  };
  type: "purchase" | "sale" | "invoice";
  onEdit?: () => void;
  onUploadDocument?: (url: string) => void;
}

export function BillPreviewModal({
  open,
  onOpenChange,
  bill,
  type,
  onEdit,
  onUploadDocument,
}: BillPreviewModalProps) {
  const [isUploading, setIsUploading] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-primary/20 text-primary border-0">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-0">Partial</Badge>;
      default:
        return <Badge className="bg-orange-500/20 text-orange-400 border-0">Pending</Badge>;
    }
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.jpg,.jpeg,.png";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (fileExceedsLimit(file)) {
        toast({
          title: "File too large",
          description: `Keep uploads under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB in the prototype.`,
          variant: "destructive",
        });
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        setIsUploading(false);
        const dataUrl = reader.result as string;
        if (onUploadDocument) {
          onUploadDocument(dataUrl);
        }
        toast({ title: "Document Uploaded", description: `${file.name} has been attached to the bill.` });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const typeLabels = {
    purchase: "Purchase Bill",
    sale: "Sale Bill",
    invoice: "Invoice",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {typeLabels[type]} Preview
          </SheetTitle>
          <SheetDescription>
            {bill.billNumber} • {format(new Date(bill.billDate), "dd MMM yyyy")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase">Bill Number</p>
              <p className="font-semibold text-lg">{bill.billNumber}</p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-xs text-muted-foreground uppercase">Status</p>
              {getStatusBadge(bill.status)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">
                {type === "purchase" ? "Vendor" : "Customer"}
              </p>
              <p className="font-medium">{bill.vendorName || bill.customerName || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Project</p>
              <p className="font-medium">{bill.projectName || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Bill Date: {format(new Date(bill.billDate), "dd MMM yyyy")}</span>
            </div>
            {bill.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {format(new Date(bill.dueDate), "dd MMM yyyy")}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <p className="text-sm font-medium mb-3">Items</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{bill.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST {bill.subtotal > 0 ? `(${((bill.gst / bill.subtotal) * 100).toFixed(0)}%)` : ""}</span>
                <span>₹{bill.gst.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>₹{bill.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-primary">
                <span>Amount Paid</span>
                <span>₹{bill.amountPaid.toLocaleString()}</span>
              </div>
              {bill.total - bill.amountPaid > 0 && (
                <div className="flex justify-between text-sm text-orange-500 font-medium">
                  <span>Balance Due</span>
                  <span>₹{(bill.total - bill.amountPaid).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {bill.notes}
              </p>
            </div>
          )}

          {/* Document */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Bill Document</p>
            {bill.documentUrl ? (
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Bill Document.pdf</p>
                  <p className="text-xs text-muted-foreground">Uploaded</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No document attached</p>
                <Button variant="outline" size="sm" onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload Document"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter>
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Bill
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </AppSheetContent>
    </Sheet>
  );
}

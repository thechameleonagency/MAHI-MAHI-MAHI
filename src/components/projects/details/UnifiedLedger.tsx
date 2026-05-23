import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, ArrowRight, ShieldAlert } from "lucide-react";
import type { Project } from "@/types/project";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface UnifiedLedgerProps {
  project: Project;
  onOpenClientInvoice: () => void;
  onOpenB2BInvoice: () => void;
  onOpenExpense: () => void;
}

export function UnifiedLedger({ project, onOpenClientInvoice, onOpenB2BInvoice, onOpenExpense }: UnifiedLedgerProps) {
  
  // Axiom Checkers
  const isMSSBillingClient = project.vendorshipOwner === "MSS";
  const isPartnerBillingClient = project.vendorshipOwner === "PARTNER" || project.vendorshipOwner === "THIRD_PARTY";
  const isB2BReceivable = isPartnerBillingClient && project.dealOrigin === "PARTNER";
  const isVendorshipOnly = project.dealOrigin === "VENDORSHIP_ONLY";

  return (
    <div className="space-y-6">
      
      {isVendorshipOnly && (
        <Alert className="bg-slate-50 border-slate-200">
          <ShieldAlert className="h-5 w-5 text-slate-600" />
          <AlertTitle>Vendorship Only Billing</AlertTitle>
          <AlertDescription>
            MSS does not invoice the end client for execution. We only invoice the counterparty for using our Vendorship Code.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CLIENT INVOICING CARD */}
        <Card className={`border-2 ${isMSSBillingClient ? "border-blue-200 bg-blue-50/10" : "opacity-60 grayscale"}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Client Invoicing
              </span>
              {isMSSBillingClient ? (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Active</Badge>
              ) : (
                <Badge variant="outline">Locked</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isMSSBillingClient 
                ? "MSS holds the Vendorship code. We bill the end customer directly."
                : "Counterparty holds the Vendorship code. They bill the customer. MSS client invoicing is locked."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isMSSBillingClient ? (
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <span className="text-sm font-medium">Billed to Client</span>
                    <span className="font-bold">₹ {project.amountInvoiced?.toLocaleString() || 0}</span>
                 </div>
                 <Button onClick={onOpenClientInvoice} className="w-full bg-blue-600 hover:bg-blue-700">
                   Generate Client Invoice
                 </Button>
               </div>
            ) : (
              <div className="text-center p-4 border rounded-lg bg-slate-50 text-sm text-muted-foreground">
                Invoicing disabled based on Vendorship Golden Rule.
              </div>
            )}
          </CardContent>
        </Card>

        {/* B2B SETTLEMENT CARD */}
        <Card className="border-2 border-purple-200 bg-purple-50/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-purple-600" />
                B2B Settlements
              </span>
            </CardTitle>
            <CardDescription>
              Partner payouts, INC Giver receivables, or Subcontractor expenses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {isB2BReceivable ? (
               <div className="space-y-4">
                 <Alert className="bg-purple-100/50 border-purple-200">
                    <AlertDescription className="text-purple-800 text-sm">
                      Because Partner owns the code, MSS must generate a B2B invoice to the Partner for our Backend Rate.
                    </AlertDescription>
                 </Alert>
                 <Button onClick={onOpenB2BInvoice} variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                    Generate B2B Receivable
                 </Button>
               </div>
             ) : (
               <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <span className="text-sm font-medium">Recorded Expenses / Payouts</span>
                    <span className="font-bold">₹ {project.totalCost?.toLocaleString() || 0}</span>
                 </div>
                 <Button onClick={onOpenExpense} variant="outline" className="w-full">
                    Record Expense or Payout
                 </Button>
               </div>
             )}
          </CardContent>
        </Card>
      </div>
      
      {/* Transaction History Table would go here in full implementation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ledger History</CardTitle>
          <CardDescription>All invoices and expenses recorded against this deal structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
            No transactions recorded yet. Auto-drafts will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

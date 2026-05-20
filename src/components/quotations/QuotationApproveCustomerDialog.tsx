import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { QuotationApprovalCustomerPreview } from "@/lib/quotationApproveCustomer";
import { formatCustomerIdDisplay } from "@/lib/idFactory";

function PreviewRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

export function QuotationApproveCustomerDialog({
  open,
  onOpenChange,
  quotationNumber,
  preview,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationNumber: string;
  preview: QuotationApprovalCustomerPreview;
  onConfirm: () => void;
}) {
  const isCreate = preview.mode === "create";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Approve {quotationNumber}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              {isCreate ? (
                <p>
                  Approving will <strong className="text-foreground">create customer {preview.customerId}</strong>{" "}
                  (<span className="text-foreground">{preview.displayName}</span>) from the quotation client details
                  below. Review before confirming.
                </p>
              ) : (
                <p>
                  Approving will link this quotation to existing customer{" "}
                  <strong className="text-foreground">{preview.customerId}</strong> (
                  <span className="text-foreground">{preview.displayName}</span>
                  ).
                  {preview.enrichments.length > 0
                    ? ` Missing fields will be backfilled: ${preview.enrichments.join(", ")}.`
                    : " Customer record already has the billing fields from this quotation."}
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <dl className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <PreviewRow label="Customer ref." value={formatCustomerIdDisplay(preview.customerId)} />
          <PreviewRow label="Name" value={preview.displayName} />
          <PreviewRow label="Phone" value={preview.phone} />
          <PreviewRow label="Email" value={preview.email} />
          <PreviewRow label="Address" value={preview.address} />
          <PreviewRow label="Type" value={preview.type} />
          {preview.gstin ? <PreviewRow label="GSTIN" value={preview.gstin} /> : null}
          {preview.pan ? <PreviewRow label="PAN" value={preview.pan} /> : null}
          {preview.paymentTerms ? <PreviewRow label="Payment terms" value={preview.paymentTerms} /> : null}
        </dl>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Approve quotation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { cn } from "@/lib/utils";
import type { InvoiceSubmitPreview } from "@/lib/invoicePaymentStatus";

const toneStyles = {
  neutral: "border-border bg-muted/40 text-foreground",
  success: "border-primary/30 bg-primary/10 text-primary",
  warning: "border-warning/40 bg-warning/10 text-warning",
} as const;

export function InvoiceSubmitPreviewBanner({ preview }: { preview: InvoiceSubmitPreview }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        toneStyles[preview.tone],
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold leading-snug">{preview.title}</p>
      <p className="mt-1 text-xs opacity-90">{preview.description}</p>
    </div>
  );
}

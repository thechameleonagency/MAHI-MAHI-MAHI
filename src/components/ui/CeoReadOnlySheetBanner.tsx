import { Alert, AlertDescription } from "@/components/ui/alert";
import { CEO_OPERATIONAL_READ_ONLY_HINT } from "@/lib/ceoOperationalReadOnly";
import { useCeoOperationalReadOnly } from "@/hooks/useCeoOperationalReadOnly";
import { cn } from "@/lib/utils";

export function CeoReadOnlySheetBanner({ className }: { className?: string }) {
  const readOnly = useCeoOperationalReadOnly();
  if (!readOnly) return null;
  return (
    <Alert className={cn("border-muted-foreground/25 bg-muted/40", className)}>
      <AlertDescription className="text-sm">{CEO_OPERATIONAL_READ_ONLY_HINT}</AlertDescription>
    </Alert>
  );
}

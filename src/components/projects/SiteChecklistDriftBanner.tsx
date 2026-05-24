import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Props = {
  className?: string;
};

/** FC9 — warn when project BOQ and site execution checklist are out of sync. */
export function SiteChecklistDriftBanner({ className }: Props) {
  return (
    <Alert className={className ?? "border-warning/40 bg-warning/5"}>
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-sm">Site checklist drift detected</AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground">
        Project BOQ sent quantities and the active site execution checklist disagree. Need-to-Get and
        Materials tab may show different numbers until quantities are reconciled. Dispatch or issue
        materials again from the Materials tab, or refresh after the next app load to auto-repair
        legacy snapshots.
      </AlertDescription>
    </Alert>
  );
}

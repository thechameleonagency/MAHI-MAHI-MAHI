import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

/** Shown on finance surfaces: many writes use context setState, not the command bus / full audit trail. */
export function PrototypeFinanceNotice() {
  return (
    <Alert className="border-amber-500/40 bg-amber-500/5">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle>Illustrative prototype</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        Most finance and audit screens update <code className="rounded bg-muted px-1">AppData</code> directly rather than through
        domain commands. Profit &amp; loss, GST, and ledger views are useful for UX review; do not treat amounts or tax lines as
        production truth until a backend and command migration exist.
      </AlertDescription>
    </Alert>
  );
}

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

type EnquiryListFilterHintProps = {
  hiddenCount: number;
  onShowAll: () => void;
};

/** Shown when the enquiries list uses the default Open pipeline status filter. */
export function EnquiryListFilterHint({ hiddenCount, onShowAll }: EnquiryListFilterHintProps) {
  return (
    <div
      className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <Filter className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-xs text-foreground">
        <span className="font-medium">Filtered: Open</span>
        <span className="text-muted-foreground">
          {" "}
          · converted and lost leads are hidden
          {hiddenCount > 0 ? ` (${hiddenCount} not shown)` : ""}
        </span>
      </p>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto shrink-0 px-0 text-xs font-medium"
        onClick={onShowAll}
      >
        Show all
      </Button>
    </div>
  );
}

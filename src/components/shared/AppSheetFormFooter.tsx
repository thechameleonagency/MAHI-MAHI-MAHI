import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SheetFooter } from "@/components/ui/sheet";
import { FORM_SHEET_CANCEL_LABEL } from "@/lib/formActionLabels";
import { cn } from "@/lib/utils";

type AppSheetFormFooterProps = {
  onCancel: () => void;
  children?: ReactNode;
  className?: string;
  cancelLabel?: string;
};

/** DS8 — Cancel (left) + primary actions (right) for form sheets with unsaved input. */
export function AppSheetFormFooter({
  onCancel,
  children,
  className,
  cancelLabel = FORM_SHEET_CANCEL_LABEL,
}: AppSheetFormFooterProps) {
  return (
    <SheetFooter
      className={cn(
        "sticky bottom-0 z-10 flex-row items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:justify-between sm:space-x-0",
        className,
      )}
    >
      <Button type="button" variant="outline" className="shrink-0" onClick={onCancel}>
        {cancelLabel}
      </Button>
      {children != null ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      ) : (
        <span className="sr-only">Dismiss</span>
      )}
    </SheetFooter>
  );
}

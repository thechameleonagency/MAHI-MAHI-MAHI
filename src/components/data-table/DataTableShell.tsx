import { type ReactNode, useEffect, useRef } from "react";
import { dataTableClasses } from "@/lib/tableConstants";
import { cn } from "@/lib/utils";

type DataTableShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  /** Entire shell max height — include pagination in layout (sticky header/tfoot scroll in the middle region). */
  maxHeight?: string;
  /** When changed, vertical scroll resets to top of the data area (after page/size change). */
  scrollResetKey?: string | number;
  /**
   * - **default**: provides rounded corners, border, and background (a standalone card).
   * - **inline**: removes outer borders and shadow; used when nesting inside a `<Card>` or `<Sheet>`.
   */
  variant?: "default" | "inline";
  className?: string;
};

/**
 * Scroll viewport: horizontal overflow wraps a vertical scroller (`overscroll-y: auto` for natural chaining).
 * Pagination sits below the scroll pane (pinned to shell bottom — always reachable).
 */
export function DataTableShell({
  children,
  footer,
  maxHeight,
  scrollResetKey,
  variant = "default",
  className,
}: DataTableShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollResetKey === undefined) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [scrollResetKey]);

  const isInline = variant === "inline";

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col overflow-hidden",
        !isInline && "rounded-lg border border-border bg-white shadow-sm dark:bg-card dark:border-border",
        className,
      )}
      style={maxHeight ? { maxHeight } : { maxHeight: "min(85vh, min(920px, 100%))" }}
    >
      <div ref={scrollRef} className="min-h-0 flex-1 shrink overflow-auto w-full">
        <table className={dataTableClasses.table}>{children}</table>
      </div>
      {footer != null && footer !== false && (
        <div
          className={cn(
            "shrink-0 border-t border-border px-1 py-1.5 shadow-[0_-1px_0_0_rgb(0_0_0/0.04)]",
            !isInline ? "bg-white dark:bg-card" : "bg-muted/30",
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

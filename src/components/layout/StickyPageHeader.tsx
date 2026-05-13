import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePageHeaderSticky } from "@/contexts/PageHeaderStickyContext";
import { useEffect } from "react";

export type BreadcrumbItem = { label: string; to?: string };

type StickyPageHeaderProps = {
  breadcrumbs: BreadcrumbItem[];
  children?: ReactNode;
  /** Second row: typically filters left + compact KPI strip right */
  subRow?: ReactNode;
  className?: string;
};

/**
 * Optional secondary header below the main app bar: breadcrumb trail + action slot.
 * Place as the first child inside the scrollable `main` region so `sticky top-0` pins under the app shell.
 */
export function StickyPageHeader({ breadcrumbs, children, subRow, className }: StickyPageHeaderProps) {
  const { stickyPageHeader: pinned, setBreadcrumbs } = usePageHeaderSticky();

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
    return () => setBreadcrumbs([]);
  }, [breadcrumbs, setBreadcrumbs]);

  if (!children && !subRow) return null;

  return (
    <div
      className={cn(
        pinned ? "sticky top-0 z-10" : "relative z-0",
        "mb-4 rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4",
        className
      )}
    >
      <div className="flex w-full min-h-10 flex-wrap items-center justify-between gap-4">
        {/* Left/Middle filters/subRow elements */}
        {subRow && (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            {subRow}
          </div>
        )}
        
        {/* Right actions */}
        {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 ml-auto">{children}</div>}
      </div>
    </div>
  );
}

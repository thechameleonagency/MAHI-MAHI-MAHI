import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useStickyPageHeaderActive } from "@/contexts/PageHeaderStickyContext";

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
  const pinned = useStickyPageHeaderActive();

  if (breadcrumbs.length === 0 && !children && !subRow) return null;

  return (
    <div
      className={cn(
        pinned ? "sticky top-0 z-10" : "relative z-0",
        "mb-4 rounded-xl border border-border/60 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-4",
        className
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
        {breadcrumbs.length > 0 && (
          <nav
            className="text-sm text-muted-foreground flex min-w-0 flex-1 flex-wrap items-center gap-1"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                {b.to ? (
                  <Link to={b.to} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {children && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{children}</div>}
      </div>
      {subRow && (
        <div className="mt-2.5 flex w-full min-w-0 flex-col gap-2 border-t border-border/50 pt-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          {subRow}
        </div>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

export type InlineKpiItem = {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
};

/**
 * Compact status metrics (label above, value below) for use beside filters in StickyPageHeader.
 *
 * `singleRow` keeps all items on one horizontal line (with horizontal-scroll fallback on
 * narrow viewports). Use for audit / books / analytics headers where the user wants all
 * KPI items visible at-a-glance without wrap.
 */
export function InlineKpiStrip({ items, className, singleRow }: { items: InlineKpiItem[]; className?: string; singleRow?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-end gap-x-4 gap-y-1.5 rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5 sm:gap-x-6 sm:px-3",
        singleRow ? "flex-nowrap overflow-x-auto justify-start pb-0.5" : "flex-wrap justify-end",
        className,
      )}
      role="list"
    >
      {items.map((item) => {
        const inner = (
          <>
            <span className="block text-2xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
              {item.label}
            </span>
            <span className="block text-sm font-bold tabular-nums leading-tight text-foreground">
              {item.value}
            </span>
          </>
        );
        if (item.onClick) {
          return (
            <button
              key={item.label}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                item.onClick?.();
              }}
              className="relative min-w-0 shrink-0 pb-1 text-left transition-colors hover:opacity-80"
              role="listitem"
              aria-pressed={item.active}
            >
              {inner}
              {item.active ? (
                <span
                  className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-7 max-w-[28px] rounded-full bg-foreground"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        }
        return (
          <div key={item.label} className="min-w-0" role="listitem">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

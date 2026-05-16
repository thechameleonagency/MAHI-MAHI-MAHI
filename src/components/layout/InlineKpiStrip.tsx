import { cn } from "@/lib/utils";

export type InlineKpiItem = {
  label: string;
  value: string | number;
  active?: boolean;
  onClick?: () => void;
};

/**
 * Compact status metrics (label above, value below) for use beside filters in StickyPageHeader.
 */
export function InlineKpiStrip({ items, className }: { items: InlineKpiItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-end gap-x-4 gap-y-1.5 rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5 sm:gap-x-6 sm:px-3",
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
            <span
              className={cn(
                "block text-sm font-bold tabular-nums leading-tight text-foreground",
                item.active && "underline decoration-foreground underline-offset-4",
              )}
            >
              {item.value}
            </span>
          </>
        );
        if (item.onClick) {
          return (
            <button
              key={item.label + String(item.value)}
              type="button"
              onClick={item.onClick}
              className="min-w-0 text-left transition-opacity hover:opacity-80"
              role="listitem"
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={item.label + String(item.value)} className="min-w-0" role="listitem">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

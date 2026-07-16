/**
 * Shared building blocks for the Business Analytics page: chart card wrapper,
 * KPI tiles, and trend badges. Charts use recharts directly with theme colors,
 * matching the pattern in Finance.tsx.
 */
import type { ReactNode } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--chart-info))",
  "hsl(var(--destructive))",
  "hsl(var(--chart-cost))",
];

export const COLOR_REVENUE = "hsl(var(--chart-revenue))";
export const COLOR_COST = "hsl(var(--chart-cost))";
export const COLOR_PRIMARY = "hsl(var(--primary))";
export const COLOR_SUCCESS = "hsl(var(--success))";
export const COLOR_WARNING = "hsl(var(--warning))";
export const COLOR_DESTRUCTIVE = "hsl(var(--destructive))";
export const COLOR_INFO = "hsl(var(--chart-info))";

export function ChartCard({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export interface MetricTile {
  label: string;
  value: string | number;
  sub?: string;
}

export function MetricTiles({ tiles, className }: { tiles: MetricTile[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{t.label}</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{t.value}</p>
          {t.sub && <p className="text-2xs text-muted-foreground">{t.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/** Up/down/flat badge for a % trend. `invert` marks increases as bad (e.g. debt). */
export function TrendBadge({
  pct,
  invert = false,
  suffix = "vs prev",
}: {
  pct: number | null;
  invert?: boolean;
  suffix?: string;
}) {
  if (pct === null) {
    return (
      <Badge variant="outline" className="gap-1 text-2xs text-muted-foreground">
        <Minus className="h-3 w-3" /> —
      </Badge>
    );
  }
  const up = pct > 0;
  const flat = pct === 0;
  const good = flat ? null : invert ? !up : up;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-2xs",
        flat
          ? "text-muted-foreground"
          : good
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      )}
    >
      {flat ? <Minus className="h-3 w-3" /> : up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {pct}% {suffix}
    </Badge>
  );
}

import { Badge } from "@/components/ui/badge";
import type { AgingSignal, AgingTone } from "@/lib/agingHelpers";
import { cn } from "@/lib/utils";

const toneClass: Record<AgingTone, string> = {
  neutral: "border-border text-muted-foreground bg-muted/40",
  muted: "border-border/70 text-muted-foreground bg-muted/30",
  warning: "border-warning/40 text-warning bg-warning/10",
  danger: "border-destructive/40 text-destructive bg-destructive/10",
};

export function AgingChip({
  signal,
  className,
}: {
  signal: AgingSignal | null | undefined;
  className?: string;
}) {
  if (!signal) return null;
  return (
    <Badge
      variant="outline"
      className={cn("text-2xs font-normal shrink-0", toneClass[signal.tone], className)}
    >
      {signal.label}
    </Badge>
  );
}

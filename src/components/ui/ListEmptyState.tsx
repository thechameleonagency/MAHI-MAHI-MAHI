import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `compact` for sheets and table shells; `default` for full-page list areas. */
  density?: "default" | "compact";
  className?: string;
};

export function ListEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  density = "default",
  className,
}: ListEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-muted-foreground",
        density === "compact" ? "py-8" : "py-16",
        className,
      )}
    >
      <Icon className={cn("opacity-30", density === "compact" ? "h-8 w-8" : "h-10 w-10")} aria-hidden />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-center text-xs">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ListEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function ListEmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: ListEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground", className)}>
      <Icon className="h-10 w-10 opacity-30" aria-hidden />
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

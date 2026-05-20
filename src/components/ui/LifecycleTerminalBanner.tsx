import type { ReactNode } from "react";
import { Archive, Ban, Undo2, CheckCircle2, XCircle, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TerminalVariant = "archived" | "voided" | "withdrawn" | "completed" | "terminated" | "rejected";

interface LifecycleTerminalBannerProps {
  variant: TerminalVariant;
  title: string;
  description: ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

const variantStyles: Record<TerminalVariant, { tone: string; icon: typeof Archive }> = {
  archived:   { tone: "border-l-muted-foreground bg-muted/30",     icon: Archive },
  voided:     { tone: "border-l-warning bg-warning/10",            icon: Ban },
  withdrawn:  { tone: "border-l-warning bg-warning/10",            icon: Undo2 },
  rejected:   { tone: "border-l-warning bg-warning/10",            icon: XCircle },
  completed:  { tone: "border-l-success bg-success/10",            icon: CheckCircle2 },
  terminated: { tone: "border-l-destructive bg-destructive/10",    icon: UserMinus },
};

/**
 * Banner shown at the top of a detail page when the entity is in a terminal state.
 *
 * Explains why the lifecycle has ended AND offers a "next action" CTA so the page is
 * never a dead-end (per skill `lifecycle-dead-end-audit` + plan section 5.6).
 */
export function LifecycleTerminalBanner({
  variant,
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: LifecycleTerminalBannerProps) {
  const { tone, icon: Icon } = variantStyles[variant];
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-l-4 rounded-lg px-4 py-3",
        tone,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          <div className="text-xs text-muted-foreground mt-1">{description}</div>
        </div>
      </div>
      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex gap-2 shrink-0">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="ghost" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          {primaryActionLabel && onPrimaryAction && (
            <Button variant="outline" size="sm" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

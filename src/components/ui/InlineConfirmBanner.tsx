import { useEffect, useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BannerVariant = "success" | "warning" | "error";

interface InlineConfirmBannerProps {
  /** Banner variant controls icon + colour scheme. */
  variant?: BannerVariant;
  /** Primary message (e.g. "Saved at 14:32"). */
  title: string;
  /** Optional secondary line. */
  description?: string;
  /** Optional CTA label, e.g. "View details" or "Undo". */
  actionLabel?: string;
  /** Fired when the user clicks the CTA button. */
  onAction?: () => void;
  /** Auto-dismiss after N ms. Set 0 to disable. Default 5000. */
  autoDismissMs?: number;
  /** Called when the banner is dismissed (auto or manual). */
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<BannerVariant, { bg: string; border: string; text: string; icon: typeof CheckCircle }> = {
  success: { bg: "bg-success/10", border: "border-success/30", text: "text-success", icon: CheckCircle },
  warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", icon: AlertTriangle },
  error:   { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", icon: XCircle },
};

/**
 * In-app inline confirmation banner.
 *
 * Replaces toast() for user-triggered action confirmations (save, submit, status change).
 * Auto-dismisses after `autoDismissMs` (default 5 s). Supports optional CTA.
 */
export function InlineConfirmBanner({
  variant = "success",
  title,
  description,
  actionLabel,
  onAction,
  autoDismissMs = 5000,
  onDismiss,
  className,
}: InlineConfirmBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  if (!visible) return null;

  const { bg, border, text, icon: Icon } = variantStyles[variant];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 animate-in fade-in-0 slide-in-from-top-2 duration-300",
        bg,
        border,
        text,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-4 w-4 shrink-0 text-current" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="ghost" className="shrink-0 h-7 text-xs" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

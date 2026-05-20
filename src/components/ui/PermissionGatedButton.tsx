import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PermissionGatedButtonProps = ComponentProps<typeof Button> & {
  /** When false, the button is disabled and shows `deniedHint` on hover. */
  allowed: boolean;
  deniedHint: string;
  /** If true, render nothing when `allowed` is false (default: show disabled + tooltip). */
  hideWhenDenied?: boolean;
};

/**
 * Action button that reflects role permissions before the user clicks.
 * Disabled state uses a tooltip so users know why (M5 — trust / discoverability).
 */
export function PermissionGatedButton({
  allowed,
  deniedHint,
  hideWhenDenied = false,
  disabled,
  onClick,
  className,
  children,
  ...rest
}: PermissionGatedButtonProps) {
  if (!allowed && hideWhenDenied) {
    return null;
  }

  const isDisabled = Boolean(disabled) || !allowed;
  const button = (
    <Button
      {...rest}
      className={cn(!allowed && "pointer-events-auto", className)}
      disabled={isDisabled}
      onClick={allowed ? onClick : undefined}
      aria-disabled={isDisabled}
    >
      {children}
    </Button>
  );

  if (allowed) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        {deniedHint}
      </TooltipContent>
    </Tooltip>
  );
}

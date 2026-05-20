import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationBellLinkProps = {
  count: number;
  className?: string;
};

/**
 * Notifications entry with a count bubble anchored to the icon button corner (Mn6).
 * Wrapper is `relative` so the badge does not rely on absolute positioning inside the link.
 */
export function NotificationBellLink({ count, className }: NotificationBellLinkProps) {
  const display = count > 99 ? "99+" : count;
  const ariaLabel =
    count > 0
      ? `Notifications, ${display} alert${count === 1 ? "" : "s"}`
      : "Notifications";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 sm:h-9 sm:w-9"
        asChild
      >
        <Link
          to="/notifications"
          aria-label={ariaLabel}
          className="inline-flex size-full items-center justify-center"
        >
          <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </Link>
      </Button>
      {count > 0 && (
        <span
          className="pointer-events-none absolute end-0 top-0 z-10 box-border flex h-4 min-w-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground sm:h-[18px] sm:min-w-[18px] sm:text-2xs"
          aria-hidden
        >
          {display}
        </span>
      )}
    </span>
  );
}

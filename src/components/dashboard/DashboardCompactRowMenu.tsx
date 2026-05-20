import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** DS6 — ⋮ menu trigger + panel for compact dashboard drill-down rows. */
export function DashboardCompactRowMenu({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn("shrink-0 h-8 w-8 p-0", className)}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardCompactRowMenuLink({
  to,
  state,
  icon: Icon,
  children,
}: {
  to: LinkProps["to"];
  state?: LinkProps["state"];
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link to={to} state={state} className="flex cursor-pointer items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
        <span>{children}</span>
      </Link>
    </DropdownMenuItem>
  );
}

export function DashboardCompactRowMenuAction({
  icon: Icon,
  onClick,
  children,
  className,
}: {
  icon?: LucideIcon;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className={cn("gap-2", className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      {children}
    </DropdownMenuItem>
  );
}

type PermissionGatedMenuItemProps = {
  allowed: boolean;
  deniedHint: string;
  hideWhenDenied?: boolean;
  icon?: LucideIcon;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

/** Menu item that reflects role permissions (pairs with enquiry workflow actions). */
export function PermissionGatedMenuItem({
  allowed,
  deniedHint,
  hideWhenDenied = false,
  icon: Icon,
  onClick,
  children,
  className,
}: PermissionGatedMenuItemProps) {
  if (!allowed && hideWhenDenied) {
    return null;
  }

  const item = (
    <DropdownMenuItem
      disabled={!allowed}
      onClick={allowed ? onClick : undefined}
      className={cn("gap-2", !allowed && "pointer-events-auto", className)}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      {children}
    </DropdownMenuItem>
  );

  if (allowed) {
    return item;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block w-full">{item}</span>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs text-center">
        {deniedHint}
      </TooltipContent>
    </Tooltip>
  );
}

export { DropdownMenuSeparator };

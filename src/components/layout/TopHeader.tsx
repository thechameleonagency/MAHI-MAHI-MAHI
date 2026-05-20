import { Menu, Bell, Settings, Sparkles, Pin, PinOff, Search } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/domain/entities/identity";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { toast } from "@/hooks/use-toast";
import { prunePinnedPathsForRole } from "@/lib/navPins";
import { routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";
import { quickCreatePath } from "@/lib/createFromContext";
import GlobalSearch from "./GlobalSearch";
import { usePageHeaderSticky } from "@/contexts/PageHeaderStickyContext";
import { useDerivedAlertCount } from "@/hooks/useDerivedAlertCount";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";

type TopHeaderProps = {
  onOpenSidebar: () => void;
};

const TopHeader = ({ onOpenSidebar }: TopHeaderProps) => {
  const { currentRole, setCurrentRole } = useAppSession();
  const { permissionService } = useFoundation();
  const navigate = useNavigate();
  const location = useLocation();
  const roleMatrixOverride = useRoleMatrixOverride();
  const notificationCount = useDerivedAlertCount();

  const can = (a: Parameters<typeof permissionService.canPerformAction>[1]) =>
    permissionService.canPerformAction(currentRole, a, roleMatrixOverride);

  const { stickyPageHeader, setStickyPageHeader, breadcrumbs } = usePageHeaderSticky();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-stretch justify-between border-b border-border/80 bg-card/90 shadow-sm supports-[backdrop-filter]:backdrop-blur-md w-full">
      
      {/* Left side: Breadcrumb zone matching page background */}
      <div className="flex min-w-0 items-center gap-2 bg-canvas px-3 md:px-5 border-r border-border/50 shadow-[2px_0_4px_rgb(0_0_0/0.02)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden -ml-2"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {breadcrumbs && breadcrumbs.filter((b) => b.label?.trim()).length > 0 && (
          <nav
            className="text-sm text-muted-foreground flex min-w-0 flex-1 flex-wrap items-center gap-1 mr-4"
            aria-label="Breadcrumb"
          >
            {breadcrumbs.filter((b) => b.label?.trim()).map((b, i) => (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                {b.to ? (
                  <Link to={b.to} className="hover:text-foreground transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* Right side: Search and actions */}
      <div className="flex shrink-0 flex-1 items-center justify-end gap-2 px-3 md:gap-4 md:px-5">
        <div className="hidden min-w-0 w-full max-w-[280px] md:block">
          <GlobalSearch />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 md:hidden"
          aria-label="Search"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="inline-flex h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              aria-pressed={stickyPageHeader}
              aria-label={
                stickyPageHeader ? "Page header pinned to top; click to scroll with page" : "Page header scrolls; click to pin"
              }
              onClick={() => setStickyPageHeader(!stickyPageHeader)}
            >
              {stickyPageHeader ? <Pin className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /> : <PinOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[240px]">
            {stickyPageHeader
              ? "Page header pinned (sticky). Click to scroll with the page."
              : "Page header scrolls with content. Click to pin under the bar."}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-border/50 md:block" aria-hidden />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 pr-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 gap-1 px-2.5 text-xs font-medium shadow-sm sm:px-3"
              aria-label="Create or add"
            >
              <Sparkles className="h-3.5 w-3.5 opacity-90" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Create</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {can("enquiry:create") && (
              <DropdownMenuItem onSelect={() => navigate(quickCreatePath("/enquiries"))}>
                New enquiry
              </DropdownMenuItem>
            )}
            {can("quotation:create") && (
              <DropdownMenuItem onSelect={() => navigate(quickCreatePath("/quotations"))}>
                New quotation
              </DropdownMenuItem>
            )}
            {can("project:create_from_quote") && (
              <DropdownMenuItem onSelect={() => navigate(quickCreatePath("/projects"))}>
                New project
              </DropdownMenuItem>
            )}
            {can("finance:create_invoice") && (
              <DropdownMenuItem onSelect={() => navigate(quickCreatePath("/invoices"))}>
                New invoice
              </DropdownMenuItem>
            )}
            {can("inventory:material_movement") && (
              <DropdownMenuItem onSelect={() => navigate(quickCreatePath("/inventory/materials"))}>
                Materials &amp; issue
              </DropdownMenuItem>
            )}
            {!can("enquiry:create") &&
              !can("quotation:create") &&
              !can("project:create_from_quote") &&
              !can("finance:create_invoice") &&
              !can("inventory:material_movement") && (
                <DropdownMenuItem disabled>No actions for this role</DropdownMenuItem>
              )}
          </DropdownMenuContent>
        </DropdownMenu>

        {permissionService.canAccessPath(currentRole, "/notifications", roleMatrixOverride) && (
          <Button type="button" variant="outline" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9" asChild>
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-0.5 text-2xs font-medium text-destructive-foreground">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          </Button>
        )}

        {permissionService.canAccessPath(currentRole, "/settings", roleMatrixOverride) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex sm:h-9 sm:w-9"
            asChild
          >
            <Link to="/settings" aria-label="Settings">
              <Settings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </Link>
          </Button>
        )}

        <Select
          value={currentRole}
          onValueChange={(role) => {
            const next = role as UserRole;
            const removedPins = prunePinnedPathsForRole((path) =>
              permissionService.canAccessPath(next, path, roleMatrixOverride),
            );
            setCurrentRole(next);
            const currentPageDenied = !permissionService.canAccessPath(
              next,
              location.pathname,
              roleMatrixOverride,
            );
            if (currentPageDenied) {
              navigate("/", {
                replace: true,
                state: { routeAccessDeniedPath: location.pathname },
              });
            }
            const deniedCopy = currentPageDenied
              ? routeAccessDeniedToastContent(location.pathname, next)
              : null;
            if (removedPins.length > 0) {
              toast({
                title: deniedCopy?.title ?? "Role updated",
                description: deniedCopy
                  ? deniedCopy.description
                  : `${removedPins.length} pinned link(s) removed for ${ROLE_LABELS[next]}. Navigation now follows ${ROLE_LABELS[next]} permissions.`,
                variant: deniedCopy ? "destructive" : undefined,
              });
            } else {
              toast({
                title: deniedCopy?.title ?? "Role updated",
                description:
                  deniedCopy?.description ??
                  `Navigation and actions now follow ${ROLE_LABELS[next]} permissions.`,
                variant: deniedCopy ? "destructive" : undefined,
              });
            }
          }}
        >
          <SelectTrigger className="h-8 w-[min(140px,30vw)] text-xs sm:h-9 sm:w-[min(160px,28vw)] sm:text-sm">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="pt-12">
          <SheetHeader>
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <GlobalSearch onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default TopHeader;

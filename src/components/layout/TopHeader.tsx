import { Menu, Settings, Plus, Pin, PinOff, Search, CircleHelp } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PAGE_HEADER_PIN_HELP,
  pageHeaderPinAriaLabel,
  pageHeaderPinTooltip,
} from "@/lib/pageHeaderPinCopy";
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
import { routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";
import { markRoleSwitchRouteDenied } from "@/lib/roleSwitchToast";
import { quickCreatePath } from "@/lib/createFromContext";
import GlobalSearch from "./GlobalSearch";
import { NotificationBellLink } from "./NotificationBellLink";
import { usePageHeaderSticky } from "@/contexts/PageHeaderStickyContext";
import { useDerivedAlertCount } from "@/hooks/useDerivedAlertCount";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";

type TopHeaderProps = {
  onOpenSidebar: () => void;
};

const TopHeader = ({ onOpenSidebar }: TopHeaderProps) => {
  const { currentRole, setCurrentRole, demoUserName, setDemoUserName } = useAppSession();
  const { permissionService } = useFoundation();
  const navigate = useNavigate();
  const location = useLocation();
  const roleMatrixOverride = useRoleMatrixOverride();
  const notificationCount = useDerivedAlertCount();

  const can = (a: Parameters<typeof permissionService.canPerformAction>[1]) =>
    permissionService.canPerformAction(currentRole, a, roleMatrixOverride);

  const { stickyPageHeader, setStickyPageHeader, breadcrumbs, hasPinnablePageHeader } =
    usePageHeaderSticky();
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
        {hasPinnablePageHeader && (
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="inline-flex h-8 w-8 shrink-0 sm:h-9 sm:w-9"
                  aria-pressed={stickyPageHeader}
                  aria-label={pageHeaderPinAriaLabel(stickyPageHeader)}
                  onClick={() => setStickyPageHeader(!stickyPageHeader)}
                >
                  {stickyPageHeader ? (
                    <Pin className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  ) : (
                    <PinOff className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{pageHeaderPinTooltip(stickyPageHeader)}</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="inline-flex h-7 w-7 shrink-0 text-muted-foreground sm:h-8 sm:w-8"
                  aria-label="About page header pin"
                >
                  <CircleHelp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="text-sm">
                <p className="font-medium text-foreground">Page header pin</p>
                <p className="mt-1 text-muted-foreground">{PAGE_HEADER_PIN_HELP}</p>
              </PopoverContent>
            </Popover>
          </div>
        )}
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
              <Plus className="h-3.5 w-3.5 opacity-90" />
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
          <NotificationBellLink count={notificationCount} />
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

        <Input
          className="h-8 w-[min(7.5rem,26vw)] text-xs sm:h-9 sm:w-[min(9rem,22vw)] sm:text-sm"
          placeholder="Demo user"
          value={demoUserName}
          onChange={(e) => setDemoUserName(e.target.value)}
          aria-label="Demo user name"
          title="Name shown in audit logs (persisted for this browser)"
        />

        <Select
          value={currentRole}
          onValueChange={(role) => {
            const next = role as UserRole;
            setCurrentRole(next);
            const currentPageDenied = !permissionService.canAccessPath(
              next,
              location.pathname,
              roleMatrixOverride,
            );
            if (currentPageDenied) {
              markRoleSwitchRouteDenied();
              navigate("/", {
                replace: true,
                state: { routeAccessDeniedPath: location.pathname },
              });
              const deniedCopy = routeAccessDeniedToastContent(location.pathname, next);
              toast({
                title: deniedCopy.title,
                description: deniedCopy.description,
                variant: "destructive",
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

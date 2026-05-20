import { Menu, Settings, Plus, Pin, PinOff, Search, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PAGE_HEADER_PIN_HELP, pageHeaderPinTooltip } from "@/lib/pageHeaderPinCopy";
import { PageHeaderPinControls } from "@/components/layout/PageHeaderPinControls";
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
import { showRouteAccessDeniedToast } from "@/lib/permissionFeedback";
import { markRoleSwitchRouteDenied } from "@/lib/roleSwitchToast";
import { quickCreatePath } from "@/lib/createFromContext";
import GlobalSearch from "./GlobalSearch";
import { NotificationBellLink } from "./NotificationBellLink";
import { usePageHeaderSticky } from "@/contexts/PageHeaderStickyContext";
import { useDerivedAlertCount } from "@/hooks/useDerivedAlertCount";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";
import { mobilePageTitleFromBreadcrumbs } from "@/lib/pageHeaderMobileTitle";
import { ICON_CLASS_NAV, ICON_CLASS_NAV_MENU } from "@/lib/iconSizes";

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

  const visibleBreadcrumbs = breadcrumbs.filter((b) => b.label?.trim());
  const mobilePageTitle = mobilePageTitleFromBreadcrumbs(breadcrumbs);
  const canAccessSettings = permissionService.canAccessPath(currentRole, "/settings", roleMatrixOverride);

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
          <Menu className={ICON_CLASS_NAV} />
        </Button>
        
        {mobilePageTitle && (
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium text-foreground sm:hidden"
            aria-current="page"
            title={mobilePageTitle}
          >
            {mobilePageTitle}
          </p>
        )}

        {visibleBreadcrumbs.length > 0 && (
          <nav
            className="mr-4 hidden min-w-0 flex-1 flex-wrap items-center gap-1 text-sm text-muted-foreground sm:flex"
            aria-label="Breadcrumb"
          >
            {visibleBreadcrumbs.map((b, i) => (
              <span key={`${b.label}-${i}`} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                {i > 0 && <span className="text-muted-foreground/40">/</span>}
                {b.to ? (
                  <Link to={b.to} className="transition-colors hover:text-foreground">
                    {b.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{b.label}</span>
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
          <Search className={ICON_CLASS_NAV} />
        </Button>
        {hasPinnablePageHeader && (
          <PageHeaderPinControls
            pinned={stickyPageHeader}
            onToggle={() => setStickyPageHeader(!stickyPageHeader)}
          />
        )}
      </div>

      <div className="hidden h-7 w-px shrink-0 bg-border/50 md:block" aria-hidden />

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 pr-1">
        {(hasPinnablePageHeader || canAccessSettings) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 md:hidden"
                aria-label="More header actions"
              >
                <MoreHorizontal className={ICON_CLASS_NAV} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Page</DropdownMenuLabel>
              {hasPinnablePageHeader && (
                <DropdownMenuItem onSelect={() => setStickyPageHeader(!stickyPageHeader)}>
                  {stickyPageHeader ? (
                    <>
                      <PinOff className={ICON_CLASS_NAV_MENU} />
                      {pageHeaderPinTooltip(true)}
                    </>
                  ) : (
                    <>
                      <Pin className={ICON_CLASS_NAV_MENU} />
                      {pageHeaderPinTooltip(false)}
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {hasPinnablePageHeader && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">{PAGE_HEADER_PIN_HELP}</p>
              )}
              {canAccessSettings && (
                <>
                  {hasPinnablePageHeader && <DropdownMenuSeparator />}
                  <DropdownMenuItem onSelect={() => navigate("/settings")}>
                    <Settings className={ICON_CLASS_NAV_MENU} />
                    Settings
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-8 gap-1 px-2.5 text-xs font-medium shadow-sm sm:px-3"
              aria-label="Create or add"
            >
              <Plus className={cn(ICON_CLASS_NAV, "opacity-90")} />
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

        {canAccessSettings && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 md:inline-flex md:h-9 md:w-9"
            asChild
          >
            <Link to="/settings" aria-label="Settings">
              <Settings className={ICON_CLASS_NAV} />
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
              showRouteAccessDeniedToast(location.pathname, next);
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
        <SheetContent side="top" className="flex max-h-[min(92dvh,100%)] flex-col overflow-hidden pt-12">
          <SheetHeader className="shrink-0">
            <SheetTitle>Search</SheetTitle>
          </SheetHeader>
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <GlobalSearch embedded onNavigate={() => setMobileSearchOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default TopHeader;

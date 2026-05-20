import { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Clock,
  Receipt,
  MapPin,
  Bell,
  Wrench,
  Handshake,
  Layers,
  CreditCard,
  ClipboardList,
  UserCheck,
  ShieldCheck,
  TrendingUp,
  BookOpen,
  Scale,
  FileSpreadsheet,
  Wallet,
  HardDrive,
  ScrollText,
  Download,
  LayoutTemplate,
  Pin,
  PinOff,
  FileStack,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_SIDEBAR_WIDTH_PX } from "@/lib/mobileSidebarSwipe";
import { Badge } from "@/components/ui/badge";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useDerivedAlertCount } from "@/hooks/useDerivedAlertCount";
import {
  readPinnedPaths,
  writePinnedPaths,
  togglePinnedPath,
  prunePinnedPathsForRole,
  NAV_PINS_STORAGE_KEY,
  NAV_PINS_CHANGED_EVENT,
} from "@/lib/navPins";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

/** Single scrollable list: section labels + items (no accordions). */
const navSections: NavSection[] = [
  {
    id: "overview",
    title: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
  },
  {
    id: "pipeline",
    title: "Pipeline",
    items: [
      { label: "Enquiries", icon: FileText, path: "/enquiries" },
      { label: "Quotations", icon: FileStack, path: "/quotations" },
      { label: "Projects", icon: Building2, path: "/projects" },
      { label: "Active sites", icon: MapPin, path: "/active-sites" },
      { label: "Timeline", icon: Clock, path: "/timeline" },
      { label: "Calendar", icon: Calendar, path: "/calendar" },
    ],
  },
  {
    id: "ops",
    title: "Warehouse & site",
    items: [
      { label: "Materials", icon: Package, path: "/inventory/materials" },
      { label: "Tools", icon: Wrench, path: "/inventory/tools" },
      { label: "Templates", icon: LayoutTemplate, path: "/templates" },
      { label: "Attendance", icon: Calendar, path: "/attendance" },
    ],
  },
  {
    id: "people",
    title: "People",
    items: [
      { label: "Employees", icon: Users, path: "/employees" },
      { label: "Teams", icon: Layers, path: "/teams" },
      { label: "Agents", icon: UserCheck, path: "/agents" },
    ],
  },
  {
    id: "money",
    title: "Finance",
    items: [
      { label: "Finance home", icon: BarChart3, path: "/finance" },
      { label: "Customers", icon: Users, path: "/customers" },
      { label: "Invoices & sale bills", icon: Receipt, path: "/invoices" },
      { label: "Vendors", icon: ClipboardList, path: "/vendors" },
      { label: "Loans", icon: CreditCard, path: "/loans" },
      { label: "Partners", icon: Handshake, path: "/partners" },
      { label: "Vendorship Code Companies", icon: ShieldCheck, path: "/vendorship-companies" },
      { label: "INC Work Sources", icon: HardHat, path: "/inc-work-sources" },
    ],
  },
  {
    id: "insights",
    title: "Insights",
    items: [{ label: "Analytics", icon: BarChart3, path: "/analytics" }],
  },
  {
    id: "audit",
    title: "Audit & books",
    items: [
      { label: "Audit dashboard", icon: ShieldCheck, path: "/audit" },
      { label: "Chart of accounts", icon: BookOpen, path: "/audit/chart-of-accounts" },
      { label: "Profit & loss", icon: TrendingUp, path: "/audit/profit-loss" },
      { label: "Inventory audit", icon: Package, path: "/audit/inventory" },
      { label: "Debtors / creditors", icon: Scale, path: "/audit/debtors-creditors" },
      { label: "GST", icon: BookOpen, path: "/audit/gst" },
      { label: "Cash & bank", icon: Wallet, path: "/audit/cash-bank" },
      { label: "Expense audit", icon: FileSpreadsheet, path: "/audit/expenses" },
      { label: "Fixed assets", icon: HardDrive, path: "/audit/assets" },
      { label: "Audit logs", icon: ScrollText, path: "/audit/logs" },
      { label: "Reports & export", icon: Download, path: "/audit/reports" },
      { label: "Data flow", icon: Layers, path: "/audit/data-flow" },
    ],
  },
];

function allPinnableItems(): NavItem[] {
  return navSections.flatMap((s) => s.items);
}

function getItemByPath(path: string): NavItem | undefined {
  return allPinnableItems().find((i) => i.path === path);
}

type SidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const location = useLocation();
  const [pinnedPaths, setPinnedPaths] = useState<string[]>(() => readPinnedPaths());
  const { permissionService } = useFoundation();
  const { currentRole } = useAppSession();

  const refreshPins = useCallback(() => setPinnedPaths(readPinnedPaths()), []);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NAV_PINS_STORAGE_KEY) refreshPins();
    };
    const onCustom = () => refreshPins();
    window.addEventListener("storage", onStorage);
    window.addEventListener(NAV_PINS_CHANGED_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(NAV_PINS_CHANGED_EVENT, onCustom);
    };
  }, [refreshPins]);

  useEffect(() => {
    prunePinnedPathsForRole((path) => permissionService.canAccessPath(currentRole, path));
    refreshPins();
  }, [currentRole, permissionService, refreshPins]);

  const handlePinToggle = (path: string) => {
    const next = togglePinnedPath(path, pinnedPaths);
    writePinnedPaths(next);
    setPinnedPaths(next);
  };

  const alertCount = useDerivedAlertCount();

  const isPathActive = (path: string) => {
    const [basePath, query] = path.split("?");
    const [currentBasePath] = location.pathname.split("?");

    if (query) {
      return currentBasePath === basePath && location.search.includes(query.split("=")[1]);
    }

    if (basePath === "/") {
      return location.pathname === "/";
    }
    return location.pathname === basePath || location.pathname.startsWith(basePath + "/");
  };

  const isPinned = (path: string) => pinnedPaths.includes(path);

  const renderNavItem = (item: NavItem) => {
    const active = isPathActive(item.path);
    const pinned = isPinned(item.path);

    return (
      <div
        key={item.path}
        className="group flex items-stretch gap-0.5"
      >
        <NavLink
          to={item.path}
          onClick={() => onMobileClose()}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0 opacity-90" />
          <span className="min-w-0 flex-1 truncate leading-snug">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
              {item.badge}
            </Badge>
          )}
        </NavLink>
        <button
          type="button"
          className={cn(
            "flex w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-sidebar-accent/50 hover:text-foreground",
            pinned ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus:opacity-100"
          )}
          aria-label={pinned ? "Unpin from top" : "Pin to top"}
          onClick={(e) => {
            e.preventDefault();
            handlePinToggle(item.path);
          }}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  };

  const filterByPermission = (items: NavItem[]) =>
    items.filter((i) => permissionService.canAccessPath(currentRole, i.path));

  const pinnedItemsOrdered = pinnedPaths
    .map((p) => getItemByPath(p))
    .filter((item): item is NavItem => !!item)
    .filter((item) => permissionService.canAccessPath(currentRole, item.path));
  const seenPinned = new Set(pinnedItemsOrdered.map((i) => i.path));

  const useSwipeTransform =
    isMobileLayout &&
    (swipeDragging || (mobileOpen && swipeDragOffset !== 0));

  return (
    <aside
      {...swipeTouchHandlers}
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen max-h-screen w-64 min-w-[256px] flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:static lg:z-0 lg:translate-x-0",
        swipeDragging ? "transition-none" : "transition-transform duration-200 ease-out",
        !useSwipeTransform && (mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"),
        swipeDragging && "touch-none",
      )}
      style={
        useSwipeTransform
          ? {
              transform: `translateX(${
                mobileOpen ? swipeDragOffset : -MOBILE_SIDEBAR_WIDTH_PX
              }px)`,
            }
          : undefined
      }
    >
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          M
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">Mahi Sola Solutions</div>
        </div>
      </div>

      <nav key={`sidebar-nav-${currentRole}`} className="min-h-0 flex-1 space-y-0 overflow-y-auto overflow-x-hidden px-2.5 py-2">
        {pinnedItemsOrdered.length > 0 && (
          <div className="space-y-0.5 pb-2">
            <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pinned
            </p>
            {pinnedItemsOrdered.map((item) => renderNavItem(item))}
            <div className="my-2 border-t border-sidebar-border" />
          </div>
        )}

        {navSections.map((section) => {
          const items = filterByPermission(section.items).filter((i) => !seenPinned.has(i.path));
          if (items.length === 0) return null;
          return (
            <div key={section.id} className="pb-3 last:pb-0">
              <p className="px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/90">
                {section.title}
              </p>
              <div className="space-y-0.5">{items.map((item) => renderNavItem(item))}</div>
            </div>
          );
        })}

        {permissionService.canAccessPath(currentRole, "/notifications") && (
          <div className="border-t border-sidebar-border pt-2 mt-1">
            <NavLink
              to="/notifications"
              onClick={() => onMobileClose()}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === "/notifications"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Bell className="h-4 w-4" />
              <span className="flex-1">Notifications</span>
              {alertCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {alertCount}
                </Badge>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border bg-sidebar/95 px-2.5 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80">
        {permissionService.canAccessPath(currentRole, "/settings") && (
          <NavLink
            to="/settings"
            onClick={() => onMobileClose()}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              location.pathname === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Settings &amp; data</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

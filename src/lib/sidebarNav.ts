import type { ElementType } from "react";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  Users,
  Calendar,
  BarChart3,
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
  FileStack,
  HardHat,
  Palette,
} from "lucide-react";

export type SidebarNavItem = {
  label: string;
  icon: ElementType;
  path: string;
  badge?: number;
};

export type SidebarNavSection = {
  id: string;
  title: string;
  items: SidebarNavItem[];
};

/** Canonical sidebar sections — single source for render + pin resolution. */
export const sidebarNavSections: SidebarNavSection[] = [
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
  {
    id: "system",
    title: "System",
    items: [
      { label: "Notifications", icon: Bell, path: "/notifications" },
      { label: "Design system", icon: Palette, path: "/settings/design-system" },
    ],
  },
];

export function allSidebarNavItems(): SidebarNavItem[] {
  return sidebarNavSections.flatMap((section) => section.items);
}

export function getSidebarNavItemByPath(path: string): SidebarNavItem | undefined {
  return allSidebarNavItems().find((item) => item.path === path);
}

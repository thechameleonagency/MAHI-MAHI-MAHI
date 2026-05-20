/**
 * Deep links from dashboard KPI tiles / detail sheets to filtered list routes.
 */

export type DashboardKpiCardId =
  | "enquiries"
  | "followUps"
  | "quotations"
  | "projects"
  | "activeSites"
  | "tasks"
  | "pending"
  | "needToGet"
  | "stock"
  | "emis"
  | "blockages"
  | "revenue"
  | "employees";

const LIST_PATHS: Record<DashboardKpiCardId, string> = {
  enquiries: "/enquiries?status=open",
  followUps: "/enquiries?status=open&followUp=overdue",
  quotations: "/quotations?pipeline=inflight",
  projects: "/projects?status=Ongoing",
  activeSites: "/active-sites",
  tasks: "/timeline?sections=people,office&tasks=overdue",
  pending: "/invoices?receivable=open",
  needToGet: "/inventory/materials",
  stock: "/inventory/materials?stock=low",
  emis: "/loans?status=Active&emi=due7d",
  blockages: "/projects?status=On%20Hold",
  revenue: "/finance",
  employees: "/employees",
};

export function getDashboardKpiListPath(cardId: string): string | null {
  if (cardId in LIST_PATHS) {
    return LIST_PATHS[cardId as DashboardKpiCardId];
  }
  return null;
}

export function getDashboardKpiListLabel(cardId: string): string {
  switch (cardId) {
    case "enquiries":
      return "Open enquiries";
    case "followUps":
      return "Overdue follow-ups";
    case "quotations":
      return "Quotations in flight";
    case "projects":
      return "Ongoing projects";
    case "activeSites":
      return "Active sites";
    case "tasks":
      return "Overdue tasks";
    case "pending":
      return "Open receivables";
    case "needToGet":
      return "Materials & procurement";
    case "stock":
      return "Low stock SKUs";
    case "emis":
      return "EMIs due soon";
    case "blockages":
      return "Projects on hold";
    case "revenue":
      return "Finance";
    case "employees":
      return "Active roster";
    default:
      return "View full list";
  }
}

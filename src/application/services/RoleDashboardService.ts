import type { UserRole } from "@/domain/entities/identity";

export type DashboardMetricKey =
  | "openEnquiries"
  | "quotationsInFlight"
  | "activeProjects"
  | "activeSites"
  | "overdueTasks"
  | "overdueFollowUps"
  | "openBlockages"
  | "projectsOnHold"
  | "receivables"
  | "lowStockMaterials"
  | "procurementGaps"
  | "emiDueSoon";

export class RoleDashboardService {
  getVisibleMetrics(role: UserRole): DashboardMetricKey[] {
    if (role === "salesperson") {
      return ["openEnquiries", "overdueFollowUps", "quotationsInFlight", "activeProjects", "receivables"];
    }
    if (role === "installation_team") {
      return ["activeSites", "overdueTasks", "openBlockages", "lowStockMaterials", "procurementGaps"];
    }

    return [
      "openEnquiries",
      "overdueFollowUps",
      "quotationsInFlight",
      "activeProjects",
      "activeSites",
      "overdueTasks",
      "openBlockages",
      "projectsOnHold",
      "receivables",
      "lowStockMaterials",
      "procurementGaps",
      "emiDueSoon",
    ];
  }
}

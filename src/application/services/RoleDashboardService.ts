import type { UserRole } from "@/domain/entities/identity";

export type DashboardMetricKey =
  | "openEnquiries"
  | "quotationsInFlight"
  | "activeProjects"
  | "activeSites"
  | "openTasks"
  | "openBlockages"
  | "receivables"
  | "lowStockMaterials"
  | "pendingApprovals";

export class RoleDashboardService {
  getVisibleMetrics(role: UserRole): DashboardMetricKey[] {
    if (role === "salesperson") {
      return ["openEnquiries", "quotationsInFlight", "activeProjects", "openTasks", "pendingApprovals"];
    }
    if (role === "installation_team") {
      return ["activeSites", "openTasks", "openBlockages", "lowStockMaterials"];
    }

    return [
      "openEnquiries",
      "quotationsInFlight",
      "activeProjects",
      "activeSites",
      "openTasks",
      "openBlockages",
      "receivables",
      "lowStockMaterials",
      "pendingApprovals",
    ];
  }
}

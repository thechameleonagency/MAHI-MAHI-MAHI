import type { Employee, SiteRecord, Tool } from "@/types/project";

/** Backfill tool FKs from legacy display-name fields when hydrating persisted state. */
export function normalizeTools(
  tools: Tool[],
  sites: SiteRecord[],
  employees: Employee[],
): Tool[] {
  return tools.map((tool) => {
    let assignedToSiteId = tool.assignedToSiteId;
    let assignedToEmployeeId = tool.assignedToEmployeeId;

    if (!assignedToSiteId && tool.site?.trim()) {
      const site = sites.find(
        (s) => s.name === tool.site || String(s.id) === tool.site,
      );
      if (site) assignedToSiteId = String(site.id);
    }

    if (!assignedToEmployeeId && tool.assignedTo && tool.assignedTo !== "-") {
      const emp = employees.find((e) => e.name === tool.assignedTo);
      if (emp) assignedToEmployeeId = String(emp.id);
    }

    if (assignedToSiteId === tool.assignedToSiteId && assignedToEmployeeId === tool.assignedToEmployeeId) {
      return tool;
    }
    return { ...tool, assignedToSiteId, assignedToEmployeeId };
  });
}

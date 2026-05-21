import { isProjectActiveForSiteExecution } from "@/lib/projectListFilters";
import type { Project } from "@/types/project";

/** Projects that belong on Active Sites: started execution, not terminal. */
export function isActiveSiteProject(project: Project): boolean {
  return isProjectActiveForSiteExecution(project);
}

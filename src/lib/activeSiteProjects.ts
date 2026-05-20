import type { Project } from "@/types/project";

/** Projects that belong on Active Sites: started execution, not terminal. */
export function isActiveSiteProject(project: Project): boolean {
  if (project.lifecycleStatus === "Completed") return false;
  if (project.status === "Completed" || project.status === "Closed") return false;
  if (!project.startedAt) return false;
  return (
    project.status === "Ongoing" ||
    project.lifecycleStatus === "In Progress" ||
    project.lifecycleStatus === "On Hold"
  );
}

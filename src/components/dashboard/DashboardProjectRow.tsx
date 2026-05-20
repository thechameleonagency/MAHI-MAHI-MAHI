import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Project } from "@/types/project";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { useAppData } from "@/contexts/AppDataContext";
import { AgingChip } from "@/components/ui/AgingChip";
import { getProjectIdleAging } from "@/lib/agingHelpers";
import { isDirectExceptionProject, projectDirectExceptionReason } from "@/lib/projectDirectException";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export function DashboardProjectRow({ project }: { project: Project }) {
  const { customers } = useAppData();
  const customerId = project.customerId ?? customers.find((c) => c.name === project.client)?.id;
  const statusLabel = project.status ?? project.lifecycleStatus ?? "Active";
  const aging = getProjectIdleAging(project);

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">
            <EntityLink entityType="project" entityId={project.id} name={project.name} />
          </p>
          <p className="text-xs text-muted-foreground">
            {customerId ? (
              <EntityLink
                entityType="customer"
                entityId={customerId}
                name={project.client}
                className="font-normal"
              />
            ) : (
              project.client
            )}{" "}
            · {project.capacity}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={statusLabel} label={statusLabel} className="text-2xs" />
            {project.progressStage && (
              <Badge variant="outline" className="text-2xs">
                {project.progressStage}
              </Badge>
            )}
            {isDirectExceptionProject(project) && (
              <Badge
                variant="outline"
                className="text-2xs bg-warning/10 text-warning border-warning/20"
                title={projectDirectExceptionReason(project) ?? undefined}
              >
                Direct exception
              </Badge>
            )}
            <AgingChip signal={aging} />
          </div>
          {isDirectExceptionProject(project) && projectDirectExceptionReason(project) && (
            <p className="text-2xs text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground">Exception:</span>{" "}
              {projectDirectExceptionReason(project)}
            </p>
          )}
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to={`/projects/${project.id}`} icon={Building2}>
            Open project
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}

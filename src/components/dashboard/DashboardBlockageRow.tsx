import { AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Project } from "@/types/project";
import { AgingChip } from "@/components/ui/AgingChip";
import { getProjectOnHoldAging } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export interface DashboardBlockageRowProps {
  project: Project;
}

export function DashboardBlockageRow({ project }: DashboardBlockageRowProps) {
  const aging = getProjectOnHoldAging(project);

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.client}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={project.status ?? "On Hold"}
              label={project.progressStage ?? "On Hold"}
              className="text-2xs"
            />
            <AgingChip signal={aging} />
          </div>
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to={`/projects/${project.id}`} icon={AlertCircle}>
            Resolve project
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}

import { AlertCircle, MapPin } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { AgingChip } from "@/components/ui/AgingChip";
import { getBlockageUpdatedAging } from "@/lib/agingHelpers";
import type { Blockage } from "@/types/blockage";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
  DropdownMenuSeparator,
} from "@/components/dashboard/DashboardCompactRowMenu";

export interface DashboardOpsBlockageRowProps {
  blockage: Blockage;
  projectName?: string;
}

export function DashboardOpsBlockageRow({ blockage, projectName }: DashboardOpsBlockageRowProps) {
  const aging = getBlockageUpdatedAging(blockage);

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{blockage.title}</p>
          {blockage.reason && (
            <p className="text-xs text-muted-foreground line-clamp-2">{blockage.reason}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {projectName ? (
              <EntityLink
                entityType="project"
                entityId={blockage.projectId}
                name={projectName}
                className="text-2xs"
              />
            ) : (
              <span className="text-2xs text-muted-foreground">{blockage.projectId}</span>
            )}
            <AgingChip signal={aging} />
          </div>
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to={`/projects/${blockage.projectId}`} icon={AlertCircle}>
            Open project
          </DashboardCompactRowMenuLink>
          <DropdownMenuSeparator />
          <DashboardCompactRowMenuLink to="/active-sites" icon={MapPin}>
            Resolve on active sites
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}


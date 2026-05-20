import { ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { AgingChip } from "@/components/ui/AgingChip";
import type { AgingSignal } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
  DropdownMenuSeparator,
} from "@/components/dashboard/DashboardCompactRowMenu";

export interface DashboardActiveSiteRowProps {
  site: {
    id: string;
    name: string;
    projectId?: string;
    projectName?: string;
    address?: string;
  };
  /** Typically project idle aging for the linked ongoing project. */
  projectAging?: AgingSignal | null;
}

export function DashboardActiveSiteRow({ site, projectAging }: DashboardActiveSiteRowProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{site.name}</p>
          {site.address && (
            <p className="text-xs text-muted-foreground truncate">{site.address}</p>
          )}
          {site.projectName && site.projectId && (
            <EntityLink
              entityType="project"
              entityId={site.projectId}
              name={site.projectName}
              className="text-2xs"
            />
          )}
          {site.projectName && !site.projectId && (
            <Badge variant="outline" className="text-2xs">
              {site.projectName}
            </Badge>
          )}
          <AgingChip signal={projectAging} />
        </div>
        <DashboardCompactRowMenu>
          {site.projectId && (
            <>
              <DashboardCompactRowMenuLink to={`/projects/${site.projectId}`} icon={ExternalLink}>
                Open project
              </DashboardCompactRowMenuLink>
              <DropdownMenuSeparator />
            </>
          )}
          <DashboardCompactRowMenuLink to="/active-sites" icon={MapPin}>
            Open active sites
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}

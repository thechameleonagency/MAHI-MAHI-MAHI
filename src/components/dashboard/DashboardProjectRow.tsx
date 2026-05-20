import { Link } from "react-router-dom";
import { Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { useAppData } from "@/contexts/AppDataContext";

export function DashboardProjectRow({ project }: { project: Project }) {
  const { customers } = useAppData();
  const customerId = project.customerId ?? customers.find((c) => c.name === project.client)?.id;
  const statusLabel = project.status ?? project.lifecycleStatus ?? "Active";
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
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
            <Badge variant="secondary" className="text-2xs">
              {statusLabel}
            </Badge>
            {project.progressStage && (
              <Badge variant="outline" className="text-2xs">
                {project.progressStage}
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to={`/projects/${project.id}`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to={`/projects/${project.id}`}>
          <Building2 className="mr-1 h-3 w-3" />
          Open project
        </Link>
      </Button>
    </div>
  );
}

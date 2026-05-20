import { Link } from "react-router-dom";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/project";

export interface DashboardBlockageRowProps {
  project: Project;
}

export function DashboardBlockageRow({ project }: DashboardBlockageRowProps) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{project.name}</p>
          <p className="text-xs text-muted-foreground">{project.client}</p>
          <Badge variant="destructive" className="text-2xs">
            {project.progressStage ?? "On Hold"}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to={`/projects/${project.id}`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to={`/projects/${project.id}`}>
          <AlertCircle className="mr-1 h-3 w-3" />
          Resolve project
        </Link>
      </Button>
    </div>
  );
}

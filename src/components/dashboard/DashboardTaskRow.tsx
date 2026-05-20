import { Link } from "react-router-dom";
import { ClipboardList, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types/project";
import { AgingChip } from "@/components/ui/AgingChip";
import { getTaskOverdueAging } from "@/lib/agingHelpers";

export function DashboardTaskRow({ task }: { task: Task }) {
  const aging = getTaskOverdueAging(task);
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{task.workType}</p>
          <p className="text-xs text-muted-foreground">
            {task.siteName ?? task.projectId} · Due {task.workDate}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="capitalize text-2xs">
              {task.status}
            </Badge>
            {aging && <AgingChip signal={aging} />}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/timeline">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to="/timeline">
          <ClipboardList className="mr-1 h-3 w-3" />
          Open timeline
        </Link>
      </Button>
    </div>
  );
}

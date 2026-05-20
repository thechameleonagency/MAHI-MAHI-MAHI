import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AgingChip } from "@/components/ui/AgingChip";
import type { Task } from "@/types/project";
import { getTaskOverdueAging } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export function DashboardTaskRow({ task }: { task: Task }) {
  const aging = getTaskOverdueAging(task);

  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-3">
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
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to="/timeline" icon={ClipboardList}>
            Open timeline
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}

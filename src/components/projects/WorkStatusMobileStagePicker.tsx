import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkStatusStage } from "@/types/blockage";
import type { ProjectTimelineStatus } from "@/types/blockage";
import {
  countCompletedWorkStatusSubItems,
  workStatusStageNeedsAttention,
} from "@/lib/progressReportWorkStatusMobile";

type WorkApprovals = NonNullable<ProjectTimelineStatus["workStatusApprovals"]>;

interface WorkStatusMobileStagePickerProps {
  stages: WorkStatusStage[];
  selectedKey: string;
  checkedKeys: string[];
  approvals: WorkApprovals;
  onSelect: (stageKey: string) => void;
}

export function WorkStatusMobileStagePicker({
  stages,
  selectedKey,
  checkedKeys,
  approvals,
  onSelect,
}: WorkStatusMobileStagePickerProps) {
  return (
    <div className="md:hidden space-y-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        Installation stage
      </p>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {stages.map((stage) => {
          const isSelected = selectedKey === stage.value;
          const isChecked = checkedKeys.includes(stage.value);
          const needsAttention = workStatusStageNeedsAttention(stage, checkedKeys, approvals);
          const { done, total } = countCompletedWorkStatusSubItems(stage, approvals);

          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => onSelect(stage.value)}
              className={cn(
                "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-muted-foreground/15 bg-muted/30 hover:bg-muted/50",
                needsAttention && !isSelected && "border-warning/40",
              )}
              aria-pressed={isSelected}
              aria-label={`${stage.label}${total > 0 ? `, ${done} of ${total} sub-items` : ""}`}
            >
              {isChecked ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <Circle
                  className={cn(
                    "h-3 w-3",
                    needsAttention ? "text-warning" : "text-muted-foreground/50",
                  )}
                />
              )}
              <span
                className={cn(
                  "text-2xs font-semibold leading-tight",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
              {total > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {done}/{total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

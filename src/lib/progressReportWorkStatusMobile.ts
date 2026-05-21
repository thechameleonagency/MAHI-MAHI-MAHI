import type { ProjectTimelineStatus, WorkStatusStage } from "@/types/blockage";
import { subItemAwaitingApproverAction } from "@/lib/progressReportWorkStatus";

type WorkApprovals = NonNullable<ProjectTimelineStatus["workStatusApprovals"]>;

/** Pending approval first, then first unchecked stage, then incomplete sub-items, else last stage. */
export function pickFocusWorkStatusStageKey(
  stages: WorkStatusStage[],
  checkedKeys: string[],
  approvals: WorkApprovals,
): string {
  if (stages.length === 0) return "";

  for (const stage of stages) {
    const approval = approvals[stage.value];
    if (approval?.status === "requested" || approval?.status === "rejected") {
      return stage.value;
    }
    for (const sub of stage.subItems ?? []) {
      const subApproval = approval?.subItemApprovals?.[sub.value];
      if (
        subItemAwaitingApproverAction(subApproval, sub.photoRequired) ||
        subApproval?.status === "rejected"
      ) {
        return stage.value;
      }
    }
  }

  const firstOpen = stages.find((s) => !checkedKeys.includes(s.value));
  if (firstOpen) return firstOpen.value;

  for (const stage of stages) {
    const { done, total } = countCompletedWorkStatusSubItems(stage, approvals);
    if (total > 0 && done < total) return stage.value;
  }

  return stages[stages.length - 1]!.value;
}

export function countCompletedWorkStatusSubItems(
  stage: WorkStatusStage,
  approvals: WorkApprovals,
): { done: number; total: number } {
  const subs = stage.subItems ?? [];
  if (subs.length === 0) return { done: 0, total: 0 };
  let done = 0;
  for (const sub of subs) {
    const status = approvals[stage.value]?.subItemApprovals?.[sub.value]?.status;
    if (status === "approved" || status === "closed") done += 1;
  }
  return { done, total: subs.length };
}

export function workStatusStageNeedsAttention(
  stage: WorkStatusStage,
  checkedKeys: string[],
  approvals: WorkApprovals,
): boolean {
  const approval = approvals[stage.value];
  if (approval?.status === "requested" || approval?.status === "rejected") return true;
  if (!checkedKeys.includes(stage.value)) {
    const { done, total } = countCompletedWorkStatusSubItems(stage, approvals);
    if (total > 0 && done < total) return true;
    if (total === 0 && approval?.status === "pending") return true;
  }
  for (const sub of stage.subItems ?? []) {
    if (
      subItemAwaitingApproverAction(
        approval?.subItemApprovals?.[sub.value],
        sub.photoRequired,
      )
    ) {
      return true;
    }
  }
  return false;
}

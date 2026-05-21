import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  FIELD_INSTALL_DEMO_PANEL_STAGE,
  FIELD_INSTALL_DEMO_TASK_ID,
  findFieldInstallationDemoProject,
  runFieldInstallationDemoPath,
} from "@/lib/fieldInstallationDemoPath";
import {
  findStaleProgressReportTaskLinkage,
  isPhotoCaptureTask,
} from "@/lib/progressReportTaskContinuity";
import { verifySeedState } from "@/data/seed/seedVerification";

describe("fieldInstallationDemoPath (PR1)", () => {
  it("smoke seed includes demo project ready for panel photo assignment", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const demo = findFieldInstallationDemoProject(hydrated);
    expect(demo, "demo project missing from seed").toBeDefined();

    const tl = hydrated.projectTimelineByProjectId[demo!.id];
    const panel = tl?.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE];
    expect(panel?.status).toBe("pending");
    expect(panel?.linkedTaskId).toBeUndefined();

    const panelPhotoTasks = hydrated.tasks.filter(
      (t) =>
        t.projectId === demo!.id &&
        isPhotoCaptureTask(t) &&
        t.workTag === FIELD_INSTALL_DEMO_PANEL_STAGE,
    );
    expect(panelPhotoTasks).toHaveLength(0);
  });

  it("runs assign → complete → media → approve → closed without stale linkage", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    const result = runFieldInstallationDemoPath(hydrated);
    expect(result).not.toBeNull();

    const { state: final } = result!;
    const stale = findStaleProgressReportTaskLinkage(final);
    expect(stale, JSON.stringify(stale)).toEqual([]);

    const tl = final.projectTimelineByProjectId[result!.projectId];
    const panel = tl?.workStatusApprovals?.[FIELD_INSTALL_DEMO_PANEL_STAGE];
    expect(panel?.status).toBe("closed");
    expect(panel?.linkedTaskId).toBe(FIELD_INSTALL_DEMO_TASK_ID);
    expect(panel?.photoUrls?.length).toBeGreaterThan(0);
    expect(panel?.photoCount).toBe(panel?.photoUrls?.length);

    const task = final.tasks.find((t) => t.id === FIELD_INSTALL_DEMO_TASK_ID);
    expect(task?.status).toBe("done");
    expect(tl?.workStatusChecks).toContain(FIELD_INSTALL_DEMO_PANEL_STAGE);
  });

  it("full seed still passes verifySeedState after demo narrative", () => {
    const { verification } = buildBusinessSeed("full");
    expect(verification.ok, verification.errors.join("; ")).toBe(true);
  });

  it("hydrated full seed has no ER9 stale linkage", () => {
    const { state } = buildBusinessSeed("full");
    const hydrated = applyAppStateHydrationPipeline(state);
    const verification = verifySeedState(hydrated, "full");
    const er9 = verification.errors.filter((e) => e.startsWith("ER9:"));
    expect(er9, er9.join("; ")).toEqual([]);
  });
});

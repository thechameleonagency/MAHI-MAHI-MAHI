import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import {
  canApproveWorkStatusRole,
  fieldSubItemSubmissionStatus,
  isWorkStatusFieldSubmitterRole,
  stageAwaitingApproverAction,
  subItemAwaitingApproverAction,
} from "@/lib/progressReportWorkStatus";
import { resolveProgressReportActor } from "@/lib/progressReportActor";

describe("progressReportWorkStatus (C3 / V3)", () => {
  it("management can approve; installation_team submits only", () => {
    expect(canApproveWorkStatusRole("management")).toBe(true);
    expect(canApproveWorkStatusRole("installation_team")).toBe(false);
    expect(isWorkStatusFieldSubmitterRole("installation_team")).toBe(true);
    expect(isWorkStatusFieldSubmitterRole("admin")).toBe(false);
  });

  it("resolveProgressReportActor aligns with approval roles", () => {
    const mgmt = resolveProgressReportActor({
      sessionUserId: "M1",
      displayName: "Ops Lead",
      role: "management",
    });
    expect(mgmt.canApproveWorkStatus).toBe(true);
    expect(mgmt.isAdmin).toBe(false);

    const field = resolveProgressReportActor({
      sessionUserId: "INST-001",
      displayName: "Karthik Rao",
      role: "installation_team",
    });
    expect(field.canApproveWorkStatus).toBe(false);
  });

  it("subItemAwaitingApproverAction includes requested media submissions", () => {
    expect(
      subItemAwaitingApproverAction(
        { status: "requested", photoUrls: ["data:image/png;base64,x"] },
        true,
      ),
    ).toBe(true);
    expect(
      subItemAwaitingApproverAction({ status: "pending" }, true),
    ).toBe(false);
    expect(
      subItemAwaitingApproverAction(
        { status: "pending", updatedAt: "2026-05-01" },
        false,
      ),
    ).toBe(true);
  });

  it("fieldSubItemSubmissionStatus routes non-approvers to requested when media present", () => {
    expect(fieldSubItemSubmissionStatus(false, true)).toBe("requested");
    expect(fieldSubItemSubmissionStatus(false, false)).toBe("pending");
    expect(fieldSubItemSubmissionStatus(true, false)).toBe("approved");
  });

  it("stageAwaitingApproverAction gates main-stage approve buttons", () => {
    expect(stageAwaitingApproverAction("requested")).toBe(true);
    expect(stageAwaitingApproverAction("pending")).toBe(false);
    expect(stageAwaitingApproverAction("approved")).toBe(false);
  });

  it("seed includes work-status approval pending narrative for demo", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applySeedHydrationPipeline(state);
    const pending = Object.values(hydrated.projectTimelineByProjectId).filter((tl) =>
      Object.values(tl.workStatusApprovals ?? {}).some((a) => a.status === "requested"),
    );
    expect(pending.length).toBeGreaterThan(0);
  });
});

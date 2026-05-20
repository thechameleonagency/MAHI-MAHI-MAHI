import { describe, expect, it } from "vitest";
import {
  activeSiteTimelineInProgress,
  buildTodaysSiteActivitySnapshot,
} from "@/lib/todaysSiteActivity";
import type { Blockage, ProjectTimelineStatus } from "@/types/blockage";
import type { Project, Task } from "@/types/project";

const ongoingProject = (): Project =>
  ({
    id: "P1",
    name: "Site Alpha",
    client: "Client A",
    status: "Ongoing",
    lifecycleStatus: "In Progress",
    startedAt: "2026-05-01",
    startDate: "2026-05-01",
    createdAt: "2026-05-01",
  }) as Project;

describe("buildTodaysSiteActivitySnapshot", () => {
  it("prioritizes projects with open blockages", () => {
    const projects = [ongoingProject(), { ...ongoingProject(), id: "P2", name: "Site Beta" } as Project];
    const blockages: Blockage[] = [
      {
        id: "B1",
        projectId: "P2",
        title: "Material delay",
        status: "active",
        priority: "high",
        createdAt: "2026-05-17",
        assignedAt: "2026-05-17",
      } as Blockage,
    ];
    const snap = buildTodaysSiteActivitySnapshot({
      projects,
      blockages,
      tasks: [],
      todayIso: "2026-05-17",
      projectTimelineByProjectId: {},
    });
    expect(snap.openBlockagesCount).toBe(1);
    expect(snap.rows[0]?.projectId).toBe("P2");
    expect(snap.rows[0]?.label).toMatch(/blockage/i);
    expect(snap.rows[0]?.tone).toBe("danger");
  });

  it("counts tasks due today on ongoing sites", () => {
    const tasks: Task[] = [
      {
        id: "T1",
        projectId: "P1",
        siteId: "P1",
        siteName: "Site Alpha",
        workType: "Panel install",
        workDate: "2026-05-17",
        status: "created",
        notes: "",
        createdDate: "2026-05-16",
        createdBy: "E1",
      },
    ];
    const snap = buildTodaysSiteActivitySnapshot({
      projects: [ongoingProject()],
      blockages: [],
      tasks,
      todayIso: "2026-05-17",
      projectTimelineByProjectId: {},
    });
    expect(snap.tasksDueTodayCount).toBe(1);
    expect(snap.rows[0]?.label).toMatch(/task/i);
  });

  it("detects timeline in progress", () => {
    const timeline: ProjectTimelineStatus = {
      workStatusChecks: ["structure"],
      workStatusComplete: false,
    } as ProjectTimelineStatus;
    expect(activeSiteTimelineInProgress(timeline)).toBe(true);
    const snap = buildTodaysSiteActivitySnapshot({
      projects: [ongoingProject()],
      blockages: [],
      tasks: [],
      todayIso: "2026-05-17",
      projectTimelineByProjectId: { P1: timeline },
    });
    expect(snap.timelineInProgressCount).toBe(1);
    expect(snap.rows[0]?.label).toMatch(/Timeline/i);
  });

  it("excludes projects that have not started", () => {
    const snap = buildTodaysSiteActivitySnapshot({
      projects: [
        {
          ...ongoingProject(),
          id: "P-NO",
          startedAt: undefined,
          status: "Ongoing",
        } as Project,
      ],
      blockages: [],
      tasks: [],
      todayIso: "2026-05-17",
      projectTimelineByProjectId: {},
    });
    expect(snap.ongoingCount).toBe(0);
  });
});

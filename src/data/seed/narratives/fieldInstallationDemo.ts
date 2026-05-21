import type { NarrativeApply } from "./shared";
import { seedDateAt } from "../seedTimeModel";
import {
  FIELD_INSTALL_DEMO_MARKER,
  FIELD_INSTALL_DEMO_PANEL_STAGE,
} from "@/lib/fieldInstallationDemoPath";
import { PHOTO_CAPTURE_TASK_PREFIX } from "@/lib/progressReportTaskContinuity";

const SEED_STRUCTURE_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='48'%3E%3Crect fill='%23e2e8f0' width='64' height='48'/%3E%3Ctext x='8' y='28' font-size='10' fill='%2364748b'%3ESeed%3C/text%3E%3C/svg%3E";

/**
 * PR1 — dedicated walkthrough project at step 1 (assign panel photo task).
 * Rich timeline narrative may touch the first three EPC projects; this picks another in-progress site.
 */
export const applyFieldInstallationDemo: NarrativeApply = (state) => {
  const richIds = new Set(
    state.projects
      .filter((p) => p.projectKind === "SOLO_EPC" || p.projectKind === "PARTNER_EPC")
      .slice(0, 3)
      .map((p) => p.id),
  );

  const candidates = state.projects.filter(
    (p) =>
      p.lifecycleStatus === "In Progress" &&
      (p.projectKind === "SOLO_EPC" || p.projectKind === "PARTNER_EPC") &&
      !richIds.has(p.id),
  );
  const project = candidates[0] ?? state.projects.find((p) => p.lifecycleStatus === "In Progress");
  if (!project) return;

  const site = state.sites.find((s) => s.projectId === project.id);
  project.name = `${FIELD_INSTALL_DEMO_MARKER} — panel photos`;
  project.executionPhase = project.executionPhase ?? "Panel installation";
  project.progressStage = "work-in-progress";

  state.tasks = state.tasks.filter(
    (t) =>
      !(
        t.projectId === project.id &&
        t.workType.startsWith(PHOTO_CAPTURE_TASK_PREFIX) &&
        (t.workTag === FIELD_INSTALL_DEMO_PANEL_STAGE || t.milestoneId === FIELD_INSTALL_DEMO_PANEL_STAGE)
      ),
  );

  const structureTask = state.tasks.find(
    (t) =>
      t.projectId === project.id &&
      t.workType.startsWith(PHOTO_CAPTURE_TASK_PREFIX) &&
      t.workTag === "structure",
  );

  const tl = state.projectTimelineByProjectId[project.id] ?? {
    projectId: project.id,
    fileLogin: "complete",
    fileLoginComplete: true,
    subsidyType: "not-applicable",
    bankFileType: "cash",
    loanStage: "",
    loanStatus: "",
    workStatusChecks: ["structure"],
    discomChecks: [],
    discomSubsidyStatus: "",
    paymentType: "cash-to-mahi",
    updatedAt: seedDateAt(0.55),
  };

  tl.fileLogin = "complete";
  tl.fileLoginComplete = true;
  tl.workStatusChecks = ["structure"];
  tl.workStatusComplete = false;
  tl.workStatusApprovals = {
    structure: {
      status: "closed",
      photoCount: 1,
      photoUrls: [SEED_STRUCTURE_PHOTO],
      linkedTaskId: structureTask?.id,
      approvedAt: seedDateAt(0.5),
      approvedByName: "Anita Deshmukh",
      updatedBy: "ADM-001",
      updatedByName: "Anita Deshmukh",
    },
    [FIELD_INSTALL_DEMO_PANEL_STAGE]: {
      status: "pending",
      photoCount: 0,
      videoCount: 0,
    },
  };
  tl.updatedAt = seedDateAt(0.56);
  state.projectTimelineByProjectId[project.id] = tl;

  if (site && structureTask && !structureTask.siteId) {
    structureTask.siteId = site.id;
    structureTask.siteName = site.name;
  }
};

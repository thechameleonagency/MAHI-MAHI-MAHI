import { describe, expect, it } from "vitest";
import { canStartProject } from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

const intakeProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "P-NEW",
    name: "Intake",
    projectType: "Residential",
    projectCategory: "solar",
    lifecycleStatus: "Active",
    progressStage: "new",
    executionPhase: "Intake",
    client: "C",
    capacity: "5kW",
    location: "J",
    contractAmount: 1,
    createdAt: "2026-01-01",
    ...overrides,
  }) as unknown as Project;

describe("project lifecycle New (C7)", () => {
  it("normalizeProject migrates unstarted intake legacy Active to New", () => {
    const normalized = normalizeProject(intakeProject());
    expect(normalized.lifecycleStatus).toBe("New");
  });

  it("does not migrate in-flight execution rows without startedAt", () => {
    const normalized = normalizeProject(
      intakeProject({
        lifecycleStatus: "In Progress",
        executionPhase: "execution",
        progressStage: "Procurement",
      }),
    );
    expect(normalized.lifecycleStatus).toBe("In Progress");
  });

  it("canStartProject accepts canonical New when site is ready", () => {
    expect(canStartProject("New", true, "admin").ok).toBe(true);
  });

  it("canStartProject rejects In Progress", () => {
    expect(canStartProject("In Progress", true, "admin").ok).toBe(false);
  });
});

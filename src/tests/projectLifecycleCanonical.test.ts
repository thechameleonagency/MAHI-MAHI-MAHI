import { describe, expect, it } from "vitest";
import {
  canonicalizeProjectLifecycleStatus,
  isCanonicalProjectLifecycleStatus,
  legacyStatusFromLifecycle,
} from "@/domain/stateMachines/projectStateMachine";
import { normalizeProject } from "@/lib/projectNormalize";
import { seedProjects } from "@/data/seedData";
import type { Project } from "@/types/project";

describe("project lifecycle canonical (O9)", () => {
  it("maps legacy labels to five canonical states", () => {
    expect(canonicalizeProjectLifecycleStatus("Active")).toBe("In Progress");
    expect(canonicalizeProjectLifecycleStatus("Ongoing")).toBe("In Progress");
    expect(canonicalizeProjectLifecycleStatus("Draft")).toBe("New");
    expect(canonicalizeProjectLifecycleStatus("In Progress")).toBe("In Progress");
    expect(canonicalizeProjectLifecycleStatus("Closed")).toBe("Closed");
    expect(canonicalizeProjectLifecycleStatus(undefined)).toBe("New");
  });

  it("seed projects use canonical lifecycle only after normalize", () => {
    for (const project of seedProjects) {
      const normalized = normalizeProject(project);
      expect(isCanonicalProjectLifecycleStatus(normalized.lifecycleStatus)).toBe(true);
      expect(["Active", "Draft"]).not.toContain(normalized.lifecycleStatus);
    }
  });

  it("normalizeProject migrates unstarted intake legacy Active to New", () => {
    const normalized = normalizeProject({
      id: "P-INTAKE",
      name: "Intake",
      projectType: "Residential",
      projectCategory: "solar",
      lifecycleStatus: "In Progress",
      progressStage: "new",
      executionPhase: "Intake",
      client: "C",
      capacity: "5kW",
      location: "J",
      contractAmount: 1,
      createdAt: "2026-01-01",
    } as unknown as Project);
    expect(normalized.lifecycleStatus).toBe("New");
    expect(normalized.status).toBe("Ongoing");
  });

  it("legacyStatusFromLifecycle mirrors list badge expectations", () => {
    expect(legacyStatusFromLifecycle("In Progress")).toBe("Ongoing");
    expect(legacyStatusFromLifecycle("Completed")).toBe("Completed");
    expect(legacyStatusFromLifecycle("Closed")).toBe("Closed");
  });
});

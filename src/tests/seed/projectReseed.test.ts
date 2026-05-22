import { describe, expect, it } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { buildL0SettingsTeam } from "@/data/seed/L0_settingsTeam";
import { buildL1Catalog } from "@/data/seed/L1_catalog";
import { buildL2Network } from "@/data/seed/L2_network";
import { buildL3Customers } from "@/data/seed/L3_customers";
import { buildL4Hr } from "@/data/seed/L4_hr";
import { buildL8Crm } from "@/data/seed/L8_crm";
import { reseedProjectsViaCommands } from "@/data/seed/projectReseed";
import { PROJECT_KINDS, type ProjectKind } from "@/domain/projectTypes/types";
import { normalizeProject } from "@/lib/projectNormalize";
import { seedIncludesProjects } from "@/data/seed/seedProjectPhase";

function buildPreProjectState(profile: "full" | "smoke" = "smoke") {
  let state = buildEmptyAppState();
  state = buildL0SettingsTeam(state, profile);
  state = buildL1Catalog(state, profile);
  state = buildL2Network(state, profile);
  state = buildL3Customers(state, profile);
  state = buildL4Hr(state, profile);
  state = buildL8Crm(state, profile);
  return state;
}

describe("projectReseed", () => {
  it.skipIf(!seedIncludesProjects())("creates projects for all legacy kinds via command handlers", () => {
    const { state, entries } = reseedProjectsViaCommands(buildPreProjectState("smoke"), "smoke");
    expect(entries.length).toBeGreaterThan(0);
    expect(state.projects.length).toBe(entries.length);

    const kinds = new Set(state.projects.map((p) => p.projectKind).filter(Boolean));
    const expectedKinds: ProjectKind[] = [
      "SOLO_EPC",
      "INC",
      "OUTSOURCED_INC",
      "PARTNER_EPC",
      "FIXED_EPC",
      "VENDOR_NETWORK",
      "VENDORSHIP_ONLY",
      "INC_GIVEN",
    ];
    for (const kind of expectedKinds) {
      expect(kinds.has(kind), `missing kind ${kind}`).toBe(true);
    }
  });

  it.skipIf(!seedIncludesProjects())("every seeded project normalizes without throwing", () => {
    const { state } = reseedProjectsViaCommands(buildPreProjectState("smoke"), "smoke");
    for (const project of state.projects) {
      expect(() => normalizeProject(project)).not.toThrow();
      expect(project.projectKindConfigSnapshot?.visibleTabs?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it.skipIf(!seedIncludesProjects())("SOLO_EPC from quotation links quotation and converts status", () => {
    const { state } = reseedProjectsViaCommands(buildPreProjectState("smoke"), "smoke");
    const solo = state.projects.filter((p) => p.projectKind === "SOLO_EPC" && p.quotationId);
    expect(solo.length).toBeGreaterThan(0);
    for (const project of solo) {
      const q = state.quotations.find((x) => x.id === project.quotationId);
      expect(q?.linkedProjectId).toBe(project.id);
      expect(q?.status).toBe("converted_to_project");
    }
  });

  it.skipIf(!seedIncludesProjects())("direct exception SOLO_EPC has reason and no quotation", () => {
    const { state } = reseedProjectsViaCommands(buildPreProjectState("full"), "full");
    const dex = state.projects.find((p) =>
      p.directCreationReason?.includes("Urgent hospital backup power"),
    );
    expect(dex).toBeTruthy();
    expect(dex?.quotationId).toBeFalsy();
    expect(dex?.projectKind).toBe("SOLO_EPC");
  });

  it("PROJECT_KINDS registry covers all reseed targets", () => {
    for (const kind of [
      "SOLO_EPC",
      "PARTNER_EPC",
      "FIXED_EPC",
      "VENDOR_NETWORK",
      "VENDORSHIP_ONLY",
      "INC_GIVEN",
      "OUTSOURCED_INC",
      "INC",
    ] as const) {
      expect(PROJECT_KINDS).toContain(kind);
    }
  });
});

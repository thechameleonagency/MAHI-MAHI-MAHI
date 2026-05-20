import { describe, expect, it } from "vitest";
import { normalizeProject } from "@/lib/projectNormalize";
import {
  canonicalProjectKind,
  canonicalProjectMode,
  inferProjectKindFromTaxonomy,
  projectMatchesKindFilter,
} from "@/lib/projectTaxonomyDisplay";
import type { Project } from "@/types/project";

const base = (overrides: Partial<Project>): Project =>
  ({
    id: "P1",
    name: "Test",
    projectType: "Residential",
    projectCategory: "solar",
    lifecycleStatus: "New",
    client: "C",
    capacity: "5kW",
    location: "J",
    contractAmount: 100000,
    amountReceived: 0,
    createdAt: "2026-01-01",
    ...overrides,
  }) as Project;

describe("projectTaxonomyDisplay (Mn19)", () => {
  it("infers kind from 3-value taxonomy when projectKind is absent", () => {
    expect(
      inferProjectKindFromTaxonomy({
        projectMode: "PARTNER_NETWORK",
        partnerRole: "fixed_margin",
        vendorshipOwner: "partner",
        executionScope: "full",
      }),
    ).toBe("FIXED_EPC");
    expect(
      inferProjectKindFromTaxonomy({
        projectMode: "DIRECT_CLIENT",
        executionScope: "service_only",
        vendorshipOwner: "MSS",
      }),
    ).toBe("INC");
  });

  it("normalizeProject backfills kind and keeps mode coherent", () => {
    const normalized = normalizeProject(
      base({
        projectMode: "INC_GIVEN_TO_US",
        vendorshipOwner: "none",
        executionScope: "full",
      }),
    );
    expect(normalized.projectKind).toBe("INC_GIVEN");
    expect(normalized.projectMode).toBe("INC_GIVEN_TO_US");
    expect(canonicalProjectKind(normalized)).toBe("INC_GIVEN");
    expect(canonicalProjectMode(normalized)).toBe("INC_GIVEN_TO_US");
  });

  it("projectMatchesKindFilter uses canonical kind (not projectMode alone)", () => {
    const solo = base({ projectKind: "SOLO_EPC", projectMode: "DIRECT_CLIENT" });
    const fixed = base({
      projectKind: "FIXED_EPC",
      projectMode: "PARTNER_NETWORK",
      partnerRole: "fixed_margin",
      vendorshipOwner: "partner",
    });
    expect(projectMatchesKindFilter(solo, "SOLO_EPC")).toBe(true);
    expect(projectMatchesKindFilter(solo, "FIXED_EPC")).toBe(false);
    expect(projectMatchesKindFilter(fixed, "FIXED_EPC")).toBe(true);
    expect(projectMatchesKindFilter(fixed, "PARTNER_EPC")).toBe(false);
    expect(projectMatchesKindFilter(solo, "DIRECT_CLIENT")).toBe(false);
  });
});

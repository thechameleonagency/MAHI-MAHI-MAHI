import { describe, expect, it } from "vitest";
import { seedProjects } from "@/data/seedData";
import { dummyProjects } from "@/data/dummyData";
import { normalizeProject } from "@/lib/projectNormalize";
import { resolveProjectCapabilities } from "@/domain/projectTypes/config";
import { LEGACY_KIND_TO_TYPE } from "@/domain/projectTypes/types";

/**
 * Per-project smoke test: load every project from seed and dummy data, normalize it, resolve
 * its capabilities, and assert the snapshot is coherent. If any single project crashes here,
 * its detail page will also crash in the browser because both paths share `getProjectById`'s
 * normalize step.
 */
describe("Every seed/dummy project normalizes + resolves cleanly", () => {
  const everyProject = [...seedProjects, ...dummyProjects];

  it.each(everyProject.map((p) => [p.id, p]))(
    "%s normalizes without throwing",
    (_id, project) => {
      const normalized = normalizeProject(project);

      // Required header fields the ProjectDetail page reads must be present after normalize.
      expect(normalized.id).toBe(project.id);
      expect(normalized.name).toBeTruthy();
      expect(normalized.client).toBeTruthy();
      expect(normalized.capacity).toBeTruthy();
      expect(normalized.projectCategory).toBe("solar");
      expect(typeof normalized.contractAmount).toBe("number");
      expect(Array.isArray(normalized.executionLineItems)).toBe(true);

      // After normalize, the new taxonomy fields must be filled.
      expect(normalized.projectMode).toBeDefined();
      expect(normalized.vendorshipOwner).toBeDefined();
      expect(normalized.executionScope).toBeDefined();

      // The (now resolver-driven) snapshot must exist.
      const snap = normalized.projectKindConfigSnapshot;
      expect(snap).toBeDefined();
      expect(Array.isArray(snap?.visibleTabs)).toBe(true);
      expect(snap!.visibleTabs.length).toBeGreaterThan(0);
      expect(Array.isArray(snap?.requiredDocuments)).toBe(true);
      expect(Array.isArray(snap?.forbiddenActions)).toBe(true);
      expect(Array.isArray(snap?.allowedBillingDirections)).toBe(true);

      // Resolver should match the snapshot (sanity check — they're computed from the same inputs).
      const resolved = resolveProjectCapabilities({
        projectMode: normalized.projectMode!,
        vendorshipOwner: normalized.vendorshipOwner!,
        partnerRole: normalized.partnerRole,
        executionScope: normalized.executionScope!,
        outsource: normalized.outsource ?? null,
      });
      expect(snap!.visibleTabs).toEqual(resolved.visibleTabs);
      expect(snap!.allowedBillingDirections).toEqual(resolved.allowedBillingDirections);
    },
  );

  it("every legacy projectKind has a LEGACY_KIND_TO_TYPE entry", () => {
    const kinds = new Set(everyProject.map((p) => p.projectKind).filter(Boolean) as string[]);
    for (const kind of kinds) {
      expect(LEGACY_KIND_TO_TYPE[kind as keyof typeof LEGACY_KIND_TO_TYPE]).toBeDefined();
    }
  });
});

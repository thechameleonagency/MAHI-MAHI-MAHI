import { describe, expect, it } from "vitest";
import { normalizeSiteReadinessMarkedBy } from "@/lib/siteReadinessNormalize";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

describe("site readiness markedBy", () => {
  it("normalizeSiteReadinessMarkedBy maps legacy 0 to unknown", () => {
    expect(normalizeSiteReadinessMarkedBy(0)).toBe("unknown");
    expect(normalizeSiteReadinessMarkedBy("actor-management")).toBe("actor-management");
  });

  it("normalizeProject coerces persisted numeric markedBy on hydrate", () => {
    const p = {
      id: "P1",
      name: "Test",
      projectKind: "SOLO_EPC",
      siteReadiness: {
        ready: true,
        markedAt: "2026-01-01",
        markedBy: 0 as unknown as string,
      },
    } as Project;
    const normalized = normalizeProject(p);
    expect(normalized.siteReadiness?.markedBy).toBe("unknown");
  });
});

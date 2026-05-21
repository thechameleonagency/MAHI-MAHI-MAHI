import { describe, expect, it } from "vitest";
import {
  buildSiteReadinessUpdate,
  normalizeSiteReadinessMarkedBy,
} from "@/lib/siteReadinessNormalize";
import { migratePersistedState } from "@/lib/migratePersistedIds";
import { normalizeProject } from "@/lib/projectNormalize";
import { formatSessionActorLabel } from "@/lib/sessionActorStorage";
import type { Project } from "@/types/project";

describe("site readiness markedBy", () => {
  it("normalizeSiteReadinessMarkedBy maps legacy 0 and EMP000 to unknown", () => {
    expect(normalizeSiteReadinessMarkedBy(0)).toBe("unknown");
    expect(normalizeSiteReadinessMarkedBy("EMP000")).toBe("unknown");
    expect(normalizeSiteReadinessMarkedBy("actor-management")).toBe("actor-management");
    expect(normalizeSiteReadinessMarkedBy("user-jitesh-k")).toBe("user-jitesh-k");
  });

  it("buildSiteReadinessUpdate never writes numeric placeholder", () => {
    const snap = buildSiteReadinessUpdate({
      ready: true,
      note: " Roof clear ",
      markedBy: "user-demo-admin",
    });
    expect(snap.markedBy).toBe("user-demo-admin");
    expect(snap.note).toBe("Roof clear");
    expect(snap.markedAt).toBeTruthy();
  });

  it("migratePersistedState does not map siteReadiness.markedBy to EMP ids", () => {
    const migrated = migratePersistedState({
      projects: [
        {
          id: 1,
          siteReadiness: { ready: true, markedAt: "2026-01-01", markedBy: 0 },
        },
      ],
    }) as { projects: { siteReadiness: { markedBy: string } }[] };
    expect(migrated.projects[0].siteReadiness.markedBy).toBe("unknown");
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

  it("formatSessionActorLabel renders actor and user ids for UI", () => {
    expect(formatSessionActorLabel("unknown")).toBe("Unknown user");
    expect(formatSessionActorLabel("derived-site-checklist")).toBe("Site checklist (auto)");
    expect(formatSessionActorLabel("actor-salesperson")).toBe("Salesperson");
    expect(formatSessionActorLabel("user-jitesh-k")).toBe("Jitesh K");
  });
});

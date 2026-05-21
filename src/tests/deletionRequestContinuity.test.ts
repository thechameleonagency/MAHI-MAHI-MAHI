import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  collectRelatedEntitiesForDeletion,
  findStaleDeletionRequests,
  reconcileDeletionRequests,
} from "@/lib/deletionRequestContinuity";

describe("deletionRequestContinuity (ER7)", () => {
  it("hydrated full seed has no stale deletion requests", () => {
    const { state } = buildBusinessSeed("full");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect((hydrated.deletionRequests ?? []).length).toBeGreaterThan(0);
    const stale = findStaleDeletionRequests(hydrated);
    expect(stale, stale.map((s) => s.reason).join("; ")).toEqual([]);
  });

  it("collectRelatedEntitiesForDeletion links quotation to enquiry when present", () => {
    const { state } = buildBusinessSeed("smoke");
    const q = state.quotations.find((x) => x.status === "sent");
    expect(q).toBeTruthy();
    const related = collectRelatedEntitiesForDeletion(state, "quotation", q!.id);
    expect(related.length).toBeGreaterThan(0);
  });

  it("reconcileDeletionRequests refreshes entityName from live rows", () => {
    const { state } = buildBusinessSeed("smoke");
    const q = state.quotations[0];
    const broken = {
      ...state,
      deletionRequests: [
        {
          id: "DR-test",
          entityType: "quotation" as const,
          entityId: q.id,
          entityName: "WRONG-NAME",
          reason: "test",
          requestedBy: "Admin",
          requestedAt: "2026-05-01",
          status: "pending" as const,
          relatedEntities: [],
        },
      ],
    };
    const fixed = reconcileDeletionRequests(broken);
    const row = fixed.deletionRequests.find((r) => r.id === "DR-test");
    expect(row?.entityName).toBe(q.quotationNumber ?? q.id);
    expect((row?.relatedEntities.length ?? 0)).toBeGreaterThanOrEqual(0);
    expect(findStaleDeletionRequests(fixed)).toEqual([]);
  });
});

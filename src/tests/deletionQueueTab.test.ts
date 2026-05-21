import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applySeedHydrationPipeline } from "@/data/seed/seedHydration";
import { validateDeletionRequestApproval } from "@/lib/deletionRequestResolution";
import { canFeature } from "@/domain/policies/featurePermissions";

describe("deletion queue (PR2)", () => {
  it("settingsDeletionQueue is viewable by admin/management/ceo and editable by admin", () => {
    expect(canFeature("admin", "settingsDeletionQueue", "view")).toBe(true);
    expect(canFeature("management", "settingsDeletionQueue", "view")).toBe(true);
    expect(canFeature("ceo", "settingsDeletionQueue", "view")).toBe(true);
    expect(canFeature("admin", "settingsDeletionQueue", "edit")).toBe(true);
    expect(canFeature("management", "settingsDeletionQueue", "edit")).toBe(false);
    expect(canFeature("salesperson", "settingsDeletionQueue", "view")).toBe(false);
  });

  it("seed includes a pending deletion request that passes approval gates", () => {
    const { state } = buildBusinessSeed("full");
    const hydrated = applySeedHydrationPipeline(state);
    const pending = (hydrated.deletionRequests ?? []).find((r) => r.status === "pending");
    expect(pending).toBeDefined();
    const gate = validateDeletionRequestApproval(hydrated, pending!);
    expect(gate.ok, gate.ok ? "" : (gate as { error: string }).error).toBe(true);
  });

  it("business alerts link deletion requests to Settings queue", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/businessAlerts.ts"), "utf8");
    expect(source).toContain('href = "/settings?tab=deletion-queue"');
  });

  it("Settings exposes Deletion queue tab and panel", () => {
    const settings = readFileSync(resolve(process.cwd(), "src/pages/Settings.tsx"), "utf8");
    expect(settings).toContain("DeletionQueueTab");
    expect(settings).toContain('value="deletion-queue"');
    expect(settings).toContain("settingsDeletionQueue");
  });

  it("AppDataContext wires approve and reject handlers", () => {
    const ctx = readFileSync(resolve(process.cwd(), "src/contexts/AppDataContext.tsx"), "utf8");
    expect(ctx).toContain("approveDeletionRequest");
    expect(ctx).toContain("rejectDeletionRequest");
    expect(ctx).toContain("validateDeletionRequestApproval");
  });
});

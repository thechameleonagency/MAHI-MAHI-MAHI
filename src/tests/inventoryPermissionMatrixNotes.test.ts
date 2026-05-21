import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURE_MATRIX_ROW_NOTES } from "@/domain/policies/featurePermissions";
import { canFeature } from "@/domain/policies/featurePermissions";

describe("inventoryItem vs inventoryMovement matrix (Mn8)", () => {
  it("documents the split in FEATURE_MATRIX_ROW_NOTES", () => {
    expect(FEATURE_MATRIX_ROW_NOTES.inventoryItem).toMatch(/inventoryMovement/i);
    expect(FEATURE_MATRIX_ROW_NOTES.inventoryMovement).toMatch(/inventoryItem|catalog/i);
  });

  it("installation_team: view catalog, mutate stock via inventoryMovement only", () => {
    expect(canFeature("installation_team", "inventoryItem", "view")).toBe(true);
    expect(canFeature("installation_team", "inventoryItem", "create")).toBe(false);
    expect(canFeature("installation_team", "inventoryItem", "edit")).toBe(false);
    expect(canFeature("installation_team", "inventoryMovement", "create")).toBe(true);
    expect(canFeature("installation_team", "inventoryMovement", "delete")).toBe(true);
    expect(canFeature("installation_team", "toolMovement", "delete")).toBe(true);
  });

  it("featurePermissions source comments link inventoryItem to inventoryMovement", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/domain/policies/featurePermissions.ts"),
      "utf8",
    );
    expect(source).toMatch(/inventoryItem[\s\S]*inventoryMovement/);
    expect(source).toContain("stock changes are gated under inventoryMovement");
  });
});

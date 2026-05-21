import { describe, expect, it } from "vitest";
import { canFeature, DEFAULT_FEATURE_PERMISSIONS } from "@/domain/policies/featurePermissions";
import {
  canReverseInventoryMovement,
  canReverseToolMovement,
} from "@/lib/inventoryMovementReversalPolicy";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";

describe("inventoryMovementReversalPolicy (E4)", () => {
  it("admin and installation_team can reverse via matrix delete column", () => {
    expect(canFeature("admin", "inventoryMovement", "delete")).toBe(true);
    expect(canFeature("installation_team", "inventoryMovement", "delete")).toBe(true);
    expect(canFeature("admin", "toolMovement", "delete")).toBe(true);
    expect(canFeature("installation_team", "toolMovement", "delete")).toBe(true);
    expect(canReverseInventoryMovement("admin")).toBe(true);
    expect(canReverseInventoryMovement("installation_team")).toBe(true);
    expect(canReverseToolMovement("admin")).toBe(true);
    expect(canReverseToolMovement("installation_team")).toBe(true);
  });

  it("super_admin always allowed; field roles without delete cannot reverse", () => {
    expect(canReverseInventoryMovement("super_admin")).toBe(true);
    expect(canReverseToolMovement("super_admin")).toBe(true);
    expect(canReverseInventoryMovement("salesperson")).toBe(false);
    expect(canReverseInventoryMovement("management")).toBe(false);
    expect(canReverseInventoryMovement("ceo")).toBe(false);
    expect(canReverseToolMovement("salesperson")).toBe(false);
  });

  it("honors role-matrix override for reversal", () => {
    const override = structuredClone(DEFAULT_FEATURE_PERMISSIONS);
    override.inventoryMovement = {
      ...override.inventoryMovement,
      delete: ["salesperson"],
    };
    expect(canReverseInventoryMovement("salesperson", override)).toBe(true);
    expect(canReverseInventoryMovement("admin", override)).toBe(false);
  });

  it("maps forbidden error codes to friendly toast copy", () => {
    expect(friendlyCommandErrorMessage("INVENTORY_MOVEMENT_REVERSE_FORBIDDEN")).toMatch(
      /cannot reverse inventory/i,
    );
    expect(friendlyCommandErrorMessage("TOOL_MOVEMENT_REVERSE_FORBIDDEN")).toMatch(
      /cannot reverse tool/i,
    );
  });
});

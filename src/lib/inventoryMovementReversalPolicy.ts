/**
 * E4 — Inventory / tool movement reversal
 *
 * Reversal is not a physical delete: it sets `reversedAt` on the ledger row and
 * adjusts stock (materials) or tool status. Permission uses the feature matrix
 * **delete** column on `inventoryMovement` / `toolMovement`.
 *
 * Audit "warehouse" maps to `installation_team` (field stock role).
 */
import {
  canFeature,
  type FeaturePermissionMatrix,
} from "@/domain/policies/featurePermissions";
import type { UserRole } from "@/domain/entities/identity";

export function canReverseInventoryMovement(
  role: UserRole,
  matrixOverride?: FeaturePermissionMatrix | null,
): boolean {
  return canFeature(role, "inventoryMovement", "delete", matrixOverride);
}

export function canReverseToolMovement(
  role: UserRole,
  matrixOverride?: FeaturePermissionMatrix | null,
): boolean {
  return canFeature(role, "toolMovement", "delete", matrixOverride);
}

export const INVENTORY_MOVEMENT_REVERSE_FORBIDDEN =
  "Your role cannot reverse inventory movements.";
export const TOOL_MOVEMENT_REVERSE_FORBIDDEN =
  "Your role cannot reverse tool movements.";

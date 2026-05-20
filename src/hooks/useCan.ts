import { useAppSession } from "@/app/providers/AppSessionProvider";
import { canFeature, type Crud, type Feature } from "@/domain/policies/featurePermissions";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";

/**
 * Returns true when the current actor role is allowed `crud` on `feature`.
 *
 * Honors any saved role-matrix override (from `RoleMatrixContext`); falls back to
 * `DEFAULT_FEATURE_PERMISSIONS`. `super_admin` always returns true.
 *
 * Usage:
 * ```tsx
 * const canDelete = useCan("invoice", "delete");
 * {canDelete && <Button variant="destructive">Delete</Button>}
 * ```
 */
export function useCan(feature: Feature, crud: Crud = "view"): boolean {
  const { currentRole } = useAppSession();
  const override = useRoleMatrixOverride();
  return canFeature(currentRole, feature, crud, override);
}

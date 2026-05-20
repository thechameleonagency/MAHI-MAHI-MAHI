import { useMemo } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { canFeature, type Feature } from "@/domain/policies/featurePermissions";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";

/**
 * Returns four callable predicates for a single feature, all bound to the
 * current actor role + active matrix override.
 *
 * Usage:
 * ```tsx
 * const { canView, canCreate, canEdit, canDelete } = useRoleVisibility();
 * if (!canView("invoice")) return <Forbidden />;
 * ```
 */
export function useRoleVisibility() {
  const { currentRole } = useAppSession();
  const override = useRoleMatrixOverride();

  return useMemo(
    () => ({
      canView: (f: Feature) => canFeature(currentRole, f, "view", override),
      canCreate: (f: Feature) => canFeature(currentRole, f, "create", override),
      canEdit: (f: Feature) => canFeature(currentRole, f, "edit", override),
      canDelete: (f: Feature) => canFeature(currentRole, f, "delete", override),
    }),
    [currentRole, override],
  );
}

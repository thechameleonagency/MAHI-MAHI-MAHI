import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";
import type { AppAction } from "@/domain/policies/permissionMatrix";

/** `canDo` for UI: honors saved role-matrix overrides (same as `AppDataContext.canDo`). */
export function useCanAction(action: AppAction): boolean {
  const { currentRole } = useAppSession();
  const { permissionService } = useFoundation();
  const override = useRoleMatrixOverride();
  return permissionService.canPerformAction(currentRole, action, override);
}

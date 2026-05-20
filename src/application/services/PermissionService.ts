import type { UserRole } from "@/domain/entities/identity";
import type { FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";
import { canAccessPath, canPerformAction, type AppAction } from "@/domain/policies/permissionMatrix";

export class PermissionService {
  canAccessPath(
    role: UserRole,
    path: string,
    override?: Partial<FeaturePermissionMatrix>,
  ): boolean {
    return canAccessPath(role, path, override);
  }

  canPerformAction(
    role: UserRole,
    action: AppAction,
    override?: Partial<FeaturePermissionMatrix>,
  ): boolean {
    return canPerformAction(role, action, override);
  }

  assertCanPerformAction(
    role: UserRole,
    action: AppAction,
    override?: Partial<FeaturePermissionMatrix>,
  ): void {
    if (!canPerformAction(role, action, override)) {
      throw new Error(`Permission denied for action ${action} and role ${role}`);
    }
  }
}

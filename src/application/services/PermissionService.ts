import type { UserRole } from "@/domain/entities/identity";
import { canAccessPath, canPerformAction, type AppAction } from "@/domain/policies/permissionMatrix";

export class PermissionService {
  canAccessPath(role: UserRole, path: string): boolean {
    return canAccessPath(role, path);
  }

  canPerformAction(role: UserRole, action: AppAction): boolean {
    return canPerformAction(role, action);
  }

  assertCanPerformAction(role: UserRole, action: AppAction): void {
    if (!canPerformAction(role, action)) {
      throw new Error(`Permission denied for action ${action} and role ${role}`);
    }
  }
}

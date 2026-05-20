import type { Command } from "@/application/commands/types";
import type { PermissionService } from "@/application/services/PermissionService";
import type { AppAction } from "@/domain/policies/permissionMatrix";

/** Assert action permission honoring optional role-matrix override on the command. */
export function assertCommandPermission(
  permissionService: PermissionService,
  command: Command,
  action: AppAction,
): void {
  permissionService.assertCanPerformAction(command.actorRole, action, command.matrixOverride);
}

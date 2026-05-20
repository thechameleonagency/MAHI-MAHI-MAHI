import { ROLE_LABELS, type UserRole } from "@/domain/entities/identity";

/** Set by TopHeader before `setCurrentRole` when the current page is denied for the new role. */
let pendingRouteDeniedOnRoleSwitch = false;

export function markRoleSwitchRouteDenied(): void {
  pendingRouteDeniedOnRoleSwitch = true;
}

export function consumeRoleSwitchRouteDenied(): boolean {
  const denied = pendingRouteDeniedOnRoleSwitch;
  pendingRouteDeniedOnRoleSwitch = false;
  return denied;
}

export function roleSwitchToastDescription(removedPinCount: number, role: UserRole): string {
  if (removedPinCount > 0) {
    return `${removedPinCount} pinned link(s) removed for ${ROLE_LABELS[role]}. Navigation now follows that role's permissions.`;
  }
  return `Navigation and actions now follow ${ROLE_LABELS[role]} permissions.`;
}

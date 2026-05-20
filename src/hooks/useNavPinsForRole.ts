import { useEffect, useRef } from "react";
import { type UserRole } from "@/domain/entities/identity";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";
import { prunePinnedPathsForRole } from "@/lib/navPins";
import {
  consumeRoleSwitchRouteDenied,
  roleSwitchToastDescription,
} from "@/lib/roleSwitchToast";
import { toast } from "@/hooks/use-toast";

/**
 * Single place that prunes nav pins when the demo role changes (Mn3).
 * Role-switch feedback toasts live here (Mn10) — not in TopHeader.
 */
export function useNavPinsForRole(onPinsRefreshed: () => void): void {
  const { currentRole } = useAppSession();
  const { permissionService } = useFoundation();
  const roleMatrixOverride = useRoleMatrixOverride();
  const prevRoleRef = useRef<UserRole | null>(null);

  useEffect(() => {
    const canAccess = (path: string) =>
      permissionService.canAccessPath(currentRole, path, roleMatrixOverride);
    const removed = prunePinnedPathsForRole(canAccess);
    onPinsRefreshed();

    const prev = prevRoleRef.current;
    prevRoleRef.current = currentRole;

    if (prev === null || prev === currentRole) return;
    if (consumeRoleSwitchRouteDenied()) return;

    toast({
      title: "Role updated",
      description: roleSwitchToastDescription(removed.length, currentRole),
    });
  }, [currentRole, permissionService, roleMatrixOverride, onPinsRefreshed]);
}

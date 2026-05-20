import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";
import { isRegisteredAppRoute } from "@/lib/appRouteRegistry";
import { routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";
import { toast } from "@/hooks/use-toast";

function useRouteAccessDecision() {
  const location = useLocation();
  const { permissionService } = useFoundation();
  const { currentRole } = useAppSession();
  const roleMatrixOverride = useRoleMatrixOverride();

  const isRegistered = isRegisteredAppRoute(location.pathname);
  const canAccess =
    !isRegistered ||
    permissionService.canAccessPath(currentRole, location.pathname, roleMatrixOverride);

  return { canAccess, isRegistered, pathname: location.pathname, currentRole };
}

/** Redirects denied roles away from registered routes with an explanatory toast (M6). */
const RouteAccessGate = () => {
  const navigate = useNavigate();
  const { canAccess, isRegistered, pathname, currentRole } = useRouteAccessDecision();
  const lastDenialNotified = useRef<string | null>(null);

  useEffect(() => {
    if (!isRegistered || canAccess) {
      lastDenialNotified.current = null;
      return;
    }

    const denialKey = `${pathname}:${currentRole}`;
    if (lastDenialNotified.current !== denialKey) {
      lastDenialNotified.current = denialKey;
      const { title, description } = routeAccessDeniedToastContent(pathname, currentRole);
      toast({ title, description, variant: "destructive" });
    }

    navigate("/", { replace: true, state: { routeAccessDeniedPath: pathname } });
  }, [canAccess, currentRole, isRegistered, navigate, pathname]);

  return null;
};

/** Suppresses page content until route access is confirmed (MD3 — no flash). */
export const RouteAccessBoundary = ({ children }: { children: ReactNode }) => {
  const { canAccess, isRegistered } = useRouteAccessDecision();

  if (isRegistered && !canAccess) {
    return null;
  }

  return <>{children}</>;
};

export default RouteAccessGate;

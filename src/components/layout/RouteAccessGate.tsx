import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { isRegisteredAppRoute } from "@/lib/appRouteRegistry";

function useRouteAccessDecision() {
  const location = useLocation();
  const { permissionService } = useFoundation();
  const { currentRole } = useAppSession();

  const isRegistered = isRegisteredAppRoute(location.pathname);
  const canAccess =
    !isRegistered || permissionService.canAccessPath(currentRole, location.pathname);

  return { canAccess, isRegistered, pathname: location.pathname, currentRole };
}

/** Redirects denied roles away from registered routes (no toast — see M28). */
const RouteAccessGate = () => {
  const navigate = useNavigate();
  const { permissionService } = useFoundation();
  const { canAccess, isRegistered, pathname, currentRole } = useRouteAccessDecision();

  useEffect(() => {
    if (!isRegistered || canAccess) return;
    navigate("/", { replace: true });
  }, [canAccess, currentRole, isRegistered, navigate, pathname, permissionService]);

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

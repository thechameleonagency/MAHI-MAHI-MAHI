import { useEffect, useRef, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useRoleMatrixOverride } from "@/contexts/RoleMatrixContext";
import { isRegisteredAppRoute } from "@/lib/appRouteRegistry";
import { routeAccessDeniedToastContent, routeAccessRedirectCopy } from "@/lib/routeAccessDenied";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserRole } from "@/domain/entities/identity";
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

/** Shown while a denied registered route redirects to home (Md4 — avoids blank main canvas). */
export function RouteAccessRedirectPlaceholder({
  deniedPath,
  role,
}: {
  deniedPath: string;
  role: UserRole;
}) {
  const copy = routeAccessRedirectCopy(deniedPath, role);
  return (
    <div
      className="ds-page flex min-h-[40vh] flex-col items-center justify-center gap-6 px-4 py-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{copy.title}</p>
          <p className="text-xs text-muted-foreground">{copy.description}</p>
        </div>
      </div>
      <div className="w-full max-w-lg space-y-3 opacity-50" aria-hidden>
        <Skeleton className="h-9 w-2/3 rounded-md" />
        <Skeleton className="h-20 w-full rounded-xl border border-border/40" />
        <Skeleton className="h-28 w-full rounded-xl border border-border/40" />
      </div>
    </div>
  );
}

/** Suppresses page content until route access is confirmed; shows redirect UI when denied (Md4). */
export const RouteAccessBoundary = ({ children }: { children: ReactNode }) => {
  const { canAccess, isRegistered, pathname, currentRole } = useRouteAccessDecision();

  if (isRegistered && !canAccess) {
    return (
      <RouteAccessRedirectPlaceholder deniedPath={pathname} role={currentRole} />
    );
  }

  return <>{children}</>;
};

export default RouteAccessGate;

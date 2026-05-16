import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFoundation } from "@/app/providers/FoundationProvider";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { toast } from "@/hooks/use-toast";
import { isRegisteredAppRoute } from "@/lib/appRouteRegistry";

const RouteAccessGate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissionService } = useFoundation();
  const { currentRole } = useAppSession();

  useEffect(() => {
    if (!isRegisteredAppRoute(location.pathname)) {
      return;
    }

    const canAccess = permissionService.canAccessPath(currentRole, location.pathname);
    if (!canAccess) {
      toast({
        title: "Access Restricted",
        description: `Role ${currentRole} cannot access ${location.pathname}`,
        variant: "destructive",
      });
      navigate("/", { replace: true });
    }
  }, [currentRole, location.pathname, navigate, permissionService]);

  return null;
};

export default RouteAccessGate;

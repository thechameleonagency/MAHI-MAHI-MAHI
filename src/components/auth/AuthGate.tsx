import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSession } from "@/app/providers/AppSessionProvider";

type AuthGateProps = {
  children: ReactNode;
};

/** Redirect unauthenticated users to login; preserve intended path. */
export function AuthGate({ children }: AuthGateProps) {
  const { isAuthenticated } = useAppSession();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}

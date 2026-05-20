import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { type UserRole } from "@/domain/entities/identity";
import {
  buildSessionUserId,
  loadStoredDemoUserName,
  loadStoredSessionRole,
  persistDemoUserName,
  persistSessionRole,
} from "@/lib/sessionActorStorage";

type AppSessionContextType = {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  /** Free-text demo user label (persisted); distinguishes actors sharing a role. */
  demoUserName: string;
  setDemoUserName: (name: string) => void;
  /** Stable actor id for audit/command attribution. */
  sessionUserId: string;
};

const AppSessionContext = createContext<AppSessionContextType | undefined>(undefined);

export const AppSessionProvider = ({ children }: { children: ReactNode }) => {
  const [currentRole, setCurrentRoleState] = useState<UserRole>(loadStoredSessionRole);
  const [demoUserName, setDemoUserNameState] = useState(loadStoredDemoUserName);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
    persistSessionRole(role);
  }, []);

  const setDemoUserName = useCallback((name: string) => {
    setDemoUserNameState(name);
    persistDemoUserName(name);
  }, []);

  const sessionUserId = useMemo(
    () => buildSessionUserId(demoUserName, currentRole),
    [demoUserName, currentRole],
  );

  const value = useMemo(
    () => ({
      currentRole,
      setCurrentRole,
      demoUserName,
      setDemoUserName,
      sessionUserId,
    }),
    [currentRole, setCurrentRole, demoUserName, setDemoUserName, sessionUserId],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
};

export const useAppSession = () => {
  const context = useContext(AppSessionContext);
  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return context;
};

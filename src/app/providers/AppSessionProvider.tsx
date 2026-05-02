import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UserRole } from "@/domain/entities/identity";

type AppSessionContextType = {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
};

const AppSessionContext = createContext<AppSessionContextType | undefined>(undefined);

export const AppSessionProvider = ({ children }: { children: ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>("admin");

  const value = useMemo(
    () => ({
      currentRole,
      setCurrentRole,
    }),
    [currentRole],
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type UserRole } from "@/domain/entities/identity";
import { DEMO_LOGIN_USERS, DEMO_PASSWORD, findDemoUserByEmail } from "@/domain/demoCredentials";
import type { SettingsTeamMember } from "@/types/project";
import {
  buildSessionUserId,
  clearAuthenticatedSession,
  isSessionAuthenticated,
  loadStoredDemoUserName,
  loadStoredEmail,
  loadStoredMemberId,
  loadStoredSessionRole,
  persistAuthenticatedSession,
  persistSessionRole,
  persistDemoUserName,
  validateLoginPassword,
  type AuthenticatedSession,
} from "@/lib/sessionActorStorage";
import { normalizeTeamMemberStatus } from "@/lib/seedSessionBootstrap";
import { DATA_ENGINE_SESSION_SYNC_EVENT } from "@/lib/data-engine/ensureDataEngineSession";

export type LoginResult = { ok: true } | { ok: false; error: string };

type AppSessionContextType = {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  demoUserName: string;
  setDemoUserName: (name: string) => void;
  sessionUserId: string;
  memberId: string;
  email: string;
  isAuthenticated: boolean;
  login: (email: string, password: string, teamMembers?: SettingsTeamMember[]) => LoginResult;
  loginAsDemoUser: (memberId: string) => LoginResult;
  logout: () => void;
};

const AppSessionContext = createContext<AppSessionContextType | undefined>(undefined);

export const AppSessionProvider = ({ children }: { children: ReactNode }) => {
  const [authenticated, setAuthenticated] = useState(isSessionAuthenticated);
  const [currentRole, setCurrentRoleState] = useState<UserRole>(loadStoredSessionRole);
  const [demoUserName, setDemoUserNameState] = useState(loadStoredDemoUserName);
  const [memberId, setMemberId] = useState(loadStoredMemberId);
  const [email, setEmail] = useState(loadStoredEmail);

  const syncSessionFromStorage = useCallback(() => {
    if (!isSessionAuthenticated()) return;
    setAuthenticated(true);
    setCurrentRoleState(loadStoredSessionRole());
    setDemoUserNameState(loadStoredDemoUserName());
    setMemberId(loadStoredMemberId());
    setEmail(loadStoredEmail());
  }, []);

  useEffect(() => {
    syncSessionFromStorage();
    const onSync = () => syncSessionFromStorage();
    window.addEventListener(DATA_ENGINE_SESSION_SYNC_EVENT, onSync);
    return () => window.removeEventListener(DATA_ENGINE_SESSION_SYNC_EVENT, onSync);
  }, [syncSessionFromStorage]);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
    persistSessionRole(role);
  }, []);

  const setDemoUserName = useCallback((name: string) => {
    setDemoUserNameState(name);
    persistDemoUserName(name);
  }, []);

  const applySession = useCallback((session: AuthenticatedSession) => {
    persistAuthenticatedSession(session);
    setAuthenticated(true);
    setMemberId(session.memberId);
    setEmail(session.email);
    setCurrentRoleState(session.role);
    setDemoUserNameState(session.displayName);
  }, []);

  const loginAsDemoUser = useCallback((targetMemberId: string): LoginResult => {
    const demo = DEMO_LOGIN_USERS.find((u) => u.memberId === targetMemberId);
    if (!demo) return { ok: false, error: "Unknown demo user." };
    applySession({
      memberId: demo.memberId,
      email: demo.email,
      role: demo.role,
      displayName: demo.name,
    });
    return { ok: true };
  }, [applySession]);

  const login = useCallback(
    (rawEmail: string, password: string, teamMembers?: SettingsTeamMember[]): LoginResult => {
      const normalizedEmail = rawEmail.trim().toLowerCase();
      if (!normalizedEmail || !password) {
        return { ok: false, error: "Email and password are required." };
      }

      const demo = findDemoUserByEmail(normalizedEmail);
      if (demo && validateLoginPassword(normalizedEmail, password, DEMO_PASSWORD)) {
        if (teamMembers?.length) {
          const row = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
          if (row && normalizeTeamMemberStatus(row.status) !== "Active") {
            return { ok: false, error: "This account is not active yet. Complete your invitation first." };
          }
        }
        applySession({
          memberId: demo.memberId,
          email: demo.email,
          role: demo.role,
          displayName: demo.name,
        });
        return { ok: true };
      }

      if (teamMembers?.length) {
        const member = teamMembers.find((m) => m.email.toLowerCase() === normalizedEmail);
        if (member && normalizeTeamMemberStatus(member.status) === "Active") {
          if (validateLoginPassword(normalizedEmail, password, DEMO_PASSWORD)) {
            applySession({
              memberId: String(member.id),
              email: member.email,
              role: member.role as UserRole,
              displayName: member.name,
            });
            return { ok: true };
          }
        }
      }

      return { ok: false, error: "Invalid email or password." };
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearAuthenticatedSession();
    setAuthenticated(false);
    setMemberId("");
    setEmail("");
    setDemoUserNameState("");
    setCurrentRoleState(loadStoredSessionRole());
  }, []);

  const sessionUserId = useMemo(
    () => buildSessionUserId(demoUserName, currentRole, authenticated ? memberId : undefined),
    [demoUserName, currentRole, memberId, authenticated],
  );

  const value = useMemo(
    () => ({
      currentRole,
      setCurrentRole,
      demoUserName,
      setDemoUserName,
      sessionUserId,
      memberId,
      email,
      isAuthenticated: authenticated,
      login,
      loginAsDemoUser,
      logout,
    }),
    [
      currentRole,
      setCurrentRole,
      demoUserName,
      setDemoUserName,
      sessionUserId,
      memberId,
      email,
      authenticated,
      login,
      loginAsDemoUser,
      logout,
    ],
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

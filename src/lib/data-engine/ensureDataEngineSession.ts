import { SUPER_ADMIN_MEMBER_ID } from "@/domain/demoCredentials";
import type { UserRole } from "@/domain/entities/identity";
import {
  isSessionAuthenticated,
  loadStoredSessionRole,
  persistAuthenticatedSession,
} from "@/lib/sessionActorStorage";

export const DATA_ENGINE_SESSION_SYNC_EVENT = "mss-session-sync";

/** Data engine mutations require super_admin — bootstrap session if missing or wrong role. */
export function ensureDataEngineActorSession(): UserRole {
  const role = loadStoredSessionRole();
  if (isSessionAuthenticated() && role === "super_admin") {
    return role;
  }

  persistAuthenticatedSession({
    memberId: SUPER_ADMIN_MEMBER_ID,
    email: "rajesh.kulkarni@mss.solar",
    role: "super_admin",
    displayName: "Rajesh Kulkarni",
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_ENGINE_SESSION_SYNC_EVENT));
  }

  return "super_admin";
}

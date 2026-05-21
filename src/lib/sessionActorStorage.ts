import { DEMO_DEFAULT_SESSION_ROLE, ROLE_LABELS, USER_ROLES, type UserRole } from "@/domain/entities/identity";
import { normalizeSiteReadinessMarkedBy } from "@/lib/siteReadinessNormalize";

export const SESSION_ROLE_STORAGE_KEY = "mahi_demo_session_role";
export const SESSION_USER_NAME_STORAGE_KEY = "mahi_demo_session_user_name";

/** Build stable actor id from demo display name; falls back to role-based id when empty. */
export function buildSessionUserId(demoUserName: string, role: UserRole): string {
  const trimmed = demoUserName.trim();
  if (!trimmed) {
    return `actor-${role}`;
  }
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `user-${slug}` : `actor-${role}`;
}

export function loadStoredSessionRole(): UserRole {
  try {
    const raw = localStorage.getItem(SESSION_ROLE_STORAGE_KEY);
    if (raw && (USER_ROLES as readonly string[]).includes(raw)) {
      return raw as UserRole;
    }
  } catch {
    /* private mode / SSR */
  }
  return DEMO_DEFAULT_SESSION_ROLE;
}

export function loadStoredDemoUserName(): string {
  try {
    return localStorage.getItem(SESSION_USER_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function persistSessionRole(role: UserRole): void {
  try {
    localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

/** Human label for `sessionUserId` / `siteReadiness.markedBy` in UI and toasts. */
export function formatSessionActorLabel(actorId: string): string {
  const id = normalizeSiteReadinessMarkedBy(actorId);
  if (id === "derived-site-checklist") return "Site checklist (auto)";
  if (id === "unknown") return "Unknown user";
  if (id.startsWith("actor-")) {
    const role = id.slice("actor-".length) as UserRole;
    return ROLE_LABELS[role] ?? role;
  }
  if (id.startsWith("user-")) {
    return id
      .slice("user-".length)
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return id;
}

export function persistDemoUserName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem(SESSION_USER_NAME_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(SESSION_USER_NAME_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

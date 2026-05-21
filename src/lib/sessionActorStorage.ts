import { DEMO_DEFAULT_SESSION_ROLE, ROLE_LABELS, USER_ROLES, type UserRole } from "@/domain/entities/identity";
import { normalizeSiteReadinessMarkedBy } from "@/lib/siteReadinessNormalize";

export const SESSION_ROLE_STORAGE_KEY = "mahi_demo_session_role";
export const SESSION_USER_NAME_STORAGE_KEY = "mahi_demo_session_user_name";
export const SESSION_MEMBER_ID_KEY = "mahi_demo_session_member_id";
export const SESSION_EMAIL_KEY = "mahi_demo_session_email";
export const SESSION_AUTHENTICATED_KEY = "mahi_demo_session_authenticated";

export interface AuthenticatedSession {
  memberId: string;
  email: string;
  role: UserRole;
  displayName: string;
}

const INVITE_PASSWORD_PREFIX = "mahi_demo_invite_password:";

/** Build stable actor id — prefers authenticated member id. */
export function buildSessionUserId(demoUserName: string, role: UserRole, memberId?: string): string {
  if (memberId?.trim()) return memberId.trim();
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

export function loadStoredMemberId(): string {
  try {
    return localStorage.getItem(SESSION_MEMBER_ID_KEY) ?? "";
  } catch {
    return "";
  }
}

export function loadStoredEmail(): string {
  try {
    return localStorage.getItem(SESSION_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function isSessionAuthenticated(): boolean {
  try {
    return localStorage.getItem(SESSION_AUTHENTICATED_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistSessionRole(role: UserRole): void {
  try {
    localStorage.setItem(SESSION_ROLE_STORAGE_KEY, role);
  } catch {
    /* ignore */
  }
}

export function persistAuthenticatedSession(session: AuthenticatedSession): void {
  try {
    localStorage.setItem(SESSION_AUTHENTICATED_KEY, "1");
    localStorage.setItem(SESSION_MEMBER_ID_KEY, session.memberId);
    localStorage.setItem(SESSION_EMAIL_KEY, session.email);
    localStorage.setItem(SESSION_ROLE_STORAGE_KEY, session.role);
    localStorage.setItem(SESSION_USER_NAME_STORAGE_KEY, session.displayName);
  } catch {
    /* ignore */
  }
}

export function clearAuthenticatedSession(): void {
  try {
    localStorage.removeItem(SESSION_AUTHENTICATED_KEY);
    localStorage.removeItem(SESSION_MEMBER_ID_KEY);
    localStorage.removeItem(SESSION_EMAIL_KEY);
    localStorage.removeItem(SESSION_ROLE_STORAGE_KEY);
    localStorage.removeItem(SESSION_USER_NAME_STORAGE_KEY);
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

/** Store password for invite-accepted users (local prototype only). */
export function persistInvitePassword(email: string, password: string): void {
  try {
    localStorage.setItem(`${INVITE_PASSWORD_PREFIX}${email.trim().toLowerCase()}`, password);
  } catch {
    /* ignore */
  }
}

export function loadInvitePassword(email: string): string | null {
  try {
    return localStorage.getItem(`${INVITE_PASSWORD_PREFIX}${email.trim().toLowerCase()}`);
  } catch {
    return null;
  }
}

export function validateLoginPassword(email: string, password: string, demoPassword: string): boolean {
  const invitePw = loadInvitePassword(email);
  if (invitePw && invitePw === password) return true;
  return password === demoPassword;
}

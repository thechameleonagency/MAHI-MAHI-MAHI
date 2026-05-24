import type { AppState } from "@/contexts/AppDataContext";
import type { Enquiry, SettingsTeamMember } from "@/types/project";
import { normalizeTeamMemberStatus } from "@/lib/seedSessionBootstrap";

export type EnquiryAssigneePatch = Pick<Enquiry, "assignedTo" | "assignedToMemberId">;

const ACTIVE = "Active";

export function getActiveSalesTeamMembers(members: SettingsTeamMember[]): SettingsTeamMember[] {
  return members.filter(
    (m) => m.role === "salesperson" && normalizeTeamMemberStatus(m.status) === ACTIVE,
  );
}

export function resolveMemberById(
  memberId: string | undefined,
  members: SettingsTeamMember[],
): SettingsTeamMember | undefined {
  const id = memberId?.trim();
  if (!id) return undefined;
  return members.find((m) => m.id === id);
}

/** Display label for tables and toasts — resolves from member id when possible. */
export function getEnquiryAssigneeDisplayName(
  enquiry: Pick<Enquiry, "assignedTo" | "assignedToMemberId">,
  members: SettingsTeamMember[],
): string {
  const byId = resolveMemberById(enquiry.assignedToMemberId, members);
  if (byId) return byId.name;
  const raw = enquiry.assignedTo?.trim();
  if (!raw) return "";
  const asMember = members.find((m) => m.id === raw);
  if (asMember) return asMember.name;
  return raw;
}

export function enquiryHasAssignee(
  enquiry: Pick<Enquiry, "assignedTo" | "assignedToMemberId">,
): boolean {
  return Boolean(enquiry.assignedToMemberId?.trim() || enquiry.assignedTo?.trim());
}

/**
 * Build canonical assignment fields from a settings team member id.
 * Clears assignment when memberId is empty.
 */
export function buildEnquiryAssignmentFromMemberId(
  memberId: string,
  members: SettingsTeamMember[],
): EnquiryAssigneePatch {
  const id = memberId.trim();
  if (!id) {
    return { assignedToMemberId: undefined, assignedTo: "" };
  }
  const member = resolveMemberById(id, members);
  if (!member) {
    return { assignedToMemberId: id, assignedTo: "" };
  }
  return { assignedToMemberId: member.id, assignedTo: member.name };
}

/** Normalize UI/command patches that set member id and/or legacy assignedTo string. */
export function normalizeEnquiryAssignmentPatch(
  patch: Partial<Enquiry>,
  members: SettingsTeamMember[],
): Partial<Enquiry> {
  if (!("assignedToMemberId" in patch) && !("assignedTo" in patch)) {
    return patch;
  }

  const memberId = patch.assignedToMemberId?.trim();
  if (memberId) {
    return { ...patch, ...buildEnquiryAssignmentFromMemberId(memberId, members) };
  }

  const legacy = patch.assignedTo?.trim();
  if (!legacy) {
    return { ...patch, assignedToMemberId: undefined, assignedTo: "" };
  }

  const byId = members.find((m) => m.id === legacy);
  if (byId) {
    return { ...patch, assignedToMemberId: byId.id, assignedTo: byId.name };
  }
  const byName = members.find((m) => m.name === legacy);
  if (byName) {
    return { ...patch, assignedToMemberId: byName.id, assignedTo: byName.name };
  }

  return { ...patch, assignedToMemberId: undefined, assignedTo: legacy };
}

function resolveMemberIdFromLegacyValue(
  value: string | undefined,
  members: SettingsTeamMember[],
): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (members.some((m) => m.id === raw)) return raw;
  return members.find((m) => m.name === raw)?.id;
}

/**
 * Repair enquiry ownership: member id in FK field, display name in assignedTo.
 * Idempotent for rows already normalized.
 */
export function reconcileEnquiryAssignees(state: AppState): AppState {
  const members = state.settingsTeamMembers;
  if (!members.length) return state;

  let changed = false;

  const enquiries = state.enquiries.map((enquiry) => {
    let memberId =
      enquiry.assignedToMemberId?.trim() ||
      resolveMemberIdFromLegacyValue(enquiry.assignedTo, members);

    const assignment = memberId
      ? buildEnquiryAssignmentFromMemberId(memberId, members)
      : { assignedToMemberId: undefined as string | undefined, assignedTo: "" };

    const same =
      enquiry.assignedToMemberId === assignment.assignedToMemberId &&
      enquiry.assignedTo === assignment.assignedTo;
    if (same) return enquiry;

    changed = true;
    return { ...enquiry, ...assignment };
  });

  return changed ? { ...state, enquiries } : state;
}

export type StaleEnquiryAssignee = {
  enquiryId: string;
  reason:
    | "name_without_member_id"
    | "display_name_mismatch"
    | "unknown_member_id"
    | "legacy_name_unresolvable";
};

/** ER1 — enquiry↔salesperson must use assignedToMemberId + denormalized display name. */
export function findStaleEnquiryAssigneeState(
  enquiries: Enquiry[],
  members: SettingsTeamMember[],
): StaleEnquiryAssignee[] {
  const stale: StaleEnquiryAssignee[] = [];
  const memberById = new Map(members.map((m) => [m.id, m]));

  for (const enquiry of enquiries) {
    const memberId = enquiry.assignedToMemberId?.trim();
    const display = enquiry.assignedTo?.trim();

    if (!memberId && display) {
      const resolved = resolveMemberIdFromLegacyValue(display, members);
      if (!resolved) {
        stale.push({ enquiryId: enquiry.id, reason: "legacy_name_unresolvable" });
      } else {
        stale.push({ enquiryId: enquiry.id, reason: "name_without_member_id" });
      }
      continue;
    }

    if (memberId && !memberById.has(memberId)) {
      stale.push({ enquiryId: enquiry.id, reason: "unknown_member_id" });
      continue;
    }

    if (memberId) {
      const expected = memberById.get(memberId)?.name ?? "";
      if (display && display !== expected) {
        stale.push({ enquiryId: enquiry.id, reason: "display_name_mismatch" });
      }
      if (!display && expected) {
        stale.push({ enquiryId: enquiry.id, reason: "display_name_mismatch" });
      }
    }
  }

  return stale;
}

/** Ensure generator / legacy rows have arrays and timestamps the Enquiries UI expects. */
export function normalizeEnquiryShape(
  enquiry: Enquiry & { date?: string },
): Enquiry {
  const legacyDate = enquiry.date;
  const createdAt =
    enquiry.createdAt ??
    (legacyDate
      ? legacyDate.includes("T")
        ? legacyDate.slice(0, 10)
        : legacyDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10));
  const updatedAt = enquiry.updatedAt ?? createdAt;
  const { date: _legacyDate, ...rest } = enquiry;
  return {
    ...rest,
    notes: enquiry.notes ?? [],
    shareHistory: enquiry.shareHistory ?? [],
    createdAt,
    updatedAt,
  };
}

/** Normalize assignment fields on a full enquiry row before persistence. */
export function normalizeEnquiryRecord(
  enquiry: Enquiry,
  members: SettingsTeamMember[],
): Enquiry {
  const shaped = normalizeEnquiryShape(enquiry);
  const patch = normalizeEnquiryAssignmentPatch(shaped, members);
  return { ...shaped, ...patch };
}

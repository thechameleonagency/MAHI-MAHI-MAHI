import { isDateOnOrAfter, parseUiDate } from "@/lib/dateSanity";
import type { ScheduledInstallation } from "@/types/operations";

/** Minimum characters for schedule override reasons (past date, double-booking). */
export const MIN_SCHEDULE_OVERRIDE_REASON_LENGTH = 10;

export const MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH = MIN_SCHEDULE_OVERRIDE_REASON_LENGTH;

export const MIN_DOUBLE_BOOKING_OVERRIDE_REASON_LENGTH = MIN_SCHEDULE_OVERRIDE_REASON_LENGTH;

export function todayIsoDate(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
}

export function isScheduledInstallationDateInPast(
  scheduledDate: string,
  today = todayIsoDate(),
): boolean {
  const date = scheduledDate?.trim().slice(0, 10) ?? "";
  if (!date || !parseUiDate(date)) return false;
  return !isDateOnOrAfter(date, today);
}

export type ValidateScheduledInstallationDateInput = {
  scheduledDate: string;
  today?: string;
  isSuperAdmin: boolean;
  pastOverrideReason?: string;
};

export function validateScheduledInstallationDate(
  input: ValidateScheduledInstallationDateInput,
): { ok: true; pastOverride: boolean } | { ok: false; message: string } {
  const today = input.today ?? todayIsoDate();
  const date = input.scheduledDate?.trim().slice(0, 10) ?? "";

  if (!date) {
    return { ok: false, message: "Installation date is required." };
  }
  if (!parseUiDate(date)) {
    return { ok: false, message: "Enter a valid installation date." };
  }

  const inPast = isScheduledInstallationDateInPast(date, today);
  if (!inPast) {
    return { ok: true, pastOverride: false };
  }

  if (!input.isSuperAdmin) {
    return {
      ok: false,
      message: "Installations cannot be scheduled in the past. Choose today or a future date.",
    };
  }

  const reason = input.pastOverrideReason?.trim() ?? "";
  if (reason.length < MIN_SCHEDULE_OVERRIDE_REASON_LENGTH) {
    return {
      ok: false,
      message: `Scheduling in the past requires a reason (at least ${MIN_SCHEDULE_OVERRIDE_REASON_LENGTH} characters).`,
    };
  }

  return { ok: true, pastOverride: true };
}

export type FindScheduledInstallationConflictsInput = {
  scheduledInstallations: ScheduledInstallation[];
  scheduledDate: string;
  projectId: string;
  teamId?: string;
  employeeIds?: Array<string | number>;
};

export type ScheduledInstallationConflictResult = {
  hasConflict: boolean;
  teamConflicts: ScheduledInstallation[];
  employeeConflicts: ScheduledInstallation[];
};

/** Detect team/employee double-booking on the same date (other projects). */
export function findScheduledInstallationConflicts(
  input: FindScheduledInstallationConflictsInput,
): ScheduledInstallationConflictResult {
  const date = input.scheduledDate.trim().slice(0, 10);
  const sameDate = (input.scheduledInstallations ?? []).filter(
    (s) =>
      s.status !== "cancelled" &&
      s.scheduledDate.slice(0, 10) === date &&
      s.projectId !== input.projectId,
  );
  const teamConflicts = input.teamId
    ? sameDate.filter((s) => s.teamId === input.teamId)
    : [];
  const employeeIdSet = new Set((input.employeeIds ?? []).map(String));
  const employeeConflicts =
    employeeIdSet.size > 0
      ? sameDate.filter(
          (s) => s.employeeIds?.some((e) => employeeIdSet.has(String(e))) ?? false,
        )
      : [];
  return {
    hasConflict: teamConflicts.length > 0 || employeeConflicts.length > 0,
    teamConflicts,
    employeeConflicts,
  };
}

export function validateDoubleBookingOverride(
  hasConflict: boolean,
  reason?: string,
): { ok: true } | { ok: false; message: string } {
  if (!hasConflict) return { ok: true };
  const trimmed = reason?.trim() ?? "";
  if (trimmed.length < MIN_DOUBLE_BOOKING_OVERRIDE_REASON_LENGTH) {
    return {
      ok: false,
      message: `Double-booking requires a reason (at least ${MIN_DOUBLE_BOOKING_OVERRIDE_REASON_LENGTH} characters).`,
    };
  }
  return { ok: true };
}

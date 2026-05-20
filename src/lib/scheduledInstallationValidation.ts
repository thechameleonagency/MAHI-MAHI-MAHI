import { isDateOnOrAfter, parseUiDate } from "@/lib/dateSanity";

export const MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH = 10;

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
  if (reason.length < MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH) {
    return {
      ok: false,
      message: `Scheduling in the past requires a reason (at least ${MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH} characters).`,
    };
  }

  return { ok: true, pastOverride: true };
}

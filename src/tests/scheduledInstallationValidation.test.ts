import { describe, expect, it } from "vitest";
import {
  isScheduledInstallationDateInPast,
  validateScheduledInstallationDate,
  todayIsoDate,
  MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH,
} from "@/lib/scheduledInstallationValidation";

describe("scheduledInstallationValidation", () => {
  const today = "2026-05-20";

  it("treats dates before today as past", () => {
    expect(isScheduledInstallationDateInPast("2020-01-01", today)).toBe(true);
    expect(isScheduledInstallationDateInPast("2026-05-19", today)).toBe(true);
  });

  it("treats today and future dates as not past", () => {
    expect(isScheduledInstallationDateInPast(today, today)).toBe(false);
    expect(isScheduledInstallationDateInPast("2026-06-01", today)).toBe(false);
  });

  it("rejects past dates for non-super_admin", () => {
    const result = validateScheduledInstallationDate({
      scheduledDate: "2020-01-01",
      today,
      isSuperAdmin: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/past/i);
  });

  it("allows today without override", () => {
    const result = validateScheduledInstallationDate({
      scheduledDate: today,
      today,
      isSuperAdmin: false,
    });
    expect(result).toEqual({ ok: true, pastOverride: false });
  });

  it("requires reason when super_admin schedules in the past", () => {
    const short = validateScheduledInstallationDate({
      scheduledDate: "2020-01-01",
      today,
      isSuperAdmin: true,
      pastOverrideReason: "backfill",
    });
    expect(short.ok).toBe(false);

    const ok = validateScheduledInstallationDate({
      scheduledDate: "2020-01-01",
      today,
      isSuperAdmin: true,
      pastOverrideReason: "a".repeat(MIN_PAST_SCHEDULE_OVERRIDE_REASON_LENGTH),
    });
    expect(ok).toEqual({ ok: true, pastOverride: true });
  });

  it("todayIsoDate returns YYYY-MM-DD", () => {
    expect(todayIsoDate(new Date("2026-05-20T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

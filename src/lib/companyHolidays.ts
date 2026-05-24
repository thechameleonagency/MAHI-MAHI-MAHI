import { format, parseISO } from "date-fns";
import type { CompanyHoliday } from "@/types/project";

function toYmd(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, "yyyy-MM-dd");
  }
  if (value && typeof value === "object" && "__date__" in value) {
    const d = new Date(String((value as { __date__: string }).__date__));
    if (!Number.isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  }
  return null;
}

function isCompanyHolidayShape(item: unknown): item is CompanyHoliday {
  return (
    !!item &&
    typeof item === "object" &&
    "date" in item &&
    "name" in item &&
    typeof (item as CompanyHoliday).date === "string" &&
    typeof (item as CompanyHoliday).name === "string"
  );
}

/** Migrate legacy `Date[]` snapshots and normalize named holiday rows. */
export function normalizeCompanyHolidays(raw: unknown): CompanyHoliday[] {
  if (!Array.isArray(raw)) return [];

  const byDate = new Map<string, CompanyHoliday>();

  raw.forEach((item, idx) => {
    if (isCompanyHolidayShape(item)) {
      const date = toYmd(item.date);
      if (!date) return;
      byDate.set(date, {
        id: item.id?.trim() || `HOL-${date}-${idx}`,
        date,
        name: item.name.trim() || "Holiday",
        groupId: item.groupId?.trim() || undefined,
      });
      return;
    }

    const date = toYmd(item);
    if (!date) return;
    byDate.set(date, {
      id: `HOL-legacy-${date}`,
      date,
      name: "Holiday",
    });
  });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function companyHolidayToDate(holiday: CompanyHoliday): Date {
  return parseISO(`${holiday.date}T12:00:00`);
}

export function isSameCompanyHolidayDay(holiday: CompanyHoliday, day: Date): boolean {
  return holiday.date === format(day, "yyyy-MM-dd");
}

export function findCompanyHolidayByDate(
  holidays: CompanyHoliday[],
  dateYmd: string,
): CompanyHoliday | undefined {
  return holidays.find((h) => h.date === dateYmd);
}

export function companyHolidayDayName(holiday: CompanyHoliday): string {
  return holiday.name.trim() || "Holiday";
}

export function companyHolidaysInMonth(
  holidays: CompanyHoliday[],
  year: number,
  monthIndex: number,
): CompanyHoliday[] {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return holidays.filter((h) => h.date.startsWith(prefix));
}

export function createCompanyHolidayId(): string {
  return `HOL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

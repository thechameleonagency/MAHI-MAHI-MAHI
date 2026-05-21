/** Seed time window: 2026-01-01 → 2026-05-20 (reference "today" = end). */
export const SEED_WINDOW_START = new Date("2026-01-01T09:00:00+05:30");
export const SEED_WINDOW_END = new Date("2026-05-20T18:00:00+05:30");
export const SEED_REFERENCE_TODAY = "2026-05-20";

const usedTimestamps = new Set<string>();

function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 6; // Mon–Sat for field ops
}

function isOfficeDay(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5; // Mon–Fri
}

/** Reset timestamp dedupe registry (call once per seed build). */
export function resetSeedTimeRegistry(): void {
  usedTimestamps.clear();
}

/** Linear progress 0..1 through the seed window. */
export function seedProgress(fraction: number): Date {
  const clamped = Math.max(0, Math.min(1, fraction));
  const ms =
    SEED_WINDOW_START.getTime() +
    clamped * (SEED_WINDOW_END.getTime() - SEED_WINDOW_START.getTime());
  return new Date(ms);
}

/** Date at fraction through window, biased to weekdays; optional office-only. */
export function seedDateAt(
  fraction: number,
  opts?: { officeOnly?: boolean; jitterMinutes?: number; sequence?: number },
): string {
  let d = seedProgress(fraction);
  let attempts = 0;
  while (attempts < 14) {
    const ok = opts?.officeOnly ? isOfficeDay(d) : isWeekday(d);
    if (ok) break;
    d = new Date(d.getTime() + 86400000);
    attempts++;
  }
  const jitter = (opts?.jitterMinutes ?? 15) * 60000;
  const seq = opts?.sequence ?? Math.floor(fraction * 10000);
  const offset = ((seq * 17) % (jitter * 2)) - jitter;
  d = new Date(d.getTime() + offset);
  let iso = d.toISOString();
  let bump = 0;
  while (usedTimestamps.has(iso) && bump < 120) {
    d = new Date(d.getTime() + 45000 + bump * 1000);
    iso = d.toISOString();
    bump++;
  }
  usedTimestamps.add(iso);
  return iso;
}

/** YYYY-MM-DD date string at fraction through window. */
export function seedDayAt(fraction: number, opts?: { officeOnly?: boolean }): string {
  return seedDateAt(fraction, opts).slice(0, 10);
}

/** Indian public holidays within the seed window. */
export function seedHolidays(): Date[] {
  const days = [
    "2026-01-26", // Republic Day
    "2026-03-14", // Holi
    "2026-03-30", // Ugadi
    "2026-04-02", // Good Friday
    "2026-04-14", // Ambedkar Jayanti
    "2026-05-01", // Labour Day
    "2026-04-18", // Ramzan (approx)
    "2026-02-15", // Mahashivratri (approx)
  ];
  return days.map((d) => new Date(`${d}T00:00:00+05:30`));
}

/** Month keys between Jan–May 2026 for attendance/payroll loops. */
export function seedMonths(): string[] {
  return ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
}

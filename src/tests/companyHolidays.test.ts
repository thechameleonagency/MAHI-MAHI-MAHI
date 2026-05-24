import { describe, it, expect } from "vitest";
import {
  normalizeCompanyHolidays,
  findCompanyHolidayByDate,
  companyHolidaysInMonth,
} from "@/lib/companyHolidays";

describe("companyHolidays", () => {
  it("migrates legacy Date entries to named holidays", () => {
    const legacy = [new Date("2026-01-26T12:00:00")];
    const normalized = normalizeCompanyHolidays(legacy);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].date).toBe("2026-01-26");
    expect(normalized[0].name).toBe("Holiday");
  });

  it("preserves named holiday rows", () => {
    const rows = normalizeCompanyHolidays([
      { id: "H1", date: "2026-11-01", name: "Diwali Holidays", groupId: "g1" },
      { id: "H2", date: "2026-11-02", name: "Diwali Holidays", groupId: "g1" },
    ]);
    expect(rows).toHaveLength(2);
    expect(findCompanyHolidayByDate(rows, "2026-11-01")?.name).toBe("Diwali Holidays");
  });

  it("filters holidays by month", () => {
    const rows = normalizeCompanyHolidays([
      { id: "H1", date: "2026-03-15", name: "Holi" },
      { id: "H2", date: "2026-04-14", name: "Baisakhi" },
    ]);
    expect(companyHolidaysInMonth(rows, 2026, 2)).toHaveLength(1);
    expect(companyHolidaysInMonth(rows, 2026, 2)[0].name).toBe("Holi");
  });
});

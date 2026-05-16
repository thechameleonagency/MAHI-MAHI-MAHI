import { describe, it, expect } from "vitest";
import { buildCalendarEvents, getEventsForDate, groupEventsBySource } from "@/lib/calendarSources";
import {
  seedTasks,
  seedEnquiries,
  seedInvoices,
  seedProjects,
  seedLoans,
  seedLoanRepayments,
} from "@/data/seedData";

describe("calendarSources", () => {
  it("merges tasks, enquiries, invoices, and milestones", () => {
    const events = buildCalendarEvents({
      tasks: seedTasks,
      scheduledInstallations: [],
      enquiries: seedEnquiries,
      invoices: seedInvoices,
      vendorBills: [],
      loans: seedLoans,
      loanRepayments: seedLoanRepayments,
      siteVisits: [],
      projects: seedProjects,
    });
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.source === "task")).toBe(true);
    expect(events.some((e) => e.source === "enquiry")).toBe(true);
    expect(events.some((e) => e.source === "invoice")).toBe(true);
  });

  it("filters events for a single day", () => {
    const events = buildCalendarEvents({
      tasks: seedTasks,
      scheduledInstallations: [],
      enquiries: [],
      invoices: seedInvoices,
      vendorBills: [],
      loans: [],
      loanRepayments: [],
      siteVisits: [],
      projects: [],
    });
    const day = events[0]?.date;
    if (!day) return;
    const onDay = getEventsForDate(events, day);
    expect(onDay.every((e) => e.date === day)).toBe(true);
    const grouped = groupEventsBySource(onDay);
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
  });
});

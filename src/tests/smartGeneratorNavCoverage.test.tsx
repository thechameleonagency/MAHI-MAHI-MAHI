import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { resetExhaustiveGeneratorState } from "@/lib/data-engine/exhaustiveGenerator";
import { runExhaustiveToCompletion } from "@/lib/data-engine/runExhaustiveToCompletion";
import { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";
import { useAppData, AppDataProvider } from "@/contexts/AppDataContext";
import { FoundationProvider } from "@/app/providers/FoundationProvider";
import { AppSessionProvider } from "@/app/providers/AppSessionProvider";
import { RoleMatrixProvider } from "@/contexts/RoleMatrixContext";
import { MastersProvider } from "@/contexts/MastersContext";
import { persistAuthenticatedSession, clearAuthenticatedSession } from "@/lib/sessionActorStorage";
import { SHOWCASE_PROJECT_KINDS } from "@/lib/data-engine/smartGeneratorScenarios";
import { buildCalendarEvents } from "@/lib/calendarSources";
import { NeedToGetService } from "@/application/services/NeedToGetService";

describe("smartGeneratorNavCoverage", () => {
  beforeEach(() => {
    resetExhaustiveGeneratorState();
    useDataEngineStore.getState().clearState();
    localStorage.clear();
    persistAuthenticatedSession({
      memberId: "SA-001",
      email: "rajesh.kulkarni@mss.solar",
      role: "super_admin",
      displayName: "Rajesh Kulkarni",
    });
  });

  afterEach(() => {
    clearAuthenticatedSession();
  });

  it("seeds entities required by sidebar nav pages and derived views", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FoundationProvider>
        <AppSessionProvider>
          <RoleMatrixProvider>
            <AppDataProvider>
              <MastersProvider>{children}</MastersProvider>
            </AppDataProvider>
          </RoleMatrixProvider>
        </AppSessionProvider>
      </FoundationProvider>
    );

    const { result } = renderHook(() => useAppData(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    const store = useDataEngineStore.getState();
    const { completed } = await runExhaustiveToCompletion(
      () => result.current,
      store,
      { resetBeforeRun: true, maxIterations: 350 },
    );

    expect(completed).toBe(true);

    await waitFor(
      () => {
        expect(result.current.projects.length).toBeGreaterThanOrEqual(14);
        expect(result.current.customers.length).toBeGreaterThanOrEqual(14);
      },
      { timeout: 5000 },
    );

    const data = result.current;

    expect(data.enquiries.length).toBeGreaterThanOrEqual(3);
    expect(data.quotations.length).toBeGreaterThanOrEqual(3);
    expect(data.projects.length).toBeGreaterThanOrEqual(14);
    expect(data.customers.length).toBeGreaterThanOrEqual(14);
    expect(data.employees.length).toBeGreaterThanOrEqual(5);
    expect(data.teams.length).toBeGreaterThanOrEqual(3);
    expect(data.agents.length).toBeGreaterThanOrEqual(5);
    expect(data.inventoryItems.length).toBeGreaterThanOrEqual(20);
    expect(data.tools.length).toBeGreaterThanOrEqual(11);
    const toolsWithMovement = data.tools.filter((t) => (t.movementHistory ?? []).length > 0);
    expect(toolsWithMovement.length).toBeGreaterThanOrEqual(1);
    expect((data.siteChecklistTemplates ?? []).length).toBeGreaterThanOrEqual(2);
    expect((data.attendanceRecords ?? []).length).toBeGreaterThanOrEqual(10);
    expect((data.subcontractors ?? []).length).toBeGreaterThanOrEqual(2);
    expect(data.vendors.length).toBeGreaterThanOrEqual(4);
    expect(data.loans.length).toBeGreaterThanOrEqual(2);
    expect((data.loanRepayments ?? []).length).toBeGreaterThanOrEqual(2);
    expect(data.partners.length).toBeGreaterThanOrEqual(3);
    expect(data.vendorshipCompanies.length).toBeGreaterThanOrEqual(2);
    expect(data.incGiverCompanies.length).toBeGreaterThanOrEqual(2);

    const kindsSeen = new Set(data.projects.map((p) => p.projectKind));
    for (const kind of SHOWCASE_PROJECT_KINDS) {
      expect(kindsSeen.has(kind)).toBe(true);
    }

    const openProjects = data.projects.filter((p) => p.lifecycleStatus === "In Progress");
    const completedProjects = data.projects.filter((p) => p.lifecycleStatus === "Completed");
    expect(openProjects.length).toBeGreaterThanOrEqual(7);
    expect(completedProjects.length).toBeGreaterThanOrEqual(7);

    expect(data.sites.length).toBeGreaterThan(0);
    expect((data.scheduledInstallations ?? []).length).toBeGreaterThan(0);

    const calendarEvents = buildCalendarEvents({
      tasks: data.tasks ?? [],
      scheduledInstallations: data.scheduledInstallations ?? [],
      enquiries: data.enquiries,
      invoices: data.invoices ?? [],
      vendorBills: data.vendorBills ?? [],
      loans: data.loans,
      loanRepayments: data.loanRepayments ?? [],
      siteVisits: data.siteVisits ?? [],
      projects: data.projects,
    });
    expect(calendarEvents.length).toBeGreaterThan(0);
    expect(() =>
      calendarEvents.sort(
        (a, b) =>
          (a.date ?? "").localeCompare(b.date ?? "") ||
          (a.title ?? "").localeCompare(b.title ?? ""),
      ),
    ).not.toThrow();

    const needToGet = new NeedToGetService().buildRows(
      data.sites,
      data.projects,
      data.inventoryItems,
      data.vendorBills ?? [],
      data.materialReservations ?? [],
      data.materialDamageRecords ?? [],
    );
    expect(() => needToGet.sort((a, b) => (a.needByDate ?? "").localeCompare(b.needByDate ?? ""))).not.toThrow();
  }, 180_000);
});

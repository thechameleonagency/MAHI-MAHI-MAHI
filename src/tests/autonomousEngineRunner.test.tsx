import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runExhaustiveIteration,
  resetExhaustiveGeneratorState,
  GENERATOR_ENTITY_LIMITS,
} from "@/lib/data-engine/exhaustiveGenerator";
import { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";

import { renderHook, act, waitFor } from "@testing-library/react";
import { useAppData, AppDataProvider } from "@/contexts/AppDataContext";
import { FoundationProvider } from "@/app/providers/FoundationProvider";
import { AppSessionProvider } from "@/app/providers/AppSessionProvider";
import { RoleMatrixProvider } from "@/contexts/RoleMatrixContext";
import { MastersProvider } from "@/contexts/MastersContext";
import React from "react";
import { persistAuthenticatedSession, clearAuthenticatedSession } from "@/lib/sessionActorStorage";

describe("Autonomous Engine Runner", () => {
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

  it("bootstraps all master entities then completes permutations without crashing", async () => {
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
    store.setStatus("running");

    for (let i = 0; i < 220; i++) {
      await act(async () => {
        await runExhaustiveIteration(() => result.current, store);
      });
    }

    // Generator may still be running in test timing; verify master data + diverse projects.

    expect(result.current.employees.length).toBe(GENERATOR_ENTITY_LIMITS.employees);
    expect(result.current.agents.length).toBe(GENERATOR_ENTITY_LIMITS.agents);
    expect(result.current.partners.length).toBe(
      GENERATOR_ENTITY_LIMITS.partnersPerType * 4,
    );
    expect(result.current.vendors.length).toBe(GENERATOR_ENTITY_LIMITS.vendors);
    expect(result.current.teams.length).toBe(GENERATOR_ENTITY_LIMITS.teams);
    expect(result.current.inventoryItems.length).toBe(GENERATOR_ENTITY_LIMITS.inventoryItems);
    expect(result.current.tools.length).toBe(GENERATOR_ENTITY_LIMITS.tools);
    expect(result.current.loans.length).toBe(GENERATOR_ENTITY_LIMITS.loans);
    expect(result.current.vendorshipCompanies.length).toBe(
      GENERATOR_ENTITY_LIMITS.vendorshipCompanies,
    );
    expect(result.current.incGiverCompanies.length).toBe(
      GENERATOR_ENTITY_LIMITS.incGiverCompanies,
    );

    expect(result.current.projects.length).toBeGreaterThanOrEqual(8);

    const kindsSeen = new Set(result.current.projects.map((p) => p.projectKind));
    expect(kindsSeen.size).toBeGreaterThanOrEqual(4);
  }, 120_000);
});

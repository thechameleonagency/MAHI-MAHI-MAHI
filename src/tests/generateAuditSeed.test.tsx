/**
 * Generates demo app state for route audit scripts. Writes scripts/audit-seed.json.
 * Run: npx vitest run src/tests/generateAuditSeed.test.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
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
import { serializeAppState } from "@/lib/appDataStorage";

describe("generateAuditSeed", () => {
  beforeEach(() => {
    localStorage.clear();
    resetExhaustiveGeneratorState();
    useDataEngineStore.getState().clearState();
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

  it("writes audit-seed.json for playwright route audit", async () => {
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
    await waitFor(() => expect(result.current).toBeDefined());

    const store = useDataEngineStore.getState();
    const { completed } = await runExhaustiveToCompletion(
      () => result.current,
      store,
      { resetBeforeRun: true, maxIterations: 350 },
    );
    expect(completed).toBe(true);

    await waitFor(
      () => {
        expect(result.current.projects.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const payload = serializeAppState(result.current);
    const outPath = join(process.cwd(), "scripts", "audit-seed.json");
    writeFileSync(outPath, payload, "utf8");
    expect(result.current.projects.length).toBeGreaterThan(0);
  }, 300_000);
});

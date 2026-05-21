import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import {
  COMMAND_BUS_MODULES,
  DIRECT_APP_STATE_MODULES,
  moduleById,
} from "@/lib/dualPersistenceModel";
import { createRepositorySyncedSetState } from "@/lib/appStateRepositorySync";
import { createPrototypeRepositoryContext } from "@/infrastructure/repositories/localStorage/createPrototypeRepositoryContext";

describe("dualPersistenceModel (AR1)", () => {
  it("catalogues command-bus vs direct modules without overlap", () => {
    const commandIds = new Set(COMMAND_BUS_MODULES.map((m) => m.id));
    const directIds = new Set(DIRECT_APP_STATE_MODULES.map((m) => m.id));
    for (const id of directIds) {
      expect(commandIds.has(id)).toBe(false);
    }
    expect(moduleById("enquiry")?.path).toBe("command_bus");
    expect(moduleById("finance_invoices")?.path).toBe("direct_app_state");
  });

  it("AppDataProvider wraps setState with repository sync (AR1)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/contexts/AppDataContext.tsx"),
      "utf8",
    );
    expect(source).toContain("createRepositorySyncedSetState");
    expect(source).toMatch(
      /const \[state, setStateRaw\][\s\S]*?const setState = useMemo\([\s\S]*?createRepositorySyncedSetState/,
    );
  });

  it("repository sync after direct patch keeps invoice mirror aligned with AppState", () => {
    const { state } = buildBusinessSeed("smoke");
    const repos = createPrototypeRepositoryContext();
    let current = state;
    const setState = createRepositorySyncedSetState((action) => {
      current = typeof action === "function" ? action(current) : action;
    }, repos);

    const probeId = "INV-AR1-SYNC-TEST";
    setState((prev) => ({
      ...prev,
      invoices: [
        {
          ...prev.invoices[0]!,
          id: probeId,
          invoiceNumber: "AR1-TEST",
        },
        ...prev.invoices,
      ],
    }));

    const fromRepo = repos.invoiceRepository.getById(probeId);
    expect(fromRepo?.id).toBe(probeId);
    expect(current.invoices.some((i) => i.id === probeId)).toBe(true);
  });
});

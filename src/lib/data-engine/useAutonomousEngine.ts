import { useCallback, useRef } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { useDataEngineStore } from "./useDataEngineStore";
import {
  runExhaustiveIteration,
  isExhaustiveGenerationComplete,
  getExhaustiveGenerationProgressPercent,
} from "./exhaustiveGenerator";
import { clearAutoSeedDone, markAutoSeedDoneIfSeeded } from "./autoSeedStorage";
import { ensureDataEngineActorSession } from "./ensureDataEngineSession";
import {
  formatWorkspaceDataCounts,
  readWorkspaceDataCounts,
} from "./workspaceDataCounts";

function waitForReactFlush(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

export function useAutonomousEngine() {
  const context = useAppData();
  const store = useDataEngineStore();
  const engineRef = useRef<number | null>(null);

  const contextRef = useRef(context);
  contextRef.current = context;

  const finalizeGeneration = useCallback(async () => {
    await waitForReactFlush();
    contextRef.current.flushPersistAppState?.();
    await waitForReactFlush();

    const counts = readWorkspaceDataCounts(contextRef.current);
    const seeded = markAutoSeedDoneIfSeeded(counts);

    if (seeded) {
      store.setStatus("idle");
      store.addLog(
        "success",
        `100% generation complete — persisted workspace (${formatWorkspaceDataCounts(counts)}).`,
        "persist",
      );
    } else {
      clearAutoSeedDone();
      store.addLog(
        "error",
        `Generation finished but workspace is empty (${formatWorkspaceDataCounts(counts)}). Check session role and permissions, then Clear & Regenerate.`,
        "persist",
      );
      store.setStatus("error");
    }
  }, [store]);

  const runFlow = useCallback(async () => {
    if (useDataEngineStore.getState().status !== "running") return;

    try {
      await runExhaustiveIteration(() => contextRef.current, store);
      await waitForReactFlush();
      store.setProgress(getExhaustiveGenerationProgressPercent());

      if (isExhaustiveGenerationComplete()) {
        await finalizeGeneration();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.addLog("error", `Flow failed: ${msg}`, "system");
      store.setStatus("error");
      clearAutoSeedDone();
      return;
    }

    if (useDataEngineStore.getState().status === "running") {
      engineRef.current = window.setTimeout(runFlow, 500);
    }
  }, [store, finalizeGeneration]);

  const start = useCallback(() => {
    const role = ensureDataEngineActorSession();
    store.addLog("info", `Data engine started (session role: ${role}).`, "session");
    store.setStatus("running");
    store.addLog("info", "Exhaustive smart showcase generation running.", "system");
    runFlow();
  }, [runFlow, store]);

  const pause = useCallback(() => {
    store.setStatus("paused");
    store.addLog("warn", "Data engine paused.", "system");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  const stop = useCallback(() => {
    store.setStatus("idle");
    store.setActiveFlow(null);
    store.addLog("info", "Data engine stopped by user.", "system");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  return { start, pause, stop };
}

import { useCallback, useRef } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { useDataEngineStore } from "./useDataEngineStore";
import { runExhaustiveIteration, isExhaustiveGenerationComplete, getExhaustiveGenerationProgressPercent } from "./exhaustiveGenerator";
import { markAutoSeedDone } from "./autoSeedStorage";

export function useAutonomousEngine() {
  const context = useAppData();
  const store = useDataEngineStore();
  const engineRef = useRef<number | null>(null);
  
  // Fix stale closure: always access the latest context
  const contextRef = useRef(context);
  contextRef.current = context;

  const runFlow = useCallback(async () => {
    if (useDataEngineStore.getState().status !== "running") return;

    try {
      await runExhaustiveIteration(() => contextRef.current, store);
      store.setProgress(getExhaustiveGenerationProgressPercent());

      if (isExhaustiveGenerationComplete()) {
        markAutoSeedDone();
        store.addLog("success", "100% generation complete — all permutations generated.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.addLog("error", `Flow Failed: ${msg}`);
      store.setStatus("error");
      return;
    }

    // Schedule next iteration if still running
    if (useDataEngineStore.getState().status === "running") {
      engineRef.current = window.setTimeout(runFlow, 500); // 500ms delay between exhaustive ticks
    }
  }, [context, store]);

  const start = useCallback(() => {
    store.setStatus("running");
    store.addLog("info", "Data Engine Started (Exhaustive Mode)");
    runFlow();
  }, [runFlow, store]);

  const pause = useCallback(() => {
    store.setStatus("paused");
    store.addLog("warn", "Data Engine Paused");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  const stop = useCallback(() => {
    store.setStatus("idle");
    store.setActiveFlow(null);
    store.addLog("info", "Data Engine Stopped");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  return { start, pause, stop };
}

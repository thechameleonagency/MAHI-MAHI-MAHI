import {
  getExhaustiveGeneratorIndex,
  getExhaustiveTotalPermutations,
  isExhaustiveGenerationComplete,
  resetExhaustiveGeneratorState,
  runExhaustiveIteration,
} from "@/lib/data-engine/exhaustiveGenerator";
import type { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";
import { act } from "@testing-library/react";

export type RunExhaustiveToCompletionOptions = {
  maxIterations?: number;
  resetBeforeRun?: boolean;
};

export type RunExhaustiveToCompletionResult = {
  completed: boolean;
  iterations: number;
};

/**
 * Runs generator ticks until showcase scenarios complete or maxIterations reached.
 * Each tick is wrapped in `act()` so hook-based tests see fresh AppData state.
 */
export async function runExhaustiveToCompletion(
  getContext: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
  options?: RunExhaustiveToCompletionOptions,
): Promise<RunExhaustiveToCompletionResult> {
  const maxIterations = options?.maxIterations ?? 300;

  if (options?.resetBeforeRun !== false) {
    resetExhaustiveGeneratorState();
  }

  store.setStatus("running");
  store.addLog("info", "Data Engine Started (Smart Showcase Mode)");

  let iterations = 0;
  while (iterations < maxIterations) {
    await act(async () => {
      await runExhaustiveIteration(getContext, store);
    });
    iterations++;

    if (isExhaustiveGenerationComplete()) {
      return { completed: true, iterations };
    }
  }

  const total = getExhaustiveTotalPermutations();
  const index = getExhaustiveGeneratorIndex();
  if (index >= total && isExhaustiveGenerationComplete()) {
    return { completed: true, iterations };
  }

  store.setStatus("error");
  store.addLog("error", `Generation stopped after ${iterations} iterations (${index}/${total} scenarios).`);
  return { completed: false, iterations };
}

import {
  getExhaustiveGeneratorIndex,
  getExhaustiveTotalPermutations,
  isExhaustiveGenerationComplete,
  resetExhaustiveGeneratorState,
  runExhaustiveIteration,
} from "@/lib/data-engine/exhaustiveGenerator";
import type { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";

export type RunExhaustiveToCompletionOptions = {
  maxIterations?: number;
  resetBeforeRun?: boolean;
};

export type RunExhaustiveToCompletionResult = {
  completed: boolean;
  iterations: number;
};

/**
 * Runs exhaustive generator ticks until all permutations complete or maxIterations reached.
 * Used by tests and synchronous batch runs.
 */
export async function runExhaustiveToCompletion(
  getContext: () => Record<string, unknown>,
  store: ReturnType<typeof useDataEngineStore.getState>,
  options?: RunExhaustiveToCompletionOptions,
): Promise<RunExhaustiveToCompletionResult> {
  const maxIterations = options?.maxIterations ?? 250;

  if (options?.resetBeforeRun !== false) {
    resetExhaustiveGeneratorState();
  }

  store.setStatus("running");
  store.addLog("info", "Data Engine Started (Exhaustive Mode)");

  let iterations = 0;
  while (iterations < maxIterations) {
    await runExhaustiveIteration(getContext, store);
    iterations++;

    if (isExhaustiveGenerationComplete()) {
      return { completed: true, iterations };
    }
  }

  const total = getExhaustiveTotalPermutations();
  const index = getExhaustiveGeneratorIndex();
  if (index >= total) {
    return { completed: true, iterations };
  }

  store.setStatus("error");
  store.addLog("error", `Generation stopped after ${iterations} iterations (${index}/${total} permutations).`);
  return { completed: false, iterations };
}

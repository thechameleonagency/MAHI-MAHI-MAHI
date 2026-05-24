import { useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { getWorkspaceMode } from "@/lib/defaultAppBoot";
import { useAutonomousEngine } from "@/lib/data-engine/useAutonomousEngine";
import { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";
import {
  isAutoSeedDone,
  isAutoSeedPending,
  markAutoSeedDone,
  clearAutoSeedPending,
} from "@/lib/data-engine/autoSeedStorage";
import {
  getExhaustiveGenerationProgressPercent,
  isExhaustiveGenerationComplete,
  resetExhaustiveGeneratorState,
} from "@/lib/data-engine/exhaustiveGenerator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

function shouldAutoStartGeneration(
  projects: number,
  customers: number,
  enquiries: number,
  quotations: number,
): boolean {
  const workspaceMode = getWorkspaceMode();
  if (workspaceMode === "empty") return false;

  const empty = projects === 0 && customers === 0 && enquiries === 0 && quotations === 0;
  if (!empty) return false;

  if (isAutoSeedPending()) return true;
  if (isAutoSeedDone()) return false;

  return true;
}

/**
 * On empty business workspace boot, auto-starts exhaustive data generation in the background.
 * Shows a non-blocking progress banner while running.
 */
export function DataEngineAutoBootstrap() {
  const appData = useAppData();
  const { start } = useAutonomousEngine();
  const status = useDataEngineStore((s) => s.status);
  const activeFlow = useDataEngineStore((s) => s.activeFlow);
  const dismissed = useDataEngineStore((s) => s.bannerDismissed);
  const setBannerDismissed = useDataEngineStore((s) => s.setBannerDismissed);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (status !== "idle") return;

    const shouldStart = shouldAutoStartGeneration(
      appData.projects.length,
      appData.customers.length,
      appData.enquiries.length,
      appData.quotations.length,
    );
    if (!shouldStart) return;

    startedRef.current = true;
    clearAutoSeedPending();
    resetExhaustiveGeneratorState();
    useDataEngineStore.getState().clearState();
    useDataEngineStore.getState().setBannerDismissed(false);
    start();
  }, [
    appData.projects.length,
    appData.customers.length,
    appData.enquiries.length,
    appData.quotations.length,
    status,
    start,
  ]);

  useEffect(() => {
    if (status === "idle" && isExhaustiveGenerationComplete()) {
      markAutoSeedDone();
    }
  }, [status]);

  if (status !== "running" || dismissed) {
    return null;
  }

  const displayProgress = getExhaustiveGenerationProgressPercent();

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 w-[min(100%,28rem)] -translate-x-1/2 rounded-lg border border-border bg-card p-4 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium">Generating demo data…</p>
            {activeFlow && (
              <p className="truncate text-xs text-muted-foreground">{activeFlow}</p>
            )}
            <Progress value={displayProgress} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {displayProgress}% — you can keep using the app
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Dismiss banner"
          onClick={() => setBannerDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

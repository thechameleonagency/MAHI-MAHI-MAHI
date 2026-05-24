import { useState } from "react";
import { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";
import { useAutonomousEngine } from "@/lib/data-engine/useAutonomousEngine";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { Play, Pause, Square, Trash2, Activity, AlertCircle, FileText, Briefcase, IndianRupee, ScrollText, RefreshCw } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { persistRegenerateBusinessBoot } from "@/lib/defaultAppBoot";
import { isExhaustiveGenerationComplete, getExhaustiveTotalPermutations, getExhaustiveGeneratorIndex, getShowcaseScenarioCount, getPipelineExtraCount } from "@/lib/data-engine/exhaustiveGenerator";
import { isAutoSeedDone } from "@/lib/data-engine/autoSeedStorage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SuperAdminDataEngine() {
  const store = useDataEngineStore();
  const { start, pause, stop } = useAutonomousEngine();
  const { resetToDefaults } = useAppData();
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);

  const confirmClear = () => {
    resetToDefaults();
    store.clearState();
  };

  const confirmClearAndRegenerate = () => {
    persistRegenerateBusinessBoot();
    store.clearState();
    window.location.reload();
  };

  const generationComplete =
    isAutoSeedDone() && isExhaustiveGenerationComplete() && store.status === "idle";
  const totalSteps = getExhaustiveTotalPermutations();
  const completedSteps = Math.min(getExhaustiveGeneratorIndex() + (isExhaustiveGenerationComplete() ? getPipelineExtraCount() : 0), totalSteps);
  const showcaseCount = getShowcaseScenarioCount();
  const pipelineCount = getPipelineExtraCount();

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Super Admin", to: "/super-admin" }, { label: "Data Engine" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Autonomous Business Simulator
                  </CardTitle>
                <CardDescription>
                  On first open the engine auto-generates 100% demo data in the background. Use controls below to pause, clear, or regenerate.
                </CardDescription>
                </div>
                <Badge variant={
                  store.status === "running" ? "default" :
                  store.status === "error" ? "destructive" :
                  store.status === "paused" ? "secondary" : "outline"
                } className="text-sm px-3 py-1">
                  {store.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex gap-4 flex-wrap">
                <Button 
                  onClick={start} 
                  disabled={store.status === "running"}
                  className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                >
                  <Play className="h-4 w-4" /> Start Generation
                </Button>
                <Button 
                  onClick={pause} 
                  disabled={store.status !== "running"}
                  variant="outline"
                  className="gap-2"
                >
                  <Pause className="h-4 w-4" /> Pause
                </Button>
                <Button 
                  onClick={stop} 
                  disabled={store.status === "idle"}
                  variant="secondary"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" /> Stop
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={() => setIsRegenerateConfirmOpen(true)}
                  variant="outline"
                  className="gap-2"
                  disabled={store.status === "running"}
                >
                  <RefreshCw className="h-4 w-4" /> Clear &amp; Regenerate
                </Button>
                <Button 
                  onClick={() => setIsClearConfirmOpen(true)} 
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Clear All Data
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Generation progress</span>
                  <span className="font-medium">{store.progress}%</span>
                </div>
                <Progress value={store.progress} className="h-2" />
                {generationComplete && (
                  <p className="text-sm text-success font-medium">
                    100% complete — {showcaseCount} showcase scenarios + {pipelineCount} pipeline extras seeded.
                  </p>
                )}
                {!generationComplete && store.status === "running" && (
                  <p className="text-xs text-muted-foreground">
                    Master data bootstrap, then {showcaseCount} curated scenarios ({completedSteps}/{totalSteps} steps).
                  </p>
                )}
              </div>

              {store.activeFlow && (
                <div className="p-4 rounded-md border border-primary/20 bg-primary/5 flex items-start gap-3">
                  <Activity className="h-5 w-5 text-primary mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-semibold text-primary text-sm">Active Flow</h4>
                    <p className="text-sm text-muted-foreground">{store.activeFlow}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg">Event Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-[120px]">Time</TableHead>
                    <TableHead className="w-[100px]">Level</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {store.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No logs yet. Start the engine to generate data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    store.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.level === "error" ? "destructive" :
                            log.level === "success" ? "default" :
                            log.level === "warn" ? "secondary" : "outline"
                          } className={log.level === "success" ? "bg-success hover:bg-success/80" : ""}>
                            {log.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.message}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales & Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CounterRow icon={<ScrollText />} label="Enquiries" value={store.counters.enquiries} />
              <CounterRow icon={<FileText />} label="Quotations" value={store.counters.quotations} />
              <CounterRow icon={<Briefcase />} label="Projects" value={store.counters.projects} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Finance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CounterRow icon={<FileText />} label="Invoices" value={store.counters.invoices} />
              <CounterRow icon={<IndianRupee />} label="Payments" value={store.counters.payments} />
              <CounterRow icon={<IndianRupee />} label="Expenses" value={store.counters.expenses} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operations & HR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CounterRow icon={<Activity />} label="Blockages" value={store.counters.blockages} />
              <CounterRow icon={<Activity />} label="Tickets" value={store.counters.tickets} />
              <CounterRow icon={<Briefcase />} label="Change Requests" value={store.counters.changeRequests} />
              <CounterRow icon={<Briefcase />} label="Vendors" value={store.counters.vendors} />
              <CounterRow icon={<Briefcase />} label="Employees" value={store.counters.employees} />
              <CounterRow icon={<Briefcase />} label="Subcontractors" value={store.counters.subcontractors} />
              <CounterRow icon={<FileText />} label="Site Templates" value={store.counters.siteChecklistTemplates} />
              <CounterRow icon={<Activity />} label="Attendance" value={store.counters.attendanceLogs} />
              <CounterRow icon={<Activity />} label="Site Visits" value={store.counters.siteVisits} />
            </CardContent>
          </Card>

          {store.status === "error" && (
            <Card className="border-destructive bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-destructive flex items-center gap-2 text-base">
                  <AlertCircle className="h-5 w-5" />
                  Engine Fault
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive-foreground font-medium">
                  The simulation encountered a business logic or validation error and stopped.
                  Check the logs for details.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DestructiveConfirmDialog
        open={isClearConfirmOpen}
        onOpenChange={setIsClearConfirmOpen}
        title="Clear all data?"
        description="This resets the workspace to empty with no auto-generation. All local business rows, engine progress, and event logs will be wiped."
        confirmLabel="Clear all data"
        onConfirm={confirmClear}
      />

      <DestructiveConfirmDialog
        open={isRegenerateConfirmOpen}
        onOpenChange={setIsRegenerateConfirmOpen}
        title="Clear and regenerate demo data?"
        description="All current data will be wiped and 100% demo data generation will run in the background after the page reloads."
        typedConfirmation="REGENERATE"
        confirmLabel="Clear & regenerate"
        onConfirm={confirmClearAndRegenerate}
      />
    </PageShell>
  );
}

function CounterRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground h-5 w-5 *:h-full *:w-full">
          {icon}
        </div>
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold text-lg">{value}</span>
    </div>
  );
}

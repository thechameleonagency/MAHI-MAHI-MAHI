import { useState } from "react";
import { CheckCircle2, Play, ShieldAlert, ShieldCheck, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { buildSiteReadinessUpdate } from "@/lib/siteReadinessNormalize";
import { formatSessionActorLabel } from "@/lib/sessionActorStorage";
import { canStartProject } from "@/domain/stateMachines/projectStateMachine";
import { toast } from "@/hooks/use-toast";
import type { Project } from "@/types/project";
import { ScheduleInstallationSheet } from "./ScheduleInstallationSheet";

/**
 * Phase 2.5 — ProjectStartActions
 *
 * Three pills rendered on the ProjectDetail header strip when the project is in
 * the "New" lifecycle (i.e., not yet started):
 *
 *  - Schedule installation: opens ScheduleInstallationSheet (date + team/employee).
 *  - Site readiness: Ready/Not Ready + optional note. Required before Start.
 *    Auto-flips to ready when all execution-site checklist lines are dispatched (E5).
 *  - Start project: disabled until siteReadiness.ready === true. Super_admin can
 *    override via a written reason.
 *
 * After project is started:
 *  - Schedule installation stays (re-schedule for re-visits).
 *  - Site readiness stays (read-only state shown as chip).
 *  - Start project is replaced with a "Project running since {date}" status pill.
 */

export function ProjectStartActions({ project }: { project: Project }) {
  const { updateProject, markProjectCommissionAccrualsPayable } = useAppData();
  const { currentRole, sessionUserId } = useAppSession();

  const ready = project.siteReadiness?.ready === true;
  const lifecycleKey = project.lifecycleStatus;
  const isNew = lifecycleKey === "New";
  const isStarted = Boolean(project.startedAt);

  const [readinessOpen, setReadinessOpen] = useState(false);
  const [readinessNote, setReadinessNote] = useState(project.siteReadiness?.note ?? "");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const handleSetReadiness = (nextReady: boolean) => {
    const snapshot = buildSiteReadinessUpdate({
      ready: nextReady,
      note: readinessNote,
      markedBy: sessionUserId,
    });
    updateProject(project.id, { siteReadiness: snapshot });
    toast({
      title: nextReady ? "Site marked as ready" : "Site marked as not ready",
      description: [
        `Recorded by ${formatSessionActorLabel(snapshot.markedBy)}`,
        readinessNote.trim() ? readinessNote.trim() : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    setReadinessOpen(false);
  };

  const readinessAttribution =
    project.siteReadiness?.markedAt && project.siteReadiness.markedBy
      ? `${formatSessionActorLabel(project.siteReadiness.markedBy)} · ${new Date(
          project.siteReadiness.markedAt,
        ).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`
      : null;

  const handleStart = () => {
    const guard = canStartProject(lifecycleKey, ready, currentRole);
    if (!guard.ok) {
      toast({ title: "Cannot start project", description: guard.reason, variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    updateProject(project.id, {
      startedAt: now,
      lifecycleStatus: "In Progress",
      status: "Ongoing",
    });
    markProjectCommissionAccrualsPayable(project.id, project.quotationId);
    toast({ title: "Project started", description: `${project.name} is now active.` });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Site Readiness */}
      <Button
        variant={ready ? "outline" : "outline"}
        size="sm"
        className={`h-8 ${ready ? "border-success/40 text-success" : "border-warning/40 text-warning"}`}
        onClick={() => setReadinessOpen(true)}
      >
        {ready ? <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />}
        {ready ? "Site ready" : "Site readiness"}
      </Button>

      {/* Schedule installation (always available) */}
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={() => setScheduleOpen(true)}
      >
        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
        Schedule installation
      </Button>

      {/* Start project — disabled until ready, hidden after started */}
      {!isStarted && isNew && (
        <Button
          variant="default"
          size="sm"
          className="h-8"
          disabled={!ready}
          onClick={handleStart}
          title={!ready ? "Mark site as ready first" : undefined}
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Start project
        </Button>
      )}
      {isStarted && (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Started {new Date(project.startedAt!).toLocaleDateString()}
        </Badge>
      )}

      {/* Readiness dialog */}
      <Dialog open={readinessOpen} onOpenChange={setReadinessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Site readiness</DialogTitle>
            <DialogDescription>
              Mark the site ready before starting the project. Add a note if site needs further work.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="readiness-note" className="text-sm">
              Note (optional)
            </Label>
            <Textarea
              id="readiness-note"
              value={readinessNote}
              onChange={(e) => setReadinessNote(e.target.value)}
              placeholder="e.g. Awaiting roof clearance / cabling pending / ready for installation tomorrow"
              rows={3}
            />
            {readinessAttribution ? (
              <p className="text-xs text-muted-foreground">
                Last update: {readinessAttribution}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleSetReadiness(false)}>
              Mark not ready
            </Button>
            <Button onClick={() => handleSetReadiness(true)}>
              Mark ready
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule sheet */}
      <ScheduleInstallationSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        project={project}
      />
    </div>
  );
}

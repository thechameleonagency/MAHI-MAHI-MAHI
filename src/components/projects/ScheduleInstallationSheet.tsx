import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, AlertTriangle, Users, User } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Project } from "@/types/project";

/**
 * Phase 2.5 — ScheduleInstallationSheet
 *
 * Schedules an installation visit to a project's site on a specific date with
 * either a team or a set of employees. Conflict detection is visual-only: if
 * the same team/employee already has a schedule on the same date (for any
 * project), a warning chip is shown — but the user can still proceed.
 */

export function ScheduleInstallationSheet({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: Project;
}) {
  const {
    addScheduledInstallation,
    scheduledInstallations,
    teams,
    employees,
    projects,
  } = useAppData();

  const today = new Date().toISOString().slice(0, 10);
  const [scheduledDate, setScheduledDate] = useState(today);
  const [assignMode, setAssignMode] = useState<"team" | "employees">("team");
  const [teamId, setTeamId] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [notes, setNotes] = useState("");

  // Conflict detection: any active schedule on the same date with overlapping
  // team/employee assignment (across any project).
  const conflicts = useMemo(() => {
    const list = scheduledInstallations ?? [];
    const sameDate = list.filter(
      (s) =>
        s.status !== "cancelled" &&
        s.scheduledDate.slice(0, 10) === scheduledDate &&
        s.projectId !== project.id, // self-conflict is fine
    );
    const teamConflicts = teamId
      ? sameDate.filter((s) => s.teamId === teamId)
      : [];
    const employeeConflicts = selectedEmployees.length
      ? sameDate.filter(
          (s) =>
            s.employeeIds?.some((e) => selectedEmployees.includes(e)) ?? false,
        )
      : [];
    return { teamConflicts, employeeConflicts };
  }, [scheduledInstallations, scheduledDate, teamId, selectedEmployees, project.id]);

  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects],
  );

  const resetForm = () => {
    setScheduledDate(today);
    setAssignMode("team");
    setTeamId("");
    setSelectedEmployees([]);
    setNotes("");
  };

  const handleSubmit = () => {
    if (assignMode === "team" && !teamId) {
      toast({ title: "Select a team", variant: "destructive" });
      return;
    }
    if (assignMode === "employees" && selectedEmployees.length === 0) {
      toast({ title: "Select at least one employee", variant: "destructive" });
      return;
    }
    addScheduledInstallation({
      projectId: project.id,
      scheduledDate,
      teamId: assignMode === "team" ? teamId : undefined,
      employeeIds: assignMode === "employees" ? selectedEmployees : undefined,
      status: "scheduled",
      notes: notes.trim() || undefined,
    });
    toast({
      title: "Installation scheduled",
      description: `Scheduled for ${scheduledDate}${conflicts.teamConflicts.length || conflicts.employeeConflicts.length ? " (with conflict — overrode warning)" : ""}.`,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Schedule installation
          </SheetTitle>
          <SheetDescription>
            Pick a date and assign a team or specific people to {project.name}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sched-date">Date</Label>
            <Input
              id="sched-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Assign to</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={assignMode === "team" ? "default" : "outline"}
                onClick={() => setAssignMode("team")}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" /> Team
              </Button>
              <Button
                size="sm"
                variant={assignMode === "employees" ? "default" : "outline"}
                onClick={() => setAssignMode("employees")}
              >
                <User className="h-3.5 w-3.5 mr-1.5" /> Individual
              </Button>
            </div>
          </div>

          {assignMode === "team" ? (
            <div className="space-y-2">
              <Label htmlFor="sched-team">Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger id="sched-team">
                  <SelectValue placeholder="Pick a team" />
                </SelectTrigger>
                <SelectContent>
                  {(teams ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Employees</Label>
              <div className="max-h-48 overflow-y-auto rounded border p-2 space-y-1">
                {(employees ?? []).map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEmployees((prev) => [...prev, emp.id]);
                        } else {
                          setSelectedEmployees((prev) =>
                            prev.filter((id) => id !== emp.id),
                          );
                        }
                      }}
                    />
                    <span className="text-sm">{emp.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{emp.role}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Conflict banner — visual warning only, does not block */}
          {(conflicts.teamConflicts.length > 0 || conflicts.employeeConflicts.length > 0) && (
            <div className="rounded border border-warning/40 bg-warning/10 p-3 space-y-2">
              <div className="flex items-center gap-2 text-warning font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                Already booked for {scheduledDate}
              </div>
              {conflicts.teamConflicts.map((c) => (
                <Badge key={c.id} variant="outline" className="bg-background">
                  Team also at {projectsById[c.projectId]?.name ?? c.projectId}
                </Badge>
              ))}
              {conflicts.employeeConflicts.map((c) => (
                <Badge key={c.id} variant="outline" className="bg-background">
                  Person also at {projectsById[c.projectId]?.name ?? c.projectId}
                </Badge>
              ))}
              <p className="text-xs text-warning/80">
                You can still schedule — this is just a heads-up.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sched-notes">Notes (optional)</Label>
            <Textarea
              id="sched-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Carry extra ladders / customer prefers morning slot / second visit"
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Schedule</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

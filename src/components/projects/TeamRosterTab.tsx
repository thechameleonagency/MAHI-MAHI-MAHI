import { useState } from "react";
import { Plus, Trash2, Calendar, Users } from "lucide-react";
import { formatUiDate } from "@/lib/formatUiDate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Project, ProjectTeamAssignment } from "@/types/project";
import { TableEmptyRow } from "@/components/ui/TableEmptyRow";

interface TeamRosterTabProps {
  project: Project;
}

export function TeamRosterTab({ project }: TeamRosterTabProps) {
  const { teams, employees, assignTeamToProject, removeTeamFromProject, generateId } = useAppData();

  // Form state lives in a compact dialog now so the table reads cleanly without an always-visible form above it.
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [assignmentToRemove, setAssignmentToRemove] = useState<ProjectTeamAssignment | null>(null);

  const resetForm = () => {
    setSelectedTeamId("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
    setNotes("");
  };

  const handleAddAssignment = () => {
    if (!selectedTeamId) {
      toast({ title: "Select a team", variant: "destructive" });
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast({ title: "Invalid dates", description: "End date must be on or after start date", variant: "destructive" });
      return;
    }

    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) return;

    assignTeamToProject(project.id, {
      id: generateId("TA"),
      teamId: team.id,
      teamName: team.name,
      startDate,
      endDate,
      notes: notes.trim() || undefined,
    });

    resetForm();
    setAddOpen(false);
    toast({ title: "Team assigned", description: `${team.name} added to roster.` });
  };

  const getTeamMembers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return team.memberIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Team Roster
          </CardTitle>
          <Button size="sm" onClick={() => { resetForm(); setAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add team
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[200px]">Team</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.teamAssignments && project.teamAssignments.length > 0 ? (
                project.teamAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium text-primary">{assignment.teamName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {getTeamMembers(assignment.teamId).map((name, idx) => (
                          <Badge key={idx} variant="secondary" className="font-normal text-2xs px-1.5 py-0">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p className="font-semibold text-foreground">{formatUiDate(assignment.startDate, "dd MMM")} — {formatUiDate(assignment.endDate, "dd MMM, yyyy")}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{assignment.notes || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => setAssignmentToRemove(assignment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyRow
                  colSpan={5}
                  icon={Users}
                  title="No teams assigned yet"
                  description='Click "Add team" above to assign one.'
                />
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Assign team to project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger><SelectValue placeholder="Choose team" /></SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.status === "Active").map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">Start date</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase text-muted-foreground">End date</Label>
                <Input type="date" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Full project completion, or specific phase work..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAssignment}>
              <Plus className="h-4 w-4 mr-2" /> Add to roster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DestructiveConfirmDialog
        open={!!assignmentToRemove}
        onOpenChange={(open) => {
          if (!open) setAssignmentToRemove(null);
        }}
        title={
          assignmentToRemove
            ? `Remove ${assignmentToRemove.teamName} from roster?`
            : "Remove team from roster?"
        }
        description={
          assignmentToRemove ? (
            <>
              This removes <strong>{assignmentToRemove.teamName}</strong> from this project&apos;s roster (
              {formatUiDate(assignmentToRemove.startDate)} — {formatUiDate(assignmentToRemove.endDate)}).
              The team itself is not deleted — only this assignment.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (assignmentToRemove) {
            removeTeamFromProject(project.id, assignmentToRemove.id);
            toast({
              title: "Team removed",
              description: `${assignmentToRemove.teamName} removed from project roster.`,
            });
          }
          setAssignmentToRemove(null);
        }}
      />
    </div>
  );
}

import { useState } from "react";
import { Plus, Trash2, Calendar, Users, Info } from "lucide-react";
import { formatUiDate } from "@/lib/formatUiDate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Project } from "@/types/project";

interface TeamRosterTabProps {
  project: Project;
}

export function TeamRosterTab({ project }: TeamRosterTabProps) {
  const { teams, employees, assignTeamToProject, removeTeamFromProject, generateId } = useAppData();
  
  // Form State
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

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

    setSelectedTeamId("");
    setNotes("");
    toast({ title: "Team assigned", description: `${team.name} added to roster.` });
  };

  const getTeamMembers = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];
    return team.memberIds.map(id => employees.find(e => e.id === id)?.name).filter(Boolean);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="bg-primary/5 py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Assign Installation Team
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Choose team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.filter(t => t.status === "Active").map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">End Date</Label>
              <Input type="date" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
            </div>
            <Button onClick={handleAddAssignment} className="shadow-md shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              Add to Roster
            </Button>
          </div>
          <div className="mt-4">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Assignment Notes</Label>
            <Input 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="e.g. Full project completion, or specific phase work..." 
              className="mt-1 bg-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Active Team Roster
          </CardTitle>
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
                        <p className="text-muted-foreground text-2xs mt-0.5">Duration tracked individually</p>
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
                        onClick={() => {
                          if (confirm("Remove this team from the project roster?")) {
                            removeTeamFromProject(project.id, assignment.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="h-8 w-8 opacity-20" />
                      <p className="text-sm">No teams assigned to this project yet.</p>
                      <p className="text-xs">Add a team above to start tracking installation schedule.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

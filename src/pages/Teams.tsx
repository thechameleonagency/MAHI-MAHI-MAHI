import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users, UserPlus, Trash2, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { DEFAULT_TABLE_PAGE_SIZE, dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import type { Team } from "@/types/project";

const Teams = () => {
  const { teams, employees, projects, addTeam, updateTeam, deleteTeam, generateId } = useAppData();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  // Form State
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const projectsByTeamId = useMemo(() => {
    const m = new Map<string, { id: string; name: string }[]>();
    for (const p of projects || []) {
      for (const a of p.teamAssignments ?? []) {
        const list = m.get(a.teamId) ?? [];
        if (!list.some((x) => x.id === p.id)) {
          list.push({ id: p.id, name: p.name });
        }
        m.set(a.teamId, list);
      }
    }
    return m;
  }, [projects]);

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const teamsList = teams || [];
    return teamsList.filter((team) => {
      return !q || team.name.toLowerCase().includes(q) || (team.description || "").toLowerCase().includes(q);
    });
  }, [teams, searchQuery]);

  const { pagedItems, safePage } = usePagedSlice(filteredTeams, page, pageSize);

  const resetForm = () => {
    setTeamName("");
    setTeamDescription("");
    setSelectedMemberIds([]);
    setSelectedTeam(null);
  };

  const handleOpenEdit = (team: Team) => {
    setSelectedTeam(team);
    setTeamName(team.name);
    setTeamDescription(team.description || "");
    setSelectedMemberIds(team.memberIds);
    setIsAddOpen(true);
  };

  const handleSaveTeam = () => {
    if (!teamName.trim()) {
      toast({ title: "Missing fields", description: "Team name is required.", variant: "destructive" });
      return;
    }

    if (selectedTeam) {
      updateTeam(selectedTeam.id, {
        name: teamName.trim(),
        description: teamDescription.trim(),
        memberIds: selectedMemberIds,
      });
      toast({ title: "Team updated", description: "Team details have been saved." });
    } else {
      addTeam({
        id: generateId("TEAM"),
        name: teamName.trim(),
        description: teamDescription.trim(),
        memberIds: selectedMemberIds,
        createdAt: new Date().toISOString().split("T")[0],
        status: "Active",
      });
      toast({ title: "Team created", description: "New installation team is now ready for assignments." });
    }
    setIsAddOpen(false);
    resetForm();
  };

  const toggleMember = (employeeId: number) => {
    setSelectedMemberIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId) 
        : [...prev, employeeId]
    );
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "HR", to: "/employees" }, { label: "Teams" }]}
        subRow={
          <InlineKpiStrip
            className="w-full min-w-0 flex-wrap justify-start"
            items={[
              { label: "Total Teams", value: (teams || []).length },
              { label: "Active Members", value: (teams || []).reduce((acc, t) => acc + t.memberIds.length, 0) },
            ]}
          />
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </StickyPageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team name or description"
            className="pl-9"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTableShell
        maxHeight={listTableViewportMaxHeight(pageSize)}
        scrollResetKey={`${safePage}-${pageSize}-${filteredTeams.length}`}
        footer={
          <TablePaginationBar
            page={safePage}
            pageSize={pageSize}
            total={filteredTeams.length}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        }
      >
        <TableHeader>
          <TableRow className={dataTableClasses.headRow}>
            <TableHead>Team Name</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagedItems.map((team) => (
            <TableRow key={team.id} className="align-top">
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium text-primary">{team.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{team.description || "Installation team"}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                  {team.memberIds.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No members assigned</span>
                  ) : (
                    team.memberIds.map((id) => {
                      const emp = (employees || []).find(e => e.id === id);
                      return (
                        <Badge key={id} variant="secondary" className="font-normal text-2xs">
                          {emp?.name || `ID: ${id}`}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex max-w-[min(100vw,22rem)] flex-col gap-1">
                  {(projectsByTeamId.get(team.id) ?? []).length === 0 ? (
                    <span className="text-sm text-muted-foreground">No project assignments</span>
                  ) : (
                    (projectsByTeamId.get(team.id) ?? []).map((p) => (
                      <Link
                        key={p.id}
                        to={`/projects/${p.id}`}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    ))
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={team.status === "Active" ? "outline" : "secondary"} className={team.status === "Active" ? "border-primary text-primary" : ""}>
                  {team.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenEdit(team)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-destructive" 
                    type="button"
                    onClick={() => setTeamToDelete(team)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {pagedItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                No teams found. Create one to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </DataTableShell>

      <Sheet open={isAddOpen} onOpenChange={(v) => { if(!v) resetForm(); setIsAddOpen(v); }}>
        <AppSheetContent size="xl" layout="form">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              {selectedTeam ? "Edit Team" : "Create New Team"}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6 pt-2">
            <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Team Name *</Label>
                <Input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Installation Team Alpha" className="bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <Input value={teamDescription} onChange={(event) => setTeamDescription(event.target.value)} placeholder="Short description of the team's purpose" className="bg-white" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Select Team Members
                </Label>
                <span className="text-2xs text-muted-foreground uppercase tracking-wider">{selectedMemberIds.length} selected</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                {(employees || []).filter(e => e.status === "Active").map((emp) => (
                  <div 
                    key={emp.id} 
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/30 ${
                      selectedMemberIds.includes(emp.id) ? "bg-primary/5 border-primary/50 shadow-sm" : "bg-white border-border/60"
                    }`}
                    onClick={() => toggleMember(emp.id)}
                  >
                    <Checkbox checked={selectedMemberIds.includes(emp.id)} onCheckedChange={() => toggleMember(emp.id)} className="rounded-full" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-2xs text-muted-foreground uppercase tracking-tight">{emp.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-6 mt-auto">
            <Button variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 shadow-lg shadow-primary/20" onClick={handleSaveTeam}>
              {selectedTeam ? "Update Team" : "Create Team"}
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team?</AlertDialogTitle>
            <AlertDialogDescription>
              {teamToDelete ? `This will remove “${teamToDelete.name}” and unlink it from assignments. This cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (teamToDelete) {
                  deleteTeam(teamToDelete.id);
                  toast({ title: "Team deleted" });
                }
                setTeamToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
};

export default Teams;

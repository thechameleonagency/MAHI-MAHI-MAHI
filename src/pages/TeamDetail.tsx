import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, Briefcase, Calendar, Pencil, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { buttonRoles } from "@/lib/buttonRoles";

const TeamDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { teams, employees, projects, updateTeam } = useAppData();

  const team = useMemo(() => (teams || []).find((t) => t.id === id), [teams, id]);

  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLeadId, setEditLeadId] = useState<string>("");
  const [memberDraft, setMemberDraft] = useState<number[]>([]);

  const teamWorkHistory = useMemo(() => {
    if (!team) return [] as Array<{ projectId: string; projectName: string; startDate: string; endDate: string; status: string; notes?: string }>;
    const rows: Array<{ projectId: string; projectName: string; startDate: string; endDate: string; status: string; notes?: string }> = [];
    for (const p of projects || []) {
      for (const a of p.teamAssignments ?? []) {
        if (a.teamId === team.id) {
          rows.push({
            projectId: p.id,
            projectName: p.name,
            startDate: a.startDate || "",
            endDate: a.endDate || "",
            status: p.status || p.lifecycleStatus || "—",
            notes: a.notes,
          });
        }
      }
    }
    rows.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    return rows;
  }, [team, projects]);

  const projectsWorkedOn = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; name: string; status: string }> = [];
    for (const r of teamWorkHistory) {
      if (seen.has(r.projectId)) continue;
      seen.add(r.projectId);
      out.push({ id: r.projectId, name: r.projectName, status: r.status });
    }
    return out;
  }, [teamWorkHistory]);

  if (!team) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Team not found.</p>
          <Button variant="outline" onClick={() => navigate("/teams")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Teams
          </Button>
        </div>
      </PageShell>
    );
  }

  const members = team.memberIds
    .map((mid) => (employees || []).find((e) => e.id === mid))
    .filter(Boolean);
  const lead = team.leadId ? (employees || []).find((e) => e.id === team.leadId) : undefined;

  const openEdit = () => {
    setEditName(team.name);
    setEditDescription(team.description ?? "");
    setEditLeadId(team.leadId ? String(team.leadId) : "");
    setEditOpen(true);
  };

  const openMembers = () => {
    setMemberDraft([...team.memberIds]);
    setMembersOpen(true);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast({ title: "Team name required", variant: "destructive" });
      return;
    }
    updateTeam(team.id, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      leadId: editLeadId ? Number.parseInt(editLeadId, 10) : undefined,
    });
    toast({ title: "Team updated" });
    setEditOpen(false);
  };

  const saveMembers = () => {
    updateTeam(team.id, { memberIds: memberDraft });
    toast({ title: "Members updated" });
    setMembersOpen(false);
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "HR", to: "/employees" },
          { label: "Teams", to: "/teams" },
          { label: team.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap"
            items={[
              { label: "Members", value: team.memberIds.length },
              { label: "Projects worked on", value: projectsWorkedOn.length },
              { label: "Work logs", value: teamWorkHistory.length },
            ]}
          />
        }
      >
        <Button variant="outline" size="sm" onClick={() => navigate("/teams")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button {...buttonRoles.tertiary} onClick={openEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Edit team
        </Button>
        <Button {...buttonRoles.secondary} onClick={openMembers}>
          <UserPlus className="mr-2 h-4 w-4" /> Manage members
        </Button>
      </StickyPageHeader>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{team.name}</CardTitle>
              {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
            </div>
            <Badge variant={team.status === "Active" ? "outline" : "secondary"} className={team.status === "Active" ? "border-primary text-primary" : ""}>
              {team.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {lead && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Team lead:</span>
              <span className="font-medium">{lead.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span>{team.createdAt}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members assigned yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((emp) => emp && (
                <Badge key={emp.id} variant="secondary" className="font-normal">
                  {emp.name}
                  {team.leadId === emp.id ? " (lead)" : ""}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Projects worked on ({projectsWorkedOn.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projectsWorkedOn.length === 0 ? (
            <p className="text-sm text-muted-foreground">This team has not been assigned to any project yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {projectsWorkedOn.map((p) => (
                <Link key={p.id} to={`/projects/${p.id}`}>
                  <Badge variant="outline" className="hover:bg-muted/60 cursor-pointer">
                    {p.name} <span className="ml-1 text-2xs text-muted-foreground">({p.status})</span>
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Work history
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamWorkHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignment history recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Start date</TableHead>
                  <TableHead>End date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamWorkHistory.map((row, idx) => (
                  <TableRow key={`${row.projectId}-${row.startDate}-${idx}`}>
                    <TableCell className="text-sm">{row.startDate || "—"}</TableCell>
                    <TableCell className="text-sm">{row.endDate || "—"}</TableCell>
                    <TableCell>
                      <Link to={`/projects/${row.projectId}`} className="text-primary hover:underline">
                        {row.projectName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit team</SheetTitle>
            <SheetDescription>Update team name, lead, and notes.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={editLeadId} onValueChange={setEditLeadId}>
                <SelectTrigger><SelectValue placeholder="Optional lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(employees ?? []).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Manage members</SheetTitle>
            <SheetDescription>Select employees on this team.</SheetDescription>
          </SheetHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2 py-4">
            {(employees ?? []).map((emp) => (
              <label key={emp.id} className="flex items-center gap-2 rounded border px-3 py-2 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={memberDraft.includes(emp.id)}
                  onCheckedChange={(checked) => {
                    setMemberDraft((prev) =>
                      checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id),
                    );
                  }}
                />
                <span className="text-sm">{emp.name}</span>
              </label>
            ))}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setMembersOpen(false)}>Cancel</Button>
            <Button onClick={saveMembers}>Save members</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default TeamDetail;

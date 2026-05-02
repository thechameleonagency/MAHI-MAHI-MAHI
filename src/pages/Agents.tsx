import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Eye, Phone, Mail, MapPin, IndianRupee, UserCheck, Trash2, ExternalLink, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToastAction } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import type { Agent } from "@/types/finance";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const Agents = () => {
  const navigate = useNavigate();
  const { agents, projects, addAgent, updateAgent, deleteAgent, generateId } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [rateType, setRateType] = useState<"per-kw" | "per-project">("per-kw");
  const [ratePerKw, setRatePerKw] = useState("1000");
  const [flatRate, setFlatRate] = useState("");
  const [agentPhoto, setAgentPhoto] = useState("");

  const resetForm = () => {
    setName(""); setPhone(""); setEmail(""); setAddress("");
    setRateType("per-kw"); setRatePerKw("1000"); setFlatRate(""); setAgentPhoto("");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAgentPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Compute agent stats from projects
  const getAgentStats = (agentId: string) => {
    const agentProjects = projects.filter(p => p.agentId === agentId);
    const ongoing = agentProjects.filter(p => p.status === "Ongoing").length;
    const completed = agentProjects.filter(p => p.status === "Completed").length;
    const totalCommission = agentProjects.reduce((s, p) => s + (p.commissionAmount || 0), 0);
    const paidCommission = agentProjects.reduce((s, p) => s + (p.commissionPaid || 0), 0);
    return { total: agentProjects.length, ongoing, completed, totalCommission, paidCommission, pending: totalCommission - paidCommission };
  };

  const handleAdd = () => {
    if (!name || !phone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    const newAgent: Agent = {
      id: generateId("AGT"),
      name, phone, email, address,
      photo: agentPhoto || undefined,
      rateType,
      ratePerKw: parseFloat(ratePerKw) || 1000,
      flatRate: rateType === "per-project" ? parseFloat(flatRate) || 0 : undefined,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    addAgent(newAgent);
    setIsAddOpen(false);
    resetForm();
    toast({ title: "Agent Added", description: `${name} has been added` });
  };

  const handleEdit = () => {
    if (!selectedAgent || !name || !phone) return;
    updateAgent(selectedAgent.id, {
      name, phone, email, address,
      photo: agentPhoto || undefined,
      rateType,
      ratePerKw: parseFloat(ratePerKw) || 1000,
      flatRate: rateType === "per-project" ? parseFloat(flatRate) || 0 : undefined,
    });
    setIsEditOpen(false);
    resetForm();
    toast({ title: "Agent Updated", description: `${name} has been updated` });
  };

  const openEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setName(agent.name); setPhone(agent.phone); setEmail(agent.email || "");
    setAddress(agent.address); setRateType(agent.rateType);
    setRatePerKw(agent.ratePerKw.toString());
    setFlatRate(agent.flatRate?.toString() || "");
    setAgentPhoto(agent.photo || "");
    setIsEditOpen(true);
  };


  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.phone.includes(searchQuery);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const agentTotalPages = Math.max(1, Math.ceil(filtered.length / tablePageSize) || 1);
  const safeAgentPage = Math.min(tablePage, agentTotalPages);
  const pagedAgents = filtered.slice((safeAgentPage - 1) * tablePageSize, safeAgentPage * tablePageSize);
  useEffect(() => {
    setTablePage((p) => Math.min(p, agentTotalPages));
  }, [agentTotalPages]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const allStats = agents.map(a => getAgentStats(a.id));
    return {
      totalAgents: agents.length,
      totalProjects: allStats.reduce((s, st) => s + st.total, 0),
      totalCommission: allStats.reduce((s, st) => s + st.totalCommission, 0),
      pendingCommission: allStats.reduce((s, st) => s + st.pending, 0),
    };
  }, [agents, projects]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  const AgentFormFields = () => (
    <div className="space-y-4">
      {/* Photo Upload */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          {agentPhoto ? (
            <AvatarImage src={agentPhoto} alt="Agent photo" />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
            {name ? name.charAt(0) : <Camera className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <Label className="cursor-pointer text-primary text-sm hover:underline">
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {agentPhoto ? "Change Photo" : "Upload Photo"}
          </Label>
          {agentPhoto && (
            <button type="button" onClick={() => setAgentPhoto("")} className="text-xs text-destructive hover:underline block">Remove</button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
      </div>
      <div className="space-y-2">
        <Label>Commission Rate Type</Label>
        <Select value={rateType} onValueChange={(v: "per-kw" | "per-project") => setRateType(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="per-kw">Per kW</SelectItem>
            <SelectItem value="per-project">Per Project (Flat)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rateType === "per-kw" ? (
        <div className="space-y-2">
          <Label>Rate per kW (₹)</Label>
          <Input type="number" value={ratePerKw} onChange={(e) => setRatePerKw(e.target.value)} placeholder="1000" />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Flat Rate per Project (₹)</Label>
          <Input type="number" value={flatRate} onChange={(e) => setFlatRate(e.target.value)} placeholder="5000" />
        </div>
      )}
    </div>
  );

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Sales" }, { label: "Agents" }]}
        subRow={
          <>
            <div className="flex w-full min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="relative max-w-full flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Name or phone"
                  className="h-9 border-border bg-muted/50 pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setTablePage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full bg-muted/50 sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Agents", value: summaryStats.totalAgents },
                { label: "Projects", value: summaryStats.totalProjects },
                { label: "Commission", value: formatCurrency(summaryStats.totalCommission) },
                { label: "Pending", value: formatCurrency(summaryStats.pendingCommission) },
                { label: "Rows", value: filtered.length },
              ]}
            />
          </>
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </StickyPageHeader>

      <DataTableShell
            maxHeight={listTableViewportMaxHeight(tablePageSize)}
            scrollResetKey={`${safeAgentPage}-${tablePageSize}-${filtered.length}`}
            footer={
              <TablePaginationBar
                page={safeAgentPage}
                pageSize={tablePageSize}
                total={filtered.length}
                onPageChange={setTablePage}
                onPageSizeChange={(n) => {
                  setTablePageSize(n);
                  setTablePage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Agent</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedAgents.map((agent) => {
                const stats = getAgentStats(agent.id);
                return (
                  <TableRow key={agent.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 border border-primary/20">
                          {agent.photo ? <AvatarImage src={agent.photo} alt={agent.name} /> : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {agent.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{agent.name}</p>
                          {agent.address && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {agent.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{agent.phone}</TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[140px]">{agent.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {agent.rateType === "per-kw" ? `₹${agent.ratePerKw.toLocaleString()}/kW` : `₹${(agent.flatRate || 0).toLocaleString()}/proj`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{stats.total}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(stats.totalCommission)}</TableCell>
                    <TableCell className={`text-right text-sm ${stats.pending > 0 ? "text-amber-600" : ""}`}>
                      {formatCurrency(stats.pending)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.status === "active" ? "default" : "secondary"} className="capitalize">
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(agent)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/agents/${agent.id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => {
                            toast({
                              title: "Delete Agent?",
                              description: `Are you sure you want to delete ${agent.name}? This cannot be undone.`,
                              variant: "destructive",
                              action: (
                                <ToastAction altText="Delete" onClick={() => {
                                  deleteAgent(agent.id);
                                  toast({ title: "Agent Deleted", description: "Agent has been removed" });
                                }}>
                                  Delete
                                </ToastAction>
                              )
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTableShell>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No agents found</p>
          <Button className="mt-4" onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Agent
          </Button>
        </div>
      )}

      {/* Add Agent Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader><SheetTitle>Add New Agent</SheetTitle></SheetHeader>
          <AgentFormFields />
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Agent</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Agent Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader><SheetTitle>Edit Agent</SheetTitle></SheetHeader>
          <AgentFormFields />
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Deleted AlertDialog */}
    </PageShell>
  );
};

export default Agents;

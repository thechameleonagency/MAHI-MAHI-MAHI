import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Search, Calendar, User, 
  ExternalLink, Building2, IndianRupee, 
  LayoutGrid, List as ListIcon, Eye, Briefcase, FileText
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import type { Project } from "@/types/project";

const Projects = () => {
  const navigate = useNavigate();
  const { projects, getProjectEligibleQuotations, createProjectFromConfirmedQuotation, generateId } = useAppData();
  
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const eligibleQuotations = useMemo(() => getProjectEligibleQuotations(), [getProjectEligibleQuotations, projects]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  // Filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesType = typeFilter === "all" || p.category === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / tablePageSize) || 1);
  
  useEffect(() => {
    setTablePage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedProjects = filteredProjects.slice((tablePage - 1) * tablePageSize, tablePage * tablePageSize);

  const getStatusBadge = (status: Project["status"]) => {
    const styles: Record<string, string> = {
      "Ongoing": "bg-blue-500/10 text-blue-500 border-0",
      "Completed": "bg-primary/10 text-primary border-0",
      "On Hold": "bg-amber-500/10 text-amber-500 border-0",
      "Cancelled": "bg-destructive/10 text-destructive border-0",
    };
    return <Badge className={styles[status] || "bg-muted text-muted-foreground"}>{status}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "residential": return <Building2 className="h-4 w-4 text-amber-500" />;
      case "commercial": return <Building2 className="h-4 w-4 text-blue-500" />;
      case "industrial": return <Building2 className="h-4 w-4 text-purple-500" />;
      default: return <Building2 className="h-4 w-4" />;
    }
  };

  const stats = {
    total: projects.length,
    ongoing: projects.filter(p => p.status === "Ongoing").length,
    completed: projects.filter(p => p.status === "Completed").length,
    totalKW: projects.reduce((sum, p) => sum + (parseFloat(p.capacity) || 0), 0).toFixed(1),
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Projects" }]}
        subRow={
          <InlineKpiStrip
            items={[
              { label: "Total Projects", value: stats.total },
              { label: "Ongoing", value: stats.ongoing },
              { label: "Completed", value: stats.completed },
              { label: "Total Capacity", value: `${stats.totalKW} kW` },
            ]}
          />
        }
      >
        <div className="flex items-center gap-2">
          <div className="flex bg-muted p-1 rounded-md">
            <Button 
              variant={viewMode === "table" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("table")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setIsCreateProjectOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </StickyPageHeader>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects, clients..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Ongoing">Ongoing</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
              <SelectItem value="commercial">Commercial</SelectItem>
              <SelectItem value="industrial">Industrial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "table" ? (
        <DataTableShell
          maxHeight={listTableViewportMaxHeight(tablePageSize)}
          footer={
            <TablePaginationBar
              page={tablePage}
              pageSize={tablePageSize}
              total={filteredProjects.length}
              onPageChange={setTablePage}
              onPageSizeChange={setTablePageSize}
            />
          }
        >
          <TableHeader>
            <TableRow className={dataTableClasses.headRow}>
              <TableHead>Project ID</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedProjects.map(project => (
              <TableRow key={project.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                <TableCell className="font-mono text-xs">{project.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(project.category)}
                    <span className="font-medium">{project.name}</span>
                  </div>
                </TableCell>
                <TableCell>{project.client}</TableCell>
                <TableCell>{project.capacity}</TableCell>
                <TableCell>{getStatusBadge(project.status)}</TableCell>
                <TableCell className="text-muted-foreground">{project.startDate}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedProjects.map(project => (
            <Card key={project.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {getCategoryIcon(project.category)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{project.id}</p>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{project.client}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span>{project.capacity} System</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Started {project.startDate}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-between items-center pt-4 border-t">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    View Details
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        <CreateProjectModal 
        open={isCreateProjectOpen} 
        onOpenChange={setIsCreateProjectOpen} 
      />
    </PageShell>
  );
};

export default Projects;

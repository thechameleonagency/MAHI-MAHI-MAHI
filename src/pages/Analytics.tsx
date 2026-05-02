import { useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Download } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import ExportHeader from "@/components/ExportHeader";
import ExportFooter from "@/components/ExportFooter";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const Analytics = () => {
  const { projects, employees, invoices, saleBills, payments, expenses, inventoryItems, tasks } = useAppData();
  
  const exportRef = useRef<HTMLDivElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Export modal state
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpense, setIncludeExpense] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  
  // Derive project type data from context
  const projectTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = { Residential: 0, Commercial: 0, Industrial: 0 };
    projects.forEach(p => {
      if (typeCounts[p.projectType] !== undefined) typeCounts[p.projectType]++;
    });
    const total = projects.length;
    if (total === 0) return [];
    return [
      { name: "Residential", value: Math.round((typeCounts.Residential / total) * 100), color: "hsl(var(--primary))" },
      { name: "Commercial", value: Math.round((typeCounts.Commercial / total) * 100), color: "hsl(var(--chart-2))" },
      { name: "Industrial", value: Math.round((typeCounts.Industrial / total) * 100), color: "hsl(var(--chart-3))" },
      { name: "Other", value: Math.round((100 - (typeCounts.Residential + typeCounts.Commercial + typeCounts.Industrial) / total * 100)), color: "hsl(var(--chart-4))" },
    ].filter(d => d.value > 0);
  }, [projects]);
  
  // Derive employee performance from context
  const employeePerformance = useMemo(() => {
    return employees.slice(0, 5).map((emp, idx) => {
      const empTasks = tasks.filter(t => t.employeeId === emp.id);
      const completed = empTasks.filter(t => t.status === "done").length;
      const total = empTasks.length;
      const done = completed;
      return {
        id: emp.id,
        name: emp.name.split(' ').map(n => n.charAt(0)).join('') + emp.name.split(' ').slice(-1)[0]?.charAt(1) || emp.name.slice(0, 7),
        tasks: total,
        completed: done,
        efficiency: Math.round((done / total) * 100),
      };
    }).sort((a, b) => b.efficiency - a.efficiency);
  }, [employees, tasks]);
  
  // Derive projects list from context
  const projectsList = useMemo(() => {
    return projects.slice(0, 10).map(p => ({ id: p.id, name: p.name }));
  }, [projects]);
  
  // Compute KPIs from context
  const kpiValues = useMemo(() => {
    const totalRevenue = 
      invoices.reduce((s, i) => s + (i.amountReceived || 0), 0) + 
      (saleBills || []).reduce((s, i) => s + (i.amountReceived || 0), 0) + 
      payments.filter(p => p.direction === "in").reduce((s, p) => s + p.amount, 0);
    const activeProjects = projects.filter(p => p.status === "Ongoing").length;
    const totalEmployees = employees.length;
    const stockValue = inventoryItems.reduce((sum, item) => sum + (item.stock * (item.salePrice || 0)), 0);
    
    return {
      revenue: totalRevenue || 0,
      activeProjects: activeProjects || 0,
      employees: totalEmployees || 0,
      stockValue: stockValue || 0,
    };
  }, [invoices, saleBills, payments, projects, employees, inventoryItems]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleExportRevenue = async () => {
    toast({ title: "Export Started", description: `Exporting Revenue Report - Income: ${includeIncome}, Expense: ${includeExpense}` });
  };

  const handleExportProjects = async () => {
    toast({ title: "Export Started", description: `Exporting Projects: ${selectedProjects.map(id => projectsList.find(p => p.id === id)?.name).join(', ')}` });
  };

  const handleExportEmployee = async () => {
    const emp = employeePerformance.find(e => e.id.toString() === selectedEmployee);
    toast({ title: "Export Started", description: `Exporting Employee Details: ${emp?.name}` });
  };

  const handleExportInventory = async () => {
    toast({ title: "Export Started", description: 'Exporting Inventory Items' });
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Analytics" }]}
        subRow={
          <>
            <Select defaultValue="year">
              <SelectTrigger className="h-9 w-[130px] border-border bg-muted/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <InlineKpiStrip
              className="w-full flex-wrap justify-end"
              items={[
                { label: "Revenue", value: `₹${(kpiValues.revenue / 10000000).toFixed(2)}Cr` },
                { label: "Active jobs", value: kpiValues.activeProjects },
                { label: "Team", value: kpiValues.employees },
                { label: "Stock", value: `₹${(kpiValues.stockValue / 100000).toFixed(0)}L` },
              ]}
            />
          </>
        }
      >
        <Button variant="outline" size="sm" className="h-8" onClick={() => setIsExportModalOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </StickyPageHeader>

      {/* Project Distribution & Top Performers */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Project Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={projectTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {projectTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employeePerformance.slice(0, 5).map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-4">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.completed}/{emp.tasks} tasks</p>
                  </div>
                </div>
                <Badge variant="outline" className={emp.efficiency >= 90 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}>
                  {emp.efficiency}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Export Modal */}
      <Sheet open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Export Report</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {/* Revenue Export */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Revenue Report</CardTitle>
                  <Button size="sm" onClick={handleExportRevenue} disabled={!includeIncome && !includeExpense}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-income" 
                      checked={includeIncome} 
                      onCheckedChange={(c) => setIncludeIncome(c as boolean)} 
                    />
                    <Label htmlFor="include-income" className="text-sm cursor-pointer">Income</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="include-expense" 
                      checked={includeExpense} 
                      onCheckedChange={(c) => setIncludeExpense(c as boolean)} 
                    />
                    <Label htmlFor="include-expense" className="text-sm cursor-pointer">Expense</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projects Details */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Projects Details</CardTitle>
                  <Button size="sm" onClick={handleExportProjects} disabled={selectedProjects.length === 0}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="text-xs text-muted-foreground mb-2 block">Select projects (multi-select):</Label>
                <div className="flex flex-wrap gap-2">
                  {projectsList.map(p => (
                    <Badge 
                      key={p.id} 
                      variant={selectedProjects.includes(p.id) ? "default" : "outline"} 
                      className="cursor-pointer"
                      onClick={() => toggleProject(p.id)}
                    >
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employee Details */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Employee Details</CardTitle>
                  <Button size="sm" onClick={handleExportEmployee} disabled={!selectedEmployee}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeePerformance.map(emp => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Inventory Items */}
            <Card className="border">
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                  <Button size="sm" onClick={handleExportInventory}>
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Export all inventory items with current stock levels</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Analytics;

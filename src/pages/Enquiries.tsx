import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Search, Phone, Mail, MapPin, Calendar, User, UserPlus, FileText, 
  Send, Eye, Edit, Trash2, Check, Clock, AlertCircle, MessageCircle,
  Building2, IndianRupee, Filter, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet";
import { ToastAction } from "@/components/ui/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import type { Enquiry } from "@/types/project";

const Enquiries = () => {
  const navigate = useNavigate();
  const { enquiries, addEnquiry, updateEnquiry, transitionEnquiryStatus, convertEnquiryToCustomer, employees, agents, generateId } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Modal states
  const [isAddEnquiryOpen, setIsAddEnquiryOpen] = useState(false);
  const [isViewEnquiryOpen, setIsViewEnquiryOpen] = useState(false);
  const [isEditEnquiryOpen, setIsEditEnquiryOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    customerType: "individual" as "individual" | "company",
    source: "phone" as Enquiry["source"],
    agentId: "",
    systemCapacity: "",
    estimatedBudget: "",
    requirements: "",
    priority: "medium" as Enquiry["priority"],
    followUpDate: "",
  });
  const [assignTo, setAssignTo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [notePersonId, setNotePersonId] = useState("");
  const [noteUpdatedById, setNoteUpdatedById] = useState("admin");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [shareMethod, setShareMethod] = useState<"whatsapp" | "email">("whatsapp");

  // Get employee list for assignment
  const assignableEmployees = employees.map(e => ({ id: e.id, name: e.name }));

  const resetForm = () => {
    setFormData({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerAddress: "",
      customerType: "individual",
      source: "phone",
      agentId: "",
      systemCapacity: "",
      estimatedBudget: "",
      requirements: "",
      priority: "medium",
      followUpDate: "",
    });
    setSelectedEnquiry(null);
  };

  // Filtering
  const filteredEnquiries = enquiries.filter(e => {
    const matchesSearch = e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.customerPhone.includes(searchQuery) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || e.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === "all" || e.assignedTo === assigneeFilter || 
      (assigneeFilter === "unassigned" && !e.assignedTo);
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const enquiryTotalPages = Math.max(1, Math.ceil(filteredEnquiries.length / tablePageSize) || 1);
  const safeEnquiryPage = Math.min(tablePage, enquiryTotalPages);
  const pagedEnquiries = filteredEnquiries.slice(
    (safeEnquiryPage - 1) * tablePageSize,
    safeEnquiryPage * tablePageSize
  );
  useEffect(() => {
    setTablePage((p) => Math.min(p, enquiryTotalPages));
  }, [enquiryTotalPages]);

  // Stats
  const stats = {
    total: enquiries.length,
    new: enquiries.filter(e => e.status === "new").length,
    inProgress: enquiries.filter(e => ["contacted", "meeting-scheduled", "quotation-sent", "negotiation"].includes(e.status)).length,
    converted: enquiries.filter(e => e.status === "converted").length,
    highPriority: enquiries.filter(e => e.priority === "high" && e.status !== "converted" && e.status !== "lost").length,
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  const getStatusBadge = (status: Enquiry["status"]) => {
    const styles: Record<string, string> = {
      "new": "bg-blue-500/10 text-blue-500 border-0",
      "contacted": "bg-amber-500/10 text-amber-500 border-0",
      "meeting-scheduled": "bg-purple-500/10 text-purple-500 border-0",
      "quotation-sent": "bg-cyan-500/10 text-cyan-500 border-0",
      "negotiation": "bg-orange-500/10 text-orange-500 border-0",
      "converted": "bg-primary/10 text-primary border-0",
      "lost": "bg-destructive/10 text-destructive border-0",
    };
    const labels: Record<string, string> = {
      "new": "New",
      "contacted": "Contacted",
      "meeting-scheduled": "Meeting Scheduled",
      "quotation-sent": "Quotation Sent",
      "negotiation": "Negotiation",
      "converted": "Converted",
      "lost": "Lost",
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  const getPriorityBadge = (priority: Enquiry["priority"]) => {
    const styles: Record<string, string> = {
      "low": "bg-muted text-muted-foreground",
      "medium": "bg-amber-500/10 text-amber-600",
      "high": "bg-destructive/10 text-destructive",
    };
    return <Badge className={styles[priority]}>{priority.charAt(0).toUpperCase() + priority.slice(1)}</Badge>;
  };

  // Handlers
  const handleAddEnquiry = async () => {
    if (!formData.customerName || !formData.customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    
    if (formData.source === "referral" && !formData.agentId) {
      toast({ title: "Error", description: "Please select an agent for the referral", variant: "destructive" });
      return;
    }

    const newEnquiry: Enquiry = {
      id: `ENQ-${new Date().getFullYear()}-${String(enquiries.length + 1).padStart(3, '0')}`,
      ...formData,
      estimatedBudget: parseFloat(formData.estimatedBudget) || 0,
      followUpDate: formData.followUpDate || undefined,
      status: "new",
      assignedTo: "",
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      notes: [],
    };

    const result = await addEnquiry(newEnquiry);
    if (!result.ok) {
      toast({ title: "Could not add enquiry", description: result.error ?? "Command failed", variant: "destructive" });
      return;
    }
    setIsAddEnquiryOpen(false);
    resetForm();
    toast({ title: "Enquiry Added", description: `${newEnquiry.id} has been created` });
  };

  const handleSaveEdit = () => {
    if (!selectedEnquiry || !formData.customerName || !formData.customerPhone) {
      toast({ title: "Error", description: "Name and phone are required", variant: "destructive" });
      return;
    }
    
    if (formData.source === "referral" && !formData.agentId) {
      toast({ title: "Error", description: "Please select an agent for the referral", variant: "destructive" });
      return;
    }

    updateEnquiry(selectedEnquiry.id, {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail,
      customerAddress: formData.customerAddress,
      customerType: formData.customerType,
      source: formData.source,
      agentId: formData.agentId,
      systemCapacity: formData.systemCapacity,
      estimatedBudget: parseFloat(formData.estimatedBudget) || 0,
      requirements: formData.requirements,
      priority: formData.priority,
      followUpDate: formData.followUpDate || undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    });

    setIsEditEnquiryOpen(false);
    resetForm();
    toast({ title: "Enquiry Updated", description: "Changes have been saved" });
  };

  const handleOpenEdit = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setFormData({
      customerName: enquiry.customerName,
      customerPhone: enquiry.customerPhone,
      customerEmail: enquiry.customerEmail,
      customerAddress: enquiry.customerAddress,
      customerType: enquiry.customerType,
      source: enquiry.source,
      agentId: enquiry.agentId || "",
      systemCapacity: enquiry.systemCapacity,
      estimatedBudget: enquiry.estimatedBudget.toString(),
      requirements: enquiry.requirements,
      priority: enquiry.priority,
      followUpDate: enquiry.followUpDate || "",
    });
    setIsEditEnquiryOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedEnquiry || !assignTo) return;
    
    updateEnquiry(selectedEnquiry.id, { 
      assignedTo: assignTo, 
      updatedAt: new Date().toISOString().split('T')[0] 
    });

    if (selectedEnquiry.status === "new") {
      await transitionEnquiryStatus(selectedEnquiry.id, "contacted");
    }
    
    setIsAssignOpen(false);
    setAssignTo("");
    toast({ title: "Assigned", description: `Enquiry assigned to ${assignTo}` });
  };

  const handleAddNote = () => {
    if (!selectedEnquiry || !noteText) return;
    
    const personName = notePersonId 
      ? (notePersonId === "admin" ? "Admin" : employees.find(e => e.id.toString() === notePersonId)?.name || "Unknown")
      : "";
    
    const updatedByName = noteUpdatedById === "admin" 
      ? "Admin" 
      : employees.find(e => e.id.toString() === noteUpdatedById)?.name || "Admin";
    
    const newNote = {
      date: new Date().toISOString().split('T')[0],
      note: noteText,
      by: personName,
      updatedBy: updatedByName,
    };
    
    updateEnquiry(selectedEnquiry.id, { 
      notes: [newNote, ...selectedEnquiry.notes], 
      updatedAt: new Date().toISOString().split('T')[0] 
    });
    
    setIsAddNoteOpen(false);
    setNoteText("");
    setNotePersonId("");
    setNoteUpdatedById("admin");
    toast({ title: "Note Added", description: "Follow-up note has been saved" });
  };

  const handleScheduleMeeting = async () => {
    if (!selectedEnquiry || !meetingDate) return;
    
    updateEnquiry(selectedEnquiry.id, { 
      meetingDate, 
      meetingNotes, 
      updatedAt: new Date().toISOString().split('T')[0] 
    });
    await transitionEnquiryStatus(selectedEnquiry.id, "meeting-scheduled");
    
    setIsScheduleMeetingOpen(false);
    setMeetingDate("");
    setMeetingNotes("");
    toast({ title: "Meeting Scheduled", description: `Meeting set for ${meetingDate}` });
  };

  const handleShare = () => {
    if (!selectedEnquiry) return;
    
    const message = `Enquiry: ${selectedEnquiry.id}\nCustomer: ${selectedEnquiry.customerName}\nPhone: ${selectedEnquiry.customerPhone}\nSystem: ${selectedEnquiry.systemCapacity}\nBudget: ${formatCurrency(selectedEnquiry.estimatedBudget)}`;
    
    if (shareMethod === "whatsapp") {
      const phone = selectedEnquiry.customerPhone.replace(/\s/g, '').replace('+', '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`mailto:${selectedEnquiry.customerEmail}?subject=Enquiry ${selectedEnquiry.id}&body=${encodeURIComponent(message)}`, '_blank');
    }
    
    setIsShareOpen(false);
    toast({ title: "Shared", description: `Enquiry details shared via ${shareMethod}` });
  };

  const handleCreateQuotation = async (enquiry: Enquiry) => {
    // Update enquiry status to quotation-sent when navigating to create quotation
    await transitionEnquiryStatus(enquiry.id, "quotation-sent");
    navigate(`/quotations?create&from=enquiry&client=${encodeURIComponent(enquiry.customerName)}&phone=${encodeURIComponent(enquiry.customerPhone)}&address=${encodeURIComponent(enquiry.customerAddress)}&capacity=${encodeURIComponent(enquiry.systemCapacity)}&agentId=${encodeURIComponent(enquiry.agentId || "")}`);
  };

  const handleConvertEnquiry = async (enquiry: Enquiry) => {
    const result = await convertEnquiryToCustomer(enquiry.id);
    if (!result.ok) {
      toast({ 
        title: "Conversion Failed", 
        description: result.error || "Could not convert enquiry", 
        variant: "destructive" 
      });
      return;
    }
    
    toast({ 
      title: "Enquiry Converted", 
      description: `Customer record created: ${result.customerId}` 
    });
    
    // After conversion, we can optionally navigate to create a quotation with the customerId
    toast({
      title: "Enquiry Converted",
      description: "Would you like to create a Quotation for this customer now?",
      action: (
        <ToastAction altText="Create Quotation" onClick={() => navigate(`/quotations?create&from=enquiry&customerId=${result.customerId}&client=${encodeURIComponent(enquiry.customerName)}&phone=${encodeURIComponent(enquiry.customerPhone)}&address=${encodeURIComponent(enquiry.customerAddress)}&capacity=${encodeURIComponent(enquiry.systemCapacity)}&agentId=${encodeURIComponent(enquiry.agentId || "")}`)}>
          Create Quotation
        </ToastAction>
      )
    });
  };

  const handleStatusChange = async (enquiryId: string, newStatus: Enquiry["status"]) => {
    const result = await transitionEnquiryStatus(enquiryId, newStatus);
    if (!result.ok) {
      toast({ title: "Invalid Transition", description: result.error || "Status change not allowed", variant: "destructive" });
      return;
    }
    toast({ title: "Status Updated", description: `Enquiry status changed to ${newStatus}` });
  };

  return (
    <PageShell className="space-y-4 md:space-y-5">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Sales" }, { label: "Enquiries" }]}
        subRow={
          <>
            <div className="flex min-w-0 w-full flex-1 flex-wrap items-end gap-2">
              <div className="relative min-w-0 flex-1 max-w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, phone, or ID"
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
                <SelectTrigger className="h-9 w-[min(100%,180px)] bg-muted/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="meeting-scheduled">Meeting Scheduled</SelectItem>
                  <SelectItem value="quotation-sent">Quotation Sent</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setIsFiltersOpen(!isFiltersOpen)}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            <InlineKpiStrip
              className="w-full sm:w-auto sm:justify-end"
              items={[
                { label: "Total", value: stats.total },
                { label: "New", value: stats.new },
                { label: "In progress", value: stats.inProgress },
                { label: "Converted", value: stats.converted },
                { label: "High priority", value: stats.highPriority },
              ]}
            />
          </>
        }
      >
        <Button size="sm" onClick={() => { resetForm(); setIsAddEnquiryOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add enquiry
        </Button>
      </StickyPageHeader>

      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-3 p-3 bg-muted/30 rounded-lg">
              <Select
                value={priorityFilter}
                onValueChange={(v) => {
                  setPriorityFilter(v);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={assigneeFilter}
                onValueChange={(v) => {
                  setAssigneeFilter(v);
                  setTablePage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <DataTableShell
            maxHeight={listTableViewportMaxHeight(tablePageSize)}
            scrollResetKey={`${safeEnquiryPage}-${tablePageSize}-${filteredEnquiries.length}`}
            footer={
              <TablePaginationBar
                page={safeEnquiryPage}
                pageSize={tablePageSize}
                total={filteredEnquiries.length}
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
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>System (kW)</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Follow-up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedEnquiries.map((enquiry) => (
                <TableRow key={enquiry.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-start gap-2 min-w-0 max-w-[220px]">
                      <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {enquiry.customerType === "company" ? <Building2 className="h-4 w-4" /> : enquiry.customerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{enquiry.customerName}</p>
                        {enquiry.customerAddress && (
                          <p className="text-xs text-muted-foreground truncate" title={enquiry.customerAddress}>
                            {enquiry.customerAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{enquiry.customerPhone}</TableCell>
                  <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                  <TableCell>{getPriorityBadge(enquiry.priority)}</TableCell>
                  <TableCell className="font-medium">{enquiry.systemCapacity || "—"}</TableCell>
                  <TableCell className="text-primary font-medium">{formatCurrency(enquiry.estimatedBudget)}</TableCell>
                  <TableCell className="text-sm">
                    {enquiry.assignedTo || <span className="text-amber-600">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {enquiry.followUpDate
                      ? new Date(enquiry.followUpDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setIsViewEnquiryOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(enquiry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!enquiry.assignedTo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEnquiry(enquiry);
                            setIsAssignOpen(true);
                          }}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                      {enquiry.status !== "converted" && enquiry.status !== "lost" && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="shrink-0 h-8 text-[10px]" 
                            onClick={() => handleConvertEnquiry(enquiry)}
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Convert
                          </Button>
                          <Button 
                            size="sm" 
                            className="shrink-0 h-8 text-[10px]" 
                            onClick={() => handleCreateQuotation(enquiry)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Quote
                          </Button>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>

      {filteredEnquiries.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No enquiries found</p>
          <Button className="mt-4" onClick={() => { resetForm(); setIsAddEnquiryOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Enquiry
          </Button>
        </div>
      )}

      {/* Add Enquiry Modal */}
      <Sheet open={isAddEnquiryOpen} onOpenChange={setIsAddEnquiryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Enquiry</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input 
                  value={formData.customerName} 
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} 
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  value={formData.customerPhone} 
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} 
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.customerEmail} 
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} 
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.customerType} 
                  onValueChange={(v: "individual" | "company") => setFormData({ ...formData, customerType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={formData.customerAddress} 
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })} 
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(v: Enquiry["source"]) => setFormData({ ...formData, source: v, agentId: v === "referral" ? formData.agentId : "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v: Enquiry["priority"]) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.source === "referral" && (
              <div className="space-y-2">
                <Label>Referred By (Agent) *</Label>
                <Select
                  value={formData.agentId}
                  onValueChange={(v) => setFormData({ ...formData, agentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.status === "active").map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Capacity</Label>
                <Input 
                  value={formData.systemCapacity} 
                  onChange={(e) => setFormData({ ...formData, systemCapacity: e.target.value })} 
                  placeholder="e.g., 5kW"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget</Label>
                <Input 
                  type="number"
                  value={formData.estimatedBudget} 
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })} 
                  placeholder="₹"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements / Notes</Label>
              <Textarea 
                value={formData.requirements} 
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} 
                placeholder="Customer requirements and notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input 
                type="date"
                value={formData.followUpDate} 
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} 
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddEnquiryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEnquiry}>Add Enquiry</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* View Enquiry Modal */}
      <Sheet open={isViewEnquiryOpen} onOpenChange={setIsViewEnquiryOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {selectedEnquiry?.id}
              {selectedEnquiry && getStatusBadge(selectedEnquiry.status)}
            </SheetTitle>
          </SheetHeader>
          {selectedEnquiry && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedEnquiry.customerName}</p>
                  <p className="text-sm text-muted-foreground">{selectedEnquiry.customerType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedEnquiry.customerPhone}</p>
                  <p className="text-sm text-muted-foreground">{selectedEnquiry.customerEmail}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{selectedEnquiry.customerAddress}</p>
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">System Capacity</p>
                  <p className="font-semibold text-lg">{selectedEnquiry.systemCapacity}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Budget</p>
                  <p className="font-semibold text-lg text-primary">{formatCurrency(selectedEnquiry.estimatedBudget)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedEnquiry.source}</p>
                  {selectedEnquiry.source === "referral" && selectedEnquiry.agentId && (
                    <p className="text-sm text-muted-foreground">by {agents.find(a => a.id === selectedEnquiry.agentId)?.name || "Unknown Agent"}</p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Requirements</p>
                <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedEnquiry.requirements || "No specific requirements noted"}</p>
              </div>

              {/* Assignment & Scheduling */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Assigned To</p>
                  <p className="font-medium">{selectedEnquiry.assignedTo || <span className="text-amber-500">Unassigned</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meeting Date</p>
                  <p className="font-medium">{selectedEnquiry.meetingDate ? new Date(selectedEnquiry.meetingDate).toLocaleDateString('en-IN') : "Not scheduled"}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedEnquiry.notes.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Notes & Follow-ups</p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedEnquiry.notes.map((note, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm">{note.note}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">{note.date}</span>
                          {(note.updatedBy || note.by) && (
                            <Badge variant="outline" className="text-xs">
                              Updated by: {note.updatedBy || note.by}
                            </Badge>
                          )}
                          {note.by && (
                            <Badge variant="secondary" className="text-xs">
                              Status shared by: {note.by}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setIsViewEnquiryOpen(false); setIsAssignOpen(true); }}
                >
                  <User className="h-3 w-3 mr-1" />
                  {selectedEnquiry.assignedTo ? "Reassign" : "Assign"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setIsViewEnquiryOpen(false); setIsScheduleMeetingOpen(true); }}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Schedule Meeting
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => { setIsViewEnquiryOpen(false); setIsAddNoteOpen(true); }}
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Add Note
                </Button>
                {selectedEnquiry.status !== "converted" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary"
                    onClick={() => { setIsViewEnquiryOpen(false); handleConvertEnquiry(selectedEnquiry); }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Convert to Customer
                  </Button>
                )}
                <Button 
                  size="sm"
                  onClick={() => { setIsViewEnquiryOpen(false); handleCreateQuotation(selectedEnquiry); }}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Create Quotation
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Assign Modal */}
      <Sheet open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Assign Enquiry</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignTo}>Assign</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add Note Modal */}
      <Sheet open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add Follow-up Note</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Updated by</Label>
              <Select value={noteUpdatedById} onValueChange={setNoteUpdatedById}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is adding this note?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Person who talked to client / Status shared by</Label>
              <Select value={notePersonId} onValueChange={setNotePersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select person..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea 
                value={noteText} 
                onChange={(e) => setNoteText(e.target.value)} 
                placeholder="Add your note..."
                rows={4}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} disabled={!noteText}>Add Note</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Schedule Meeting Modal */}
      <Sheet open={isScheduleMeetingOpen} onOpenChange={setIsScheduleMeetingOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Schedule Meeting</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Date *</Label>
              <Input 
                type="date" 
                value={meetingDate} 
                onChange={(e) => setMeetingDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={meetingNotes} 
                onChange={(e) => setMeetingNotes(e.target.value)} 
                placeholder="Meeting agenda, location, etc."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsScheduleMeetingOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleMeeting} disabled={!meetingDate}>Schedule</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Share Modal */}
      <Sheet open={isShareOpen} onOpenChange={setIsShareOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Share Enquiry Details</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share Via</Label>
              <Select value={shareMethod} onValueChange={(v: "whatsapp" | "email") => setShareMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsShareOpen(false)}>Cancel</Button>
            <Button onClick={handleShare}>
              <Send className="h-4 w-4 mr-2" />
              Share
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Enquiry Modal */}
      <Sheet open={isEditEnquiryOpen} onOpenChange={(open) => { setIsEditEnquiryOpen(open); if (!open) resetForm(); }}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Enquiry - {selectedEnquiry?.id}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input 
                  value={formData.customerName} 
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} 
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input 
                  value={formData.customerPhone} 
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} 
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.customerEmail} 
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })} 
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={formData.customerType} 
                  onValueChange={(v: "individual" | "company") => setFormData({ ...formData, customerType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={formData.customerAddress} 
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })} 
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(v: Enquiry["source"]) => setFormData({ ...formData, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v: Enquiry["priority"]) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.source === "referral" && (
              <div className="space-y-2">
                <Label>Referred By (Agent) *</Label>
                <Select
                  value={formData.agentId}
                  onValueChange={(v) => setFormData({ ...formData, agentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(a => a.status === "active").map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Capacity</Label>
                <Input 
                  value={formData.systemCapacity} 
                  onChange={(e) => setFormData({ ...formData, systemCapacity: e.target.value })} 
                  placeholder="e.g., 5kW"
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Budget</Label>
                <Input 
                  type="number"
                  value={formData.estimatedBudget} 
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })} 
                  placeholder="₹"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Requirements / Notes</Label>
              <Textarea 
                value={formData.requirements} 
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} 
                placeholder="Customer requirements and notes..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input 
                type="date"
                value={formData.followUpDate} 
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })} 
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditEnquiryOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Enquiries;

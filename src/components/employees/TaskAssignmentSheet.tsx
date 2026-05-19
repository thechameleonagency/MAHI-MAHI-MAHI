import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Plus, ChevronDown, ChevronRight, Calendar, ClipboardList, Users, User } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatUiDate } from "@/lib/formatUiDate";
import type { Task, SiteRecord } from "@/types/project";
import { WORK_STATUS_STAGES } from "@/types/blockage";

interface TaskAssignmentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, site list is limited to this project and new tasks use this project id. */
  projectId?: string;
  projectName?: string;
  /** Progress-report timeline step key when opened from a milestone card. */
  defaultMilestoneId?: string;
  // Pre-selected target
  employeeId?: number;
  employeeName?: string;
  teamId?: string;
  teamName?: string;
}

interface SelectedWorkItem {
  stageKey: string;
  stageName: string;
  subItems: string[]; 
  subItemLabels: string[];
  dateOffset: number; 
}

export function TaskAssignmentSheet({
  isOpen,
  onClose,
  projectId,
  projectName,
  defaultMilestoneId,
  employeeId,
  employeeName,
  teamId,
  teamName,
}: TaskAssignmentSheetProps) {
  const { sites, employees, teams, projects, addTask, generateId } = useAppData();
  
  // Selection Logic
  const [assignmentType, setAssignmentType] = useState<"individual" | "team">(teamId ? "team" : "individual");
  const [selectedTargetId, setSelectedTargetId] = useState<string>(teamId || employeeId?.toString() || "");
  
  const [selectedSite, setSelectedSite] = useState("");
  const [notes, setNotes] = useState("");
  const [baseDate, setBaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  const [selectedWorkItems, setSelectedWorkItems] = useState<SelectedWorkItem[]>([]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    const first = sites.find((s) => s.projectId === projectId);
    if (first) setSelectedSite(String(first.id));
    else setSelectedSite("0");
  }, [isOpen, projectId, sites]);
  
  useEffect(() => {
    if (isOpen) {
      setBaseDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [isOpen]);

  const allSites = useMemo(() => {
    const scoped = projectId ? sites.filter((s) => s.projectId === projectId) : sites;
    return [{ id: 0, name: projectName ? `Office (${projectName})` : "Office" }, ...scoped];
  }, [sites, projectId, projectName]);
  
  const resetForm = () => {
    if (!teamId && !employeeId) {
      setSelectedTargetId("");
    }
    setSelectedSite("");
    setNotes("");
    setBaseDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedWorkItems([]);
    setExpandedStages(new Set());
  };
  
  const toggleStageExpand = (stageValue: string) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageValue)) {
      newExpanded.delete(stageValue);
    } else {
      newExpanded.add(stageValue);
    }
    setExpandedStages(newExpanded);
  };
  
  const isStageSelected = (stageKey: string) => {
    return selectedWorkItems.some(w => w.stageKey === stageKey && (w.subItems?.length ?? 0) === 0);
  };
  
  const isSubItemSelected = (stageKey: string, subItemKey: string) => {
    return selectedWorkItems.some(w => w.stageKey === stageKey && (w.subItems?.includes(subItemKey) ?? false));
  };
  
  const toggleWholeStage = (stage: typeof WORK_STATUS_STAGES[0], checked: boolean) => {
    if (checked) {
      setSelectedWorkItems(prev => [
        ...prev.filter(w => w.stageKey !== stage.value),
        {
          stageKey: stage.value,
          stageName: stage.label,
          subItems: [],
          subItemLabels: [],
          dateOffset: 0
        }
      ]);
    } else {
      setSelectedWorkItems(prev => prev.filter(w => w.stageKey !== stage.value));
    }
  };
  
  const toggleSubItem = (stage: typeof WORK_STATUS_STAGES[0], subItem: typeof stage.subItems[0], checked: boolean) => {
    const existingItem = selectedWorkItems.find(w => w.stageKey === stage.value);
    
    if (checked) {
      if (existingItem) {
        if (existingItem.subItems.length === 0) {
          setSelectedWorkItems(prev => prev.map(w => 
            w.stageKey === stage.value 
              ? { ...w, subItems: [subItem.value], subItemLabels: [subItem.label] }
              : w
          ));
        } else {
          setSelectedWorkItems(prev => prev.map(w => 
            w.stageKey === stage.value 
              ? { ...w, subItems: [...w.subItems, subItem.value], subItemLabels: [...w.subItemLabels, subItem.label] }
              : w
          ));
        }
      } else {
        setSelectedWorkItems(prev => [
          ...prev,
          {
            stageKey: stage.value,
            stageName: stage.label,
            subItems: [subItem.value],
            subItemLabels: [subItem.label],
            dateOffset: 0
          }
        ]);
      }
    } else {
      if (existingItem) {
        const newSubItems = existingItem.subItems.filter(s => s !== subItem.value);
        const newLabels = existingItem.subItemLabels.filter((_, i) => existingItem.subItems[i] !== subItem.value);
        if (newSubItems.length === 0) {
          setSelectedWorkItems(prev => prev.filter(w => w.stageKey !== stage.value));
        } else {
          setSelectedWorkItems(prev => prev.map(w => 
            w.stageKey === stage.value 
              ? { ...w, subItems: newSubItems, subItemLabels: newLabels }
              : w
          ));
        }
      }
    }
  };
  
  const updateDateOffset = (stageKey: string, offset: number) => {
    const safe = Number.isFinite(offset) ? Math.max(0, offset) : 0;
    setSelectedWorkItems(prev => prev.map(w =>
      w.stageKey === stageKey ? { ...w, dateOffset: safe } : w
    ));
  };
  
  const getWorkDate = (offset: number): string => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offset);
    return format(date, "yyyy-MM-dd");
  };
  
  const handleSubmit = () => {
    if (!selectedTargetId || !selectedSite || selectedWorkItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a recipient, site and at least one work item",
        variant: "destructive",
      });
      return;
    }
    
    setIsConfirmOpen(true);
  };
  
  const confirmSubmit = () => {
    const site = allSites.find(s => s.id.toString() === selectedSite);

    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj?.startDate && baseDate < proj.startDate) {
        toast({
          title: "Invalid base date",
          description: `Task schedule cannot start before project start (${proj.startDate}).`,
          variant: "destructive",
        });
        return;
      }
    }

    const maxOffset = selectedWorkItems.length ? Math.max(...selectedWorkItems.map((w) => w.dateOffset)) : 0;
    const lastWorkIso = getWorkDate(maxOffset);
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj?.endDate && lastWorkIso > proj.endDate) {
        toast({
          title: "Invalid schedule",
          description: `A task falls after project end (${proj.endDate}). Reduce offsets or change the base date.`,
          variant: "destructive",
        });
        return;
      }
    }
    
    const targetName = assignmentType === "individual" 
      ? employees.find(e => e.id.toString() === selectedTargetId)?.name || employeeName
      : teams.find(t => t.id === selectedTargetId)?.name || teamName;

    selectedWorkItems.forEach(workItem => {
      const workDate = getWorkDate(workItem.dateOffset);
      const workType = workItem.subItems.length === 0 
        ? workItem.stageName 
        : workItem.subItemLabels.join(", ");
      
      const task: Task = {
        id: generateId("TASK"),
        employeeId: assignmentType === "individual" ? selectedTargetId : undefined,
        teamId: assignmentType === "team" ? selectedTargetId : undefined,
        projectId: projectId || (site as SiteRecord | undefined)?.projectId || "manual-assignment",
        siteId: selectedSite,
        siteName: site?.name || "Unknown",
        workType: workType,
        workTag: workItem.stageName,
        notes,
        createdDate: format(new Date(), "yyyy-MM-dd"),
        workDate,
        originalDate: workDate,
        status: "sent",
        createdBy: (() => { try { return JSON.parse(localStorage.getItem("mss.settings.profile") || "{}").firstName || "Manager"; } catch { return "Manager"; } })(),
        workItems: [{
          stageKey: workItem.stageKey,
          stageName: workItem.stageName,
          subItems: workItem.subItems
        }],
        dateOffset: workItem.dateOffset,
        ...(defaultMilestoneId ? { milestoneId: defaultMilestoneId } : {}),
      };
      
      addTask(task);
    });
    
    toast({
      title: "Tasks Assigned",
      description: `${selectedWorkItems.length} task(s) assigned to ${targetName}`,
    });
    
    setIsConfirmOpen(false);
    resetForm();
    onClose();
  };
  
  const getSelectedCount = () => {
    return selectedWorkItems.reduce((acc, item) => {
      if (item.subItems.length === 0) {
        const stage = WORK_STATUS_STAGES.find(s => s.value === item.stageKey);
        return acc + (stage?.subItems.length || 1);
      }
      return acc + item.subItems.length;
    }, 0);
  };
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-xl font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Assign Work Task
            </SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6 py-6">
            {/* Target Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Recipient Selection</Label>
              {(!employeeId && !teamId) ? (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    <Button 
                      size="sm" 
                      variant={assignmentType === "individual" ? "default" : "ghost"}
                      onClick={() => { setAssignmentType("individual"); setSelectedTargetId(""); }}
                      className="h-8 px-4"
                    >
                      <User className="h-3.5 w-3.5 mr-2" />
                      Individual
                    </Button>
                    <Button 
                      size="sm" 
                      variant={assignmentType === "team" ? "default" : "ghost"}
                      onClick={() => { setAssignmentType("team"); setSelectedTargetId(""); }}
                      className="h-8 px-4"
                    >
                      <Users className="h-3.5 w-3.5 mr-2" />
                      Team
                    </Button>
                  </div>
                  <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder={assignmentType === "individual" ? "Select Employee" : "Select Team"} />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentType === "individual" 
                        ? employees.filter(e => e.status === "Active").map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.name} ({e.role})</SelectItem>)
                        : teams.filter(t => t.status === "Active").map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                  <div>
                    <p className="text-2xs uppercase tracking-wider text-muted-foreground font-bold">Assigning task to</p>
                    <p className="text-lg font-bold text-primary flex items-center gap-2">
                      {assignmentType === "individual" ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      {employeeName || teamName}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white">{assignmentType.toUpperCase()}</Badge>
                </div>
              )}
            </div>
            
            {/* Site Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Site / Location *</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {allSites.map(site => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Base Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Base Date (T) *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={baseDate}
                  className="pl-10"
                  onChange={(e) => setBaseDate(e.target.value)}
                />
              </div>
              <p className="text-2xs text-muted-foreground">All tasks will be scheduled based on this date (T+offset).</p>
            </div>
            
            {/* Work Items Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Work Scope *</Label>
                {selectedWorkItems.length > 0 && (
                  <Badge variant="secondary" className="text-2xs">{getSelectedCount()} items selected</Badge>
                )}
              </div>
              <div className="border rounded-xl divide-y bg-white overflow-hidden shadow-sm">
                {WORK_STATUS_STAGES.map(stage => {
                  const isExpanded = expandedStages.has(stage.value);
                  const isWholeStageSelected = isStageSelected(stage.value);
                  const selectedSubItemCount = selectedWorkItems.find(w => w.stageKey === stage.value)?.subItems.length || 0;
                  const hasSelection = isWholeStageSelected || selectedSubItemCount > 0;
                  
                  return (
                    <div key={stage.value} className={hasSelection ? "bg-primary/5" : ""}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleStageExpand(stage.value)}>
                        <div className="flex items-center p-3">
                          <Checkbox 
                            checked={isWholeStageSelected}
                            onCheckedChange={(c) => toggleWholeStage(stage, !!c)}
                            className="mr-3"
                          />
                          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm">{stage.label}</span>
                            {selectedSubItemCount > 0 && !isWholeStageSelected && (
                              <Badge variant="outline" className="ml-auto text-2xs">
                                {selectedSubItemCount} selected
                              </Badge>
                            )}
                            {isWholeStageSelected && (
                              <Badge className="ml-auto bg-primary/20 text-primary border-0 text-2xs">
                                Full Stage
                              </Badge>
                            )}
                          </CollapsibleTrigger>
                          
                          {hasSelection && (
                            <div className="flex items-center gap-1 ml-2 bg-white rounded-md border px-2 py-0.5 shadow-sm">
                              <span className="text-2xs font-bold text-muted-foreground">T+</span>
                              <input
                                type="number"
                                min={0}
                                className="w-8 border-0 bg-transparent text-center text-xs focus:ring-0 p-0"
                                value={selectedWorkItems.find(w => w.stageKey === stage.value)?.dateOffset || 0}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateDateOffset(stage.value, parseInt(e.target.value) || 0)}
                              />
                            </div>
                          )}
                        </div>
                        
                        <CollapsibleContent>
                          <div className="pl-12 pr-3 pb-3 space-y-2 grid grid-cols-1 sm:grid-cols-2">
                            {stage.subItems.map(subItem => (
                              <div key={subItem.value} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-md transition-colors cursor-pointer" onClick={() => !isWholeStageSelected && toggleSubItem(stage, subItem, !isSubItemSelected(stage.value, subItem.value))}>
                                <Checkbox 
                                  checked={isSubItemSelected(stage.value, subItem.value) || isWholeStageSelected}
                                  disabled={isWholeStageSelected}
                                  onCheckedChange={(c) => toggleSubItem(stage, subItem, !!c)}
                                />
                                <span className="text-xs">{subItem.label}</span>
                                {subItem.photoRequired && (
                                  <Badge variant="outline" className="text-2xs px-1 py-0 border-warning bg-warning text-warning">PHOTO</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Special Instructions</Label>
              <Textarea
                placeholder="Add any specific instructions for this assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-white"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t mt-auto">
            <Button variant="outline" className="flex-1" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button 
              className="flex-1 shadow-lg shadow-primary/20"
              onClick={handleSubmit}
              disabled={selectedWorkItems.length === 0 || !selectedTargetId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate {selectedWorkItems.length > 0 ? selectedWorkItems.length : ""} Tasks
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Confirmation Sheet */}
      <Sheet open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-[2rem] overflow-hidden flex flex-col p-0">
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto shadow-inner">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-foreground">Confirm Assignment</h3>
              <p className="text-muted-foreground mt-1 text-sm">Review the schedule before sending tasks.</p>
              
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/30 rounded-xl text-left border border-border/40">
                  <span className="text-2xs font-bold uppercase text-muted-foreground block mb-1">Recipient</span>
                  <span className="font-bold text-sm truncate block">
                    {assignmentType === "individual" 
                      ? employees.find(e => e.id.toString() === selectedTargetId)?.name 
                      : teams.find(t => t.id === selectedTargetId)?.name}
                  </span>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl text-left border border-border/40">
                  <span className="text-2xs font-bold uppercase text-muted-foreground block mb-1">Site</span>
                  <span className="font-bold text-sm truncate block">{allSites.find(s => s.id.toString() === selectedSite)?.name}</span>
                </div>
              </div>
              
              <div className="mt-6 p-1 bg-muted/20 rounded-xl text-left max-h-[250px] overflow-y-auto border border-border/30">
                {selectedWorkItems.map(item => (
                  <div key={item.stageKey} className="flex items-center justify-between p-4 border-b border-border/30 last:border-0 hover:bg-white/50 transition-colors">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-xs font-bold truncate">
                        {item.subItems.length === 0 
                          ? item.stageName 
                          : `${item.stageName}: ${item.subItemLabels.join(", ")}`
                        }
                      </p>
                      <p className="text-2xs text-muted-foreground mt-0.5">Scheduled Task</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant="outline" className="text-2xs font-bold bg-white">
                        {formatUiDate(getWorkDate(item.dateOffset), "dd MMM")}
                      </Badge>
                      {item.dateOffset > 0 && <span className="text-2xs font-medium text-primary mt-1">T+{item.dateOffset}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsConfirmOpen(false)}>
                Go Back
              </Button>
              <Button className="flex-1 h-12 rounded-xl shadow-xl shadow-primary/20" onClick={confirmSubmit}>
                Send All Tasks
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

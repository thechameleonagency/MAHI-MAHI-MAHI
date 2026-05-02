import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, Plus, X, ChevronDown, ChevronRight, Calendar } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { Task } from "@/types/project";
import { WORK_STATUS_STAGES } from "@/types/blockage";

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeName: string;
}

interface SelectedWorkItem {
  stageKey: string;
  stageName: string;
  subItems: string[]; // Empty array = whole stage, or specific sub-items
  subItemLabels: string[];
  dateOffset: number; // T+0, T+1, T+2, etc.
}

export function TaskAssignmentModal({ isOpen, onClose, employeeId, employeeName }: TaskAssignmentModalProps) {
  const { sites, addTask, generateId } = useAppData();
  
  const [selectedSite, setSelectedSite] = useState("");
  const [notes, setNotes] = useState("");
  const [baseDate, setBaseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  
  // Multi-select work items with date offsets
  const [selectedWorkItems, setSelectedWorkItems] = useState<SelectedWorkItem[]>([]);
  
  const allSites = [{ id: 0, name: "Office" }, ...sites];
  
  const resetForm = () => {
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
    return selectedWorkItems.some(w => w.stageKey === stageKey && w.subItems.length === 0);
  };
  
  const isSubItemSelected = (stageKey: string, subItemKey: string) => {
    return selectedWorkItems.some(w => w.stageKey === stageKey && w.subItems.includes(subItemKey));
  };
  
  const toggleWholeStage = (stage: typeof WORK_STATUS_STAGES[0], checked: boolean) => {
    if (checked) {
      // Remove any existing entries for this stage and add whole stage
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
      // Remove stage entirely
      setSelectedWorkItems(prev => prev.filter(w => w.stageKey !== stage.value));
    }
  };
  
  const toggleSubItem = (stage: typeof WORK_STATUS_STAGES[0], subItem: typeof stage.subItems[0], checked: boolean) => {
    const existingItem = selectedWorkItems.find(w => w.stageKey === stage.value);
    
    if (checked) {
      if (existingItem) {
        // If whole stage was selected, convert to specific sub-items
        if (existingItem.subItems.length === 0) {
          setSelectedWorkItems(prev => prev.map(w => 
            w.stageKey === stage.value 
              ? { ...w, subItems: [subItem.value], subItemLabels: [subItem.label] }
              : w
          ));
        } else {
          // Add sub-item to existing entry
          setSelectedWorkItems(prev => prev.map(w => 
            w.stageKey === stage.value 
              ? { ...w, subItems: [...w.subItems, subItem.value], subItemLabels: [...w.subItemLabels, subItem.label] }
              : w
          ));
        }
      } else {
        // Create new entry with this sub-item
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
      // Remove sub-item
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
    setSelectedWorkItems(prev => prev.map(w => 
      w.stageKey === stageKey ? { ...w, dateOffset: offset } : w
    ));
  };
  
  const getWorkDate = (offset: number): string => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + offset);
    return format(date, "yyyy-MM-dd");
  };
  
  const handleSubmit = () => {
    if (!selectedSite || selectedWorkItems.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a site and at least one work item",
        variant: "destructive",
      });
      return;
    }
    
    setIsConfirmOpen(true);
  };
  
  const confirmSubmit = () => {
    const site = allSites.find(s => s.id.toString() === selectedSite);
    
    // Create one task per selected work item
    selectedWorkItems.forEach(workItem => {
      const workDate = getWorkDate(workItem.dateOffset);
      const workType = workItem.subItems.length === 0 
        ? workItem.stageName 
        : workItem.subItemLabels.join(", ");
      
      const task: Task = {
        id: generateId("TASK"),
        employeeId,
        siteId: selectedSite,
        siteName: site?.name || "Unknown",
        workType: workType,
        workTag: workItem.stageName,
        notes,
        createdDate: format(new Date(), "yyyy-MM-dd"),
        workDate,
        originalDate: workDate, // Track original date for delay shifting
        status: "sent", // Merge created and sent - auto-send on creation
        createdBy: "Admin",
        workItems: [{
          stageKey: workItem.stageKey,
          stageName: workItem.stageName,
          subItems: workItem.subItems
        }],
        dateOffset: workItem.dateOffset
      };
      
      addTask(task);
    });
    
    toast({
      title: "Tasks Assigned",
      description: `${selectedWorkItems.length} task(s) assigned to ${employeeName}`,
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">Assign Task</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {/* Employee Info */}
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Assigning task to:</p>
              <p className="font-semibold text-primary">{employeeName}</p>
            </div>
            
            {/* Site Selection */}
            <div className="space-y-2">
              <Label>Select Site *</Label>
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
              <Label>Base Date (T) *</Label>
              <Input
                type="date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">This is the base date (T). Other tasks can be offset from this date.</p>
            </div>
            
            {/* Work Status Stages Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Work Items *</Label>
                {selectedWorkItems.length > 0 && (
                  <Badge variant="secondary">{getSelectedCount()} items selected</Badge>
                )}
              </div>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
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
                            <span className="font-medium">{stage.label}</span>
                            {selectedSubItemCount > 0 && !isWholeStageSelected && (
                              <Badge variant="outline" className="ml-auto text-xs">
                                {selectedSubItemCount} selected
                              </Badge>
                            )}
                            {isWholeStageSelected && (
                              <Badge className="ml-auto bg-primary/20 text-primary border-0 text-xs">
                                Whole stage
                              </Badge>
                            )}
                          </CollapsibleTrigger>
                          
                          {/* Date offset for this stage */}
                          {hasSelection && (
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-xs text-muted-foreground">T+</span>
                              <Input
                                type="number"
                                min={0}
                                className="w-14 h-7 text-center text-xs"
                                value={selectedWorkItems.find(w => w.stageKey === stage.value)?.dateOffset || 0}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateDateOffset(stage.value, parseInt(e.target.value) || 0)}
                              />
                            </div>
                          )}
                        </div>
                        
                        <CollapsibleContent>
                          <div className="pl-12 pr-3 pb-3 space-y-2">
                            {stage.subItems.map(subItem => (
                              <div key={subItem.value} className="flex items-center gap-2">
                                <Checkbox 
                                  checked={isSubItemSelected(stage.value, subItem.value) || isWholeStageSelected}
                                  disabled={isWholeStageSelected}
                                  onCheckedChange={(c) => toggleSubItem(stage, subItem, !!c)}
                                />
                                <span className="text-sm">{subItem.label}</span>
                                {subItem.photoRequired && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">📷</Badge>
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
            
            {/* Selected Tasks Preview */}
            {selectedWorkItems.length > 0 && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <Label className="text-xs text-muted-foreground">Tasks Preview:</Label>
                <div className="space-y-1">
                  {selectedWorkItems.map(item => (
                    <div key={item.stageKey} className="flex items-center justify-between text-sm">
                      <span>
                        {item.subItems.length === 0 
                          ? `${item.stageName} (All)` 
                          : `${item.stageName}: ${item.subItemLabels.join(", ")}`
                        }
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(getWorkDate(item.dateOffset)), "dd MMM")}</span>
                        {item.dateOffset > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">T+{item.dateOffset}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button 
              className="bg-primary text-primary-foreground"
              onClick={handleSubmit}
              disabled={selectedWorkItems.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign {selectedWorkItems.length > 0 ? `(${selectedWorkItems.length})` : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Confirmation Sheet */}
      <Sheet open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <SheetContent className="max-w-sm text-center overflow-y-auto custom-scrollbar">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Confirm Task Assignment</h3>
              <div className="mt-3 p-3 bg-muted/30 rounded-lg text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employee:</span>
                  <span className="font-medium">{employeeName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Site:</span>
                  <span className="font-medium">{allSites.find(s => s.id.toString() === selectedSite)?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks:</span>
                  <span className="font-medium">{selectedWorkItems.length} task(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Date:</span>
                  <span className="font-medium">{format(new Date(baseDate), "dd MMM yyyy")}</span>
                </div>
              </div>
              
              {/* Task details */}
              <div className="mt-3 p-3 bg-muted/20 rounded-lg text-left max-h-32 overflow-y-auto">
                {selectedWorkItems.map(item => (
                  <div key={item.stageKey} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                    <span>
                      {item.subItems.length === 0 
                        ? item.stageName 
                        : `${item.stageName}: ${item.subItemLabels.join(", ")}`
                      }
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {format(new Date(getWorkDate(item.dateOffset)), "dd MMM")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsConfirmOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button className="flex-1 bg-primary text-primary-foreground" onClick={confirmSubmit}>
                <Check className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

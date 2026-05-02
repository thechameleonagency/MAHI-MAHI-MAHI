import { useState } from "react";
import { Check, CheckCircle, AlertTriangle, Plus, Package, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface PresetItem {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
}

interface AssignedItem {
  id: number;
  item: string;
  quantity: number;
  dateIssued: string;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface AssignMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  presetItems: PresetItem[];
  assignedItems: AssignedItem[];
  inventoryItems: InventoryItem[];
  onAssign?: (items: { id: number; quantity: number; extraReason?: string }[]) => void;
}

export default function AssignMaterialModal({
  isOpen,
  onClose,
  projectName,
  presetItems,
  assignedItems,
  inventoryItems,
  onAssign
}: AssignMaterialModalProps) {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<{ id: number; quantity: number; extraReason?: string }[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notRequiredItems, setNotRequiredItems] = useState<Record<number, { marked: boolean; reason: string }>>({});
  const [extraItemReasons, setExtraItemReasons] = useState<Record<number, string>>({});

  // Match preset items with assigned items
  const getMatchStatus = () => {
    const matched: { preset: PresetItem; assigned: number; status: "complete" | "partial" | "pending" | "not-required" }[] = [];
    const extras: (AssignedItem & { reason?: string })[] = [];

    presetItems.forEach(preset => {
      // Check if marked as not required
      if (notRequiredItems[preset.id]?.marked) {
        matched.push({
          preset,
          assigned: 0,
          status: "not-required"
        });
        return;
      }

      const assignedQty = assignedItems
        .filter(a => a.item.toLowerCase().includes(preset.itemName.toLowerCase().split(' ')[0]))
        .reduce((sum, a) => sum + a.quantity, 0);
      
      matched.push({
        preset,
        assigned: assignedQty,
        status: assignedQty >= preset.quantity ? "complete" : assignedQty > 0 ? "partial" : "pending"
      });
    });

    // Find extras (assigned but not in preset)
    assignedItems.forEach(assigned => {
      const inPreset = presetItems.some(p => 
        assigned.item.toLowerCase().includes(p.itemName.toLowerCase().split(' ')[0])
      );
      if (!inPreset) {
        extras.push({
          ...assigned,
          reason: extraItemReasons[assigned.id]
        });
      }
    });

    return { matched, extras };
  };

  const { matched, extras } = getMatchStatus();
  const completedCount = matched.filter(m => m.status === "complete").length;
  const pendingCount = matched.filter(m => m.status === "pending").length;
  const partialCount = matched.filter(m => m.status === "partial").length;
  const notRequiredCount = matched.filter(m => m.status === "not-required").length;

  // Get preset quantity for an inventory item
  const getPresetQuantity = (itemName: string) => {
    const preset = presetItems.find(p => 
      itemName.toLowerCase().includes(p.itemName.toLowerCase().split(' ')[0]) ||
      p.itemName.toLowerCase().includes(itemName.toLowerCase().split(' ')[0])
    );
    if (!preset) return null;
    
    // Get already assigned quantity
    const alreadyAssigned = assignedItems
      .filter(a => a.item.toLowerCase().includes(preset.itemName.toLowerCase().split(' ')[0]))
      .reduce((sum, a) => sum + a.quantity, 0);
    
    return {
      total: preset.quantity,
      remaining: Math.max(0, preset.quantity - alreadyAssigned)
    };
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, { id: itemId, quantity: 1 }]);
    } else {
      setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setSelectedItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, quantity } : i
    ));
  };

  const handleExtraReasonChange = (itemId: number, reason: string) => {
    setSelectedItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, extraReason: reason } : i
    ));
  };

  const toggleNotRequired = (presetId: number, checked: boolean) => {
    setNotRequiredItems(prev => ({
      ...prev,
      [presetId]: { marked: checked, reason: prev[presetId]?.reason || "" }
    }));
  };

  const updateNotRequiredReason = (presetId: number, reason: string) => {
    setNotRequiredItems(prev => ({
      ...prev,
      [presetId]: { ...prev[presetId], reason }
    }));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, sel) => {
      const item = inventoryItems.find(i => i.id === sel.id);
      return sum + (item ? item.unitPrice * sel.quantity : 0);
    }, 0);
  };

  // Check if any selected item exceeds preset and doesn't have a reason
  const hasUnreasonedExcess = () => {
    return selectedItems.some(sel => {
      const item = inventoryItems.find(i => i.id === sel.id);
      if (!item) return false;
      const presetQty = getPresetQuantity(item.name);
      if (!presetQty) return false;
      return sel.quantity > presetQty.remaining && !sel.extraReason?.trim();
    });
  };

  const handleAssign = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to assign",
        variant: "destructive"
      });
      return;
    }

    if (hasUnreasonedExcess()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for quantities exceeding the preset requirement",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmation(true);
  };

  const confirmAssign = () => {
    onAssign?.(selectedItems);
    toast({
      title: "Materials Assigned",
      description: `${selectedItems.length} item(s) assigned to ${projectName}`,
    });
    setSelectedItems([]);
    setShowConfirmation(false);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <AppSheetContent layout="document" size="xxl" className="overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Assign Material - {projectName}
          </SheetTitle>
          <SheetDescription className="flex items-center justify-between">
            <span>Match materials against preset requirements and assign from inventory</span>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0 h-auto"
              onClick={() => {
                onClose();
                navigate('/inventory?tab=presets');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Inventory Presets
            </Button>
          </SheetDescription>
        </SheetHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-2 py-2">
          <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-xl font-bold text-primary">{presetItems.length}</p>
            <p className="text-xs text-muted-foreground">Required</p>
          </div>
          <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
            <p className="text-xl font-bold text-blue-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
          <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center">
            <p className="text-xl font-bold text-amber-600">{partialCount}</p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="p-2 bg-red-500/5 border border-red-500/20 rounded-lg text-center">
            <p className="text-xl font-bold text-red-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-2 bg-muted/50 border border-border rounded-lg text-center">
            <p className="text-xl font-bold text-muted-foreground">{notRequiredCount}</p>
            <p className="text-xs text-muted-foreground">Not Req.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Left: Preset Requirements */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 bg-muted/50 border-b">
              <h3 className="font-semibold text-sm">Preset Requirements</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {matched.map(({ preset, assigned, status }) => (
                  <div 
                    key={preset.id} 
                    className={`p-2 rounded-lg border ${
                      status === "complete" ? "bg-blue-500/5 border-blue-500/20" :
                      status === "partial" ? "bg-amber-500/5 border-amber-500/20" :
                      status === "not-required" ? "bg-muted/50 border-border" :
                      "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === "complete" ? (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        ) : status === "partial" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                        ) : status === "not-required" ? (
                          <X className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-red-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{preset.itemName}</p>
                          <p className="text-xs text-muted-foreground">{preset.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {status !== "not-required" && (
                          <>
                            <p className="text-sm font-medium">
                              {assigned}/{preset.quantity} {preset.unit}
                            </p>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                status === "complete" ? "text-blue-600" :
                                status === "partial" ? "text-amber-600" :
                                "text-red-600"
                              }`}
                            >
                              {status}
                            </Badge>
                          </>
                        )}
                        {status === "not-required" && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Not Required
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Mark as Not Required option */}
                    {status !== "complete" && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`not-req-${preset.id}`}
                            checked={notRequiredItems[preset.id]?.marked || false}
                            onCheckedChange={(checked) => toggleNotRequired(preset.id, !!checked)}
                          />
                          <Label htmlFor={`not-req-${preset.id}`} className="text-xs cursor-pointer">
                            Mark as not required
                          </Label>
                        </div>
                        {notRequiredItems[preset.id]?.marked && (
                          <Input
                            className="mt-1 h-7 text-xs"
                            placeholder="Reason..."
                            value={notRequiredItems[preset.id]?.reason || ""}
                            onChange={(e) => updateNotRequiredReason(preset.id, e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            {/* Extras */}
            {extras.length > 0 && (
              <div className="border-t p-3 bg-blue-500/5">
                <h4 className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                  <Plus className="h-3 w-3" />
                  EXTRA ITEMS (Not in Preset)
                </h4>
                <div className="space-y-2">
                  {extras.map(item => (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.item}</span>
                        <span className="text-muted-foreground">Qty: {item.quantity}</span>
                      </div>
                      <Input
                        className="h-6 text-xs"
                        placeholder="Enter reason for extra item..."
                        value={extraItemReasons[item.id] || ""}
                        onChange={(e) => setExtraItemReasons(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Inventory Selection */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 bg-muted/50 border-b">
              <h3 className="font-semibold text-sm">Assign from Inventory</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {inventoryItems.map(item => {
                  const isSelected = selectedItems.some(s => s.id === item.id);
                  const selectedItem = selectedItems.find(s => s.id === item.id);
                  const selectedQty = selectedItem?.quantity || 0;
                  const presetQty = getPresetQuantity(item.name);
                  const isOverPreset = presetQty && selectedQty > presetQty.remaining;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-2 rounded-lg border transition-colors ${
                        isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              Stock: {item.quantity} • ₹{item.unitPrice.toLocaleString()}/unit
                            </p>
                            {presetQty && (
                              <Badge variant="outline" className="text-xs">
                                Need: {presetQty.remaining} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Qty:</Label>
                            <Input
                              type="number"
                              className="w-16 h-7 text-center text-sm"
                              value={selectedQty}
                              min={1}
                              max={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Warning for over-preset quantity */}
                      {isSelected && isOverPreset && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                          <p className="text-xs text-amber-600 mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Quantity exceeds preset requirement ({presetQty.remaining} needed)
                          </p>
                          <Input
                            className="h-7 text-xs"
                            placeholder="Enter reason for extra quantity..."
                            value={selectedItem?.extraReason || ""}
                            onChange={(e) => handleExtraReasonChange(item.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Selection Summary */}
            {selectedItems.length > 0 && (
              <div className="p-3 border-t bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{selectedItems.length} item(s) selected</span>
                  <span className="text-sm font-semibold text-primary">
                    ₹{calculateTotal().toLocaleString()}
                  </span>
                </div>
                <Button className="w-full" size="sm" onClick={handleAssign}>
                  <Package className="h-4 w-4 mr-2" />
                  Assign Selected
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Sheet */}
        <Sheet open={showConfirmation} onOpenChange={setShowConfirmation}>
          <AppSheetContent layout="form" size="xs">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Confirm Assignment</h3>
              <p className="text-muted-foreground mt-2">
                Assign {selectedItems.length} item(s) worth ₹{calculateTotal().toLocaleString()} to this project?
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirmation(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={confirmAssign}>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          </AppSheetContent>
        </Sheet>
      </AppSheetContent>
    </Sheet>
  );
}
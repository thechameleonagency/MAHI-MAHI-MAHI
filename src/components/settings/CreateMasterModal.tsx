import { useState, useEffect } from "react";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight, Plus, Check, ArrowLeft, Briefcase, Receipt, Package, Wallet, FileText, Users, Calculator, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useMasters, masterGroups } from "@/contexts/MastersContext";
import { MasterItem } from "@/data/masters";

interface CreateMasterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const groupIcons: Record<string, React.ReactNode> = {
  projects: <Briefcase className="h-5 w-5" />,
  expenses: <Receipt className="h-5 w-5" />,
  inventory: <Package className="h-5 w-5" />,
  finance: <Wallet className="h-5 w-5" />,
  quotations: <FileText className="h-5 w-5" />,
  hr: <Users className="h-5 w-5" />,
  gst: <Calculator className="h-5 w-5" />,
  system: <Settings className="h-5 w-5" />,
};

const CreateMasterModal = ({ open, onOpenChange }: CreateMasterModalProps) => {
  const masters = useMasters();
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemValue, setNewItemValue] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setStep(1);
      setSelectedGroup("");
      setSelectedCategory("");
      setNewItemLabel("");
      setNewItemValue("");
      setNewItemUnit("");
    }
  }, [open]);

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
    setStep(2);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 2) {
      setSelectedGroup("");
      setStep(1);
    } else if (step === 3) {
      setSelectedCategory("");
      setStep(2);
    }
  };

  const handleSave = () => {
    if (newItemLabel && selectedCategory) {
      const value = newItemValue || newItemLabel.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const newItem: MasterItem = { value, label: newItemLabel };
      if (newItemUnit) {
        newItem.unit = newItemUnit;
      }
      
      masters.addMasterItem(selectedCategory, newItem);
      toast({
        title: "Master Item Added",
        description: `"${newItemLabel}" has been added to ${masters.getCategoryById(selectedCategory).label}`,
      });
      onOpenChange(false);
    }
  };

  const getGroupCategories = () => {
    const group = masterGroups.find(g => g.id === selectedGroup);
    if (!group) return [];
    
    return group.categories.map(catId => {
      const { label, isEditable } = masters.getCategoryById(catId);
      return { id: catId, label, isEditable };
    }).filter(cat => cat.isEditable);
  };

  const needsUnitField = selectedCategory.includes("SubCategories") || selectedCategory === "outsourceWorkTags";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {step > 1 && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span>
              {step === 1 && "Create Master - Step 1: Select Group"}
              {step === 2 && "Create Master - Step 2: Select Category"}
              {step === 3 && "Create Master - Step 3: Add Item"}
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Group */}
        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {masterGroups.filter(g => g.id !== "system").map((group) => (
              <Card
                key={group.id}
                className={`p-4 cursor-pointer hover:border-primary transition-colors ${
                  selectedGroup === group.id ? "border-primary bg-primary/5" : ""
                }`}
                onClick={() => handleGroupSelect(group.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {groupIcons[group.id]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{group.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Step 2: Select Category */}
        {step === 2 && (
          <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              {groupIcons[selectedGroup]}
              <span className="font-medium">
                {masterGroups.find(g => g.id === selectedGroup)?.label}
              </span>
            </div>
            {getGroupCategories().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No editable categories in this group
              </p>
            ) : (
              <div className="grid gap-2">
                {getGroupCategories().map((cat) => (
                  <Card
                    key={cat.id}
                    className={`p-3 cursor-pointer hover:border-primary transition-colors ${
                      selectedCategory === cat.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => handleCategorySelect(cat.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cat.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {masters.getCategoryById(cat.id).items.length} items
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Add Item */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{masterGroups.find(g => g.id === selectedGroup)?.label}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">{masters.getCategoryById(selectedCategory).label}</Badge>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemLabel">Item Name *</Label>
                <Input
                  id="itemLabel"
                  placeholder="Enter display name"
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="itemValue">
                  Value (optional)
                  <span className="text-xs text-muted-foreground ml-1">
                    - auto-generated if empty
                  </span>
                </Label>
                <Input
                  id="itemValue"
                  placeholder="e.g., my-custom-value"
                  value={newItemValue}
                  onChange={(e) => setNewItemValue(e.target.value)}
                />
              </div>
              
              {needsUnitField && (
                <div className="space-y-2">
                  <Label htmlFor="itemUnit">
                    Unit (optional)
                    <span className="text-xs text-muted-foreground ml-1">
                      - e.g., hours, pcs, sqft
                    </span>
                  </Label>
                  <Input
                    id="itemUnit"
                    placeholder="e.g., hours"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {step === 3 && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!newItemLabel}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        )}
      </AppSheetContent>
    </Sheet>
  );
};

export default CreateMasterModal;
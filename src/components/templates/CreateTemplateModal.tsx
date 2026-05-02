import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "quotation" | "site";
}

export function CreateTemplateModal({ open, onOpenChange, type }: CreateTemplateModalProps) {
  const { addQuotationTemplate, addSiteChecklistTemplate, inventoryItems } = useAppData();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState<"residential" | "commercial" | "industrial">("residential");
  
  // For Quotation Templates
  const [materials, setMaterials] = useState<{ inventoryItemId: number; quantity: number }[]>([]);
  const [services, setServices] = useState<{ description: string; sac: string; rate: number; gstRate: number }[]>([]);

  const handleAddMaterial = () => {
    setMaterials([...materials, { inventoryItemId: inventoryItems[0]?.id || 0, quantity: 1 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleAddService = () => {
    setServices([...services, { description: "", sac: "9987", rate: 0, gstRate: 18 }]);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name) {
      toast({ title: "Error", description: "Please enter a template name", variant: "destructive" });
      return;
    }

    const id = `TPL-${Date.now()}`;
    const createdAt = new Date().toISOString().split("T")[0];

    if (type === "quotation") {
      const materialItems = materials.map(m => {
        const item = inventoryItems.find(i => i.id === m.inventoryItemId);
        return {
          inventoryItemId: m.inventoryItemId,
          name: item?.name || "Unknown",
          quantity: m.quantity,
          unit: item?.unit || "pcs"
        };
      });

      addQuotationTemplate({
        id,
        name,
        segment,
        createdAt,
        materialItems,
        services
      });
    } else {
      const items = materials.map(m => {
        const item = inventoryItems.find(i => i.id === m.inventoryItemId);
        return {
          inventoryItemId: m.inventoryItemId,
          name: item?.name || "Unknown",
          quantity: m.quantity,
          unit: item?.unit || "pcs"
        };
      });

      addSiteChecklistTemplate({
        id,
        name,
        segment,
        createdAt,
        items
      });
    }

    toast({ title: "Success", description: "Template created successfully" });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setSegment("residential");
    setMaterials([]);
    setServices([]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add {type === "quotation" ? "Quotation" : "Site Checklist"} Template</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5kW Residential Standard" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Select value={segment} onValueChange={(v: any) => setSegment(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Materials</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMaterial} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Material
              </Button>
            </div>
            {materials.map((m, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Select 
                    value={m.inventoryItemId.toString()} 
                    onValueChange={(v) => {
                      const newMaterials = [...materials];
                      newMaterials[i].inventoryItemId = parseInt(v);
                      setMaterials(newMaterials);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map(item => (
                        <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Input 
                    type="number" 
                    value={m.quantity} 
                    onChange={(e) => {
                      const newMaterials = [...materials];
                      newMaterials[i].quantity = parseFloat(e.target.value);
                      setMaterials(newMaterials);
                    }}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterial(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {type === "quotation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Services</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddService} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Service
                </Button>
              </div>
              {services.map((s, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-md relative">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveService(i)} className="absolute top-2 right-2 text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input 
                        value={s.description} 
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].description = e.target.value;
                          setServices(newServices);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SAC</Label>
                      <Input 
                        value={s.sac} 
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].sac = e.target.value;
                          setServices(newServices);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rate (₹)</Label>
                      <Input 
                        type="number"
                        value={s.rate} 
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].rate = parseFloat(e.target.value);
                          setServices(newServices);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GST %</Label>
                      <Input 
                        type="number"
                        value={s.gstRate} 
                        onChange={(e) => {
                          const newServices = [...services];
                          newServices[i].gstRate = parseFloat(e.target.value);
                          setServices(newServices);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Template</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

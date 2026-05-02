import { useState } from "react";
import { Plus, Search, Layers, Package, Check, Sun, Zap, Factory, ChevronDown, ChevronRight, Eye, Edit, Trash2, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { InventoryPreset } from "@/types/project";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { PageShell } from "@/components/layout/PageShell";

// Preset material item interface
interface PresetMaterial {
  id: number;
  category: string;
  materialName: string;
  size: string;
  quantity: number;
  rate: number;
  unit: string;
}

// Full preset interface
interface FullPreset {
  id: string;
  name: string;
  category: 'residential' | 'commercial' | 'industrial';
  presetType: 'quotation' | 'invoice';
  capacityKW: number;
  panelBrand: string;
  panelWattage: number;
  panelCount: number;
  inverterBrand: string;
  inverterCapacity: string;
  structureType: string;
  estimatedCost: number;
  materials: PresetMaterial[];
}

// Base materials for all presets
const getBaseMaterials = (multiplier: number = 1): PresetMaterial[] => [
  { id: 1, category: "Structure", materialName: "Thread Rod", size: "M12x2mtr", quantity: Math.ceil(8 * multiplier), rate: 45, unit: "pcs" },
  { id: 2, category: "Structure", materialName: "Nut & Washer (M12)", size: "M12 thread", quantity: Math.ceil(20 * multiplier), rate: 8, unit: "pcs" },
  { id: 3, category: "Structure", materialName: "Wall Support Anchor Fastener", size: "M10", quantity: Math.ceil(8 * multiplier), rate: 30, unit: "pcs" },
  { id: 4, category: "Structure", materialName: "Lock Fix Chemical", size: "-", quantity: Math.ceil(2 * multiplier), rate: 300, unit: "pcs" },
  { id: 5, category: "Structure", materialName: "Leg with Base Plate", size: "75x75mm", quantity: Math.ceil(4 * multiplier), rate: 280, unit: "pcs" },
  { id: 7, category: "Structure", materialName: "Raftor", size: "60x40mm", quantity: Math.ceil(4 * multiplier), rate: 45, unit: "foot" },
  { id: 20, category: "Panel/Module", materialName: "Modules", size: "550W-620W", quantity: Math.ceil(6 * multiplier), rate: 14000, unit: "pcs" },
  { id: 21, category: "Panel/Module", materialName: "Mid Clamp", size: "30mm", quantity: Math.ceil(12 * multiplier), rate: 20, unit: "pcs" },
  { id: 22, category: "Panel/Module", materialName: "End Clamp", size: "-", quantity: Math.ceil(8 * multiplier), rate: 25, unit: "pcs" },
  { id: 28, category: "Wiring", materialName: "Inverter", size: "3KW", quantity: 1, rate: 18000, unit: "pcs" },
  { id: 29, category: "Wiring", materialName: "AC DB 1PH", size: "-", quantity: 1, rate: 2800, unit: "pcs" },
  { id: 31, category: "Wiring", materialName: "DC DB 1PH", size: "-", quantity: 1, rate: 2200, unit: "pcs" },
  { id: 41, category: "Wiring", materialName: "DC Wire", size: "4sqmm copper", quantity: Math.ceil(30 * multiplier), rate: 45, unit: "meter" },
  { id: 42, category: "Wiring", materialName: "MC4 Connector", size: "-", quantity: Math.ceil(12 * multiplier), rate: 35, unit: "pcs" },
  { id: 54, category: "Earthing", materialName: "LA (Lightning Arrestor)", size: "1 meter", quantity: 1, rate: 2500, unit: "pcs" },
  { id: 55, category: "Earthing", materialName: "Earthing Rod", size: "1 meter", quantity: Math.ceil(1 * multiplier), rate: 750, unit: "pcs" },
  { id: 60, category: "Meter", materialName: "Net Meter (Single Phase)", size: "-", quantity: 1, rate: 6000, unit: "pcs" },
];

// Create preset function
const createPreset = (
  id: string,
  name: string,
  category: 'residential' | 'commercial' | 'industrial',
  capacityKW: number,
  panelCount: number,
  panelBrand: string,
  panelWattage: number,
  inverterBrand: string,
  inverterCapacity: string,
  structureType: string,
  estimatedCost: number,
  presetType: 'quotation' | 'invoice' = 'invoice'
): FullPreset => {
  const multiplier = capacityKW / 3;
  const materials = getBaseMaterials(multiplier);
  
  const panelMaterial = materials.find(m => m.id === 15);
  if (panelMaterial) {
    panelMaterial.quantity = panelCount;
    panelMaterial.materialName = `${panelBrand} ${panelWattage}W Solar Panel`;
    panelMaterial.size = `${panelWattage}W`;
  }
  
  const inverterMaterial = materials.find(m => m.id === 22);
  if (inverterMaterial) {
    inverterMaterial.materialName = `${inverterBrand} ${inverterCapacity} Inverter`;
    inverterMaterial.size = inverterCapacity;
    inverterMaterial.rate = capacityKW <= 5 ? 35000 : capacityKW <= 10 ? 65000 : 150000;
  }
  
  return {
    id,
    name,
    category,
    presetType,
    capacityKW,
    panelBrand,
    panelWattage,
    panelCount,
    inverterBrand,
    inverterCapacity,
    structureType,
    estimatedCost,
    materials
  };
};

// Initial presets
const initialPresets: FullPreset[] = [
  createPreset("res-3kw", "3kW Residential System", "residential", 3, 6, "Waaree", 540, "Growatt", "3kW", "Elevated GI", 185000, "invoice"),
  createPreset("res-5kw", "5kW Residential System", "residential", 5, 10, "Waaree", 540, "Growatt", "5kW", "Elevated GI", 280000, "invoice"),
  createPreset("res-10kw", "10kW Residential System", "residential", 10, 18, "Tata", 550, "Growatt", "10kW", "Elevated GI", 520000, "invoice"),
  createPreset("com-15kw", "15kW Commercial System", "commercial", 15, 27, "Tata", 550, "Sungrow", "15kW", "Flush Mount GI", 780000, "invoice"),
  createPreset("com-25kw", "25kW Commercial System", "commercial", 25, 45, "Adani", 550, "Sungrow", "25kW", "Flush Mount GI", 1320000, "invoice"),
  createPreset("ind-50kw", "50kW Industrial System", "industrial", 50, 91, "Canadian Solar", 550, "Sungrow", "50kW", "Ground Mount", 2650000, "invoice"),
  createPreset("q-res-3kw", "3kW Residential (Quotation)", "residential", 3, 6, "Waaree", 540, "Growatt", "3kW", "Elevated GI", 185000, "quotation"),
  createPreset("q-res-5kw", "5kW Residential (Quotation)", "residential", 5, 10, "Waaree", 540, "Growatt", "5kW", "Elevated GI", 280000, "quotation"),
  createPreset("q-com-15kw", "15kW Commercial (Quotation)", "commercial", 15, 27, "Tata", 550, "Sungrow", "15kW", "Flush Mount GI", 780000, "quotation"),
];

const Presets = () => {
  const { inventoryPresets, servicePresets } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [presetTypeFilter, setPresetTypeFilter] = useState<"all" | "quotation" | "invoice">("all");
  const [presets, setPresets] = useState<FullPreset[]>(initialPresets);
  
  // Modal states
  const [isViewPresetOpen, setIsViewPresetOpen] = useState(false);
  const [isEditPresetOpen, setIsEditPresetOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FullPreset | null>(null);
  const [editingPreset, setEditingPreset] = useState<FullPreset | null>(null);
  
  // Category expansion states
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    residential: true,
    commercial: true,
    industrial: true,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const calculatePresetTotal = (materials: PresetMaterial[]) => {
    return materials.reduce((sum, m) => sum + (m.quantity * m.rate), 0);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential': return <Sun className="h-5 w-5 text-amber-500" />;
      case 'commercial': return <Zap className="h-5 w-5 text-blue-500" />;
      case 'industrial': return <Factory className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5" />;
    }
  };

  const handleViewPreset = (preset: FullPreset) => {
    setSelectedPreset(preset);
    setIsViewPresetOpen(true);
  };

  const handleEditPreset = (preset: FullPreset) => {
    setEditingPreset({ ...preset, materials: preset.materials.map(m => ({ ...m })) });
    setIsEditPresetOpen(true);
  };

  const handleDeletePreset = (presetId: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
    toast({ title: "Preset Deleted", description: "The preset has been removed" });
  };

  const handleSavePreset = () => {
    if (editingPreset) {
      setPresets(prev => prev.map(p => p.id === editingPreset.id ? editingPreset : p));
      toast({ title: "Preset Updated", description: `"${editingPreset.name}" has been saved` });
      setIsEditPresetOpen(false);
      setEditingPreset(null);
    }
  };

  const handleAddNewPreset = (category: 'residential' | 'commercial' | 'industrial') => {
    const defaultKW = category === 'residential' ? 3 : category === 'commercial' ? 15 : 50;
    const newPreset = createPreset(
      `${category}-${Date.now()}`,
      `New ${category.charAt(0).toUpperCase() + category.slice(1)} System`,
      category,
      defaultKW,
      Math.ceil(defaultKW * 1.8),
      category === 'residential' ? 'Waaree' : category === 'commercial' ? 'Tata' : 'Canadian Solar',
      550,
      category === 'residential' ? 'Growatt' : 'Sungrow',
      `${defaultKW}kW`,
      category === 'residential' ? 'Elevated GI' : category === 'commercial' ? 'Flush Mount GI' : 'Ground Mount',
      defaultKW * 52000
    );
    setEditingPreset(newPreset);
    setIsEditPresetOpen(true);
  };

  const updatePresetMaterial = (materialId: number, field: keyof PresetMaterial, value: number | string) => {
    if (!editingPreset) return;
    setEditingPreset({
      ...editingPreset,
      materials: editingPreset.materials.map(m => 
        m.id === materialId ? { ...m, [field]: value } : m
      )
    });
  };

  const categoryLabels = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial'
  };

  const categoryDescriptions = {
    residential: 'Home and small-scale installations (1-10 kW)',
    commercial: 'Business and medium-scale installations (10-50 kW)',
    industrial: 'Large-scale and utility installations (50+ kW)'
  };

  return (
    <PageShell className="space-y-4 md:space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Presets</p>
            <p className="text-2xl font-semibold text-foreground">{presets.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Residential</p>
            <p className="text-2xl font-semibold text-amber-500">{presets.filter(p => p.category === 'residential').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Commercial</p>
            <p className="text-2xl font-semibold text-chart-info">{presets.filter(p => p.category === 'commercial').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Industrial</p>
            <p className="text-2xl font-semibold text-primary">{presets.filter(p => p.category === 'industrial').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Preset Type Filter */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <span className="text-sm font-medium text-muted-foreground">Show Presets For:</span>
        <div className="flex gap-2">
          <Button 
            variant={presetTypeFilter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setPresetTypeFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={presetTypeFilter === "quotation" ? "default" : "outline"} 
            size="sm"
            onClick={() => setPresetTypeFilter("quotation")}
          >
            <FileText className="w-4 h-4 mr-1" />
            For Quotations
          </Button>
           <Button 
            variant={presetTypeFilter === "invoice" ? "default" : "outline"} 
            size="sm"
            onClick={() => setPresetTypeFilter("invoice")}
          >
            <FileText className="w-4 h-4 mr-1" />
            For Invoice & Inventory Matching
          </Button>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {presetTypeFilter === "quotation" 
            ? "Simplified presets for client quotations" 
            : presetTypeFilter === "invoice"
            ? "Detailed presets for invoice & inventory matching"
            : "Showing all preset types"}
        </span>
      </div>

      {/* Presets by Category */}
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-6 pr-4">
          {(['residential', 'commercial', 'industrial'] as const).map((category) => {
            const categoryPresets = presets.filter(p => 
              p.category === category && 
              (presetTypeFilter === "all" || p.presetType === presetTypeFilter)
            );

            return (
              <Card key={category} className="bg-card border-border">
                <Collapsible 
                  open={expandedCategories[category]} 
                  onOpenChange={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                >
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(category)}
                          <div className="text-left">
                            <CardTitle className="text-base font-medium">{categoryLabels[category]} Presets</CardTitle>
                            <CardDescription>{categoryDescriptions[category]}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{categoryPresets.length} presets</Badge>
                          {expandedCategories[category] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="flex justify-end mb-4">
                        <Button size="sm" variant="outline" onClick={() => handleAddNewPreset(category)}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Preset
                        </Button>
                      </div>
                      {categoryPresets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No presets created yet</p>
                          <p className="text-xs">Click "Add Preset" to create your first template</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {categoryPresets.map((preset) => (
                            <div
                              key={preset.id}
                              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="font-medium">{preset.name}</h4>
                                  <Badge variant="outline">{preset.capacityKW} kW</Badge>
                                  <Badge variant="secondary">{preset.materials.length} items</Badge>
                                   <Badge className={preset.presetType === "quotation" ? "bg-amber-500/20 text-amber-600 border-0" : "bg-blue-500/20 text-blue-600 border-0"}>
                                    {preset.presetType === "quotation" ? "For Quotation" : "For Invoice & Inventory Matching"}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                                  <div>
                                    <span className="block text-xs text-muted-foreground/70">Panels</span>
                                    <span>{preset.panelCount}x {preset.panelBrand} {preset.panelWattage}W</span>
                                  </div>
                                  <div>
                                    <span className="block text-xs text-muted-foreground/70">Inverter</span>
                                    <span>{preset.inverterBrand} {preset.inverterCapacity}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xs text-muted-foreground/70">Structure</span>
                                    <span>{preset.structureType}</span>
                                  </div>
                                  <div>
                                    <span className="block text-xs text-muted-foreground/70">Est. Cost</span>
                                    <span className="font-semibold text-primary">{formatCurrency(preset.estimatedCost)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <Button variant="outline" size="sm" onClick={() => handleViewPreset(preset)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleEditPreset(preset)}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeletePreset(preset.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* View Preset Modal */}
      <Sheet open={isViewPresetOpen} onOpenChange={setIsViewPresetOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              {selectedPreset && getCategoryIcon(selectedPreset.category)}
              {selectedPreset?.name}
              <Badge variant="outline">{selectedPreset?.capacityKW} kW</Badge>
            </SheetTitle>
          </SheetHeader>
          {selectedPreset && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <span className="text-xs text-muted-foreground">Panels</span>
                  <p className="font-medium">{selectedPreset.panelCount}x {selectedPreset.panelBrand} {selectedPreset.panelWattage}W</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Inverter</span>
                  <p className="font-medium">{selectedPreset.inverterBrand} {selectedPreset.inverterCapacity}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Structure</span>
                  <p className="font-medium">{selectedPreset.structureType}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estimated Cost</span>
                  <p className="font-medium text-primary">{formatCurrency(selectedPreset.estimatedCost)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Material List ({selectedPreset.materials.length} items)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPreset.materials.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.materialName}</TableCell>
                        <TableCell className="text-muted-foreground">{item.size}</TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">₹{item.rate.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">₹{(item.quantity * item.rate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total Material Cost: </span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(calculatePresetTotal(selectedPreset.materials))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Preset Modal */}
      <Sheet open={isEditPresetOpen} onOpenChange={setIsEditPresetOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] h-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingPreset?.id.includes(Date.now().toString().slice(0, 8)) 
                ? 'Create New Preset' 
                : 'Edit Preset'}
            </SheetTitle>
          </SheetHeader>
          {editingPreset && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Preset Name</Label>
                  <Input 
                    value={editingPreset.name} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={editingPreset.category} 
                    onValueChange={(v: 'residential' | 'commercial' | 'industrial') => setEditingPreset({ ...editingPreset, category: v })}
                  >
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
                <div className="space-y-2">
                  <Label>Capacity (kW)</Label>
                  <Input 
                    type="number" 
                    value={editingPreset.capacityKW} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, capacityKW: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Panel Brand</Label>
                  <Input 
                    value={editingPreset.panelBrand} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, panelBrand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Panel Wattage</Label>
                  <Input 
                    type="number" 
                    value={editingPreset.panelWattage} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, panelWattage: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Panel Count</Label>
                  <Input 
                    type="number" 
                    value={editingPreset.panelCount} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, panelCount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Structure Type</Label>
                  <Input 
                    value={editingPreset.structureType} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, structureType: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Inverter Brand</Label>
                  <Input 
                    value={editingPreset.inverterBrand} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, inverterBrand: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inverter Capacity</Label>
                  <Input 
                    value={editingPreset.inverterCapacity} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, inverterCapacity: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Cost</Label>
                  <Input 
                    type="number" 
                    value={editingPreset.estimatedCost} 
                    onChange={(e) => setEditingPreset({ ...editingPreset, estimatedCost: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preset Type</Label>
                  <Select 
                    value={editingPreset.presetType} 
                    onValueChange={(v: 'quotation' | 'invoice') => setEditingPreset({ ...editingPreset, presetType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quotation">For Quotation</SelectItem>
                      <SelectItem value="invoice">For Invoice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Material List */}
              <div>
                <h4 className="font-medium mb-3">Material List ({editingPreset.materials.length} items)</h4>
                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-center w-[100px]">Qty</TableHead>
                        <TableHead className="text-right w-[120px]">Rate (₹)</TableHead>
                        <TableHead className="text-right w-[100px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editingPreset.materials.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Input 
                              value={item.materialName}
                              onChange={(e) => updatePresetMaterial(item.id, 'materialName', e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updatePresetMaterial(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              className="h-8 w-20 text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={item.rate}
                              onChange={(e) => updatePresetMaterial(item.id, 'rate', parseInt(e.target.value) || 0)}
                              className="h-8 w-24 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{(item.quantity * item.rate).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">Total: </span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(calculatePresetTotal(editingPreset.materials))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsEditPresetOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePreset}>
              <Save className="h-4 w-4 mr-2" />
              Save Preset
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Presets;

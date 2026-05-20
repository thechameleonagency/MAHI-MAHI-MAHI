import { useMemo, useState } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { useMasters } from "@/contexts/MastersContext";
import { useCan } from "@/hooks/useCan";
import { toast } from "@/hooks/use-toast";
import type {
  SiteChecklistTemplate,
  SiteChecklistTemplateBomLine,
  TemplateCapacitySegment,
} from "@/types/templates";

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "quotation" | "site";
}

type SiteSubtype = "generic" | "solar_package";

export function CreateTemplateModal({ open, onOpenChange, type }: CreateTemplateModalProps) {
  const {
    addQuotationTemplate,
    addSiteChecklistTemplate,
    inventoryItems,
    quotationTemplates,
    siteChecklistTemplates,
  } = useAppData();
  const { getSacCodes, getGstRates } = useMasters();
  const canCreateTemplate = useCan("template", "create");
  const sacCodes = useMemo(() => getSacCodes(), [getSacCodes]);
  const gstRates = useMemo(() => getGstRates(), [getGstRates]);
  const defaultSac = sacCodes[0]?.value ?? "";
  const defaultGstRate = useMemo(() => {
    const preferred = gstRates.find((g) => g.value === "18");
    const raw = preferred?.value ?? gstRates[0]?.value ?? "18";
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 18;
  }, [gstRates]);

  const [name, setName] = useState("");
  const [segment, setSegment] = useState<TemplateCapacitySegment>("residential");

  /** Site Checklist tab subtype selector — "Solar package" enables rich BOM editor. */
  const [siteSubtype, setSiteSubtype] = useState<SiteSubtype>("generic");

  // Catalog-linked materials (used by both tabs for simple form).
  const [materials, setMaterials] = useState<{ inventoryItemId: string; quantity: number }[]>([]);
  const [services, setServices] = useState<{ description: string; sac: string; rate: number; gstRate: number }[]>([]);

  // Solar-package rich metadata (Site Checklist tab only).
  const [capacityKW, setCapacityKW] = useState<number>(0);
  const [panelBrand, setPanelBrand] = useState("");
  const [panelWattage, setPanelWattage] = useState<number>(0);
  const [panelCount, setPanelCount] = useState<number>(0);
  const [inverterBrand, setInverterBrand] = useState("");
  const [inverterCapacity, setInverterCapacity] = useState("");
  const [structureType, setStructureType] = useState("");
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [bom, setBom] = useState<SiteChecklistTemplateBomLine[]>([]);

  const handleAddMaterial = () => {
    setMaterials([...materials, { inventoryItemId: inventoryItems[0]?.id ? String(inventoryItems[0].id) : "", quantity: 1 }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleAddService = () => {
    setServices([...services, { description: "", sac: defaultSac, rate: 0, gstRate: defaultGstRate }]);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const handleAddBomLine = () => {
    const nextId = bom.length > 0 ? Math.max(...bom.map((b) => b.id)) + 1 : 1;
    setBom([
      ...bom,
      {
        id: nextId,
        category: "Structure",
        materialName: "",
        size: "",
        quantity: 0,
        rate: 0,
        unit: "pcs",
      },
    ]);
  };

  const handleRemoveBomLine = (id: number) => setBom(bom.filter((b) => b.id !== id));

  const updateBomLine = (
    id: number,
    field: keyof SiteChecklistTemplateBomLine,
    value: string | number,
  ) => {
    setBom(bom.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const resetForm = () => {
    setName("");
    setSegment("residential");
    setSiteSubtype("generic");
    setMaterials([]);
    setServices([]);
    setCapacityKW(0);
    setPanelBrand("");
    setPanelWattage(0);
    setPanelCount(0);
    setInverterBrand("");
    setInverterCapacity("");
    setStructureType("");
    setEstimatedCost(0);
    setBom([]);
  };

  const handleSave = () => {
    if (!canCreateTemplate) {
      toast({
        title: "Action not permitted",
        description: "Your role cannot create templates.",
        variant: "destructive",
      });
      return;
    }
    if (!name) {
      toast({ title: "Error", description: "Please enter a template name", variant: "destructive" });
      return;
    }
    if (type === "quotation" && quotationTemplates?.some((t) => t.name === name)) {
      toast({ title: "Duplicate Name", description: "A template with this name already exists.", variant: "destructive" });
      return;
    }
    if (type === "site" && siteChecklistTemplates?.some((t) => t.name === name)) {
      toast({ title: "Duplicate Name", description: "A template with this name already exists.", variant: "destructive" });
      return;
    }
    const invalidGst = services.find((s) => s.gstRate < 0 || s.gstRate > 100);
    if (invalidGst) {
      toast({ title: "Invalid GST Rate", description: "GST rate must be between 0 and 100.", variant: "destructive" });
      return;
    }

    const id = `TPL-${Date.now()}`;
    const createdAt = new Date().toISOString().split("T")[0];

    if (type === "quotation") {
      const materialItems = materials.map((m) => {
        const item = inventoryItems.find((i) => i.id === m.inventoryItemId);
        return {
          inventoryItemId: m.inventoryItemId,
          name: item?.name || "Unknown",
          quantity: m.quantity,
          unit: item?.unit || "pcs",
        };
      });

      addQuotationTemplate({
        id,
        name,
        segment,
        createdAt,
        materialItems,
        services,
      });
    } else {
      if (siteSubtype === "solar_package") {
        if (bom.length === 0) {
          toast({
            title: "BOM required",
            description: "Add at least one BOM line for a solar package template.",
            variant: "destructive",
          });
          return;
        }
        const items = bom.map((line) => ({
          inventoryItemId: line.id,
          name: line.materialName || "Unknown",
          quantity: line.quantity,
          unit: line.unit,
        }));
        const template: SiteChecklistTemplate = {
          id,
          name,
          segment,
          createdAt,
          items,
          subtype: "solar_package",
          capacityKW: capacityKW || undefined,
          panelBrand: panelBrand || undefined,
          panelWattage: panelWattage || undefined,
          panelCount: panelCount || undefined,
          inverterBrand: inverterBrand || undefined,
          inverterCapacity: inverterCapacity || undefined,
          structureType: structureType || undefined,
          estimatedCost: estimatedCost || undefined,
          materialsBom: bom,
        };
        addSiteChecklistTemplate(template);
      } else {
        const items = materials.map((m) => {
          const item = inventoryItems.find((i) => i.id === m.inventoryItemId);
          return {
            inventoryItemId: m.inventoryItemId,
            name: item?.name || "Unknown",
            quantity: m.quantity,
            unit: item?.unit || "pcs",
          };
        });

        addSiteChecklistTemplate({
          id,
          name,
          segment,
          createdAt,
          items,
          subtype: "generic",
        });
      }
    }

    toast({ title: "Success", description: "Template created successfully" });
    onOpenChange(false);
    resetForm();
  };

  const isSolarPackage = type === "site" && siteSubtype === "solar_package";
  const bomTotal = bom.reduce((sum, b) => sum + b.quantity * b.rate, 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="scroll" size="xl">
        <SheetHeader>
          <SheetTitle>
            Add {type === "quotation" ? "Quotation" : "Site Checklist"} Template
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 5kW Residential Standard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segment</Label>
              <Select value={segment} onValueChange={(v: TemplateCapacitySegment) => setSegment(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* "Solar package" subtype was folded into the single Site Checklist concept —
              every site checklist is now a flat materials list. */}

          {/* Solar package rich metadata + BOM editor */}
          {isSolarPackage && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Capacity (kW)</Label>
                  <Input
                    type="number"
                    value={capacityKW}
                    onChange={(e) => setCapacityKW(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Panel brand</Label>
                  <Input value={panelBrand} onChange={(e) => setPanelBrand(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Panel wattage</Label>
                  <Input
                    type="number"
                    value={panelWattage}
                    onChange={(e) => setPanelWattage(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Panel count</Label>
                  <Input
                    type="number"
                    value={panelCount}
                    onChange={(e) => setPanelCount(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inverter brand</Label>
                  <Input value={inverterBrand} onChange={(e) => setInverterBrand(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Inverter capacity</Label>
                  <Input
                    value={inverterCapacity}
                    onChange={(e) => setInverterCapacity(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Structure type</Label>
                  <Input value={structureType} onChange={(e) => setStructureType(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estimated cost (₹)</Label>
                  <Input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Materials BOM</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddBomLine} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add BOM line
                  </Button>
                </div>
                {bom.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No BOM lines yet — click "Add BOM line" to add structure, panel, wiring, earthing, or meter items.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {bom.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={row.category}
                            onValueChange={(v) => updateBomLine(row.id, "category", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Structure">Structure</SelectItem>
                              <SelectItem value="Panel/Module">Panel/Module</SelectItem>
                              <SelectItem value="Wiring">Wiring</SelectItem>
                              <SelectItem value="Earthing">Earthing</SelectItem>
                              <SelectItem value="Meter">Meter</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Label className="text-xs">Material</Label>
                          <Input
                            value={row.materialName}
                            onChange={(e) => updateBomLine(row.id, "materialName", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Input
                            value={row.size ?? ""}
                            onChange={(e) => updateBomLine(row.id, "size", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              updateBomLine(row.id, "quantity", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={row.unit}
                            onChange={(e) => updateBomLine(row.id, "unit", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Rate (₹)</Label>
                          <Input
                            type="number"
                            value={row.rate}
                            onChange={(e) =>
                              updateBomLine(row.id, "rate", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveBomLine(row.id)}
                            className="text-destructive"
                            aria-label="Remove BOM line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Total: </span>
                      <span className="text-sm font-semibold text-primary ml-2">
                        ₹{bomTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Simple-form materials selector (used for quotation tab AND generic site checklist) */}
          {!isSolarPackage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Materials</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMaterial}
                  className="gap-1"
                >
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
                        newMaterials[i].inventoryItemId = v;
                        setMaterials(newMaterials);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMaterial(i)}
                    className="text-destructive"
                    aria-label="Remove material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {type === "quotation" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Services</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddService}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Service
                </Button>
              </div>
              {services.map((s, i) => (
                <div key={i} className="space-y-2 p-3 border rounded-md relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveService(i)}
                    className="absolute top-2 right-2 text-destructive h-8 w-8"
                    aria-label="Remove service"
                  >
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
                        list={`template-sac-list-${i}`}
                        placeholder={defaultSac || "SAC code"}
                      />
                      <datalist id={`template-sac-list-${i}`}>
                        {sacCodes.map((code) => (
                          <option key={code.value} value={code.value}>
                            {code.label}
                          </option>
                        ))}
                      </datalist>
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
                      <Select
                        value={String(s.gstRate)}
                        onValueChange={(v) => {
                          const newServices = [...services];
                          newServices[i].gstRate = Number.parseFloat(v) || 0;
                          setServices(newServices);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="GST rate" />
                        </SelectTrigger>
                        <SelectContent>
                          {gstRates.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canCreateTemplate}>
            Save Template
          </Button>
        </SheetFooter>
      </AppSheetContent>
    </Sheet>
  );
}

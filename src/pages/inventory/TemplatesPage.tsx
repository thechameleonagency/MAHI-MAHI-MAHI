import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  ClipboardList,
  Plus,
  Sun,
  Zap,
  Factory,
  Package,
  Trash2,
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { CreateTemplateModal } from "@/components/templates/CreateTemplateModal";
import { Button } from "@/components/ui/button";
import { ListEmptyState } from "@/components/ui/ListEmptyState";
import { toast } from "@/hooks/use-toast";
import type { SiteChecklistTemplate, TemplateCapacitySegment } from "@/types/templates";
import { useCan } from "@/hooks/useCan";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";

const SEGMENT_ICON: Record<TemplateCapacitySegment, JSX.Element> = {
  residential: <Sun className="h-5 w-5 text-warning" />,
  commercial: <Zap className="h-5 w-5 text-primary" />,
  industrial: <Factory className="h-5 w-5 text-primary" />,
  custom: <Package className="h-5 w-5 text-muted-foreground" />,
};

const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const TemplatesPage = () => {
  const {
    quotationTemplates,
    siteChecklistTemplates,
    deleteQuotationTemplate,
    deleteSiteChecklistTemplate,
  } = useAppData();
  const [tab, setTab] = useState<"quotation" | "site">("quotation");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<
    { kind: "quotation" | "site"; id: string; name: string } | null
  >(null);
  const canCreateTemplate = useCan("template", "create");
  const canDeleteTemplate = useCan("template", "delete");

  const qtCount = quotationTemplates.length;
  const stCount = siteChecklistTemplates.length;

  const segmentBadge = (s: TemplateCapacitySegment) => (
    <Badge variant="outline" className="capitalize">
      {s}
    </Badge>
  );

  const confirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    if (templateToDelete.kind === "quotation") {
      deleteQuotationTemplate(templateToDelete.id);
    } else {
      deleteSiteChecklistTemplate(templateToDelete.id);
    }
    toast({ title: "Template deleted", description: `Removed "${templateToDelete.name}"` });
    setTemplateToDelete(null);
  };

  const renderRichSiteChecklist = (t: SiteChecklistTemplate) => {
    const bom = t.materialsBom ?? [];
    const total = bom.reduce((sum, row) => sum + row.quantity * row.rate, 0);
    return (
      <Card key={t.id} className="bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {SEGMENT_ICON[t.segment]}
              <div>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <CardDescription className="text-xs">
                  ID {t.id} · {t.capacityKW ? `${t.capacityKW} kW · ` : ""}
                  {t.items.length} material lines
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {segmentBadge(t.segment)}
              {t.capacityKW != null && <Badge variant="outline">{t.capacityKW} kW</Badge>}
              <Badge className="bg-primary/15 text-primary border-0">Site checklist</Badge>
              {canDeleteTemplate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setTemplateToDelete({ kind: "site", id: t.id, name: t.name })}
                  aria-label={`Delete template ${t.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-md text-sm">
            <div>
              <span className="block text-xs text-muted-foreground">Panels</span>
              <span className="font-medium">
                {t.panelCount ?? "—"}
                {t.panelBrand ? ` × ${t.panelBrand}` : ""}
                {t.panelWattage ? ` ${t.panelWattage}W` : ""}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Inverter</span>
              <span className="font-medium">
                {t.inverterBrand ?? "—"}
                {t.inverterCapacity ? ` ${t.inverterCapacity}` : ""}
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Structure</span>
              <span className="font-medium">{t.structureType ?? "—"}</span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Est. cost</span>
              <span className="font-semibold text-primary">
                {t.estimatedCost != null ? formatINR(t.estimatedCost) : "—"}
              </span>
            </div>
          </div>

          {bom.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Materials BOM ({bom.length} items)</p>
              <div className="overflow-x-auto rounded-md border max-h-[360px] overflow-y-auto">
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
                    {bom.map((row, idx) => (
                      <TableRow key={`${t.id}-bom-${row.id}`}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {row.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{row.materialName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.size ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {row.quantity} {row.unit}
                        </TableCell>
                        <TableCell className="text-right">₹{row.rate.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{(row.quantity * row.rate).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Total material cost: </span>
                  <span className="text-lg font-bold text-primary">{formatINR(total)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSimpleSiteChecklist = (t: SiteChecklistTemplate) => (
    <Card key={t.id} className="bg-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t.name}</CardTitle>
          <div className="flex items-center gap-2">
            {segmentBadge(t.segment)}
            {canDeleteTemplate && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setTemplateToDelete({ kind: "site", id: t.id, name: t.name })}
                aria-label={`Delete template ${t.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          ID {t.id} — materials & quantities only (no pricing).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.items.map((m) => (
                <TableRow key={`${t.id}-${m.inventoryItemId}`}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-right">{m.quantity}</TableCell>
                  <TableCell>{m.unit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const quotationTable = useMemo(
    () =>
      quotationTemplates.length > 0 ? (
        quotationTemplates.map((t) => (
          <Card key={t.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="flex items-center gap-2">
                  {segmentBadge(t.segment)}
                  {canDeleteTemplate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setTemplateToDelete({ kind: "quotation", id: t.id, name: t.name })}
                      aria-label={`Delete quotation template ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs">
                ID {t.id}
                {t.panelBrand ? ` · ${t.panelBrand} ${t.panelWattage ?? ""}W` : ""}
                {t.inverterCapacity ? ` · Inv ${t.inverterCapacity}` : ""}
                {t.structureType ? ` · ${t.structureType}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Materials (from catalogue)</p>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.materialItems.map((m) => (
                        <TableRow key={`${t.id}-m-${m.inventoryItemId}`}>
                          <TableCell>{m.name}</TableCell>
                          <TableCell className="text-right">{m.quantity}</TableCell>
                          <TableCell>{m.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Services</p>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>SAC</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">GST %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.services.map((s, i) => (
                        <TableRow key={`${t.id}-s-${i}`}>
                          <TableCell>{s.description}</TableCell>
                          <TableCell>{s.sac}</TableCell>
                          <TableCell className="text-right">₹{s.rate.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{s.gstRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <ListEmptyState
          icon={FileSpreadsheet}
          title="No quotation templates found"
          description="Create templates to speed up new quotations."
          actionLabel={canCreateTemplate ? "Create your first template" : undefined}
          onAction={canCreateTemplate ? () => setIsModalOpen(true) : undefined}
        />
      ),
    [quotationTemplates, canCreateTemplate],
  );

  const siteTable = useMemo(() => {
    if (siteChecklistTemplates.length === 0) {
      return (
        <ListEmptyState
          icon={ClipboardList}
          title="No site checklist templates found"
          description="Create site checklist templates for repeatable installation packs."
          actionLabel={canCreateTemplate ? "Create your first template" : undefined}
          onAction={canCreateTemplate ? () => setIsModalOpen(true) : undefined}
        />
      );
    }
    return siteChecklistTemplates.map((t) => renderSimpleSiteChecklist(t));
  }, [siteChecklistTemplates, canCreateTemplate]);

  return (
    <PageShell>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "quotation" | "site")} className="w-full">
        <div className="space-y-6">
          <StickyPageHeader
            breadcrumbs={[{ label: "Home", to: "/" }, { label: "Templates" }]}
            subRow={
              <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 overflow-x-auto">
                <TabsList className="shrink-0">
                  <TabsTrigger value="quotation" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden />
                    Quotation
                  </TabsTrigger>
                  <TabsTrigger value="site" className="gap-2">
                    <ClipboardList className="h-4 w-4" aria-hidden />
                    Site Checklist
                  </TabsTrigger>
                </TabsList>
                <InlineKpiStrip
                  singleRow
                  className="min-w-0 flex-1"
                  items={[
                    { label: "Quotation", value: qtCount },
                    { label: "Site Checklist", value: stCount },
                    { label: "Total", value: qtCount + stCount },
                  ]}
                />
              </div>
            }
          >
            {canCreateTemplate && (
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            )}
          </StickyPageHeader>

          <TabsContent value="quotation" className="space-y-4 mt-0">
            {quotationTable}
          </TabsContent>
          <TabsContent value="site" className="space-y-4 mt-0">
            {siteTable}
          </TabsContent>
        </div>
      </Tabs>

      <CreateTemplateModal open={isModalOpen} onOpenChange={setIsModalOpen} type={tab} />

      <DestructiveConfirmDialog
        open={!!templateToDelete}
        onOpenChange={(open) => { if (!open) setTemplateToDelete(null); }}
        title={
          templateToDelete
            ? `Delete ${templateToDelete.kind === "quotation" ? "quotation" : "site checklist"} template?`
            : "Delete template?"
        }
        description={
          templateToDelete
            ? `Remove "${templateToDelete.name}" from the catalogue. This cannot be undone.`
            : ""
        }
        onConfirm={confirmDeleteTemplate}
      />
    </PageShell>
  );
};

export default TemplatesPage;

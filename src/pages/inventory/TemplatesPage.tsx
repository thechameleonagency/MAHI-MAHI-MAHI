import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, ClipboardList } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { CreateTemplateModal } from "@/components/templates/CreateTemplateModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const TemplatesPage = () => {
  const { quotationTemplates, siteChecklistTemplates } = useAppData();
  const [tab, setTab] = useState<"quotation" | "site">("quotation");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const qtCount = quotationTemplates.length;
  const stCount = siteChecklistTemplates.length;

  const segmentBadge = (s: string) => (
    <Badge variant="outline" className="capitalize">
      {s}
    </Badge>
  );

  const quotationTable = useMemo(
    () =>
      quotationTemplates.length > 0 ? (
        quotationTemplates.map((t) => (
          <Card key={t.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                {segmentBadge(t.segment)}
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
        <Card className="bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mb-4 opacity-20" />
            <p>No quotation templates found</p>
            <Button variant="link" onClick={() => setIsModalOpen(true)}>Create your first template</Button>
          </CardContent>
        </Card>
      ),
    [quotationTemplates],
  );

  const siteTable = useMemo(
    () =>
      siteChecklistTemplates.length > 0 ? (
        siteChecklistTemplates.map((t) => (
          <Card key={t.id} className="bg-card">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                {segmentBadge(t.segment)}
              </div>
              <CardDescription className="text-xs">ID {t.id} — materials & quantities only (no pricing).</CardDescription>
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
        ))
      ) : (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <ClipboardList className="h-10 w-10 mb-4 opacity-20" />
            <p>No site checklist templates found</p>
            <Button variant="link" onClick={() => setIsModalOpen(true)}>Create your first template</Button>
          </CardContent>
        </Card>
      ),
    [siteChecklistTemplates],
  );

  return (
    <PageShell>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "quotation" | "site")} className="w-full">
        <div className="space-y-6">
          <StickyPageHeader
            breadcrumbs={[{ label: "Home", to: "/" }, { label: "Templates" }]}
            subRow={
              <>
                <TabsList>
                  <TabsTrigger value="quotation" className="gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Quotation
                  </TabsTrigger>
                  <TabsTrigger value="site" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Site checklists
                  </TabsTrigger>
                </TabsList>
                <InlineKpiStrip
                  className="w-full min-w-0 flex-wrap justify-start sm:justify-end"
                  items={[
                    { label: "Quotation", value: qtCount },
                    { label: "Site", value: stCount },
                    { label: "Total", value: qtCount + stCount },
                  ]}
                />
              </>
            }
          >
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Template
            </Button>
          </StickyPageHeader>

          <TabsContent value="quotation" className="space-y-4 mt-0">
            {quotationTable}
          </TabsContent>
          <TabsContent value="site" className="space-y-4 mt-0">
            {siteTable}
          </TabsContent>
        </div>
      </Tabs>

      <CreateTemplateModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        type={tab} 
      />
    </PageShell>
  );
};

export default TemplatesPage;

import { useState } from "react";
import { useMasters } from "@/contexts/MastersContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";

/**
 * Settings sub-tab: edit the default-rendered static sections on every quotation
 * (e.g. "Why Choose MSS?", "Benefits"). Stored under master `quotationStaticSections`.
 *
 * Each section row has:
 *  - `label` — section heading
 *  - `bodyText` — newline-separated lines (each line becomes a bullet in preview)
 *
 * Quotation create + preview both consume this via `useMasters().getQuotationStaticSections()`.
 */
export function QuotationStaticSectionsTab() {
  const masters = useMasters();
  const sections = masters.getQuotationStaticSections();

  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const [editingBodies, setEditingBodies] = useState<Record<string, string>>({});
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);

  const valueOf = (key: string, original: string | undefined, map: Record<string, string>) =>
    map[key] !== undefined ? map[key] : (original ?? "");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <h2 className="text-base font-semibold">Quotation static sections</h2>
        <p className="text-xs text-muted-foreground">
          These sections are rendered by default on every quotation create + preview. Edit the heading and body
          (one line per bullet). Changes apply to new quotations immediately.
        </p>
      </div>

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      <div className="space-y-4">
        {sections.map((section) => {
          const labelValue = valueOf(section.value, section.label, editingLabels);
          const bodyValue = valueOf(section.value, section.bodyText, editingBodies);
          const dirty =
            (editingLabels[section.value] !== undefined && editingLabels[section.value] !== section.label) ||
            (editingBodies[section.value] !== undefined && editingBodies[section.value] !== (section.bodyText ?? ""));
          return (
            <Card key={section.value}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs font-mono text-muted-foreground">{section.value}</span>
                  {dirty && (
                    <span className="text-2xs uppercase tracking-wider text-warning">Unsaved</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Section heading</Label>
                  <Input
                    value={labelValue}
                    onChange={(e) => setEditingLabels((prev) => ({ ...prev, [section.value]: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Body (one bullet per line)</Label>
                  <Textarea
                    rows={6}
                    value={bodyValue}
                    onChange={(e) => setEditingBodies((prev) => ({ ...prev, [section.value]: e.target.value }))}
                    placeholder="Each line becomes a bullet point in the quotation preview."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {dirty && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLabels((prev) => { const next = { ...prev }; delete next[section.value]; return next; });
                        setEditingBodies((prev) => { const next = { ...prev }; delete next[section.value]; return next; });
                      }}
                    >
                      Discard
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={!dirty}
                    onClick={() => {
                      const updates: Partial<typeof section> = {};
                      if (editingLabels[section.value] !== undefined) updates.label = editingLabels[section.value];
                      if (editingBodies[section.value] !== undefined) updates.bodyText = editingBodies[section.value];
                      masters.updateQuotationStaticSection(section.value, updates);
                      setEditingLabels((prev) => { const next = { ...prev }; delete next[section.value]; return next; });
                      setEditingBodies((prev) => { const next = { ...prev }; delete next[section.value]; return next; });
                      setLastConfirm({ variant: "success", title: "Section updated", description: labelValue });
                    }}
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

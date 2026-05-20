import { useMasters } from "@/contexts/MastersContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

/**
 * Renders the default static sections (e.g. "Why Choose MSS?", "Benefits") on every
 * quotation create + preview surface. Content edited from Settings → Quotation sections.
 *
 * `variant="create"` — compact theme-matched card list for the editor view.
 * `variant="preview"` — same content with a slightly more formal print-ready layout for the
 *  customer-facing preview / PDF.
 */
export function QuotationStaticSectionsBlock({ variant = "create" }: { variant?: "create" | "preview" }) {
  const masters = useMasters();
  const sections = masters.getQuotationStaticSections();

  if (sections.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const bullets = (section.bodyText ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        if (variant === "preview") {
          return (
            <div key={section.value} className="rounded-lg border border-border bg-card px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{section.label}</h3>
              <ul className="mt-2 space-y-1.5 text-sm leading-snug">
                {bullets.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        return (
          <Card key={section.value}>
            <CardHeader className="border-b bg-muted/30 py-3">
              <CardTitle className="text-sm font-semibold">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-1.5 text-sm leading-snug">
                {bullets.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

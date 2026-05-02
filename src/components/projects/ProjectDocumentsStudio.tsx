import { useMemo, useState, useEffect } from "react";
import { FileText, Plus, Eye, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight, DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import type { Project } from "@/types/project";
import type { Quotation } from "@/types/project";
import {
  DOCUMENT_KIND_LABELS,
  createGeneratedDocumentRow,
} from "@/domain/projectDocs/generateDummyProjectDocument";

type Props = {
  project: Project;
  quotation?: Quotation | null;
  updateProject: (id: string, updates: Partial<Project>) => void;
  generateId: (prefix: string) => string;
};

export function ProjectDocumentsStudio({ project, quotation, updateProject, generateId }: Props) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const docs = project.generatedDocuments ?? [];

  const requiredKeys = useMemo(
    () =>
      project.projectKindConfigSnapshot?.requiredDocuments?.filter(
        (k, i, arr) => DOCUMENT_KIND_LABELS[k] && arr.indexOf(k) === i,
      ) ?? [],
    [project.projectKindConfigSnapshot?.requiredDocuments],
  );

  /** Show at least the kind pack; if none configured, offer the common EPC skeleton set. */
  const rowKeys = useMemo(() => {
    if (requiredKeys.length > 0) return requiredKeys;
    return ["proposal", "agreement", "feasibility", "meter_application", "handover"];
  }, [requiredKeys]);

  const byKey = useMemo(() => {
    const map = new Map<string, (typeof docs)[0]>();
    for (const d of docs) map.set(d.docKey, d);
    return map;
  }, [docs]);

  const previewDoc = docs.find((d) => d.id === previewId);

  const { pagedItems: pagedRowKeys, safePage: safeDocPage } = usePagedSlice(rowKeys, docPage, docPageSize);

  useEffect(() => {
    setDocPage(1);
  }, [rowKeys.join("|"), project.id]);

  const generate = (docKey: string) => {
    const row = createGeneratedDocumentRow(generateId("DOC"), docKey, project, quotation ?? null);
    updateProject(project.id, {
      generatedDocuments: [...docs, row],
    });
    toast({
      title: "Document generated",
      description: `${DOCUMENT_KIND_LABELS[docKey] ?? docKey} is ready to preview or download.`,
    });
  };

  const downloadHtml = (d: (typeof docs)[0]) => {
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${d.title}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:auto;">${d.bodyHtml}</body></html>`,
      ],
      { type: "text/html;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-${d.docKey}-${d.id.slice(0, 6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Document studio</h3>
            <Badge variant="secondary" className="text-[10px]">
              Draft HTML
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate standard MSS dossier drafts from project &amp; quotation data. Download as HTML for filing; print to PDF
            from the browser when needed.
          </p>
        </div>
        <div className="overflow-x-auto p-2 pb-4 pt-2 sm:px-4">
          <DataTableShell
            maxHeight={listTableViewportMaxHeight(docPageSize)}
            scrollResetKey={`${safeDocPage}-${docPageSize}-${rowKeys.length}-${project.id}`}
            footer={
              <TablePaginationBar
                page={safeDocPage}
                pageSize={docPageSize}
                total={rowKeys.length}
                onPageChange={setDocPage}
                onPageSizeChange={(n) => {
                  setDocPageSize(n);
                  setDocPage(1);
                }}
              />
            }
          >
            <TableHeader>
              <TableRow className={dataTableClasses.headRow}>
                <TableHead>Document</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRowKeys.map((key) => {
                const exists = byKey.get(key);
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <span className="font-medium">{DOCUMENT_KIND_LABELS[key] ?? key.replace(/_/g, " ")}</span>
                      <p className="text-[11px] text-muted-foreground">{key}</p>
                    </TableCell>
                    <TableCell>
                      {exists ? (
                        <Badge className="bg-primary/10 text-primary">Generated</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {exists ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="secondary" onClick={() => setPreviewId(exists.id)}>
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadHtml(exists)}>
                            <Download className="mr-1 h-3.5 w-3.5" />
                            HTML
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => generate(key)}>
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Generate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </DataTableShell>
        </div>
      </div>

      <Sheet open={!!previewDoc} onOpenChange={(o) => !o && setPreviewId(null)}>
        <SheetContent className="max-h-[min(90vh,840px)] w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="pr-8 text-left">{previewDoc?.title}</SheetTitle>
          </SheetHeader>
          {previewDoc && (
            <>
              <div
                className="prose prose-sm max-w-none rounded-md border bg-muted/30 p-4 dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: previewDoc.bodyHtml }}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print / Save as PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => downloadHtml(previewDoc)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download HTML
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

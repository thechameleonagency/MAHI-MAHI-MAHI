import { useMemo, useState, useEffect } from "react";
import { FileText, Plus, Eye, Download, Printer, Info, RefreshCw, Trash2 } from "lucide-react";
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
import type { Project, ProjectGeneratedDocument, Quotation } from "@/types/project";
import {
  DOCUMENT_KIND_LABELS,
  createGeneratedDocumentRow,
} from "@/domain/projectDocs/generateDummyProjectDocument";
import { projectForbidsAction } from "@/lib/projectDetailTabs";

type Props = {
  project: Project;
  quotation?: Quotation | null;
  updateProject: (id: string, updates: Partial<Project>) => void;
  generateId: (prefix: string) => string;
};

function pickLatestForKey(rows: ProjectGeneratedDocument[], docKey: string): ProjectGeneratedDocument | undefined {
  const forKey = rows.filter((r) => r.docKey === docKey);
  if (forKey.length === 0) return undefined;
  return forKey.reduce((best, cur) => {
    const bv = best.version ?? 1;
    const cv = cur.version ?? 1;
    if (cv > bv) return cur;
    if (cv < bv) return best;
    return new Date(cur.createdAt).getTime() >= new Date(best.createdAt).getTime() ? cur : best;
  });
}

export function ProjectDocumentsStudio({ project, quotation, updateProject, generateId }: Props) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const docs = project.generatedDocuments ?? [];
  const blockFullEpcPack = projectForbidsAction(project, "full_epc_document_set");

  const requiredKeys = useMemo(
    () =>
      project.projectKindConfigSnapshot?.requiredDocuments?.filter(
        (k, i, arr) => DOCUMENT_KIND_LABELS[k] && arr.indexOf(k) === i,
      ) ?? [],
    [project.projectKindConfigSnapshot?.requiredDocuments],
  );

  /** Show at least the kind pack; if none configured, offer the common EPC skeleton set. */
  const rowKeys = useMemo(() => {
    let keys: string[];
    if (requiredKeys.length > 0) keys = requiredKeys;
    else keys = ["proposal", "agreement", "feasibility", "meter_application", "handover"];
    if (blockFullEpcPack) return keys.filter((k) => k !== "full_epc_document_set");
    return keys;
  }, [requiredKeys, blockFullEpcPack]);

  const latestByKey = useMemo(() => {
    const map = new Map<string, ProjectGeneratedDocument>();
    for (const key of rowKeys) {
      const latest = pickLatestForKey(docs, key);
      if (latest) map.set(key, latest);
    }
    return map;
  }, [docs, rowKeys]);

  const versionCount = (docKey: string) => docs.filter((d) => d.docKey === docKey).length;

  const previewDoc = docs.find((d) => d.id === previewId);

  const { pagedItems: pagedRowKeys, safePage: safeDocPage } = usePagedSlice(rowKeys, docPage, docPageSize);

  useEffect(() => {
    setDocPage(1);
  }, [rowKeys.join("|"), project.id]);

  const generate = (docKey: string) => {
    const existing = pickLatestForKey(docs, docKey);
    const nextVersion = existing ? (existing.version ?? 1) + 1 : 1;
    const row = createGeneratedDocumentRow(generateId("DOC"), docKey, project, quotation ?? null, {
      supersedesId: existing?.id,
      version: nextVersion,
    });
    updateProject(project.id, {
      generatedDocuments: [...docs, row],
    });
    toast({
      title: existing ? "Document regenerated" : "Document generated",
      description: `${DOCUMENT_KIND_LABELS[docKey] ?? docKey} — version ${nextVersion}.`,
    });
  };

  const regenerate = (docKey: string) => generate(docKey);

  const removeDoc = (docId: string) => {
    updateProject(project.id, {
      generatedDocuments: docs.filter((d) => d.id !== docId),
    });
    toast({ title: "Removed", description: "Document version removed from project." });
    if (previewId === docId) setPreviewId(null);
  };

  const downloadHtml = (d: ProjectGeneratedDocument) => {
    const blob = new Blob(
      [
        `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${d.title}</title></head><body style="font-family:system-ui,sans-serif;padding:24px;max-width:800px;margin:auto;">${d.bodyHtml}</body></html>`,
      ],
      { type: "text/html;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}-${d.docKey}-v${d.version ?? 1}-${d.id.slice(0, 6)}.html`;
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
            <Badge variant="secondary" className="text-2xs">
              Draft HTML
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.scope?.vendorshipOwner === "MSS"
              ? "Generate standard MSS dossier drafts from project & quotation data. Regenerate keeps prior rows as history (versioned)."
              : "View and upload project documentation. Vendorship code is handled externally."}
          </p>
        </div>

        {project.scope?.vendorshipOwner !== "MSS" && (
          <div className="p-4 border-b bg-amber-50/50 border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-xs font-medium">
              <Info className="h-4 w-4" />
              <span>External Vendorship Code: Documents must be uploaded manually.</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-amber-200 text-amber-700 hover:bg-amber-100"
              onClick={() => {
                // Prototype: external vendorship docs are uploaded out-of-band.
                // Surface a clear next step instead of opening a hidden picker that never persisted.
                toast({
                  title: "Manual upload required",
                  description:
                    "External vendorship code documents are not stored in the prototype. Share them with the project coordinator out-of-band.",
                });
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Upload Doc
            </Button>
          </div>
        )}
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
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRowKeys.map((key) => {
                const exists = latestByKey.get(key);
                const vc = versionCount(key);
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <span className="font-medium">{DOCUMENT_KIND_LABELS[key] ?? key.replace(/_/g, " ")}</span>
                      <p className="text-xs2 text-muted-foreground">{key}</p>
                    </TableCell>
                    <TableCell>
                      {exists ? (
                        <div className="flex flex-col gap-0.5">
                          <Badge className="bg-primary/10 text-primary w-fit">v{exists.version ?? 1}</Badge>
                          {vc > 1 && (
                            <span className="text-2xs text-muted-foreground">{vc} versions stored</span>
                          )}
                        </div>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerate(key)}
                            disabled={project.scope?.vendorshipOwner !== "MSS"}
                            title="Create a new version"
                          >
                            <RefreshCw className="mr-1 h-3.5 w-3.5" />
                            Regenerate
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => removeDoc(exists.id)}
                            title="Remove this version"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => generate(key)}
                          disabled={project.scope?.vendorshipOwner !== "MSS"}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {project.scope?.vendorshipOwner === "MSS" ? "Generate" : "Upload"}
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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

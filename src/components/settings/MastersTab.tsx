import { useMemo, useState } from "react";
import { useMasters } from "@/contexts/MastersContext";
import { MasterDataEditor } from "@/components/settings/MasterDataEditor";
import { PermissionMatrixReference } from "@/components/settings/PermissionMatrixReference";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Database, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Phase 4 — Masters tab (sub-tab A of Settings → Masters).
 *
 * Layout:
 *  1. Permission Matrix Reference card at the top (read-only — comprehensive role × feature × CRUD).
 *  2. Master Data section: left rail of groups + right pane of category editors.
 */
export function MastersTab() {
  const masters = useMasters();
  const groups = masters.getMasterGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id ?? "");
  const [search, setSearch] = useState("");

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const filteredCategories = useMemo(() => {
    if (!selectedGroup) return [] as { categoryId: string; label: string; count: number }[];
    const q = search.trim().toLowerCase();
    return selectedGroup.categories
      .map((categoryId) => {
        const cat = masters.getCategoryById(categoryId);
        return { categoryId, label: cat.label, count: cat.items.length };
      })
      .filter((c) => {
        if (!q) return true;
        return c.label.toLowerCase().includes(q) || c.categoryId.toLowerCase().includes(q);
      });
  }, [selectedGroup, masters, search]);

  const totalItems = useMemo(() => {
    return groups.reduce((acc, g) => acc + g.categories.reduce((s, c) => s + masters.getCategoryById(c).items.length, 0), 0);
  }, [groups, masters]);

  return (
    <div className="space-y-6">
      {/* Comprehensive role × feature × CRUD reference */}
      <PermissionMatrixReference />

      {/* Master data section */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" aria-hidden />
            <span className="text-sm font-semibold">Master data</span>
            <Badge variant="outline" className="text-2xs">
              {groups.length} groups · {groups.reduce((s, g) => s + g.categories.length, 0)} categories · {totalItems} items
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <div className="flex items-center gap-3 pb-3">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="h-9 pl-7"
                aria-label="Search master categories"
              />
            </div>
            {search && filteredCategories.length > 0 && (
              <Badge variant="outline" className="text-2xs">
                {filteredCategories.length} match{filteredCategories.length === 1 ? "" : "es"}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
            <Card className="h-fit lg:sticky lg:top-2">
              <CardContent className="p-2">
                <p className="px-2 pb-1.5 pt-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Master groups
                </p>
                <div className="space-y-0.5">
                  {groups.map((group) => {
                    const categoryCount = group.categories.length;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                          selectedGroupId === group.id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-muted",
                        )}
                        aria-current={selectedGroupId === group.id ? "page" : undefined}
                        title={group.description}
                      >
                        <span className="truncate text-left">{group.label}</span>
                        <Badge variant="outline" className="shrink-0 text-2xs">{categoryCount}</Badge>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {selectedGroup ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <h2 className="text-base font-semibold">{selectedGroup.label}</h2>
                    <p className="text-xs text-muted-foreground">{selectedGroup.description}</p>
                  </div>
                  {filteredCategories.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      No categories match "{search}".
                    </p>
                  ) : (
                    filteredCategories.map(({ categoryId, label, count }) => (
                      <Card key={categoryId} className="overflow-hidden">
                        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2">
                          <h3 className="text-sm font-semibold">{label}</h3>
                          <Badge variant="outline" className="text-2xs">{count} item{count === 1 ? "" : "s"}</Badge>
                        </div>
                        <CardContent className="p-4">
                          <MasterDataEditor categoryId={categoryId} />
                        </CardContent>
                      </Card>
                    ))
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No groups available.</p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

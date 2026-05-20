import { Link } from "react-router-dom";
import { ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EntityLink } from "@/components/shared/EntityInfoSheet";
import { AgingChip } from "@/components/ui/AgingChip";
import type { TodaysSiteActivitySnapshot } from "@/lib/todaysSiteActivity";
import type { AgingSignal } from "@/lib/agingHelpers";

function rowToSignal(label: string, tone: AgingSignal["tone"]): AgingSignal {
  return { label, tone };
}

export function DashboardTodaysSiteActivity({
  snapshot,
  todayLabel,
}: {
  snapshot: TodaysSiteActivitySnapshot;
  todayLabel: string;
}) {
  const hasAttention =
    snapshot.openBlockagesCount > 0 ||
    snapshot.tasksDueTodayCount > 0 ||
    snapshot.timelineInProgressCount > 0;

  return (
    <Card className="overflow-hidden rounded-xl border-border/70 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Today&apos;s site activity</h3>
            <p className="text-xs text-muted-foreground truncate">
              {todayLabel} · same ongoing sites as Active sites
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-2xs tabular-nums">
            {snapshot.ongoingCount} ongoing
          </Badge>
          {snapshot.openBlockagesCount > 0 && (
            <Badge variant="outline" className="text-2xs border-destructive/40 text-destructive tabular-nums">
              {snapshot.openBlockagesCount} blockages
            </Badge>
          )}
          {snapshot.tasksDueTodayCount > 0 && (
            <Badge variant="outline" className="text-2xs border-warning/40 text-warning tabular-nums">
              {snapshot.tasksDueTodayCount} tasks today
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="space-y-4 p-5 pt-6">
        {snapshot.ongoingCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No started site executions right now. When projects are started, their timeline and blockages appear here and on
            Active sites.
          </p>
        ) : (
          <>
            {snapshot.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hasAttention
                  ? "Review execution on Active sites."
                  : "All ongoing sites are clear for today — open Active sites for full timeline detail."}
              </p>
            ) : (
              <ul className="space-y-2">
                {snapshot.rows.map((row) => (
                  <li
                    key={row.projectId}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-sm leading-snug">
                        <EntityLink entityType="project" entityId={row.projectId} name={row.projectName} />
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{row.client}</p>
                    </div>
                    <AgingChip signal={rowToSignal(row.label, row.tone)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <Separator />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1 rounded-lg" variant="default" asChild>
            <Link to="/active-sites">
              <MapPin className="mr-2 h-4 w-4" />
              Open active sites
            </Link>
          </Button>
          <Button className="flex-1 rounded-lg" variant="outline" asChild>
            <Link to="/projects">
              <ExternalLink className="mr-2 h-4 w-4" />
              All projects
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

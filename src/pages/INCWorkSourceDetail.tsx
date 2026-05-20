import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, HardHat, Phone, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { useAppData } from "@/contexts/AppDataContext";
import { findByRouteId } from "@/lib/resolveEntityId";
import { formatINR } from "@/lib/formatCurrency";
import { ListEmptyState } from "@/components/ui/ListEmptyState";

const INCWorkSourceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incGiverCompanies, projects } = useAppData();

  const company = useMemo(
    () => findByRouteId(incGiverCompanies ?? [], id),
    [incGiverCompanies, id],
  );

  const linkedProjects = useMemo(
    () => (projects ?? []).filter((p) => p.scope?.incGiverCompanyId === id),
    [projects, id],
  );

  const totals = useMemo(() => {
    const toCollect = linkedProjects.reduce((s, p) => s + (p.contractAmount || 0), 0);
    const collected = linkedProjects.reduce((s, p) => s + (p.amountReceived || 0), 0);
    return { toCollect, collected, pending: toCollect - collected };
  }, [linkedProjects]);

  const completedProjects = linkedProjects.filter((p) => p.status === "Completed" || p.status === "Closed").length;

  if (!company) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">INC work source not found.</p>
          <Button variant="outline" onClick={() => navigate("/inc-work-sources")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "INC work sources", to: "/inc-work-sources" },
          { label: company.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap"
            items={[
              { label: "INC jobs", value: linkedProjects.length },
              { label: "Completed", value: completedProjects },
              { label: "To collect", value: formatINR(totals.toCollect) },
              { label: "Collected", value: formatINR(totals.collected) },
              { label: "Pending", value: formatINR(totals.pending) },
            ]}
          />
        }
      >
        <Button variant="outline" size="sm" onClick={() => navigate("/inc-work-sources")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </StickyPageHeader>

      {/* Company info card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-warning/10 flex items-center justify-center">
              <HardHat className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-xl">{company.name}</CardTitle>
              {company.notes && <p className="mt-1 text-sm text-muted-foreground">{company.notes}</p>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {company.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{company.phone}</span>
            </div>
          )}
          {company.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{company.email}</span>
            </div>
          )}
          {company.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{company.address}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked INC jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">INC jobs received ({linkedProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedProjects.length === 0 ? (
            <ListEmptyState
              density="compact"
              icon={HardHat}
              title="No INC jobs from this source"
              description="Projects linked to this work source appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contract</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedProjects.map((p) => {
                  const pending = (p.contractAmount || 0) - (p.amountReceived || 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link to={`/projects/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                      </TableCell>
                      <TableCell className="text-sm">{p.client}</TableCell>
                      <TableCell>{p.capacity || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.status || p.lifecycleStatus || "—"}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatINR(p.contractAmount || 0)}</TableCell>
                      <TableCell className="text-right font-mono text-success">{formatINR(p.amountReceived || 0)}</TableCell>
                      <TableCell className={`text-right font-mono ${pending > 0 ? "text-warning" : ""}`}>{formatINR(pending)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default INCWorkSourceDetail;

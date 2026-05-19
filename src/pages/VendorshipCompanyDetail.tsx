import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2, MapPin, Phone, Mail, Code } from "lucide-react";
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

const VendorshipCompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vendorshipCompanies, projects, expenses } = useAppData();

  const company = useMemo(
    () => findByRouteId(vendorshipCompanies ?? [], id),
    [vendorshipCompanies, id],
  );

  const linkedProjects = useMemo(
    () => (projects ?? []).filter((p) => p.scope?.vendorshipCompanyId === id),
    [projects, id],
  );

  const feeExpenses = useMemo(
    () => (expenses ?? []).filter((e) => e.category === "Vendorship Code Fee" && e.vendorshipCompanyId === id),
    [expenses, id],
  );

  const totalFees = feeExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (!company) {
    return (
      <PageShell>
        <div className="py-12 text-center space-y-4">
          <p className="text-muted-foreground">Vendorship company not found.</p>
          <Button variant="outline" onClick={() => navigate("/vendorship-companies")}>
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
          { label: "Vendorship companies", to: "/vendorship-companies" },
          { label: company.name },
        ]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap"
            items={[
              { label: "Linked projects", value: linkedProjects.length },
              { label: "Fees paid (lifetime)", value: formatINR(totalFees) },
              { label: "Fee entries", value: feeExpenses.length },
            ]}
          />
        }
      >
        <Button variant="outline" size="sm" onClick={() => navigate("/vendorship-companies")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </StickyPageHeader>

      {/* Company info card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">{company.name}</CardTitle>
                {company.notes && <p className="mt-1 text-sm text-muted-foreground">{company.notes}</p>}
              </div>
            </div>
            {company.registrationCode && (
              <Badge variant="outline" className="font-mono">
                <Code className="mr-1 h-3 w-3" /> {company.registrationCode}
              </Badge>
            )}
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

      {/* Linked projects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked projects ({linkedProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects currently use this vendorship code.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedProjects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to={`/projects/${p.id}`} className="text-primary hover:underline">{p.name}</Link>
                    </TableCell>
                    <TableCell>{p.client}</TableCell>
                    <TableCell>{p.capacity || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.status || p.lifecycleStatus || "—"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fee history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendorship fees paid ({feeExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {feeExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendorship fee payments recorded for this company yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Linked project</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeExpenses
                  .slice()
                  .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                  .map((e) => {
                    const p = (projects ?? []).find((p) => p.id === e.projectId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>{e.date}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.description || "—"}</TableCell>
                        <TableCell>
                          {p ? <Link to={`/projects/${p.id}`} className="text-primary hover:underline">{p.name}</Link> : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{formatINR(e.amount)}</TableCell>
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

export default VendorshipCompanyDetail;

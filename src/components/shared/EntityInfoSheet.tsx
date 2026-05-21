import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Building2, Briefcase, FileText, Receipt, IndianRupee, 
 MapPin, Phone, Mail, Calendar, ExternalLink, 
  ClipboardList, Wallet, Handshake, Store, UserCheck, HardHat
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { formatINR } from "@/lib/formatCurrency";
import { filterProjectsForIncGiverCompany } from "@/lib/incGiverProjectLink";
import { deriveIncGiverCompanyEconomics } from "@/lib/deriveIncGiverEconomics";

type EntityType =
  | "project"
  | "customer"
  | "employee"
  | "partner"
  | "vendor"
  | "quotation"
  | "invoice"
  | "agent"
  | "vendorshipCompany"
  | "incGiverCompany";

interface EntityInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
  entityId: string | number;
}

export function EntityInfoSheet({ open, onOpenChange, entityType, entityId }: EntityInfoSheetProps) {
  const { 
    getProjectById, 
    getCustomerById, 
    getEmployeeById, 
    getPartnerById,
    getQuotationById,
    getInvoiceById,
    saleBills,
    getAgentById,
    getVendorshipCompanyById,
    getINCGiverCompanyById,
    incGiverCompanies,
    incGiverTransactions,
    vendors,
    getProjectInvoices,
    getCustomerInvoices,
    getCustomerSaleBills,
    getExpensesByProject,
    getExpensesByEmployee,
    getTransactionsByPartner,
    projects,
    quotations,
    enquiries,
  } = useAppData();

  const renderProjectInfo = () => {
    const project = getProjectById(entityId as string);
    if (!project) return <p className="text-muted-foreground">Project not found</p>;

    const projectInvoices = getProjectInvoices(project.id);
    const projectExpenses = getExpensesByProject(project.id);
    const linkedQuotation = project.quotationId ? getQuotationById(project.quotationId) : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{project.type}</Badge>
              <Badge variant="outline">{project.projectType}</Badge>
              <Badge
                className={
                  project.lifecycleStatus === "In Progress" || project.lifecycleStatus === "New"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted"
                }
              >
                {project.lifecycleStatus ?? project.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{project.client}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{project.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>Contract: {formatINR((project.contractAmount || 0))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Started: {project.startDate}</span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/projects/${project.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Project
              </Button>
            </Link>
            {projectInvoices.length > 0 && (
              <Link to={`/invoices?project=${project.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Invoices ({projectInvoices.length})
                </Button>
              </Link>
            )}
            {linkedQuotation && (
              <Link to={`/quotations?open=${linkedQuotation.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Receipt className="h-3 w-3" />
                  Quotation
                </Button>
              </Link>
            )}
            <Link to={`/projects/${project.id}?tab=financials`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <IndianRupee className="h-3 w-3" />
                Expenses ({projectExpenses.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerInfo = () => {
    const customer = getCustomerById(entityId as string);
    if (!customer) return <p className="text-muted-foreground">Customer not found</p>;

    const customerInvoices = getCustomerInvoices(customer.id);
    const customerSaleBills = getCustomerSaleBills(customer.id);
    const customerProjects = projects.filter((p) => p.customerId === customer.id);
    const customerQuotations = quotations.filter(q =>
      q.customerId
        ? q.customerId === customer.id
        : q.clientName === customer.name,
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{customer.name}</h3>
            <Badge variant="outline">{customer.type}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{customer.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>Total: {formatINR((customer.totalPurchases || 0))}</span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/customers/${customer.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Full Details
              </Button>
            </Link>
            {customerInvoices.length > 0 && (
              <Link to={`/invoices?customer=${customer.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <FileText className="h-3 w-3" />
                  Invoices ({customerInvoices.length})
                </Button>
              </Link>
            )}
            {customerSaleBills.length > 0 && (
              <Link to={`/invoices?customer=${customer.id}&type=sale-bill`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Receipt className="h-3 w-3" />
                  Sale Bills ({customerSaleBills.length})
                </Button>
              </Link>
            )}
            {customerProjects.length > 0 && (
              <Link to={`/projects?customer=${customer.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Projects ({customerProjects.length})
                </Button>
              </Link>
            )}
            {customerQuotations.length > 0 && (
              <Link to={`/quotations?client=${customer.name}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Quotations ({customerQuotations.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEmployeeInfo = () => {
    const employee = getEmployeeById(entityId as number);
    if (!employee) return <p className="text-muted-foreground">Employee not found</p>;

    const employeeExpenses = getExpensesByEmployee(employee.id.toString());

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            {employee.photoUrl ? (
              <AvatarImage src={employee.photoUrl} alt={employee.name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {employee.initial}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{employee.name}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{employee.role}</Badge>
              <Badge className={employee.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted"}>
                {employee.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{employee.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{employee.site}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>Salary: {formatINR((employee.salary || 0))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className={employee.pendingAmount >= 0 ? "text-primary" : "text-destructive"}>
              {employee.pendingAmount >= 0 ? "Pending" : "Advance"}: {formatINR(Math.abs(employee.pendingAmount || 0))}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/employees/${employee.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Profile
              </Button>
            </Link>
            <Link to={`/attendance`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <Calendar className="h-3 w-3" />
                Attendance
              </Button>
            </Link>
            <Link to={`/employees/${employee.id}?tab=expenses`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <Receipt className="h-3 w-3" />
                Expenses ({employeeExpenses.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderPartnerInfo = () => {
    const partner = getPartnerById(entityId as string);
    if (!partner) return <p className="text-muted-foreground">Partner not found</p>;

    const partnerTransactions = getTransactionsByPartner(partner.id);
    const partneredProjects = projects.filter(p => 
      p.ownerType === "partnership" && p.partners?.some(pp => pp.partnerId === partner.id)
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{partner.name}</h3>
            <Badge variant="outline" className="capitalize">{(partner as { partnerCategory?: string }).partnerCategory ?? "Partner"}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{partner.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <span>{partneredProjects.length} linked project{partneredProjects.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span>{partnerTransactions.length} transaction{partnerTransactions.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/finance?tab=partners" onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <IndianRupee className="h-3 w-3" />
                Transactions ({partnerTransactions.length})
              </Button>
            </Link>
            {partneredProjects.length > 0 && (
              <Link to={`/projects?partner=${partner.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Projects ({partneredProjects.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderVendorInfo = () => {
    const vendor = vendors.find(v => v.id === entityId);
    if (!vendor) return <p className="text-muted-foreground">Vendor not found</p>;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{vendor.name}</h3>
            <div className="flex flex-wrap gap-1">
              {(Array.isArray(vendor.category) ? vendor.category : [vendor.category].filter(Boolean)).map((cat: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">{cat}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{vendor.contact}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{vendor.email}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{vendor.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span className={vendor.outstandingAmount > 0 ? "text-warning" : "text-primary"}>
              Outstanding: {formatINR((vendor.outstandingAmount || 0))}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/vendors/${vendor.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Details
              </Button>
            </Link>
            {vendor.purchaseHistory.length > 0 && (
              <Link to={`/finance?tab=vendors&vendor=${vendor.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Receipt className="h-3 w-3" />
                  Purchases ({vendor.purchaseHistory.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderQuotationInfo = () => {
    const quotation = getQuotationById(String(entityId));
    if (!quotation) return <p className="text-muted-foreground">Quotation not found</p>;

    const linkedProject = projects.find((p) => p.quotationId === quotation.id);
    const customer = quotation.customerId ? getCustomerById(quotation.customerId) : undefined;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{quotation.quotationNumber}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{quotation.status.replace(/_/g, " ")}</Badge>
              <Badge variant="outline">{quotation.quotationType}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 col-span-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{quotation.clientName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{quotation.clientPhone || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>{formatINR((quotation.totalAmount || 0))}</span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/quotations" state={{ focusQuotationId: quotation.id }} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View quotation
              </Button>
            </Link>
            {customer && (
              <Link to={`/customers/${customer.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  Customer
                </Button>
              </Link>
            )}
            {linkedProject && (
              <Link to={`/projects/${linkedProject.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Project
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInvoiceInfo = () => {
    const invoice =
      getInvoiceById(String(entityId)) ?? saleBills.find((b) => b.id === entityId);
    if (!invoice) return <p className="text-muted-foreground">Invoice not found</p>;

    const balance = Math.max(0, (invoice.total || 0) - (invoice.amountReceived || 0));
    const linkedProject = invoice.projectId ? getProjectById(invoice.projectId) : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">{invoice.status}</Badge>
              <Badge variant="outline">{invoice.type === "sale-bill" ? "Sale bill" : "Invoice"}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 col-span-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{invoice.customerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>Total: {formatINR((invoice.total || 0))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span>Balance: {formatINR(balance)}</span>
          </div>
          {linkedProject && (
            <div className="flex items-center gap-2 col-span-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{linkedProject.name}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/invoices" onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                Open invoices
              </Button>
            </Link>
            {invoice.customerId && (
              <Link to={`/customers/${invoice.customerId}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Building2 className="h-3 w-3" />
                  Customer
                </Button>
              </Link>
            )}
            {linkedProject && (
              <Link to={`/projects/${linkedProject.id}`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Project
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgentInfo = () => {
    const agent = getAgentById(String(entityId));
    if (!agent) return <p className="text-muted-foreground">Agent not found</p>;

    const agentEnquiries = enquiries.filter((e) => e.agentId === agent.id);
    const agentQuotations = quotations.filter((q) => q.agentId === agent.id);
    const agentProjects = projects.filter((p) => p.agentId === agent.id);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <Badge variant="outline" className="capitalize">{agent.status}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{agent.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
            <span>
              {agent.rateType === "per-kw"
                ? `${formatINR(agent.ratePerKw)}/kW`
                : `${formatINR(agent.flatRate || 0)} flat`}
            </span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Handshake className="h-4 w-4 text-muted-foreground" />
            <span>
              {agentProjects.length} project{agentProjects.length === 1 ? "" : "s"} ·{" "}
              {agentEnquiries.length} enquir{agentEnquiries.length === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/agents/${agent.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View agent
              </Button>
            </Link>
            {agentQuotations.length > 0 && (
              <Link to="/quotations" onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <ClipboardList className="h-3 w-3" />
                  Quotations ({agentQuotations.length})
                </Button>
              </Link>
            )}
            {agentProjects.length > 0 && (
              <Link to={`/agents/${agent.id}?tab=projects`} onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Projects ({agentProjects.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderVendorshipCompanyInfo = () => {
    const company = getVendorshipCompanyById(String(entityId));
    if (!company) return <p className="text-muted-foreground">Vendorship company not found</p>;

    const linkedProjects = projects.filter((p) => p.scope?.vendorshipCompanyId === company.id);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{company.name}</h3>
            {company.registrationCode && (
              <Badge variant="outline" className="font-mono text-xs">{company.registrationCode}</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{company.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{linkedProjects.length} linked project{linkedProjects.length === 1 ? "" : "s"}</span>
          </div>
          {company.email && (
            <div className="flex items-center gap-2 col-span-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{company.email}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/vendorship/${company.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View company
              </Button>
            </Link>
            {linkedProjects.length > 0 && (
              <Link to="/projects" onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Projects ({linkedProjects.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIncGiverCompanyInfo = () => {
    const company = getINCGiverCompanyById(String(entityId));
    if (!company) return <p className="text-muted-foreground">INC work source not found</p>;

    const linkedProjects = filterProjectsForIncGiverCompany(
      projects,
      company.id,
      incGiverCompanies ?? [],
    );
    const econ = deriveIncGiverCompanyEconomics(
      company.id,
      projects,
      incGiverTransactions ?? [],
      incGiverCompanies ?? [],
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <HardHat className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{company.name}</h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Ledger collected</p>
            <p className="font-medium">{formatINR(econ.collected)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-medium">{formatINR(econ.pending)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{company.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{linkedProjects.length} linked project{linkedProjects.length === 1 ? "" : "s"}</span>
          </div>
          {company.email && (
            <div className="flex items-center gap-2 col-span-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{company.email}</span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            <Link to={`/inc-sources/${company.id}`} onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View work source
              </Button>
            </Link>
            {linkedProjects.length > 0 && (
              <Link to="/projects" onClick={() => onOpenChange(false)}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Briefcase className="h-3 w-3" />
                  Projects ({linkedProjects.length})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (entityType) {
      case "project":
        return renderProjectInfo();
      case "customer":
        return renderCustomerInfo();
      case "employee":
        return renderEmployeeInfo();
      case "partner":
        return renderPartnerInfo();
      case "vendor":
        return renderVendorInfo();
      case "quotation":
        return renderQuotationInfo();
      case "invoice":
        return renderInvoiceInfo();
      case "agent":
        return renderAgentInfo();
      case "vendorshipCompany":
        return renderVendorshipCompanyInfo();
      case "incGiverCompany":
        return renderIncGiverCompanyInfo();
      default:
        return <p className="text-muted-foreground">Entity not found</p>;
    }
  };

  const getTitle = () => {
    switch (entityType) {
      case "project": return "Project Info";
      case "customer": return "Customer Info";
      case "employee": return "Employee Info";
      case "partner": return "Partner Info";
      case "vendor": return "Vendor Info";
      case "quotation": return "Quotation Info";
      case "invoice": return "Invoice Info";
      case "agent": return "Agent Info";
      case "vendorshipCompany": return "Vendorship Company";
      case "incGiverCompany": return "INC Work Source";
      default: return "Info";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent layout="form" size="sm">
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          {renderContent()}
        </div>
      </AppSheetContent>
    </Sheet>
  );
}

// Clickable entity name component
interface EntityLinkProps {
  entityType: EntityType;
  entityId: string | number;
  name: string;
  className?: string;
}

export function EntityLink({ entityType, entityId, name, className = "" }: EntityLinkProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`text-primary hover:underline cursor-pointer font-medium ${className}`}
      >
        {name}
      </button>
      <EntityInfoSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        entityType={entityType}
        entityId={entityId}
      />
    </>
  );
}

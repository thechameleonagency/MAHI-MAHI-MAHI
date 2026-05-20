import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase, User, Users, IndianRupee, Zap, ChevronRight, Check,
  ShieldCheck, AlertTriangle, Building2, HardHat,
  UsersRound,
} from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import type { Project, ProjectScopeConfig } from "@/types/project";
import type { ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/formDraftStorage";
import {
  loadCreateDraft,
  type ProjectDraftFromCustomer,
  type ProjectDraftFromQuotation,
} from "@/lib/createFromContext";
import ProjectConfirmationScreen from "@/components/projects/ProjectConfirmationScreen";
import {
  applyTeamAssignmentToProject,
  buildProjectConfirmationData,
  type ProjectTeamAssignmentDraft,
} from "@/lib/projectTeamAssignment";
import { filterActiveCustomers } from "@/lib/customerListFilters";
import { resolveContractAmount } from "@/domain/quotation/quotationCommercialAmount";

interface CreateProjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set (e.g. from `/projects?createFrom=quo:<id>`), pre-select quotation and merge project draft. */
  prefillQuotationId?: string;
  prefillCustomerDraft?: ProjectDraftFromCustomer;
}

type LeadPath = "MSS_DIRECT" | "PARTNER" | "INC_GIVEN" | "OUTSOURCED_INC";
type VendorshipChoice = "OUR_CODE" | "THIRD_PARTY";
type RateBasis = "per_kw" | "per_sqft" | "fixed";

const parsePositiveAmount = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const CreateProjectSheet = ({ open, onOpenChange, prefillQuotationId, prefillCustomerDraft }: CreateProjectSheetProps) => {
  const navigate = useNavigate();
  const {
    partners,
    customers,
    vendorshipCompanies,
    incGiverCompanies,
    projects,
    getProjectEligibleQuotations,
    createProjectIntake,
    createProjectFromConfirmedQuotation,
    employees,
    addCustomer,
    addExpense,
    updateProject,
    allocateCustomerId,
    generateId,
    convertEnquiryToCustomer,
    loans,
    agents,
  } = useAppData();

  // ── Section 1: How did this project come to us? ──
  const [leadPath, setLeadPath] = useState<LeadPath | null>(null);

  // ── Section 2 (Direct Client) ──
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | undefined>();
  const [customerMode, setCustomerMode] = useState<"select" | "add">("select");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [kNumber, setKNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [projectType, setProjectType] = useState<Project["projectType"]>("Residential");
  const [contractAmount, setContractAmount] = useState("");
  const [internalCostEstimate, setInternalCostEstimate] = useState("");
  const [paymentTypeMss, setPaymentTypeMss] = useState<"" | "cash" | "loan" | "cash-and-loan">("");
  const [fundingLoanId, setFundingLoanId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [commissionRatePct, setCommissionRatePct] = useState("");
  const [incScopeChoice, setIncScopeChoice] = useState<"" | "labour" | "labour_and_materials">("");
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState("");

  // Outsourced INC sub-flow: when picked, default to "attach to existing project" mode (the
  // user-confirmed model from the plan). "new" still creates a fresh outsourced project for
  // back-compat with anyone who needs that path. State only meaningful when leadPath === "OUTSOURCED_INC".
  const [outsourceMode, setOutsourceMode] = useState<"existing" | "new">("existing");
  const [outsourceTargetProjectId, setOutsourceTargetProjectId] = useState("");
  const [outsourceRateBasis, setOutsourceRateBasis] = useState<"per_kw" | "per_sqft" | "fixed">("fixed");
  const [outsourceRateValue, setOutsourceRateValue] = useState("");
  const [outsourceQuantity, setOutsourceQuantity] = useState("");
  const [outsourceNotes, setOutsourceNotes] = useState("");

  const [vendorshipChoice, setVendorshipChoice] = useState<VendorshipChoice>("OUR_CODE");
  const [vendorshipCompanyId, setVendorshipCompanyId] = useState("");
  const [vendorshipFeeAmount, setVendorshipFeeAmount] = useState("");

  // ── Section 2 (Partner Network) ──
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partnerCustomerName, setPartnerCustomerName] = useState("");
  const [partnerProjectName, setPartnerProjectName] = useState("");
  const [partnerCapacity, setPartnerCapacity] = useState("");
  const [partnerContractAmount, setPartnerContractAmount] = useState("");
  const [partnerEconomicsType, setPartnerEconomicsType] = useState<"profit_share" | "fixed_rate">("profit_share");
  const [profitSharePercent, setProfitSharePercent] = useState("");
  const [fixedRatePerKw, setFixedRatePerKw] = useState("");
  const [billingParty, setBillingParty] = useState<"MSS" | "PARTNER">("MSS");
  const [partnerGstInvoice, setPartnerGstInvoice] = useState<"yes" | "no">("yes");
  const [partnerVendorshipChoice, setPartnerVendorshipChoice] = useState<VendorshipChoice>("OUR_CODE");
  const [partnerVendorshipFeeAmount, setPartnerVendorshipFeeAmount] = useState("");
  const [partnerThirdPartyCompanyId, setPartnerThirdPartyCompanyId] = useState("");
  const [partnerProjectType, setPartnerProjectType] = useState<Project["projectType"]>("Residential");

  // ── Section 2 (INC Given) ──
  const [incGiverCompanyId, setIncGiverCompanyId] = useState("");
  const [rateBasis, setRateBasis] = useState<RateBasis>("per_kw");
  const [rateValue, setRateValue] = useState("");
  const [incCapacity, setIncCapacity] = useState("");
  const [incArea, setIncArea] = useState("");
  const [incFixedAmount, setIncFixedAmount] = useState("");
  const [incProjectName, setIncProjectName] = useState("");
  const [incAddress, setIncAddress] = useState("");

  const [sheetStep, setSheetStep] = useState<"form" | "confirm">("form");
  const [pendingProject, setPendingProject] = useState<Project | null>(null);
  const [pendingIntake, setPendingIntake] = useState<ProjectIntakePayload | null>(null);
  const [pendingQuotationId, setPendingQuotationId] = useState<string | undefined>();

  const eligibleQuotations = useMemo(() => getProjectEligibleQuotations(), [getProjectEligibleQuotations]);
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "Active").map((e) => ({ id: e.id, name: e.name })),
    [employees],
  );
  const selectableCustomers = useMemo(() => {
    const active = filterActiveCustomers(customers);
    if (selectedCustomerId && !active.some((c) => c.id === selectedCustomerId)) {
      const selected = customers.find((c) => c.id === selectedCustomerId);
      if (selected) return [...active, selected];
    }
    return active;
  }, [customers, selectedCustomerId]);

  const dealBringerPartners = useMemo(
    () => partners.filter(p => p.type === "Profit-Share" || p.type === "Fixed-Rate"),
    [partners]
  );

  const resetForm = () => {
    setLeadPath(null);
    setSelectedQuotationId(undefined);
    setCustomerMode("select");
    setSelectedCustomerId("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setNewCustomerAddress("");
    setKNumber("");
    setProjectName("");
    setCapacity("");
    setProjectType("Residential");
    setContractAmount("");
    setInternalCostEstimate("");
    setPaymentTypeMss("");
    setFundingLoanId("");
    setSelectedAgentId("");
    setCommissionRatePct("");
    setIncScopeChoice("");
    setSelectedSubcontractorId("");
    setOutsourceMode("existing");
    setOutsourceTargetProjectId("");
    setOutsourceRateBasis("fixed");
    setOutsourceRateValue("");
    setOutsourceQuantity("");
    setOutsourceNotes("");
    setVendorshipChoice("OUR_CODE");
    setVendorshipCompanyId("");
    setVendorshipFeeAmount("");
    setSelectedPartnerId("");
    setPartnerCustomerName("");
    setPartnerProjectName("");
    setPartnerCapacity("");
    setPartnerContractAmount("");
    setPartnerEconomicsType("profit_share");
    setProfitSharePercent("");
    setFixedRatePerKw("");
    setBillingParty("MSS");
    setPartnerGstInvoice("yes");
    setPartnerVendorshipChoice("OUR_CODE");
    setPartnerVendorshipFeeAmount("");
    setPartnerThirdPartyCompanyId("");
    setPartnerProjectType("Residential");
    setIncGiverCompanyId("");
    setRateBasis("per_kw");
    setRateValue("");
    setIncCapacity("");
    setIncArea("");
    setIncFixedAmount("");
    setIncProjectName("");
    setIncAddress("");
    setSheetStep("form");
    setPendingProject(null);
    setPendingIntake(null);
    setPendingQuotationId(undefined);
  };

  const handleQuotationSelect = (qId: string) => {
    const q = eligibleQuotations.find(x => x.id === qId);
    if (!q) return;
    setSelectedQuotationId(q.id);
    setProjectName(`${q.clientName} – ${q.systemCapacity}kW`);
    setCapacity(q.systemCapacity || "");
    setContractAmount(String(resolveContractAmount(q) || ""));
    if (q.paymentType) setPaymentTypeMss(q.paymentType);
    if (q.customerId) {
      setCustomerMode("select");
      setSelectedCustomerId(q.customerId);
    } else {
      setCustomerMode("add");
      setNewCustomerName(q.clientName || "");
      setNewCustomerPhone(q.clientPhone || "");
      setNewCustomerEmail(q.clientEmail || "");
      setNewCustomerAddress(q.clientAddress || "");
    }
  };

  // Compute INC total amount based on rate basis
  const incTotalAmount = useMemo(() => {
    if (rateBasis === "fixed") return parsePositiveAmount(incFixedAmount);
    if (rateBasis === "per_kw") return parsePositiveAmount(rateValue) * parsePositiveAmount(incCapacity) * 1000;
    if (rateBasis === "per_sqft") return parsePositiveAmount(rateValue) * parsePositiveAmount(incArea);
    return 0;
  }, [rateBasis, rateValue, incCapacity, incArea, incFixedAmount]);

  const handleCreate = async () => {
    if (!leadPath) {
      toast({ title: "Select a path", description: "Choose how this project came to you.", variant: "destructive" });
      return;
    }

    let enquiryLinkedCustomerId: string | undefined;
    if (selectedQuotationId) {
      const qFromList = eligibleQuotations.find((x) => x.id === selectedQuotationId);
      if (qFromList?.enquiryId) {
        const conv = await convertEnquiryToCustomer(qFromList.enquiryId);
        if (!conv.ok) {
          toast({
            title: "Could not convert enquiry to customer",
            description: conv.error || "Check enquiry status and try again.",
            variant: "destructive",
          });
          return;
        }
        if (conv.customerId) enquiryLinkedCustomerId = conv.customerId;
      }
    }

    const projectId = generateId("P");
    let finalProjectName = "";
    let finalCapacity = "";
    let finalContractAmount = 0;
    let finalCustomerId = "";
    let finalClientName = "";
    let finalProjectType: Project["projectType"] = "Residential";
    let projectKind: ProjectKind = "SOLO_EPC";
    let scopeConfig: ProjectScopeConfig;

    // ── Path A: Direct Client (or Outsourced INC lead) ──
    if (leadPath === "MSS_DIRECT" || leadPath === "OUTSOURCED_INC") {
      if (!projectName || !capacity) {
        toast({ title: "Missing fields", description: "Project name and capacity are required.", variant: "destructive" });
        return;
      }

      let activeCustomerId = selectedCustomerId;
      if (customerMode === "add") {
        if (!newCustomerName) {
          toast({ title: "Customer name required", variant: "destructive" });
          return;
        }
        const newCustId = allocateCustomerId();
        const added = addCustomer({
          id: newCustId,
          name: newCustomerName,
          phone: newCustomerPhone,
          email: newCustomerEmail,
          address: newCustomerAddress || "",
          type: "individual",
          itemsBought: [],
          totalPurchases: 0,
          createdAt: new Date().toISOString(),
        });
        if (!added) return;
        activeCustomerId = newCustId;
      }

      if (!activeCustomerId) {
        toast({ title: "Customer required", description: "Select an existing customer or add a new one.", variant: "destructive" });
        return;
      }

      if (enquiryLinkedCustomerId) {
        activeCustomerId = enquiryLinkedCustomerId;
      }

      const cust = customers.find(c => c.id === activeCustomerId);
      finalClientName = cust?.name || newCustomerName;
      finalCustomerId = activeCustomerId;
      finalProjectName = projectName;
      finalCapacity = capacity;
      finalContractAmount = parsePositiveAmount(contractAmount);
      finalProjectType = projectType;
      if (leadPath === "OUTSOURCED_INC") {
        if (!selectedSubcontractorId) {
          toast({ title: "Subcontractor required", description: "Select the installation subcontractor.", variant: "destructive" });
          return;
        }
        projectKind = "OUTSOURCED_INC";
        scopeConfig = {
          hasMaterial: false,
          hasInstallation: true,
          vendorshipOwner: "CLIENT",
          leadSource: "MSS_DIRECT",
          billingParty: "MSS",
          partnerId: selectedSubcontractorId,
          installationBy: "Subcontractor",
          kNumber: kNumber || undefined,
        };
      } else {
        projectKind = "SOLO_EPC";
        scopeConfig = {
          hasMaterial: true,
          hasInstallation: true,
          vendorshipOwner: vendorshipChoice === "OUR_CODE" ? "MSS" : "PARTNER",
          vendorshipFeeAmount: vendorshipChoice === "THIRD_PARTY" ? parsePositiveAmount(vendorshipFeeAmount) || undefined : undefined,
          leadSource: "MSS_DIRECT",
          billingParty: "MSS",
          kNumber: kNumber || undefined,
          vendorshipCompanyId: vendorshipChoice === "THIRD_PARTY" ? vendorshipCompanyId : undefined,
          agentId: selectedAgentId || undefined,
        };
      }

      if (leadPath === "MSS_DIRECT" && vendorshipChoice === "THIRD_PARTY" && vendorshipCompanyId && vendorshipFeeAmount) {
        const vc = vendorshipCompanies.find(c => c.id === vendorshipCompanyId);
        addExpense({
          id: generateId("EXP"),
          date: new Date().toISOString().split("T")[0],
          amount: parsePositiveAmount(vendorshipFeeAmount),
          category: "Vendorship Code Fee",
          subCategory: vc?.name || "Third-party code",
          projectId,
          description: `Vendorship code fee — ${vc?.name || vendorshipCompanyId}`,
          mainCategory: "site",
          paidBy: { type: "company" },
          createdAt: new Date().toISOString(),
          vendorshipCompanyId,
        });
      }
    }

    // ── Path B: Partner Network ──
    else if (leadPath === "PARTNER") {
      if (!selectedPartnerId) {
        toast({ title: "Partner required", description: "Select the partner who brought this deal.", variant: "destructive" });
        return;
      }
      if (!partnerCapacity || !partnerContractAmount) {
        toast({ title: "Missing fields", description: "Capacity and contract amount are required.", variant: "destructive" });
        return;
      }
      if (!partnerCustomerName.trim()) {
        toast({ title: "Customer name required", description: "Enter the end-customer name for this partner project.", variant: "destructive" });
        return;
      }

      if (partnerEconomicsType === "profit_share") {
        const ps = Number.parseFloat(profitSharePercent);
        if (!Number.isFinite(ps) || ps < 0 || ps > 100) {
          toast({ title: "Invalid profit share", description: "Enter a percentage between 0 and 100.", variant: "destructive" });
          return;
        }
      } else {
        const fr = Number.parseFloat(fixedRatePerKw);
        if (!Number.isFinite(fr) || fr <= 0) {
          toast({ title: "Invalid fixed rate", description: "Enter a positive ₹ per kW rate for the partner.", variant: "destructive" });
          return;
        }
      }

      const partner = partners.find(p => p.id === selectedPartnerId);
      finalProjectName = partnerProjectName || `${partner?.name || "Partner"} – ${partnerCapacity}kW`;
      finalCapacity = partnerCapacity;
      finalContractAmount = parsePositiveAmount(partnerContractAmount);
      const partnerCustId = allocateCustomerId();
      const partnerCustAdded = addCustomer({
        id: partnerCustId,
        name: partnerCustomerName.trim(),
        phone: "",
        email: "",
        address: "",
        type: "individual",
        itemsBought: [],
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      });
      if (!partnerCustAdded) return;
      finalClientName = partnerCustomerName.trim();
      finalCustomerId = partnerCustId;
      finalProjectType = partnerProjectType;

      projectKind = partner?.type === "Fixed-Rate" ? "FIXED_EPC" : "PARTNER_EPC";

      scopeConfig = {
        hasMaterial: true,
        hasInstallation: true,
        vendorshipOwner: partnerVendorshipChoice === "OUR_CODE" ? "MSS" : "PARTNER",
        vendorshipFeeAmount: partnerVendorshipChoice === "OUR_CODE" && partnerVendorshipFeeAmount
          ? parsePositiveAmount(partnerVendorshipFeeAmount)
          : partnerVendorshipChoice === "THIRD_PARTY" && partnerVendorshipFeeAmount
          ? parsePositiveAmount(partnerVendorshipFeeAmount)
          : undefined,
        leadSource: "PARTNER",
        partnerId: selectedPartnerId,
        billingParty,
        partnerBillingFeePercentage: partnerGstInvoice === "no" ? 9 : undefined,
        vendorshipCompanyId: partnerVendorshipChoice === "THIRD_PARTY" ? partnerThirdPartyCompanyId : undefined,
        profitSharePercent: partnerEconomicsType === "profit_share" ? parsePositiveAmount(profitSharePercent) || undefined : undefined,
        fixedRatePerKw: partnerEconomicsType === "fixed_rate" ? parsePositiveAmount(fixedRatePerKw) || undefined : undefined,
      };

      // Auto-create vendorship fee expense if third-party code for partner project (partner bears it)
      if (partnerVendorshipChoice === "THIRD_PARTY" && partnerThirdPartyCompanyId && partnerVendorshipFeeAmount) {
        const vc = vendorshipCompanies.find(c => c.id === partnerThirdPartyCompanyId);
        addExpense({
          id: generateId("EXP"),
          date: new Date().toISOString().split("T")[0],
          amount: parsePositiveAmount(partnerVendorshipFeeAmount),
          category: "Vendorship Code Fee",
          subCategory: vc?.name || "Third-party code",
          projectId,
          description: `Vendorship code fee — ${vc?.name || partnerThirdPartyCompanyId} (borne by partner)`,
          mainCategory: "site",
          paidBy: { type: "partner", entityId: selectedPartnerId, entityName: partner?.name },
          createdAt: new Date().toISOString(),
          vendorshipCompanyId: partnerThirdPartyCompanyId,
        });
      }
    }

    // ── Path C: INC Work Given to Us ──
    else if (leadPath === "INC_GIVEN") {
      if (!incGiverCompanyId) {
        toast({ title: "INC source required", description: "Select the company giving you this INC work.", variant: "destructive" });
        return;
      }
      const incCo = incGiverCompanies.find(c => c.id === incGiverCompanyId);
      const totalAmt = rateBasis === "fixed"
        ? parsePositiveAmount(incFixedAmount)
        : rateBasis === "per_kw"
        ? parsePositiveAmount(rateValue) * parsePositiveAmount(incCapacity) * 1000
        : parsePositiveAmount(rateValue) * parsePositiveAmount(incArea);

      if (totalAmt <= 0) {
        toast({
          title: "INC amount",
          description: "Enter rates and quantities so the computed contract total is positive.",
          variant: "destructive",
        });
        return;
      }

      finalProjectName = incProjectName || `INC – ${incCo?.name || "Unknown"} – ${incCapacity || "?"}kW`;
      finalCapacity = incCapacity || "0";
      finalContractAmount = totalAmt;
      finalClientName = incCo?.name || "INC Work Source";
      finalCustomerId = `inc-${incGiverCompanyId}`;
      finalProjectType = "Commercial";
      projectKind = "INC_GIVEN";

      scopeConfig = {
        hasMaterial: false,
        hasInstallation: true,
        vendorshipOwner: "CLIENT",
        leadSource: "MSS_DIRECT",
        billingParty: "MSS",
        incGiverCompanyId,
        rateBasis,
        rateValue: parsePositiveAmount(rateValue),
      };
    } else {
      return;
    }

    if (finalContractAmount <= 0) {
      toast({
        title: "Invalid contract amount",
        description: "Contract amount and partner rates must be greater than zero.",
        variant: "destructive",
      });
      return;
    }

    if (commissionRatePct?.trim()) {
      const cr = Number.parseFloat(commissionRatePct);
      if (!Number.isFinite(cr) || cr < 0 || cr > 100) {
        toast({ title: "Invalid commission %", description: "Agent commission must be between 0 and 100.", variant: "destructive" });
        return;
      }
    }

    if (
      (leadPath === "MSS_DIRECT" || leadPath === "OUTSOURCED_INC" || leadPath === "PARTNER") &&
      finalContractAmount <= 0
    ) {
      toast({ title: "Contract amount", description: "Enter a positive contract amount.", variant: "destructive" });
      return;
    }

    if (
      (leadPath === "MSS_DIRECT" || leadPath === "OUTSOURCED_INC") &&
      (paymentTypeMss === "loan" || paymentTypeMss === "cash-and-loan") &&
      !fundingLoanId
    ) {
      toast({ title: "Funding loan required", description: "Select which loan funds this project.", variant: "destructive" });
      return;
    }

    const internalEst = parsePositiveAmount(internalCostEstimate);
    const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : undefined;
    const subPartner =
      leadPath === "OUTSOURCED_INC" && selectedSubcontractorId
        ? partners.find((p) => p.id === selectedSubcontractorId)
        : undefined;

    // Derive the new 3-value project taxonomy from the legacy kind so the canonical resolver
     // (resolveProjectCapabilities) sees consistent data. normalizeProject also backfills, but
     // we set them explicitly here so the persisted record never relies on the legacy fallback.
    const legacyTypeMap = LEGACY_KIND_TO_TYPE[projectKind];
    const derivedProjectMode = legacyTypeMap.projectType;
    const derivedVendorshipOwner: Project["vendorshipOwner"] = (() => {
      if (leadPath === "MSS_DIRECT") return vendorshipChoice === "THIRD_PARTY" ? "partner" : "MSS";
      if (leadPath === "INC_GIVEN") return "none";
      if (leadPath === "OUTSOURCED_INC") return "MSS";
      return legacyTypeMap.vendorshipOwner;
    })();
    const derivedExecutionScope: Project["executionScope"] = legacyTypeMap.executionScope;
    const derivedPartnerRole = legacyTypeMap.partnerRole;

    // Per user's confirmed model: Outsourced INC attaches outsource info to an existing project,
    // not a new entity. The current sheet still creates a new project (legacy flow); we attach
    // the outsource block onto the new project so the Progress Report variant and Materials Sent
    // visibility react correctly. The "select an existing open project + attach" affordance is
    // tracked separately; for now the new project records the outsource relationship to itself.
    const derivedOutsource: Project["outsource"] =
      leadPath === "OUTSOURCED_INC" && subPartner
        ? {
            partyId: subPartner.id,
            partyName: subPartner.name,
            rateBasis: "fixed",
            rateValue: finalContractAmount,
            total: finalContractAmount,
            attachedAt: new Date().toISOString(),
          }
        : null;

    const projectData: Project = {
      id: projectId,
      name: finalProjectName,
      projectKind,
      projectKindConfigSnapshot: projectKindConfigSnapshot(projectKind),
      // New taxonomy fields (live alongside legacy projectKind during migration).
      projectMode: derivedProjectMode,
      vendorshipOwner: derivedVendorshipOwner,
      executionScope: derivedExecutionScope,
      partnerRole: derivedPartnerRole,
      outsource: derivedOutsource,
      type: projectKind === "INC_GIVEN" ? "INC" : "EPC",
      projectType: finalProjectType,
      projectCategory: "solar",
      lifecycleStatus: "New",
      client: finalClientName,
      customerId: finalCustomerId,
      capacity: finalCapacity.toLowerCase().includes("kw") ? finalCapacity : `${finalCapacity} kW`,
      location: newCustomerAddress || "",
      contractAmount: finalContractAmount,
      totalCost: internalEst,
      amountReceived: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString(),
      assignees: [],
      onSite: 0,
      photos: 0,
      quotationId: selectedQuotationId,
      scope: scopeConfig!,
      paymentType: paymentTypeMss || undefined,
      fundingLoanId:
        (paymentTypeMss === "loan" || paymentTypeMss === "cash-and-loan") && fundingLoanId ? fundingLoanId : undefined,
      agentId: selectedAgentId || undefined,
      agentName: selectedAgent?.name,
      commissionRate: commissionRatePct ? Number.parseFloat(commissionRatePct) : undefined,
      incScope:
        (projectKind === "OUTSOURCED_INC" || projectKind === "INC_GIVEN") && incScopeChoice ? incScopeChoice : undefined,
    };

    const intakePayload: ProjectIntakePayload = {
      kind: projectKind,
      parties: {
        customer: finalClientName,
        partner: leadPath === "PARTNER" ? partners.find((p) => p.id === selectedPartnerId)?.name : undefined,
        subcontractor: subPartner?.name,
        vendorOrDiscom:
          leadPath === "MSS_DIRECT"
            ? vendorshipChoice === "THIRD_PARTY"
              ? vendorshipCompanies.find((c) => c.id === vendorshipCompanyId)?.name
              : kNumber
                ? `MSS own DISCOM code for ${kNumber}`
                : "MSS own DISCOM code"
            : undefined,
        incGiverCompany:
          leadPath === "INC_GIVEN" ? incGiverCompanies.find((c) => c.id === incGiverCompanyId)?.name : undefined,
      },
      commercial: {
        contractAmount: finalContractAmount,
        paymentType: paymentTypeMss || "cash",
        internalCostEstimate: internalEst || 0,
        backendPrice:
          projectKind === "FIXED_EPC" ? parsePositiveAmount(fixedRatePerKw) * parsePositiveAmount(partnerCapacity) : undefined,
        partnerSellPrice: projectKind === "FIXED_EPC" ? finalContractAmount : undefined,
      },
    };

    setPendingProject(projectData);
    setPendingIntake(intakePayload);
    setPendingQuotationId(selectedQuotationId);
    setSheetStep("confirm");
  };

  const finalizeCreateProject = async (team: ProjectTeamAssignmentDraft) => {
    if (!pendingProject || !pendingIntake) return;
    if (team.targetEndDate && team.targetEndDate < pendingProject.startDate) {
      toast({
        title: "Invalid end date",
        description: "Target end date cannot be before the project start date.",
        variant: "destructive",
      });
      return;
    }
    const project = applyTeamAssignmentToProject(pendingProject, team);
    const res = pendingQuotationId
      ? await createProjectFromConfirmedQuotation(project)
      : await createProjectIntake({ project, intake: pendingIntake, quotationId: pendingQuotationId });

    if (res.ok) {
      clearFormDraft("create-project-modal-v1");
      toast({ title: "Project Created", description: `${project.name} has been successfully created.` });
      onOpenChange(false);
      resetForm();
      navigate(`/projects/${res.projectId || project.id}`);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const CREATE_PROJECT_DRAFT_KEY = "create-project-modal-v1";

  useEffect(() => {
    if (!open) return;
    if (prefillCustomerDraft) {
      setLeadPath("MSS_DIRECT");
      setCustomerMode("select");
      setSelectedCustomerId(prefillCustomerDraft.customerId);
      setProjectName(`${prefillCustomerDraft.customerName} – Project`);
      setNewCustomerName(prefillCustomerDraft.customerName);
      setNewCustomerPhone(prefillCustomerDraft.customerPhone);
      setNewCustomerEmail(prefillCustomerDraft.customerEmail);
      setNewCustomerAddress(prefillCustomerDraft.customerAddress);
      return;
    }
    if (prefillQuotationId) {
      setLeadPath("MSS_DIRECT");
      handleQuotationSelect(prefillQuotationId);
      const draft = loadCreateDraft<ProjectDraftFromQuotation>("project-create-draft");
      if (draft?.quotationId === prefillQuotationId) {
        if (draft.capacityText) setCapacity(draft.capacityText);
        else if (draft.capacityKw) setCapacity(String(draft.capacityKw));
        if (draft.contractAmount) setContractAmount(String(draft.contractAmount));
        if (draft.agentId) setSelectedAgentId(draft.agentId);
        if (draft.paymentType) setPaymentTypeMss(draft.paymentType);
        if (draft.customerId) {
          setCustomerMode("select");
          setSelectedCustomerId(draft.customerId);
        } else if (draft.customerName) {
          setCustomerMode("add");
          setNewCustomerName(draft.customerName);
          setNewCustomerPhone(draft.customerPhone);
          if (draft.customerEmail) setNewCustomerEmail(draft.customerEmail);
          setNewCustomerAddress(draft.customerAddress);
        }
        if (draft.customerName && !projectName) {
          setProjectName(`${draft.customerName} – ${draft.capacityKw || draft.capacityText || ""}kW`);
        }
      }
      return;
    }
    const d = loadFormDraft<{
      v: number;
      leadPath?: LeadPath | null;
      projectName?: string;
      contractAmount?: string;
      capacity?: string;
      selectedCustomerId?: string;
      partnerContractAmount?: string;
      selectedPartnerId?: string;
    }>(CREATE_PROJECT_DRAFT_KEY);
    if (d?.v !== 1) return;
    if (d.leadPath != null) setLeadPath(d.leadPath);
    if (d.projectName != null) setProjectName(d.projectName);
    if (d.contractAmount != null) setContractAmount(d.contractAmount);
    if (d.capacity != null) setCapacity(d.capacity);
    if (d.selectedCustomerId != null) setSelectedCustomerId(d.selectedCustomerId);
    if (d.partnerContractAmount != null) setPartnerContractAmount(d.partnerContractAmount);
    if (d.selectedPartnerId != null) setSelectedPartnerId(d.selectedPartnerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleQuotationSelect is stable enough for prefill
  }, [open, prefillQuotationId, prefillCustomerDraft]);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          saveFormDraft(CREATE_PROJECT_DRAFT_KEY, {
            v: 1,
            leadPath,
            projectName,
            contractAmount,
            capacity,
            selectedCustomerId,
            partnerContractAmount,
            selectedPartnerId,
          });
          resetForm();
        }
      }}
    >
      <AppSheetContent layout="scroll" size="lg" mobileFullScreen>
        <SheetHeader className="p-6 border-b sticky top-0 z-10 bg-background/95 backdrop-blur">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <Briefcase className="h-5 w-5 text-primary" />
            Create New Project
          </SheetTitle>
        </SheetHeader>

        {sheetStep === "confirm" && pendingProject ? (
          <div className="p-6">
            <ProjectConfirmationScreen
              data={buildProjectConfirmationData(pendingProject, {
                quotationNumber: pendingQuotationId
                  ? eligibleQuotations.find((q) => q.id === pendingQuotationId)?.quotationNumber
                  : undefined,
              })}
              employees={activeEmployees}
              onEdit={() => setSheetStep("form")}
              onConfirm={(team) => { void finalizeCreateProject(team); }}
            />
          </div>
        ) : (
        <div className="p-6 space-y-8">

          {/* ── Section 1: Origin ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How did this project come to us?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                {
                  key: "MSS_DIRECT" as LeadPath,
                  icon: User,
                  title: "Direct Client",
                  sub: "We acquired this client directly",
                },
                {
                  key: "PARTNER" as LeadPath,
                  icon: Users,
                  title: "Partner Network",
                  sub: "A partner brought this deal to us",
                },
                {
                  key: "INC_GIVEN" as LeadPath,
                  icon: HardHat,
                  title: "INC Work Given to Us",
                  sub: "A company is giving us installation work",
                },
                {
                  key: "OUTSOURCED_INC" as LeadPath,
                  icon: UsersRound,
                  title: "Outsourced INC",
                  sub: "Subcontractor executes; MSS retains customer contract",
                },
              ].map(({ key, icon: Icon, title, sub }) => (
                <button
                  key={key}
                  onClick={() => setLeadPath(key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    leadPath === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`h-4 w-4 ${leadPath === key ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-semibold text-sm">{title}</span>
                    {leadPath === key && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Outsourced INC: pick an existing open project + attach outsource info ── */}
          {leadPath === "OUTSOURCED_INC" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-xl border bg-warning dark:bg-warning/5 border-warning dark:border-warning/20 p-4">
                <h3 className="text-sm font-semibold mb-2">How is this outsourcing recorded?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "existing" as const, title: "Attach to existing project (Recommended)", sub: "Pick an open project and record outsource details on it. No new project is created." },
                    { key: "new" as const, title: "Create a fresh outsourced project", sub: "Spin up a new project entity that tracks subcontractor work end-to-end." },
                  ].map(({ key, title, sub }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setOutsourceMode(key)}
                      className={`p-3 rounded-lg border text-left text-sm transition ${
                        outsourceMode === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {outsourceMode === "existing" && (
                <div className="space-y-4 rounded-xl border p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select an open project to outsource</h3>
                  <Select value={outsourceTargetProjectId} onValueChange={setOutsourceTargetProjectId}>
                    <SelectTrigger><SelectValue placeholder="Choose project…" /></SelectTrigger>
                    <SelectContent className="max-h-[60vh]">
                      {projects
                        .filter((p) => p.lifecycleStatus !== "Completed")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.id} — {p.name} — {p.capacity || "no capacity"} — {p.client}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {outsourceTargetProjectId && (() => {
                    const target = projects.find((p) => p.id === outsourceTargetProjectId);
                    if (!target) return null;
                    return (
                      <div className="grid grid-cols-2 gap-3 text-xs rounded-lg bg-muted/30 p-3">
                        <div><span className="text-muted-foreground block">Client</span><span className="font-medium">{target.client}</span></div>
                        <div><span className="text-muted-foreground block">Capacity</span><span className="font-medium">{target.capacity || "—"}</span></div>
                        <div><span className="text-muted-foreground block">Location</span><span className="font-medium">{target.location || "—"}</span></div>
                        <div><span className="text-muted-foreground block">Contract</span><span className="font-medium">₹{(target.contractAmount || 0).toLocaleString("en-IN")}</span></div>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Outsource to (subcontractor)</Label>
                    <Select value={selectedSubcontractorId} onValueChange={setSelectedSubcontractorId}>
                      <SelectTrigger><SelectValue placeholder="Choose subcontractor…" /></SelectTrigger>
                      <SelectContent>
                        {partners.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Rate basis</Label>
                    <div className="flex flex-wrap gap-2">
                      {(["per_kw", "per_sqft", "fixed"] as const).map((basis) => (
                        <button
                          key={basis}
                          type="button"
                          onClick={() => setOutsourceRateBasis(basis)}
                          className={`px-3 py-1.5 rounded-md border text-xs transition ${
                            outsourceRateBasis === basis ? "border-primary bg-primary/5 text-primary" : "border-border"
                          }`}
                        >
                          {basis === "per_kw" ? "Per kW" : basis === "per_sqft" ? "Per sqft" : "Fixed total"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase text-muted-foreground">
                        {outsourceRateBasis === "fixed" ? "Total amount" : outsourceRateBasis === "per_kw" ? "Rate per kW" : "Rate per sqft"}
                      </Label>
                      <Input
                        type="number"
                        value={outsourceRateValue}
                        onChange={(e) => setOutsourceRateValue(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    {outsourceRateBasis !== "fixed" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs uppercase text-muted-foreground">
                          Quantity ({outsourceRateBasis === "per_kw" ? "kW" : "sqft"})
                        </Label>
                        <Input
                          type="number"
                          value={outsourceQuantity}
                          onChange={(e) => setOutsourceQuantity(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">Notes (optional)</Label>
                    <Input
                      value={outsourceNotes}
                      onChange={(e) => setOutsourceNotes(e.target.value)}
                      placeholder="Scope, deadline, payment terms…"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={() => {
                        const target = projects.find((p) => p.id === outsourceTargetProjectId);
                        if (!target) {
                          toast({ title: "Pick a project", description: "Select an open project to attach outsource info to.", variant: "destructive" });
                          return;
                        }
                        if (!selectedSubcontractorId) {
                          toast({ title: "Pick a subcontractor", description: "Select who the work is outsourced to.", variant: "destructive" });
                          return;
                        }
                        const rate = parsePositiveAmount(outsourceRateValue);
                        if (rate <= 0) {
                          toast({ title: "Enter a rate", description: "Rate must be positive.", variant: "destructive" });
                          return;
                        }
                        const qty = outsourceRateBasis === "fixed" ? 1 : parsePositiveAmount(outsourceQuantity || (outsourceRateBasis === "per_kw" ? target.capacity?.replace(/[^\d.]/g, "") || "0" : "0"));
                        const total = outsourceRateBasis === "fixed" ? rate : rate * qty;
                        const subPartner = partners.find((p) => p.id === selectedSubcontractorId);
                        updateProject(target.id, {
                          outsource: {
                            partyId: selectedSubcontractorId,
                            partyName: subPartner?.name,
                            rateBasis: outsourceRateBasis,
                            rateValue: rate,
                            quantity: outsourceRateBasis === "fixed" ? undefined : qty,
                            total,
                            notes: outsourceNotes.trim() || undefined,
                            attachedAt: new Date().toISOString(),
                          },
                        } as Partial<Project>);
                        toast({
                          title: `Outsourced to ${subPartner?.name || selectedSubcontractorId}`,
                          description: `Attached to project ${target.id}.`,
                        });
                        onOpenChange(false);
                        resetForm();
                        navigate(`/projects/${target.id}`);
                      }}
                      disabled={!outsourceTargetProjectId || !selectedSubcontractorId}
                    >
                      Attach outsource to project
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Path A: Direct Client / Outsourced INC ── */}
          {(leadPath === "MSS_DIRECT" || (leadPath === "OUTSOURCED_INC" && outsourceMode === "new")) && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* Quotation attachment */}
              {eligibleQuotations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach Quotation (optional)</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar border rounded-xl p-3 bg-muted/30">
                    {eligibleQuotations.map(q => (
                      <div
                        key={q.id}
                        onClick={() => handleQuotationSelect(q.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${
                          selectedQuotationId === q.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">{q.clientName}</p>
                          <p className="text-xs text-muted-foreground">{q.quotationNumber} · {q.systemCapacity}kW · ₹{resolveContractAmount(q).toLocaleString()}</p>
                        </div>
                        {selectedQuotationId === q.id
                          ? <Check className="h-4 w-4 text-primary" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                  {selectedQuotationId && (
                    <p className="text-xs text-success font-medium">✓ Quotation attached — details auto-filled below. Verify and edit as needed.</p>
                  )}
                </div>
              )}

              {/* Customer */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setCustomerMode("select")}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${customerMode === "select" ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground"}`}
                  >
                    Select Existing
                  </button>
                  <button
                    onClick={() => setCustomerMode("add")}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${customerMode === "add" ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground"}`}
                  >
                    Add New Customer
                  </button>
                </div>

                {customerMode === "select" ? (
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                    <SelectContent>
                      {selectableCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border rounded-xl bg-muted/20">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Customer Name <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Input
                          placeholder="Full name as on documents"
                          value={newCustomerName}
                          onChange={e => setNewCustomerName(e.target.value)}
                        />
                        {selectedQuotationId && newCustomerName && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-warning">
                            <AlertTriangle className="h-3 w-3" />
                            Verify this name matches the approved quotation exactly.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <Input placeholder="10-digit mobile" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input placeholder="email@example.com" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Installation Address</Label>
                      <Textarea placeholder="Full address" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} rows={2} />
                    </div>
                  </div>
                )}
              </div>

              {leadPath === "OUTSOURCED_INC" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subcontractor</h3>
                  <Select value={selectedSubcontractorId} onValueChange={setSelectedSubcontractorId}>
                    <SelectTrigger><SelectValue placeholder="Select subcontractor partner" /></SelectTrigger>
                    <SelectContent>
                      {partners.filter((p) => p.type === "Subcontractor").map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* K Number */}
              <div className="space-y-1.5">
                <Label>Electricity Bill Number (K Number)</Label>
                <Input placeholder="e.g. KA05E12345" value={kNumber} onChange={e => setKNumber(e.target.value)} />
                <p className="text-xs text-muted-foreground">Customer's electricity connection number — required for DISCOM submission.</p>
              </div>

              {/* Project details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Project Name <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. Sharma Residency 5kW" value={projectName} onChange={e => setProjectName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Project Type</Label>
                    <Select value={projectType} onValueChange={(v) => setProjectType(v as Project["projectType"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residential">Residential</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Capacity (kW) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input placeholder="e.g. 5" value={capacity} onChange={e => setCapacity(e.target.value)} className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">kW</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Contract Amount (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Total project value" type="number" value={contractAmount} onChange={e => setContractAmount(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Internal cost estimate (₹)</Label>
                    <Input type="number" min={0} step={0.01} placeholder="0" value={internalCostEstimate} onChange={(e) => setInternalCostEstimate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Payment type</Label>
                    <Select value={paymentTypeMss || "cash"} onValueChange={(v) => setPaymentTypeMss(v as typeof paymentTypeMss)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="cash-and-loan">Cash + Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(paymentTypeMss === "loan" || paymentTypeMss === "cash-and-loan") && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Funding loan</Label>
                      <Select value={fundingLoanId} onValueChange={setFundingLoanId}>
                        <SelectTrigger><SelectValue placeholder="Select loan" /></SelectTrigger>
                        <SelectContent>
                          {loans.filter((l) => l.status === "Active").map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.source} — {l.personName || "—"} (₹{l.outstanding?.toLocaleString?.() ?? l.outstanding})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Agent (optional)</Label>
                    <Select value={selectedAgentId || "__none__"} onValueChange={(v) => setSelectedAgentId(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Commission % (optional)</Label>
                    <Input type="number" min={0} step={0.1} placeholder="e.g. 2" value={commissionRatePct} onChange={(e) => setCommissionRatePct(e.target.value)} />
                  </div>
                  {leadPath === "OUTSOURCED_INC" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>INC scope</Label>
                      <Select value={incScopeChoice || "labour"} onValueChange={(v) => setIncScopeChoice(v as typeof incScopeChoice)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labour">Labour only</SelectItem>
                          <SelectItem value="labour_and_materials">Labour + materials</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Vendorship code */}
              {leadPath === "MSS_DIRECT" && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DISCOM Vendorship Code</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "OUR_CODE" as VendorshipChoice, icon: ShieldCheck, title: "Use Our Own Code", sub: "MSS's registration. Document Creator available." },
                    { key: "THIRD_PARTY" as VendorshipChoice, icon: Building2, title: "Use Third-Party Code", sub: "A vendorship code company's registration. We pay a fee." },
                  ].map(({ key, icon: Icon, title, sub }) => (
                    <button
                      key={key}
                      onClick={() => setVendorshipChoice(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        vendorshipChoice === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${vendorshipChoice === key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-medium text-sm">{title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </button>
                  ))}
                </div>

                {vendorshipChoice === "THIRD_PARTY" && (
                  <div className="space-y-3 p-4 border rounded-xl bg-warning/5 border-warning/20 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <Label>Select Vendorship Code Company <span className="text-destructive">*</span></Label>
                      <Select value={vendorshipCompanyId} onValueChange={setVendorshipCompanyId}>
                        <SelectTrigger><SelectValue placeholder="Choose company..." /></SelectTrigger>
                        <SelectContent>
                          {vendorshipCompanies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fee for this project (₹)</Label>
                      <Input type="number" placeholder="e.g. 25000" value={vendorshipFeeAmount} onChange={e => setVendorshipFeeAmount(e.target.value)} />
                      <p className="text-xs text-muted-foreground">This will be auto-recorded as a project expense under "Vendorship Code Fee".</p>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          )}

          {/* ── Path B: Partner Network ── */}
          {leadPath === "PARTNER" && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* Partner selection */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partner</h3>
                <Select value={selectedPartnerId} onValueChange={(v) => {
                  setSelectedPartnerId(v);
                  const p = partners.find(x => x.id === v);
                  if (p?.type === "Fixed-Rate") setPartnerEconomicsType("fixed_rate");
                  else setPartnerEconomicsType("profit_share");
                  if (p?.defaultRatePerKw) setFixedRatePerKw(String(p.defaultRatePerKw));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select partner..." /></SelectTrigger>
                  <SelectContent>
                    {dealBringerPartners.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span>{p.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{p.type}</Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quotation attachment (optional) */}
              {eligibleQuotations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach Quotation (optional)</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar border rounded-xl p-3 bg-muted/30">
                    {eligibleQuotations.map(q => (
                      <div
                        key={q.id}
                        onClick={() => handleQuotationSelect(q.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${selectedQuotationId === q.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{q.clientName}</p>
                          <p className="text-xs text-muted-foreground">{q.quotationNumber} · {q.systemCapacity}kW · ₹{resolveContractAmount(q).toLocaleString()}</p>
                        </div>
                        {selectedQuotationId === q.id ? <Check className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                  {selectedQuotationId && (
                    <p className="text-xs text-success font-medium">✓ Quotation attached — details auto-filled below.</p>
                  )}
                </div>
              )}

              {/* Customer (optional) */}
              <div className="space-y-1.5">
                <Label>Customer Name <span className="text-destructive">*</span></Label>
                <Input placeholder="End-customer name" value={partnerCustomerName} onChange={e => setPartnerCustomerName(e.target.value)} />
              </div>

              {/* Project details */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Project Name</Label>
                    <Input placeholder="Auto-generated if blank" value={partnerProjectName} onChange={e => setPartnerProjectName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Project Type</Label>
                    <Select value={partnerProjectType} onValueChange={(v) => setPartnerProjectType(v as Project["projectType"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residential">Residential</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Industrial">Industrial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Capacity (kW) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input placeholder="e.g. 5" value={partnerCapacity} onChange={e => setPartnerCapacity(e.target.value)} className="pr-10" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">kW</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Total Contract Value (₹) <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="What the customer pays" type="number" value={partnerContractAmount} onChange={e => setPartnerContractAmount(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner economics */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partner Economics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setPartnerEconomicsType("profit_share")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${partnerEconomicsType === "profit_share" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-medium text-sm">Profit Share</p>
                    <p className="text-xs text-muted-foreground">Partner earns a % of profit after MSS costs</p>
                  </button>
                  <button
                    onClick={() => setPartnerEconomicsType("fixed_rate")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${partnerEconomicsType === "fixed_rate" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <p className="font-medium text-sm">Fixed Rate</p>
                    <p className="text-xs text-muted-foreground">MSS earns fixed ₹/kW, partner keeps the rest</p>
                  </button>
                </div>

                {partnerEconomicsType === "profit_share" && (
                  <div className="space-y-1.5">
                    <Label>Partner's Profit Share (%)</Label>
                    <Input type="number" placeholder="e.g. 30" value={profitSharePercent} onChange={e => setProfitSharePercent(e.target.value)} />
                  </div>
                )}
                {partnerEconomicsType === "fixed_rate" && (
                  <div className="space-y-1.5">
                    <Label>MSS Backend Rate (₹/kW)</Label>
                    <Input type="number" placeholder="e.g. 65000" value={fixedRatePerKw} onChange={e => setFixedRatePerKw(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Billing */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing & Invoice</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "MSS" as const, title: "MSS Bills Customer", sub: "We raise the invoice to the customer" },
                    { key: "PARTNER" as const, title: "Partner Bills Customer", sub: "Partner raises invoice to customer" },
                  ].map(({ key, title, sub }) => (
                    <button key={key} onClick={() => setBillingParty(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${billingParty === key ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label>Does the partner give us a GST invoice for their profit share?</Label>
                  <div className="flex gap-2">
                    {[{ k: "yes" as const, label: "Yes — they invoice us" }, { k: "no" as const, label: "No — deduct 9% offset" }].map(({ k, label }) => (
                      <button key={k} onClick={() => setPartnerGstInvoice(k)}
                        className={`px-4 py-2 rounded-lg text-sm border transition-colors ${partnerGstInvoice === k ? "border-primary bg-primary/5 text-primary font-medium" : "border-border"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {partnerGstInvoice === "no" && (
                    <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">9% will be deducted from the partner's share as GST offset before payment.</p>
                  )}
                </div>
              </div>

              {/* Vendorship code */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DISCOM Vendorship Code</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "OUR_CODE" as VendorshipChoice, icon: ShieldCheck, title: "Use Our Own Code", sub: "We charge partner a usage fee" },
                    { key: "THIRD_PARTY" as VendorshipChoice, icon: Building2, title: "Use Third-Party Code", sub: "Partner bears this cost from their share" },
                  ].map(({ key, icon: Icon, title, sub }) => (
                    <button key={key} onClick={() => setPartnerVendorshipChoice(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${partnerVendorshipChoice === key ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${partnerVendorshipChoice === key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-medium text-sm">{title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </button>
                  ))}
                </div>

                {partnerVendorshipChoice === "OUR_CODE" && (
                  <div className="space-y-1.5">
                    <Label>Vendorship Usage Fee charged to partner (₹)</Label>
                    <Input type="number" placeholder="e.g. 15000" value={partnerVendorshipFeeAmount} onChange={e => setPartnerVendorshipFeeAmount(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Tracked as receivable from the partner.</p>
                  </div>
                )}

                {partnerVendorshipChoice === "THIRD_PARTY" && (
                  <div className="space-y-3 p-4 border rounded-xl bg-warning/5 border-warning/20 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <Label>Vendorship Code Company</Label>
                      <Select value={partnerThirdPartyCompanyId} onValueChange={setPartnerThirdPartyCompanyId}>
                        <SelectTrigger><SelectValue placeholder="Choose company..." /></SelectTrigger>
                        <SelectContent>
                          {vendorshipCompanies.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fee amount (₹) <span className="text-xs text-muted-foreground">— deducted from partner's share</span></Label>
                      <Input type="number" placeholder="e.g. 25000" value={partnerVendorshipFeeAmount} onChange={e => setPartnerVendorshipFeeAmount(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Path C: INC Work Given to Us ── */}
          {leadPath === "INC_GIVEN" && (
            <div className="space-y-6 animate-in fade-in duration-200">

              {/* Quotation attachment (optional) */}
              {eligibleQuotations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach Quotation (optional)</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar border rounded-xl p-3 bg-muted/30">
                    {eligibleQuotations.map(q => (
                      <div
                        key={q.id}
                        onClick={() => handleQuotationSelect(q.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center ${selectedQuotationId === q.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{q.clientName}</p>
                          <p className="text-xs text-muted-foreground">{q.quotationNumber} · {q.systemCapacity}kW · ₹{resolveContractAmount(q).toLocaleString()}</p>
                        </div>
                        {selectedQuotationId === q.id ? <Check className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                  {selectedQuotationId && <p className="text-xs text-success font-medium">✓ Quotation attached.</p>}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">INC Work Source</h3>
                <Select value={incGiverCompanyId} onValueChange={setIncGiverCompanyId}>
                  <SelectTrigger><SelectValue placeholder="Select company giving us this work..." /></SelectTrigger>
                  <SelectContent>
                    {incGiverCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The company whose installation job we are doing. We will collect from them after completion.</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate Basis</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { k: "per_kw" as RateBasis, label: "Per kW" },
                    { k: "per_sqft" as RateBasis, label: "Per sq ft" },
                    { k: "fixed" as RateBasis, label: "Fixed Total" },
                  ].map(({ k, label }) => (
                    <button key={k} onClick={() => setRateBasis(k)}
                      className={`p-3 rounded-xl border-2 text-center text-sm transition-all ${rateBasis === k ? "border-primary bg-primary/5 font-medium" : "border-border"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rateBasis !== "fixed" && (
                    <div className="space-y-1.5">
                      <Label>{rateBasis === "per_kw" ? "Rate (₹/kW)" : "Rate (₹/sq ft)"}</Label>
                      <Input type="number" placeholder="e.g. 8000" value={rateValue} onChange={e => setRateValue(e.target.value)} />
                    </div>
                  )}
                  {rateBasis === "per_kw" && (
                    <div className="space-y-1.5">
                      <Label>Capacity (kW)</Label>
                      <Input type="number" placeholder="e.g. 10" value={incCapacity} onChange={e => setIncCapacity(e.target.value)} />
                    </div>
                  )}
                  {rateBasis === "per_sqft" && (
                    <div className="space-y-1.5">
                      <Label>Area (sq ft)</Label>
                      <Input type="number" placeholder="e.g. 500" value={incArea} onChange={e => setIncArea(e.target.value)} />
                    </div>
                  )}
                  {rateBasis === "fixed" && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Fixed Amount (₹)</Label>
                      <Input type="number" placeholder="Total agreed amount" value={incFixedAmount} onChange={e => setIncFixedAmount(e.target.value)} />
                    </div>
                  )}
                </div>

                {incTotalAmount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-medium">Total to collect: ₹{incTotalAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Project Name / Reference</Label>
                    <Input placeholder="Auto-generated if blank" value={incProjectName} onChange={e => setIncProjectName(e.target.value)} />
                  </div>
                  {rateBasis === "per_kw" && (
                    <div className="space-y-1.5">
                      <Label>Capacity (kW)</Label>
                      <Input type="number" placeholder="Already entered above" value={incCapacity} onChange={e => setIncCapacity(e.target.value)} disabled />
                    </div>
                  )}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Site Address</Label>
                    <Input placeholder="Installation site address" value={incAddress} onChange={e => setIncAddress(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {sheetStep === "form" && (
        <SheetFooter className="p-6 border-t flex items-center justify-end gap-2 sticky bottom-0 bg-background/95 backdrop-blur">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!leadPath} className="bg-primary hover:bg-primary/90">
            <Check className="w-4 h-4 mr-2" />
            Review &amp; Create
          </Button>
        </SheetFooter>
        )}
      </AppSheetContent>
    </Sheet>
  );
};

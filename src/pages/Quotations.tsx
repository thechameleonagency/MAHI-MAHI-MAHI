import React, { useState, useRef, useEffect, useMemo } from "react";
import { ArrowLeft, Printer, Send, Download, Plus, Trash2, Check, Building2, Phone, Mail, Globe, Edit, FileText, Eye, MoreHorizontal, UserPlus, X, Save, CheckCircle, Briefcase, IndianRupee, MessageCircle, Calendar, Clock, MapPin, Share2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useAppData } from "@/contexts/AppDataContext";
import { useMasters } from "@/contexts/MastersContext";
import { ProjectKindService, type ProjectIntakePayload } from "@/application/services/ProjectKindService";
import { projectKindConfigs } from "@/domain/projectTypes/config";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { ProjectKind } from "@/domain/projectTypes/types";
import { companyInfo } from "@/components/ExportHeader";
import type { Quotation } from "@/types/project";
import type { Project } from "@/types/project";
import { EntityLink } from "@/components/shared/EntityInfoModal";
// AlertDialog removed
import { DataTableShell } from "@/components/data-table/DataTableShell";
import { TablePaginationBar, DEFAULT_TABLE_PAGE_SIZE } from "@/components/data-table/TablePaginationBar";
import { dataTableClasses, listTableViewportMaxHeight } from "@/lib/tableConstants";
import { usePagedSlice } from "@/hooks/usePagedSlice";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

interface QuotationMaterial {
  id: number;
  category: string;
  itemName: string;
  description?: string;
  size: string;
  quantity: number;
  rate: number;
  unit: string;
}

// Pre-defined materials based on uploaded PDF
const presetMaterials: Record<string, QuotationMaterial[]> = {
  "residential-3": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 540W Mono Perc Solar Panel", size: "540W", quantity: 6, rate: 13500, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Growatt 3kW On-Grid Inverter", size: "3kW", quantity: 1, rate: 35000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Elevated Structure Kit", size: "3kW", quantity: 1, rate: 18000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 4sqmm (Red & Black)", size: "4sqmm", quantity: 30, rate: 45, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 6sqmm", size: "6sqmm", quantity: 15, rate: 55, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Standard", quantity: 12, rate: 35, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "3kW", quantity: 1, rate: 3500, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "3kW", quantity: 1, rate: 2500, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Earthing Kit Complete", size: "Standard", quantity: 1, rate: 4500, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Standard", quantity: 1, rate: 2500, unit: "pcs" },
  ],
  "commercial-20": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 550W Bifacial Solar Panel", size: "550W", quantity: 36, rate: 14500, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Growatt 20kW On-Grid Inverter", size: "20kW", quantity: 1, rate: 180000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Elevated Structure Kit", size: "20kW", quantity: 1, rate: 95000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 6sqmm (Red & Black)", size: "6sqmm", quantity: 200, rate: 55, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 16sqmm 3-Phase", size: "16sqmm", quantity: 50, rate: 180, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Standard", quantity: 72, rate: 35, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "20kW", quantity: 1, rate: 12000, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "20kW", quantity: 1, rate: 8000, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Earthing Kit Complete", size: "Commercial", quantity: 2, rate: 6500, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Commercial", quantity: 2, rate: 4500, unit: "pcs" },
    { id: 11, category: "Meter", itemName: "Net Meter Bidirectional", size: "3-Phase", quantity: 1, rate: 8000, unit: "pcs" },
  ],
  "industrial-100": [
    { id: 1, category: "Panel/Module", itemName: "Waaree 550W Bifacial Solar Panel", size: "550W", quantity: 182, rate: 14000, unit: "pcs" },
    { id: 2, category: "Wiring", itemName: "Sungrow 100kW On-Grid Inverter", size: "100kW", quantity: 1, rate: 650000, unit: "pcs" },
    { id: 3, category: "Structure", itemName: "GI Ground Mount Structure Kit", size: "100kW", quantity: 1, rate: 450000, unit: "set" },
    { id: 4, category: "Wiring", itemName: "DC Cable 10sqmm (Red & Black)", size: "10sqmm", quantity: 1000, rate: 85, unit: "m" },
    { id: 5, category: "Wiring", itemName: "AC Cable 70sqmm 3-Phase Armoured", size: "70sqmm", quantity: 100, rate: 650, unit: "m" },
    { id: 6, category: "Wiring", itemName: "MC4 Connectors", size: "Industrial", quantity: 364, rate: 40, unit: "pair" },
    { id: 7, category: "Wiring", itemName: "AC Distribution Box (ACDB)", size: "100kW", quantity: 1, rate: 45000, unit: "pcs" },
    { id: 8, category: "Wiring", itemName: "DC Distribution Box (DCDB)", size: "100kW", quantity: 4, rate: 15000, unit: "pcs" },
    { id: 9, category: "Earthing", itemName: "Industrial Earthing Kit", size: "Heavy Duty", quantity: 4, rate: 12000, unit: "set" },
    { id: 10, category: "Earthing", itemName: "Lightning Arrestor", size: "Industrial", quantity: 4, rate: 8000, unit: "pcs" },
    { id: 11, category: "Meter", itemName: "Net Meter Bidirectional", size: "3-Phase HT", quantity: 1, rate: 25000, unit: "pcs" },
    { id: 12, category: "Civil", itemName: "Foundation & Civil Work", size: "100kW", quantity: 1, rate: 150000, unit: "job" },
  ],
};

const Quotations = () => {
  const projectKindService = new ProjectKindService();
  const navigate = useNavigate();
  const location = useLocation();
  const quotationRef = useRef<HTMLDivElement>(null);
  const { 
    quotations: savedQuotations, 
    customers,
    addCustomer,
    addQuotation, 
    updateQuotation, 
    transitionQuotationStatus,
    reviseQuotation,
    deleteQuotation,
    createProjectFromConfirmedQuotation,
    createProjectIntake,
    generateId,
    partners,
    agents,
    quotationVisibilityPresets = [],
    addQuotationVisibilityPreset,
    deleteQuotationVisibilityPreset,
    inventoryPresets = [],
  } = useAppData();
  
  // State for Create Project in edit/create view
  const [showCreateProjectInForm, setShowCreateProjectInForm] = useState(false);
  
  // View state: list, create, edit (solar-only quotations)
  const [currentView, setCurrentView] = useState<"list" | "create" | "edit">("list");
  const [activeTab, setActiveTab] = useState("create");
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  
  // Save amounts confirmation modal
  const [isSaveAmountsOpen, setIsSaveAmountsOpen] = useState(false);
  const [saveAmountsQuotationId, setSaveAmountsQuotationId] = useState<string | null>(null);
  const [saveAmountTemp, setSaveAmountTemp] = useState<number>(0);
  const [saveAmountFinal, setSaveAmountFinal] = useState<number>(0);
  
  // Create Project Modal
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [selectedQuotationForProject, setSelectedQuotationForProject] = useState<typeof savedQuotations[0] | null>(null);
  const [projectAmountType, setProjectAmountType] = useState<"temporary" | "final">("final");
  const [quotationProjectKind, setQuotationProjectKind] = useState<ProjectKind>("SOLO_EPC");
  const [qPartnerIdForProject, setQPartnerIdForProject] = useState<string>("");
  const [qProfitSharePercent, setQProfitSharePercent] = useState("30");
  const [qVendorshipFee, setQVendorshipFee] = useState("");
  const [qFixedBackend, setQFixedBackend] = useState("");
  const [qFixedSell, setQFixedSell] = useState("");
  const [qChannel, setQChannel] = useState("");
  const [qExternal, setQExternal] = useState("");
  
  // Delete Confirmation Modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteHasRelations, setDeleteHasRelations] = useState(false);
  const [deleteRelatedEntities, setDeleteRelatedEntities] = useState<{type: string; id: string; name: string}[]>([]);
  
  // Quotation state
  const [quotationNumber, setQuotationNumber] = useState(`Q-2024-${String(savedQuotations.length + 1).padStart(3, '0')}`);
  const [quotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<"draft" | "sent" | "approved" | "confirmed" | "rejected">("draft");
  const [referenceClientName, setReferenceClientName] = useState("");
  
  // Share to Client Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMethod, setShareMethod] = useState<"whatsapp" | "email" | "sms" | "visit">("whatsapp");
  const [shareContactValue, setShareContactValue] = useState("");
  const [shareVisitDate, setShareVisitDate] = useState("");
  const [shareVisitTime, setShareVisitTime] = useState("");
  const [shareVisitNotes, setShareVisitNotes] = useState("");
  
  // Client info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientState, setClientState] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  
  // System configuration
  const [systemCategory, setSystemCategory] = useState("residential");
  const [systemCapacity, setSystemCapacity] = useState("3");
  const [panelBrand, setPanelBrand] = useState("Waaree");
  const [panelWattage, setPanelWattage] = useState("540");
  const [panelCount, setPanelCount] = useState("6");
  const [inverterBrand, setInverterBrand] = useState("Growatt");
  const [inverterCapacity, setInverterCapacity] = useState("3kW");
  const [structureType, setStructureType] = useState("Elevated - GI");
  const [floorHeight, setFloorHeight] = useState("1st Floor");
  const [systemConfigNotes, setSystemConfigNotes] = useState("");
  
  // Status filter for list view
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "sent" | "approved" | "confirmed" | "rejected" | "converted"
  >("all");
  const [listSearchQuery, setListSearchQuery] = useState("");
  
  // Materials
  const [materials, setMaterials] = useState<QuotationMaterial[]>(presetMaterials["residential-3"]);
  
  // Pricing
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstPercent, setGstPercent] = useState(13.8);
  const [govtSubsidy, setGovtSubsidy] = useState(78000);
  
  // Temporary vs Final Quotation amounts
  const [bankDocumentationAmount, setBankDocumentationAmount] = useState<number | null>(null);
  const [temporaryAmount, setTemporaryAmount] = useState<number | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [selectedExportType, setSelectedExportType] = useState<"temporary" | "final">("temporary");
  const [isExportChoiceOpen, setIsExportChoiceOpen] = useState(false);
  const [hideInternalCosts, setHideInternalCosts] = useState(true);
  
  // Payment Type (Cash, Loan, or Cash & Loan) - determines project timeline flow
  const [paymentType, setPaymentType] = useState<"cash" | "loan" | "cash-and-loan" | "">("");
  
  // Payment terms
  const [bookingAmount, setBookingAmount] = useState("20%");
  const [designApproval, setDesignApproval] = useState("30%");
  const [beforeDispatch, setBeforeDispatch] = useState("40%");
  const [postInstallation, setPostInstallation] = useState("10%");
  
  // Warranty
  const [panelProductWarranty, setPanelProductWarranty] = useState("12 Years");
  const [panelPerformanceWarranty, setPanelPerformanceWarranty] = useState("25 Years");
  const [inverterWarranty, setInverterWarranty] = useState("5 Years");
  const [structureWarranty, setStructureWarranty] = useState("10 Years");
  const [otherWarranty, setOtherWarranty] = useState("1 Year");
  
  // Notes / T&C
  const [notes, setNotes] = useState("• Installation includes complete wiring and commissioning\n• Net metering application assistance included\n• Free site survey and design consultation\n• AMC available after warranty period");
  
  // Terms & Conditions
  const [termsAndConditions, setTermsAndConditions] = useState("• Prices are subject to change without prior notice\n• All disputes subject to local jurisdiction\n• Payment terms must be adhered to as per agreement\n• Warranty is void in case of physical damage or improper handling");
  
  // Checklist items from Masters
  const { getQuotationChecklistItems } = useMasters();
  const checklistItems = getQuotationChecklistItems();
  const [selectedChecklistItems, setSelectedChecklistItems] = useState<string[]>(
    checklistItems.map(item => item.value)
  );
  
  // Section visibility toggles for preview/export
  const [sectionVisibility, setSectionVisibility] = useState({
    systemDetails: true,
    materials: true,
    hideAmounts: true, // Hide individual item amounts by default
    whatYouGet: true,
    paymentTerms: true,
    warranty: true,
    termsConditions: true,
  });
  
  // What You Get items
  const whatYouGet = [
    "Performance monitoring system",
    "Complete wiring and commissioning",
    "Net metering application assistance",
    "Free site survey and design consultation",
    "AMC available after warranty period"
  ];
  
  // Modals
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [templateName, setTemplateName] = useState("");
  
  // Visibility preset
  const [isSaveVisibilityPresetOpen, setIsSaveVisibilityPresetOpen] = useState(false);
  const [visibilityPresetName, setVisibilityPresetName] = useState("");
  
  // New material form
  const [newMaterial, setNewMaterial] = useState<Partial<QuotationMaterial>>({});

  // Calculations
  const systemCost = materials.reduce((sum, m) => sum + (m.quantity * m.rate), 0);
  const discountAmount = (systemCost * discountPercent) / 100;
  const afterDiscount = systemCost - discountAmount;
  const gstAmount = (afterDiscount * gstPercent) / 100;
  const netPrice = afterDiscount + gstAmount;
  const effectivePrice = netPrice - govtSubsidy;

  // Validation errors
  const discountError = discountAmount > systemCost ? "Discount cannot be higher than total cost" : "";
  const totalError = effectivePrice < 0 ? "Total cost cannot be negative" : "";

  // Reset form
  const resetForm = () => {
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setClientCity("");
    setClientState("");
    setSystemCategory("residential");
    setSystemCapacity("3");
    setPanelBrand("Waaree");
    setPanelWattage("540");
    setPanelCount("6");
    setInverterBrand("Growatt");
    setInverterCapacity("3kW");
    setStructureType("Elevated - GI");
    setFloorHeight("1st Floor");
    setReferenceClientName("");
    setSystemConfigNotes("");
    setMaterials(presetMaterials["residential-3"]);
    setDiscountPercent(0);
    setGstPercent(13.8);
    setGovtSubsidy(78000);
    setStatus("draft");
    setActiveTab("create");
    setQuotationNumber(`Q-2024-${String(savedQuotations.length + 1).padStart(3, '0')}`);
    // Reset payment type
    setPaymentType("");
    setBankDocumentationAmount(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has("create")) return;
    resetForm();
    setEditingQuotationId(null);
    setCurrentView("create");

    if (params.get("from") === "enquiry") {
      const client = params.get("client");
      if (client) setClientName(decodeURIComponent(client));
      const phone = params.get("phone");
      if (phone) setClientPhone(decodeURIComponent(phone));
      const address = params.get("address");
      if (address) {
        setSystemConfigNotes(`Address (from enquiry): ${decodeURIComponent(address)}`);
      }
      const capacity = params.get("capacity");
      if (capacity) {
        const raw = decodeURIComponent(capacity).replace(/[^\d.]/g, "");
        if (raw) setSystemCapacity(raw);
      }
      const aid = params.get("agentId");
      if (aid) setAgentId(aid);
      const cid = params.get("customerId");
      if (cid) setCustomerId(cid);
    }

    navigate("/quotations", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when search signals create/enquiry once
  }, [location.search, navigate]);

  // Open save amounts confirmation modal
  const handleOpenSaveAmounts = (quotation: Quotation) => {
    setSaveAmountsQuotationId(quotation.id);
    setSaveAmountTemp(quotation.temporaryAmount || quotation.totalAmount);
    setSaveAmountFinal(quotation.finalAmount || quotation.totalAmount);
    setIsSaveAmountsOpen(true);
  };

  // Confirm save amounts
  const handleConfirmSaveAmounts = async () => {
    if (!saveAmountsQuotationId) {
      setIsSaveAmountsOpen(false);
      return;
    }
    const ur = await updateQuotation(saveAmountsQuotationId, {
      temporaryAmount: saveAmountTemp,
      finalAmount: saveAmountFinal,
      totalAmount: saveAmountFinal || saveAmountTemp,
    });
    if (!ur.ok) {
      toast({ title: "Could not save amounts", description: ur.error ?? "Command failed", variant: "destructive" });
      return;
    }
    toast({ title: "Amounts Saved", description: "Quotation amounts have been updated" });
    setIsSaveAmountsOpen(false);
    setSaveAmountsQuotationId(null);
  };

  const listStatusCounts = useMemo(() => {
    const all = savedQuotations;
    return {
      total: all.length,
      draft: all.filter((q) => q.status === "draft").length,
      sent: all.filter((q) => q.status === "sent").length,
      approved: all.filter((q) => q.status === "approved").length,
      rejected: all.filter((q) => q.status === "rejected").length,
      converted: all.filter((q) => q.isConverted).length,
    };
  }, [savedQuotations]);

  // Filter quotations (solar only) by status + list search
  const displayedQuotations = savedQuotations.filter((q) => {
    const qsearch = listSearchQuery.trim().toLowerCase();
    if (qsearch) {
      const ref = (q.quotationNumber || "").toLowerCase();
      const client = (q.clientName || "").toLowerCase();
      const phone = (q.clientPhone || "").replace(/\s/g, "");
      if (!ref.includes(qsearch) && !client.includes(qsearch) && !phone.includes(qsearch.replace(/\s/g, ""))) {
        return false;
      }
    }
    if (statusFilter === "all") return true;
    if (statusFilter === "converted") return q.isConverted;
    return q.status === statusFilter;
  });
  const listTotalPages = Math.max(1, Math.ceil(displayedQuotations.length / listPageSize) || 1);
  const safeListPage = Math.min(listPage, listTotalPages);
  const pagedQuotations = displayedQuotations.slice(
    (safeListPage - 1) * listPageSize,
    safeListPage * listPageSize
  );

  const convertedClients = useMemo(() => savedQuotations.filter((q) => q.isConverted), [savedQuotations]);
  const { pagedItems: pagedClients, safePage: safeClientPage } = usePagedSlice(convertedClients, clientPage, clientPageSize);

  useEffect(() => {
    setListPage((p) => Math.min(p, listTotalPages));
  }, [listTotalPages]);

  useEffect(() => {
    setClientPage(1);
  }, [convertedClients.length]);

  // Load preset when category/capacity changes
  const handlePresetChange = (category: string, capacity: string) => {
    const key = `${category}-${capacity}`;
    if (presetMaterials[key]) {
      setMaterials(presetMaterials[key]);
      
      // Update system config based on preset
      if (category === "residential" && capacity === "3") {
        setPanelWattage("540");
        setPanelCount("6");
        setInverterCapacity("3kW");
        setGovtSubsidy(78000);
      } else if (category === "commercial" && capacity === "20") {
        setPanelWattage("550");
        setPanelCount("36");
        setInverterCapacity("20kW");
        setGovtSubsidy(0);
      } else if (category === "industrial" && capacity === "100") {
        setPanelWattage("550");
        setPanelCount("182");
        setInverterCapacity("100kW");
        setGovtSubsidy(0);
      }
    }
  };

  const handleCategoryChange = (value: string) => {
    setSystemCategory(value);
    // Set default capacity for category
    if (value === "residential") {
      setSystemCapacity("3");
      handlePresetChange(value, "3");
    } else if (value === "commercial") {
      setSystemCapacity("20");
      handlePresetChange(value, "20");
    } else if (value === "industrial") {
      setSystemCapacity("100");
      handlePresetChange(value, "100");
    }
  };

  const handleCapacityChange = (value: string) => {
    setSystemCapacity(value);
    handlePresetChange(systemCategory, value);
  };

  const handleAddMaterial = () => {
    if (newMaterial.itemName && newMaterial.quantity && newMaterial.rate) {
      setMaterials([...materials, {
        id: Date.now(),
        category: newMaterial.category || "Others",
        itemName: newMaterial.itemName,
        description: newMaterial.description || "",
        size: newMaterial.size || "-",
        quantity: newMaterial.quantity,
        rate: newMaterial.rate,
        unit: newMaterial.unit || "pcs",
      }]);
      setNewMaterial({});
      setIsAddMaterialOpen(false);
    }
  };

  const handleMaterialDescriptionChange = (id: number, description: string) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, description } : m));
  };

  const handleRemoveMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleQuantityChange = (id: number, qty: number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, quantity: qty } : m));
  };

  const handleRateChange = (id: number, rate: number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, rate: rate } : m));
  };

  const handleSaveQuotation = async () => {
    if (!clientName) {
      toast({ title: "Error", description: "Please enter client name", variant: "destructive" });
      return;
    }
    if (discountError || totalError) {
      toast({ title: "Error", description: "Please fix validation errors", variant: "destructive" });
      return;
    }

    // Phase 2 CRM Pipeline: Ensure a Customer exists before creating Quotation
    let currentCustomerId = customerId || "";
    
    if (!currentCustomerId) {
      const existingCustomer = customers.find(c => 
        c.name.toLowerCase() === clientName.toLowerCase() && 
        (c.phone === clientPhone || !clientPhone)
      );
      
      if (existingCustomer) {
        currentCustomerId = existingCustomer.id;
      } else {
        currentCustomerId = generateId("C");
        addCustomer({
          id: currentCustomerId,
          name: clientName,
          phone: clientPhone || "",
          email: clientEmail,
          address: [clientCity, clientState].filter(Boolean).join(", "),
          createdAt: new Date().toISOString().split('T')[0],
          type: "individual",
          itemsBought: [],
          totalPurchases: 0,
        });
      }
    }

    const quotationData: Omit<Quotation, 'id'> = {
      quotationNumber,
      status: "draft",
      quotationType: "solar", // Default to solar for existing flow
      clientName,
      clientPhone,
      clientEmail,
      clientCity,
      clientState,
      systemCategory: systemCategory as "residential" | "commercial" | "industrial",
      systemCapacity,
      paymentType: paymentType,
      clientAgreedAmount: effectivePrice,
      bankDocumentationAmount: paymentType === "loan" ? (bankDocumentationAmount || effectivePrice) : undefined,
      temporaryAmount: effectivePrice,
      finalAmount: effectivePrice,
      totalAmount: effectivePrice,
      isConverted: false,
      customerId: currentCustomerId,
      agentId: agentId || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };

    if (editingQuotationId) {
      const ur = await updateQuotation(editingQuotationId, quotationData);
      if (!ur.ok) {
        toast({ title: "Could not update quotation", description: ur.error ?? "Command failed", variant: "destructive" });
        return;
      }
      toast({ title: "Quotation Updated", description: `${quotationNumber} has been updated` });
    } else {
      const r = await addQuotation({ ...quotationData, id: generateId("Q") });
      if (!r.ok) {
        toast({ title: "Could not save quotation", description: r.error ?? "Command failed", variant: "destructive" });
        return;
      }
      toast({ title: "Quotation Saved", description: `${quotationNumber} has been saved as draft` });
    }

    setCurrentView("list");
    resetForm();
  };

  const handleSaveAsTemplate = () => {
    if (!templateName) {
      toast({ title: "Error", description: "Please enter template name", variant: "destructive" });
      return;
    }
    // In real implementation, save to presets
    toast({ title: "Template Saved", description: `"${templateName}" has been saved to presets` });
    setIsSaveTemplateOpen(false);
    setTemplateName("");
  };

  const handleExportPDF = async () => {
    if (!quotationRef.current) return;
    
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(quotationRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quotation_${quotationNumber}_${clientName.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "PDF Exported",
        description: "Quotation has been saved as PDF"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF",
        variant: "destructive"
      });
    }
    setIsExportingPdf(false);
  };

  const handleSendToClient = async () => {
    const currentQuotation = savedQuotations.find(q => q.quotationNumber === quotationNumber);
    if (currentQuotation) {
      const result = await transitionQuotationStatus(currentQuotation.id, "sent");
      if (!result.ok) {
        toast({ title: "Cannot Send Quotation", description: result.error || "Validation failed", variant: "destructive" });
        return;
      }
    }
    setStatus("sent");
    setIsSendConfirmOpen(false);
    toast({
      title: "Quotation Sent",
      description: `Quotation sent to ${clientName}`
    });
  };

  // Handle Share to Client
  const handleOpenShareModal = () => {
    // Pre-fill with client details
    if (clientPhone) setShareContactValue(clientPhone);
    else if (clientEmail) setShareContactValue(clientEmail);
    setIsShareModalOpen(true);
  };

  const handleConfirmShare = async () => {
    const currentQuotation = savedQuotations.find(q => q.quotationNumber === quotationNumber);
    if (!currentQuotation && !editingQuotationId) {
      toast({ title: "Error", description: "Please save the quotation first", variant: "destructive" });
      return;
    }

    const shareEntry = {
      method: shareMethod,
      contactValue: shareMethod !== "visit" ? shareContactValue : undefined,
      sentAt: new Date().toISOString(),
      visitDate: shareMethod === "visit" ? shareVisitDate : undefined,
      visitTime: shareMethod === "visit" ? shareVisitTime : undefined,
      visitNotes: shareMethod === "visit" ? shareVisitNotes : undefined,
    };

    const quotationId = editingQuotationId || currentQuotation?.id;
    if (quotationId) {
      const existingHistory = currentQuotation?.shareHistory || [];
      const result = await transitionQuotationStatus(quotationId, "sent");
      if (!result.ok) {
        toast({ title: "Cannot Share Quotation", description: result.error || "Validation failed", variant: "destructive" });
        return;
      }
      const ur = await updateQuotation(quotationId, {
        shareHistory: [...existingHistory, shareEntry],
      });
      if (!ur.ok) {
        toast({ title: "Could not record share", description: ur.error ?? "Command failed", variant: "destructive" });
        return;
      }
      setStatus("sent");
    }

    const methodLabels = {
      whatsapp: "WhatsApp",
      email: "Email",
      sms: "SMS",
      visit: "In-Person Visit",
    };

    toast({
      title: "Quotation Shared",
      description: `Quotation ${shareMethod === "visit" ? "marked as sent via" : "shared via"} ${methodLabels[shareMethod]}`,
    });

    // Reset share modal state
    setIsShareModalOpen(false);
    setShareMethod("whatsapp");
    setShareContactValue("");
    setShareVisitDate("");
    setShareVisitTime("");
    setShareVisitNotes("");
  };

  const handleMarkAsRejected = async (quotationId: string) => {
    const result = await transitionQuotationStatus(quotationId, "rejected");
    if (!result.ok) {
      toast({ title: "Invalid Transition", description: result.error || "Status change not allowed", variant: "destructive" });
      return;
    }
    toast({ title: "Status Updated", description: "Quotation marked as rejected" });
  };

  const handleMarkAsApproved = async (quotationId: string) => {
    const result = await transitionQuotationStatus(quotationId, "approved");
    if (!result.ok) {
      toast({ title: "Cannot approve quotation", description: result.error || "Status change not allowed", variant: "destructive" });
      return;
    }
    if (editingQuotationId === quotationId) {
      setStatus("approved");
    }
    toast({ title: "Status Updated", description: "Quotation marked as approved" });
  };

  const handleConvertToClient = async (quotationId: string) => {
    const approvedResult = await transitionQuotationStatus(quotationId, "approved");
    if (!approvedResult.ok) {
      toast({ title: "Invalid Transition", description: approvedResult.error || "Could not approve quotation", variant: "destructive" });
      return;
    }

    const confirmResult = await transitionQuotationStatus(quotationId, "confirmed");
    if (!confirmResult.ok) {
      toast({ title: "Confirmation Required", description: confirmResult.error || "Could not confirm quotation", variant: "destructive" });
      return;
    }

    const ur = await updateQuotation(quotationId, {
      isConverted: true,
      approvedAt: new Date().toISOString().split("T")[0],
      confirmedAt: new Date().toISOString().split("T")[0],
    });
    if (!ur.ok) {
      toast({ title: "Could not update quotation", description: ur.error ?? "Command failed", variant: "destructive" });
      return;
    }
    toast({ title: "Client Converted", description: "Lead has been converted to client" });
  };

  const handleDeleteQuotation = (quotation: Quotation) => {
    // Check for related entities
    const relatedEntities: {type: string; id: string; name: string}[] = [];
    
    // Check if converted to project
    if (quotation.convertedToProjectId) {
      relatedEntities.push({
        type: "project",
        id: quotation.convertedToProjectId,
        name: `Project from ${quotation.quotationNumber}`
      });
    }
    
    // Check for related invoices (would need invoice context in full impl)
    // For now, we check if quotation is linked to any known entities
    
    if (relatedEntities.length > 0) {
      // Has relations - show deletion request modal
      setQuotationToDelete(quotation);
      setDeleteHasRelations(true);
      setDeleteRelatedEntities(relatedEntities);
      setDeleteReason("");
      setIsDeleteConfirmOpen(true);
    } else {
      // No relations - show simple confirmation
      setQuotationToDelete(quotation);
      setDeleteHasRelations(false);
      setDeleteRelatedEntities([]);
      setDeleteReason("");
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDeleteQuotation = () => {
    if (!quotationToDelete) return;
    
    if (deleteHasRelations && !deleteReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for deletion",
        variant: "destructive"
      });
      return;
    }
    
    // If has relations, this would go to Super Admin approval queue
    // For now, we show a toast about the request
    if (deleteHasRelations) {
      toast({
        title: "Deletion Request Submitted",
        description: "Your request has been sent to Super Admin for approval"
      });
    } else {
      // Direct delete for quotations without relations
      deleteQuotation(quotationToDelete.id);
      toast({ title: "Quotation Deleted", description: "Quotation has been permanently removed" });
    }
    
    setIsDeleteConfirmOpen(false);
    setQuotationToDelete(null);
    setDeleteReason("");
  };

  const handleCreateInvoice = (quotation: Quotation) => {
    // Use bankDocumentationAmount for loan files, otherwise clientAgreedAmount or totalAmount
    const invoiceAmount = quotation.paymentType === "loan" && quotation.bankDocumentationAmount
      ? quotation.bankDocumentationAmount
      : (quotation.clientAgreedAmount || quotation.totalAmount);
    
    navigate(`/invoices?from=quotation&client=${encodeURIComponent(quotation.clientName)}&amount=${invoiceAmount}&quotationId=${quotation.id}&paymentType=${quotation.paymentType || ""}`);
  };

  // Create Project from Quotation
  const handleCreateProject = (quotation: Quotation) => {
    setSelectedQuotationForProject(quotation);
    setProjectAmountType(quotation.finalAmount ? "final" : "temporary");
    setIsCreateProjectOpen(true);
  };

  const confirmCreateProject = async () => {
    if (!selectedQuotationForProject) return;
    if (selectedQuotationForProject.status !== "confirmed") {
      toast({
        title: "Confirmed Quotation Required",
        description: "Projects can only be created from confirmed quotations.",
        variant: "destructive",
      });
      return;
    }

    const projectKind = quotationProjectKind;

    if ((projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK") && !qPartnerIdForProject) {
      toast({
        title: "Partner required",
        description: "Select the one partner linked to this project.",
        variant: "destructive",
      });
      return;
    }
    if (projectKind === "FIXED_EPC" && (!qFixedBackend || !qFixedSell)) {
      toast({
        title: "Fixed EPC numbers required",
        description: "Enter MSS backend and partner sell amounts.",
        variant: "destructive",
      });
      return;
    }
    if (projectKind === "VENDOR_NETWORK" && !qVendorshipFee) {
      toast({
        title: "Vendorship fee required",
        description: "Enter the fixed fee payable by the partner.",
        variant: "destructive",
      });
      return;
    }

    // Use clientAgreedAmount if available, otherwise fall back to legacy amount handling
    const amount = selectedQuotationForProject.clientAgreedAmount
      ? selectedQuotationForProject.clientAgreedAmount
      : projectAmountType === "final"
        ? (selectedQuotationForProject.finalAmount || selectedQuotationForProject.totalAmount)
        : (selectedQuotationForProject.temporaryAmount || selectedQuotationForProject.totalAmount);

    const pRow = qPartnerIdForProject ? partners.find((p) => p.id === qPartnerIdForProject) : undefined;

    const intakePayload: ProjectIntakePayload = {
      kind: projectKind,
      parties: {
        customer: selectedQuotationForProject.clientName || "Unknown Customer",
        vendorOrDiscom: projectKind === "SOLO_EPC" ? "TBD_VENDOR_DISCOM" : undefined,
        partner: projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK" ? pRow?.name || qPartnerIdForProject : undefined,
        channelPartner: projectKind === "VENDOR_NETWORK" ? pRow?.name || qChannel || qPartnerIdForProject : undefined,
        externalNetwork: projectKind === "VENDOR_NETWORK" ? qExternal || pRow?.name || qPartnerIdForProject : undefined,
      },
      commercial: {
        contractAmount: amount,
        paymentType: selectedQuotationForProject.paymentType || "cash",
        internalCostEstimate: projectKind === "SOLO_EPC" || projectKind === "PARTNER_EPC" ? 0 : 0,
        backendPrice: projectKind === "FIXED_EPC" ? parseFloat(qFixedBackend) : undefined,
        partnerSellPrice: projectKind === "FIXED_EPC" ? parseFloat(qFixedSell) : undefined,
        commissionRule: projectKind === "VENDOR_NETWORK" ? "default_commission_rule" : undefined,
      },
    };

    const intakeValidation = projectKindService.validateIntake(intakePayload);
    if (!intakeValidation.ok) {
      toast({
        title: "Project Intake Incomplete",
        description: intakeValidation.errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    const snap = projectKindConfigSnapshot(projectKind);
    const newProjectId = generateId("P");
    const newProject: Project = {
      id: newProjectId,
      customerId: selectedQuotationForProject.customerId || "C-unknown",
      lifecycleStatus: "Active",
      executionPhase: "execution",
      projectKind,
      projectKindConfigSnapshot: snap,
      name: `${selectedQuotationForProject.clientName} ${selectedQuotationForProject.systemCapacity}kW`,
      type: projectKind === "INC" ? "INC" : "EPC",
      projectType:
        selectedQuotationForProject.systemCategory === "residential"
          ? "Residential"
          : selectedQuotationForProject.systemCategory === "commercial"
            ? "Commercial"
            : "Industrial",
      projectCategory: "solar",
      ownerType:
        projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK"
          ? "partnership"
          : "solo",
      status: "Ongoing",
      progressStage: "work-in-progress",
      client: selectedQuotationForProject.clientName,
      clientAddress: selectedQuotationForProject.clientAddress || `${selectedQuotationForProject.clientCity}, ${selectedQuotationForProject.clientState}`,
      clientPhone: selectedQuotationForProject.clientPhone,
      clientEmail: selectedQuotationForProject.clientEmail,
      capacity: `${selectedQuotationForProject.systemCapacity} kW`,
      location: `${selectedQuotationForProject.clientCity}, ${selectedQuotationForProject.clientState}`,
      onSite: 0,
      assignees: [],
      contractAmount: amount,
      totalCost: 0,
      amountReceived: 0,
      paymentType: selectedQuotationForProject.paymentType || "",
      bankDocumentationAmount:
        selectedQuotationForProject.paymentType === "loan" ? selectedQuotationForProject.bankDocumentationAmount : undefined,
      quotationId: selectedQuotationForProject.id,
      quotationType: projectAmountType,
      photos: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      createdAt: new Date().toISOString().split("T")[0],
      ...(pRow && (projectKind === "PARTNER_EPC" || projectKind === "FIXED_EPC" || projectKind === "VENDOR_NETWORK")
        ? {
            partners: [
              {
                partnerId: pRow.id,
                partnerName: pRow.name,
                partnerType:
                  projectKind === "FIXED_EPC"
                    ? ("fixed" as const)
                    : projectKind === "VENDOR_NETWORK"
                      ? ("vendorship" as const)
                      : ("profit" as const),
                sharePercentage: projectKind === "PARTNER_EPC" ? parseFloat(qProfitSharePercent || "0") : undefined,
                fixedAmount:
                  projectKind === "FIXED_EPC"
                    ? Math.max(0, (parseFloat(qFixedSell) || amount) - (parseFloat(qFixedBackend) || 0))
                    : undefined,
                feeAmount: projectKind === "VENDOR_NETWORK" ? parseFloat(qVendorshipFee || "0") : undefined,
                calculatedEarning:
                  projectKind === "FIXED_EPC"
                    ? Math.max(0, (parseFloat(qFixedSell) || amount) - (parseFloat(qFixedBackend) || 0))
                    : projectKind === "VENDOR_NETWORK"
                      ? 0
                      : undefined,
                settlementDirection: projectKind === "VENDOR_NETWORK" ? "partner_pays_company" : "company_pays_partner",
                investmentPercent: 0,
                profitSharePercent: projectKind === "PARTNER_EPC" ? parseFloat(qProfitSharePercent || "0") : 0,
                investedAmount: 0,
                partnershipModel: projectKind === "FIXED_EPC" ? ("fixed_backend" as const) : ("profit_share" as const),
                ...(projectKind === "FIXED_EPC" && {
                  customerContractAmount: amount,
                  mssFixedOrBackendAmount: parseFloat(qFixedBackend) || 0,
                  partnerPassThroughOrMargin: Math.max(0, (parseFloat(qFixedSell) || amount) - (parseFloat(qFixedBackend) || 0)),
                }),
              },
            ],
            totalPartnerInvestment: 0,
            partnershipModel: projectKind === "FIXED_EPC" ? ("fixed_backend" as const) : undefined,
            mssBackendAmount: projectKind === "FIXED_EPC" ? parseFloat(qFixedBackend) : undefined,
            partnerCustomerSellAmount: projectKind === "FIXED_EPC" ? parseFloat(qFixedSell) : undefined,
          }
        : {}),
      ...(projectKind === "VENDOR_NETWORK"
        ? {
            partyName: pRow?.name || qChannel,
            partyContact: "",
            contractValue: amount,
            amountToParty: 0,
            partyPayments: [],
            channelPartnerIdRef: pRow?.id,
            vendorNetworkCommissionType: "flat" as const,
            vendorNetworkFlatFee: parseFloat(qVendorshipFee || "0"),
          }
        : {}),
    };

    const created = await createProjectIntake({
      project: newProject,
      intake: intakePayload,
      quotationId: selectedQuotationForProject.id,
    });
    if (!created.ok) {
      toast({
        title: "Project creation failed",
        description: created.error ?? "Command failed",
        variant: "destructive",
      });
      return;
    }
    const navigateId = created.projectId ?? newProjectId;

    toast({
      title: "Project Created",
      description: `Project "${newProject.name}" has been created from quotation${selectedQuotationForProject.paymentType ? ` (${selectedQuotationForProject.paymentType === "loan" ? "Loan" : "Cash"} file)` : ""}`,
    });
    setIsCreateProjectOpen(false);
    setSelectedQuotationForProject(null);
    setQuotationProjectKind("SOLO_EPC");
    setQPartnerIdForProject("");
    setQProfitSharePercent("30");
    setQVendorshipFee("");
    setQFixedBackend("");
    setQFixedSell("");
    setQChannel("");
    setQExternal("");
    navigate(`/projects/${navigateId}`);
  };

  const handleEditQuotation = async (quotation: Quotation) => {
    const sourceQuotationNumber = quotation.quotationNumber;
    if (quotation.status === "sent" || quotation.status === "rejected") {
      const reviseResult = await reviseQuotation(quotation.id);
      if (!reviseResult.ok || !reviseResult.revisedQuotationId) {
        toast({
          title: "Revision Not Allowed",
          description: reviseResult.error || "Unable to create revision draft",
          variant: "destructive",
        });
        return;
      }

      quotation = {
        ...quotation,
        id: reviseResult.revisedQuotationId,
        quotationNumber: `${sourceQuotationNumber}-R1`,
        status: "draft",
        isConverted: false,
      };
      toast({
        title: "Draft Revision Created",
        description: `Created ${quotation.quotationNumber} from ${sourceQuotationNumber}`,
      });
    }

    if (quotation.status === "approved" || quotation.status === "confirmed") {
      toast({
        title: "Quotation Locked",
        description: "Approved/confirmed quotations are locked. Create a revision via Super Admin override flow.",
        variant: "destructive",
      });
      return;
    }

    setEditingQuotationId(quotation.id);
    setQuotationNumber(quotation.quotationNumber);
    setClientName(quotation.clientName);
    setClientPhone(quotation.clientPhone);
    setClientEmail(quotation.clientEmail);
    setClientCity(quotation.clientCity);
    setClientState(quotation.clientState);
    setSystemCategory(quotation.systemCategory);
    setSystemCapacity(quotation.systemCapacity);
    setStatus(quotation.status);
    handlePresetChange(quotation.systemCategory, quotation.systemCapacity);
    setCurrentView("edit");
    setActiveTab("create");
  };

  const handleCreateNew = () => {
    resetForm();
    setEditingQuotationId(null);
    setCurrentView("create");
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "draft": return "bg-amber-500/10 text-amber-600";
      case "sent": return "bg-blue-500/10 text-blue-600";
      case "approved": return "bg-primary/10 text-primary";
      case "confirmed": return "bg-blue-500/10 text-blue-600";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // List View
  if (currentView === "list") {
    return (
      <div className="space-y-6 min-h-[calc(100vh-140px)]">
        <StickyPageHeader
          breadcrumbs={[
            { label: "Home", to: "/" },
            { label: "Sales" },
            { label: "Quotations" },
          ]}
          subRow={
            <>
              <div className="flex min-w-0 w-full flex-1 flex-wrap items-end gap-2 sm:max-w-none">
                <Input
                  placeholder="Reference, customer, or phone"
                  className="h-9 max-w-full bg-muted/40 sm:max-w-[220px] md:max-w-xs"
                  value={listSearchQuery}
                  onChange={(e) => {
                    setListSearchQuery(e.target.value);
                    setListPage(1);
                  }}
                />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as typeof statusFilter);
                    setListPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[min(100%,160px)]">
                    <SelectValue placeholder="All status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <InlineKpiStrip
                className="w-full sm:w-auto sm:justify-end"
                items={[
                  {
                    label: "Total",
                    value: listStatusCounts.total,
                    active: statusFilter === "all",
                    onClick: () => {
                      setStatusFilter("all");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Draft",
                    value: listStatusCounts.draft,
                    active: statusFilter === "draft",
                    onClick: () => {
                      setStatusFilter("draft");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Sent",
                    value: listStatusCounts.sent,
                    active: statusFilter === "sent",
                    onClick: () => {
                      setStatusFilter("sent");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Approved",
                    value: listStatusCounts.approved,
                    active: statusFilter === "approved",
                    onClick: () => {
                      setStatusFilter("approved");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Rejected",
                    value: listStatusCounts.rejected,
                    active: statusFilter === "rejected",
                    onClick: () => {
                      setStatusFilter("rejected");
                      setListPage(1);
                    },
                  },
                  {
                    label: "Converted",
                    value: listStatusCounts.converted,
                    active: statusFilter === "converted",
                    onClick: () => {
                      setStatusFilter("converted");
                      setListPage(1);
                    },
                  },
                ]}
              />
            </>
          }
        >
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={() => {
              resetForm();
              setEditingQuotationId(null);
              setCurrentView("create");
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New quotation
          </Button>
        </StickyPageHeader>

        <DataTableShell
              maxHeight={listTableViewportMaxHeight(listPageSize)}
              scrollResetKey={`${safeListPage}-${listPageSize}-${displayedQuotations.length}`}
              footer={
                <TablePaginationBar
                  page={safeListPage}
                  pageSize={listPageSize}
                  total={displayedQuotations.length}
                  onPageChange={setListPage}
                  onPageSizeChange={(n) => {
                    setListPageSize(n);
                    setListPage(1);
                  }}
                />
              }
            >
              <TableHeader>
                <TableRow className={dataTableClasses.headRow}>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>System</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedQuotations.map((quotation) => (
                  <TableRow
                    key={quotation.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditQuotation(quotation)}
                  >
                    <TableCell className="font-medium text-primary">{quotation.quotationNumber}</TableCell>
                    <TableCell>
                      <EntityLink entityType="customer" entityId={quotation.id} name={quotation.clientName} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{quotation.clientPhone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {quotation.systemCategory} {quotation.systemCapacity}kW
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-primary">₹{quotation.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{quotation.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${getStatusColor(quotation.status)} border-0 capitalize`}>
                          {quotation.status}
                        </Badge>
                        {quotation.convertedToProjectId && (
                          <Badge 
                            variant="outline" 
                            className="bg-blue-500/10 text-blue-600 border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${quotation.convertedToProjectId}`);
                            }}
                          >
                            <Briefcase className="h-3 w-3 mr-1" />
                            Project
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border">
                          <DropdownMenuItem onClick={() => handleEditQuotation(quotation)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View / Edit
                          </DropdownMenuItem>
                          {/* Mark as Approved - for non-approved, non-rejected quotations */}
                          {quotation.status !== "approved" && quotation.status !== "rejected" && (
                            <DropdownMenuItem onClick={() => { void handleMarkAsApproved(quotation.id); }}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark as Approved
                            </DropdownMenuItem>
                          )}
                          {/* Mark as Rejected - only for non-rejected, non-approved quotations */}
                          {quotation.status !== "rejected" && quotation.status !== "approved" && (
                            <DropdownMenuItem onClick={() => handleMarkAsRejected(quotation.id)}>
                              <X className="h-4 w-4 mr-2" />
                              Mark as Rejected
                            </DropdownMenuItem>
                          )}
                          {/* Create Project - for approved quotations NOT yet converted */}
                          {quotation.status === "approved" && !quotation.convertedToProjectId && (
                            <DropdownMenuItem onClick={() => handleCreateProject(quotation)}>
                              <Briefcase className="h-4 w-4 mr-2" />
                              Create Project
                            </DropdownMenuItem>
                          )}
                          {quotation.status === "approved" && (
                            <DropdownMenuItem onClick={() => handleCreateInvoice(quotation)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Create Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteQuotation(quotation)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </DataTableShell>

        {/* Clients Section */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Converted Clients ({convertedClients.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagedClients.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No clients yet. Convert leads from quotations above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell>{client.clientPhone}</TableCell>
                      <TableCell className="text-muted-foreground">{client.clientEmail}</TableCell>
                      <TableCell>{client.clientCity}, {client.clientState}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {client.systemCategory} {client.systemCapacity}kW
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEditQuotation(client)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Save Amounts Confirmation Modal */}
        <Sheet open={isSaveAmountsOpen} onOpenChange={setIsSaveAmountsOpen}>
          <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
            <SheetHeader>
              <SheetTitle>Save Quotation Amounts</SheetTitle>
              <SheetDescription>
                Update the temporary and final amounts for this quotation.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Temporary Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={saveAmountTemp} 
                  onChange={(e) => setSaveAmountTemp(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Final Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={saveAmountFinal} 
                  onChange={(e) => setSaveAmountFinal(parseFloat(e.target.value) || 0)} 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsSaveAmountsOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirmSaveAmounts}>
                <Save className="h-4 w-4 mr-2" />
                Save Amounts
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }


  // Create/Edit Solar Quotation View
  return (
    <PageShell className="min-h-[calc(100vh-140px)] space-y-6">
      <StickyPageHeader
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Quotations", to: "/quotations" },
          { label: currentView === "edit" ? `Edit ${quotationNumber}` : "New" },
        ]}
      >
        <Button variant="outline" size="sm" onClick={() => { setCurrentView("list"); resetForm(); }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Badge className={`${getStatusColor(status)} border-0 capitalize`}>{status}</Badge>
      </StickyPageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create/Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client & System */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Reference</Label>
                    <Input 
                      value={referenceClientName} 
                      onChange={(e) => setReferenceClientName(e.target.value)} 
                      placeholder="Reference name (auto-filled if from project)"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Client Name *</Label>
                      {customerId && (
                        <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/20 py-0 h-4">
                          Linked: {customerId}
                        </Badge>
                      )}
                    </div>
                    <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={clientCity} onChange={(e) => setClientCity(e.target.value)} placeholder="City" />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={clientState} onChange={(e) => setClientState(e.target.value)} placeholder="State" />
                  </div>
                  <div className="space-y-2">
                    <Label>Referred By (Agent)</Label>
                    <Select value={agentId} onValueChange={setAgentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="No Agent / Direct" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / Direct</SelectItem>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* System Configuration */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">System Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preset Selector */}
                  <div className="space-y-2 pb-4 border-b">
                    <Label>Select Preset (Optional)</Label>
                    <Select 
                      value="" 
                      onValueChange={(presetId) => {
                        const preset = inventoryPresets.find(p => p.id === presetId);
                        if (preset && preset.presetType === "quotation") {
                          // Auto-populate materials from preset
                          const presetMaterials = preset.items.map((item, idx) => ({
                            id: idx + 1,
                            category: "Material",
                            itemName: item.name,
                            size: "",
                            quantity: item.quantity,
                            rate: 0, // Rate will be set manually or from inventory lookup
                            unit: item.unit,
                          }));
                          setMaterials(presetMaterials);
                          toast({
                            title: "Preset Applied",
                            description: `"${preset.name}" materials have been loaded`,
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Load materials from preset..." />
                      </SelectTrigger>
                      <SelectContent>
                        {inventoryPresets
                          .filter(p => p.presetType === "quotation")
                          .map(preset => (
                            <SelectItem key={preset.id} value={preset.id}>
                              {preset.name} ({preset.category})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select a preset to auto-populate materials list
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={systemCategory} onValueChange={handleCategoryChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="residential">Residential</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="industrial">Industrial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>System Capacity (kW)</Label>
                      <Select value={systemCapacity} onValueChange={handleCapacityChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {systemCategory === "residential" && (
                            <>
                              <SelectItem value="1">1 kW</SelectItem>
                              <SelectItem value="2">2 kW</SelectItem>
                              <SelectItem value="3">3 kW</SelectItem>
                              <SelectItem value="5">5 kW</SelectItem>
                            </>
                          )}
                          {systemCategory === "commercial" && (
                            <>
                              <SelectItem value="10">10 kW</SelectItem>
                              <SelectItem value="15">15 kW</SelectItem>
                              <SelectItem value="20">20 kW</SelectItem>
                              <SelectItem value="25">25 kW</SelectItem>
                            </>
                          )}
                          {systemCategory === "industrial" && (
                            <>
                              <SelectItem value="50">50 kW</SelectItem>
                              <SelectItem value="100">100 kW</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Panel Brand</Label>
                      <Input value={panelBrand} onChange={(e) => setPanelBrand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Wattage</Label>
                      <Input value={panelWattage} onChange={(e) => setPanelWattage(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Panel Count</Label>
                      <Input value={panelCount} onChange={(e) => setPanelCount(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Inverter Brand</Label>
                      <Input value={inverterBrand} onChange={(e) => setInverterBrand(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Inverter Capacity</Label>
                      <Input value={inverterCapacity} onChange={(e) => setInverterCapacity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Structure Type</Label>
                      <Input value={structureType} onChange={(e) => setStructureType(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Floor Height</Label>
                    <Input value={floorHeight} onChange={(e) => setFloorHeight(e.target.value)} />
                  </div>
                  
                  {/* System Configuration Notes */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>System Notes / Description</Label>
                    <Textarea 
                      value={systemConfigNotes} 
                      onChange={(e) => setSystemConfigNotes(e.target.value)} 
                      placeholder="Additional notes about the system configuration..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Type & Quotation Amounts - Unified */}
              <Card className="bg-card border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-primary" />
                    Payment Type & Quotation Amounts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Payment Type Toggle */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Payment Type *</Label>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Select how the client will pay. This determines the project timeline flow.
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          paymentType === "cash" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setPaymentType("cash");
                          setBankDocumentationAmount(null);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentType === "cash" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {paymentType === "cash" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-medium">💵 Cash</p>
                            <p className="text-xs text-muted-foreground">Full amount directly</p>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          paymentType === "loan" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setPaymentType("loan")}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentType === "loan" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {paymentType === "loan" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-medium">🏦 Loan</p>
                            <p className="text-xs text-muted-foreground">Bank finance</p>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          paymentType === "cash-and-loan" 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setPaymentType("cash-and-loan")}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            paymentType === "cash-and-loan" ? "border-primary" : "border-muted-foreground"
                          }`}>
                            {paymentType === "cash-and-loan" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                          <div>
                            <p className="font-medium">💵🏦 Combined</p>
                            <p className="text-xs text-muted-foreground">Cash + Bank</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!paymentType && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Please select a payment type before saving
                      </p>
                    )}
                  </div>
                  
                  {/* Conditional Amount Fields */}
                  {paymentType && (
                    <div className="space-y-4 pt-4 border-t animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* FOR LOAN: Bank Documentation Amount */}
                      {paymentType === "loan" && (
                        <div className="space-y-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                          <Label className="text-sm font-medium flex items-center gap-2">
                            <IndianRupee className="h-4 w-4 text-amber-600" />
                            Bank Documentation Amount *
                          </Label>
                          <Input 
                            type="number" 
                            placeholder={effectivePrice.toString()}
                            value={bankDocumentationAmount ?? ''}
                            onChange={(e) => setBankDocumentationAmount(e.target.value ? parseFloat(e.target.value) : null)}
                            className="text-right"
                          />
                          <p className="text-xs text-muted-foreground">Used for invoice & GST calculation (typically higher for loan approval)</p>
                          {bankDocumentationAmount && (
                            <div className="flex justify-between text-xs text-amber-600">
                              <span>GST on Bank Doc ({gstPercent}%):</span>
                              <span>₹{((bankDocumentationAmount * gstPercent) / 100).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Client Agreed Amount - Required for both */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Client Agreed Amount *</Label>
                        <Input 
                          type="number" 
                          placeholder={effectivePrice.toString()}
                          value={temporaryAmount ?? ''}
                          onChange={(e) => setTemporaryAmount(e.target.value ? parseFloat(e.target.value) : null)}
                          className="text-right"
                        />
                        <p className="text-xs text-muted-foreground">
                          {paymentType === "cash" 
                            ? "This is what the client pays - used for invoice"
                            : "What client will actually pay (finalized amount)"
                          }
                        </p>
                      </div>

                      {/* GST Difference Calculation (for Loan only) */}
                      {paymentType === "loan" && bankDocumentationAmount && temporaryAmount && (
                        <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                          <p className="text-sm font-medium">GST Difference (Our Cost)</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <span className="text-muted-foreground">Bank Doc GST ({gstPercent}%):</span>
                            <span className="text-right">₹{((bankDocumentationAmount * gstPercent) / 100).toLocaleString()}</span>
                            <span className="text-muted-foreground">Client Agreed GST ({gstPercent}%):</span>
                            <span className="text-right">₹{((temporaryAmount * gstPercent) / 100).toLocaleString()}</span>
                            <span className="text-muted-foreground font-medium border-t pt-1">GST Difference:</span>
                            <span className={`text-right font-medium border-t pt-1 ${(bankDocumentationAmount - temporaryAmount) >= 0 ? 'text-amber-600' : 'text-primary'}`}>
                              ₹{Math.abs(((bankDocumentationAmount - temporaryAmount) * gstPercent) / 100).toLocaleString()}
                              {bankDocumentationAmount > temporaryAmount ? " (Cost)" : " (Gain)"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Materials Table */}
              <Card className="bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Material Items</CardTitle>
                    <Button size="sm" onClick={() => setIsAddMaterialOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Size/Specs</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {materials.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          <TableRow>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell className="text-muted-foreground">{item.size}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                className="w-16 h-8 text-center" 
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                className="w-24 h-8 text-right" 
                                value={item.rate}
                                onChange={(e) => handleRateChange(item.id, parseFloat(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ₹{(item.quantity * item.rate).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveMaterial(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {/* Description row for each material */}
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8} className="py-2">
                              <Input 
                                placeholder="Add description for this item (optional)"
                                value={item.description || ""}
                                onChange={(e) => handleMaterialDescriptionChange(item.id, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* What You Get Section */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    What You Get
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {whatYouGet.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing & Terms */}
            <div className="space-y-6">
              {/* Price Breakdown */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Price Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">System Cost</span>
                    <span className="font-medium">₹{systemCost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Discount (%)</span>
                    <Input 
                      type="number" 
                      className={`w-20 h-8 text-right ${discountError ? 'border-destructive' : ''}`}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  {discountError && (
                    <p className="text-xs text-destructive">{discountError}</p>
                  )}
                  {discountAmount > 0 && !discountError && (
                    <div className="flex justify-between text-primary">
                      <span>Discount Amount</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">GST (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 h-8 text-right" 
                      value={gstPercent}
                      onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST Amount</span>
                    <span>₹{gstAmount.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Net Price (incl. GST)</span>
                    <span>₹{netPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Govt. Subsidy</span>
                    <Input 
                      type="number" 
                      className="w-28 h-8 text-right" 
                      value={govtSubsidy}
                      onChange={(e) => setGovtSubsidy(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <Separator />
                  <div className={`flex justify-between text-xl font-bold ${totalError ? 'text-destructive' : 'text-primary'}`}>
                    <span>Effective Price</span>
                    <span>₹{effectivePrice.toLocaleString()}</span>
                  </div>
                  {totalError && (
                    <p className="text-xs text-destructive">{totalError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Terms */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Payment Terms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Booking Amount</span>
                    <Input className="w-20 h-8 text-right" value={bookingAmount} onChange={(e) => setBookingAmount(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">On Design Approval</span>
                    <Input className="w-20 h-8 text-right" value={designApproval} onChange={(e) => setDesignApproval(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Before Material Dispatch</span>
                    <Input className="w-20 h-8 text-right" value={beforeDispatch} onChange={(e) => setBeforeDispatch(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Post Installation</span>
                    <Input className="w-20 h-8 text-right" value={postInstallation} onChange={(e) => setPostInstallation(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Warranty */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Warranty Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Panel Product</span>
                    <Input className="w-24 h-8 text-right" value={panelProductWarranty} onChange={(e) => setPanelProductWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Panel Performance</span>
                    <Input className="w-24 h-8 text-right" value={panelPerformanceWarranty} onChange={(e) => setPanelPerformanceWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Inverter</span>
                    <Input className="w-24 h-8 text-right" value={inverterWarranty} onChange={(e) => setInverterWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Structure</span>
                    <Input className="w-24 h-8 text-right" value={structureWarranty} onChange={(e) => setStructureWarranty(e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Other Components</span>
                    <Input className="w-24 h-8 text-right" value={otherWarranty} onChange={(e) => setOtherWarranty(e.target.value)} />
                  </div>
                </CardContent>
              </Card>

              {/* Section Visibility Toggles */}
              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Preview/Export Options</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsSaveVisibilityPresetOpen(true)}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save Preset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Load Preset Dropdown */}
                  {quotationVisibilityPresets.length > 0 && (
                    <div className="space-y-2 pb-3 border-b">
                      <Label className="text-xs text-muted-foreground">Load Preset</Label>
                      <Select onValueChange={(value) => {
                        const preset = quotationVisibilityPresets.find(p => p.id === value);
                        if (preset) {
                          setSectionVisibility(preset.visibility);
                          toast({ title: "Preset Loaded", description: `Applied "${preset.name}" preset` });
                        }
                      }}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select a preset..." />
                        </SelectTrigger>
                        <SelectContent>
                          {quotationVisibilityPresets.map((preset) => (
                            <SelectItem key={preset.id} value={preset.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{preset.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">Select sections to show in preview & export:</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.systemDetails} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, systemDetails: !!checked}))}
                      />
                      <span className="text-sm">System Details</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.materials} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, materials: !!checked}))}
                      />
                      <span className="text-sm">Materials Table</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox 
                        checked={sectionVisibility.hideAmounts} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, hideAmounts: !!checked}))}
                      />
                      <span className="text-sm text-muted-foreground">Hide individual amounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.whatYouGet} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, whatYouGet: !!checked}))}
                      />
                      <span className="text-sm">What You Get</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.paymentTerms} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, paymentTerms: !!checked}))}
                      />
                      <span className="text-sm">Payment Terms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.warranty} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, warranty: !!checked}))}
                      />
                      <span className="text-sm">Warranty Information</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={sectionVisibility.termsConditions} 
                        onCheckedChange={(checked) => setSectionVisibility(prev => ({...prev, termsConditions: !!checked}))}
                      />
                      <span className="text-sm">Terms & Conditions</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea 
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add terms, conditions, or special notes..."
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button className="w-full" onClick={handleSaveQuotation} disabled={!!discountError || !!totalError}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Quotation
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setIsSaveTemplateOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("preview")}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="w-full" onClick={handleOpenShareModal}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share to Client
                </Button>
                
                {/* Quotation Actions - Only for existing quotations */}
                {editingQuotationId && (
                  <div className="space-y-2 pt-4 border-t mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quotation Actions</p>
                    
                    {/* Mark as Approved */}
                    {status !== "approved" && status !== "rejected" && (
                      <Button 
                        variant="outline" 
                        className="w-full border-primary text-primary hover:bg-primary/10"
                        onClick={() => {
                          if (editingQuotationId) void handleMarkAsApproved(editingQuotationId);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Approved
                      </Button>
                    )}
                    
                    {/* Create Project - for approved quotations */}
                    {status === "approved" && (
                      <Button 
                        className="w-full bg-primary"
                        onClick={() => {
                          const quotation = savedQuotations.find(q => q.id === editingQuotationId);
                          if (quotation) handleCreateProject(quotation);
                        }}
                      >
                        <Briefcase className="w-4 h-4 mr-2" />
                        Create Project
                      </Button>
                    )}
                    
                    {/* Mark as Rejected - only for non-rejected, non-approved quotations */}
                    {status !== "rejected" && status !== "approved" && (
                      <Button 
                        variant="outline" 
                        className="w-full border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleMarkAsRejected(editingQuotationId);
                          setStatus("rejected");
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Mark as Rejected
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          {/* Action buttons for Preview only */}
          <div className="flex items-center justify-end gap-3 mb-6">
            <Button variant="outline" onClick={handleExportPDF} disabled={isExportingPdf}>
              <Download className="w-4 h-4 mr-2" />
              {isExportingPdf ? "Exporting..." : "Export PDF"}
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button className="bg-primary text-primary-foreground" onClick={handleOpenShareModal}>
              <Send className="w-4 h-4 mr-2" />
              Send to Client
            </Button>
          </div>

          {/* Printable Quotation Preview */}
          <div ref={quotationRef} className="bg-background p-8 rounded-lg border max-w-4xl mx-auto pb-16">
            {/* Company Header - MAHI SOLAR ENERGY */}
            <div className="flex justify-between items-start mb-8 pb-6 border-b">
              <div>
                <h1 className="text-2xl font-bold text-primary">{companyInfo.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{companyInfo.address}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {companyInfo.contacts.map((contact, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {contact.phone}
                    </span>
                  ))}
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {companyInfo.email}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">GSTIN: {companyInfo.gstin}</p>
              </div>
              <div className="text-right">
                <Badge className={`${getStatusColor(status)} border-0 capitalize text-sm px-3 py-1`}>{status}</Badge>
                <p className="text-2xl font-bold mt-2">{quotationNumber}</p>
                <p className="text-sm text-muted-foreground">Date: {quotationDate}</p>
              </div>
            </div>

            {/* Client & System Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">QUOTATION FOR</h3>
                <p className="font-bold text-lg">{clientName || "—"}</p>
                <p className="text-sm text-muted-foreground">{clientPhone}</p>
                <p className="text-sm text-muted-foreground">{clientEmail}</p>
                <p className="text-sm text-muted-foreground">{clientCity}, {clientState}</p>
              </div>
              {sectionVisibility.systemDetails && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">SYSTEM DETAILS</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Size:</span>
                      <span className="font-medium">{systemCapacity} kWp ({systemCategory})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Solar Panels:</span>
                      <span className="font-medium">{panelCount}x {panelBrand} {panelWattage}W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inverter:</span>
                      <span className="font-medium">{inverterBrand} {inverterCapacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Structure:</span>
                      <span className="font-medium">{structureType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Floor Height:</span>
                      <span className="font-medium">{floorHeight}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* What You Get in Preview */}
            {sectionVisibility.whatYouGet && (
              <div className="mb-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-sm text-primary mb-3">WHAT YOU GET</h3>
                <div className="grid grid-cols-2 gap-2">
                  {whatYouGet.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials Table */}
            {sectionVisibility.materials && (
              <div className="mb-8">
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">QUOTATION ITEMS</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Item / Service</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      {!sectionVisibility.hideAmounts && (
                        <TableHead className="text-right">Amount</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((item, idx) => (
                      <TableRow key={item.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.category}</TableCell>
                        <TableCell>
                          <p className="font-medium">{item.itemName}</p>
                          {item.size !== "-" && <p className="text-xs text-muted-foreground">{item.size}</p>}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity} {item.unit}</TableCell>
                        {!sectionVisibility.hideAmounts && (
                          <TableCell className="text-right">₹{(item.quantity * item.rate).toLocaleString()}</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Price Summary */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                {sectionVisibility.paymentTerms && (
                  <>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3">PAYMENT TERMS</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Booking Amount:</span>
                        <span className="font-medium">{bookingAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>On Design Approval:</span>
                        <span className="font-medium">{designApproval}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Before Material Dispatch:</span>
                        <span className="font-medium">{beforeDispatch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Post Installation:</span>
                        <span className="font-medium">{postInstallation}</span>
                      </div>
                    </div>
                  </>
                )}

                {sectionVisibility.warranty && (
                  <>
                    <h3 className={`font-semibold text-sm text-muted-foreground mb-3 ${sectionVisibility.paymentTerms ? 'mt-6' : ''}`}>WARRANTY</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Panel Product:</span>
                        <span className="font-medium">{panelProductWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Panel Performance:</span>
                        <span className="font-medium">{panelPerformanceWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Inverter:</span>
                        <span className="font-medium">{inverterWarranty}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Structure:</span>
                        <span className="font-medium">{structureWarranty}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">PRICE SUMMARY</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>System Cost:</span>
                      <span>₹{systemCost.toLocaleString()}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Discount ({discountPercent}%):</span>
                        <span>-₹{discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>GST ({gstPercent}%):</span>
                      <span>₹{gstAmount.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Net Price:</span>
                      <span>₹{netPrice.toLocaleString()}</span>
                    </div>
                    {govtSubsidy > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Govt. Subsidy:</span>
                        <span>-₹{govtSubsidy.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-xl text-primary pt-2">
                      <span>Net Effective Price:</span>
                      <span>₹{effectivePrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / T&C */}
            {sectionVisibility.termsConditions && notes && (
              <div className="mb-8">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">TERMS & CONDITIONS</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-lg">
                  {notes}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-6 border-t">
              <p>This quotation is valid for 15 days from the date of issue.</p>
              <p className="mt-1">Thank you for considering {companyInfo.name} for your solar energy needs!</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Material Sheet */}
      <Sheet open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Add Material Item</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
              <TabsTrigger value="inventory" className="flex-1">From Inventory</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newMaterial.category || ""} onValueChange={(v) => setNewMaterial({...newMaterial, category: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Structure">Structure</SelectItem>
                      <SelectItem value="Panel/Module">Panel/Module</SelectItem>
                      <SelectItem value="Wiring">Wiring</SelectItem>
                      <SelectItem value="Earthing">Earthing</SelectItem>
                      <SelectItem value="Civil">Civil</SelectItem>
                      <SelectItem value="Meter">Meter</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newMaterial.unit || ""} onValueChange={(v) => setNewMaterial({...newMaterial, unit: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="m">Meters</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                      <SelectItem value="pair">Pair</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="job">Job</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  placeholder="Enter item name"
                  value={newMaterial.itemName || ""}
                  onChange={(e) => setNewMaterial({...newMaterial, itemName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Size/Specifications</Label>
                <Input 
                  placeholder="e.g., 4sqmm, 540W"
                  value={newMaterial.size || ""}
                  onChange={(e) => setNewMaterial({...newMaterial, size: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={newMaterial.quantity || ""}
                    onChange={(e) => setNewMaterial({...newMaterial, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate (₹)</Label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={newMaterial.rate || ""}
                    onChange={(e) => setNewMaterial({...newMaterial, rate: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Cancel</Button>
                <Button onClick={handleAddMaterial}>Add Item</Button>
              </div>
            </TabsContent>
            <TabsContent value="inventory" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select from Inventory</Label>
                <div className="border rounded-lg max-h-[250px] overflow-y-auto">
                  {[
                    { id: 1, name: "Waaree 540W Mono Perc", category: "Panel", stock: 120, rate: 13000 },
                    { id: 2, name: "Growatt 5kW Inverter", category: "Inverter", stock: 5, rate: 42000 },
                    { id: 3, name: "DC Cable 4sqmm", category: "Cable", stock: 500, rate: 45 },
                    { id: 4, name: "Structure GI Rail", category: "Structure", stock: 450, rate: 110 },
                    { id: 6, name: "Luminous 150Ah Battery", category: "Battery", stock: 12, rate: 15000 },
                    { id: 7, name: "MC4 Connectors", category: "Misc", stock: 200, rate: 35 },
                    { id: 123, name: "AC DB", category: "Wiring", stock: 15, rate: 4500 },
                    { id: 124, name: "DC DB", category: "Wiring", stock: 15, rate: 3500 },
                    { id: 139, name: "LA (Lightning Arrestor)", category: "Earthing", stock: 20, rate: 3200 },
                  ].map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setNewMaterial({
                          category: item.category,
                          itemName: item.name,
                          quantity: 1,
                          rate: item.rate,
                          unit: "pcs",
                          size: "-"
                        });
                        setIsAddMaterialOpen(false);
                        // Add directly to materials
                        setMaterials([...materials, {
                          id: Date.now(),
                          category: item.category,
                          itemName: item.name,
                          size: "-",
                          quantity: 1,
                          rate: item.rate,
                          unit: "pcs",
                        }]);
                        toast({ title: "Item Added", description: `${item.name} added to materials` });
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} • Stock: {item.stock}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{item.rate.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">per unit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)}>Close</Button>
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Save as Template Sheet */}
      <Sheet open={isSaveTemplateOpen} onOpenChange={setIsSaveTemplateOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Save as Template</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">System Configuration:</p>
              <p className="font-medium capitalize">{systemCategory} - {systemCapacity} kW</p>
            </div>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input 
                placeholder="e.g., Standard 5kW Residential"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSaveTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate}>Save Template</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Send Confirmation Sheet */}
      <Sheet open={isSendConfirmOpen} onOpenChange={setIsSendConfirmOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Send Quotation?</h3>
            <p className="text-muted-foreground mt-2">
              This will send the quotation to <strong>{clientName}</strong> at {clientEmail}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsSendConfirmOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSendToClient}>
                <Check className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Share to Client Modal */}
      <Sheet open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Quotation to Client
            </SheetTitle>
            <SheetDescription>
              Choose how you want to share this quotation with {clientName || "the client"}
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            {/* Share Method Selection */}
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "whatsapp" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="whatsapp"
                  className="sr-only"
                  checked={shareMethod === "whatsapp"}
                  onChange={() => setShareMethod("whatsapp")}
                />
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-sm">WhatsApp</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "email" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="email"
                  className="sr-only"
                  checked={shareMethod === "email"}
                  onChange={() => setShareMethod("email")}
                />
                <Mail className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-sm">Email</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "sms" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="sms"
                  className="sr-only"
                  checked={shareMethod === "sms"}
                  onChange={() => setShareMethod("sms")}
                />
                <Phone className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-sm">SMS</span>
              </label>
              
              <label className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${shareMethod === "visit" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                <input
                  type="radio"
                  name="shareMethod"
                  value="visit"
                  className="sr-only"
                  checked={shareMethod === "visit"}
                  onChange={() => setShareMethod("visit")}
                />
                <MapPin className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-sm">In-Person</span>
              </label>
            </div>

            {/* Contact Input for WhatsApp/Email/SMS */}
            {shareMethod !== "visit" && (
              <div className="space-y-2">
                <Label>
                  {shareMethod === "email" ? "Email Address" : "Mobile Number"}
                </Label>
                <Input 
                  placeholder={shareMethod === "email" ? "email@example.com" : "+91 XXXXX XXXXX"}
                  value={shareContactValue}
                  onChange={(e) => setShareContactValue(e.target.value)}
                />
                {shareContactValue && (
                  <p className="text-xs text-muted-foreground">
                    Will be sent to: <strong>{shareContactValue}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Visit Details for In-Person */}
            {shareMethod === "visit" && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Mark this quotation as shared during an in-person visit</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Date of Visit
                    </Label>
                    <Input 
                      type="date"
                      value={shareVisitDate}
                      onChange={(e) => setShareVisitDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time (Optional)
                    </Label>
                    <Input 
                      type="time"
                      value={shareVisitTime}
                      onChange={(e) => setShareVisitTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea 
                    placeholder="Any notes about the visit..."
                    value={shareVisitNotes}
                    onChange={(e) => setShareVisitNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmShare}>
              {shareMethod === "visit" ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Sent
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Share
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Project from Quotation Sheet */}
      <Sheet open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Create Project from Quotation
            </SheetTitle>
            <SheetDescription>
              This will create a new project with data from quotation {selectedQuotationForProject?.quotationNumber}
            </SheetDescription>
          </SheetHeader>
          
          {selectedQuotationForProject && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-sm"><strong>Client:</strong> {selectedQuotationForProject.clientName}</p>
                <p className="text-sm"><strong>System:</strong> {selectedQuotationForProject.systemCategory} {selectedQuotationForProject.systemCapacity}kW</p>
                <p className="text-sm"><strong>Location:</strong> {selectedQuotationForProject.clientCity}, {selectedQuotationForProject.clientState}</p>
              </div>

              <div className="space-y-2">
                <Label>Project kind</Label>
                <Select
                  value={quotationProjectKind}
                  onValueChange={(v) => setQuotationProjectKind(v as ProjectKind)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(projectKindConfigs) as ProjectKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {projectKindConfigs[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Solo EPC matches the classic quote→project path. Other kinds require the extra fields below when applicable.
                </p>
              </div>

              {(quotationProjectKind === "PARTNER_EPC" || quotationProjectKind === "FIXED_EPC" || quotationProjectKind === "VENDOR_NETWORK") && (
                <div className="space-y-2">
                  <Label>Partner</Label>
                  <Select value={qPartnerIdForProject} onValueChange={setQPartnerIdForProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select partner" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {quotationProjectKind === "PARTNER_EPC" && (
                <div className="space-y-2">
                  <Label>Profit share (%)</Label>
                  <Input type="number" value={qProfitSharePercent} onChange={(e) => setQProfitSharePercent(e.target.value)} />
                </div>
              )}

              {quotationProjectKind === "FIXED_EPC" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>MSS backend (₹)</Label>
                    <Input type="number" value={qFixedBackend} onChange={(e) => setQFixedBackend(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Partner sell (₹)</Label>
                    <Input type="number" value={qFixedSell} onChange={(e) => setQFixedSell(e.target.value)} />
                  </div>
                </div>
              )}

              {quotationProjectKind === "VENDOR_NETWORK" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Vendorship fee</Label>
                    <Input type="number" value={qVendorshipFee} onChange={(e) => setQVendorshipFee(e.target.value)} placeholder="Fee payable by partner" />
                  </div>
                  <div className="space-y-2">
                    <Label>External network notes</Label>
                    <Input value={qExternal} onChange={(e) => setQExternal(e.target.value)} placeholder="Optional execution/network note" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Amount Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${projectAmountType === "temporary" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                    <input
                      type="radio"
                      name="amountType"
                      value="temporary"
                      className="sr-only"
                      checked={projectAmountType === "temporary"}
                      onChange={() => setProjectAmountType("temporary")}
                    />
                    <span className="font-medium">Temporary Amount</span>
                    <span className="text-lg text-primary font-semibold mt-1">
                      ₹{(selectedQuotationForProject.temporaryAmount || selectedQuotationForProject.totalAmount).toLocaleString()}
                    </span>
                  </label>
                  <label className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${projectAmountType === "final" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                    <input
                      type="radio"
                      name="amountType"
                      value="final"
                      className="sr-only"
                      checked={projectAmountType === "final"}
                      onChange={() => setProjectAmountType("final")}
                    />
                    <span className="font-medium">Final Amount</span>
                    <span className="text-lg text-primary font-semibold mt-1">
                      ₹{(selectedQuotationForProject.finalAmount || selectedQuotationForProject.totalAmount).toLocaleString()}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCreateProjectOpen(false)}>Cancel</Button>
            <Button onClick={confirmCreateProject}>
              <Briefcase className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Save Visibility Preset Sheet */}
      <Sheet open={isSaveVisibilityPresetOpen} onOpenChange={setIsSaveVisibilityPresetOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Save Visibility Preset</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input 
                placeholder="e.g., Standard Quote, Minimal Preview"
                value={visibilityPresetName}
                onChange={(e) => setVisibilityPresetName(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted/30 rounded-lg space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Current Settings:</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span className={sectionVisibility.systemDetails ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.systemDetails ? "✓" : "✗"} System Details
                </span>
                <span className={sectionVisibility.materials ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.materials ? "✓" : "✗"} Materials
                </span>
                <span className={sectionVisibility.whatYouGet ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.whatYouGet ? "✓" : "✗"} What You Get
                </span>
                <span className={sectionVisibility.paymentTerms ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.paymentTerms ? "✓" : "✗"} Payment Terms
                </span>
                <span className={sectionVisibility.warranty ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.warranty ? "✓" : "✗"} Warranty
                </span>
                <span className={sectionVisibility.termsConditions ? "text-primary" : "text-muted-foreground"}>
                  {sectionVisibility.termsConditions ? "✓" : "✗"} Terms & Conditions
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Hide amounts: {sectionVisibility.hideAmounts ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsSaveVisibilityPresetOpen(false);
              setVisibilityPresetName("");
            }}>Cancel</Button>
            <Button onClick={() => {
              if (!visibilityPresetName.trim()) {
                toast({ title: "Error", description: "Please enter a preset name", variant: "destructive" });
                return;
              }
              addQuotationVisibilityPreset({
                id: generateId("VP"),
                name: visibilityPresetName.trim(),
                visibility: { ...sectionVisibility },
                createdAt: new Date().toISOString(),
              });
              toast({ title: "Preset Saved", description: `"${visibilityPresetName}" preset saved successfully` });
              setIsSaveVisibilityPresetOpen(false);
              setVisibilityPresetName("");
            }}>Save Preset</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Sheet */}
      <Sheet open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] border-l-destructive/30 overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteHasRelations ? "Deletion Request Required" : "Confirm Delete"}
            </SheetTitle>
            <SheetDescription>
              {deleteHasRelations ? (
                <div className="space-y-3">
                  <p>This quotation has related entities and requires Super Admin approval to delete.</p>
                  
                  {/* Related Entities */}
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-2">
                    <p className="text-sm font-medium text-foreground">Related Items:</p>
                    {deleteRelatedEntities.map((entity, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <span className="capitalize">{entity.type}:</span>
                        <span className="font-medium">{entity.name}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-600">
                      Before deleting, please verify that related data will not be affected. 
                      Deleting this quotation may affect the linked project and any invoices.
                    </p>
                  </div>
                </div>
              ) : (
                <p>
                  Are you sure you want to delete quotation <strong>"{quotationToDelete?.quotationNumber}"</strong>? 
                  This action cannot be undone.
                </p>
              )}
            </SheetDescription>
          </SheetHeader>
          
          {/* Reason field for related entities */}
          {deleteHasRelations && (
            <div className="space-y-2 py-2">
              <Label>Reason for Deletion *</Label>
              <Textarea
                placeholder="Please explain why this quotation should be deleted..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
          
          <SheetFooter className="mt-6 flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false);
              setQuotationToDelete(null);
              setDeleteReason("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteQuotation}
            >
              {deleteHasRelations ? "Submit Deletion Request" : "Delete Permanently"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Quotations;

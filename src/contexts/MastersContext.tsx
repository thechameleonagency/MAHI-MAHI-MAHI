import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  MasterItem,
  MasterCategory,
  projectTypes,
  projectCategories,
  projectOwnerTypes,
  projectSources,
  projectStatuses,
  progressStages,
  siteExpenseCategories,
  companyExpenseCategories,
  employeeExpenseCategories,
  labourSubCategories,
  transportSubCategories,
  materialSubCategories,
  commissionSubCategories,
  outsourceSubCategories,
  inventoryCategories,
  vendorCategories,
  measurementUnits,
  paymentMethods,
  incomeCategories,
  employeeRoles,
  teamRoles,
  invoiceStatuses,
  transactionTypes,
  toolConditions,
  toolStatuses,
  toolCategories,
  materialDamageReasons,
  dashboardTimeFilters,
  industryTypes,
  costAllocationOptions,
  defaultBankAccounts,
  allMasterCategories,
  hsnCodes,
  sacCodes,
  gstRates,
  stateCodes,
  ownerExpenseCategories,
  outsourceWorkTags,
  loanSources,
  panelBrands,
  inverterBrands,
  structureTypes,
  systemCapacities,
  quotationPresetCategories,
  quotationMaterialCategories,
  quotationChecklistItems,
  payerTypes,
  partnerTypes,
  partnerTransactionTypes,
  siteChecklistPresets,
  type SiteChecklistPreset,
} from "@/data/masters";

// Grouped master categories for Settings display
export interface MasterGroup {
  id: string;
  label: string;
  icon?: string;
  description: string;
  categories: string[];
}

export const masterGroups: MasterGroup[] = [
  {
    id: "projects",
    label: "Projects",
    icon: "Briefcase",
    description: "Project-related configurations",
    categories: ["projectTypes", "projectCategories", "projectOwnerTypes", "projectSources", "projectStatuses", "progressStages"],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: "Receipt",
    description: "Expense categories and sub-categories",
    categories: [
      "siteExpenseCategories",
      "labourSubCategories",
      "transportSubCategories",
      "materialSubCategories",
      "commissionSubCategories",
      "outsourceSubCategories",
      "companyExpenseCategories",
      "employeeExpenseCategories",
      "ownerExpenseCategories",
      "outsourceWorkTags",
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Tools",
    icon: "Package",
    description: "Inventory and tool configurations",
    categories: [
      "inventoryCategories",
      "vendorCategories",
      "measurementUnits",
      "toolCategories",
      "toolConditions",
      "materialDamageReasons",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "Wallet",
    description: "Payment and financial configurations",
    categories: [
      "paymentMethods",
      "incomeCategories",
      "loanSources",
      "payerTypes",
      "partnerTypes",
      "partnerTransactionTypes",
      "bankAccounts",
    ],
  },
  {
    id: "quotations",
    label: "Quotations",
    icon: "FileText",
    description: "Quotation and solar system configurations",
    categories: [
      "panelBrands",
      "inverterBrands",
      "structureTypes",
      "systemCapacities",
      "quotationMaterialCategories",
      "quotationChecklistItems",
    ],
  },
  {
    id: "hr",
    label: "HR & Team",
    icon: "Users",
    description: "Employee and team configurations",
    categories: ["employeeRoles", "teamRoles"],
  },
  {
    id: "gst",
    label: "GST & Tax",
    icon: "Calculator",
    description: "Tax codes and rates",
    categories: ["hsnCodes", "sacCodes", "gstRates", "stateCodes"],
  },
  {
    id: "system",
    label: "System",
    icon: "Settings",
    description: "System-level configurations (read-only)",
    categories: ["invoiceStatuses", "toolStatuses", "transactionTypes", "industryTypes"],
  },
];

interface MastersContextType {
  // Getters
  getProjectTypes: () => MasterItem[];
  getProjectCategories: () => MasterItem[];
  getProjectOwnerTypes: () => MasterItem[];
  getProjectSources: () => MasterItem[];
  getProjectStatuses: () => MasterItem[];
  getProgressStages: () => MasterItem[];
  getSiteExpenseCategories: () => MasterItem[];
  getCompanyExpenseCategories: () => MasterItem[];
  getEmployeeExpenseCategories: () => MasterItem[];
  getOwnerExpenseCategories: () => MasterItem[];
  getOutsourceWorkTags: () => MasterItem[];
  getLoanSources: () => MasterItem[];
  getPayerTypes: () => MasterItem[];
  getPartnerTypes: () => MasterItem[];
  getPartnerTransactionTypes: () => MasterItem[];
  getSubCategories: (categoryId: string) => MasterItem[];
  getLabourSubCategories: () => MasterItem[];
  getTransportSubCategories: () => MasterItem[];
  getMaterialSubCategories: () => MasterItem[];
  getCommissionSubCategories: () => MasterItem[];
  getOutsourceSubCategories: () => MasterItem[];
  getInventoryCategories: () => MasterItem[];
  getVendorCategories: () => MasterItem[];
  getMeasurementUnits: () => MasterItem[];
  getPaymentMethods: () => MasterItem[];
  getIncomeCategories: () => MasterItem[];
  getEmployeeRoles: () => MasterItem[];
  getTeamRoles: () => MasterItem[];
  getInvoiceStatuses: () => MasterItem[];
  getTransactionTypes: () => MasterItem[];
  getToolConditions: () => MasterItem[];
  getToolStatuses: () => MasterItem[];
  getToolCategories: () => MasterItem[];
  getMaterialDamageReasons: () => MasterItem[];
  getDashboardTimeFilters: () => MasterItem[];
  getIndustryTypes: () => MasterItem[];
  getCostAllocationOptions: () => MasterItem[];
  getBankAccounts: () => MasterItem[];
  getHsnCodes: () => MasterItem[];
  getSacCodes: () => MasterItem[];
  getGstRates: () => MasterItem[];
  getStateCodes: () => MasterItem[];
  getPanelBrands: () => MasterItem[];
  getInverterBrands: () => MasterItem[];
  getStructureTypes: () => MasterItem[];
  getSystemCapacities: () => MasterItem[];
  getQuotationMaterialCategories: () => MasterItem[];
  getQuotationChecklistItems: () => MasterItem[];
  getSiteChecklistPresets: () => SiteChecklistPreset[];
  getAllMasterCategories: () => MasterCategory[];
  getMasterGroups: () => MasterGroup[];
  getCategoryById: (categoryId: string) => { items: MasterItem[]; isEditable: boolean; label: string; parentCategoryId?: string };

  // Mutators
  addMasterItem: (categoryId: string, item: MasterItem) => void;
  updateMasterItem: (categoryId: string, itemValue: string, updates: Partial<MasterItem>) => void;
  deleteMasterItem: (categoryId: string, itemValue: string) => void;
  addBankAccount: (account: MasterItem) => void;
  deleteBankAccount: (accountValue: string) => void;
}

const MastersContext = createContext<MastersContextType | undefined>(undefined);

const MASTERS_STORAGE_KEY = "masters_data";

export const MastersProvider = ({ children }: { children: ReactNode }) => {
  // State for editable categories
  const [projectTypesState, setProjectTypesState] = useState<MasterItem[]>(projectTypes);
  const [projectCategoriesState, setProjectCategoriesState] = useState<MasterItem[]>(projectCategories);
  const [projectOwnerTypesState, setProjectOwnerTypesState] = useState<MasterItem[]>(projectOwnerTypes);
  const [projectSourcesState, setProjectSourcesState] = useState<MasterItem[]>(projectSources);
  const [projectStatusesState, setProjectStatusesState] = useState<MasterItem[]>(projectStatuses);
  const [progressStagesState, setProgressStagesState] = useState<MasterItem[]>(progressStages);
  const [siteExpenseCategoriesState, setSiteExpenseCategoriesState] = useState<MasterItem[]>(siteExpenseCategories);
  const [companyExpenseCategoriesState, setCompanyExpenseCategoriesState] = useState<MasterItem[]>(companyExpenseCategories);
  const [employeeExpenseCategoriesState, setEmployeeExpenseCategoriesState] = useState<MasterItem[]>(employeeExpenseCategories);
  const [ownerExpenseCategoriesState, setOwnerExpenseCategoriesState] = useState<MasterItem[]>(ownerExpenseCategories);
  const [outsourceWorkTagsState, setOutsourceWorkTagsState] = useState<MasterItem[]>(outsourceWorkTags);
  const [loanSourcesState, setLoanSourcesState] = useState<MasterItem[]>(loanSources);
  const [payerTypesState, setPayerTypesState] = useState<MasterItem[]>(payerTypes);
  const [partnerTypesState, setPartnerTypesState] = useState<MasterItem[]>(partnerTypes);
  const [partnerTransactionTypesState, setPartnerTransactionTypesState] = useState<MasterItem[]>(partnerTransactionTypes);
  const [labourSubCategoriesState, setLabourSubCategoriesState] = useState<MasterItem[]>(labourSubCategories);
  const [transportSubCategoriesState, setTransportSubCategoriesState] = useState<MasterItem[]>(transportSubCategories);
  const [materialSubCategoriesState, setMaterialSubCategoriesState] = useState<MasterItem[]>(materialSubCategories);
  const [commissionSubCategoriesState, setCommissionSubCategoriesState] = useState<MasterItem[]>(commissionSubCategories);
  const [outsourceSubCategoriesState, setOutsourceSubCategoriesState] = useState<MasterItem[]>(outsourceSubCategories);
  const [inventoryCategoriesState, setInventoryCategoriesState] = useState<MasterItem[]>(inventoryCategories);
  const [vendorCategoriesState, setVendorCategoriesState] = useState<MasterItem[]>(vendorCategories);
  const [measurementUnitsState, setMeasurementUnitsState] = useState<MasterItem[]>(measurementUnits);
  const [paymentMethodsState, setPaymentMethodsState] = useState<MasterItem[]>(paymentMethods);
  const [incomeCategoriesState, setIncomeCategoriesState] = useState<MasterItem[]>(incomeCategories);
  const [employeeRolesState, setEmployeeRolesState] = useState<MasterItem[]>(employeeRoles);
  const [toolConditionsState, setToolConditionsState] = useState<MasterItem[]>(toolConditions);
  const [toolCategoriesState, setToolCategoriesState] = useState<MasterItem[]>(toolCategories);
  const [materialDamageReasonsState, setMaterialDamageReasonsState] = useState<MasterItem[]>(materialDamageReasons);
  const [industryTypesState, setIndustryTypesState] = useState<MasterItem[]>(industryTypes);
  const [bankAccountsState, setBankAccountsState] = useState<MasterItem[]>(defaultBankAccounts);
  const [hsnCodesState, setHsnCodesState] = useState<MasterItem[]>(hsnCodes);
  const [sacCodesState, setSacCodesState] = useState<MasterItem[]>(sacCodes);
  const [panelBrandsState, setPanelBrandsState] = useState<MasterItem[]>(panelBrands);
  const [inverterBrandsState, setInverterBrandsState] = useState<MasterItem[]>(inverterBrands);
  const [structureTypesState, setStructureTypesState] = useState<MasterItem[]>(structureTypes);
  const [systemCapacitiesState, setSystemCapacitiesState] = useState<MasterItem[]>(systemCapacities);
  const [quotationMaterialCategoriesState, setQuotationMaterialCategoriesState] = useState<MasterItem[]>(quotationMaterialCategories);
  const [quotationChecklistItemsState, setQuotationChecklistItemsState] = useState<MasterItem[]>(quotationChecklistItems);
  const [siteChecklistPresetsState, setSiteChecklistPresetsState] = useState<SiteChecklistPreset[]>(siteChecklistPresets);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(MASTERS_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.projectTypes) setProjectTypesState(data.projectTypes);
        if (data.projectCategories) setProjectCategoriesState(data.projectCategories);
        if (data.projectOwnerTypes) setProjectOwnerTypesState(data.projectOwnerTypes);
        if (data.projectSources) setProjectSourcesState(data.projectSources);
        if (data.projectStatuses) setProjectStatusesState(data.projectStatuses);
        if (data.progressStages) setProgressStagesState(data.progressStages);
        if (data.siteExpenseCategories) setSiteExpenseCategoriesState(data.siteExpenseCategories);
        if (data.companyExpenseCategories) setCompanyExpenseCategoriesState(data.companyExpenseCategories);
        if (data.employeeExpenseCategories) setEmployeeExpenseCategoriesState(data.employeeExpenseCategories);
        if (data.ownerExpenseCategories) setOwnerExpenseCategoriesState(data.ownerExpenseCategories);
        if (data.outsourceWorkTags) setOutsourceWorkTagsState(data.outsourceWorkTags);
        if (data.loanSources) setLoanSourcesState(data.loanSources);
        if (data.payerTypes) setPayerTypesState(data.payerTypes);
        if (data.partnerTypes) setPartnerTypesState(data.partnerTypes);
        if (data.partnerTransactionTypes) setPartnerTransactionTypesState(data.partnerTransactionTypes);
        if (data.labourSubCategories) setLabourSubCategoriesState(data.labourSubCategories);
        if (data.transportSubCategories) setTransportSubCategoriesState(data.transportSubCategories);
        if (data.materialSubCategories) setMaterialSubCategoriesState(data.materialSubCategories);
        if (data.commissionSubCategories) setCommissionSubCategoriesState(data.commissionSubCategories);
        if (data.outsourceSubCategories) setOutsourceSubCategoriesState(data.outsourceSubCategories);
        if (data.inventoryCategories) setInventoryCategoriesState(data.inventoryCategories);
        if (data.vendorCategories) setVendorCategoriesState(data.vendorCategories);
        if (data.measurementUnits) setMeasurementUnitsState(data.measurementUnits);
        if (data.paymentMethods) setPaymentMethodsState(data.paymentMethods);
        if (data.incomeCategories) setIncomeCategoriesState(data.incomeCategories);
        if (data.employeeRoles) setEmployeeRolesState(data.employeeRoles);
        if (data.toolConditions) setToolConditionsState(data.toolConditions);
        if (data.toolCategories) setToolCategoriesState(data.toolCategories);
        if (data.materialDamageReasons) setMaterialDamageReasonsState(data.materialDamageReasons);
        if (data.industryTypes) setIndustryTypesState(data.industryTypes);
        if (data.bankAccounts) setBankAccountsState(data.bankAccounts);
        if (data.hsnCodes) setHsnCodesState(data.hsnCodes);
        if (data.sacCodes) setSacCodesState(data.sacCodes);
        if (data.panelBrands) setPanelBrandsState(data.panelBrands);
        if (data.inverterBrands) setInverterBrandsState(data.inverterBrands);
        if (data.structureTypes) setStructureTypesState(data.structureTypes);
        if (data.systemCapacities) setSystemCapacitiesState(data.systemCapacities);
        if (data.quotationMaterialCategories) setQuotationMaterialCategoriesState(data.quotationMaterialCategories);
        if (data.quotationChecklistItems) setQuotationChecklistItemsState(data.quotationChecklistItems);
        if (data.siteChecklistPresets) setSiteChecklistPresetsState(data.siteChecklistPresets);
      } catch (error) {
        console.error("Failed to load masters from localStorage:", error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  const saveToLocalStorage = () => {
    const data = {
      projectTypes: projectTypesState,
      projectCategories: projectCategoriesState,
      projectOwnerTypes: projectOwnerTypesState,
      projectSources: projectSourcesState,
      projectStatuses: projectStatusesState,
      progressStages: progressStagesState,
      siteExpenseCategories: siteExpenseCategoriesState,
      companyExpenseCategories: companyExpenseCategoriesState,
      employeeExpenseCategories: employeeExpenseCategoriesState,
      ownerExpenseCategories: ownerExpenseCategoriesState,
      outsourceWorkTags: outsourceWorkTagsState,
      loanSources: loanSourcesState,
      payerTypes: payerTypesState,
      partnerTypes: partnerTypesState,
      partnerTransactionTypes: partnerTransactionTypesState,
      labourSubCategories: labourSubCategoriesState,
      transportSubCategories: transportSubCategoriesState,
      materialSubCategories: materialSubCategoriesState,
      commissionSubCategories: commissionSubCategoriesState,
      outsourceSubCategories: outsourceSubCategoriesState,
      inventoryCategories: inventoryCategoriesState,
      vendorCategories: vendorCategoriesState,
      measurementUnits: measurementUnitsState,
      paymentMethods: paymentMethodsState,
      incomeCategories: incomeCategoriesState,
      employeeRoles: employeeRolesState,
      toolConditions: toolConditionsState,
      toolCategories: toolCategoriesState,
      materialDamageReasons: materialDamageReasonsState,
      industryTypes: industryTypesState,
      bankAccounts: bankAccountsState,
      hsnCodes: hsnCodesState,
      sacCodes: sacCodesState,
      panelBrands: panelBrandsState,
      inverterBrands: inverterBrandsState,
      structureTypes: structureTypesState,
      systemCapacities: systemCapacitiesState,
      quotationMaterialCategories: quotationMaterialCategoriesState,
      quotationChecklistItems: quotationChecklistItemsState,
      siteChecklistPresets: siteChecklistPresetsState,
    };
    localStorage.setItem(MASTERS_STORAGE_KEY, JSON.stringify(data));
  };

  useEffect(() => {
    saveToLocalStorage();
  }, [
    projectTypesState,
    projectCategoriesState,
    projectOwnerTypesState,
    projectSourcesState,
    projectStatusesState,
    progressStagesState,
    siteExpenseCategoriesState,
    companyExpenseCategoriesState,
    employeeExpenseCategoriesState,
    ownerExpenseCategoriesState,
    outsourceWorkTagsState,
    loanSourcesState,
    payerTypesState,
    partnerTypesState,
    partnerTransactionTypesState,
    labourSubCategoriesState,
    transportSubCategoriesState,
    materialSubCategoriesState,
    commissionSubCategoriesState,
    outsourceSubCategoriesState,
    inventoryCategoriesState,
    vendorCategoriesState,
    measurementUnitsState,
    paymentMethodsState,
    incomeCategoriesState,
    employeeRolesState,
    toolConditionsState,
    toolCategoriesState,
    materialDamageReasonsState,
    industryTypesState,
    bankAccountsState,
    hsnCodesState,
    sacCodesState,
    panelBrandsState,
    inverterBrandsState,
    structureTypesState,
    systemCapacitiesState,
    quotationMaterialCategoriesState,
    quotationChecklistItemsState,
  ]);

  // Getters
  const getProjectTypes = () => projectTypesState;
  const getProjectCategories = () => projectCategoriesState;
  const getProjectOwnerTypes = () => projectOwnerTypesState;
  const getProjectSources = () => projectSourcesState;
  const getProjectStatuses = () => projectStatusesState;
  const getProgressStages = () => progressStagesState;
  const getSiteExpenseCategories = () => siteExpenseCategoriesState;
  const getCompanyExpenseCategories = () => companyExpenseCategoriesState;
  const getEmployeeExpenseCategories = () => employeeExpenseCategoriesState;
  const getOwnerExpenseCategories = () => ownerExpenseCategoriesState;
  const getOutsourceWorkTags = () => outsourceWorkTagsState;
  const getLoanSources = () => loanSourcesState;
  const getPayerTypes = () => payerTypesState;
  const getPartnerTypes = () => partnerTypesState;
  const getPartnerTransactionTypes = () => partnerTransactionTypesState;
  const getLabourSubCategories = () => labourSubCategoriesState;
  const getTransportSubCategories = () => transportSubCategoriesState;
  const getMaterialSubCategories = () => materialSubCategoriesState;
  const getCommissionSubCategories = () => commissionSubCategoriesState;
  const getOutsourceSubCategories = () => outsourceSubCategoriesState;
  
  const getSubCategories = (categoryId: string): MasterItem[] => {
    switch (categoryId) {
      case "labour":
        return labourSubCategoriesState;
      case "transport":
        return transportSubCategoriesState;
      case "material":
        return materialSubCategoriesState;
      case "commission":
        return commissionSubCategoriesState;
      case "outsource":
        return outsourceSubCategoriesState;
      default:
        return [];
    }
  };

  const getInventoryCategories = () => inventoryCategoriesState;
  const getVendorCategories = () => vendorCategoriesState;
  const getMeasurementUnits = () => measurementUnitsState;
  const getPaymentMethods = () => paymentMethodsState;
  const getIncomeCategories = () => incomeCategoriesState;
  const getEmployeeRoles = () => employeeRolesState;
  const getTeamRoles = () => teamRoles;
  const getInvoiceStatuses = () => invoiceStatuses;
  const getTransactionTypes = () => transactionTypes;
  const getToolConditions = () => toolConditionsState;
  const getToolStatuses = () => toolStatuses;
  const getToolCategories = () => toolCategoriesState;
  const getMaterialDamageReasons = () => materialDamageReasonsState;
  const getDashboardTimeFilters = () => dashboardTimeFilters;
  const getIndustryTypes = () => industryTypesState;
  const getCostAllocationOptions = () => costAllocationOptions;
  const getBankAccounts = () => bankAccountsState;
  const getHsnCodes = () => hsnCodesState;
  const getSacCodes = () => sacCodesState;
  const getGstRates = () => gstRates;
  const getStateCodes = () => stateCodes;
  const getPanelBrands = () => panelBrandsState;
  const getInverterBrands = () => inverterBrandsState;
  const getStructureTypes = () => structureTypesState;
  const getSystemCapacities = () => systemCapacitiesState;
  const getQuotationMaterialCategories = () => quotationMaterialCategoriesState;
  const getQuotationChecklistItems = () => quotationChecklistItemsState;
  const getSiteChecklistPresets = () => siteChecklistPresetsState;
  const getMasterGroups = () => masterGroups;

  const getAllMasterCategories = (): MasterCategory[] => {
    return allMasterCategories.map(cat => {
      switch (cat.id) {
        case "projectTypes":
          return { ...cat, items: projectTypesState };
        case "projectCategories":
          return { ...cat, items: projectCategoriesState };
        case "projectOwnerTypes":
          return { ...cat, items: projectOwnerTypesState };
        case "projectSources":
          return { ...cat, items: projectSourcesState };
        case "projectStatuses":
          return { ...cat, items: projectStatusesState };
        case "progressStages":
          return { ...cat, items: progressStagesState };
        case "siteExpenseCategories":
          return { ...cat, items: siteExpenseCategoriesState };
        case "companyExpenseCategories":
          return { ...cat, items: companyExpenseCategoriesState };
        case "employeeExpenseCategories":
          return { ...cat, items: employeeExpenseCategoriesState };
        case "ownerExpenseCategories":
          return { ...cat, items: ownerExpenseCategoriesState };
        case "outsourceWorkTags":
          return { ...cat, items: outsourceWorkTagsState };
        case "loanSources":
          return { ...cat, items: loanSourcesState };
        case "payerTypes":
          return { ...cat, items: payerTypesState };
        case "partnerTypes":
          return { ...cat, items: partnerTypesState };
        case "partnerTransactionTypes":
          return { ...cat, items: partnerTransactionTypesState };
        case "labourSubCategories":
          return { ...cat, items: labourSubCategoriesState };
        case "transportSubCategories":
          return { ...cat, items: transportSubCategoriesState };
        case "materialSubCategories":
          return { ...cat, items: materialSubCategoriesState };
        case "commissionSubCategories":
          return { ...cat, items: commissionSubCategoriesState };
        case "outsourceSubCategories":
          return { ...cat, items: outsourceSubCategoriesState };
        case "inventoryCategories":
          return { ...cat, items: inventoryCategoriesState };
        case "vendorCategories":
          return { ...cat, items: vendorCategoriesState };
        case "measurementUnits":
          return { ...cat, items: measurementUnitsState };
        case "paymentMethods":
          return { ...cat, items: paymentMethodsState };
        case "incomeCategories":
          return { ...cat, items: incomeCategoriesState };
        case "employeeRoles":
          return { ...cat, items: employeeRolesState };
        case "toolConditions":
          return { ...cat, items: toolConditionsState };
        case "toolCategories":
          return { ...cat, items: toolCategoriesState };
        case "materialDamageReasons":
          return { ...cat, items: materialDamageReasonsState };
        case "industryTypes":
          return { ...cat, items: industryTypesState };
        case "bankAccounts":
          return { ...cat, items: bankAccountsState };
        case "hsnCodes":
          return { ...cat, items: hsnCodesState };
        case "sacCodes":
          return { ...cat, items: sacCodesState };
        case "panelBrands":
          return { ...cat, items: panelBrandsState };
        case "inverterBrands":
          return { ...cat, items: inverterBrandsState };
        case "structureTypes":
          return { ...cat, items: structureTypesState };
        case "systemCapacities":
          return { ...cat, items: systemCapacitiesState };
        case "quotationMaterialCategories":
          return { ...cat, items: quotationMaterialCategoriesState };
        case "quotationChecklistItems":
          return { ...cat, items: quotationChecklistItemsState };
        default:
          return cat;
      }
    });
  };

  // Get category by ID with items and metadata
  const getCategoryById = (categoryId: string): { items: MasterItem[]; isEditable: boolean; label: string; parentCategoryId?: string } => {
    const categoryMap: Record<string, { items: MasterItem[]; isEditable: boolean; label: string; parentCategoryId?: string }> = {
      projectTypes: { items: projectTypesState, isEditable: true, label: "Project Types" },
      projectCategories: { items: projectCategoriesState, isEditable: true, label: "Project Categories" },
      projectOwnerTypes: { items: projectOwnerTypesState, isEditable: true, label: "Project Owner Types" },
      projectSources: { items: projectSourcesState, isEditable: true, label: "Project Sources" },
      projectStatuses: { items: projectStatusesState, isEditable: false, label: "Project Statuses" },
      progressStages: { items: progressStagesState, isEditable: true, label: "Progress Stages" },
      siteExpenseCategories: { items: siteExpenseCategoriesState, isEditable: true, label: "Site Expense Categories" },
      companyExpenseCategories: { items: companyExpenseCategoriesState, isEditable: true, label: "Company Expense Categories" },
      employeeExpenseCategories: { items: employeeExpenseCategoriesState, isEditable: true, label: "Employee Expense Categories" },
      ownerExpenseCategories: { items: ownerExpenseCategoriesState, isEditable: true, label: "Owner/MK Expense Categories" },
      outsourceWorkTags: { items: outsourceWorkTagsState, isEditable: true, label: "Outsource Work Tags" },
      loanSources: { items: loanSourcesState, isEditable: true, label: "Loan Sources" },
      payerTypes: { items: payerTypesState, isEditable: true, label: "Payer Types (Who Can Pay)" },
      partnerTypes: { items: partnerTypesState, isEditable: true, label: "Partner Types" },
      partnerTransactionTypes: { items: partnerTransactionTypesState, isEditable: true, label: "Partner Transaction Types" },
      labourSubCategories: { items: labourSubCategoriesState, isEditable: true, label: "Labour Sub-Categories", parentCategoryId: "labour" },
      transportSubCategories: { items: transportSubCategoriesState, isEditable: true, label: "Transport Sub-Categories", parentCategoryId: "transport" },
      materialSubCategories: { items: materialSubCategoriesState, isEditable: true, label: "Material Sub-Categories", parentCategoryId: "material" },
      commissionSubCategories: { items: commissionSubCategoriesState, isEditable: true, label: "Commission Sub-Categories", parentCategoryId: "commission" },
      outsourceSubCategories: { items: outsourceSubCategoriesState, isEditable: true, label: "Outsource Sub-Categories", parentCategoryId: "outsource" },
      inventoryCategories: { items: inventoryCategoriesState, isEditable: true, label: "Inventory Categories" },
      vendorCategories: { items: vendorCategoriesState, isEditable: true, label: "Vendor Categories" },
      measurementUnits: { items: measurementUnitsState, isEditable: true, label: "Measurement Units" },
      paymentMethods: { items: paymentMethodsState, isEditable: true, label: "Payment Methods" },
      incomeCategories: { items: incomeCategoriesState, isEditable: true, label: "Income Categories" },
      employeeRoles: { items: employeeRolesState, isEditable: true, label: "Employee Roles" },
      teamRoles: { items: teamRoles, isEditable: false, label: "Team Roles" },
      invoiceStatuses: { items: invoiceStatuses, isEditable: false, label: "Invoice Statuses" },
      transactionTypes: { items: transactionTypes, isEditable: false, label: "Transaction Types" },
      toolConditions: { items: toolConditionsState, isEditable: true, label: "Tool Conditions" },
      toolStatuses: { items: toolStatuses, isEditable: false, label: "Tool Statuses" },
      toolCategories: { items: toolCategoriesState, isEditable: true, label: "Tool Categories" },
      materialDamageReasons: { items: materialDamageReasonsState, isEditable: true, label: "Material Damage Reasons" },
      industryTypes: { items: industryTypesState, isEditable: true, label: "Industry Types" },
      bankAccounts: { items: bankAccountsState, isEditable: true, label: "Bank Accounts" },
      hsnCodes: { items: hsnCodesState, isEditable: true, label: "HSN Codes" },
      sacCodes: { items: sacCodesState, isEditable: true, label: "SAC Codes" },
      gstRates: { items: gstRates, isEditable: false, label: "GST Tax Rates" },
      stateCodes: { items: stateCodes, isEditable: false, label: "State Codes" },
      panelBrands: { items: panelBrandsState, isEditable: true, label: "Panel Brands" },
      inverterBrands: { items: inverterBrandsState, isEditable: true, label: "Inverter Brands" },
      structureTypes: { items: structureTypesState, isEditable: true, label: "Structure Types" },
      systemCapacities: { items: systemCapacitiesState, isEditable: true, label: "System Capacities" },
      quotationMaterialCategories: { items: quotationMaterialCategoriesState, isEditable: true, label: "Quotation Material Categories" },
      quotationChecklistItems: { items: quotationChecklistItemsState, isEditable: true, label: "Quotation Checklist Items" },
    };
    return categoryMap[categoryId] || { items: [], isEditable: false, label: categoryId };
  };

  // Mutators
  const getStateSetterForCategory = (categoryId: string) => {
    const setterMap: Record<string, React.Dispatch<React.SetStateAction<MasterItem[]>>> = {
      projectTypes: setProjectTypesState,
      projectCategories: setProjectCategoriesState,
      projectOwnerTypes: setProjectOwnerTypesState,
      projectSources: setProjectSourcesState,
      projectStatuses: setProjectStatusesState,
      progressStages: setProgressStagesState,
      siteExpenseCategories: setSiteExpenseCategoriesState,
      companyExpenseCategories: setCompanyExpenseCategoriesState,
      employeeExpenseCategories: setEmployeeExpenseCategoriesState,
      ownerExpenseCategories: setOwnerExpenseCategoriesState,
      outsourceWorkTags: setOutsourceWorkTagsState,
      loanSources: setLoanSourcesState,
      payerTypes: setPayerTypesState,
      partnerTypes: setPartnerTypesState,
      partnerTransactionTypes: setPartnerTransactionTypesState,
      labourSubCategories: setLabourSubCategoriesState,
      transportSubCategories: setTransportSubCategoriesState,
      materialSubCategories: setMaterialSubCategoriesState,
      commissionSubCategories: setCommissionSubCategoriesState,
      outsourceSubCategories: setOutsourceSubCategoriesState,
      inventoryCategories: setInventoryCategoriesState,
      vendorCategories: setVendorCategoriesState,
      measurementUnits: setMeasurementUnitsState,
      paymentMethods: setPaymentMethodsState,
      incomeCategories: setIncomeCategoriesState,
      employeeRoles: setEmployeeRolesState,
      toolConditions: setToolConditionsState,
      toolCategories: setToolCategoriesState,
      materialDamageReasons: setMaterialDamageReasonsState,
      industryTypes: setIndustryTypesState,
      bankAccounts: setBankAccountsState,
      hsnCodes: setHsnCodesState,
      sacCodes: setSacCodesState,
      panelBrands: setPanelBrandsState,
      inverterBrands: setInverterBrandsState,
      structureTypes: setStructureTypesState,
      systemCapacities: setSystemCapacitiesState,
      quotationMaterialCategories: setQuotationMaterialCategoriesState,
      quotationChecklistItems: setQuotationChecklistItemsState,
    };
    return setterMap[categoryId];
  };

  const addMasterItem = (categoryId: string, item: MasterItem) => {
    const setter = getStateSetterForCategory(categoryId);
    if (setter) {
      setter(prev => [...prev, item]);
    }
  };

  const updateMasterItem = (categoryId: string, itemValue: string, updates: Partial<MasterItem>) => {
    const setter = getStateSetterForCategory(categoryId);
    if (setter) {
      setter(prev => prev.map(item => 
        item.value === itemValue ? { ...item, ...updates } : item
      ));
    }
  };

  const deleteMasterItem = (categoryId: string, itemValue: string) => {
    const setter = getStateSetterForCategory(categoryId);
    if (setter) {
      setter(prev => prev.filter(item => item.value !== itemValue));
    }
  };

  const addBankAccount = (account: MasterItem) => {
    setBankAccountsState(prev => [...prev, account]);
  };

  const deleteBankAccount = (accountValue: string) => {
    setBankAccountsState(prev => prev.filter(acc => acc.value !== accountValue));
  };

  return (
    <MastersContext.Provider
      value={{
        getProjectTypes,
        getProjectCategories,
        getProjectOwnerTypes,
        getProjectSources,
        getProjectStatuses,
        getProgressStages,
        getSiteExpenseCategories,
        getCompanyExpenseCategories,
        getEmployeeExpenseCategories,
        getOwnerExpenseCategories,
        getOutsourceWorkTags,
        getLoanSources,
        getPayerTypes,
        getPartnerTypes,
        getPartnerTransactionTypes,
        getSubCategories,
        getLabourSubCategories,
        getTransportSubCategories,
        getMaterialSubCategories,
        getCommissionSubCategories,
        getOutsourceSubCategories,
        getInventoryCategories,
        getVendorCategories,
        getMeasurementUnits,
        getPaymentMethods,
        getIncomeCategories,
        getEmployeeRoles,
        getTeamRoles,
        getInvoiceStatuses,
        getTransactionTypes,
        getToolConditions,
        getToolStatuses,
        getToolCategories,
        getMaterialDamageReasons,
        getDashboardTimeFilters,
        getIndustryTypes,
        getCostAllocationOptions,
        getBankAccounts,
        getHsnCodes,
        getSacCodes,
        getGstRates,
        getStateCodes,
        getPanelBrands,
        getInverterBrands,
        getStructureTypes,
        getSystemCapacities,
        getQuotationMaterialCategories,
        getQuotationChecklistItems,
        getSiteChecklistPresets,
        getAllMasterCategories,
        getMasterGroups,
        getCategoryById,
        addMasterItem,
        updateMasterItem,
        deleteMasterItem,
        addBankAccount,
        deleteBankAccount,
      }}
    >
      {children}
    </MastersContext.Provider>
  );
};

export const useMasters = () => {
  const context = useContext(MastersContext);
  if (!context) {
    throw new Error("useMasters must be used within a MastersProvider");
  }
  return context;
};

export default MastersContext;

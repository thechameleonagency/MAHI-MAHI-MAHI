# 📋 Input Field Registry

> Auto-generated on **2026-04-29** — 958 fields across 72 files

## Summary

| Metric | Value |
|--------|-------|
| Total input fields | **958** |
| Files with inputs | **72** |
| Fields in modals | **143** |
| Dynamic (.map) fields | **94** |
| Wrapper components | **121** |

## By Component Type

| Component | Count |
|-----------|-------|
| `<Input>` | 434 |
| `<Select>` | 208 |
| `<Checkbox>` | 54 |
| `<Textarea>` | 48 |
| `<TablePaginationBar>` | 47 |
| `<Calendar>` | 25 |
| `<MiniMetric>` | 25 |
| `<LineItem>` | 10 |
| `<TabCard>` | 9 |
| `<MultiSelectFilter>` | 7 |
| `<Settings>` | 6 |
| `<UnifiedExpenseModal>` | 4 |
| `<UnitButtonGroup>` | 4 |
| `<Icon>` | 3 |
| `<SidebarContext>` | 3 |
| `<Dashboard>` | 2 |
| `<StepIcon>` | 2 |
| `<AgentFormFields>` | 2 |
| `<RadioGroupItem>` | 2 |
| `<Switch>` | 2 |
| `<NeedToGetModal>` | 2 |
| `<ItemCard>` | 2 |
| `<ActiveSites>` | 1 |
| `<Projects>` | 1 |
| `<ProjectDetail>` | 1 |
| `<Quotations>` | 1 |
| `<Enquiries>` | 1 |
| `<Agents>` | 1 |
| `<AgentDetail>` | 1 |
| `<Customers>` | 1 |
| `<CustomerDetail>` | 1 |
| `<Invoices>` | 1 |
| `<Inventory>` | 1 |
| `<Materials>` | 1 |
| `<Tools>` | 1 |
| `<Employees>` | 1 |
| `<EmployeeProfile>` | 1 |
| `<Attendance>` | 1 |
| `<Finance>` | 1 |
| `<Vendors>` | 1 |
| `<VendorDetail>` | 1 |
| `<Loans>` | 1 |
| `<LoanPersonDetail>` | 1 |
| `<Partners>` | 1 |
| `<PartnerDetail>` | 1 |
| `<Timeline>` | 1 |
| `<Analytics>` | 1 |
| `<Notifications>` | 1 |
| `<AuditDashboard>` | 1 |
| `<ChartOfAccounts>` | 1 |
| `<ProfitLoss>` | 1 |
| `<GSTCompliance>` | 1 |
| `<CashBankLedger>` | 1 |
| `<ExpenseAudit>` | 1 |
| `<FixedAssets>` | 1 |
| `<AuditLogs>` | 1 |
| `<DesignSystem>` | 1 |
| `<ClientSelectionModal>` | 1 |
| `<Sidebar>` | 1 |
| `<TopHeader>` | 1 |
| `<GlobalSearch>` | 1 |
| `<ImageViewerModal>` | 1 |
| `<CreateMasterModal>` | 1 |
| `<EntityInfoModal>` | 1 |
| `<ActiveSitesFilters>` | 1 |
| `<RadioGroup>` | 1 |
| `<BankReconciliationModal>` | 1 |
| `<ChartDetailLedgerTable>` | 1 |
| `<CategoryExpenseLinesTable>` | 1 |
| `<TaskAssignmentModal>` | 1 |
| `<UnifiedIncomeModal>` | 1 |
| `<InvoiceCreateDialog>` | 1 |
| `<DetailModal>` | 1 |
| `<ProgressReportTab>` | 1 |
| `<MaterialsSentTab>` | 1 |
| `<PaymentRecipient>` | 1 |
| `<ClientPaymentHistory>` | 1 |
| `<DeletionRequestModal>` | 1 |
| `<MastersTab>` | 1 |

## By Input Type

| Type | Count |
|------|-------|
| text | 423 |
| select | 208 |
| number | 157 |
| checkbox | 54 |
| date | 53 |
| textarea | 48 |
| email | 4 |
| password | 3 |
| file | 2 |
| time | 2 |
| switch | 2 |
| month | 1 |
| {selectedType} | 1 |

## Component Wrapper Graph

These custom components wrap input primitives:

- `<MultiSelectFilter>` → `<Input>`, `<Checkbox>`
- `<ActiveSitesFilters>` → `<Input>`
- `<BANK_CHARGE_KEYWORDS>` → `<Input>`
- `<BankReconciliationModal>` → `<Input>`
- `<TablePaginationBar>` → `<Select>`
- `<TaskAssignmentModal>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<AddExpenseModal>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<INVENTORY_ITEMS_FOR_EXPENSE>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<MAIN_CAT_ICONS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<PAYER_ICONS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<PAYER_LABELS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<UnifiedExpenseModal>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<UnifiedIncomeModal>` → `<Input>`, `<Select>`, `<Textarea>`
- `<ClientSelectionModal>` → `<Input>`
- `<SERVICE_PRESETS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<InvoiceCreateDialog>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<GlobalSearch>` → `<Input>`
- `<TopHeader>` → `<Select>`
- `<GROUP_LABELS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<GROUP_MERGE_HINT>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<NeedToGetModal>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<AssignMaterialModal>` → `<Input>`, `<Checkbox>`
- `<PAYMENT_MODES>` → `<Input>`, `<Select>`, `<Textarea>`
- `<RECIPIENT_OPTIONS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<STAGE_OPTIONS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<ClientPaymentHistory>` → `<Input>`, `<Select>`, `<Textarea>`
- `<FoodOthersExpenseTable>` → `<Input>`, `<Select>`
- `<CATEGORY_ORDER>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<MaterialsSentTab>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<PartnerDistributionCard>` → `<Input>`, `<Select>`, `<Textarea>`
- `<TIMELINE_STEPS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<FILE_LOGIN_STEPS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<SUBSIDY_OPTIONS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<DISCOM_ITEMS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<LOAN_STAGES>` → `<Input>`, `<Select>`, `<Textarea>`
- `<DCR_STEPS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<PROJECT_STAGES>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<TASK_TYPES>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<PRIORITIES>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<TRANSPORT_MATERIAL_MAP>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<ProgressReportTab>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<StepIcon>` → `<Input>`, `<Select>`, `<Textarea>`
- `<ProjectConfirmationScreen>` → `<Calendar>`
- `<CreateMasterModal>` → `<Input>`
- `<MastersTab>` → `<Input>`
- `<BillPreviewModal>` → `<Calendar>`
- `<DeletionRequestModal>` → `<Select>`, `<Textarea>`
- `<EntityInfoModal>` → `<Calendar>`
- `<ImageViewerModal>` → `<Input>`
- `<SIDEBAR_COOKIE_NAME>` → `<Input>`
- `<SIDEBAR_COOKIE_MAX_AGE>` → `<Input>`
- `<SIDEBAR_WIDTH>` → `<Input>`
- `<SIDEBAR_WIDTH_MOBILE>` → `<Input>`
- `<SIDEBAR_WIDTH_ICON>` → `<Input>`
- `<SIDEBAR_KEYBOARD_SHORTCUT>` → `<Input>`
- `<SidebarContext>` → `<Input>`
- `<SidebarProvider>` → `<Input>`
- `<Sidebar>` → `<Input>`
- `<SidebarTrigger>` → `<Input>`
- `<SidebarRail>` → `<Input>`
- `<SidebarInset>` → `<Input>`
- `<SidebarInput>` → `<Input>`
- `<WORK_STATUS_ITEMS>` → `<Input>`, `<Select>`, `<Textarea>`
- `<ActiveSites>` → `<Input>`, `<Select>`, `<Textarea>`
- `<AgentDetail>` → `<Input>`, `<Select>`, `<Textarea>`
- `<Agents>` → `<Input>`, `<Select>`
- `<AgentFormFields>` → `<Input>`, `<Select>`
- `<Analytics>` → `<Select>`, `<Checkbox>`
- `<Attendance>` → `<Checkbox>`, `<Switch>`, `<RadioGroup>`, `<RadioGroupItem>`, `<Calendar>`
- `<AuditDashboard>` → `<Select>`
- `<AuditLogs>` → `<Select>`
- `<CashBankLedger>` → `<Select>`
- `<ChartDetailLedgerTable>` → `<Input>`
- `<ChartOfAccounts>` → `<Input>`
- `<CategoryExpenseLinesTable>` → `<Select>`
- `<MAIN_CATEGORIES>` → `<Select>`
- `<ExpenseAudit>` → `<Select>`
- `<DEPRECIATION_RATE>` → `<Select>`
- `<USEFUL_LIFE_YEARS>` → `<Select>`
- `<FixedAssets>` → `<Select>`
- `<MONTHS>` → `<Select>`
- `<GSTCompliance>` → `<Select>`
- `<EXPENSE_PL_MAP>` → `<Select>`
- `<ProfitLoss>` → `<Select>`
- `<LineItem>` → `<Select>`
- `<CustomerDetail>` → `<Input>`, `<Select>`, `<Textarea>`
- `<Customers>` → `<Input>`, `<Select>`
- `<Dashboard>` → `<Calendar>`
- `<Icon>` → `<Calendar>`
- `<DesignSystem>` → `<Input>`, `<Checkbox>`, `<Switch>`
- `<EmployeeProfile>` → `<Input>`, `<Select>`, `<Calendar>`
- `<Employees>` → `<Input>`, `<Select>`, `<Checkbox>`
- `<Enquiries>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<Finance>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<Inventory>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<Invoices>` → `<Input>`, `<Select>`
- `<LoanPersonDetail>` → `<Input>`, `<Textarea>`
- `<Loans>` → `<Input>`, `<Select>`, `<Calendar>`
- `<UNIT_OPTIONS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<UNIT_LABELS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<Materials>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<SCRAP_ELIGIBLE_IDS>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<UnitButtonGroup>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<ItemCard>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<DetailModal>` → `<Calendar>`
- `<Notifications>` → `<Calendar>`
- `<PartnerDetail>` → `<Input>`, `<Select>`
- `<Partners>` → `<Input>`, `<Select>`
- `<Presets>` → `<Input>`, `<Select>`
- `<TabCard>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<MiniMetric>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<PaymentRecipient>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<OUTSRC_META>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<ProjectDetail>` → `<Input>`, `<Select>`, `<Textarea>`, `<Calendar>`
- `<Projects>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`
- `<Quotations>` → `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Calendar>`
- `<Settings>` → `<Input>`, `<Select>`
- `<Timeline>` → `<Select>`, `<Calendar>`
- `<Tools>` → `<Input>`, `<Select>`, `<Textarea>`
- `<VendorDetail>` → `<Input>`, `<Select>`, `<Textarea>`
- `<Vendors>` → `<Input>`, `<Select>`

## Fields By File

### Quotations.tsx
📁 `src/pages/Quotations.tsx` — 69 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Reference, customer, or phone" | — | 1080 |
| 2 | `<Select>` | select | — | — | — | 1089 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 1190 |
| 4 | `<Input>` | number | Temporary Amount (₹) | — | Save Quotation Amounts | 1369 |
| 5 | `<Input>` | number | Final Amount (₹) | — | Save Quotation Amounts | 1377 |
| 6 | `<Input>` | text | Reference | — | — | 1433 |
| 7 | `<Input>` | text | Client Name * | — | — | 1441 |
| 8 | `<Input>` | text | Phone | — | — | 1445 |
| 9 | `<Input>` | text | Email | — | — | 1449 |
| 10 | `<Input>` | text | City | — | — | 1453 |
| 11 | `<Input>` | text | State | — | — | 1457 |
| 12 | `<Select>` | select | Select Preset (Optional) | — | — | 1471 |
| 13 | `<Select>` | select | Category | — | — | 1515 |
| 14 | `<Select>` | select | System Capacity (kW) | — | — | 1528 |
| 15 | `<Input>` | text | Panel Brand | — | — | 1562 |
| 16 | `<Input>` | text | Panel Wattage | — | — | 1566 |
| 17 | `<Input>` | text | Panel Count | — | — | 1570 |
| 18 | `<Input>` | text | Inverter Brand | — | — | 1576 |
| 19 | `<Input>` | text | Inverter Capacity | — | — | 1580 |
| 20 | `<Input>` | text | Structure Type | — | — | 1584 |
| 21 | `<Input>` | text | Floor Height | — | — | 1589 |
| 22 | `<Textarea>` | textarea | System Notes / Description | — | — | 1595 |
| 23 | `<Input>` | number | — | "{effectivePrice.toString()}" | — | 1707 |
| 24 | `<Input>` | number | Client Agreed Amount * | "{effectivePrice.toString()}" | — | 1727 |
| 25 | `<Input>` | number | — | — | 🔄 .map(materials) | 1800 |
| 26 | `<Input>` | number | — | — | 🔄 .map(materials) | 1808 |
| 27 | `<Input>` | text | — | "Add description for this item (optional)" | 🔄 .map(materials) | 1832 |
| 28 | `<Input>` | number | — | — | — | 1882 |
| 29 | `<Input>` | number | — | — | — | 1900 |
| 30 | `<Input>` | number | — | — | — | 1918 |
| 31 | `<Input>` | text | — | — | — | 1944 |
| 32 | `<Input>` | text | — | — | — | 1948 |
| 33 | `<Input>` | text | — | — | — | 1952 |
| 34 | `<Input>` | text | — | — | — | 1956 |
| 35 | `<Input>` | text | — | — | — | 1969 |
| 36 | `<Input>` | text | — | — | — | 1973 |
| 37 | `<Input>` | text | — | — | — | 1977 |
| 38 | `<Input>` | text | — | — | — | 1981 |
| 39 | `<Input>` | text | — | — | — | 1985 |
| 40 | `<Select>` | select | Load Preset | — | — | 2010 |
| 41 | `<Checkbox>` | checkbox | — | — | — | 2036 |
| 42 | `<Checkbox>` | checkbox | — | — | — | 2043 |
| 43 | `<Checkbox>` | checkbox | — | — | — | 2050 |
| 44 | `<Checkbox>` | checkbox | — | — | — | 2057 |
| 45 | `<Checkbox>` | checkbox | — | — | — | 2064 |
| 46 | `<Checkbox>` | checkbox | — | — | — | 2071 |
| 47 | `<Checkbox>` | checkbox | — | — | — | 2078 |
| 48 | `<Textarea>` | textarea | — | — | — | 2094 |
| 49 | `<Select>` | select | Category | — | Add Material Item | 2430 |
| 50 | `<Select>` | select | Unit | — | Add Material Item | 2447 |
| 51 | `<Input>` | text | Item Name | "Enter item name" | Add Material Item | 2464 |
| 52 | `<Input>` | text | Size/Specifications | "e.g., 4sqmm, 540W" | Add Material Item | 2472 |
| 53 | `<Input>` | number | Quantity | "0" | — | 2481 |
| 54 | `<Input>` | number | Rate (₹) | "0" | — | 2490 |
| 55 | `<Input>` | text | Template Name | "e.g., Standard 5kW Residential" | — | 2577 |
| 56 | `<Input>` | text | {shareMethod === "email" ? "Email Address" : "Mobile Number"} | "{shareMethod === "email" ? "email@example.com" : "+91 XXXXX XXXXX"}" | — | 2688 |
| 57 | `<Calendar>` | text | — | — | — | 2708 |
| 58 | `<Input>` | date | — | — | — | 2711 |
| 59 | `<Input>` | time | — | — | — | 2722 |
| 60 | `<Textarea>` | textarea | Notes (Optional) | "Any notes about the visit..." | — | 2731 |
| 61 | `<Select>` | select | Project kind | — | — | 2784 |
| 62 | `<Select>` | select | Partner | — | — | 2807 |
| 63 | `<Input>` | number | Profit share (%) | — | — | 2825 |
| 64 | `<Input>` | number | MSS backend (₹) | — | — | 2833 |
| 65 | `<Input>` | number | Partner sell (₹) | — | — | 2837 |
| 66 | `<Input>` | number | Vendorship fee | — | — | 2846 |
| 67 | `<Input>` | text | External network notes | — | — | 2850 |
| 68 | `<Input>` | text | Preset Name | "e.g., Standard Quote, Minimal Preview" | — | 2910 |
| 69 | `<Textarea>` | textarea | Reason for Deletion * | "Please explain why this quotation should be deleted..." | — | 3012 |

### Projects.tsx
📁 `src/pages/Projects.tsx` — 55 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search name, client, or ID" | — | 812 |
| 2 | `<Select>` | select | — | — | — | 819 |
| 3 | `<Select>` | select | — | — | — | 829 |
| 4 | `<Select>` | select | — | — | — | 839 |
| 5 | `<Select>` | select | — | — | 🔄 .map(filteredProjects) | 1161 |
| 6 | `<TablePaginationBar>` | text | — | — | — | 1259 |
| 7 | `<Select>` | select | — | — | 🔄 .map(pagedFilteredProjects) | 1308 |
| 8 | `<UnifiedExpenseModal>` | text | — | — | — | 1403 |
| 9 | `<Select>` | select | {selectedProjectKind === "SOLO_EPC" ? "1. Select confirmed quotation" : "1. Quotation (optional)"} | — | — | 1561 |
| 10 | `<Select>` | select | Partner | — | — | 1721 |
| 11 | `<Select>` | select | Partner type | — | — | 1736 |
| 12 | `<Input>` | number | Profit share (%) | "%" | — | 1750 |
| 13 | `<Input>` | number | Fixed partner amount | "Amount" | — | 1761 |
| 14 | `<Input>` | number | Vendorship fee | "Fee payable by partner" | — | 1772 |
| 15 | `<Input>` | text | Party Name | "Enter party/contractor name" | — | 1795 |
| 16 | `<Input>` | text | Party Contact | "Phone number" | — | 1803 |
| 17 | `<Input>` | number | Total Contract Value (₹) | "Value agreed with party" | — | 1813 |
| 18 | `<Input>` | number | Amount Payable to Party (₹) | "Amount to pay party" | — | 1822 |
| 19 | `<Input>` | number | MSS backend / fixed (₹) | — | — | 1839 |
| 20 | `<Input>` | number | Partner sell to customer (₹) | — | — | 1843 |
| 21 | `<Input>` | text | Channel partner | — | — | 1855 |
| 22 | `<Input>` | text | External network | — | — | 1859 |
| 23 | `<Input>` | number | Internal cost estimate (₹) | — | — | 1868 |
| 24 | `<Select>` | select | — | — | — | 1911 |
| 25 | `<Checkbox>` | checkbox | {projectCategorySelection === "solar" ? (projectType ? "7" : "6") : "4"}. Commission / Referral | — | — | 1968 |
| 26 | `<Select>` | select | Select Agent | — | — | 1985 |
| 27 | `<Select>` | select | Rate Type | — | — | 2013 |
| 28 | `<Input>` | number | {commissionRateType === "per-kw" ? "Rate per kW (₹)" : "Flat Amount (₹)"} | — | — | 2030 |
| 29 | `<Input>` | text | Project Name | "Enter project name" | — | 2426 |
| 30 | `<Input>` | text | Client Name | "Enter client name" | — | 2436 |
| 31 | `<Input>` | text | Referred By | "Enter referral source" | — | 2444 |
| 32 | `<Input>` | text | Site Location | "Enter site location" | — | 2454 |
| 33 | `<Select>` | select | Category | — | — | 2464 |
| 34 | `<Input>` | number | Capacity (kW) | "e.g., 5" | — | 2477 |
| 35 | `<Input>` | number | Contract Value (₹) | "Enter contract value" | — | 2488 |
| 36 | `<Select>` | select | Partner | — | — | 2515 |
| 37 | `<Select>` | select | Partner type | — | — | 2530 |
| 38 | `<Input>` | number | Profit share (%) | "%" | — | 2544 |
| 39 | `<Input>` | number | Fixed partner amount | "Amount" | — | 2555 |
| 40 | `<Input>` | number | Vendorship fee | "Fee payable by partner" | — | 2566 |
| 41 | `<Input>` | text | Party Name | "Enter party/contractor name" | — | 2589 |
| 42 | `<Input>` | text | Party Contact | "Phone number" | — | 2597 |
| 43 | `<Input>` | number | Total Contract Value (₹) | "Value agreed with party" | — | 2607 |
| 44 | `<Input>` | number | Amount Payable to Party (₹) | "Amount to pay party" | — | 2616 |
| 45 | `<Select>` | select | Select Stage | — | — | 2690 |
| 46 | `<Input>` | number | No. of Workers | "e.g., 4" | — | 2745 |
| 47 | `<Input>` | number | Days | "e.g., 6" | — | 2754 |
| 48 | `<Input>` | number | Rate/Day (₹) | "e.g., 600" | — | 2763 |
| 49 | `<Textarea>` | textarea | Description | "Describe the work done..." | — | 2774 |
| 50 | `<Select>` | select | Work Type / Tag | — | — | 2797 |
| 51 | `<Input>` | text | — | "Or create custom tag..." | — | 2818 |
| 52 | `<Input>` | number | Quantity ({outsourceWorkTags.find(t => t.value === outsourceWorkTag)?.unit || "units"}) | "Enter quantity" | — | 2839 |
| 53 | `<Input>` | number | Amount (₹) | "Enter amount" | — | 2848 |
| 54 | `<Textarea>` | textarea | Work Note | "Additional notes about this work..." | — | 2860 |
| 55 | `<DeletionRequestModal>` | text | — | — | — | 2898 |

### Materials.tsx
📁 `src/pages/Materials.tsx` — 52 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search materials" | — | 535 |
| 2 | `<Select>` | select | — | — | — | 543 |
| 3 | `<ItemCard>` | text | — | — | 🔄 .map(items) | 694 |
| 4 | `<ItemCard>` | text | — | — | 🔄 .map(items) | 705 |
| 5 | `<Input>` | text | Item Name * | — | — | 814 |
| 6 | `<Select>` | select | Category * | — | — | 819 |
| 7 | `<Input>` | text | Size / Spec | — | — | 830 |
| 8 | `<UnitButtonGroup>` | text | Size / Spec | — | — | 835 |
| 9 | `<UnitButtonGroup>` | text | — | — | — | 838 |
| 10 | `<Input>` | number | Purchase Rate (₹) | — | — | 844 |
| 11 | `<Input>` | number | Sale Rate (₹) | — | — | 848 |
| 12 | `<Input>` | number | Purchase Qty ({UNIT_LABELS[newItemPurchaseUnit]}) | — | — | 869 |
| 13 | `<Input>` | number | {conv.label} | — | — | 875 |
| 14 | `<Input>` | number | {conv.label} | — | — | 883 |
| 15 | `<Input>` | text | HSN Code | — | — | 907 |
| 16 | `<Input>` | number | Min. Stock | — | — | 911 |
| 17 | `<Textarea>` | textarea | Notes | — | — | 916 |
| 18 | `<Checkbox>` | checkbox | Notes | — | — | 919 |
| 19 | `<Input>` | text | Item Name | — | — | 956 |
| 20 | `<Select>` | select | Category | — | — | 961 |
| 21 | `<Input>` | text | Size / Spec | — | — | 972 |
| 22 | `<UnitButtonGroup>` | text | Size / Spec | — | — | 977 |
| 23 | `<UnitButtonGroup>` | text | Size / Spec | — | — | 980 |
| 24 | `<Input>` | number | Purchase Rate (₹) | — | — | 985 |
| 25 | `<Input>` | number | Sale Rate (₹) | — | — | 989 |
| 26 | `<Input>` | number | Current Stock | — | — | 1011 |
| 27 | `<Input>` | number | Add Stock | — | — | 1015 |
| 28 | `<Input>` | number | Current Stock ({UNIT_LABELS[editIssueUnit]}) | — | — | 1034 |
| 29 | `<Input>` | number | Purchase Qty ({UNIT_LABELS[editPurchaseUnit]}) | — | — | 1040 |
| 30 | `<Input>` | number | {conv.label} | — | — | 1046 |
| 31 | `<Input>` | number | {conv.label} | — | — | 1054 |
| 32 | `<Input>` | text | HSN Code | — | — | 1084 |
| 33 | `<Input>` | number | Min. Stock Alert | — | — | 1088 |
| 34 | `<Textarea>` | textarea | Notes | — | — | 1093 |
| 35 | `<Checkbox>` | checkbox | Notes | — | — | 1096 |
| 36 | `<Select>` | select | Select Site * | — | — | 1191 |
| 37 | `<Input>` | text | Select Items | "Search inventory items..." | — | 1204 |
| 38 | `<Checkbox>` | checkbox | — | — | 🔄 .map(filteredIssueItems) | 1215 |
| 39 | `<Input>` | number | Qty: | — | 🔄 .map(filteredIssueItems) | 1230 |
| 40 | `<Checkbox>` | checkbox | — | — | — | 1247 |
| 41 | `<Select>` | select | Expense Type | — | — | 1255 |
| 42 | `<Input>` | number | Amount (₹) | "0" | — | 1266 |
| 43 | `<Input>` | text | Amount (₹) | "Expense notes (optional)" | — | 1269 |
| 44 | `<Checkbox>` | checkbox | — | — | — | 1277 |
| 45 | `<Select>` | select | Assign To * | — | — | 1287 |
| 46 | `<Input>` | date | Task Date | — | — | 1298 |
| 47 | `<Textarea>` | textarea | Task Date | "Task notes (optional)" | — | 1301 |
| 48 | `<Select>` | select | Select Site | — | — | 1341 |
| 49 | `<Select>` | select | Action | — | — | 1355 |
| 50 | `<Input>` | number | — | "Qty" | 🔄 .map(scrapEligibleItems) | 1411 |
| 51 | `<Input>` | number | — | "Qty to convert back" | 🔄 .map(scrapEligibleItems) | 1462 |
| 52 | `<NeedToGetModal>` | text | — | — | — | 1491 |

### ProjectDetail.tsx
📁 `src/pages/ProjectDetail.tsx` — 52 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 411 |
| 2 | `<ProgressReportTab>` | text | — | — | — | 445 |
| 3 | `<MaterialsSentTab>` | text | — | — | — | 477 |
| 4 | `<TabCard>` | text | — | — | — | 496 |
| 5 | `<MiniMetric>` | text | — | — | — | 498 |
| 6 | `<MiniMetric>` | text | — | — | — | 499 |
| 7 | `<MiniMetric>` | text | — | — | — | 500 |
| 8 | `<MiniMetric>` | text | — | — | — | 501 |
| 9 | `<TabCard>` | text | — | — | — | 512 |
| 10 | `<MiniMetric>` | text | — | — | — | 514 |
| 11 | `<MiniMetric>` | text | — | — | — | 515 |
| 12 | `<MiniMetric>` | text | — | — | — | 516 |
| 13 | `<MiniMetric>` | text | — | — | — | 517 |
| 14 | `<MiniMetric>` | text | — | — | — | 518 |
| 15 | `<TabCard>` | text | — | — | — | 524 |
| 16 | `<MiniMetric>` | text | — | — | — | 526 |
| 17 | `<MiniMetric>` | text | — | — | — | 527 |
| 18 | `<MiniMetric>` | text | — | — | — | 528 |
| 19 | `<MiniMetric>` | text | — | — | — | 529 |
| 20 | `<MiniMetric>` | text | — | — | — | 530 |
| 21 | `<TabCard>` | text | — | — | — | 537 |
| 22 | `<MiniMetric>` | text | — | — | — | 539 |
| 23 | `<MiniMetric>` | text | — | — | — | 540 |
| 24 | `<MiniMetric>` | text | — | — | — | 541 |
| 25 | `<PaymentRecipient>` | text | — | — | 🔄 .map(projectPayments) | 584 |
| 26 | `<TabCard>` | text | — | — | — | 596 |
| 27 | `<MiniMetric>` | text | — | — | — | 598 |
| 28 | `<MiniMetric>` | text | — | — | — | 599 |
| 29 | `<MiniMetric>` | text | — | — | — | 600 |
| 30 | `<MiniMetric>` | text | — | — | — | 601 |
| 31 | `<TabCard>` | text | — | — | — | 631 |
| 32 | `<MiniMetric>` | text | — | — | — | 633 |
| 33 | `<MiniMetric>` | text | — | — | — | 634 |
| 34 | `<MiniMetric>` | text | — | — | — | 635 |
| 35 | `<MiniMetric>` | text | — | — | — | 636 |
| 36 | `<TabCard>` | text | — | — | — | 639 |
| 37 | `<TabCard>` | text | — | — | — | 659 |
| 38 | `<ClientPaymentHistory>` | text | — | — | — | 685 |
| 39 | `<TabCard>` | text | — | — | — | 696 |
| 40 | `<Input>` | text | Project Name | — | Edit Project | 737 |
| 41 | `<Input>` | text | Client | — | Edit Project | 738 |
| 42 | `<Input>` | text | Location | — | Edit Project | 740 |
| 43 | `<Input>` | number | Capacity (kW) | — | Edit Project | 741 |
| 44 | `<Input>` | number | Contract Value (₹) | — | Edit Project | 743 |
| 45 | `<Input>` | number | Workers | "0" | Edit Project | 763 |
| 46 | `<Input>` | number | Days | "0" | Edit Project | 764 |
| 47 | `<Input>` | number | Rate/Day (₹) | "0" | Edit Project | 765 |
| 48 | `<Textarea>` | textarea | Description | "What work was done..." | — | 772 |
| 49 | `<Select>` | select | Work Type | — | — | 777 |
| 50 | `<Input>` | number | Amount (₹) | "0" | — | 785 |
| 51 | `<Textarea>` | textarea | Notes | "Details..." | — | 786 |
| 52 | `<UnifiedExpenseModal>` | text | — | — | — | 798 |

### Inventory.tsx
📁 `src/pages/Inventory.tsx` — 48 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search inventory..." | — | 436 |
| 2 | `<Select>` | select | — | — | — | 445 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 478 |
| 4 | `<Input>` | text | — | "Search tools..." | — | 555 |
| 5 | `<Select>` | select | — | — | — | 564 |
| 6 | `<TablePaginationBar>` | text | — | — | — | 601 |
| 7 | `<Input>` | text | Item Name | "e.g., Waaree 540W Panel" | Add Inventory Item | 691 |
| 8 | `<Select>` | select | Category | — | Add Inventory Item | 696 |
| 9 | `<Select>` | select | Unit | — | Add Inventory Item | 709 |
| 10 | `<Input>` | number | Purchase Rate (₹) | "0" | Add Inventory Item | 727 |
| 11 | `<Input>` | number | Sale Rate (₹) | "0" | Add Inventory Item | 731 |
| 12 | `<Input>` | number | Initial Quantity | "0" | Add Inventory Item | 737 |
| 13 | `<Input>` | text | HSN Code | "e.g., 8541" | Add Inventory Item | 741 |
| 14 | `<Select>` | select | GST Rate (%) * | — | Add Inventory Item | 747 |
| 15 | `<Input>` | number | Min. Stock Alert | "0" | — | 763 |
| 16 | `<Textarea>` | textarea | Notes | "Additional notes..." | — | 768 |
| 17 | `<Input>` | text | Item Name | — | — | 804 |
| 18 | `<Select>` | select | Category | — | — | 809 |
| 19 | `<Select>` | select | Unit | — | — | 822 |
| 20 | `<Input>` | number | Purchase Rate (₹) | — | — | 840 |
| 21 | `<Input>` | number | Sale Rate (₹) | — | — | 844 |
| 22 | `<Input>` | number | Current Stock | — | — | 850 |
| 23 | `<Input>` | text | HSN Code | — | — | 854 |
| 24 | `<Input>` | number | Min. Stock Alert | — | — | 859 |
| 25 | `<Textarea>` | textarea | Notes | — | — | 863 |
| 26 | `<Select>` | select | Select Site | — | — | 985 |
| 27 | `<Checkbox>` | checkbox | Select Items | — | — | 1002 |
| 28 | `<Input>` | number | Qty: | — | — | 1014 |
| 29 | `<Select>` | select | Select Site | — | — | 1065 |
| 30 | `<Select>` | select | Action | — | — | 1081 |
| 31 | `<Input>` | number | Return Qty: | — | 🔄 .map(items) | 1104 |
| 32 | `<Input>` | text | Tool Name | "e.g., Drill Machine" | — | 1166 |
| 33 | `<Select>` | select | Category | — | — | 1170 |
| 34 | `<Input>` | number | Purchase Rate (₹) | "0" | — | 1184 |
| 35 | `<Input>` | date | Purchase Date | — | — | 1188 |
| 36 | `<Select>` | select | Condition | — | — | 1193 |
| 37 | `<Select>` | select | Action | — | — | 1237 |
| 38 | `<Select>` | select | Select Tool | — | — | 1249 |
| 39 | `<Select>` | select | {issueToolAction === "transfer" ? "Transfer to Site" : "Assign to Site"} | — | — | 1281 |
| 40 | `<Select>` | select | Assign to Person | — | — | 1294 |
| 41 | `<Input>` | text | Tool Name | — | — | 1404 |
| 42 | `<Select>` | select | Category | — | — | 1408 |
| 43 | `<Input>` | number | Purchase Rate (₹) | — | — | 1422 |
| 44 | `<Input>` | date | Purchase Date | — | — | 1426 |
| 45 | `<Select>` | select | Condition | — | — | 1431 |
| 46 | `<Select>` | select | Select Tool (Currently In Use) | — | — | 1489 |
| 47 | `<Select>` | select | Condition on Return | — | — | 1504 |
| 48 | `<Textarea>` | textarea | Notes (Optional) | "Any remarks about the tool condition..." | — | 1518 |

### ProgressReportTab.tsx
📁 `src/components/projects/ProgressReportTab.tsx` — 43 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<StepIcon>` | text | — | — | 🔄 .map(TIMELINE_STEPS) | 1444 |
| 2 | `<Calendar>` | text | — | — | 🔄 .map(pendingTickets) | 1508 |
| 3 | `<Calendar>` | text | — | — | 🔄 .map(activeBlockages) | 1684 |
| 4 | `<Calendar>` | text | — | — | 🔄 .map(resolvedBlockages) | 1767 |
| 5 | `<Input>` | number | — | "Amount" | — | 2157 |
| 6 | `<Input>` | number | — | "Amount" | — | 2197 |
| 7 | `<Checkbox>` | checkbox | — | — | 🔄 .map(WORK_STATUS_STAGES) | 2382 |
| 8 | `<Checkbox>` | checkbox | — | — | 🔄 .map(DISCOM_ITEMS) | 2745 |
| 9 | `<Input>` | number | 1st Instalment Amount | — | — | 2890 |
| 10 | `<Input>` | number | 2nd Instalment Amount | — | — | 2905 |
| 11 | `<Checkbox>` | checkbox | — | — | — | 2929 |
| 12 | `<Checkbox>` | checkbox | — | — | — | 2964 |
| 13 | `<Calendar>` | text | — | — | — | 3143 |
| 14 | `<Select>` | select | Resolved By * | — | Resolve Blockage | 3240 |
| 15 | `<Input>` | date | Resolution Date | — | — | 3258 |
| 16 | `<Textarea>` | textarea | Resolution Notes | "How was the blockage resolved?" | — | 3263 |
| 17 | `<Input>` | text | Blockage Title * | "e.g., Material shortage" | — | 3292 |
| 18 | `<Textarea>` | textarea | Reason * | "Why has work stopped?" | — | 3300 |
| 19 | `<Textarea>` | textarea | How to Solve | "Suggested solution" | — | 3308 |
| 20 | `<Input>` | date | Resolve By Date | — | — | 3317 |
| 21 | `<Select>` | select | Project Stage | — | — | 3325 |
| 22 | `<Select>` | select | Timeline Stage * | — | — | 3341 |
| 23 | `<Select>` | select | Sub-Stage | — | — | 3365 |
| 24 | `<Input>` | text | Or create new: | "Enter custom stage name..." | — | 3403 |
| 25 | `<Checkbox>` | checkbox | — | — | — | 3413 |
| 26 | `<Select>` | select | Assign To (optional) | — | — | 3428 |
| 27 | `<Textarea>` | textarea | Additional Notes | "Any other notes" | — | 3445 |
| 28 | `<Select>` | select | Task Type | — | — | 3470 |
| 29 | `<Select>` | select | Priority | — | — | 3483 |
| 30 | `<Input>` | text | Custom Task Type | "Enter task type" | — | 3499 |
| 31 | `<Textarea>` | textarea | Task Description * | "What needs to be done?" | — | 3509 |
| 32 | `<Textarea>` | textarea | How to Do (Instructions) | "Step-by-step instructions" | — | 3518 |
| 33 | `<Checkbox>` | checkbox | Assign To * | — | 🔄 .map(employees) | 3530 |
| 34 | `<Checkbox>` | checkbox | — | — | — | 3545 |
| 35 | `<Input>` | date | Due Date * | — | — | 3558 |
| 36 | `<Input>` | time | Due Time | — | — | 3566 |
| 37 | `<Select>` | select | Location | — | — | 3576 |
| 38 | `<Select>` | select | Link to Blockage (optional) | — | — | 3590 |
| 39 | `<Input>` | text | Notes (optional) | "Add any notes..." | — | 3627 |
| 40 | `<Textarea>` | textarea | Rejection Reason * | "e.g., Photo unclear - please retake with better lighting" | — | 3662 |
| 41 | `<Select>` | select | Assign To * | — | — | 3737 |
| 42 | `<Textarea>` | textarea | Notes | — | — | 3750 |
| 43 | `<ImageViewerModal>` | text | — | — | — | 3778 |

### Finance.tsx
📁 `src/pages/Finance.tsx` — 38 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 583 |
| 2 | `<UnifiedExpenseModal>` | text | — | — | — | 621 |
| 3 | `<UnifiedIncomeModal>` | text | — | — | — | 627 |
| 4 | `<Input>` | date | Invoice Date | — | Create New Invoice | 651 |
| 5 | `<Input>` | date | Due Date | — | Create New Invoice | 655 |
| 6 | `<Select>` | select | Place of Supply (State) | — | Create New Invoice | 659 |
| 7 | `<Select>` | select | Select from Project | — | Create New Invoice | 678 |
| 8 | `<Input>` | text | Client Name * | — | — | 698 |
| 9 | `<Input>` | text | GSTIN | — | — | 702 |
| 10 | `<Input>` | text | Address | — | — | 708 |
| 11 | `<Input>` | text | Contact | — | — | 712 |
| 12 | `<Input>` | text | Description | — | 🔄 .map(invoiceServices) | 736 |
| 13 | `<Select>` | select | SAC Code | — | 🔄 .map(invoiceServices) | 740 |
| 14 | `<Input>` | number | Rate (₹) | — | 🔄 .map(invoiceServices) | 751 |
| 15 | `<Select>` | select | GST % | — | 🔄 .map(invoiceServices) | 755 |
| 16 | `<Select>` | select | — | — | — | 785 |
| 17 | `<Input>` | text | Description | — | 🔄 .map(invoiceItems) | 823 |
| 18 | `<Select>` | select | HSN Code | — | 🔄 .map(invoiceItems) | 827 |
| 19 | `<Input>` | number | Qty | — | 🔄 .map(invoiceItems) | 838 |
| 20 | `<Input>` | number | Rate (₹) | — | 🔄 .map(invoiceItems) | 842 |
| 21 | `<Select>` | select | GST % | — | 🔄 .map(invoiceItems) | 846 |
| 22 | `<Input>` | text | Payment Terms | — | — | 910 |
| 23 | `<Select>` | select | Bank Account | — | — | 914 |
| 24 | `<Textarea>` | textarea | Notes / Terms & Conditions | — | — | 926 |
| 25 | `<Input>` | date | Bill Date | — | — | 935 |
| 26 | `<Input>` | date | Due Date | — | — | 939 |
| 27 | `<Select>` | select | Place of Supply (State) | — | — | 943 |
| 28 | `<Input>` | text | Client Name * | — | — | 963 |
| 29 | `<Input>` | text | GSTIN | — | — | 967 |
| 30 | `<Input>` | text | Address | — | — | 973 |
| 31 | `<Input>` | text | Contact | — | — | 977 |
| 32 | `<Checkbox>` | checkbox | — | — | 🔄 .map(inventoryItems) | 993 |
| 33 | `<Input>` | number | — | — | 🔄 .map(inventoryItems) | 1003 |
| 34 | `<Input>` | text | Payment Terms | — | — | 1048 |
| 35 | `<Select>` | select | Bank Account | — | — | 1052 |
| 36 | `<Select>` | select | Select Project | — | — | 1251 |
| 37 | `<Checkbox>` | checkbox | — | — | — | 1262 |
| 38 | `<Select>` | select | Include Invoices | — | — | 1267 |

### App.tsx
📁 `src/App.tsx` — 37 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Dashboard>` | text | — | — | — | 72 |
| 2 | `<ActiveSites>` | text | — | — | — | 73 |
| 3 | `<Projects>` | text | — | — | — | 74 |
| 4 | `<ProjectDetail>` | text | — | — | — | 79 |
| 5 | `<Quotations>` | text | — | — | — | 83 |
| 6 | `<Enquiries>` | text | — | — | — | 84 |
| 7 | `<Agents>` | text | — | — | — | 85 |
| 8 | `<AgentDetail>` | text | — | — | — | 86 |
| 9 | `<Customers>` | text | — | — | — | 87 |
| 10 | `<CustomerDetail>` | text | — | — | — | 88 |
| 11 | `<Invoices>` | text | — | — | — | 89 |
| 12 | `<Inventory>` | text | — | — | — | 91 |
| 13 | `<Materials>` | text | — | — | — | 92 |
| 14 | `<Tools>` | text | — | — | — | 93 |
| 15 | `<Employees>` | text | — | — | — | 96 |
| 16 | `<EmployeeProfile>` | text | — | — | — | 97 |
| 17 | `<Attendance>` | text | — | — | — | 98 |
| 18 | `<Finance>` | text | — | — | — | 99 |
| 19 | `<Vendors>` | text | — | — | — | 100 |
| 20 | `<VendorDetail>` | text | — | — | — | 101 |
| 21 | `<Loans>` | text | — | — | — | 102 |
| 22 | `<LoanPersonDetail>` | text | — | — | — | 103 |
| 23 | `<Partners>` | text | — | — | — | 104 |
| 24 | `<PartnerDetail>` | text | — | — | — | 105 |
| 25 | `<Timeline>` | text | — | — | — | 106 |
| 26 | `<Analytics>` | text | — | — | — | 107 |
| 27 | `<Notifications>` | text | — | — | — | 108 |
| 28 | `<Settings>` | text | — | — | — | 109 |
| 29 | `<AuditDashboard>` | text | — | — | — | 110 |
| 30 | `<ChartOfAccounts>` | text | — | — | — | 111 |
| 31 | `<ProfitLoss>` | text | — | — | — | 112 |
| 32 | `<GSTCompliance>` | text | — | — | — | 115 |
| 33 | `<CashBankLedger>` | text | — | — | — | 116 |
| 34 | `<ExpenseAudit>` | text | — | — | — | 117 |
| 35 | `<FixedAssets>` | text | — | — | — | 118 |
| 36 | `<AuditLogs>` | text | — | — | — | 119 |
| 37 | `<DesignSystem>` | text | — | — | — | 122 |

### UnifiedExpenseModal.tsx
📁 `src/components/expenses/UnifiedExpenseModal.tsx` — 37 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | Sub-category | — | — | 515 |
| 2 | `<Input>` | text | Specify Reason | — | — | 530 |
| 3 | `<Select>` | select | Select Project * | — | — | 538 |
| 4 | `<Select>` | select | Link to Project (Optional) | — | — | 553 |
| 5 | `<Select>` | select | Select Site/Project * | — | — | 597 |
| 6 | `<Select>` | select | Select Partner * | — | — | 612 |
| 7 | `<Select>` | select | Select Partner * | — | — | 629 |
| 8 | `<Checkbox>` | checkbox | {category === "employee-reimbursement" ? "Who Paid? (Select Employees) *" : "Select Employees *"} | — | 🔄 .map(employees) | 649 |
| 9 | `<Select>` | select | Select Employee * | — | — | 673 |
| 10 | `<Input>` | text | Vendor Name | — | — | 688 |
| 11 | `<Select>` | select | Select Item | — | — | 717 |
| 12 | `<Input>` | number | Quantity | "Enter qty" | — | 728 |
| 13 | `<Calendar>` | text | — | — | — | 747 |
| 14 | `<Input>` | month | Month | — | — | 753 |
| 15 | `<Input>` | date | Due Date | — | — | 758 |
| 16 | `<Input>` | date | Bill Period Start | — | — | 766 |
| 17 | `<Input>` | date | Bill Period End | — | — | 770 |
| 18 | `<Input>` | date | Paid Date | — | — | 776 |
| 19 | `<Input>` | date | Date | — | — | 786 |
| 20 | `<Input>` | number | Amount (₹) * | "Enter amount" | — | 790 |
| 21 | `<Input>` | number | — | "₹0" | 🔄 .map(multiSelectedEmployeeIds) | 806 |
| 22 | `<Input>` | number | Quantity | "Enter quantity" | — | 829 |
| 23 | `<Input>` | text | Unit | — | — | 833 |
| 24 | `<Checkbox>` | checkbox | Who Participated? (for per-person tracking) | — | 🔄 .map(employees) | 845 |
| 25 | `<Checkbox>` | checkbox | — | — | — | 866 |
| 26 | `<Textarea>` | textarea | Notes | "Add notes..." | — | 872 |
| 27 | `<Select>` | select | Which employee paid? | — | — | 919 |
| 28 | `<Select>` | select | Which partner paid? | — | — | 934 |
| 29 | `<Input>` | number | — | "₹0" | — | 961 |
| 30 | `<Input>` | number | — | "₹0" | — | 969 |
| 31 | `<Checkbox>` | checkbox | Employees | — | 🔄 .map(employees) | 979 |
| 32 | `<Input>` | number | — | "₹0" | 🔄 .map(employees) | 991 |
| 33 | `<Checkbox>` | checkbox | Partners | — | 🔄 .map(availablePartners) | 1005 |
| 34 | `<Input>` | number | — | "₹0" | 🔄 .map(availablePartners) | 1017 |
| 35 | `<Select>` | select | Payment Mode | — | — | 1030 |
| 36 | `<Checkbox>` | checkbox | — | — | — | 1045 |
| 37 | `<Input>` | number | Reimbursement Amount: | "{amount || "Full amount"}" | — | 1053 |

### Enquiries.tsx
📁 `src/pages/Enquiries.tsx` — 37 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search name, phone, or ID" | — | 346 |
| 2 | `<Select>` | select | — | — | — | 356 |
| 3 | `<Select>` | select | — | — | — | 403 |
| 4 | `<Select>` | select | — | — | — | 420 |
| 5 | `<TablePaginationBar>` | text | — | — | — | 446 |
| 6 | `<Input>` | text | Customer Name * | — | Add New Enquiry | 565 |
| 7 | `<Input>` | text | Phone * | — | Add New Enquiry | 573 |
| 8 | `<Input>` | email | Email | — | Add New Enquiry | 583 |
| 9 | `<Select>` | select | Type | — | Add New Enquiry | 592 |
| 10 | `<Input>` | text | Address | — | Add New Enquiry | 608 |
| 11 | `<Select>` | select | Source | — | Add New Enquiry | 617 |
| 12 | `<Select>` | select | Priority | — | — | 636 |
| 13 | `<Input>` | text | Referred By * | — | — | 654 |
| 14 | `<Input>` | text | System Capacity | — | — | 664 |
| 15 | `<Input>` | number | Estimated Budget | — | — | 672 |
| 16 | `<Textarea>` | textarea | Requirements / Notes | — | — | 682 |
| 17 | `<Input>` | date | Follow-up Date | — | — | 691 |
| 18 | `<Calendar>` | text | — | — | — | 813 |
| 19 | `<Select>` | select | Assign To | — | — | 846 |
| 20 | `<Select>` | select | Updated by | — | — | 874 |
| 21 | `<Select>` | select | Person who talked to client / Status shared by | — | — | 888 |
| 22 | `<Textarea>` | textarea | Note | — | — | 902 |
| 23 | `<Input>` | date | Meeting Date * | — | — | 926 |
| 24 | `<Textarea>` | textarea | Notes | — | — | 934 |
| 25 | `<Select>` | select | Share Via | — | — | 958 |
| 26 | `<Input>` | text | Customer Name * | — | — | 989 |
| 27 | `<Input>` | text | Phone * | — | — | 997 |
| 28 | `<Input>` | email | Email | — | — | 1007 |
| 29 | `<Select>` | select | Type | — | — | 1016 |
| 30 | `<Input>` | text | Address | — | — | 1032 |
| 31 | `<Select>` | select | Source | — | — | 1041 |
| 32 | `<Select>` | select | Priority | — | — | 1060 |
| 33 | `<Input>` | text | Referred By * | — | — | 1078 |
| 34 | `<Input>` | text | System Capacity | — | — | 1088 |
| 35 | `<Input>` | number | Estimated Budget | — | — | 1096 |
| 36 | `<Textarea>` | textarea | Requirements / Notes | — | — | 1106 |
| 37 | `<Input>` | date | Follow-up Date | — | — | 1115 |

### InvoiceCreateDialog.tsx
📁 `src/components/invoices/InvoiceCreateDialog.tsx` — 31 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | date | Invoice Date | — | New invoice or sale bill | 416 |
| 2 | `<Input>` | date | Due Date | — | New invoice or sale bill | 420 |
| 3 | `<Select>` | select | Place of Supply (State) | — | New invoice or sale bill | 424 |
| 4 | `<Select>` | select | Linked Project | — | New invoice or sale bill | 448 |
| 5 | `<Select>` | select | Linked Quotation | — | — | 467 |
| 6 | `<Select>` | select | Load Preset (Optional) | — | — | 487 |
| 7 | `<Input>` | text | Client Name * | — | — | 530 |
| 8 | `<Input>` | text | Contact | — | — | 540 |
| 9 | `<Input>` | text | Address | — | — | 546 |
| 10 | `<Input>` | text | GSTIN | — | — | 550 |
| 11 | `<Select>` | select | — | — | — | 563 |
| 12 | `<Input>` | text | Description | — | 🔄 .map(invoiceServices) | 592 |
| 13 | `<Input>` | text | SAC Code | — | 🔄 .map(invoiceServices) | 596 |
| 14 | `<Input>` | number | Rate (₹) | — | 🔄 .map(invoiceServices) | 610 |
| 15 | `<Select>` | select | GST % | — | 🔄 .map(invoiceServices) | 614 |
| 16 | `<Input>` | text | — | — | 🔄 .map(invoiceServices) | 635 |
| 17 | `<Select>` | select | — | — | — | 654 |
| 18 | `<Input>` | text | Description | — | 🔄 .map(invoiceItems) | 693 |
| 19 | `<Input>` | text | HSN Code | — | 🔄 .map(invoiceItems) | 697 |
| 20 | `<Input>` | number | Qty | — | 🔄 .map(invoiceItems) | 711 |
| 21 | `<Input>` | number | Rate (₹) | — | 🔄 .map(invoiceItems) | 715 |
| 22 | `<Select>` | select | GST % | — | 🔄 .map(invoiceItems) | 719 |
| 23 | `<Input>` | text | — | — | 🔄 .map(invoiceItems) | 740 |
| 24 | `<Checkbox>` | checkbox | — | — | — | 794 |
| 25 | `<Input>` | number | Amount Received (₹) | — | — | 816 |
| 26 | `<Select>` | select | Received In | — | — | 825 |
| 27 | `<Input>` | date | Date Received | — | — | 836 |
| 28 | `<Input>` | text | Payment Terms | — | — | 847 |
| 29 | `<Select>` | select | Bank Account | — | — | 851 |
| 30 | `<Textarea>` | textarea | Notes / Terms & Conditions | — | — | 863 |
| 31 | `<ClientSelectionModal>` | text | — | — | — | 875 |

### Settings.tsx
📁 `src/pages/Settings.tsx` — 28 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | First Name | — | — | 336 |
| 2 | `<Input>` | text | Last Name | — | — | 340 |
| 3 | `<Input>` | text | Email | — | — | 346 |
| 4 | `<Input>` | text | Phone | — | — | 353 |
| 5 | `<Input>` | text | Role | — | — | 358 |
| 6 | `<Input>` | text | Company Name | — | — | 379 |
| 7 | `<Input>` | text | GST Number | — | — | 383 |
| 8 | `<Input>` | text | PAN Number | — | — | 387 |
| 9 | `<Input>` | text | Address | — | — | 393 |
| 10 | `<Input>` | text | Website | — | — | 400 |
| 11 | `<Select>` | select | Industry | — | — | 405 |
| 12 | `<Select>` | select | — | — | 🔄 .map(teamMembers) | 460 |
| 13 | `<MastersTab>` | text | — | — | — | 511 |
| 14 | `<Input>` | password | Current Password | "Enter current password" | — | 563 |
| 15 | `<Input>` | password | New Password | "Enter new password" | — | 568 |
| 16 | `<Input>` | password | Confirm Password | "Confirm new password" | — | 572 |
| 17 | `<Input>` | email | Email Address | "colleague@company.com" | Invite Team Member | 657 |
| 18 | `<Select>` | select | Role | — | Invite Team Member | 666 |
| 19 | `<Input>` | text | Preset Name | "e.g., Standard 5kW System" | — | 725 |
| 20 | `<Select>` | select | Category | — | — | 734 |
| 21 | `<Input>` | number | Capacity (kW) | "e.g., 5" | — | 750 |
| 22 | `<Input>` | text | Panel Brand | "e.g., Waaree" | — | 762 |
| 23 | `<Input>` | number | Panel Wattage | "e.g., 540" | — | 770 |
| 24 | `<Input>` | number | Number of Panels | "e.g., 10" | — | 779 |
| 25 | `<Input>` | text | Inverter Brand | "e.g., Growatt" | — | 788 |
| 26 | `<Input>` | text | Inverter Capacity | "e.g., 5kW" | — | 796 |
| 27 | `<Input>` | text | Structure Type | "e.g., Elevated GI" | — | 804 |
| 28 | `<Input>` | number | Estimated Cost (₹) | "e.g., 250000" | — | 814 |

### Employees.tsx
📁 `src/pages/Employees.tsx` — 26 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 316 |
| 2 | `<Select>` | select | — | — | — | 417 |
| 3 | `<Checkbox>` | checkbox | — | — | 🔄 .map(deploymentData) | 432 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 476 |
| 5 | `<Input>` | text | Full Name | "Enter full name" | Add New Employee | 565 |
| 6 | `<Input>` | text | Phone Number | "+91 XXXXX XXXXX" | Add New Employee | 569 |
| 7 | `<Input>` | text | Current Address | "Enter current address" | Add New Employee | 575 |
| 8 | `<Input>` | text | Aadhar Number | "XXXX XXXX XXXX" | Add New Employee | 581 |
| 9 | `<Input>` | date | Date of Birth | — | Add New Employee | 585 |
| 10 | `<Input>` | text | Alternate Number | "Enter alternate number" | Add New Employee | 589 |
| 11 | `<Input>` | text | Salary (Monthly) | "₹ Enter amount" | Add New Employee | 604 |
| 12 | `<Select>` | select | Role | — | Add New Employee | 608 |
| 13 | `<Input>` | date | Joining Date | — | — | 623 |
| 14 | `<Checkbox>` | checkbox | Paying for Month(s) | — | 🔄 .map(months) | 776 |
| 15 | `<Input>` | text | Payment Amount | "₹ Enter amount" | — | 799 |
| 16 | `<Input>` | date | Payment Date | — | — | 814 |
| 17 | `<Select>` | select | Payment Method | — | — | 819 |
| 18 | `<Input>` | text | Notes (Optional) | "Add any notes..." | — | 833 |
| 19 | `<Select>` | select | Site | — | — | 876 |
| 20 | `<Select>` | select | Category | — | — | 892 |
| 21 | `<Input>` | date | Date | — | — | 918 |
| 22 | `<Input>` | text | Amount | "₹ Enter amount" | — | 923 |
| 23 | `<Input>` | text | Reason / Notes | "Enter reason" | — | 932 |
| 24 | `<Select>` | select | Who Paid? | — | — | 938 |
| 25 | `<UnifiedExpenseModal>` | text | — | — | — | 1049 |
| 26 | `<TaskAssignmentModal>` | text | — | — | — | 1058 |

### Tools.tsx
📁 `src/pages/Tools.tsx` — 21 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search tools" | — | 163 |
| 2 | `<Select>` | select | — | — | — | 174 |
| 3 | `<Select>` | select | — | — | — | 191 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 246 |
| 5 | `<Input>` | text | Tool Name * | "e.g., Drill Machine" | Add New Tool | 346 |
| 6 | `<Select>` | select | Category * | — | Add New Tool | 354 |
| 7 | `<Input>` | number | Purchase Rate (₹) | "0" | Add New Tool | 368 |
| 8 | `<Input>` | date | Purchase Date | — | Add New Tool | 377 |
| 9 | `<Select>` | select | Condition | — | Add New Tool | 386 |
| 10 | `<Select>` | select | Action | — | — | 430 |
| 11 | `<Select>` | select | Select Tool | — | — | 442 |
| 12 | `<Select>` | select | {issueToolAction === "transfer" ? "Transfer to Site" : "Assign to Site"} | — | — | 474 |
| 13 | `<Select>` | select | Assign to Person | — | — | 487 |
| 14 | `<Select>` | select | Select Tool (Currently In Use) | — | — | 531 |
| 15 | `<Select>` | select | Condition on Return | — | — | 546 |
| 16 | `<Textarea>` | textarea | Notes (Optional) | "Any remarks about the tool condition..." | — | 560 |
| 17 | `<Input>` | text | Tool Name | — | — | 681 |
| 18 | `<Select>` | select | Category | — | — | 685 |
| 19 | `<Input>` | number | Purchase Rate (₹) | — | — | 699 |
| 20 | `<Input>` | date | Purchase Date | — | — | 703 |
| 21 | `<Select>` | select | Condition | — | — | 708 |

### AddExpenseModal.tsx
📁 `src/components/expenses/AddExpenseModal.tsx` — 20 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | date | Date | — | Add Expense | 334 |
| 2 | `<Select>` | select | Category | — | Add Expense | 344 |
| 3 | `<Select>` | select | Sub-category | — | Add Expense | 360 |
| 4 | `<Input>` | number | Amount (₹) | "Enter amount" | — | 407 |
| 5 | `<Checkbox>` | checkbox | Select Employee(s) Who Paid | — | 🔄 .map(employees) | 495 |
| 6 | `<Input>` | number | — | "Amount" | 🔄 .map(employees) | 505 |
| 7 | `<Checkbox>` | checkbox | — | — | — | 526 |
| 8 | `<Input>` | number | Reimbursement Amount: | "{amount || "0"}" | — | 539 |
| 9 | `<Checkbox>` | checkbox | Select Partner(s) Who Paid | — | 🔄 .map(availablePartners) | 569 |
| 10 | `<Input>` | number | — | "Amount" | 🔄 .map(availablePartners) | 579 |
| 11 | `<Select>` | select | Owner Expense Type | — | — | 597 |
| 12 | `<Checkbox>` | checkbox | — | — | — | 632 |
| 13 | `<Input>` | number | — | "Amount" | — | 642 |
| 14 | `<Checkbox>` | checkbox | — | — | — | 654 |
| 15 | `<Input>` | number | — | "Amount" | — | 664 |
| 16 | `<Checkbox>` | checkbox | — | — | 🔄 .map(employees) | 679 |
| 17 | `<Input>` | number | — | "Amount" | 🔄 .map(employees) | 688 |
| 18 | `<Checkbox>` | checkbox | — | — | 🔄 .map(availablePartners) | 706 |
| 19 | `<Input>` | number | — | "Amount" | 🔄 .map(availablePartners) | 715 |
| 20 | `<Textarea>` | textarea | Notes (Optional) | "Add any additional notes..." | — | 734 |

### UnifiedIncomeModal.tsx
📁 `src/components/income/UnifiedIncomeModal.tsx` — 20 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | Sub-type | — | — | 296 |
| 2 | `<Input>` | date | Date | — | — | 328 |
| 3 | `<Input>` | number | Amount (₹) * | "Enter amount" | — | 332 |
| 4 | `<Select>` | select | Select Project {isProjectRequired ? "*" : "(Optional)"} | — | — | 340 |
| 5 | `<Input>` | text | Received From | — | — | 354 |
| 6 | `<Select>` | select | Select Site/Project | — | — | 391 |
| 7 | `<Select>` | select | Select Partner {isPartnerRequired ? "*" : "(Optional)"} | — | — | 404 |
| 8 | `<Select>` | select | Select Employee {isEmployeeRequired ? "*" : "(Optional)"} | — | — | 419 |
| 9 | `<Select>` | select | Select Loan * | — | — | 433 |
| 10 | `<Input>` | text | Bank Name * | — | — | 451 |
| 11 | `<Input>` | text | Loan Account No. | — | — | 457 |
| 12 | `<Input>` | number | Interest Rate (%) | — | — | 463 |
| 13 | `<Input>` | number | Tenure (Months) | — | — | 469 |
| 14 | `<Input>` | text | Person Name * | — | — | 486 |
| 15 | `<Input>` | text | Contact Number | — | — | 492 |
| 16 | `<Input>` | date | Expected Return Date | — | — | 498 |
| 17 | `<Input>` | text | Relationship / Context | — | — | 503 |
| 18 | `<Select>` | select | Payment Mode | — | — | 513 |
| 19 | `<Input>` | text | Reference / Txn ID | — | — | 525 |
| 20 | `<Textarea>` | textarea | Notes | "Add notes..." | — | 531 |

### VendorDetail.tsx
📁 `src/pages/VendorDetail.tsx` — 20 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 460 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 540 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 598 |
| 4 | `<Input>` | number | Amount | — | Record Payment to Vendor | 661 |
| 5 | `<Input>` | date | Date | — | Record Payment to Vendor | 672 |
| 6 | `<Select>` | select | Payment Mode | — | Record Payment to Vendor | 682 |
| 7 | `<Textarea>` | textarea | Notes (Optional) | — | Record Payment to Vendor | 697 |
| 8 | `<Input>` | text | Bill Number * | — | — | 746 |
| 9 | `<Input>` | date | Bill Date * | — | — | 754 |
| 10 | `<Input>` | date | Due Date | — | — | 765 |
| 11 | `<Select>` | select | Link to Project | — | — | 773 |
| 12 | `<Select>` | select | Purchase Type | — | — | 790 |
| 13 | `<Select>` | select | Items | — | 🔄 .map(purchaseItems) | 815 |
| 14 | `<Input>` | text | — | — | 🔄 .map(purchaseItems) | 833 |
| 15 | `<Input>` | number | — | — | 🔄 .map(purchaseItems) | 841 |
| 16 | `<Input>` | number | — | — | 🔄 .map(purchaseItems) | 851 |
| 17 | `<Input>` | number | Amount Paid Now | — | — | 901 |
| 18 | `<Select>` | select | Payment Mode | — | — | 912 |
| 19 | `<Textarea>` | textarea | Notes (Optional) | — | — | 937 |
| 20 | `<TablePaginationBar>` | text | — | — | — | 1004 |

### EmployeeProfile.tsx
📁 `src/pages/EmployeeProfile.tsx` — 18 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 332 |
| 2 | `<Select>` | select | Select Month: | — | — | 453 |
| 3 | `<Calendar>` | text | — | — | 🔄 .map(employeePaidLeaves) | 642 |
| 4 | `<Select>` | select | — | — | — | 685 |
| 5 | `<Select>` | select | — | — | — | 742 |
| 6 | `<Select>` | select | — | — | — | 752 |
| 7 | `<Input>` | date | — | "From" | — | 764 |
| 8 | `<Input>` | date | — | "To" | — | 772 |
| 9 | `<TablePaginationBar>` | text | — | — | — | 791 |
| 10 | `<Input>` | text | Full Name | — | Edit Profile | 868 |
| 11 | `<Input>` | text | Phone | — | Edit Profile | 872 |
| 12 | `<Input>` | text | Current Address | — | Edit Profile | 878 |
| 13 | `<Input>` | text | Aadhar Number | — | Edit Profile | 884 |
| 14 | `<Input>` | date | Date of Birth | — | Edit Profile | 888 |
| 15 | `<Input>` | text | Alternate Number | — | Edit Profile | 892 |
| 16 | `<Input>` | text | Salary (Monthly) | — | Edit Profile | 907 |
| 17 | `<Select>` | select | Role | — | Edit Profile | 911 |
| 18 | `<Input>` | date | Joining Date | — | — | 926 |

### Loans.tsx
📁 `src/pages/Loans.tsx` — 18 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search loans..." | — | 223 |
| 2 | `<Select>` | select | — | — | — | 233 |
| 3 | `<Select>` | select | — | — | — | 249 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 273 |
| 5 | `<Select>` | select | Source Type | — | Add New Loan | 375 |
| 6 | `<Select>` | select | Payment Type | — | Add New Loan | 391 |
| 7 | `<Calendar>` | text | Payment Type | — | Add New Loan | 398 |
| 8 | `<Input>` | text | Source Name * | — | Add New Loan | 425 |
| 9 | `<Input>` | number | Principal * | — | Add New Loan | 431 |
| 10 | `<Input>` | number | Interest Rate % | — | — | 435 |
| 11 | `<Input>` | number | EMI Amount * | — | — | 444 |
| 12 | `<Input>` | number | Tenure (months) | — | — | 448 |
| 13 | `<Input>` | date | Due Date * | — | — | 457 |
| 14 | `<Input>` | date | Reminder Date (optional) | — | — | 466 |
| 15 | `<Input>` | text | Notes | — | — | 470 |
| 16 | `<Input>` | date | Start Date | — | — | 477 |
| 17 | `<Input>` | number | Amount * | — | — | 509 |
| 18 | `<Input>` | date | Date | — | — | 517 |

### MaterialsSentTab.tsx
📁 `src/components/projects/MaterialsSentTab.tsx` — 17 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Checkbox>` | checkbox | — | — | 🔄 .map(catMaterials) | 465 |
| 2 | `<Calendar>` | text | — | — | 🔄 .map(catMaterials) | 488 |
| 3 | `<Input>` | number | Issue Qty: | — | 🔄 .map(catMaterials) | 532 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 578 |
| 5 | `<Textarea>` | textarea | Issue Notes (Optional) | "Add notes for this issue..." | Dialog | 655 |
| 6 | `<Checkbox>` | checkbox | Issue Notes (Optional) | — | Dialog | 661 |
| 7 | `<Select>` | select | Expense Type | — | Dialog | 670 |
| 8 | `<Input>` | number | Amount (₹) | "0" | Dialog | 681 |
| 9 | `<Input>` | text | Amount (₹) | "Expense notes (optional)" | — | 684 |
| 10 | `<Checkbox>` | checkbox | — | — | — | 692 |
| 11 | `<Select>` | select | Assign To * | — | — | 703 |
| 12 | `<Input>` | date | Task Date | — | — | 714 |
| 13 | `<Textarea>` | textarea | Task Date | "Task notes (optional)" | — | 717 |
| 14 | `<Input>` | number | Quantity to Send | "Enter quantity" | — | 748 |
| 15 | `<Input>` | number | Return Quantity | "Enter quantity to return" | — | 778 |
| 16 | `<Input>` | number | Scrap Quantity | — | — | 810 |
| 17 | `<Input>` | number | Consumed Quantity | — | — | 828 |

### Customers.tsx
📁 `src/pages/Customers.tsx` — 14 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Name, phone, or email" | — | 148 |
| 2 | `<Select>` | select | — | — | — | 155 |
| 3 | `<Select>` | select | Customer Type | — | Add New Customer | 304 |
| 4 | `<Input>` | text | Name * | — | Add New Customer | 316 |
| 5 | `<Input>` | text | Phone * | — | Add New Customer | 320 |
| 6 | `<Input>` | text | Email | — | Add New Customer | 324 |
| 7 | `<Input>` | text | Address | — | Add New Customer | 328 |
| 8 | `<Input>` | text | GSTIN | — | Add New Customer | 333 |
| 9 | `<Select>` | select | Customer Type | — | Edit Customer | 353 |
| 10 | `<Input>` | text | Name * | — | — | 365 |
| 11 | `<Input>` | text | Phone * | — | — | 369 |
| 12 | `<Input>` | text | Email | — | — | 373 |
| 13 | `<Input>` | text | Address | — | — | 377 |
| 14 | `<Input>` | text | GSTIN | — | — | 382 |

### Presets.tsx
📁 `src/pages/Presets.tsx` — 14 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | Preset Name | — | — | 494 |
| 2 | `<Select>` | select | Category | — | — | 501 |
| 3 | `<Input>` | number | Capacity (kW) | — | — | 517 |
| 4 | `<Input>` | text | Panel Brand | — | — | 528 |
| 5 | `<Input>` | number | Panel Wattage | — | — | 535 |
| 6 | `<Input>` | number | Panel Count | — | — | 543 |
| 7 | `<Input>` | text | Structure Type | — | — | 551 |
| 8 | `<Input>` | text | Inverter Brand | — | — | 561 |
| 9 | `<Input>` | text | Inverter Capacity | — | — | 568 |
| 10 | `<Input>` | number | Estimated Cost | — | — | 575 |
| 11 | `<Select>` | select | Preset Type | — | — | 583 |
| 12 | `<Input>` | text | — | — | 🔄 .map(editingPreset.materials) | 621 |
| 13 | `<Input>` | number | — | — | 🔄 .map(editingPreset.materials) | 628 |
| 14 | `<Input>` | number | — | — | 🔄 .map(editingPreset.materials) | 636 |

### PartnerDistributionCard.tsx
📁 `src/components/projects/PartnerDistributionCard.tsx` — 13 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | Partner * | — | Dialog | 385 |
| 2 | `<Input>` | number | Amount (₹) * | "Enter amount" | — | 437 |
| 3 | `<Select>` | select | Select Item * | — | — | 451 |
| 4 | `<Input>` | number | Quantity * | "Enter quantity" | — | 466 |
| 5 | `<Input>` | number | Days * | "e.g. 5" | — | 490 |
| 6 | `<Input>` | number | Rate per Day (₹) * | "e.g. 800" | — | 499 |
| 7 | `<Textarea>` | textarea | Description * | "Describe the contribution..." | — | 523 |
| 8 | `<Input>` | number | Equivalent Value (₹) * | "Enter value" | — | 532 |
| 9 | `<Input>` | text | Notes (Optional) | "Transaction notes" | — | 545 |
| 10 | `<Select>` | select | Partner * | — | — | 578 |
| 11 | `<Input>` | number | Withdrawal Amount (₹) * | "Enter amount" | — | 597 |
| 12 | `<Textarea>` | textarea | Notes (Optional) | "Reason for withdrawal..." | — | 607 |
| 13 | `<TablePaginationBar>` | text | — | — | — | 639 |

### Agents.tsx
📁 `src/pages/Agents.tsx` — 12 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | Name * | — | — | 175 |
| 2 | `<Input>` | text | Phone * | — | — | 180 |
| 3 | `<Input>` | text | Email | — | — | 184 |
| 4 | `<Input>` | text | Address | — | — | 189 |
| 5 | `<Select>` | select | Commission Rate Type | — | — | 193 |
| 6 | `<Input>` | number | Rate per kW (₹) | — | — | 204 |
| 7 | `<Input>` | number | Flat Rate per Project (₹) | — | — | 209 |
| 8 | `<Input>` | text | — | "Name or phone" | — | 224 |
| 9 | `<Select>` | select | — | — | — | 234 |
| 10 | `<TablePaginationBar>` | text | — | — | — | 274 |
| 11 | `<AgentFormFields>` | text | — | — | Add New Agent | 381 |
| 12 | `<AgentFormFields>` | text | — | — | Edit Agent | 393 |

### LoanPersonDetail.tsx
📁 `src/pages/LoanPersonDetail.tsx` — 12 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 181 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 253 |
| 3 | `<Input>` | number | Principal Amount (₹) * | "100000" | Add New Loan from {displayName} | 304 |
| 4 | `<Input>` | number | Interest Rate (%) | "0" | Add New Loan from {displayName} | 313 |
| 5 | `<Input>` | number | EMI Amount (₹) | "10000" | Add New Loan from {displayName} | 324 |
| 6 | `<Input>` | number | Tenure (months) | "12" | Add New Loan from {displayName} | 333 |
| 7 | `<Input>` | date | Start Date | — | Add New Loan from {displayName} | 343 |
| 8 | `<Textarea>` | textarea | Notes | "Any notes about this loan..." | Add New Loan from {displayName} | 351 |
| 9 | `<Input>` | date | Date | — | — | 390 |
| 10 | `<Input>` | number | Principal Paid (₹) | "0" | — | 399 |
| 11 | `<Input>` | number | Interest Paid (₹) | "0" | — | 408 |
| 12 | `<Textarea>` | textarea | Notes | "Any notes..." | — | 424 |

### Vendors.tsx
📁 `src/pages/Vendors.tsx` — 12 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search name, phone, email…" | — | 185 |
| 2 | `<Select>` | select | — | — | — | 193 |
| 3 | `<Input>` | text | Name * | — | Add vendor | 387 |
| 4 | `<Select>` | select | Categories | — | Add vendor | 391 |
| 5 | `<Input>` | text | Contact * | — | Add vendor | 409 |
| 6 | `<Input>` | text | Email | — | Add vendor | 413 |
| 7 | `<Input>` | text | Address | — | Add vendor | 417 |
| 8 | `<Input>` | text | Name * | — | Edit vendor | 439 |
| 9 | `<Select>` | select | Categories | — | Edit vendor | 443 |
| 10 | `<Input>` | text | Contact * | — | — | 461 |
| 11 | `<Input>` | text | Email | — | — | 465 |
| 12 | `<Input>` | text | Address | — | — | 469 |

### ProfitLoss.tsx
📁 `src/pages/audit/ProfitLoss.tsx` — 11 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 145 |
| 2 | `<LineItem>` | text | — | — | — | 186 |
| 3 | `<LineItem>` | text | — | — | — | 187 |
| 4 | `<LineItem>` | text | — | — | — | 188 |
| 5 | `<LineItem>` | text | — | — | — | 189 |
| 6 | `<LineItem>` | text | — | — | — | 190 |
| 7 | `<LineItem>` | text | — | — | — | 199 |
| 8 | `<LineItem>` | text | — | — | 🔄 .map(plData.directLines) | 215 |
| 9 | `<LineItem>` | text | — | — | — | 217 |
| 10 | `<LineItem>` | text | — | — | 🔄 .map(plData.indirectLines) | 235 |
| 11 | `<LineItem>` | text | — | — | — | 237 |

### ClientPaymentHistory.tsx
📁 `src/components/projects/ClientPaymentHistory.tsx` — 10 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 194 |
| 2 | `<Input>` | date | Date * | — | Record Payment | 285 |
| 3 | `<Input>` | number | Amount * | "Enter amount" | Record Payment | 293 |
| 4 | `<Select>` | select | Payment Mode * | — | Record Payment | 304 |
| 5 | `<Select>` | select | Who receives funds * | — | Record Payment | 319 |
| 6 | `<Select>` | select | Payment stage | — | Record Payment | 338 |
| 7 | `<Input>` | number | Company portion (₹) | "0" | — | 357 |
| 8 | `<Input>` | number | Partner portion (₹){partnerName ? ` — ${partnerName}` : ""} | "0" | — | 366 |
| 9 | `<Input>` | text | Reference (optional) | "Cheque no., Transaction ID, etc." | — | 378 |
| 10 | `<Textarea>` | textarea | Notes (optional) | "Any additional notes" | — | 387 |

### CustomerDetail.tsx
📁 `src/pages/CustomerDetail.tsx` — 10 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 311 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 364 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 418 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 509 |
| 5 | `<TablePaginationBar>` | text | — | — | — | 587 |
| 6 | `<TablePaginationBar>` | text | — | — | — | 649 |
| 7 | `<Input>` | number | Amount | — | Record Payment | 718 |
| 8 | `<Input>` | date | Date | — | Record Payment | 729 |
| 9 | `<Select>` | select | Payment Mode | — | Record Payment | 739 |
| 10 | `<Textarea>` | textarea | Notes (Optional) | — | Record Payment | 754 |

### ActiveSitesFilters.tsx
📁 `src/components/activesites/ActiveSitesFilters.tsx` — 9 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Checkbox>` | checkbox | — | — | 🔄 .map(options) | 76 |
| 2 | `<Input>` | text | — | "Search sites..." | — | 237 |
| 3 | `<MultiSelectFilter>` | text | — | — | — | 254 |
| 4 | `<MultiSelectFilter>` | text | — | — | — | 260 |
| 5 | `<MultiSelectFilter>` | text | — | — | — | 266 |
| 6 | `<MultiSelectFilter>` | text | — | — | — | 272 |
| 7 | `<MultiSelectFilter>` | text | — | — | — | 278 |
| 8 | `<MultiSelectFilter>` | text | — | — | — | 284 |
| 9 | `<MultiSelectFilter>` | text | — | — | — | 290 |

### Timeline.tsx
📁 `src/pages/Timeline.tsx` — 9 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 109 |
| 2 | `<Icon>` | text | — | — | 🔄 .map(mainTabs) | 453 |
| 3 | `<Select>` | select | — | — | — | 496 |
| 4 | `<Calendar>` | text | — | — | — | 667 |
| 5 | `<Select>` | select | — | — | — | 687 |
| 6 | `<Select>` | select | — | — | — | 700 |
| 7 | `<Select>` | select | — | — | — | 716 |
| 8 | `<Select>` | select | — | — | — | 803 |
| 9 | `<Select>` | select | — | — | — | 921 |

### NeedToGetModal.tsx
📁 `src/components/need-to-get/NeedToGetModal.tsx` — 8 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Checkbox>` | checkbox | — | — | 🔄 .map(projectOptions) | 445 |
| 2 | `<Checkbox>` | checkbox | — | — | 🔄 .map(siteOptions) | 487 |
| 3 | `<Checkbox>` | checkbox | — | — | 🔄 .map(materialOptions) | 525 |
| 4 | `<Input>` | date | Need-by on or before | — | — | 547 |
| 5 | `<TablePaginationBar>` | text | — | — | — | 608 |
| 6 | `<Select>` | select | Team member | — | — | 706 |
| 7 | `<Input>` | text | WhatsApp number | "e.g. 9876543210 or +91 9876543210" | — | 732 |
| 8 | `<Textarea>` | textarea | Message (optional) | "Short note prefilled into WhatsApp; PDF downloads separately." | — | 741 |

### MastersTab.tsx
📁 `src/components/settings/MastersTab.tsx` — 8 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Settings>` | text | — | — | — | 46 |
| 2 | `<Input>` | text | Item Name * | "Enter display name" | Dialog | 461 |
| 3 | `<Input>` | text | Value | "e.g., my-custom-value" | Dialog | 476 |
| 4 | `<Input>` | text | Unit | "e.g., hours" | Dialog | 491 |
| 5 | `<Input>` | text | Item Name | "Enter display name" | — | 533 |
| 6 | `<Input>` | text | Value (read-only) | — | — | 542 |
| 7 | `<Input>` | text | Unit | "e.g., hours" | — | 547 |
| 8 | `<CreateMasterModal>` | text | — | — | — | 568 |

### Attendance.tsx
📁 `src/pages/Attendance.tsx` — 8 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<RadioGroup>` | text | — | — | {isEditMode ? "Edit Work Sites" : "Mark Attendance"} | 716 |
| 2 | `<RadioGroupItem>` | text | — | — | {isEditMode ? "Edit Work Sites" : "Mark Attendance"} | 723 |
| 3 | `<RadioGroupItem>` | text | — | — | {isEditMode ? "Edit Work Sites" : "Mark Attendance"} | 735 |
| 4 | `<Checkbox>` | checkbox | Which site(s) did they work at today? | — | 🔄 .map(sites) | 765 |
| 5 | `<Switch>` | switch | — | — | — | 998 |
| 6 | `<Calendar>` | text | — | — | — | 1007 |
| 7 | `<Calendar>` | text | — | — | — | 1014 |
| 8 | `<TablePaginationBar>` | text | — | — | — | 1068 |

### Invoices.tsx
📁 `src/pages/Invoices.tsx` — 8 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Customer or document #" | — | 282 |
| 2 | `<Select>` | select | — | — | — | 293 |
| 3 | `<Select>` | select | — | — | — | 309 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 353 |
| 5 | `<InvoiceCreateDialog>` | text | — | — | — | 433 |
| 6 | `<Input>` | number | Amount * | — | — | 589 |
| 7 | `<Select>` | select | Payment Mode | — | — | 598 |
| 8 | `<Input>` | date | Date | — | — | 612 |

### Partners.tsx
📁 `src/pages/Partners.tsx` — 8 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search partner name, phone, or email" | — | 156 |
| 2 | `<Select>` | select | — | — | — | 166 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 189 |
| 4 | `<Input>` | text | Name * | — | Add partner | 269 |
| 5 | `<Input>` | text | Phone * | — | Add partner | 273 |
| 6 | `<Input>` | email | Email | — | Add partner | 279 |
| 7 | `<Select>` | select | Basic category | — | Add partner | 283 |
| 8 | `<Input>` | text | Basic info | — | Add partner | 297 |

### TaskAssignmentModal.tsx
📁 `src/components/employees/TaskAssignmentModal.tsx` — 7 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | Select Site * | — | Assign Task | 240 |
| 2 | `<Input>` | date | Base Date (T) * | — | Assign Task | 257 |
| 3 | `<Checkbox>` | checkbox | — | — | Assign Task | 284 |
| 4 | `<Input>` | number | — | — | 🔄 .map(WORK_STATUS_STAGES) | 312 |
| 5 | `<Checkbox>` | checkbox | — | — | 🔄 .map(WORK_STATUS_STAGES) | 328 |
| 6 | `<Calendar>` | text | — | — | 🔄 .map(selectedWorkItems) | 362 |
| 7 | `<Textarea>` | textarea | Notes | "Add any additional notes..." | — | 377 |

### AgentDetail.tsx
📁 `src/pages/AgentDetail.tsx` — 7 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 234 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 317 |
| 3 | `<Select>` | select | Project | — | Record Commission Payment | 394 |
| 4 | `<Input>` | number | Amount (₹) | — | Record Commission Payment | 411 |
| 5 | `<Input>` | date | Payment Date | — | Record Commission Payment | 420 |
| 6 | `<Select>` | select | Payment Mode | — | Record Commission Payment | 424 |
| 7 | `<Textarea>` | textarea | Notes (optional) | — | Record Commission Payment | 435 |

### AssignMaterialModal.tsx
📁 `src/components/projects/AssignMaterialModal.tsx` — 6 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Checkbox>` | checkbox | — | — | 🔄 .map(matched) | 328 |
| 2 | `<Input>` | text | Mark as not required | "Reason..." | 🔄 .map(matched) | 338 |
| 3 | `<Input>` | text | — | "Enter reason for extra item..." | 🔄 .map(extras) | 366 |
| 4 | `<Checkbox>` | checkbox | — | — | 🔄 .map(inventoryItems) | 404 |
| 5 | `<Input>` | number | Qty: | — | 🔄 .map(inventoryItems) | 424 |
| 6 | `<Input>` | text | — | "Enter reason for extra quantity..." | 🔄 .map(inventoryItems) | 443 |

### PartnerDetail.tsx
📁 `src/pages/PartnerDetail.tsx` — 6 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 274 |
| 2 | `<Select>` | select | Type | — | Record partner transaction | 327 |
| 3 | `<Input>` | number | Amount | — | Record partner transaction | 342 |
| 4 | `<Input>` | date | Date | — | Record partner transaction | 346 |
| 5 | `<Select>` | select | Project | — | Record partner transaction | 350 |
| 6 | `<Input>` | text | Notes | — | Record partner transaction | 366 |

### ActiveSites.tsx
📁 `src/pages/ActiveSites.tsx` — 5 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<ActiveSitesFilters>` | text | — | — | — | 675 |
| 2 | `<StepIcon>` | text | — | — | 🔄 .map(activeProjects) | 768 |
| 3 | `<Select>` | select | Resolved By * | — | Resolve Blockage | 1053 |
| 4 | `<Input>` | date | Resolution Date | — | Resolve Blockage | 1082 |
| 5 | `<Textarea>` | textarea | Resolution Notes (optional) | "How was the blockage resolved?" | Resolve Blockage | 1092 |

### FoodOthersExpenseTable.tsx
📁 `src/components/projects/FoodOthersExpenseTable.tsx` — 4 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search description..." | — | 97 |
| 2 | `<Select>` | select | — | — | — | 103 |
| 3 | `<Select>` | select | — | — | — | 114 |
| 4 | `<TablePaginationBar>` | text | — | — | — | 134 |

### CreateMasterModal.tsx
📁 `src/components/settings/CreateMasterModal.tsx` — 4 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Settings>` | text | — | — | — | 28 |
| 2 | `<Input>` | text | Item Name * | "Enter display name" | — | 212 |
| 3 | `<Input>` | text | Value (optional) | "e.g., my-custom-value" | — | 228 |
| 4 | `<Input>` | text | Unit (optional) | "e.g., hours" | — | 244 |

### sidebar.tsx
📁 `src/components/ui/sidebar.tsx` — 4 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<SidebarContext>` | text | — | — | — | 32 |
| 2 | `<SidebarContext>` | text | — | — | — | 95 |
| 3 | `<SidebarContext>` | text | — | — | — | 109 |
| 4 | `<Input>` | text | — | — | — | 290 |

### Analytics.tsx
📁 `src/pages/Analytics.tsx` — 4 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 124 |
| 2 | `<Checkbox>` | checkbox | — | — | Export Report | 237 |
| 3 | `<Checkbox>` | checkbox | Income | — | Export Report | 245 |
| 4 | `<Select>` | select | — | — | — | 296 |

### DesignSystem.tsx
📁 `src/pages/DesignSystem.tsx` — 4 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | Input | "Enter text..." | — | 520 |
| 2 | `<Input>` | text | Disabled Input | "Disabled" | — | 524 |
| 3 | `<Checkbox>` | checkbox | Disabled Input | — | — | 530 |
| 4 | `<Switch>` | switch | Checkbox | — | — | 534 |

### BankReconciliationModal.tsx
📁 `src/components/audit/BankReconciliationModal.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | file | — | — | Dialog | 420 |
| 2 | `<Input>` | file | — | — | — | 443 |
| 3 | `<Input>` | text | — | "Search transactions..." | — | 517 |

### TopHeader.tsx
📁 `src/components/layout/TopHeader.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<GlobalSearch>` | text | — | — | — | 63 |
| 2 | `<Settings>` | text | — | — | — | 165 |
| 3 | `<Select>` | select | — | — | — | 170 |

### DeletionRequestModal.tsx
📁 `src/components/shared/DeletionRequestModal.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Textarea>` | textarea | Reason for Deletion * | "Enter the reason for deleting this item..." | Dialog | 170 |
| 2 | `<Select>` | select | Person Responsible (if applicable) | — | — | 181 |
| 3 | `<Textarea>` | textarea | Any other notes to remember | "Additional notes (optional)..." | — | 199 |

### EntityInfoModal.tsx
📁 `src/components/shared/EntityInfoModal.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 82 |
| 2 | `<Calendar>` | text | — | — | — | 271 |
| 3 | `<EntityInfoModal>` | text | — | — | — | 473 |

### AuditLogs.tsx
📁 `src/pages/audit/AuditLogs.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 64 |
| 2 | `<Select>` | select | — | — | — | 77 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 113 |

### ChartOfAccounts.tsx
📁 `src/pages/audit/ChartOfAccounts.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 48 |
| 2 | `<Input>` | text | — | "Search accounts..." | — | 449 |
| 3 | `<ChartDetailLedgerTable>` | text | — | — | — | 497 |

### ExpenseAudit.tsx
📁 `src/pages/audit/ExpenseAudit.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 38 |
| 2 | `<Select>` | select | — | — | — | 150 |
| 3 | `<CategoryExpenseLinesTable>` | text | — | — | — | 230 |

### GSTCompliance.tsx
📁 `src/pages/audit/GSTCompliance.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 102 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 142 |
| 3 | `<TablePaginationBar>` | text | — | — | — | 229 |

### Dashboard.tsx
📁 `src/pages/Dashboard.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Icon>` | text | — | — | 🔄 .map(statsCards) | 405 |
| 2 | `<NeedToGetModal>` | text | — | — | — | 588 |
| 3 | `<Calendar>` | text | — | — | — | 762 |

### Notifications.tsx
📁 `src/pages/Notifications.tsx` — 3 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 330 |
| 2 | `<Calendar>` | text | — | — | 🔄 .map(leaveRequests) | 353 |
| 3 | `<DetailModal>` | {selectedType} | — | — | — | 480 |

### AppLayout.tsx
📁 `src/components/layout/AppLayout.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Sidebar>` | text | — | — | — | 30 |
| 2 | `<TopHeader>` | text | — | — | — | 34 |

### GlobalSearch.tsx
📁 `src/components/layout/GlobalSearch.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search..." | — | 181 |
| 2 | `<Icon>` | text | — | — | 🔄 .map(results) | 226 |

### BillPreviewModal.tsx
📁 `src/components/shared/BillPreviewModal.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | Dialog | 126 |
| 2 | `<Calendar>` | text | — | — | Dialog | 131 |

### AuditDashboard.tsx
📁 `src/pages/audit/AuditDashboard.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 127 |
| 2 | `<BankReconciliationModal>` | text | — | — | — | 245 |

### CashBankLedger.tsx
📁 `src/pages/audit/CashBankLedger.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 141 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 174 |

### DebtorsCreditors.tsx
📁 `src/pages/audit/DebtorsCreditors.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 144 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 225 |

### FixedAssets.tsx
📁 `src/pages/audit/FixedAssets.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 66 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 97 |

### InventoryAudit.tsx
📁 `src/pages/audit/InventoryAudit.tsx` — 2 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 55 |
| 2 | `<TablePaginationBar>` | text | — | — | — | 254 |

### TablePaginationBar.tsx
📁 `src/components/data-table/TablePaginationBar.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Select>` | select | — | — | — | 47 |

### ClientSelectionModal.tsx
📁 `src/components/invoices/ClientSelectionModal.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | — | "Search by name, phone, or email..." | Select Client | 74 |

### Sidebar.tsx
📁 `src/components/layout/Sidebar.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Settings>` | text | — | — | 🔄 .map(pinnedItemsOrdered) | 334 |

### ProjectConfirmationScreen.tsx
📁 `src/components/projects/ProjectConfirmationScreen.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Calendar>` | text | — | — | — | 237 |

### ProjectDocumentsStudio.tsx
📁 `src/components/projects/ProjectDocumentsStudio.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<TablePaginationBar>` | text | — | — | — | 113 |

### UserFlowTab.tsx
📁 `src/components/settings/UserFlowTab.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Settings>` | text | — | — | — | 622 |

### ImageViewerModal.tsx
📁 `src/components/shared/ImageViewerModal.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Input>` | text | File Name | — | Dialog | 59 |

### Index.tsx
📁 `src/pages/Index.tsx` — 1 field(s)

| # | Component | Type | Label | Placeholder | Modal/Context | Line |
|---|-----------|------|-------|-------------|---------------|------|
| 1 | `<Dashboard>` | text | — | — | — | 4 |


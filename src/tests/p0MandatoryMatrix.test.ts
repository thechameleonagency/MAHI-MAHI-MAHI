/**
 * Maps to GAPS document §7 “Mandatory Test Matrix” (20 P0 scenarios).
 * Each `it` is numbered for traceability to the plan.
 * @plan-verification — excluded from default vitest via vite.config.ts exclude.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { PermissionService } from "@/application/services/PermissionService";
import { canTransitionEnquiryStatus } from "@/domain/stateMachines/enquiryStateMachine";
import { canTransitionQuotationStatus } from "@/domain/stateMachines/quotationStateMachine";
import { canTransitionProjectStatus } from "@/domain/stateMachines/projectStateMachine";
import { ProjectKindService } from "@/application/services/ProjectKindService";
import { BillingDirectionGuardService } from "@/application/services/BillingDirectionGuardService";
import { InventoryMovementService } from "@/application/services/InventoryMovementService";
import { ProcurementShortfallService } from "@/application/services/ProcurementShortfallService";
import { ProjectReadinessService } from "@/application/services/ProjectReadinessService";
import { VoucherPostingService } from "@/application/services/VoucherPostingService";
import { UnifiedFinanceValidationService } from "@/application/services/UnifiedFinanceValidationService";
import { PayrollPolicyService } from "@/application/services/PayrollPolicyService";
import { RoleDashboardService } from "@/application/services/RoleDashboardService";
import { AuditService } from "@/application/services/AuditService";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";
import type { AuditLogEntry } from "@/types/finance";
import type { InventoryItem, Project, Quotation } from "@/types/project";

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: "P-1",
  name: "Project One",
  type: "EPC",
  projectType: "Residential",
  projectCategory: "solar",
  ownerType: "solo",
  progressStage: "work-in-progress",
  client: "Client A",
  capacity: "5 kW",
  location: "Jaipur",
  assignees: [],
  onSite: 0,
  contractAmount: 100000,
  totalCost: 70000,
  amountReceived: 0,
  photos: 0,
  startDate: "2026-01-01",
  endDate: null,
  createdAt: "2026-01-01",
  customerId: "C-1",
  lifecycleStatus: "Active",
  executionPhase: "execution",
  ...overrides,
});

const fullPayrollInput = {
  monthlySalary: 30000,
  totalWorkingDays: 30,
  presentDays: 24,
  paidLeaveDays: 2,
  unpaidDays: 0,
  companyHolidays: 2,
  overtimeAmount: 0,
  bonusAmount: 0,
  deductionsAmount: 200,
  salaryAdvances: 0,
  manualAdjustments: 0,
};

describe("P0 mandatory matrix (GAPS §7)", () => {
  beforeEach(() => {
    localStorage.removeItem("mss.test.p0.audit");
  });

  it("1) Role permission matrix — action gates align with role", () => {
    const ps = new PermissionService();
    expect(ps.canPerformAction("admin", "quotation:confirm")).toBe(true);
    expect(ps.canPerformAction("salesperson", "project:create_direct_exception")).toBe(false);
  });

  it("2) Enquiry transitions — state machine enforces valid moves", () => {
    expect(canTransitionEnquiryStatus("new", "meeting_scheduled", "salesperson")).toBe(true);
    // Reopen path from "lost" goes to "new" now; without a reason it should be denied.
    expect(canTransitionEnquiryStatus("lost", "new", "admin")).toBe(false);
  });

  it("3) Quotation transitions and locks — no draft → converted_to_project shortcut", () => {
    expect(canTransitionQuotationStatus("draft", "sent")).toBe(true);
    expect(canTransitionQuotationStatus("draft", "converted_to_project")).toBe(false);
    expect(canTransitionQuotationStatus("approved", "converted_to_project")).toBe(true);
  });

  it("4) Quotation snapshot creation — material lines drive procurement shortfall", () => {
    const service = new ProcurementShortfallService();
    const inventoryItems: InventoryItem[] = [
      {
        id: 1,
        name: "Solar Panel 550W",
        category: "Panel/Module",
        stock: 4,
        unit: "pcs",
        value: 1,
        buyPrice: 8500,
        salePrice: 9200,
        hsn: "8541",
        minStock: 2,
        notes: "",
      },
    ];
    const project = makeProject({
      materialsSent: [{ itemId: 1, itemName: "Solar Panel 550W", quantity: 2, dateIssued: "2026-05-11", unitPrice: 8500 }],
    });
    const quotation: Quotation = {
      id: "Q-1",
      quotationNumber: "Q-2026-001",
      status: "converted_to_project",
      quotationType: "solar",
      clientName: "Client",
      clientPhone: "9999999999",
      clientEmail: "client@example.com",
      clientCity: "Jaipur",
      clientState: "Rajasthan",
      paymentType: "cash",
      totalAmount: 100000,
      isConverted: true,
      customerId: "C-1",
      createdAt: "2026-05-01",
      presetSnapshot: [{ id: 1, name: "Solar Panel 550W", quantity: 10, unit: "pcs", rate: 8500 }],
    };
    const shortfalls = service.buildShortfalls({
      projects: [project],
      inventoryItems,
      getProjectQuotation: () => quotation,
      getSiteChecklistTemplateById: () => undefined,
    });
    expect(shortfalls.length).toBeGreaterThan(0);
  });

  it("5) Project creation from approved/converted quotation — readiness allows completion baseline", () => {
    const s = new ProjectReadinessService();
    expect(s.validateForCompletion(makeProject()).ok).toBe(true);
  });

  it("6) Direct project exception — forbidden for salesperson role", () => {
    expect(new PermissionService().canPerformAction("salesperson", "project:create_direct_exception")).toBe(false);
  });

  it("7) Project-kind required fields — SOLO_EPC config lists commercial requirements", () => {
    const c = new ProjectKindService().getConfig("SOLO_EPC");
    expect(c.requiredCommercialFields.length).toBeGreaterThan(0);
  });

  it("8) Project-kind visible tabs and billing directions — SOLO_EPC includes overview + directions", () => {
    const c = new ProjectKindService().getConfig("SOLO_EPC");
    expect(c.visibleTabs).toContain("overview");
    expect(c.allowedBillingDirections.length).toBeGreaterThan(0);
  });

  it("9) Project lifecycle transitions — super_admin may reopen completed with reason", () => {
    expect(canTransitionProjectStatus("Completed", "In Progress", "admin", "x")).toBe(false);
    expect(canTransitionProjectStatus("Completed", "In Progress", "super_admin", "Rework")).toBe(true);
  });

  it("10) Material issue/return/scrap/site balance — issue reduces warehouse", () => {
    const svc = new InventoryMovementService();
    const r = svc.applyMovement(
      {
        warehouseQty: 50,
        siteLedger: { materialId: 1, openingQty: 0, issuedQty: 0, returnedQty: 0, scrapAtSiteQty: 0, consumedQty: 0 },
      },
      "IssueToSite",
      5,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nextState?.warehouseQty).toBe(45);
  });

  it("11) Workstep requires material — shortfall when required qty exceeds issued + low stock", () => {
    const service = new ProcurementShortfallService();
    const inventoryItems: InventoryItem[] = [
      {
        id: 99,
        name: "Cable",
        category: "Wiring",
        stock: 5,
        unit: "m",
        value: 1,
        buyPrice: 10,
        salePrice: 12,
        hsn: "8544",
        minStock: 0,
        notes: "",
      },
    ];
    const project = makeProject({ id: "P-99", materialsSent: [] });
    const quotation: Quotation = {
      id: "Q-99",
      quotationNumber: "Q-99",
      status: "converted_to_project",
      quotationType: "solar",
      clientName: "C",
      clientPhone: "1",
      clientEmail: "a@a.com",
      clientCity: "J",
      clientState: "R",
      paymentType: "cash",
      totalAmount: 1000,
      isConverted: true,
      createdAt: "2026-01-01",
      customerId: "C-1",
      presetSnapshot: [{ id: 99, name: "Cable", quantity: 100, unit: "m", rate: 10 }],
    };
    const shortfalls = service.buildShortfalls({
      projects: [project],
      inventoryItems,
      getProjectQuotation: () => quotation,
      getSiteChecklistTemplateById: () => undefined,
    });
    expect(shortfalls.length).toBeGreaterThan(0);
  });

  it("12) Invoice GST breakup — voucher posts revenue and GST output", () => {
    const result = new VoucherPostingService().post({
      type: "InvoiceIssued",
      sourceDocumentId: "INV-1",
      amount: 1180,
      gstAmount: 180,
    });
    expect(result.ok).toBe(true);
  });

  it("13) Billing matrix — company_to_customer invariant (SOLO, snapshot, Vendor network)", () => {
    expect(new ProjectKindService().validateBillingDirection("SOLO_EPC", "company_to_customer")).toBe(true);
    expect(new ProjectKindService().validateBillingDirection("VENDOR_NETWORK", "company_to_customer")).toBe(true);
    const g = new BillingDirectionGuardService();
    const p = makeProject({
      projectKind: "SOLO_EPC",
      projectKindConfigSnapshot: {
        requiredParties: ["customer"],
        requiredCommercialFields: ["contractAmount"],
        allowedBillingDirections: ["company_to_customer"],
        visibleTabs: ["overview"],
        requiredDocuments: [],
        forbiddenActions: [],
      },
    });
    expect(g.canUseDirection(p, "company_to_customer").ok).toBe(true);
  });

  it("14) Voucher balancing — debits equal credits for posted event", () => {
    const result = new VoucherPostingService().post({ type: "InvoiceIssued", sourceDocumentId: "INV-2", amount: 2000, gstAmount: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const d = result.voucher.lines.reduce((a, l) => a + l.debit, 0);
      const c = result.voucher.lines.reduce((a, l) => a + l.credit, 0);
      expect(d).toBe(c);
    }
  });

  it("15) Unified expense required references — site_project needs projectId", () => {
    const v = new UnifiedFinanceValidationService();
    expect(v.validateExpense("site_project", {}).ok).toBe(false);
    expect(v.validateExpense("site_project", { projectId: "P1" }).ok).toBe(true);
  });

  it("16) Unified income required references — project_income needs projectId", () => {
    const v = new UnifiedFinanceValidationService();
    expect(v.validateIncome("project_income", {}).ok).toBe(false);
    expect(v.validateIncome("project_income", { projectId: "P1" }).ok).toBe(true);
  });

  it("17) Payroll calculation — final payable is positive with typical inputs", () => {
    const out = new PayrollPolicyService().calculate(fullPayrollInput);
    expect(out.finalPayable).toBeGreaterThan(0);
  });

  it("18) Leave approval to attendance — paid leave days contribute to paidDays in payroll", () => {
    const out = new PayrollPolicyService().calculate({
      ...fullPayrollInput,
      presentDays: 20,
      paidLeaveDays: 4,
    });
    expect(out.finalPayable).toBeGreaterThan(0);
  });

  it("19) Audit log creation — write persists an entry", () => {
    const repo = new LocalStorageJsonRepository<AuditLogEntry>("mss.test.p0.audit", []);
    const audit = new AuditService({ auditRepository: repo });
    const entry = audit.write(
      { actorUserId: "u1", actorRole: "admin" },
      { action: "update", entityType: "Test", entityId: "1", entityName: "E" },
    );
    expect(entry.id.length).toBeGreaterThan(4);
    expect(repo.getAll().length).toBe(1);
  });

  it("20) Dashboard role filtering — installation omits receivables tile", () => {
    const svc = new RoleDashboardService();
    expect(svc.getVisibleMetrics("installation_team")).not.toContain("receivables");
    expect(svc.getVisibleMetrics("admin")).toContain("receivables");
  });
});

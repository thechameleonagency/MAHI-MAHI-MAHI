/**
 * Renders every sidebar nav list route (+ detail routes from seeded data) as super_admin.
 * Catches PageErrorBoundary failures and route-access denials before manual QA.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import { allSidebarNavItems } from "@/lib/sidebarNav";
import { resetExhaustiveGeneratorState } from "@/lib/data-engine/exhaustiveGenerator";
import { runExhaustiveToCompletion } from "@/lib/data-engine/runExhaustiveToCompletion";
import { useDataEngineStore } from "@/lib/data-engine/useDataEngineStore";
import { useAppData, AppDataProvider } from "@/contexts/AppDataContext";
import { FoundationProvider } from "@/app/providers/FoundationProvider";
import { AppSessionProvider } from "@/app/providers/AppSessionProvider";
import { RoleMatrixProvider } from "@/contexts/RoleMatrixContext";
import { MastersProvider } from "@/contexts/MastersContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { persistAuthenticatedSession, clearAuthenticatedSession } from "@/lib/sessionActorStorage";
import AppLayout from "@/components/layout/AppLayout";
import RouteAccessGate, { RouteAccessBoundary } from "@/components/layout/RouteAccessGate";
import { PageErrorBoundary } from "@/app/shell/PageErrorBoundary";
import { resolvePageErrorRecovery } from "@/lib/routeErrorRecovery";

import Dashboard from "@/pages/Dashboard";
import Enquiries from "@/pages/Enquiries";
import Quotations from "@/pages/Quotations";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import ActiveSites from "@/pages/ActiveSites";
import Timeline from "@/pages/Timeline";
import CalendarPage from "@/pages/Calendar";
import Materials from "@/pages/Materials";
import Tools from "@/pages/Tools";
import TemplatesPage from "@/pages/inventory/TemplatesPage";
import Attendance from "@/pages/Attendance";
import Employees from "@/pages/Employees";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import EmployeeProfile from "@/pages/EmployeeProfile";
import Agents from "@/pages/Agents";
import AgentDetail from "@/pages/AgentDetail";
import Finance from "@/pages/Finance";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Invoices from "@/pages/Invoices";
import Vendors from "@/pages/Vendors";
import VendorDetail from "@/pages/VendorDetail";
import Loans from "@/pages/Loans";
import LoanPersonDetail from "@/pages/LoanPersonDetail";
import Partners from "@/pages/Partners";
import PartnerDetail from "@/pages/PartnerDetail";
import VendorshipCompanies from "@/pages/VendorshipCompanies";
import VendorshipCompanyDetail from "@/pages/VendorshipCompanyDetail";
import INCWorkSources from "@/pages/INCWorkSources";
import INCWorkSourceDetail from "@/pages/INCWorkSourceDetail";
import Subcontractors from "@/pages/Subcontractors";
import SubcontractorDetail from "@/pages/SubcontractorDetail";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import DesignSystem from "@/pages/DesignSystem";
import SuperAdminDataEngine from "@/pages/SuperAdminDataEngine";
import AuditDashboard from "@/pages/audit/AuditDashboard";
import ChartOfAccounts from "@/pages/audit/ChartOfAccounts";
import ProfitLoss from "@/pages/audit/ProfitLoss";
import InventoryAudit from "@/pages/audit/InventoryAudit";
import DebtorsCreditors from "@/pages/audit/DebtorsCreditors";
import GSTCompliance from "@/pages/audit/GSTCompliance";
import CashBankLedger from "@/pages/audit/CashBankLedger";
import ExpenseAudit from "@/pages/audit/ExpenseAudit";
import FixedAssets from "@/pages/audit/FixedAssets";
import AuditLogs from "@/pages/audit/AuditLogs";
import AuditReports from "@/pages/audit/AuditReports";
import AuditDataFlow from "@/pages/audit/AuditDataFlow";

const ERROR_BOUNDARY_TEXT = /This page failed to load|Project page failed to load/i;
const ACCESS_DENIED_TEXT = /isn't available for the .* role/i;

const ROUTE_ELEMENTS: Record<string, React.ReactElement> = {
  "/": <Dashboard />,
  "/enquiries": <Enquiries />,
  "/quotations": <Quotations />,
  "/projects": <Projects />,
  "/active-sites": <ActiveSites />,
  "/timeline": <Timeline />,
  "/calendar": <CalendarPage />,
  "/inventory/materials": <Materials />,
  "/inventory/tools": <Tools />,
  "/templates": <TemplatesPage />,
  "/attendance": <Attendance />,
  "/employees": <Employees />,
  "/teams": <Teams />,
  "/agents": <Agents />,
  "/finance": <Finance />,
  "/customers": <Customers />,
  "/invoices": <Invoices />,
  "/vendors": <Vendors />,
  "/loans": <Loans />,
  "/partners": <Partners />,
  "/vendorship-companies": <VendorshipCompanies />,
  "/subcontractors": <Subcontractors />,
  "/inc-work-sources": <INCWorkSources />,
  "/analytics": <Analytics />,
  "/notifications": <Notifications />,
  "/settings/design-system": <DesignSystem />,
  "/super-admin/data-engine": <SuperAdminDataEngine />,
  "/audit": <AuditDashboard />,
  "/audit/chart-of-accounts": <ChartOfAccounts />,
  "/audit/profit-loss": <ProfitLoss />,
  "/audit/inventory": <InventoryAudit />,
  "/audit/debtors-creditors": <DebtorsCreditors />,
  "/audit/gst": <GSTCompliance />,
  "/audit/cash-bank": <CashBankLedger />,
  "/audit/expenses": <ExpenseAudit />,
  "/audit/assets": <FixedAssets />,
  "/audit/logs": <AuditLogs />,
  "/audit/reports": <AuditReports />,
  "/audit/data-flow": <AuditDataFlow />,
};

function RoutePageShell({ path, children }: { path: string; children: React.ReactNode }) {
  const recovery = resolvePageErrorRecovery(path);
  return (
    <FoundationProvider>
      <AppSessionProvider>
        <RoleMatrixProvider>
          <AppDataProvider>
            <MastersProvider>
              <TooltipProvider>
                <MemoryRouter initialEntries={[path]}>
                  <RouteAccessGate />
                  <AppLayout>
                    <PageErrorBoundary recovery={recovery}>
                      <RouteAccessBoundary>{children}</RouteAccessBoundary>
                    </PageErrorBoundary>
                  </AppLayout>
                </MemoryRouter>
              </TooltipProvider>
            </MastersProvider>
          </AppDataProvider>
        </RoleMatrixProvider>
      </AppSessionProvider>
    </FoundationProvider>
  );
}

function assertPageRendered(path: string, container: HTMLElement) {
  const text = container.textContent ?? "";
  expect(text, `${path} hit PageErrorBoundary`).not.toMatch(ERROR_BOUNDARY_TEXT);
  expect(text, `${path} route access denied`).not.toMatch(ACCESS_DENIED_TEXT);
}

describe("sidebarNavRoutesRender", () => {
  beforeEach(() => {
    localStorage.clear();
    resetExhaustiveGeneratorState();
    useDataEngineStore.getState().clearState();
    persistAuthenticatedSession({
      memberId: "SA-001",
      email: "rajesh.kulkarni@mss.solar",
      role: "super_admin",
      displayName: "Rajesh Kulkarni",
    });
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    clearAuthenticatedSession();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it(
    "renders every sidebar list route without error boundary or access denial",
    async () => {
      const sidebarPaths = allSidebarNavItems().map((i) => i.path);
      const extraPaths = ["/super-admin/data-engine"];
      const paths = [...new Set([...sidebarPaths, ...extraPaths])];

      for (const path of paths) {
        const element = ROUTE_ELEMENTS[path];
        expect(element, `missing ROUTE_ELEMENTS entry for ${path}`).toBeDefined();
        const { container } = render(
          <RoutePageShell path={path}>{element}</RoutePageShell>,
        );
        await waitFor(() => expect(container.querySelector("main")).toBeTruthy(), { timeout: 12000 });
        assertPageRendered(path, container);
        cleanup();
      }
    },
    240_000,
  );

  it(
    "renders entity detail routes from seeded demo data",
    async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <FoundationProvider>
          <AppSessionProvider>
            <RoleMatrixProvider>
              <AppDataProvider>
                <MastersProvider>{children}</MastersProvider>
              </AppDataProvider>
            </RoleMatrixProvider>
          </AppSessionProvider>
        </FoundationProvider>
      );

      const { result } = renderHook(() => useAppData(), { wrapper });
      await waitFor(() => expect(result.current).toBeDefined());

      const store = useDataEngineStore.getState();
      const { completed } = await runExhaustiveToCompletion(
        () => result.current,
        store,
        { resetBeforeRun: true, maxIterations: 350 },
      );
      expect(completed).toBe(true);

      const data = result.current;
      const detailRoutes: { path: string; element: React.ReactElement }[] = [
        { path: `/projects/${data.projects[0]?.id}`, element: <ProjectDetail /> },
        { path: `/agents/${data.agents[0]?.id}`, element: <AgentDetail /> },
        { path: `/customers/${data.customers[0]?.id}`, element: <CustomerDetail /> },
        { path: `/teams/${data.teams[0]?.id}`, element: <TeamDetail /> },
        { path: `/employees/${data.employees[0]?.id}`, element: <EmployeeProfile /> },
        { path: `/vendors/${data.vendors[0]?.id}`, element: <VendorDetail /> },
        { path: `/partners/${data.partners[0]?.id}`, element: <PartnerDetail /> },
        {
          path: `/vendorship/${data.vendorshipCompanies[0]?.id}`,
          element: <VendorshipCompanyDetail />,
        },
        {
          path: `/inc-sources/${data.incGiverCompanies[0]?.id}`,
          element: <INCWorkSourceDetail />,
        },
        {
          path: `/subcontractor/${data.subcontractors?.[0]?.id}`,
          element: <SubcontractorDetail />,
        },
        {
          path: `/loans/person/${data.loans[0]?.id}`,
          element: <LoanPersonDetail />,
        },
      ].filter((r) => !r.path.includes("undefined"));

      for (const { path, element } of detailRoutes) {
        const { container } = render(
          <RoutePageShell path={path}>{element}</RoutePageShell>,
        );
        await waitFor(() => expect(container.querySelector("main")).toBeTruthy(), { timeout: 12000 });
        assertPageRendered(path, container);
        cleanup();
      }
    },
    300_000,
  );
});

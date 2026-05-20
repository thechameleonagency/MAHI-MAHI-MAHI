import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MastersProvider } from "@/contexts/MastersContext";
import { AppDataProvider } from "@/contexts/AppDataContext";
import { RoleMatrixProvider } from "@/contexts/RoleMatrixContext";
import { FoundationProvider } from "@/app/providers/FoundationProvider";
import { AppSessionProvider } from "@/app/providers/AppSessionProvider";
import { AppErrorBoundary } from "@/app/shell/AppErrorBoundary";
import { PageErrorBoundary } from "@/app/shell/PageErrorBoundary";
import { ProjectRouteErrorBoundary } from "@/app/shell/ProjectRouteErrorBoundary";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Quotations from "./pages/Quotations";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Materials from "./pages/Materials";
import Tools from "./pages/Tools";
import TemplatesPage from "./pages/inventory/TemplatesPage";
import InventoryIndexRedirect from "./components/routing/InventoryIndexRedirect";
import Employees from "./pages/Employees";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import Finance from "./pages/Finance";
import Vendors from "./pages/Vendors";
import Loans from "./pages/Loans";
import Partners from "./pages/Partners";
import PartnerDetail from "./pages/PartnerDetail";
import VendorshipCompanies from "./pages/VendorshipCompanies";
import VendorshipCompanyDetail from "./pages/VendorshipCompanyDetail";
import INCWorkSources from "./pages/INCWorkSources";
import INCWorkSourceDetail from "./pages/INCWorkSourceDetail";
import Timeline from "./pages/Timeline";
import CalendarPage from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CustomerDetail from "./pages/CustomerDetail";
import VendorDetail from "./pages/VendorDetail";
import LoanPersonDetail from "./pages/LoanPersonDetail";
import ActiveSites from "./pages/ActiveSites";
import Notifications from "./pages/Notifications";
import Enquiries from "./pages/Enquiries";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import AuditDashboard from "./pages/audit/AuditDashboard";
import ProfitLoss from "./pages/audit/ProfitLoss";
import InventoryAudit from "./pages/audit/InventoryAudit";
import DebtorsCreditors from "./pages/audit/DebtorsCreditors";
import GSTCompliance from "./pages/audit/GSTCompliance";
import CashBankLedger from "./pages/audit/CashBankLedger";
import ExpenseAudit from "./pages/audit/ExpenseAudit";
import FixedAssets from "./pages/audit/FixedAssets";
import AuditLogs from "./pages/audit/AuditLogs";
import AuditReports from "./pages/audit/AuditReports";
import AuditDataFlow from "./pages/audit/AuditDataFlow";
import ChartOfAccounts from "./pages/audit/ChartOfAccounts";

const queryClient = new QueryClient();

function Page({ children }: { children: ReactNode }) {
  return <PageErrorBoundary>{children}</PageErrorBoundary>;
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <FoundationProvider>
        <AppSessionProvider>
          <RoleMatrixProvider>
          <AppDataProvider>
            <MastersProvider>
              <TooltipProvider>
                <Toaster />
                <BrowserRouter>
                  <AppLayout>
                    <Routes>
                <Route path="/" element={<Page><Dashboard /></Page>} />
                <Route path="/active-sites" element={<Page><ActiveSites /></Page>} />
                <Route path="/projects" element={<Page><Projects /></Page>} />
                <Route
                  path="/projects/:id"
                  element={
                    <ProjectRouteErrorBoundary>
                      <ProjectDetail />
                    </ProjectRouteErrorBoundary>
                  }
                />
                <Route path="/quotations" element={<Page><Quotations /></Page>} />
                <Route path="/enquiries" element={<Page><Enquiries /></Page>} />
                <Route path="/agents" element={<Page><Agents /></Page>} />
                <Route path="/agents/:id" element={<Page><AgentDetail /></Page>} />
                <Route path="/customers" element={<Page><Customers /></Page>} />
                <Route path="/customers/:id" element={<Page><CustomerDetail /></Page>} />
                <Route path="/invoices" element={<Page><Invoices /></Page>} />
                {/* Legacy alias — not in appRouteRegistry / permission matrix (Md5). */}
                <Route path="/sale-bills" element={<Navigate to="/invoices" replace />} />
                {/* /inventory hub removed per audit B11 — `/inventory/materials` is the entry point. */}
                <Route path="/inventory" element={<InventoryIndexRedirect />} />
                <Route path="/inventory/materials" element={<Page><Materials /></Page>} />
                <Route path="/inventory/tools" element={<Page><Tools /></Page>} />
                <Route path="/templates" element={<Page><TemplatesPage /></Page>} />
                {/* Legacy aliases — not in appRouteRegistry / permission matrix (Md5). */}
                <Route path="/presets" element={<Navigate to="/templates" replace />} />
                <Route path="/inventory/presets" element={<Navigate to="/templates" replace />} />
                <Route path="/employees" element={<Page><Employees /></Page>} />
                <Route path="/teams" element={<Page><Teams /></Page>} />
                <Route path="/teams/:id" element={<Page><TeamDetail /></Page>} />
                <Route path="/employees/:id" element={<Page><EmployeeProfile /></Page>} />
                <Route path="/attendance" element={<Page><Attendance /></Page>} />
                <Route path="/finance" element={<Page><Finance /></Page>} />
                <Route path="/vendors" element={<Page><Vendors /></Page>} />
                <Route path="/vendors/:id" element={<Page><VendorDetail /></Page>} />
                <Route path="/loans" element={<Page><Loans /></Page>} />
                <Route path="/loans/person/:id" element={<Page><LoanPersonDetail /></Page>} />
                <Route path="/partners" element={<Page><Partners /></Page>} />
                <Route path="/partners/:id" element={<Page><PartnerDetail /></Page>} />
                <Route path="/vendorship-companies" element={<Page><VendorshipCompanies /></Page>} />
                <Route path="/vendorship/:id" element={<Page><VendorshipCompanyDetail /></Page>} />
                <Route path="/inc-work-sources" element={<Page><INCWorkSources /></Page>} />
                <Route path="/inc-sources/:id" element={<Page><INCWorkSourceDetail /></Page>} />
                <Route path="/timeline" element={<Page><Timeline /></Page>} />
                <Route path="/calendar" element={<Page><CalendarPage /></Page>} />
                <Route path="/analytics" element={<Page><Analytics /></Page>} />
                <Route path="/notifications" element={<Page><Notifications /></Page>} />
                <Route path="/settings" element={<Page><Settings /></Page>} />
                <Route path="/settings/design-system" element={<Page><Settings /></Page>} />
                <Route path="/audit" element={<Page><AuditDashboard /></Page>} />
                <Route path="/audit/chart-of-accounts" element={<Page><ChartOfAccounts /></Page>} />
                <Route path="/audit/profit-loss" element={<Page><ProfitLoss /></Page>} />
                <Route path="/audit/inventory" element={<Page><InventoryAudit /></Page>} />
                <Route path="/audit/debtors-creditors" element={<Page><DebtorsCreditors /></Page>} />
                <Route path="/audit/gst" element={<Page><GSTCompliance /></Page>} />
                <Route path="/audit/cash-bank" element={<Page><CashBankLedger /></Page>} />
                <Route path="/audit/expenses" element={<Page><ExpenseAudit /></Page>} />
                <Route path="/audit/assets" element={<Page><FixedAssets /></Page>} />
                <Route path="/audit/logs" element={<Page><AuditLogs /></Page>} />
                <Route path="/audit/reports" element={<Page><AuditReports /></Page>} />
                <Route path="/audit/data-flow" element={<Page><AuditDataFlow /></Page>} />
                <Route path="*" element={<Page><NotFound /></Page>} />
                    </Routes>
                  </AppLayout>
                </BrowserRouter>
              </TooltipProvider>
            </MastersProvider>
          </AppDataProvider>
          </RoleMatrixProvider>
        </AppSessionProvider>
      </FoundationProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;

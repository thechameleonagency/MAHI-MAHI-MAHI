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
import { ListPrefixDetailRedirect } from "./components/routing/ListPrefixDetailRedirect";
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
import DesignSystem from "./pages/DesignSystem";
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
import Login from "./pages/Login";
import InviteAccept from "./pages/InviteAccept";
import { AuthGate } from "./components/auth/AuthGate";

const queryClient = new QueryClient();

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
                  <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/invite/:token" element={<InviteAccept />} />
                <Route
                  element={
                    <AuthGate>
                      <AppLayout />
                    </AuthGate>
                  }
                >
                <Route path="/" element={<Dashboard />} />
                <Route path="/active-sites" element={<ActiveSites />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/enquiries" element={<Enquiries />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/invoices" element={<Invoices />} />
                {/* Legacy alias — not in appRouteRegistry / permission matrix (Md5). */}
                <Route path="/sale-bills" element={<Navigate to="/invoices" replace />} />
                {/* /inventory hub removed per audit B11 — `/inventory/materials` is the entry point. */}
                <Route path="/inventory" element={<InventoryIndexRedirect />} />
                <Route path="/inventory/materials" element={<Materials />} />
                <Route path="/inventory/tools" element={<Tools />} />
                <Route path="/templates" element={<TemplatesPage />} />
                {/* Legacy aliases — not in appRouteRegistry / permission matrix (Md5). */}
                <Route path="/presets" element={<Navigate to="/templates" replace />} />
                <Route path="/inventory/presets" element={<Navigate to="/templates" replace />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/teams/:id" element={<TeamDetail />} />
                <Route path="/employees/:id" element={<EmployeeProfile />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/vendors/:id" element={<VendorDetail />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/loans/person/:id" element={<LoanPersonDetail />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/partners/:id" element={<PartnerDetail />} />
                <Route path="/vendorship-companies" element={<VendorshipCompanies />} />
                <Route
                  path="/vendorship-companies/:id"
                  element={<ListPrefixDetailRedirect detailPrefix="/vendorship" />}
                />
                <Route path="/vendorship/:id" element={<VendorshipCompanyDetail />} />
                <Route path="/inc-work-sources" element={<INCWorkSources />} />
                <Route
                  path="/inc-work-sources/:id"
                  element={<ListPrefixDetailRedirect detailPrefix="/inc-sources" />}
                />
                <Route path="/inc-sources/:id" element={<INCWorkSourceDetail />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/design-system" element={<DesignSystem />} />
                <Route path="/audit" element={<AuditDashboard />} />
                <Route path="/audit/chart-of-accounts" element={<ChartOfAccounts />} />
                <Route path="/audit/profit-loss" element={<ProfitLoss />} />
                <Route path="/audit/inventory" element={<InventoryAudit />} />
                <Route path="/audit/debtors-creditors" element={<DebtorsCreditors />} />
                <Route path="/audit/gst" element={<GSTCompliance />} />
                <Route path="/audit/cash-bank" element={<CashBankLedger />} />
                <Route path="/audit/expenses" element={<ExpenseAudit />} />
                <Route path="/audit/assets" element={<FixedAssets />} />
                <Route path="/audit/logs" element={<AuditLogs />} />
                <Route path="/audit/reports" element={<AuditReports />} />
                <Route path="/audit/data-flow" element={<AuditDataFlow />} />
                <Route path="*" element={<NotFound />} />
                </Route>
                  </Routes>
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

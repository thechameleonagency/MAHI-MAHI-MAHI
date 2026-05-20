import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import RouteAccessGate, { RouteAccessBoundary } from "./RouteAccessGate";
import { PageHeaderStickyProvider } from "@/contexts/PageHeaderStickyContext";
import { PageErrorBoundary } from "@/app/shell/PageErrorBoundary";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <PageErrorBoundary>
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-canvas">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <div className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RouteAccessGate />
        <PageHeaderStickyProvider>
          <TopHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full min-h-0 min-w-0 max-w-[min(100%,var(--app-max-width,1680px))] px-3 py-4 sm:px-5 sm:py-5 md:pb-8">
              <RouteAccessBoundary>{children}</RouteAccessBoundary>
            </div>
          </main>
        </PageHeaderStickyProvider>
      </div>
    </div>
    </PageErrorBoundary>
  );
};

export default AppLayout;
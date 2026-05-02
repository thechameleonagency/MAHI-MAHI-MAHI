import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageShell className="space-y-4">
      <StickyPageHeader breadcrumbs={[{ label: "Home", to: "/" }, { label: "Not found" }]} />
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-8">
        <div className="text-center">
          <p className="mb-4 text-4xl font-bold tabular-nums" role="status">404</p>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <Link to="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default NotFound;

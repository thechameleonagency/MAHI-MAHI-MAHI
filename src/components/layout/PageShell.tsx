import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Standard vertical rhythm for a full route. Prefer over ad-hoc `space-y-4` on page roots.
 * Tables: keep your existing `DataTableShell` + column markup unchanged; only use this to stack sections.
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("ds-page", className)}>{children}</div>;
}

/**
 * Titled block inside a page (KPIs, filter row, or card group intro).
 */
export function PageSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ds-section", className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

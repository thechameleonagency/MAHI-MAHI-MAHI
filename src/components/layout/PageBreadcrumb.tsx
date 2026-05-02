import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function PageBreadcrumb({ items, actions }: PageBreadcrumbProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {isLast ? (
                <span className="text-base font-semibold text-primary truncate max-w-[200px] sm:max-w-none">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link 
                  to={item.href} 
                  className="text-base font-medium text-muted-foreground hover:text-foreground hover:underline underline-offset-4 transition-colors truncate max-w-[150px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-base font-medium text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

/** Standard max-width tokens for app modals (same family as Need-to-Get / large tables / forms). */
export const APP_DIALOG_SIZE_CLASS = {
  xs: "sm:max-w-sm",
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl sm:w-[90vw]",
  xl: "sm:max-w-4xl sm:w-[90vw]",
  xxl: "sm:max-w-5xl sm:w-[95vw]",
  wide: "sm:max-w-6xl sm:w-[95vw]",
} as const;

export type AppSheetSize = keyof typeof APP_DIALOG_SIZE_CLASS;

type AppSheetContentProps = React.ComponentPropsWithoutRef<typeof SheetContent> & {
  size?: AppSheetSize;
  /**
   * - **document** — tables / tools: flex column, no root scroll (children manage scroll). Matches Need-to-Get.
   * - **form** — long forms: scroll inside the dialog.
   * - **bare** — `p-0`; pair with `className` for image viewer / command palette.
   */
  layout?: "document" | "form" | "bare";
};

/**
 * Application-standard `SheetContent`: consistent widths, top padding for the close button (`pt-12`),
 * and two scroll strategies (document vs form).
 */
export const AppSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  AppSheetContentProps
>(({ size = "md", layout = "form", className, children, ...props }, ref) => (
  <SheetContent
    ref={ref}
    className={cn(
      APP_DIALOG_SIZE_CLASS[size],
      layout === "document" && "flex h-full flex-col gap-3 pt-12 sm:pt-12 print:max-w-none",
      layout === "form" && "flex h-full flex-col gap-4 overflow-y-auto pt-12 sm:pt-12",
      layout === "bare" && "overflow-hidden p-0",
      className,
    )}
    {...props}
  >
    {children}
  </SheetContent>
));
AppSheetContent.displayName = "AppSheetContent";

type AppSheetHeaderWithActionsProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Actions in the header row (e.g. Export / Print); use `print:hidden` on the container if needed. */
  actions?: React.ReactNode;
  className?: string;
};

/** Title + optional description on the left, optional actions on the right — same rhythm as Need-to-Get. */
export function AppSheetHeaderWithActions({
  title,
  description,
  actions,
  className,
}: AppSheetHeaderWithActionsProps) {
  return (
    <SheetHeader
      className={cn(
        "flex flex-col gap-3 space-y-0 text-left sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 max-w-[min(100%,42rem)] pr-12 sm:pr-14">
        <SheetTitle>{title}</SheetTitle>
        {description != null ? (
          typeof description === "string" ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            description
          )
        ) : null}
      </div>
      {actions != null ? (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 print:hidden sm:mr-10">{actions}</div>
      ) : null}
    </SheetHeader>
  );
}

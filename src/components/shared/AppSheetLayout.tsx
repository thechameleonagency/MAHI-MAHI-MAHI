import * as React from "react";
import { cn } from "@/lib/utils";
import { SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

/**
 * Standard sheet widths — use `AppSheetContent` + `size` instead of ad-hoc `SheetContent` classes.
 * Sizes: `xs` confirm · `sm`/`md` narrow forms · `lg`/`xl` tables · `xxl`/`wide` finance & BOM.
 * Layouts: `form` (padded scroll) · `scroll` (full-bleed body, padded gutters via inner content) · `document` · `bare`.
 */
export const APP_DIALOG_SIZE_CLASS = {
  xs: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-sm sm:w-full",
  sm: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md sm:w-full",
  md: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg sm:w-full",
  lg: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-3xl sm:w-[min(90vw,48rem)]",
  xl: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-4xl sm:w-[min(90vw,56rem)]",
  xxl: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-5xl sm:w-[min(95vw,64rem)]",
  wide: "w-full max-w-[calc(100vw-1.5rem)] sm:max-w-6xl sm:w-[min(95vw,72rem)]",
} as const;

/** @deprecated Prefer `size` prop on `AppSheetContent` */
export const sheetPresets = {
  wide: APP_DIALOG_SIZE_CLASS.wide,
  narrow: APP_DIALOG_SIZE_CLASS.md,
  confirm: APP_DIALOG_SIZE_CLASS.sm,
} as const;

export type AppSheetSize = keyof typeof APP_DIALOG_SIZE_CLASS;

export type AppSheetLayoutMode = "document" | "form" | "scroll" | "bare";

const APP_SHEET_LAYOUT_CLASS: Record<AppSheetLayoutMode, string> = {
  /** Long single-column forms — consistent horizontal padding and in-sheet scroll. */
  form: "flex h-full flex-col gap-4 overflow-y-auto overflow-x-hidden p-0 px-4 pb-6 pt-12 sm:px-6 sm:pb-6 sm:pt-12 custom-scrollbar",
  /** Detail / table sheets that manage their own inner padding (replaces legacy p-0 + 90vw overrides). */
  scroll:
    "flex h-full flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-12 sm:px-6 sm:pb-6 sm:pt-12 custom-scrollbar",
  /** Flex column; children own scroll regions (Need-to-Get style). */
  document: "flex h-full flex-col gap-3 overflow-hidden p-0 pt-12 sm:pt-12 print:max-w-none",
  bare: "overflow-hidden p-0 pt-12",
};

type AppSheetContentProps = React.ComponentPropsWithoutRef<typeof SheetContent> & {
  size?: AppSheetSize;
  layout?: AppSheetLayoutMode;
};

/**
 * Application-standard `SheetContent`: mobile-safe width (never raw 100vw), semantic sizes,
 * and shared padding/scroll behaviour.
 */
export const AppSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetContent>,
  AppSheetContentProps
>(({ size = "md", layout = "form", className, children, ...props }, ref) => (
  <SheetContent
    ref={ref}
    className={cn(
      "gap-0 p-0",
      APP_DIALOG_SIZE_CLASS[size],
      APP_SHEET_LAYOUT_CLASS[layout],
      className,
    )}
    {...props}
  >
    {children}
  </SheetContent>
));
AppSheetContent.displayName = "AppSheetContent";

/** Optional padded wrapper inside `layout="scroll"` / `document` sheets. */
export function AppSheetBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

type AppSheetHeaderWithActionsProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export function AppSheetHeaderWithActions({
  title,
  description,
  actions,
  className,
}: AppSheetHeaderWithActionsProps) {
  return (
    <SheetHeader
      className={cn(
        "flex flex-col gap-3 space-y-0 px-4 text-left sm:px-6",
        "sm:flex-row sm:items-start sm:justify-between",
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

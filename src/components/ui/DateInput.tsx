import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Standard app-wide native date control (CAT F2 — single pattern). */
export const DateInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "date", ...props }, ref) => (
    <Input ref={ref} type={type} className={cn("font-mono tabular-nums md:min-w-[9.5rem]", className)} {...props} />
  ),
);
DateInput.displayName = "DateInput";

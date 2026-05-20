import { CircleHelp, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PAGE_HEADER_PIN_HELP,
  pageHeaderPinAriaLabel,
  pageHeaderPinTooltip,
} from "@/lib/pageHeaderPinCopy";
import { ICON_CLASS_NAV } from "@/lib/iconSizes";
import { PAGE_HEADER_PIN_CONTROLS_COMPONENT } from "@/lib/tooltipPopoverPolicy";

type PageHeaderPinControlsProps = {
  pinned: boolean;
  onToggle: () => void;
};

/** DS10 — short pin label in Tooltip; `PAGE_HEADER_PIN_HELP` in Popover only (desktop header). */
export function PageHeaderPinControls({ pinned, onToggle }: PageHeaderPinControlsProps) {
  return (
    <div
      className="hidden items-center gap-0.5 md:flex"
      data-component={PAGE_HEADER_PIN_CONTROLS_COMPONENT}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="inline-flex h-8 w-8 shrink-0 sm:h-9 sm:w-9"
            aria-pressed={pinned}
            aria-label={pageHeaderPinAriaLabel(pinned)}
            onClick={onToggle}
          >
            {pinned ? <Pin className={ICON_CLASS_NAV} /> : <PinOff className={ICON_CLASS_NAV} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{pageHeaderPinTooltip(pinned)}</TooltipContent>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="inline-flex h-7 w-7 shrink-0 text-muted-foreground sm:h-8 sm:w-8"
            aria-label="About page header pin"
          >
            <CircleHelp className={ICON_CLASS_NAV} />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="text-sm">
          <p className="font-medium text-foreground">Page header pin</p>
          <p className="mt-1 text-muted-foreground">{PAGE_HEADER_PIN_HELP}</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

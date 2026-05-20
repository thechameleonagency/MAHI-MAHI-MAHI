import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getLifecycleTerm, type LifecycleTermId } from "@/lib/lifecycleTerminology";
import { cn } from "@/lib/utils";

type HintSide = "top" | "right" | "bottom" | "left";
type HintAlign = "start" | "center" | "end";

/**
 * Glossary popover (? icon) for lifecycle terms such as Withdraw vs Reject.
 */
export function LifecycleTermHint({
  term,
  className,
  iconClassName,
  contentClassName,
  side = "top",
  align = "center",
}: {
  term: LifecycleTermId;
  className?: string;
  iconClassName?: string;
  contentClassName?: string;
  side?: HintSide;
  align?: HintAlign;
}) {
  const entry = getLifecycleTerm(term);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label={`What is ${entry.title}?`}
          onClick={(e) => e.stopPropagation()}
        >
          <CircleHelp className={cn("h-3.5 w-3.5", iconClassName)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn("w-80 text-sm", contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium text-foreground">{entry.title}</p>
        <p className="mt-1 text-muted-foreground">{entry.summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">{entry.detail}</p>
        {entry.whenToUse ? (
          <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">When to use: </span>
            {entry.whenToUse}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

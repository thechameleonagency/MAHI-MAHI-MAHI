import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_INVITE_PROTOTYPE_LABEL,
  SEED_DEMO_INVITE_PATH,
  SEED_DEMO_INVITE_TOKEN,
} from "@/lib/inviteAcceptPrototype";

interface InvitePrototypeNoticeProps {
  /** Extra context for invalid / unknown tokens. */
  variant?: "invalid" | "default";
}

export function InvitePrototypeNotice({ variant = "default" }: InvitePrototypeNoticeProps) {
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      <Badge variant="outline" className="text-xs font-normal">
        {DEMO_INVITE_PROTOTYPE_LABEL}
      </Badge>
      <p>
        Invitations are stored in this browser only. Links work when created from Settings → Team,
        or when using the seeded demo token below.
      </p>
      {variant === "invalid" ? (
        <p>
          Unknown or expired tokens always show as invalid here — there is no server-side invite
          service in this build.
        </p>
      ) : null}
      <p className="text-xs">
        Demo pending invite:{" "}
        <Link to={SEED_DEMO_INVITE_PATH} className="text-primary underline-offset-2 hover:underline">
          /invite/{SEED_DEMO_INVITE_TOKEN}
        </Link>
      </p>
    </div>
  );
}

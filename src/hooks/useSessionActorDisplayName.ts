import { useMemo } from "react";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { DEMO_DEFAULT_SESSION_ROLE } from "@/domain/entities/identity";
import { resolveSessionActorDisplayName } from "@/lib/sessionActorDisplayName";
import { useAppData } from "@/contexts/AppDataContext";

/** Session actor display name for UI accountability fields (tasks, notes, etc.). */
export function useSessionActorDisplayName(): string {
  const { currentRole, sessionUserId, demoUserName } = useAppSession();
  const { settingsTeamMembers } = useAppData();
  const role = currentRole ?? DEMO_DEFAULT_SESSION_ROLE;
  return useMemo(
    () =>
      resolveSessionActorDisplayName({
        demoUserName,
        sessionUserId,
        role,
        teamMembers: settingsTeamMembers,
      }),
    [demoUserName, sessionUserId, role, settingsTeamMembers],
  );
}

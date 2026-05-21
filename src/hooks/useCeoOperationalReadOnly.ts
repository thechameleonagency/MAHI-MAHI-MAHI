import { useAppSession } from "@/app/providers/AppSessionProvider";
import { isCeoOperationalReadOnlyRole } from "@/lib/ceoOperationalReadOnly";

/** True when the signed-in actor is CEO (operational sheets and forms are view-only). */
export function useCeoOperationalReadOnly(): boolean {
  const { currentRole } = useAppSession();
  return isCeoOperationalReadOnlyRole(currentRole);
}

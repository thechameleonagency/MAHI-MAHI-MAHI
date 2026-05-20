import { useCallback, useEffect, useState } from "react";
import { getCompanyDisplayName } from "@/lib/companySettings";
import { SETTINGS_COMPANY_CHANGED_EVENT, SETTINGS_LS_KEYS } from "@/lib/settingsStorage";

/** Sidebar / shell brand label synced with Settings → Company name. */
export function useCompanyDisplayName(): string {
  const [displayName, setDisplayName] = useState(() => getCompanyDisplayName());

  const refresh = useCallback(() => {
    setDisplayName(getCompanyDisplayName());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_LS_KEYS.company) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SETTINGS_COMPANY_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SETTINGS_COMPANY_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return displayName;
}

import { buildEmptyAppState, normalizeAppState } from "@/data/appSeedBuilder";
import {
  hydrateInvoiceLinkage,
  hydrateProjectLinkage,
  hydrateQuotationLinkage,
} from "@/domain/project/linkageMigration";
import {
  APP_DATA_RESET_EPOCH,
  APP_DATA_RESET_EPOCH_KEY,
  clearAllAppStorage,
} from "@/lib/clearAppStorage";
import {
  getWorkspaceMode,
  isEmptyWorkspaceState,
  materializeDefaultBusinessBoot,
  persistDefaultBusinessBoot,
  setWorkspaceMode,
} from "@/lib/defaultAppBoot";
import { migrateOpaqueCustomerIds } from "@/lib/migrateCustomerIds";
import { migratePersistedState } from "@/lib/migratePersistedIds";
import { reconcileBillingAmountReceivedState } from "@/lib/billingAmountReceivedContinuity";
import { reconcileAuditLogUserNames } from "@/lib/resolveAuditActorUserName";
import { reconcileEnquiriesConvertedOnProjectLink } from "@/lib/reconcileEnquiryConvertedOnProjectLink";
import { reconcileVendorBillInventoryReceipt } from "@/lib/vendorBillInventoryLinkage";
import { reconcileVendorBillVouchers } from "@/lib/vendorBillVoucherPosting";
import { reconcileProjectActorScopeSeed } from "@/lib/reconcileProjectActorScopeSeed";
import { reconcileIncGiverTransactions } from "@/lib/reconcileIncGiverTransactions";
import { reconcileChangeRequestDeltaInvoices } from "@/lib/reconcileChangeRequestDeltaInvoices";
import { reconcileProjectAgentCommissionState } from "@/lib/projectStartContinuity";
import { normalizeNonCollectibleBillingDocuments } from "@/lib/clientPaymentReconciliation";
import { reconcileCustomersAutoArchive } from "@/domain/customer/customerArchive";
import { reconcileProjectCustomerLinkage } from "@/lib/projectCustomerLinkage";
import { reconcileProgressReportTaskLinkage } from "@/lib/progressReportTaskContinuity";
import { syncSitesChecklistFromProjects } from "@/lib/siteChecklistNeedToGetSync";
import { sanitizeBillingDocuments } from "@/lib/sanitizeBillingDocuments";
import type { AppState } from "@/contexts/AppDataContext";

/** Primary localStorage blob for prototype app state (AppDataContext). */
export const APP_DATA_STORAGE_KEY = "mahi_solar_app_data";

/** Bump when stored shape changes; older payloads migrate or reset. */
export const APP_DATA_STORAGE_VERSION = 9;

export const APP_DATA_STORAGE_VERSION_KEY = "mahi_solar_app_data_version";

/** Keys that should trigger a cross-tab reload of AppDataContext. */
export const APP_DATA_STORAGE_SYNC_KEYS = [
  APP_DATA_STORAGE_KEY,
  APP_DATA_STORAGE_VERSION_KEY,
  APP_DATA_RESET_EPOCH_KEY,
] as const;

export function isAppDataStorageSyncKey(key: string | null): boolean {
  if (!key) return false;
  return (APP_DATA_STORAGE_SYNC_KEYS as readonly string[]).includes(key);
}

export function serializeAppState(state: AppState): string {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Date) return { __date__: value.toISOString() };
    return value;
  });
}

export function deserializeAppState(json: string): AppState | null {
  try {
    return JSON.parse(json, (_key, value) => {
      if (value && typeof value === "object" && value.__date__) {
        return new Date(value.__date__ as string);
      }
      return value;
    }) as AppState;
  } catch {
    return null;
  }
}

/** Hydrate FK links and billing metrics on a full state snapshot (no seed merge). */
export function applyAppStateHydrationPipeline(state: AppState): AppState {
  const migrated = migrateOpaqueCustomerIds(state);
  const customers = migrated.customers;
  const projects = hydrateProjectLinkage(migrated.projects, customers);
  const quotations = hydrateQuotationLinkage(migrated.quotations, customers);
  const invoices = normalizeNonCollectibleBillingDocuments(
    sanitizeBillingDocuments(
      hydrateInvoiceLinkage(migrated.invoices, customers, projects),
      "invoices",
    ),
  );
  const saleBills = normalizeNonCollectibleBillingDocuments(
    sanitizeBillingDocuments(
      hydrateInvoiceLinkage(migrated.saleBills, customers, projects),
      "saleBills",
    ),
  );
  const auditLogs = reconcileAuditLogUserNames(migrated.auditLogs, migrated.settingsTeamMembers);
  const linked = reconcileEnquiriesConvertedOnProjectLink({
    ...migrated,
    projects,
    quotations,
    invoices,
    saleBills,
    auditLogs,
  });

  const withBilling = reconcileBillingAmountReceivedState(linked);

  const withSites = {
    ...withBilling,
    customers: reconcileCustomersAutoArchive({
      customers: withBilling.customers,
      projects: withBilling.projects,
      quotations: withBilling.quotations,
      enquiries: withBilling.enquiries,
    }),
    sites: syncSitesChecklistFromProjects(
      withBilling.projects,
      withBilling.sites,
      withBilling.inventoryItems,
    ),
  };

  return reconcileProgressReportTaskLinkage(
    reconcileProjectCustomerLinkage(
      reconcileProjectAgentCommissionState(
        reconcileIncGiverTransactions(
          reconcileChangeRequestDeltaInvoices(
            reconcileProjectActorScopeSeed(
              reconcileVendorBillInventoryReceipt(reconcileVendorBillVouchers(withSites)),
            ),
          ),
        ),
      ),
    ),
  );
}

export function persistFreshAppStateSeed(baseSeed: AppState): void {
  localStorage.setItem(APP_DATA_RESET_EPOCH_KEY, APP_DATA_RESET_EPOCH);
  localStorage.setItem(APP_DATA_STORAGE_VERSION_KEY, String(APP_DATA_STORAGE_VERSION));
  localStorage.setItem(APP_DATA_STORAGE_KEY, serializeAppState(baseSeed));
}

type ReadPersistedOptions = {
  /** When true, writes default/empty boot keys if storage is missing or stale (initial provider mount). */
  persistOnBootstrap?: boolean;
};

function hydrateStoredSnapshot(parsed: AppState, storedVersion: number): AppState {
  let next = parsed;
  if (storedVersion < APP_DATA_STORAGE_VERSION) {
    next = migratePersistedState(parsed);
  }
  return applyAppStateHydrationPipeline(normalizeAppState(next));
}

/**
 * Load app state from localStorage (hydrated). Used on boot and on cross-tab `storage` events.
 *
 * Default opening state: full business seed (all roles see data after login).
 * Explicit Settings "Reset to empty workspace" sets workspace mode `empty`.
 * Clearing localStorage re-triggers default business seed on next load.
 */
export function readPersistedAppState(options?: ReadPersistedOptions): AppState {
  const emptyBoot = buildEmptyAppState();
  const persistOnBootstrap = options?.persistOnBootstrap === true;

  try {
    const storedEpoch = localStorage.getItem(APP_DATA_RESET_EPOCH_KEY);
    const storedVersion = Number(localStorage.getItem(APP_DATA_STORAGE_VERSION_KEY) ?? "0");
    const workspaceMode = getWorkspaceMode();
    const needsFullReset =
      storedEpoch !== APP_DATA_RESET_EPOCH || storedVersion !== APP_DATA_STORAGE_VERSION;

    if (needsFullReset) {
      if (persistOnBootstrap) {
        return persistDefaultBusinessBoot();
      }
      return materializeDefaultBusinessBoot();
    }

    if (workspaceMode === "empty") {
      if (persistOnBootstrap && !localStorage.getItem(APP_DATA_STORAGE_KEY)) {
        persistFreshAppStateSeed(emptyBoot);
      }
      const stored = localStorage.getItem(APP_DATA_STORAGE_KEY);
      if (stored) {
        const parsed = deserializeAppState(stored);
        if (parsed) {
          return hydrateStoredSnapshot(parsed, storedVersion);
        }
      }
      return emptyBoot;
    }

    const stored = localStorage.getItem(APP_DATA_STORAGE_KEY);
    if (stored) {
      const parsed = deserializeAppState(stored);
      if (parsed) {
        const hydrated = hydrateStoredSnapshot(parsed, storedVersion);
        if (persistOnBootstrap && isEmptyWorkspaceState(hydrated)) {
          return persistDefaultBusinessBoot();
        }
        return hydrated;
      }
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("Failed to load persisted app state:", e);
    }
  }

  if (persistOnBootstrap) {
    return persistDefaultBusinessBoot();
  }
  return emptyBoot;
}

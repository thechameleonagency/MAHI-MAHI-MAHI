import { computeSiteLedgerBalance, type SiteLedgerEntry } from "@/domain/inventory/siteLedger";

export type MovementType =
  | "PurchaseIn"
  | "IssueToProject"
  | "IssueToSite"
  | "ReturnToWarehouse"
  | "TransferSiteToSite"
  | "ScrapWarehouse"
  | "ScrapSite"
  | "ConsumptionAtSite";

export type WarehouseAndSiteState = {
  warehouseQty: number;
  siteLedger: SiteLedgerEntry;
};

export class InventoryMovementService {
  applyMovement(
    state: WarehouseAndSiteState,
    movementType: MovementType,
    qty: number,
    options?: { allowNegativeSiteBalanceOverride?: boolean },
  ): { ok: boolean; nextState?: WarehouseAndSiteState; error?: string } {
    if (qty <= 0) {
      return { ok: false, error: "Movement quantity must be greater than zero" };
    }

    const nextState: WarehouseAndSiteState = {
      warehouseQty: state.warehouseQty,
      siteLedger: { ...state.siteLedger },
    };

    switch (movementType) {
      case "PurchaseIn":
        nextState.warehouseQty += qty;
        break;
      case "IssueToProject":
      case "IssueToSite":
        if (nextState.warehouseQty < qty) {
          return { ok: false, error: "Insufficient warehouse stock" };
        }
        nextState.warehouseQty -= qty;
        nextState.siteLedger.issuedQty += qty;
        break;
      case "ReturnToWarehouse":
        nextState.warehouseQty += qty;
        nextState.siteLedger.returnedQty += qty;
        break;
      case "ScrapWarehouse":
        if (nextState.warehouseQty < qty) {
          return { ok: false, error: "Insufficient warehouse stock for scrap" };
        }
        nextState.warehouseQty -= qty;
        break;
      case "ScrapSite":
        nextState.siteLedger.scrapAtSiteQty += qty;
        break;
      case "ConsumptionAtSite":
        nextState.siteLedger.consumedQty += qty;
        break;
      case "TransferSiteToSite":
        nextState.siteLedger.returnedQty += qty;
        break;
      default:
        return { ok: false, error: "Unsupported movement type" };
    }

    const nextBalance = computeSiteLedgerBalance(nextState.siteLedger);
    if (nextBalance < 0 && !options?.allowNegativeSiteBalanceOverride) {
      return { ok: false, error: "Site ledger cannot go negative without override" };
    }

    return { ok: true, nextState };
  }
}

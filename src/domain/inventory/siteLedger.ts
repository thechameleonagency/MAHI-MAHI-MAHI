export type SiteLedgerEntry = {
  materialId: number;
  openingQty: number;
  issuedQty: number;
  returnedQty: number;
  scrapAtSiteQty: number;
  consumedQty: number;
};

export const computeSiteLedgerBalance = (entry: SiteLedgerEntry): number => {
  return entry.openingQty + entry.issuedQty - entry.returnedQty - entry.scrapAtSiteQty - entry.consumedQty;
};

export const willHaveNegativeSiteBalance = (entry: SiteLedgerEntry): boolean => {
  return computeSiteLedgerBalance(entry) < 0;
};

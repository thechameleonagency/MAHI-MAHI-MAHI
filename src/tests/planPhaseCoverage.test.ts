import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

function mustExist(rel: string) {
  it(rel, () => {
    expect(existsSync(resolve(root, rel))).toBe(true);
  });
}

/** Sanity: critical plan deliverables exist on disk (not behavioural). */
describe("plan phase file coverage", () => {
  mustExist("src/types/operations.ts");
  mustExist("src/lib/createFromContext.ts");
  mustExist("src/lib/calendarSources.ts");
  mustExist("src/lib/pricingBasis.ts");
  mustExist("src/lib/audit/ledgerTotals.ts");
  mustExist("src/lib/audit/postingAccountMap.ts");
  mustExist("src/pages/Calendar.tsx");
  mustExist("src/components/projects/ProjectStartActions.tsx");
  mustExist("src/components/projects/ChangeRequestSheet.tsx");
  mustExist("src/components/projects/MaterialDamageSheet.tsx");
  mustExist("src/components/ui/AgingChip.tsx");
  mustExist("public/prototype-wipe.html");
});

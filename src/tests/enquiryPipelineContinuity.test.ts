import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  findStaleOpenEnquiriesAfterProjectWin,
  quotationTriggersEnquiryConverted,
} from "@/lib/enquiryPipelineContinuity";
import type { AppState } from "@/contexts/AppDataContext";

describe("enquiryPipelineContinuity (FC1)", () => {
  it("detects open enquiry when quotation already converted to project", () => {
    const state = {
      enquiries: [
        {
          id: "ENQ-1",
          customerName: "A",
          status: "quotation_sent",
        },
      ],
      quotations: [
        {
          id: "Q-1",
          status: "converted_to_project",
          linkedProjectId: "P-1",
          enquiryId: "ENQ-1",
        },
      ],
    } as unknown as AppState;

    expect(quotationTriggersEnquiryConverted(state.quotations[0])).toBe(true);
    const stale = findStaleOpenEnquiriesAfterProjectWin(state);
    expect(stale).toHaveLength(1);
    expect(stale[0]?.enquiryId).toBe("ENQ-1");
  });

  it("full business seed has no stale enquiries after hydration", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(findStaleOpenEnquiriesAfterProjectWin(hydrated)).toEqual([]);
  });
});

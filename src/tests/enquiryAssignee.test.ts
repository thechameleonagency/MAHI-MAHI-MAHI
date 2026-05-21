import { describe, expect, it } from "vitest";
import { buildBusinessSeed } from "@/data/seed/buildBusinessSeed";
import { applyAppStateHydrationPipeline } from "@/lib/appDataStorage";
import {
  buildEnquiryAssignmentFromMemberId,
  getEnquiryAssigneeDisplayName,
  normalizeEnquiryAssignmentPatch,
  reconcileEnquiryAssignees,
  findStaleEnquiryAssigneeState,
} from "@/lib/enquiryAssignee";
import { filterEnquiriesForList } from "@/lib/enquiryListFilters";
import { isProjectVisibleToSalesperson } from "@/lib/projectActorScope";
import type { Enquiry } from "@/types/project";

const members = [
  { id: "SAL-001", name: "Priya Nair", email: "p@mss.solar", role: "salesperson", status: "Active" },
  { id: "SAL-002", name: "Deepa Sharma", email: "d@mss.solar", role: "salesperson", status: "Active" },
];

describe("enquiryAssignee (MD2)", () => {
  it("buildEnquiryAssignmentFromMemberId stores id and display name", () => {
    expect(buildEnquiryAssignmentFromMemberId("SAL-001", members)).toEqual({
      assignedToMemberId: "SAL-001",
      assignedTo: "Priya Nair",
    });
  });

  it("normalizeEnquiryAssignmentPatch resolves legacy display name", () => {
    const patch = normalizeEnquiryAssignmentPatch({ assignedTo: "Deepa Sharma" }, members);
    expect(patch.assignedToMemberId).toBe("SAL-002");
    expect(patch.assignedTo).toBe("Deepa Sharma");
  });

  it("reconcileEnquiryAssignees repairs id-only legacy assignedTo", () => {
    const state = {
      enquiries: [
        {
          id: "ENQ-1",
          assignedTo: "SAL-001",
          customerName: "A",
        } as Enquiry,
      ],
      settingsTeamMembers: members,
    } as import("@/contexts/AppDataContext").AppState;

    const next = reconcileEnquiryAssignees(state);
    expect(next.enquiries[0].assignedToMemberId).toBe("SAL-001");
    expect(next.enquiries[0].assignedTo).toBe("Priya Nair");
  });

  it("filterEnquiriesForList matches by assignedToMemberId", () => {
    const rows = [
      {
        id: "E1",
        assignedToMemberId: "SAL-001",
        assignedTo: "Priya Nair",
        status: "new",
      } as Enquiry,
      {
        id: "E2",
        assignedToMemberId: "SAL-002",
        assignedTo: "Deepa Sharma",
        status: "new",
      } as Enquiry,
    ];
    const filtered = filterEnquiriesForList(rows, { assigneeFilter: "SAL-001" });
    expect(filtered.map((e) => e.id)).toEqual(["E1"]);
  });

  it("findStaleEnquiryAssigneeState flags name-only legacy rows", () => {
    const stale = findStaleEnquiryAssigneeState(
      [
        {
          id: "ENQ-1",
          customerName: "A",
          customerPhone: "1",
          customerEmail: "a@b.com",
          customerAddress: "x",
          customerType: "company",
          systemCapacity: "5 kW",
          estimatedBudget: 1000,
          requirements: "",
          status: "new",
          source: "phone",
          priority: "low",
          assignedTo: "Priya Nair",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          notes: [],
        },
      ],
      members,
    );
    expect(stale).toEqual([{ enquiryId: "ENQ-1", reason: "name_without_member_id" }]);
  });

  it("hydrated smoke seed has no stale enquiry assignees (ER1)", () => {
    const { state } = buildBusinessSeed("smoke");
    const hydrated = applyAppStateHydrationPipeline(state);
    expect(
      findStaleEnquiryAssigneeState(hydrated.enquiries, hydrated.settingsTeamMembers),
    ).toEqual([]);
  });

  it("project scope uses assignedToMemberId", () => {
    const enquiry = {
      id: "E-1",
      assignedToMemberId: "SAL-001",
      assignedTo: "Priya Nair",
      customerName: "A",
    } as Enquiry;
    const project = {
      id: "P-1",
      quotationId: "Q-1",
    } as import("@/types/project").Project;
    expect(
      isProjectVisibleToSalesperson(project, {
        actorMemberId: "SAL-001",
        actorDisplayName: "Someone Else",
        quotations: [{ id: "Q-1", enquiryId: "E-1" } as import("@/types/project").Quotation],
        enquiries: [enquiry],
      }),
    ).toBe(true);
    expect(getEnquiryAssigneeDisplayName(enquiry, members)).toBe("Priya Nair");
  });
});

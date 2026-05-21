import { describe, expect, it } from "vitest";
import {
  filterEnquiriesForActor,
  filterProjectsForActor,
  filterQuotationsForActor,
  isEnquiryVisibleToActor,
  isProjectVisibleToActor,
  isQuotationVisibleToActor,
  resolveActorCrewEmployeeIds,
  resolveActorEmployeeId,
} from "@/lib/projectActorScope";
import type { Project } from "@/types/project";

const baseProject = (id: string, extras: Partial<Project> = {}): Project =>
  ({
    id,
    name: `Project ${id}`,
    client: "Client",
    capacity: "5 kW",
    location: "Pune",
    lifecycleStatus: "In Progress",
    status: "Ongoing",
    contractAmount: 100000,
    amountReceived: 0,
    assignees: [],
    startDate: "2026-01-01",
    createdAt: "2026-01-01",
    ...extras,
  }) as Project;

describe("projectActorScope", () => {
  const employees = [
    { id: "EMP-SAL-1", name: "Priya Nair", email: "priya.nair@mss.solar", status: "Active" as const },
    { id: "EMP-INST-1", name: "Karthik Rao", email: "karthik.rao@mss.solar", status: "Active" as const },
    { id: "EMP-INST-2", name: "Manoj Patel", email: "manoj.patel@mss.solar", status: "Active" as const },
  ];
  const settingsTeamMembers = [
    { id: "SAL-001", name: "Priya Nair", email: "priya.nair@mss.solar", role: "salesperson", status: "Active" },
    { id: "SAL-002", name: "Deepa Sharma", email: "deepa.sharma@mss.solar", role: "salesperson", status: "Active" },
    { id: "INST-001", name: "Karthik Rao", email: "karthik.rao@mss.solar", role: "installation_team", status: "Active" },
    { id: "INST-002", name: "Manoj Patel", email: "manoj.patel@mss.solar", role: "installation_team", status: "Active" },
  ];
  const teams = [
    {
      id: "TEAM-A",
      name: "Crew A",
      memberIds: ["EMP-INST-1", "EMP-INST-2"],
      status: "Active" as const,
      createdAt: "2026-01-01",
    },
    {
      id: "TEAM-B",
      name: "Crew B",
      memberIds: ["EMP-OTHER"],
      status: "Active" as const,
      createdAt: "2026-01-01",
    },
  ];

  it("resolves employee id from settings member email", () => {
    expect(resolveActorEmployeeId("INST-001", employees, settingsTeamMembers)).toBe("EMP-INST-1");
  });

  it("crew includes teammates on the same team", () => {
    expect(resolveActorCrewEmployeeIds("EMP-INST-1", teams)).toEqual(["EMP-INST-1", "EMP-INST-2"]);
  });

  it("salesperson sees only projects from enquiries they own", () => {
    const projects = [
      baseProject("P-OWN", { quotationId: "Q-1" }),
      baseProject("P-OTHER", { quotationId: "Q-2" }),
    ];
    const ctx = {
      role: "salesperson" as const,
      actorMemberId: "SAL-001",
      actorDisplayName: "Priya Nair",
      quotations: [
        { id: "Q-1", enquiryId: "E-1" } as import("@/types/project").Quotation,
        { id: "Q-2", enquiryId: "E-2" } as import("@/types/project").Quotation,
      ],
      enquiries: [
        {
          id: "E-1",
          assignedToMemberId: "SAL-001",
          assignedTo: "Priya Nair",
          customerName: "A",
        } as import("@/types/project").Enquiry,
        {
          id: "E-2",
          assignedToMemberId: "SAL-002",
          assignedTo: "Deepa Sharma",
          customerName: "B",
        } as import("@/types/project").Enquiry,
      ],
      teams,
      employees,
      settingsTeamMembers,
    };
    const visible = filterProjectsForActor(projects, ctx);
    expect(visible.map((p) => p.id)).toEqual(["P-OWN"]);
  });

  it("installation_team sees assigned projects and teammate crew projects", () => {
    const projects = [
      baseProject("P-CREW", {
        teamAssignments: [{ id: "TA-1", teamId: "TEAM-A", teamName: "Crew A", startDate: "2026-01-01" }],
        assignees: ["EMP-INST-1", "EMP-INST-2"],
      }),
      baseProject("P-OTHER-CREW", {
        teamAssignments: [{ id: "TA-2", teamId: "TEAM-B", teamName: "Crew B", startDate: "2026-01-01" }],
        assignees: ["EMP-OTHER"],
      }),
    ];
    const ctx = {
      role: "installation_team" as const,
      actorMemberId: "INST-001",
      quotations: [],
      enquiries: [],
      teams,
      employees,
      settingsTeamMembers,
    };
    expect(isProjectVisibleToActor(projects[0], ctx)).toBe(true);
    expect(isProjectVisibleToActor(projects[1], ctx)).toBe(false);
    expect(filterProjectsForActor(projects, ctx).map((p) => p.id)).toEqual(["P-CREW"]);
  });

  it("salesperson sees quotation by salesOwnerMemberId without enquiry assignee drift", () => {
    const ctx = {
      role: "salesperson" as const,
      actorMemberId: "SAL-001",
      quotations: [
        {
          id: "Q-ORPHAN",
          salesOwnerMemberId: "SAL-001",
          clientName: "X",
        } as import("@/types/project").Quotation,
      ],
      enquiries: [],
      teams,
      employees,
      settingsTeamMembers,
    };
    expect(isQuotationVisibleToActor(ctx.quotations[0], ctx)).toBe(true);
    expect(filterQuotationsForActor(ctx.quotations, ctx)).toHaveLength(1);
  });

  it("filterEnquiriesForActor limits salesperson to owned enquiries", () => {
    const enquiries = [
      {
        id: "E-1",
        assignedToMemberId: "SAL-001",
        assignedTo: "Priya Nair",
        customerName: "A",
      } as import("@/types/project").Enquiry,
      {
        id: "E-2",
        assignedToMemberId: "SAL-002",
        assignedTo: "Deepa Sharma",
        customerName: "B",
      } as import("@/types/project").Enquiry,
    ];
    const ctx = {
      role: "salesperson" as const,
      actorMemberId: "SAL-001",
      quotations: [],
      enquiries,
      teams,
      employees,
      settingsTeamMembers,
    };
    expect(filterEnquiriesForActor(enquiries, ctx).map((e) => e.id)).toEqual(["E-1"]);
    expect(isEnquiryVisibleToActor(enquiries[1], ctx)).toBe(false);
  });

  it("installation_team does not see enquiries in actor scope", () => {
    const enquiry = {
      id: "E-1",
      assignedToMemberId: "SAL-001",
      customerName: "A",
    } as import("@/types/project").Enquiry;
    expect(
      isEnquiryVisibleToActor(enquiry, {
        role: "installation_team",
        actorMemberId: "INST-001",
      }),
    ).toBe(false);
  });

  it("admin sees all projects", () => {
    const projects = [baseProject("P-1"), baseProject("P-2")];
    const ctx = {
      role: "admin" as const,
      actorMemberId: "ADM-001",
      quotations: [],
      enquiries: [],
      teams,
      employees,
    };
    expect(filterProjectsForActor(projects, ctx)).toHaveLength(2);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { buildEmptyAppState } from "@/data/appSeedBuilder";
import { dummyProjects, dummyQuotations, dummyCustomers, dummyEnquiries } from "@/data/dummyData";
import { createPrototypeRepositoryContext } from "@/infrastructure/repositories/localStorage/createPrototypeRepositoryContext";
import { syncPrototypeRepositoriesFromAppState } from "@/infrastructure/repositories/syncPrototypeRepositories";

describe("syncPrototypeRepositoriesFromAppState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes canonical AppState slices into mss.repo.* keys", () => {
    const repositories = createPrototypeRepositoryContext();
    const state = {
      ...buildEmptyAppState(),
      projects: dummyProjects.slice(0, 1),
      quotations: dummyQuotations.slice(0, 1),
      customers: dummyCustomers.slice(0, 1),
      enquiries: dummyEnquiries.slice(0, 1),
    };

    syncPrototypeRepositoriesFromAppState(state, repositories);

    expect(repositories.projectRepository.getAll()).toHaveLength(1);
    expect(repositories.quotationRepository.getAll()).toHaveLength(1);
    expect(repositories.customerRepository.getAll()).toHaveLength(1);
    expect(repositories.enquiryRepository.getAll()).toHaveLength(1);
    expect(localStorage.getItem("mss.repo.projects")).toContain(dummyProjects[0].id);
  });
});

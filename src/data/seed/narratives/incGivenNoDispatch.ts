import type { NarrativeApply } from "./shared";

export const applyIncGivenNoDispatch: NarrativeApply = (state) => {
  for (const p of state.projects.filter((x) => x.projectKind === "INC_GIVEN")) {
    p.materialsSent = [];
    p.siteChecklist = [];
  }
};

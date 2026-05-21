import type { AppState } from "@/contexts/AppDataContext";

export type NarrativeApply = (state: AppState) => void;

export function firstProject(state: AppState, pred?: (p: AppState["projects"][0]) => boolean) {
  return state.projects.find(pred ?? (() => true));
}

export function firstCustomer(state: AppState) {
  return state.customers[0];
}

export function firstQuotation(state: AppState, status?: string) {
  return status ? state.quotations.find((q) => q.status === status) : state.quotations[0];
}

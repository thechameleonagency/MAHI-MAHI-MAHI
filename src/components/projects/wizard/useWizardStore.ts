import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  UnifiedProjectWizardState,
  UnifiedWizardStep,
  createInitialUnifiedWizardState,
} from "@/types/createProjectWizard";
import { getVisibleUnifiedWizardSteps } from "@/lib/unifiedProjectWizardFlow";

interface WizardStoreState extends UnifiedProjectWizardState {
  currentStep: UnifiedWizardStep;
  setField: <K extends keyof UnifiedProjectWizardState>(
    field: K,
    value: UnifiedProjectWizardState[K],
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: (overrides?: Partial<UnifiedProjectWizardState>) => void;
  setStep: (step: UnifiedWizardStep) => void;
  hydrateFromPrefill: (patch: Partial<UnifiedProjectWizardState>) => void;
}

export const useWizardStore = create<WizardStoreState>()(
  persist(
    (set, get) => ({
      ...createInitialUnifiedWizardState(),
      currentStep: "deal",

      setField: (field, value) => set((state) => ({ ...state, [field]: value })),

      nextStep: () => {
        const state = get();
        const steps = getVisibleUnifiedWizardSteps(state);
        const idx = steps.indexOf(state.currentStep);
        if (idx >= 0 && idx < steps.length - 1) {
          set({ currentStep: steps[idx + 1]! });
        }
      },

      prevStep: () => {
        const state = get();
        const steps = getVisibleUnifiedWizardSteps(state);
        const idx = steps.indexOf(state.currentStep);
        if (idx > 0) {
          set({ currentStep: steps[idx - 1]! });
        }
      },

      setStep: (step) => set({ currentStep: step }),

      resetWizard: (overrides) =>
        set({
          ...createInitialUnifiedWizardState(overrides),
          currentStep: "deal",
        }),

      hydrateFromPrefill: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
        })),
    }),
    {
      name: "mss-unified-wizard-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        const { currentStep, setField, nextStep, prevStep, resetWizard, setStep, hydrateFromPrefill, ...draft } =
          state;
        return draft as UnifiedProjectWizardState & { currentStep: UnifiedWizardStep };
      },
    },
  ),
);

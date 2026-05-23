import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  UnifiedProjectWizardState,
  createInitialUnifiedWizardState,
} from "@/types/createProjectWizard";

interface WizardStoreState extends UnifiedProjectWizardState {
  currentStep: number;
  setField: <K extends keyof UnifiedProjectWizardState>(
    field: K,
    value: UnifiedProjectWizardState[K]
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetWizard: () => void;
  setStep: (step: number) => void;
}

export const useWizardStore = create<WizardStoreState>()(
  persist(
    (set) => ({
      ...createInitialUnifiedWizardState(),
      currentStep: 1,

      setField: (field, value) => set((state) => ({ ...state, [field]: value })),
      
      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),
        
      prevStep: () =>
        set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
        
      setStep: (step) =>
        set((state) => ({ currentStep: Math.max(1, Math.min(step, 5)) })),

      resetWizard: () =>
        set(() => ({
          ...createInitialUnifiedWizardState(),
          currentStep: 1,
        })),
    }),
    {
      name: "mss-unified-wizard-draft", // LocalStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);

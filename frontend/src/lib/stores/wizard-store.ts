import { create } from "zustand";
import type { WizardData, WizardStepData } from "@/lib/api";
import { getWizardData, saveWizardStep } from "@/lib/api";

export const WIZARD_STEPS = [
  { key: "IDEA", label: "Idee", number: 1 },
  { key: "PROBLEM", label: "Problem", number: 2 },
  { key: "TARGET_AUDIENCE", label: "Zielgruppe", number: 3 },
  { key: "SCOPE", label: "Scope", number: 4 },
  { key: "MVP", label: "MVP", number: 5 },
  { key: "SPEC", label: "Spec", number: 6 },
  { key: "FEATURES", label: "Features", number: 7 },
  { key: "ARCHITECTURE", label: "Architektur", number: 8 },
  { key: "BACKEND", label: "Backend", number: 9 },
  { key: "FRONTEND", label: "Frontend", number: 10 },
] as const;

interface WizardState {
  data: WizardData | null;
  activeStep: string;
  loading: boolean;
  saving: boolean;

  loadWizard: (projectId: string) => Promise<void>;
  setActiveStep: (step: string) => void;
  updateField: (step: string, field: string, value: any) => void;
  saveStep: (projectId: string, step: string) => Promise<void>;
  completeStep: (projectId: string, step: string) => Promise<void>;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useWizardStore = create<WizardState>((set, get) => ({
  data: null,
  activeStep: "IDEA",
  loading: false,
  saving: false,

  loadWizard: async (projectId) => {
    set({ loading: true });
    try {
      const data = await getWizardData(projectId);
      set({ data, loading: false });
    } catch {
      set({ data: { projectId, steps: {} }, loading: false });
    }
  },

  setActiveStep: (step) => set({ activeStep: step }),

  updateField: (step, field, value) => {
    const { data } = get();
    if (!data) return;

    const stepData = data.steps[step] ?? { fields: {}, completedAt: null };
    const updated: WizardData = {
      ...data,
      steps: {
        ...data.steps,
        [step]: { ...stepData, fields: { ...stepData.fields, [field]: value } },
      },
    };
    set({ data: updated });

    // Auto-save with debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const state = get();
      if (state.data) {
        const sd = state.data.steps[step];
        if (sd) {
          set({ saving: true });
          saveWizardStep(data.projectId, step, sd)
            .then((result) => set({ data: result, saving: false }))
            .catch(() => set({ saving: false }));
        }
      }
    }, 500);
  },

  saveStep: async (projectId, step) => {
    const { data } = get();
    if (!data) return;
    const stepData = data.steps[step];
    if (!stepData) return;
    set({ saving: true });
    try {
      const result = await saveWizardStep(projectId, step, stepData);
      set({ data: result, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  completeStep: async (projectId, step) => {
    const { data } = get();
    if (!data) return;
    const stepData = data.steps[step] ?? { fields: {}, completedAt: null };
    const completed = { ...stepData, completedAt: new Date().toISOString() };
    set({ saving: true });
    try {
      const result = await saveWizardStep(projectId, step, completed);
      set({ data: result, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  goNext: () => {
    const { activeStep } = get();
    const idx = WIZARD_STEPS.findIndex((s) => s.key === activeStep);
    if (idx < WIZARD_STEPS.length - 1) set({ activeStep: WIZARD_STEPS[idx + 1].key });
  },

  goPrev: () => {
    const { activeStep } = get();
    const idx = WIZARD_STEPS.findIndex((s) => s.key === activeStep);
    if (idx > 0) set({ activeStep: WIZARD_STEPS[idx - 1].key });
  },

  reset: () => set({ data: null, activeStep: "IDEA", loading: false, saving: false }),
}));

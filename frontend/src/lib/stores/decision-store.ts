import { create } from "zustand";
import type { Decision } from "@/lib/api";
import {
  listDecisions as apiListDecisions,
  resolveDecision as apiResolveDecision,
} from "@/lib/api";

interface DecisionState {
  decisions: Decision[];
  loading: boolean;
  error: string | null;
  selectedDecisionId: string | null;

  loadDecisions: (projectId: string) => Promise<void>;
  resolveDecision: (projectId: string, decisionId: string, chosenOptionId: string, rationale: string) => Promise<void>;
  selectDecision: (id: string | null) => void;
  addDecision: (decision: Decision) => void;
  reset: () => void;
}

export const useDecisionStore = create<DecisionState>((set) => ({
  decisions: [],
  loading: false,
  error: null,
  selectedDecisionId: null,

  loadDecisions: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const decisions = await apiListDecisions(projectId);
      set({ decisions, loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load decisions", loading: false });
    }
  },

  resolveDecision: async (projectId, decisionId, chosenOptionId, rationale) => {
    try {
      const resolved = await apiResolveDecision(projectId, decisionId, { chosenOptionId, rationale });
      set((s) => ({
        decisions: s.decisions.map((d) => (d.id === decisionId ? resolved : d)),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to resolve decision" });
    }
  },

  selectDecision: (id) => set({ selectedDecisionId: id }),

  addDecision: (decision) => set((s) => ({
    decisions: [...s.decisions, decision],
    selectedDecisionId: decision.id,
  })),

  reset: () => set({ decisions: [], loading: false, error: null, selectedDecisionId: null }),
}));

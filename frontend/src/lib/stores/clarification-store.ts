import { create } from "zustand";
import type { Clarification } from "@/lib/api";
import {
  listClarifications as apiList,
  answerClarification as apiAnswer,
} from "@/lib/api";

interface ClarificationState {
  clarifications: Clarification[];
  loading: boolean;
  selectedClarificationId: string | null;

  loadClarifications: (projectId: string) => Promise<void>;
  answerClarification: (projectId: string, id: string, answer: string) => Promise<void>;
  selectClarification: (id: string | null) => void;
  addClarification: (c: Clarification) => void;
  reset: () => void;
}

export const useClarificationStore = create<ClarificationState>((set) => ({
  clarifications: [],
  loading: false,
  selectedClarificationId: null,

  loadClarifications: async (projectId) => {
    set({ loading: true });
    try {
      const clarifications = await apiList(projectId);
      set({ clarifications, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  answerClarification: async (projectId, id, answer) => {
    const answered = await apiAnswer(projectId, id, { answer });
    set((s) => ({
      clarifications: s.clarifications.map((c) => (c.id === id ? answered : c)),
    }));
  },

  selectClarification: (id) => set({ selectedClarificationId: id }),

  addClarification: (c) => set((s) => ({
    clarifications: [...s.clarifications, c],
    selectedClarificationId: c.id,
  })),

  reset: () => set({ clarifications: [], loading: false, selectedClarificationId: null }),
}));

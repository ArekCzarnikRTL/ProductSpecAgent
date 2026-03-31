"use client";

import { useDecisionStore } from "@/lib/stores/decision-store";
import { useClarificationStore } from "@/lib/stores/clarification-store";

export interface StepBlockers {
  pendingDecisions: number;
  openClarifications: number;
  isBlocked: boolean;
  blockerCount: number;
  blockerSummary: string;
  firstBlockerTab: "decisions" | "clarifications";
}

export function useStepBlockers(stepKey: string): StepBlockers {
  const decisions = useDecisionStore((s) => s.decisions);
  const clarifications = useClarificationStore((s) => s.clarifications);

  const pendingDecisions = decisions.filter(
    (d) => d.stepType === stepKey && d.status === "PENDING"
  ).length;

  const openClarifications = clarifications.filter(
    (c) => c.stepType === stepKey && c.status === "OPEN"
  ).length;

  const blockerCount = pendingDecisions + openClarifications;
  const isBlocked = blockerCount > 0;

  let blockerSummary = "";
  if (pendingDecisions > 0 && openClarifications > 0) {
    blockerSummary = `${pendingDecisions} Entscheidung${pendingDecisions > 1 ? "en" : ""} und ${openClarifications} Klaerung${openClarifications > 1 ? "en" : ""} blockieren den naechsten Schritt`;
  } else if (pendingDecisions > 0) {
    blockerSummary = `${pendingDecisions} offene Entscheidung${pendingDecisions > 1 ? "en" : ""} blockier${pendingDecisions > 1 ? "en" : "t"} den naechsten Schritt`;
  } else if (openClarifications > 0) {
    blockerSummary = `${openClarifications} offene Klaerung${openClarifications > 1 ? "en" : ""} blockier${openClarifications > 1 ? "en" : "t"} den naechsten Schritt`;
  }

  const firstBlockerTab: "decisions" | "clarifications" =
    openClarifications > 0 ? "clarifications" : "decisions";

  return {
    pendingDecisions,
    openClarifications,
    isBlocked,
    blockerCount,
    blockerSummary,
    firstBlockerTab,
  };
}

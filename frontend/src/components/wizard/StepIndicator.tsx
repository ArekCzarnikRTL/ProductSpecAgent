"use client";

import { useWizardStore } from "@/lib/stores/wizard-store";
import { Check, AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStepBlockers } from "@/lib/hooks/use-step-blockers";

export function StepIndicator() {
  const { data, activeStep, setActiveStep, visibleSteps } = useWizardStore();
  const steps = visibleSteps();
  const activeIdx = steps.findIndex((s) => s.key === activeStep);

  const { isBlocked, openClarifications, pendingDecisions } =
    useStepBlockers(activeStep);

  // Build a short badge label for the blocked step
  let blockerBadge = "";
  if (isBlocked) {
    const parts: string[] = [];
    if (openClarifications > 0) parts.push(`${openClarifications} Klaerung${openClarifications > 1 ? "en" : ""}`);
    if (pendingDecisions > 0) parts.push(`${pendingDecisions} Entscheidung${pendingDecisions > 1 ? "en" : ""}`);
    blockerBadge = parts.join(", ") + " offen";
  }

  return (
    <div className="px-6 py-4 border-b bg-card/50">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const stepData = data?.steps[step.key];
          const isCompleted = !!stepData?.completedAt;
          const isActive = activeStep === step.key;
          const isAfterBlocked = isBlocked && i > activeIdx;
          const isLocked = !isCompleted && !isActive && isAfterBlocked;

          const canClick = isCompleted || isActive || (!isAfterBlocked && !isLocked);

          return (
            <div key={step.key} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : "none" }}>
              <button
                onClick={() => canClick && setActiveStep(step.key)}
                className={cn("flex flex-col items-center gap-1 group", !canClick && "cursor-not-allowed")}
                disabled={!canClick}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all",
                    isCompleted && "bg-[oklch(0.65_0.15_160)] text-black",
                    isActive && !isCompleted && !isBlocked && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                    isActive && isBlocked && "bg-amber-500 text-black ring-2 ring-amber-500/30 animate-[pulse-amber_2s_infinite]",
                    isLocked && "bg-muted/50 text-muted-foreground/50",
                    !isActive && !isCompleted && !isLocked && "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}
                >
                  {isCompleted ? (
                    <Check size={13} />
                  ) : isActive && isBlocked ? (
                    <AlertTriangle size={13} />
                  ) : isLocked ? (
                    <Lock size={11} />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-[9px] whitespace-nowrap transition-colors",
                    isActive && isBlocked ? "text-amber-500 font-semibold" : "",
                    isActive && !isBlocked ? "text-primary font-semibold" : "",
                    isCompleted && !isActive ? "text-[oklch(0.65_0.15_160)]" : "",
                    isLocked ? "text-muted-foreground/50" : "",
                    !isActive && !isCompleted && !isLocked ? "text-muted-foreground" : ""
                  )}
                >
                  {step.label}
                </span>
                {isActive && isBlocked && (
                  <span className="text-[8px] text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {blockerBadge}
                  </span>
                )}
              </button>
              {i < steps.length - 1 && (
                <div className={cn(
                  "h-[2px] flex-1 mx-1 transition-colors",
                  isCompleted ? "bg-[oklch(0.65_0.15_160)]" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

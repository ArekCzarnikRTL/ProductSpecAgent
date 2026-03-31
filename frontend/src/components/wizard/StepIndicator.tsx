"use client";

import { useWizardStore } from "@/lib/stores/wizard-store";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepIndicator() {
  const { data, activeStep, setActiveStep, visibleSteps } = useWizardStore();
  const steps = visibleSteps();

  return (
    <div className="px-6 py-4 border-b bg-card/50">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const stepData = data?.steps[step.key];
          const isCompleted = !!stepData?.completedAt;
          const isActive = activeStep === step.key;

          return (
            <div key={step.key} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : "none" }}>
              <button
                onClick={() => setActiveStep(step.key)}
                className="flex flex-col items-center gap-1 group"
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all",
                    isCompleted && "bg-[oklch(0.65_0.15_160)] text-black",
                    isActive && !isCompleted && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}
                >
                  {isCompleted ? <Check size={13} /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[9px] whitespace-nowrap transition-colors",
                    isActive ? "text-primary font-semibold" : isCompleted ? "text-[oklch(0.65_0.15_160)]" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
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

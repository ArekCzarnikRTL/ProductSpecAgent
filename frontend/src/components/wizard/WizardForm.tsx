"use client";

import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { IdeaForm } from "./steps/IdeaForm";
import { ProblemForm } from "./steps/ProblemForm";
import { TargetAudienceForm } from "./steps/TargetAudienceForm";
import { ScopeForm } from "./steps/ScopeForm";
import { MvpForm } from "./steps/MvpForm";
import { SpecForm } from "./steps/SpecForm";
import { FeaturesForm } from "./steps/FeaturesForm";
import { ArchitectureForm } from "./steps/ArchitectureForm";
import { BackendForm } from "./steps/BackendForm";
import { FrontendForm } from "./steps/FrontendForm";

const FORM_MAP: Record<string, React.ComponentType<{ projectId: string }>> = {
  IDEA: IdeaForm,
  PROBLEM: ProblemForm,
  TARGET_AUDIENCE: TargetAudienceForm,
  SCOPE: ScopeForm,
  MVP: MvpForm,
  SPEC: SpecForm,
  FEATURES: FeaturesForm,
  ARCHITECTURE: ArchitectureForm,
  BACKEND: BackendForm,
  FRONTEND: FrontendForm,
};

interface WizardFormProps {
  projectId: string;
}

export function WizardForm({ projectId }: WizardFormProps) {
  const { activeStep, saving, completeStep, goNext, goPrev, visibleSteps } = useWizardStore();

  const steps = visibleSteps();
  const stepInfo = steps.find((s) => s.key === activeStep);
  const stepIdx = steps.findIndex((s) => s.key === activeStep);
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;

  const FormComponent = FORM_MAP[activeStep];

  async function handleNext() {
    await completeStep(projectId, activeStep);
    if (!isLast) goNext();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold mb-1">{stepInfo?.label ?? activeStep}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Schritt {stepIdx + 1} von {steps.length}
          </p>
          {FormComponent && <FormComponent projectId={projectId} />}
        </div>
      </div>

      {/* Navigation */}
      <div className="shrink-0 border-t px-8 py-3 flex items-center justify-between bg-card/50">
        <Button variant="ghost" size="sm" onClick={goPrev} disabled={isFirst} className="gap-1.5">
          <ArrowLeft size={14} /> Zurueck
        </Button>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Saving...
            </span>
          )}
          <Button size="sm" onClick={handleNext} className="gap-1.5">
            {isLast ? (
              <><Save size={14} /> Abschliessen</>
            ) : (
              <>Weiter <ArrowRight size={14} /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

# Feature 18: Step-Blocker Gate – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block wizard step progression when the current step has unresolved Decisions (PENDING) or Clarifications (OPEN), with visual feedback in StepIndicator and WizardForm.

**Architecture:** A new `useStepBlockers` hook reads from existing decision-store and clarification-store to compute blocker state per step. StepIndicator gets two new visual states (BLOCKED, LOCKED). WizardForm gets a BlockerBanner component and disabled button logic. page.tsx passes a tab-switch callback to WizardForm.

**Tech Stack:** React 19, TypeScript, Zustand (existing stores), Tailwind CSS v4, lucide-react icons

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/lib/hooks/use-step-blockers.ts` | Hook: compute blocker state from stores |
| Create | `frontend/src/components/wizard/BlockerBanner.tsx` | Amber warning banner above button row |
| Modify | `frontend/src/components/wizard/StepIndicator.tsx` | Add BLOCKED and LOCKED step states |
| Modify | `frontend/src/components/wizard/WizardForm.tsx` | Disable button, show banner, handle blocker click |
| Modify | `frontend/src/app/projects/[id]/page.tsx:128-131` | Pass onBlockerClick callback to WizardForm |

---

### Task 1: Create `useStepBlockers` Hook

**Files:**
- Create: `frontend/src/lib/hooks/use-step-blockers.ts`

- [ ] **Step 1: Create the hook file**

```typescript
// frontend/src/lib/hooks/use-step-blockers.ts
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

  // Oldest blocker type determines which tab to show first
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/hooks/use-step-blockers.ts
git commit -m "feat(blocker): add useStepBlockers hook to compute step blocker state"
```

---

### Task 2: Create `BlockerBanner` Component

**Files:**
- Create: `frontend/src/components/wizard/BlockerBanner.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// frontend/src/components/wizard/BlockerBanner.tsx
"use client";

import { AlertTriangle } from "lucide-react";

interface BlockerBannerProps {
  summary: string;
  onClick: () => void;
}

export function BlockerBanner({ summary, onClick }: BlockerBannerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
      <div>
        <p className="text-xs font-semibold text-amber-500">{summary}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Beantworte die offenen Punkte im Panel rechts
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/BlockerBanner.tsx
git commit -m "feat(blocker): add BlockerBanner component with amber warning style"
```

---

### Task 3: Update `StepIndicator` with BLOCKED and LOCKED States

**Files:**
- Modify: `frontend/src/components/wizard/StepIndicator.tsx`

- [ ] **Step 1: Replace the entire StepIndicator component**

Replace the full content of `frontend/src/components/wizard/StepIndicator.tsx` with:

```tsx
"use client";

import { useWizardStore } from "@/lib/stores/wizard-store";
import { Check, AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStepBlockers } from "@/lib/hooks/use-step-blockers";

export function StepIndicator() {
  const { data, activeStep, setActiveStep, visibleSteps } = useWizardStore();
  const steps = visibleSteps();
  const activeIdx = steps.findIndex((s) => s.key === activeStep);

  const { isBlocked, blockerCount, openClarifications, pendingDecisions } =
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
```

- [ ] **Step 2: Add the pulse-amber keyframe to global CSS**

Find the global CSS file (likely `frontend/src/app/globals.css`) and add at the end:

```css
@keyframes pulse-amber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/wizard/StepIndicator.tsx frontend/src/app/globals.css
git commit -m "feat(blocker): add BLOCKED and LOCKED step states to StepIndicator"
```

---

### Task 4: Update `WizardForm` with Blocker Logic and Banner

**Files:**
- Modify: `frontend/src/components/wizard/WizardForm.tsx`

- [ ] **Step 1: Replace the entire WizardForm component**

Replace the full content of `frontend/src/components/wizard/WizardForm.tsx` with:

```tsx
"use client";

import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { useStepBlockers } from "@/lib/hooks/use-step-blockers";
import { BlockerBanner } from "./BlockerBanner";
import { IdeaForm } from "./steps/IdeaForm";
import { ProblemForm } from "./steps/ProblemForm";
import { TargetAudienceForm } from "./steps/TargetAudienceForm";
import { ScopeForm } from "./steps/ScopeForm";
import { MvpForm } from "./steps/MvpForm";
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
  FEATURES: FeaturesForm,
  ARCHITECTURE: ArchitectureForm,
  BACKEND: BackendForm,
  FRONTEND: FrontendForm,
};

interface WizardFormProps {
  projectId: string;
  onBlockerClick?: (tab: "decisions" | "clarifications") => void;
}

export function WizardForm({ projectId, onBlockerClick }: WizardFormProps) {
  const { activeStep, saving, chatPending, completeStep, goPrev, visibleSteps } = useWizardStore();
  const { isBlocked, blockerSummary, firstBlockerTab } = useStepBlockers(activeStep);

  const steps = visibleSteps();
  const stepInfo = steps.find((s) => s.key === activeStep);
  const stepIdx = steps.findIndex((s) => s.key === activeStep);
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const isWorking = saving || chatPending;

  const FormComponent = FORM_MAP[activeStep];

  async function handleNext() {
    if (isBlocked) {
      onBlockerClick?.(firstBlockerTab);
      return;
    }
    await completeStep(projectId, activeStep);
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
      <div className="shrink-0 border-t px-8 py-3 flex flex-col gap-2 bg-card/50">
        {isBlocked && (
          <BlockerBanner
            summary={blockerSummary}
            onClick={() => onBlockerClick?.(firstBlockerTab)}
          />
        )}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={isFirst || isWorking} className="gap-1.5">
            <ArrowLeft size={14} /> Zurueck
          </Button>
          <div className="flex items-center gap-2">
            {isWorking && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                {chatPending ? "Agent antwortet..." : "Saving..."}
              </span>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              disabled={isWorking || isBlocked}
              className="gap-1.5"
            >
              {isLast ? (
                <><Save size={14} /> Abschliessen</>
              ) : (
                <>Weiter <ArrowRight size={14} /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/WizardForm.tsx
git commit -m "feat(blocker): add blocker logic and BlockerBanner to WizardForm"
```

---

### Task 5: Wire `onBlockerClick` in `page.tsx`

**Files:**
- Modify: `frontend/src/app/projects/[id]/page.tsx:130`

- [ ] **Step 1: Add onBlockerClick prop to WizardForm**

In `frontend/src/app/projects/[id]/page.tsx`, find the line:

```tsx
            <WizardForm projectId={id} />
```

Replace with:

```tsx
            <WizardForm projectId={id} onBlockerClick={(tab) => setRightTab(tab)} />
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 3: Visual verification**

Run: `cd frontend && npm run dev`
Open: `http://localhost:3000/projects/<project-with-open-clarification>`

Verify:
- If the current step has an open Clarification or pending Decision:
  - StepIndicator shows amber circle with "!" and pulse effect
  - Badge below shows "1 Klaerung offen"
  - Subsequent steps show lock icon and are greyed out
  - "Weiter" button is disabled
  - Amber banner is visible above button row
  - Clicking banner or disabled button switches to Clarifications/Decisions tab
- If no blockers exist:
  - Everything works exactly as before (no visual changes)
- Resolving all blockers:
  - Button automatically re-enables
  - StepIndicator updates to normal active state
  - Lock icons on subsequent steps disappear

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/projects/[id]/page.tsx
git commit -m "feat(blocker): wire onBlockerClick callback from page to WizardForm"
```

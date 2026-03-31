# Step-Blocker Gate – Design Spec

## Overview
Block wizard progression when the current step has unresolved Decisions (PENDING) or Clarifications (OPEN). Visual feedback in StepIndicator (amber warning, lock icons) and WizardForm (disabled button, amber banner). Clicking the disabled button auto-switches to the relevant sidebar tab.

## Components

### `useStepBlockers` Hook
- File: `frontend/src/lib/hooks/use-step-blockers.ts`
- Reads from decision-store and clarification-store
- Filters by `stepType === currentStep` and open status
- Returns: `{ isBlocked, blockerCount, blockerSummary, pendingDecisions, openClarifications, firstBlockerTab }`
- `firstBlockerTab`: "clarifications" or "decisions" based on oldest open item

### `BlockerBanner` Component
- File: `frontend/src/components/wizard/BlockerBanner.tsx`
- Amber warning banner with icon, summary text, and hint
- Clickable: triggers tab switch via callback
- Only rendered when `isBlocked === true`

### StepIndicator Changes
- File: `frontend/src/components/wizard/StepIndicator.tsx`
- New step states: BLOCKED (amber circle, "!" icon, pulse, badge) and LOCKED (lock icon, greyed, disabled)
- Uses `useStepBlockers(activeStep)` to determine blocked state
- Steps after a blocked step render as LOCKED

### WizardForm Changes
- File: `frontend/src/components/wizard/WizardForm.tsx`
- "Weiter" button disabled when `isBlocked`
- BlockerBanner shown above button area
- New prop: `onBlockerClick: (tab: string) => void`

### page.tsx Changes
- File: `frontend/src/app/projects/[id]/page.tsx`
- Pass `onBlockerClick={(tab) => setRightTab(tab)}` to WizardForm

## Visual Design (chosen: Amber Warning + Lock Icons)

### StepIndicator
- BLOCKED step: amber circle (#f59e0b), "!" icon, pulsing box-shadow, badge below ("1 Klaerung offen")
- LOCKED steps: lock icon, opacity 0.4, cursor not-allowed, click disabled

### Blocker Banner
- Background: amber-500/10, border: amber-500/30
- Warning triangle icon + bold summary + hint text
- Positioned above the Back/Next button row

## Constraints
- Frontend-only logic (no backend changes needed)
- Blocker state computed reactively from existing stores
- Back-navigation to completed steps is never blocked
- Blocker check only applies to current active step

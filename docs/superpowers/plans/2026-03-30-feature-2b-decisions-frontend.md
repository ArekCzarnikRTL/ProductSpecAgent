# Feature 2b: Guided Decisions Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend UI for viewing, resolving, and managing decisions with DecisionCard components and a Decision Log panel.

**Architecture:** Decision types and API functions added to api.ts. DecisionCard component shows options with Pro/Contra, recommendation badge, and resolve action. Decision Log panel shows all decisions for a project. Integrated into the workspace page.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Zustand, Lucide React

---

## Task 1: Decision Types + API Functions

- [ ] Add the following TypeScript types to `src/lib/api.ts` (before or after existing types):

```typescript
// --- Decision types ---

export type DecisionStatus = "PENDING" | "RESOLVED";

export interface DecisionOption {
  id: string;
  label: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
}

export interface Decision {
  id: string;
  projectId: string;
  stepType: StepType;
  title: string;
  options: DecisionOption[];
  recommendation: string;
  status: DecisionStatus;
  chosenOptionId: string | null;
  rationale: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
```

- [ ] Update `ChatResponse` interface in `src/lib/api.ts` to include the optional `decisionId` field:

```typescript
export interface ChatResponse {
  message: string;
  flowStateChanged: boolean;
  currentStep: string;
  decisionId?: string; // present when agent triggers a decision
}
```

- [ ] Add the following API functions to `src/lib/api.ts`:

```typescript
// --- Decision API functions ---

export async function listDecisions(projectId: string): Promise<Decision[]> {
  return apiFetch<Decision[]>(`/api/v1/projects/${projectId}/decisions`);
}

export async function createDecision(
  projectId: string,
  body: { title: string; stepType: StepType }
): Promise<Decision> {
  return apiFetch<Decision>(`/api/v1/projects/${projectId}/decisions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getDecision(
  projectId: string,
  decisionId: string
): Promise<Decision> {
  return apiFetch<Decision>(
    `/api/v1/projects/${projectId}/decisions/${decisionId}`
  );
}

export async function resolveDecision(
  projectId: string,
  decisionId: string,
  body: { chosenOptionId: string; rationale: string }
): Promise<Decision> {
  return apiFetch<Decision>(
    `/api/v1/projects/${projectId}/decisions/${decisionId}/resolve`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}
```

- [ ] Commit: `feat: add Decision types and API functions to api.ts`

---

## Task 2: Decision Store (extend Zustand)

- [ ] Create `src/lib/stores/decision-store.ts` with the following content:

```typescript
"use client";

import { create } from "zustand";
import {
  Decision,
  listDecisions,
  resolveDecision as resolveDecisionApi,
  getDecision,
} from "@/lib/api";

interface DecisionState {
  decisions: Decision[];
  selectedDecisionId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadDecisions: (projectId: string) => Promise<void>;
  resolveDecision: (
    projectId: string,
    decisionId: string,
    chosenOptionId: string,
    rationale: string
  ) => Promise<void>;
  selectDecision: (decisionId: string | null) => void;
  refreshDecision: (projectId: string, decisionId: string) => Promise<void>;
}

export const useDecisionStore = create<DecisionState>((set, get) => ({
  decisions: [],
  selectedDecisionId: null,
  loading: false,
  error: null,

  loadDecisions: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const decisions = await listDecisions(projectId);
      set({ decisions, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load decisions",
        loading: false,
      });
    }
  },

  resolveDecision: async (
    projectId: string,
    decisionId: string,
    chosenOptionId: string,
    rationale: string
  ) => {
    try {
      const updated = await resolveDecisionApi(projectId, decisionId, {
        chosenOptionId,
        rationale,
      });
      set((state) => ({
        decisions: state.decisions.map((d) =>
          d.id === decisionId ? updated : d
        ),
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to resolve decision",
      });
    }
  },

  selectDecision: (decisionId: string | null) => {
    set({ selectedDecisionId: decisionId });
  },

  refreshDecision: async (projectId: string, decisionId: string) => {
    try {
      const updated = await getDecision(projectId, decisionId);
      set((state) => ({
        decisions: state.decisions.map((d) =>
          d.id === decisionId ? updated : d
        ),
        // If not already in list, append it
        ...(state.decisions.find((d) => d.id === decisionId)
          ? {}
          : { decisions: [...state.decisions, updated] }),
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : "Failed to refresh decision",
      });
    }
  },
}));
```

- [ ] Commit: `feat: add decision-store Zustand store`

---

## Task 3: DecisionCard Component

- [ ] Create `src/components/decisions/DecisionCard.tsx` with the following content:

```tsx
"use client";

import { useState } from "react";
import { Check, X, Star, ThumbsUp, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Decision, DecisionOption } from "@/lib/api";
import { useDecisionStore } from "@/lib/stores/decision-store";

interface DecisionCardProps {
  decision: Decision;
  projectId: string;
  onResolved?: (decision: Decision) => void;
}

export function DecisionCard({
  decision,
  projectId,
  onResolved,
}: DecisionCardProps) {
  const { resolveDecision } = useDecisionStore();
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolved, setResolved] = useState(
    decision.status === "RESOLVED"
  );

  const isPending = decision.status === "PENDING" && !resolved;

  const handleChoose = (optionId: string) => {
    if (!isPending) return;
    setSelectedOptionId((prev) => (prev === optionId ? null : optionId));
  };

  const handleResolve = async () => {
    if (!selectedOptionId || !rationale.trim()) return;
    setSubmitting(true);
    try {
      await resolveDecision(projectId, decision.id, selectedOptionId, rationale);
      setResolved(true);
      onResolved?.({ ...decision, status: "RESOLVED", chosenOptionId: selectedOptionId, rationale });
    } finally {
      setSubmitting(false);
    }
  };

  const chosenId = decision.chosenOptionId ?? (resolved ? selectedOptionId : null);

  return (
    <Card className="w-full border-border bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug">
              {decision.title}
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              {decision.recommendation}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* stepType badge */}
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {decision.stepType}
            </span>
            {/* status badge */}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                decision.status === "RESOLVED" || resolved
                  ? "bg-[oklch(0.55_0.15_185/0.2)] text-[oklch(0.75_0.15_185)]"
                  : "bg-[oklch(0.55_0.18_240/0.2)] text-[oklch(0.75_0.18_240)]"
              )}
            >
              {decision.status === "RESOLVED" || resolved ? "Resolved" : "Pending"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {decision.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            isPending={isPending}
            isSelected={selectedOptionId === option.id}
            isChosen={chosenId === option.id}
            onChoose={() => handleChoose(option.id)}
          />
        ))}

        {/* Rationale input — visible only when an option is selected and still pending */}
        {isPending && selectedOptionId && (
          <div className="mt-3 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Rationale (required)
            </label>
            <textarea
              className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              rows={3}
              placeholder="Briefly explain your reasoning…"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
            />
          </div>
        )}

        {/* Show existing rationale when resolved */}
        {(decision.status === "RESOLVED" || resolved) && (decision.rationale ?? rationale) && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Rationale: </span>
            {decision.rationale ?? rationale}
          </div>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="pt-0">
          <Button
            size="sm"
            className="ml-auto"
            disabled={!selectedOptionId || !rationale.trim() || submitting}
            onClick={handleResolve}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                Confirm Choice
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: individual option card

interface OptionCardProps {
  option: DecisionOption;
  isPending: boolean;
  isSelected: boolean;
  isChosen: boolean;
  onChoose: () => void;
}

function OptionCard({
  option,
  isPending,
  isSelected,
  isChosen,
  onChoose,
}: OptionCardProps) {
  const dimmed = !isPending && !isChosen;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isChosen
          ? "border-[oklch(0.55_0.15_185)] bg-[oklch(0.55_0.15_185/0.1)]"
          : isSelected
          ? "border-primary bg-primary/10"
          : "border-border bg-muted/20",
        dimmed && "opacity-40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {option.recommended && (
            <Star className="h-3.5 w-3.5 shrink-0 text-yellow-400 fill-yellow-400" />
          )}
          {isChosen && (
            <Check className="h-3.5 w-3.5 shrink-0 text-[oklch(0.75_0.15_185)]" />
          )}
          <span className="text-sm font-medium leading-none">{option.label}</span>
        </div>
        {isPending && (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="h-6 px-2 text-xs"
            onClick={onChoose}
          >
            {isSelected ? "Selected" : "Choose"}
          </Button>
        )}
      </div>

      {/* Pros */}
      {option.pros.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {option.pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-[oklch(0.65_0.15_145)]" />
              {pro}
            </li>
          ))}
        </ul>
      )}

      {/* Cons */}
      {option.cons.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {option.cons.map((con, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <X className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
              {con}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] Commit: `feat: add DecisionCard component`

---

## Task 4: DecisionLog Panel

- [ ] Create `src/components/decisions/DecisionLog.tsx` with the following content:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, CircleDot, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DecisionCard } from "./DecisionCard";
import { useDecisionStore } from "@/lib/stores/decision-store";
import type { Decision } from "@/lib/api";

interface DecisionLogProps {
  projectId: string;
  /** If provided, this decision is auto-expanded on mount */
  autoOpenDecisionId?: string | null;
}

export function DecisionLog({ projectId, autoOpenDecisionId }: DecisionLogProps) {
  const { decisions, loading, error, loadDecisions, selectDecision } =
    useDecisionStore();
  const [expandedId, setExpandedId] = useState<string | null>(
    autoOpenDecisionId ?? null
  );

  useEffect(() => {
    loadDecisions(projectId);
  }, [projectId, loadDecisions]);

  // Auto-open when a new decisionId arrives from chat
  useEffect(() => {
    if (autoOpenDecisionId) {
      setExpandedId(autoOpenDecisionId);
      selectDecision(autoOpenDecisionId);
    }
  }, [autoOpenDecisionId, selectDecision]);

  const pending = decisions.filter((d) => d.status === "PENDING");
  const resolved = decisions.filter((d) => d.status === "RESOLVED");

  const toggle = (id: string) => {
    const next = expandedId === id ? null : id;
    setExpandedId(next);
    selectDecision(next);
  };

  if (loading && decisions.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        Loading decisions…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CircleDot className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No decisions yet.</p>
        <p className="text-xs text-muted-foreground/60">
          Decisions will appear here as the agent identifies them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto">
      {/* Header row with pending count badge */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Decisions
        </span>
        {pending.length > 0 && (
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Pending decisions */}
      {pending.map((d) => (
        <DecisionRow
          key={d.id}
          decision={d}
          projectId={projectId}
          expanded={expandedId === d.id}
          onToggle={() => toggle(d.id)}
        />
      ))}

      {/* Separator */}
      {pending.length > 0 && resolved.length > 0 && (
        <div className="my-2 border-t border-border" />
      )}

      {/* Resolved decisions */}
      {resolved.map((d) => (
        <DecisionRow
          key={d.id}
          decision={d}
          projectId={projectId}
          expanded={expandedId === d.id}
          onToggle={() => toggle(d.id)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: collapsible row

interface DecisionRowProps {
  decision: Decision;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
}

function DecisionRow({ decision, projectId, expanded, onToggle }: DecisionRowProps) {
  const isPending = decision.status === "PENDING";

  return (
    <div className="rounded-lg border border-border bg-card/60 transition-colors hover:bg-card">
      {/* Collapsed header row */}
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={onToggle}
      >
        {isPending ? (
          <CircleDot className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[oklch(0.65_0.15_185)]" />
        )}
        <span className="flex-1 truncate text-sm font-medium leading-none">
          {decision.title}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
            isPending
              ? "bg-primary/15 text-primary"
              : "bg-[oklch(0.55_0.15_185/0.2)] text-[oklch(0.75_0.15_185)]"
          )}
        >
          {isPending ? "Pending" : "Done"}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Expanded: full DecisionCard */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          <DecisionCard decision={decision} projectId={projectId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] Commit: `feat: add DecisionLog panel component`

---

## Task 5: Integrate into Workspace + Build

- [ ] In `src/app/projects/[id]/page.tsx`, import `DecisionLog` and `useDecisionStore`:

```tsx
import { DecisionLog } from "@/components/decisions/DecisionLog";
import { useDecisionStore } from "@/lib/stores/decision-store";
```

- [ ] Add state for the active decision triggered by chat. Inside the workspace component, track the latest `decisionId` returned from chat responses:

```tsx
const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);
```

- [ ] When the chat send handler receives a response, check for `decisionId` and update state:

```tsx
// Inside the onSendMessage (or equivalent) handler, after receiving ChatResponse:
if (response.decisionId) {
  setActiveDecisionId(response.decisionId);
  // Refresh that decision so it appears in the store
  await useDecisionStore.getState().refreshDecision(projectId, response.decisionId);
}
```

- [ ] Add the `DecisionLog` panel to the workspace layout. The recommended placement is as a right-hand sidebar panel or a tab alongside the graph. Example as a third column:

```tsx
{/* Decision Log sidebar */}
<aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden border-l border-border bg-background px-4 py-4">
  <DecisionLog
    projectId={params.id}
    autoOpenDecisionId={activeDecisionId}
  />
</aside>
```

- [ ] Ensure the workspace page layout accommodates the new sidebar (e.g. `flex flex-row h-full` wrapping the Rete graph, chat panel, and decision log).

- [ ] After resolving a decision in `DecisionCard`, show a brief inline confirmation. The `onResolved` callback can set a toast or a state flag:

```tsx
// In DecisionCard usage (inside DecisionLog > DecisionRow), pass:
onResolved={() => {
  // Optionally show a toast or refresh the list
  loadDecisions(projectId);
}}
```

- [ ] Run build and fix any TypeScript errors:

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend
npm run build
```

- [ ] Commit: `feat: integrate DecisionLog into workspace page, build passes`

---

## Notes for implementors

- All new files need the `"use client"` directive at the top.
- Color tokens follow the existing dark-only OKLCh design system:
  - Primary (blue): `text-primary`, `bg-primary`, `border-primary`
  - Success/teal (chart-2): `oklch(0.65_0.15_185)` — use inline styles or a utility class if not already mapped
  - Destructive (red): `text-destructive`, `bg-destructive`
  - Muted: `text-muted-foreground`, `bg-muted`
- Use only Lucide React icons already installed (`lucide-react`).
- No new npm packages are needed.
- The `apiFetch` helper in `src/lib/api.ts` handles auth headers and base URL — all new API functions must use it.
- Keep `DecisionCard` and `DecisionLog` in `src/components/decisions/` to stay consistent with component organisation.

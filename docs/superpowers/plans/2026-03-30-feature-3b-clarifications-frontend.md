# Feature 3b: Clarification Engine Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build frontend UI for viewing and answering clarifications with ClarificationCard and ClarificationList components.

**Architecture:** Clarification types and API added to api.ts. Zustand store manages state. ClarificationCard shows question, reason, answer input. ClarificationList panel integrated into workspace tabs.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Zustand, Lucide React

---

## Task 1: Clarification Types + API + Store

Add TypeScript types, API client functions, Zustand store, and wire up chat message handling.

**Files to modify:**
- `src/lib/api.ts` — add Clarification types and API functions
- `src/lib/stores/project-store.ts` — update sendMessage to handle clarificationId
- `src/lib/stores/chat-store.ts` (if exists) — update ChatResponse type

**Files to create:**
- `src/lib/stores/clarification-store.ts`

**api.ts — add types and functions:**
```typescript
// Add to existing types section

export type ClarificationStatus = 'OPEN' | 'ANSWERED';

export interface Clarification {
  id: string;
  projectId: string;
  stepType: string;
  question: string;
  reason: string;
  status: ClarificationStatus;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface CreateClarificationRequest {
  question: string;
  reason: string;
  stepType: string;
}

export interface AnswerClarificationRequest {
  answer: string;
}

// Update ChatResponse type — add clarificationId
export interface ChatResponse {
  message: string;
  projectId?: string;
  decisionId?: string;
  clarificationId?: string;  // ADD THIS FIELD
}

// Add API functions (alongside existing decision functions)

export async function listClarifications(projectId: string): Promise<Clarification[]> {
  const response = await fetch(`/api/v1/projects/${projectId}/clarifications`);
  if (!response.ok) {
    throw new Error(`Failed to list clarifications: ${response.statusText}`);
  }
  return response.json();
}

export async function getClarification(projectId: string, clarificationId: string): Promise<Clarification> {
  const response = await fetch(`/api/v1/projects/${projectId}/clarifications/${clarificationId}`);
  if (!response.ok) {
    throw new Error(`Failed to get clarification: ${response.statusText}`);
  }
  return response.json();
}

export async function createClarification(
  projectId: string,
  request: CreateClarificationRequest
): Promise<Clarification> {
  const response = await fetch(`/api/v1/projects/${projectId}/clarifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Failed to create clarification: ${response.statusText}`);
  }
  return response.json();
}

export async function answerClarification(
  projectId: string,
  clarificationId: string,
  request: AnswerClarificationRequest
): Promise<Clarification> {
  const response = await fetch(
    `/api/v1/projects/${projectId}/clarifications/${clarificationId}/answer`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to answer clarification: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteClarification(projectId: string, clarificationId: string): Promise<void> {
  const response = await fetch(`/api/v1/projects/${projectId}/clarifications/${clarificationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete clarification: ${response.statusText}`);
  }
}
```

**clarification-store.ts:**
```typescript
import { create } from 'zustand';
import {
  Clarification,
  listClarifications,
  answerClarification as answerClarificationApi,
  AnswerClarificationRequest,
} from '../api';

interface ClarificationState {
  clarifications: Clarification[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchClarifications: (projectId: string) => Promise<void>;
  answerClarification: (
    projectId: string,
    clarificationId: string,
    answer: string
  ) => Promise<void>;
  addClarification: (clarification: Clarification) => void;
  clearClarifications: () => void;
}

export const useClarificationStore = create<ClarificationState>((set, get) => ({
  clarifications: [],
  isLoading: false,
  error: null,

  fetchClarifications: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const clarifications = await listClarifications(projectId);
      set({ clarifications, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load clarifications',
        isLoading: false,
      });
    }
  },

  answerClarification: async (projectId: string, clarificationId: string, answer: string) => {
    set({ error: null });
    try {
      const updated = await answerClarificationApi(projectId, clarificationId, { answer });
      set((state) => ({
        clarifications: state.clarifications.map((c) =>
          c.id === clarificationId ? updated : c
        ),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to answer clarification',
      });
    }
  },

  addClarification: (clarification: Clarification) => {
    set((state) => ({
      clarifications: [...state.clarifications, clarification],
    }));
  },

  clearClarifications: () => set({ clarifications: [], error: null }),
}));
```

**project-store.ts — update sendMessage to handle clarificationId:**

In the `sendMessage` action, after receiving `ChatResponse`, add logic mirroring how `decisionId` is handled:

```typescript
// After existing decisionId handling:
if (chatResponse.clarificationId) {
  // Fetch the newly created clarification and add it to the store
  const clarification = await getClarification(projectId, chatResponse.clarificationId);
  useClarificationStore.getState().addClarification(clarification);
}
```

---

## Task 2: ClarificationCard + ClarificationList

Build the UI components for displaying and answering clarifications.

**Files to create:**
- `src/components/ClarificationCard.tsx`
- `src/components/ClarificationList.tsx`

**ClarificationCard.tsx:**
```tsx
'use client';

import { useState } from 'react';
import { HelpCircle, MessageCircle, CheckCircle2 } from 'lucide-react';
import { Clarification } from '@/lib/api';

interface ClarificationCardProps {
  clarification: Clarification;
  onAnswer: (clarificationId: string, answer: string) => Promise<void>;
}

export function ClarificationCard({ clarification, onAnswer }: ClarificationCardProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAnswered = clarification.status === 'ANSWERED';

  const handleSubmit = async () => {
    if (!answer.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAnswer(clarification.id, answer.trim());
      setAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        {isAnswered ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--success)] mt-0.5 shrink-0" />
        ) : (
          <HelpCircle className="h-4 w-4 text-[var(--warning)] mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] leading-snug">
            {clarification.question}
          </p>
          <span className="inline-block mt-1 text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
            {clarification.stepType}
          </span>
        </div>
      </div>

      {/* Reason */}
      <div className="flex items-start gap-2 pl-6">
        <MessageCircle className="h-3.5 w-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          {clarification.reason}
        </p>
      </div>

      {/* Answer section */}
      {isAnswered ? (
        <div className="pl-6">
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Answer</p>
          <p className="text-sm text-[var(--foreground)] bg-[var(--muted)] rounded px-3 py-2">
            {clarification.answer}
          </p>
          {clarification.answeredAt && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Answered {new Date(clarification.answeredAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className="pl-6 space-y-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={3}
            className="w-full text-sm rounded border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || isSubmitting}
            className="text-xs font-medium px-3 py-1.5 rounded bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      )}
    </div>
  );
}
```

**ClarificationList.tsx:**
```tsx
'use client';

import { HelpCircle } from 'lucide-react';
import { Clarification } from '@/lib/api';
import { ClarificationCard } from './ClarificationCard';

interface ClarificationListProps {
  clarifications: Clarification[];
  isLoading: boolean;
  error: string | null;
  onAnswer: (clarificationId: string, answer: string) => Promise<void>;
}

export function ClarificationList({
  clarifications,
  isLoading,
  error,
  onAnswer,
}: ClarificationListProps) {
  const openClarifications = clarifications.filter((c) => c.status === 'OPEN');
  const answeredClarifications = clarifications.filter((c) => c.status === 'ANSWERED');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-[var(--muted-foreground)]">
        <span className="text-sm">Loading clarifications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--destructive)] bg-[var(--destructive)]/10 p-4">
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      </div>
    );
  }

  if (clarifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)] gap-2">
        <HelpCircle className="h-8 w-8 opacity-30" />
        <p className="text-sm">No clarifications yet</p>
        <p className="text-xs text-center max-w-[200px] opacity-70">
          Clarifications will appear here when the agent needs more information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Open clarifications */}
      {openClarifications.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
            Needs Answer ({openClarifications.length})
          </h3>
          <div className="space-y-2">
            {openClarifications.map((clarification) => (
              <ClarificationCard
                key={clarification.id}
                clarification={clarification}
                onAnswer={onAnswer}
              />
            ))}
          </div>
        </section>
      )}

      {/* Answered clarifications */}
      {answeredClarifications.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
            Answered ({answeredClarifications.length})
          </h3>
          <div className="space-y-2">
            {answeredClarifications.map((clarification) => (
              <ClarificationCard
                key={clarification.id}
                clarification={clarification}
                onAnswer={onAnswer}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

## Task 3: Workspace Integration + Build

Add "Clarifications" as the third tab in the workspace sidebar, wire up the store, show a pending count badge, and verify the build passes.

**Files to modify:**
- Workspace sidebar/tabs component (e.g. `src/components/WorkspaceSidebar.tsx`, `src/components/WorkspaceTabs.tsx`, or wherever the "Chat | Decisions" tab structure lives — find the exact file first)

**Pattern to follow** (mirror exactly how the Decisions tab was added for the Chat tab):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, GitFork, HelpCircle } from 'lucide-react';
import { useClarificationStore } from '@/lib/stores/clarification-store';
import { ClarificationList } from './ClarificationList';
// ... existing imports for decisions

type WorkspaceTab = 'chat' | 'decisions' | 'clarifications';

// Inside the component:
const { clarifications, isLoading, error, fetchClarifications, answerClarification } =
  useClarificationStore();

const openClarificationCount = clarifications.filter((c) => c.status === 'OPEN').length;

// Fetch clarifications when projectId changes (alongside fetchDecisions):
useEffect(() => {
  if (projectId) {
    fetchClarifications(projectId);
  }
}, [projectId, fetchClarifications]);

// Tab button for Clarifications (add alongside existing Chat and Decisions tabs):
<button
  onClick={() => setActiveTab('clarifications')}
  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
    activeTab === 'clarifications'
      ? 'bg-[var(--accent)] text-[var(--accent-foreground)]'
      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/50'
  }`}
>
  <HelpCircle className="h-4 w-4" />
  Clarifications
  {openClarificationCount > 0 && (
    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-4 px-1 text-xs font-bold rounded-full bg-[var(--warning)] text-[var(--warning-foreground)]">
      {openClarificationCount}
    </span>
  )}
</button>

// Tab panel for Clarifications (add alongside existing chat and decisions panels):
{activeTab === 'clarifications' && (
  <div className="flex-1 overflow-y-auto p-3">
    <ClarificationList
      clarifications={clarifications}
      isLoading={isLoading}
      error={error}
      onAnswer={async (clarificationId, answer) => {
        if (projectId) {
          await answerClarification(projectId, clarificationId, answer);
        }
      }}
    />
  </div>
)}
```

**Steps:**

1. Find the exact workspace sidebar/tabs file by searching for where "Decisions" tab is defined (e.g. search for `decisions` or `DecisionList` in component files).
2. Add the Clarifications tab following the same pattern as Decisions.
3. Import `useClarificationStore` and `ClarificationList`.
4. Add `fetchClarifications` call in the same `useEffect` that calls `fetchDecisions` (or add a separate one).
5. Wire `answerClarification` from the store to the `onAnswer` prop.

**Verify build passes:**
```bash
npm run build
```

**Build checklist:**
- [ ] No TypeScript errors (`npm run type-check` or `tsc --noEmit`)
- [ ] No missing imports
- [ ] `ClarificationCard` and `ClarificationList` exported correctly
- [ ] `clarification-store.ts` has no type errors
- [ ] `api.ts` `ChatResponse` type updated with optional `clarificationId`
- [ ] `npm run build` exits with code 0

**If build fails:**
1. Check that `Clarification` type is exported from `api.ts`
2. Ensure all Lucide icon names exist: `HelpCircle`, `MessageCircle`, `CheckCircle2` are valid in lucide-react
3. Verify `useClarificationStore` is imported from correct path
4. Check that `'use client'` directive is at the top of both component files
5. Confirm the workspace tab type union includes `'clarifications'`

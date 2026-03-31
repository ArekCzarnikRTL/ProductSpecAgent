# Feature 17: Resizable Right Sidebar – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the right sidebar (Chat + Tabs) horizontally resizable via a drag handle.

**Architecture:** Custom `useResizable` React hook handles mouse events and width state. A `ResizeHandle` component renders the visual drag strip. The project workspace page wires both together, replacing the fixed `w-[340px]` with a dynamic `style={{ width }}`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (existing stack, no new dependencies)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/lib/hooks/use-resizable.ts` | Hook: mouse event handling, width state, clamp logic |
| Create | `frontend/src/components/layout/ResizeHandle.tsx` | Visual drag handle strip with hover/drag states |
| Modify | `frontend/src/app/projects/[id]/page.tsx:125-197` | Wire hook + handle into sidebar, replace fixed width |

---

### Task 1: Create `useResizable` Hook

**Files:**
- Create: `frontend/src/lib/hooks/use-resizable.ts`

- [ ] **Step 1: Create hooks directory and hook file**

```typescript
// frontend/src/lib/hooks/use-resizable.ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface UseResizableOptions {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

interface UseResizableReturn {
  width: number;
  isDragging: boolean;
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
  };
}

export function useResizable({
  initialWidth = 340,
  minWidth = 280,
  maxWidth = 600,
}: UseResizableOptions = {}): UseResizableReturn {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
      setIsDragging(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [width]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startX, startWidth } = dragRef.current;
      // Left = wider (sidebar is on the right edge)
      const newWidth = startWidth - (e.clientX - startX);
      setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const onMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, minWidth, maxWidth]);

  return { width, isDragging, handleProps: { onMouseDown } };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors related to `use-resizable.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/hooks/use-resizable.ts
git commit -m "feat(resize): add useResizable hook for drag-based width control"
```

---

### Task 2: Create `ResizeHandle` Component

**Files:**
- Create: `frontend/src/components/layout/ResizeHandle.tsx`

- [ ] **Step 1: Create the ResizeHandle component**

```tsx
// frontend/src/components/layout/ResizeHandle.tsx
"use client";

import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizeHandle({ isDragging, onMouseDown }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "w-1 shrink-0 cursor-col-resize transition-colors",
        isDragging ? "bg-blue-500/70" : "hover:bg-blue-500/50"
      )}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors related to `ResizeHandle.tsx`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/ResizeHandle.tsx
git commit -m "feat(resize): add ResizeHandle component with hover/drag states"
```

---

### Task 3: Wire Hook + Handle into Project Workspace Page

**Files:**
- Modify: `frontend/src/app/projects/[id]/page.tsx:125-197`

- [ ] **Step 1: Add imports to page.tsx**

Add these two imports after the existing imports (after line 22):

```typescript
import { useResizable } from "@/lib/hooks/use-resizable";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
```

- [ ] **Step 2: Add hook call inside the component**

Add the hook call after the existing `useEffect` block (after line 58, before the loading check):

```typescript
  const { width: sidebarWidth, isDragging, handleProps } = useResizable({
    initialWidth: 340,
    minWidth: 280,
    maxWidth: 600,
  });
```

- [ ] **Step 3: Replace fixed sidebar with resizable sidebar**

Replace the current sidebar div (lines 125-197):

```tsx
        <div className="w-[340px] shrink-0 overflow-hidden flex flex-col border-l">
          {/* Tab buttons */}
          <div className="flex border-b">
            {/* ... tab buttons ... */}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {/* ... tab content ... */}
          </div>
        </div>
```

With:

```tsx
        <div className="shrink-0 overflow-hidden flex flex-row" style={{ width: sidebarWidth }}>
          <ResizeHandle isDragging={isDragging} onMouseDown={handleProps.onMouseDown} />
          <div className="flex-1 overflow-hidden flex flex-col border-l">
            {/* Tab buttons */}
            <div className="flex border-b">
              <button
                onClick={() => setRightTab("chat")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  rightTab === "chat" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare size={13} /> Chat
              </button>
              <button
                onClick={() => setRightTab("decisions")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  rightTab === "decisions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Scale size={13} /> Decisions
                {pendingCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{pendingCount}</span>
                )}
              </button>
              <button
                onClick={() => setRightTab("clarifications")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  rightTab === "clarifications" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HelpCircle size={13} /> Clarifications
                {openClarCount > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">{openClarCount}</span>
                )}
              </button>
              <button
                onClick={() => setRightTab("tasks")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  rightTab === "tasks" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers size={13} /> Tasks
                {tasks.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tasks.length}</span>
                )}
              </button>
              <button
                onClick={() => setRightTab("checks")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors",
                  rightTab === "checks" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ShieldCheck size={13} /> Checks
              </button>
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {rightTab === "chat" ? (
                <ChatPanel projectId={id} />
              ) : rightTab === "decisions" ? (
                <DecisionLog projectId={id} />
              ) : rightTab === "clarifications" ? (
                <ClarificationList projectId={id} />
              ) : rightTab === "tasks" ? (
                <TaskTree projectId={id} />
              ) : (
                <CheckResultsPanel projectId={id} />
              )}
            </div>
          </div>
        </div>
```

Key changes:
- Outer div: `w-[340px]` removed, `flex-col` changed to `flex-row`, `border-l` removed, `style={{ width: sidebarWidth }}` added
- `ResizeHandle` added as first child
- Inner div wraps all tab content: `flex-1 overflow-hidden flex flex-col border-l`

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

- [ ] **Step 5: Visual verification**

Run: `cd frontend && npm run dev`
Open: `http://localhost:3000/projects/<any-project-id>`
Verify:
- Thin drag handle visible at left edge of sidebar
- Handle highlights blue on hover
- Dragging left makes sidebar wider (up to 600px)
- Dragging right makes sidebar narrower (down to 280px)
- Wizard form area adjusts accordingly
- No text selection during drag
- Tab content (Chat, Decisions, etc.) renders correctly at all widths

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/projects/[id]/page.tsx
git commit -m "feat(resize): wire resizable sidebar into project workspace page"
```

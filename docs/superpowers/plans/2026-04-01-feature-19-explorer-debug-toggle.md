# Feature 19: Explorer Debug-Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Debug toggle to the Explorer panel that shows/hides internal files (*.json) and control folders (clarifications, decisions, tasks).

**Architecture:** Move all file-filtering logic from backend to frontend. The backend returns the complete file tree unconditionally. The ExplorerPanel applies a recursive `filterEntries()` function based on a local `debug` state toggled by a Bug-icon button in the header.

**Tech Stack:** Kotlin/Spring Boot (backend), React/Next.js/TypeScript (frontend), lucide-react icons

---

### Task 1: Remove backend file filtering

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/api/FileController.kt:58-70`

- [ ] **Step 1: Remove hiddenFiles set and filter logic**

Delete the `hiddenFiles` property and the filter line in `buildTree()`. The method should iterate all files without skipping any:

```kotlin
private fun buildTree(dir: Path, relativePath: String): List<FileEntry> {
    if (!Files.exists(dir)) return emptyList()

    val entries = mutableListOf<FileEntry>()

    Files.list(dir).use { stream ->
        stream.sorted(Comparator.comparing<Path, Boolean> { !Files.isDirectory(it) }
            .thenComparing { it.fileName.toString() })
            .forEach { path ->
                val name = path.fileName.toString()
                val relPath = if (relativePath.isEmpty()) name else "$relativePath/$name"

                if (Files.isDirectory(path)) {
                    entries.add(FileEntry(
                        name = name,
                        path = relPath,
                        isDirectory = true,
                        children = buildTree(path, relPath)
                    ))
                } else {
                    entries.add(FileEntry(
                        name = name,
                        path = relPath,
                        isDirectory = false,
                        size = Files.size(path)
                    ))
                }
            }
    }

    return entries
}
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd backend && ./gradlew compileKotlin`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/api/FileController.kt
git commit -m "refactor: remove backend file filtering, delegate to frontend"
```

---

### Task 2: Add filterEntries function and debug toggle to ExplorerPanel

**Files:**
- Modify: `frontend/src/components/explorer/ExplorerPanel.tsx`

- [ ] **Step 1: Add imports, filter constants, and filterEntries function**

Add `Bug` to lucide-react imports, add `cn` utility import, define hidden folders set, and add the recursive filter function at the top of the file:

```typescript
import { Bug, FolderTree, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const HIDDEN_FOLDERS = new Set(["clarifications", "decisions", "tasks"]);

function filterEntries(entries: FileEntry[], debug: boolean): FileEntry[] {
  if (debug) return entries;
  return entries
    .filter((e) => {
      if (e.isDirectory && HIDDEN_FOLDERS.has(e.name.toLowerCase())) return false;
      if (!e.isDirectory && e.name.endsWith(".json")) return false;
      return true;
    })
    .map((e) =>
      e.isDirectory && e.children
        ? { ...e, children: filterEntries(e.children, debug) }
        : e
    );
}
```

- [ ] **Step 2: Add debug state**

In the `ExplorerPanel` component, add:

```typescript
const [debug, setDebug] = useState(false);
```

- [ ] **Step 3: Add Debug toggle button in header**

Insert between the Badge and the Refresh button:

```tsx
<Button
  size="icon-xs"
  variant="ghost"
  onClick={() => setDebug(!debug)}
  title={debug ? "Debug: An" : "Debug: Aus"}
  className={cn(debug && "text-amber-500")}
>
  <Bug size={11} />
</Button>
```

- [ ] **Step 4: Apply filter to FileTree entries**

Change the FileTree rendering to use filtered entries:

```tsx
<FileTree entries={filterEntries(files, debug)} onFileClick={(path) => setViewerPath(path)} />
```

- [ ] **Step 5: Verify frontend compiles**

Run: `cd frontend && npx next build` or `cd frontend && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/explorer/ExplorerPanel.tsx
git commit -m "feat: add debug toggle to explorer for showing/hiding internal files"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start the app and open a project**

Run backend and frontend, navigate to an existing project workspace.

- [ ] **Step 2: Verify default state (Debug aus)**

Check that:
- No `*.json` files are visible in the explorer
- Folders `clarifications`, `decisions`, `tasks` are not visible
- Spec documents (.md files) and other content folders are visible

- [ ] **Step 3: Verify Debug mode (Debug an)**

Click the Bug icon in the Explorer header. Check that:
- Bug icon turns amber/yellow
- `project.json`, `flow-state.json`, `wizard.json` appear
- `clarifications`, `decisions`, `tasks` folders appear
- All `*.json` files in subfolders appear

- [ ] **Step 4: Verify toggle back (Debug aus)**

Click the Bug icon again. Check that:
- Bug icon returns to default color
- Internal files and folders disappear again

- [ ] **Step 5: Final commit with feature doc**

```bash
git add docs/features/19-explorer-debug-toggle.md docs/superpowers/plans/2026-04-01-feature-19-explorer-debug-toggle.md
git commit -m "docs: add feature spec and plan for explorer debug toggle"
```

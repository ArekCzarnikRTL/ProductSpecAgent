# Feature 1c: Frontend Spec Flow UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the frontend UI for the Idea-to-Spec flow with Rete.js node graph visualization, project management pages, and agent chat interface.

**Architecture:** Next.js App Router pages for project listing, creation, and the main workspace. Rete.js renders the flow graph with custom-styled nodes. Zustand manages client-side state. Chat panel communicates with backend agent via REST.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Rete.js v2, Zustand, Tailwind CSS v4, Lucide React

---

## Task 1: API Client Extensions

Extend `src/lib/api.ts` with full project and flow endpoints, and add all TypeScript types.

- [ ] Replace the contents of `frontend/src/lib/api.ts` with the complete implementation below.

**Complete file: `frontend/src/lib/api.ts`**

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch("/api/health");
}

// ─── Domain Types ────────────────────────────────────────────────────────────

export type StepStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export type StepKey =
  | "idee"
  | "problem"
  | "zielgruppe"
  | "scope"
  | "mvp"
  | "spec";

export interface FlowStep {
  key: StepKey;
  label: string;
  status: StepStatus;
  content: string | null;
}

export interface FlowState {
  projectId: string;
  currentStep: StepKey;
  steps: FlowStep[];
}

export interface Project {
  id: string;
  name: string;
  idea: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  idea: string;
}

export interface ChatRequest {
  message: string;
  stepKey?: StepKey;
}

export interface ChatResponse {
  reply: string;
  updatedFlowState?: FlowState;
}

// ─── Project Endpoints ───────────────────────────────────────────────────────

export async function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects");
}

export async function createProject(
  data: CreateProjectRequest
): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

// ─── Flow Endpoints ──────────────────────────────────────────────────────────

export async function getFlowState(projectId: string): Promise<FlowState> {
  return apiFetch<FlowState>(`/api/projects/${projectId}/flow`);
}

export async function sendChatMessage(
  projectId: string,
  data: ChatRequest
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>(`/api/projects/${projectId}/chat`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

- [ ] Commit: `feat(frontend): add project and flow API client types and endpoints`

---

## Task 2: Zustand Project Store

Create the Zustand store that manages project state, flow state, and chat messages on the client side.

- [ ] Create directory `frontend/src/lib/stores/`
- [ ] Create `frontend/src/lib/stores/project-store.ts` with the complete content below.

**Complete file: `frontend/src/lib/stores/project-store.ts`**

```typescript
import { create } from "zustand";
import {
  Project,
  FlowState,
  FlowStep,
  StepKey,
  ChatRequest,
  ChatResponse,
  getProject,
  getFlowState,
  sendChatMessage,
} from "@/lib/api";

// ─── Chat Message Type ────────────────────────────────────────────────────────

export type ChatMessageRole = "user" | "agent" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface ProjectState {
  // Current project
  project: Project | null;
  projectLoading: boolean;
  projectError: string | null;

  // Flow state
  flowState: FlowState | null;
  flowLoading: boolean;
  flowError: string | null;

  // Selected step in the graph
  selectedStep: StepKey | null;

  // Chat
  messages: ChatMessage[];
  chatSending: boolean;
  chatError: string | null;

  // Actions
  loadProject: (id: string) => Promise<void>;
  loadFlowState: (projectId: string) => Promise<void>;
  selectStep: (key: StepKey | null) => void;
  sendMessage: (projectId: string, req: ChatRequest) => Promise<void>;
  addSystemMessage: (content: string) => void;
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let messageCounter = 0;
function makeId(): string {
  return `msg-${Date.now()}-${++messageCounter}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  projectLoading: false,
  projectError: null,

  flowState: null,
  flowLoading: false,
  flowError: null,

  selectedStep: null,

  messages: [],
  chatSending: false,
  chatError: null,

  loadProject: async (id: string) => {
    set({ projectLoading: true, projectError: null });
    try {
      const project = await getProject(id);
      set({ project, projectLoading: false });
    } catch (err) {
      set({
        projectError: err instanceof Error ? err.message : "Failed to load project",
        projectLoading: false,
      });
    }
  },

  loadFlowState: async (projectId: string) => {
    set({ flowLoading: true, flowError: null });
    try {
      const flowState = await getFlowState(projectId);
      set({ flowState, flowLoading: false });
    } catch (err) {
      set({
        flowError: err instanceof Error ? err.message : "Failed to load flow state",
        flowLoading: false,
      });
    }
  },

  selectStep: (key: StepKey | null) => {
    set({ selectedStep: key });
  },

  sendMessage: async (projectId: string, req: ChatRequest) => {
    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: req.message,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, userMsg],
      chatSending: true,
      chatError: null,
    }));

    try {
      const response: ChatResponse = await sendChatMessage(projectId, req);

      const agentMsg: ChatMessage = {
        id: makeId(),
        role: "agent",
        content: response.reply,
        timestamp: Date.now(),
      };

      set((state) => ({
        messages: [...state.messages, agentMsg],
        chatSending: false,
        flowState: response.updatedFlowState ?? state.flowState,
      }));
    } catch (err) {
      const errorContent =
        err instanceof Error ? err.message : "Failed to send message";
      const errMsg: ChatMessage = {
        id: makeId(),
        role: "system",
        content: `Error: ${errorContent}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, errMsg],
        chatSending: false,
        chatError: errorContent,
      }));
    }
  },

  addSystemMessage: (content: string) => {
    const msg: ChatMessage = {
      id: makeId(),
      role: "system",
      content,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
  },

  reset: () => {
    set({
      project: null,
      projectLoading: false,
      projectError: null,
      flowState: null,
      flowLoading: false,
      flowError: null,
      selectedStep: null,
      messages: [],
      chatSending: false,
      chatError: null,
    });
  },
}));
```

- [ ] Commit: `feat(frontend): add Zustand project store with flow and chat state`

---

## Task 3: Projects List Page

Create the projects listing page at `/projects`.

- [ ] Create directory `frontend/src/app/projects/`
- [ ] Create `frontend/src/app/projects/page.tsx` with the complete content below.

**Complete file: `frontend/src/app/projects/page.tsx`**

```tsx
import Link from "next/link";
import { Plus, FolderKanban, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { listProjects, Project } from "@/lib/api";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderKanban size={16} />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{project.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {project.idea}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter className="flex items-center justify-between border-t pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={12} />
          {formatDate(project.createdAt)}
        </span>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${project.id}`}>Open</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FolderKanban size={24} />
      </div>
      <div>
        <p className="font-medium">No projects yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create your first project to start building a product spec.
        </p>
      </div>
      <Button asChild>
        <Link href="/projects/new">
          <Plus size={16} />
          New Project
        </Link>
      </Button>
    </div>
  );
}

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let loadError: string | null = null;

  try {
    projects = await listProjects();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load projects";
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Turn your ideas into structured product specs.
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus size={16} />
              New Project
            </Link>
          </Button>
        </div>

        {/* Error state */}
        {loadError && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.length === 0 && !loadError ? (
            <EmptyState />
          ) : (
            projects.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(frontend): add projects list page`

---

## Task 4: New Project Page

Create the new project form page at `/projects/new`.

- [ ] Create directory `frontend/src/app/projects/new/`
- [ ] Create `frontend/src/app/projects/new/page.tsx` with the complete content below.

**Complete file: `frontend/src/app/projects/new/page.tsx`**

```tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createProject } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && idea.trim().length > 0 && !loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const project = await createProject({ name: name.trim(), idea: idea.trim() });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Back nav */}
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          All Projects
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles size={18} />
              </div>
              <CardTitle className="text-xl">New Project</CardTitle>
            </div>
            <CardDescription>
              Give your project a name and describe your product idea. The agent will guide you through the spec process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. TaskFlow Pro"
                  maxLength={120}
                  disabled={loading}
                  className={cn(
                    "w-full rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-shadow"
                  )}
                />
              </div>

              {/* Idea */}
              <div className="space-y-1.5">
                <label
                  htmlFor="project-idea"
                  className="block text-sm font-medium text-foreground"
                >
                  Product Idea
                </label>
                <textarea
                  id="project-idea"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your product idea in a few sentences. What problem does it solve? Who is it for?"
                  rows={5}
                  disabled={loading}
                  className={cn(
                    "w-full resize-y rounded-md border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-shadow min-h-[120px]"
                  )}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {idea.length} chars
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => router.push("/projects")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(frontend): add new project creation page`

---

## Task 5: Rete.js Flow Graph Component

Build the Rete.js flow graph with three files. The editor factory is a plain TypeScript module; the React wrapper uses `useRete`; the node component is a styled React component. Dynamic import with `ssr: false` is applied at the workspace page level (Task 7).

### 5a — Editor factory

- [ ] Create directory `frontend/src/components/spec-flow/`
- [ ] Create `frontend/src/components/spec-flow/editor.ts`

**Complete file: `frontend/src/components/spec-flow/editor.ts`**

```typescript
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets,
} from "rete-connection-plugin";
import {
  ReactPlugin,
  Presets as ReactPresets,
} from "rete-react-plugin";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import type { StepKey, StepStatus } from "@/lib/api";

// ─── Node / Connection Scheme ─────────────────────────────────────────────────

export class FlowNode extends ClassicPreset.Node {
  width = 180;
  height = 80;

  constructor(
    public stepKey: StepKey,
    label: string,
    public status: StepStatus = "OPEN"
  ) {
    super(label);
  }
}

type Schemes = GetSchemes<FlowNode, ClassicPreset.Connection<FlowNode, FlowNode>>;
type AreaExtra = { type: "render"; data: { element: HTMLElement; component: unknown; payload: unknown } };

// ─── Step Definitions ─────────────────────────────────────────────────────────

export const STEP_DEFINITIONS: Array<{ key: StepKey; label: string }> = [
  { key: "idee", label: "Idee" },
  { key: "problem", label: "Problem" },
  { key: "zielgruppe", label: "Zielgruppe" },
  { key: "scope", label: "Scope" },
  { key: "mvp", label: "MVP" },
  { key: "spec", label: "Spec" },
];

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const H_GAP = 60;

function nodeX(index: number): number {
  return index * (NODE_WIDTH + H_GAP);
}

// ─── Create Editor ────────────────────────────────────────────────────────────

export interface EditorContext {
  destroy: () => void;
  updateNodeStatus: (key: StepKey, status: StepStatus) => Promise<void>;
  onSelectStep: (cb: (key: StepKey) => void) => void;
}

export async function createEditor(
  container: HTMLElement,
  customNodeComponent: React.ComponentType<{ data: FlowNode }>
): Promise<EditorContext> {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot } as { createRoot: (container: Element | DocumentFragment) => Root });

  // Use custom node component via override
  render.addPreset(
    ReactPresets.classic.setup({
      customize: {
        node() {
          return customNodeComponent;
        },
      },
    })
  );

  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  AreaExtensions.simpleNodesOrder(area);
  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl(),
  });

  // ── Build nodes ──────────────────────────────────────────────────────────────

  const nodeMap = new Map<StepKey, FlowNode>();

  for (let i = 0; i < STEP_DEFINITIONS.length; i++) {
    const def = STEP_DEFINITIONS[i];
    const node = new FlowNode(def.key, def.label, "OPEN");

    // Add output socket (except last node)
    if (i < STEP_DEFINITIONS.length - 1) {
      node.addOutput("out", new ClassicPreset.Output(new ClassicPreset.Socket("flow")));
    }
    // Add input socket (except first node)
    if (i > 0) {
      node.addInput("in", new ClassicPreset.Input(new ClassicPreset.Socket("flow")));
    }

    await editor.addNode(node);
    await area.translate(node.id, { x: nodeX(i), y: 0 });
    nodeMap.set(def.key, node);
  }

  // ── Connect nodes linearly ───────────────────────────────────────────────────

  for (let i = 0; i < STEP_DEFINITIONS.length - 1; i++) {
    const from = nodeMap.get(STEP_DEFINITIONS[i].key)!;
    const to = nodeMap.get(STEP_DEFINITIONS[i + 1].key)!;
    await editor.addConnection(
      new ClassicPreset.Connection(from, "out", to, "in")
    );
  }

  // ── Zoom to fit ───────────────────────────────────────────────────────────────

  await AreaExtensions.zoomAt(area, editor.getNodes());

  // ── Select step callback ──────────────────────────────────────────────────────

  let selectCallback: ((key: StepKey) => void) | null = null;

  area.addPipe((context) => {
    if (context.type === "nodepicked") {
      const node = editor.getNode((context as { type: string; data: { id: string } }).data.id);
      if (node instanceof FlowNode && selectCallback) {
        selectCallback(node.stepKey);
      }
    }
    return context;
  });

  // ── Public API ────────────────────────────────────────────────────────────────

  const updateNodeStatus = async (key: StepKey, status: StepStatus) => {
    const node = nodeMap.get(key);
    if (!node) return;
    node.status = status;
    await area.update("node", node.id);
  };

  const onSelectStep = (cb: (key: StepKey) => void) => {
    selectCallback = cb;
  };

  const destroy = () => {
    area.destroy();
  };

  return { destroy, updateNodeStatus, onSelectStep };
}
```

### 5b — FlowNode React component

- [ ] Create `frontend/src/components/spec-flow/FlowNode.tsx`

**Complete file: `frontend/src/components/spec-flow/FlowNode.tsx`**

```tsx
"use client";

import type { FlowNode as FlowNodeData } from "./editor";
import type { StepStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

// Status → Tailwind-compatible inline style tokens (using CSS variables from globals.css)
const STATUS_STYLES: Record<
  StepStatus,
  { border: string; bg: string; badge: string; badgeText: string; label: string }
> = {
  OPEN: {
    border: "border-border",
    bg: "bg-card",
    badge: "bg-muted text-muted-foreground",
    badgeText: "Open",
    label: "text-foreground",
  },
  IN_PROGRESS: {
    border: "border-primary",
    bg: "bg-card",
    badge: "bg-primary text-primary-foreground",
    badgeText: "In Progress",
    label: "text-foreground",
  },
  COMPLETED: {
    // --color-chart-2 is teal: oklch(0.65 0.15 160)
    border: "border-[oklch(0.65_0.15_160)]",
    bg: "bg-card",
    badge: "bg-[oklch(0.65_0.15_160)] text-black",
    badgeText: "Done",
    label: "text-foreground",
  },
};

interface FlowNodeProps {
  data: FlowNodeData;
}

export function FlowNodeComponent({ data }: FlowNodeProps) {
  const styles = STATUS_STYLES[data.status] ?? STATUS_STYLES.OPEN;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 px-4 py-3",
        "min-w-[140px] cursor-pointer select-none transition-colors",
        styles.border,
        styles.bg
      )}
      style={{ width: data.width, height: data.height }}
    >
      <span className={cn("text-sm font-semibold leading-tight", styles.label)}>
        {data.label}
      </span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium leading-none",
          styles.badge
        )}
      >
        {styles.badgeText}
      </span>
    </div>
  );
}
```

### 5c — SpecFlowGraph React wrapper

- [ ] Create `frontend/src/components/spec-flow/SpecFlowGraph.tsx`

**Complete file: `frontend/src/components/spec-flow/SpecFlowGraph.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRete } from "rete-react-plugin";
import { createEditor, EditorContext } from "./editor";
import { FlowNodeComponent } from "./FlowNode";
import type { FlowState, StepKey } from "@/lib/api";

interface SpecFlowGraphProps {
  flowState: FlowState | null;
  onSelectStep?: (key: StepKey) => void;
}

export function SpecFlowGraph({ flowState, onSelectStep }: SpecFlowGraphProps) {
  const editorContextRef = useRef<EditorContext | null>(null);

  const [ref, editor] = useRete((container) =>
    createEditor(container, FlowNodeComponent)
  );

  // Wire up select callback once editor is ready
  useEffect(() => {
    if (!editor) return;
    // editor here is the resolved EditorContext from createEditor
    const ctx = editor as unknown as EditorContext;
    editorContextRef.current = ctx;
    if (onSelectStep) {
      ctx.onSelectStep(onSelectStep);
    }
  }, [editor, onSelectStep]);

  // Sync node statuses when flowState changes
  useEffect(() => {
    if (!flowState || !editorContextRef.current) return;
    const ctx = editorContextRef.current;
    for (const step of flowState.steps) {
      ctx.updateNodeStatus(step.key, step.status);
    }
  }, [flowState]);

  return (
    <div
      ref={ref}
      className="h-full w-full"
      style={{ background: "var(--color-background)" }}
    />
  );
}
```

- [ ] Commit: `feat(frontend): add Rete.js flow graph components (editor, FlowNode, SpecFlowGraph)`

---

## Task 6: Chat Panel Component

Build the chat interface with message list and input box.

### 6a — ChatMessage component

- [ ] Create directory `frontend/src/components/chat/`
- [ ] Create `frontend/src/components/chat/ChatMessage.tsx`

**Complete file: `frontend/src/components/chat/ChatMessage.tsx`**

```tsx
"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/stores/project-store";
import { Bot, User, AlertCircle } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const isAgent = message.role === "agent";

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <AlertCircle size={12} className="shrink-0 text-destructive" />
        <span>{message.content}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2.5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm bg-secondary text-secondary-foreground"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
```

### 6b — ChatPanel component

- [ ] Create `frontend/src/components/chat/ChatPanel.tsx`

**Complete file: `frontend/src/components/chat/ChatPanel.tsx`**

```tsx
"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./ChatMessage";
import { useProjectStore } from "@/lib/stores/project-store";
import { cn } from "@/lib/utils";
import type { StepKey } from "@/lib/api";

interface ChatPanelProps {
  projectId: string;
  activeStep?: StepKey | null;
}

export function ChatPanel({ projectId, activeStep }: ChatPanelProps) {
  const { messages, chatSending, sendMessage } = useProjectStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || chatSending) return;
    setInput("");
    await sendMessage(projectId, { message: text, stepKey: activeStep ?? undefined });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot size={15} />
        </div>
        <span className="text-sm font-semibold">Spec Agent</span>
        {activeStep && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
            {activeStep}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <Bot size={32} className="opacity-30" />
            <p className="text-sm">
              Say hi! I&apos;ll guide you through each step of the spec.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {chatSending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                <span>Agent is thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2 rounded-lg border bg-input p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the agent… (Enter to send)"
            rows={1}
            disabled={chatSending}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none disabled:opacity-50",
              "max-h-32 min-h-[24px]"
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={!input.trim() || chatSending}
            className="shrink-0"
          >
            {chatSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(frontend): add ChatMessage and ChatPanel components`

---

## Task 7: Project Workspace Page

Create the main workspace page that combines the Rete.js graph and chat panel. The Rete.js wrapper is loaded with `next/dynamic` and `ssr: false` here.

- [ ] Create directory `frontend/src/app/projects/[id]/`
- [ ] Create `frontend/src/app/projects/[id]/page.tsx` with the complete content below.

**Complete file: `frontend/src/app/projects/[id]/page.tsx`**

```tsx
"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useProjectStore } from "@/lib/stores/project-store";
import type { FlowStep, StepKey } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Rete.js graph loaded without SSR ────────────────────────────────────────

const SpecFlowGraph = dynamic(
  () =>
    import("@/components/spec-flow/SpecFlowGraph").then(
      (m) => m.SpecFlowGraph
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    ),
  }
);

// ─── Step Content Panel ────────────────────────────────────────────────────────

function StepStatusBadge({ status }: { status: FlowStep["status"] }) {
  const map: Record<FlowStep["status"], string> = {
    OPEN: "bg-muted text-muted-foreground",
    IN_PROGRESS: "bg-primary text-primary-foreground",
    COMPLETED: "bg-[oklch(0.65_0.15_160)] text-black",
  };
  const labels: Record<FlowStep["status"], string> = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        map[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function StepContentPanel({ step }: { step: FlowStep | undefined }) {
  if (!step) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Click a node in the graph to view step details.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold capitalize">{step.label}</h3>
        <StepStatusBadge status={step.status} />
      </div>
      {step.content ? (
        <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
          {step.content}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No content yet. Start chatting with the agent to build this step.
        </p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectWorkspacePage({ params }: PageProps) {
  const { id } = use(params);

  const {
    project,
    projectLoading,
    projectError,
    flowState,
    flowLoading,
    selectedStep,
    loadProject,
    loadFlowState,
    selectStep,
    reset,
  } = useProjectStore();

  const [showContent, setShowContent] = useState(false);

  // Load data on mount
  useEffect(() => {
    reset();
    loadProject(id);
    loadFlowState(id);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find selected step data
  const selectedStepData = flowState?.steps.find((s) => s.key === selectedStep);

  const handleSelectStep = (key: StepKey) => {
    selectStep(key);
    setShowContent(true);
  };

  // ── Loading / Error states ───────────────────────────────────────────────────

  if (projectLoading || flowLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-destructive">{projectError}</p>
        <Button variant="outline" asChild>
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    );
  }

  // ── Workspace layout ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <Link
          href="/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Projects
        </Link>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-xs">
          {project?.name ?? "Loading…"}
        </span>

        {/* Step content toggle */}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={showContent ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowContent((v) => !v)}
            className="gap-1.5"
          >
            <FileText size={14} />
            Step Details
          </Button>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Graph + optional step content */}
        <div className="flex flex-1 flex-col overflow-hidden border-r">
          {/* Rete.js graph */}
          <div
            className={cn(
              "overflow-hidden transition-all",
              showContent ? "h-[55%]" : "flex-1"
            )}
          >
            <SpecFlowGraph
              flowState={flowState}
              onSelectStep={handleSelectStep}
            />
          </div>

          {/* Step content panel (collapsible) */}
          {showContent && (
            <div className="flex-1 overflow-hidden border-t">
              <StepContentPanel step={selectedStepData} />
            </div>
          )}
        </div>

        {/* Right: Chat */}
        <div className="w-[340px] shrink-0 overflow-hidden">
          <ChatPanel projectId={id} activeStep={selectedStep} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit: `feat(frontend): add project workspace page with Rete.js graph and chat panel`

---

## Task 8: Build Verification

Verify the implementation compiles and all pages are reachable.

- [ ] From `frontend/`, run `npm run build` — fix any TypeScript or import errors that surface.

**Common issues to watch for:**

1. **`rete-react-plugin` `createRoot` signature**: The `ReactPlugin` constructor expects `{ createRoot }`. If the type signature differs, cast with `as unknown as ...` or check the installed version's types.

2. **`useRete` return type**: `useRete` returns `[ref, editor]` where `editor` is the resolved return value of your factory function (i.e., `EditorContext`). If TypeScript infers it as the `NodeEditor` instance instead, add an explicit generic: `useRete<EditorContext>(...)`.

3. **`next/dynamic` with named export**: The import inside `dynamic()` must call `.then(m => m.SpecFlowGraph)` — already done above.

4. **`use(params)` in client component**: Next.js 16 supports `use()` for unwrapping promises in both server and client components. If the installed version does not yet support this, replace with:
   ```tsx
   // Alternative: receive params as a plain object (server component passes resolved values)
   // Convert the page to a server component that passes id as a prop to a client WorkspaceClient component
   ```
   See the fallback pattern below.

5. **`fieldSizing: "content"` CSS property**: This is a newer CSS property. If TypeScript complains, the cast `as React.CSSProperties` (already included) suppresses it.

**Fallback for `use(params)` if needed** — split into server shell + client component:

```tsx
// src/app/projects/[id]/page.tsx  (server component shell)
import { WorkspaceClient } from "./WorkspaceClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const { id } = await params;
  return <WorkspaceClient id={id} />;
}
```

Then rename the current client component body into `src/app/projects/[id]/WorkspaceClient.tsx`, accepting `{ id: string }` as props instead of reading from `use(params)`.

- [ ] After successful build: `npm run dev` and manually verify:
  - `http://localhost:3000/projects` — shows project list (or empty state)
  - `http://localhost:3000/projects/new` — shows creation form
  - `http://localhost:3000/projects/[any-id]` — shows workspace (may show API error if backend not running, which is expected)
- [ ] Commit: `chore(frontend): verify build passes for feature-1c`

---

## Summary of Files Created / Modified

| File | Action |
|------|--------|
| `frontend/src/lib/api.ts` | Modified — added types + project/flow endpoints |
| `frontend/src/lib/stores/project-store.ts` | Created — Zustand store |
| `frontend/src/app/projects/page.tsx` | Created — projects list |
| `frontend/src/app/projects/new/page.tsx` | Created — new project form |
| `frontend/src/components/spec-flow/editor.ts` | Created — Rete.js editor factory |
| `frontend/src/components/spec-flow/FlowNode.tsx` | Created — custom node component |
| `frontend/src/components/spec-flow/SpecFlowGraph.tsx` | Created — React wrapper for Rete.js |
| `frontend/src/components/chat/ChatMessage.tsx` | Created — chat message bubble |
| `frontend/src/components/chat/ChatPanel.tsx` | Created — full chat panel |
| `frontend/src/app/projects/[id]/page.tsx` | Created — workspace page |

## Dependencies Already Installed

All required packages are pre-installed per the project setup:
- `rete`, `rete-area-plugin`, `rete-connection-plugin`, `rete-react-plugin`, `rete-render-utils`
- `zustand`
- `lucide-react`
- `styled-components` (not used directly — design system uses CSS variables via Tailwind)

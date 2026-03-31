# Feature 12: Dynamic Wizard Steps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wizard steps 7-10 dynamically visible based on the category selected in Step 1 (Idee), with category-specific chip options in each technical step form.

**Architecture:** A pure frontend change. A new config file `category-step-config.ts` defines per category which steps are visible and which chip options each field shows. The wizard-store gains a `getVisibleSteps(category)` helper. StepIndicator, WizardForm, and the three technical step forms (Architecture, Backend, Frontend) read the category from wizard data and adapt accordingly.

**Tech Stack:** React 19, Next.js 16, Zustand 5, TypeScript

---

### Task 1: Create `category-step-config.ts`

**Files:**
- Create: `frontend/src/lib/category-step-config.ts`

- [ ] **Step 1: Create the config file with types and full data**

```typescript
// frontend/src/lib/category-step-config.ts

export type Category = "SaaS" | "Mobile App" | "CLI Tool" | "Library" | "Desktop App" | "API";

export const ALL_STEP_KEYS = [
  "IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP", "SPEC",
  "FEATURES", "ARCHITECTURE", "BACKEND", "FRONTEND",
] as const;

const BASE_STEPS = ["IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP", "SPEC", "FEATURES"] as const;

export type FieldOptions = Record<string, Record<string, string[]>>;

export interface CategoryConfig {
  visibleSteps: string[];
  fieldOptions: FieldOptions;
}

export const CATEGORY_STEP_CONFIG: Record<Category, CategoryConfig> = {
  "SaaS": {
    visibleSteps: [...BASE_STEPS, "ARCHITECTURE", "BACKEND", "FRONTEND"],
    fieldOptions: {
      ARCHITECTURE: {
        architecture: ["Monolith", "Microservices", "Serverless"],
        database: ["PostgreSQL", "MongoDB", "SQLite", "Redis"],
        deployment: ["Docker", "Vercel+Cloud", "Kubernetes"],
      },
      BACKEND: {
        framework: ["Kotlin+Spring", "Node+Express", "Python+FastAPI", "Go", "Rust"],
        apiStyle: ["REST", "GraphQL", "gRPC"],
        auth: ["JWT", "Session", "OAuth", "API Key"],
      },
      FRONTEND: {
        framework: ["Next.js+React", "Vue+Nuxt", "Svelte", "Angular"],
        uiLibrary: ["shadcn/ui", "Material UI", "Ant Design", "Custom"],
        styling: ["Tailwind CSS", "CSS Modules", "Styled Components"],
        theme: ["Dark only", "Light only", "Both"],
      },
    },
  },
  "Mobile App": {
    visibleSteps: [...BASE_STEPS, "ARCHITECTURE", "BACKEND", "FRONTEND"],
    fieldOptions: {
      ARCHITECTURE: {
        architecture: ["Monolith", "Microservices", "Serverless"],
        database: ["PostgreSQL", "MongoDB", "SQLite", "Firebase"],
        deployment: ["App Store", "Play Store", "TestFlight"],
      },
      BACKEND: {
        framework: ["Kotlin+Spring", "Node+Express", "Python+FastAPI", "Go"],
        apiStyle: ["REST", "GraphQL"],
        auth: ["JWT", "OAuth", "API Key"],
      },
      FRONTEND: {
        framework: ["React Native", "Flutter", "SwiftUI", "Kotlin Multiplatform"],
        uiLibrary: ["Native Components", "React Native Paper", "Custom"],
        styling: ["StyleSheet", "NativeWind", "Styled Components"],
        theme: ["System Default", "Dark only", "Light only", "Both"],
      },
    },
  },
  "CLI Tool": {
    visibleSteps: [...BASE_STEPS, "ARCHITECTURE"],
    fieldOptions: {
      ARCHITECTURE: {
        architecture: ["Single Binary", "Multi-Command"],
        database: ["Filesystem", "SQLite"],
        deployment: ["npm/pip/brew", "Binary Release"],
      },
    },
  },
  "Library": {
    visibleSteps: [...BASE_STEPS],
    fieldOptions: {},
  },
  "Desktop App": {
    visibleSteps: [...BASE_STEPS, "ARCHITECTURE", "BACKEND", "FRONTEND"],
    fieldOptions: {
      ARCHITECTURE: {
        architecture: ["Monolith", "Plugin-basiert"],
        database: ["SQLite", "PostgreSQL", "Filesystem"],
        deployment: ["Installer", "App Store", "Portable"],
      },
      BACKEND: {
        framework: ["Kotlin+Spring", "Node+Express", "Python+FastAPI"],
        apiStyle: ["REST", "IPC"],
        auth: ["OAuth", "Local Auth"],
      },
      FRONTEND: {
        framework: ["Electron", "Tauri", "SwiftUI", "WPF"],
        uiLibrary: ["Native Components", "shadcn/ui", "Custom"],
        styling: ["Tailwind CSS", "Native Styling", "CSS Modules"],
        theme: ["System Default", "Dark only", "Light only", "Both"],
      },
    },
  },
  "API": {
    visibleSteps: [...BASE_STEPS, "ARCHITECTURE", "BACKEND"],
    fieldOptions: {
      ARCHITECTURE: {
        architecture: ["Monolith", "Microservices", "Serverless"],
        database: ["PostgreSQL", "MongoDB", "Redis"],
        deployment: ["Docker", "Vercel+Cloud", "Kubernetes"],
      },
      BACKEND: {
        framework: ["Kotlin+Spring", "Node+Express", "Python+FastAPI", "Go", "Rust"],
        apiStyle: ["REST", "GraphQL", "gRPC"],
        auth: ["JWT", "OAuth", "API Key"],
      },
    },
  },
};

/** Default: all steps visible (no category selected) */
export const DEFAULT_VISIBLE_STEPS = ALL_STEP_KEYS as unknown as string[];

export function getVisibleSteps(category: string | undefined): string[] {
  if (!category) return [...DEFAULT_VISIBLE_STEPS];
  const config = CATEGORY_STEP_CONFIG[category as Category];
  return config ? config.visibleSteps : [...DEFAULT_VISIBLE_STEPS];
}

export function getFieldOptions(category: string | undefined, step: string): Record<string, string[]> | undefined {
  if (!category) return undefined;
  const config = CATEGORY_STEP_CONFIG[category as Category];
  return config?.fieldOptions[step];
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `category-step-config.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/category-step-config.ts
git commit -m "feat: add CATEGORY_STEP_CONFIG with per-category visible steps and field options"
```

---

### Task 2: Update `wizard-store.ts` to use dynamic steps

**Files:**
- Modify: `frontend/src/lib/stores/wizard-store.ts`

- [ ] **Step 1: Import `getVisibleSteps` and add helper to store**

Replace the entire file content of `frontend/src/lib/stores/wizard-store.ts` with:

```typescript
import { create } from "zustand";
import type { WizardData, WizardStepData } from "@/lib/api";
import { getWizardData, saveWizardStep } from "@/lib/api";
import { getVisibleSteps } from "@/lib/category-step-config";

export const WIZARD_STEPS = [
  { key: "IDEA", label: "Idee", number: 1 },
  { key: "PROBLEM", label: "Problem", number: 2 },
  { key: "TARGET_AUDIENCE", label: "Zielgruppe", number: 3 },
  { key: "SCOPE", label: "Scope", number: 4 },
  { key: "MVP", label: "MVP", number: 5 },
  { key: "SPEC", label: "Spec", number: 6 },
  { key: "FEATURES", label: "Features", number: 7 },
  { key: "ARCHITECTURE", label: "Architektur", number: 8 },
  { key: "BACKEND", label: "Backend", number: 9 },
  { key: "FRONTEND", label: "Frontend", number: 10 },
] as const;

interface WizardState {
  data: WizardData | null;
  activeStep: string;
  loading: boolean;
  saving: boolean;

  loadWizard: (projectId: string) => Promise<void>;
  setActiveStep: (step: string) => void;
  updateField: (step: string, field: string, value: any) => void;
  saveStep: (projectId: string, step: string) => Promise<void>;
  completeStep: (projectId: string, step: string) => Promise<void>;
  goNext: () => void;
  goPrev: () => void;
  reset: () => void;
  getCategory: () => string | undefined;
  visibleSteps: () => typeof WIZARD_STEPS[number][];
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export const useWizardStore = create<WizardState>((set, get) => ({
  data: null,
  activeStep: "IDEA",
  loading: false,
  saving: false,

  loadWizard: async (projectId) => {
    set({ loading: true });
    try {
      const data = await getWizardData(projectId);
      set({ data, loading: false });
    } catch {
      set({ data: { projectId, steps: {} }, loading: false });
    }
  },

  setActiveStep: (step) => set({ activeStep: step }),

  getCategory: () => {
    const { data } = get();
    return data?.steps["IDEA"]?.fields?.category as string | undefined;
  },

  visibleSteps: () => {
    const category = get().getCategory();
    const visible = getVisibleSteps(category);
    return WIZARD_STEPS.filter((s) => visible.includes(s.key));
  },

  updateField: (step, field, value) => {
    const { data } = get();
    if (!data) return;

    const stepData = data.steps[step] ?? { fields: {}, completedAt: null };
    const updated: WizardData = {
      ...data,
      steps: {
        ...data.steps,
        [step]: { ...stepData, fields: { ...stepData.fields, [field]: value } },
      },
    };
    set({ data: updated });

    // Auto-save with debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const state = get();
      if (state.data) {
        const sd = state.data.steps[step];
        if (sd) {
          set({ saving: true });
          saveWizardStep(data.projectId, step, sd)
            .then((result) => set({ data: result, saving: false }))
            .catch(() => set({ saving: false }));
        }
      }
    }, 500);
  },

  saveStep: async (projectId, step) => {
    const { data } = get();
    if (!data) return;
    const stepData = data.steps[step];
    if (!stepData) return;
    set({ saving: true });
    try {
      const result = await saveWizardStep(projectId, step, stepData);
      set({ data: result, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  completeStep: async (projectId, step) => {
    const { data } = get();
    if (!data) return;
    const stepData = data.steps[step] ?? { fields: {}, completedAt: null };
    const completed = { ...stepData, completedAt: new Date().toISOString() };
    set({ saving: true });
    try {
      const result = await saveWizardStep(projectId, step, completed);
      set({ data: result, saving: false });
    } catch {
      set({ saving: false });
    }
  },

  goNext: () => {
    const { activeStep, visibleSteps } = get();
    const steps = visibleSteps();
    const idx = steps.findIndex((s) => s.key === activeStep);
    if (idx < steps.length - 1) set({ activeStep: steps[idx + 1].key });
  },

  goPrev: () => {
    const { activeStep, visibleSteps } = get();
    const steps = visibleSteps();
    const idx = steps.findIndex((s) => s.key === activeStep);
    if (idx > 0) set({ activeStep: steps[idx - 1].key });
  },

  reset: () => set({ data: null, activeStep: "IDEA", loading: false, saving: false }),
}));
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `wizard-store.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/stores/wizard-store.ts
git commit -m "feat: add getCategory/visibleSteps to wizard-store, dynamic goNext/goPrev"
```

---

### Task 3: Update `StepIndicator.tsx` to use dynamic steps

**Files:**
- Modify: `frontend/src/components/wizard/StepIndicator.tsx`

- [ ] **Step 1: Replace `WIZARD_STEPS` with `visibleSteps()` from store**

Replace the entire file content of `frontend/src/components/wizard/StepIndicator.tsx` with:

```typescript
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
```

Key change: `WIZARD_STEPS` replaced by `visibleSteps()`, and step number uses `i + 1` (dynamic index) instead of `step.number` (static).

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/StepIndicator.tsx
git commit -m "feat: StepIndicator renders only visible steps with dynamic numbering"
```

---

### Task 4: Update `WizardForm.tsx` to use dynamic steps

**Files:**
- Modify: `frontend/src/components/wizard/WizardForm.tsx`

- [ ] **Step 1: Replace static WIZARD_STEPS with visibleSteps()**

Replace the entire file content of `frontend/src/components/wizard/WizardForm.tsx` with:

```typescript
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
```

Key changes: `WIZARD_STEPS` replaced by `visibleSteps()`, step counter uses `stepIdx + 1` and `steps.length`.

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/WizardForm.tsx
git commit -m "feat: WizardForm uses dynamic visibleSteps for navigation and step counter"
```

---

### Task 5: Update `ArchitectureForm.tsx` with category-specific options

**Files:**
- Modify: `frontend/src/components/wizard/steps/ArchitectureForm.tsx`

- [ ] **Step 1: Read category from store and use dynamic chip options**

Replace the entire file content of `frontend/src/components/wizard/steps/ArchitectureForm.tsx` with:

```typescript
"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { getFieldOptions } from "@/lib/category-step-config";

const DEFAULT_OPTIONS = {
  architecture: ["Monolith", "Microservices", "Serverless", "Hybrid"],
  database: ["PostgreSQL", "MongoDB", "SQLite", "MySQL", "Filesystem", "Redis"],
  deployment: ["Docker Compose", "Vercel + Cloud", "Self-hosted", "Kubernetes", "AWS"],
};

export function ArchitectureForm({ projectId }: { projectId: string }) {
  const { data, updateField, getCategory } = useWizardStore();
  const fields = data?.steps["ARCHITECTURE"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("ARCHITECTURE", key, val);

  const category = getCategory();
  const options = getFieldOptions(category, "ARCHITECTURE") ?? DEFAULT_OPTIONS;

  return (
    <div className="space-y-5">
      <FormField label="System-Architektur" required>
        <ChipSelect options={options.architecture ?? DEFAULT_OPTIONS.architecture} value={get("architecture")} onChange={(v) => set("architecture", v)} />
      </FormField>
      <FormField label="Datenbank" required>
        <ChipSelect options={options.database ?? DEFAULT_OPTIONS.database} value={get("database")} onChange={(v) => set("database", v)} />
      </FormField>
      <FormField label="Deployment" required>
        <ChipSelect options={options.deployment ?? DEFAULT_OPTIONS.deployment} value={get("deployment")} onChange={(v) => set("deployment", v)} />
      </FormField>
      <FormField label="Architektur-Notizen">
        <textarea value={get("notes")} onChange={(e) => set("notes", e.target.value)}
          placeholder="Zusaetzliche Architektur-Details..." rows={3}
          className="w-full resize-y rounded-md border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </FormField>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/steps/ArchitectureForm.tsx
git commit -m "feat: ArchitectureForm uses category-specific chip options"
```

---

### Task 6: Update `BackendForm.tsx` with category-specific options

**Files:**
- Modify: `frontend/src/components/wizard/steps/BackendForm.tsx`

- [ ] **Step 1: Read category from store and use dynamic chip options**

Replace the entire file content of `frontend/src/components/wizard/steps/BackendForm.tsx` with:

```typescript
"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { getFieldOptions } from "@/lib/category-step-config";

const DEFAULT_OPTIONS = {
  framework: ["Kotlin + Spring Boot", "Node.js + Express", "Python + FastAPI", "Go", "Rust + Actix", "Java + Spring"],
  apiStyle: ["REST", "GraphQL", "gRPC", "WebSockets"],
  auth: ["JWT", "Session", "OAuth 2.0", "API Key", "Keine"],
};

export function BackendForm({ projectId }: { projectId: string }) {
  const { data, updateField, getCategory } = useWizardStore();
  const fields = data?.steps["BACKEND"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("BACKEND", key, val);

  const category = getCategory();
  const options = getFieldOptions(category, "BACKEND") ?? DEFAULT_OPTIONS;

  return (
    <div className="space-y-5">
      <FormField label="Sprache / Framework" required>
        <ChipSelect options={options.framework ?? DEFAULT_OPTIONS.framework} value={get("framework")} onChange={(v) => set("framework", v)} />
      </FormField>
      <FormField label="API-Stil" required>
        <ChipSelect options={options.apiStyle ?? DEFAULT_OPTIONS.apiStyle} value={get("apiStyle")} onChange={(v) => set("apiStyle", v)} />
      </FormField>
      <FormField label="Auth-Methode" required>
        <ChipSelect options={options.auth ?? DEFAULT_OPTIONS.auth} value={get("auth")} onChange={(v) => set("auth", v)} />
      </FormField>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/steps/BackendForm.tsx
git commit -m "feat: BackendForm uses category-specific chip options"
```

---

### Task 7: Update `FrontendForm.tsx` with category-specific options

**Files:**
- Modify: `frontend/src/components/wizard/steps/FrontendForm.tsx`

- [ ] **Step 1: Read category from store and use dynamic chip options**

Replace the entire file content of `frontend/src/components/wizard/steps/FrontendForm.tsx` with:

```typescript
"use client";
import { FormField } from "../FormField";
import { ChipSelect } from "../ChipSelect";
import { useWizardStore } from "@/lib/stores/wizard-store";
import { getFieldOptions } from "@/lib/category-step-config";

const DEFAULT_OPTIONS = {
  framework: ["Next.js + React", "Vue + Nuxt", "Svelte + SvelteKit", "Angular", "Remix", "Astro"],
  uiLibrary: ["shadcn/ui", "Material UI", "Ant Design", "Chakra UI", "Radix + Custom", "Keine"],
  styling: ["Tailwind CSS", "CSS Modules", "Styled Components", "Emotion", "Vanilla CSS"],
  theme: ["Dark only", "Light only", "Both (Toggle)"],
};

export function FrontendForm({ projectId }: { projectId: string }) {
  const { data, updateField, getCategory } = useWizardStore();
  const fields = data?.steps["FRONTEND"]?.fields ?? {};
  const get = (key: string) => (fields[key] as string) ?? "";
  const set = (key: string, val: any) => updateField("FRONTEND", key, val);

  const category = getCategory();
  const options = getFieldOptions(category, "FRONTEND") ?? DEFAULT_OPTIONS;

  return (
    <div className="space-y-5">
      <FormField label="Framework" required>
        <ChipSelect options={options.framework ?? DEFAULT_OPTIONS.framework} value={get("framework")} onChange={(v) => set("framework", v)} />
      </FormField>
      <FormField label="UI Library">
        <ChipSelect options={options.uiLibrary ?? DEFAULT_OPTIONS.uiLibrary} value={get("uiLibrary")} onChange={(v) => set("uiLibrary", v)} />
      </FormField>
      <FormField label="Styling">
        <ChipSelect options={options.styling ?? DEFAULT_OPTIONS.styling} value={get("styling")} onChange={(v) => set("styling", v)} />
      </FormField>
      <FormField label="Theme">
        <ChipSelect options={options.theme ?? DEFAULT_OPTIONS.theme} value={get("theme")} onChange={(v) => set("theme", v)} />
      </FormField>
    </div>
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/steps/FrontendForm.tsx
git commit -m "feat: FrontendForm uses category-specific chip options"
```

---

### Task 8: Full build verification and manual test

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run full TypeScript check**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Run build**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Run lint**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npm run lint 2>&1 | tail -20`
Expected: No errors

- [ ] **Step 4: Manual verification checklist**

Start the dev server and verify in the browser:

1. Open a project wizard — all 10 steps visible (no category selected)
2. Select "SaaS" in Step 1 — all 10 steps remain visible
3. Select "Library" in Step 1 — steps reduce to 7 (no Architektur, Backend, Frontend)
4. Select "CLI Tool" — steps show 1-7 + Architektur (8 total)
5. Select "API" — steps show 1-7 + Architektur + Backend (9 total)
6. Navigate to Architecture step with "CLI Tool" selected — see "Single Binary, Multi-Command" chips
7. Switch category back to "SaaS" — Architecture step shows "Monolith, Microservices, Serverless"
8. "Weiter"/"Abschliessen" buttons work correctly for the last visible step
9. Step numbering is sequential (no gaps)
10. Previously entered data in hidden steps is preserved when switching back

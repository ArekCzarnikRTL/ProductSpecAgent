# Feature 16: Remove SPEC Step — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the SPEC step from the wizard and FlowStepType enum. Instead, auto-generate a `spec.md` summary when the user completes the last wizard step.

**Architecture:** Remove `SPEC` from the `FlowStepType` enum (backend) and all step lists (frontend). Delete `SpecForm.tsx`. In `IdeaToSpecAgent.processWizardStep()`, add logic to auto-generate `spec.md` from all wizard data when the last step is completed. Update the `ExportService.generateSpec()` to also read `spec.md` directly (not only from FlowState steps). Fix all tests.

**Tech Stack:** Kotlin + Spring Boot (backend), React 19 + Next.js 16 + Zustand 5 (frontend)

---

## File Structure

**Backend — Modify:**
- `backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt` — remove `SPEC` from enum
- `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt` — generate spec.md on last step
- `backend/src/main/kotlin/com/agentwork/productspecagent/export/ExportService.kt` — include spec.md in export even if not a FlowState step
- `backend/src/main/resources/application.yml` — remove SPEC from system prompt
- `backend/src/test/resources/application.yml` — remove SPEC from system prompt
- `backend/src/test/kotlin/com/agentwork/productspecagent/domain/FlowStateTest.kt` — update step count and order
- `backend/src/test/kotlin/com/agentwork/productspecagent/api/ExportControllerTest.kt` — spec.md is now auto-generated

**Frontend — Modify:**
- `frontend/src/lib/stores/wizard-store.ts` — remove SPEC entry from WIZARD_STEPS
- `frontend/src/lib/category-step-config.ts` — remove SPEC from ALL_STEP_KEYS and BASE_STEPS
- `frontend/src/lib/api.ts` — remove "SPEC" from StepType
- `frontend/src/lib/step-field-labels.ts` — remove SPEC entries
- `frontend/src/components/wizard/WizardForm.tsx` — remove SPEC from FORM_MAP and SpecForm import
- `frontend/src/components/spec-flow/editor.ts` — remove SPEC from STEPS

**Frontend — Delete:**
- `frontend/src/components/wizard/steps/SpecForm.tsx`

---

### Task 1: Backend — Remove SPEC from FlowStepType and fix tests

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt`
- Modify: `backend/src/test/kotlin/com/agentwork/productspecagent/domain/FlowStateTest.kt`

- [ ] **Step 1: Remove SPEC from FlowStepType enum**

In `backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt`, change line 7 from:

```kotlin
    IDEA, PROBLEM, TARGET_AUDIENCE, SCOPE, MVP, SPEC,
```

to:

```kotlin
    IDEA, PROBLEM, TARGET_AUDIENCE, SCOPE, MVP,
```

- [ ] **Step 2: Update FlowStateTest**

In `backend/src/test/kotlin/com/agentwork/productspecagent/domain/FlowStateTest.kt`:

Change `createInitialFlowState creates all 10 steps` test — update count from 10 to 9:

```kotlin
    @Test
    fun `createInitialFlowState creates all 9 steps`() {
        val flowState = createInitialFlowState("test-project-id")
        assertEquals(9, flowState.steps.size)
    }
```

Change `createInitialFlowState steps are in correct order` test — remove `FlowStepType.SPEC`:

```kotlin
    @Test
    fun `createInitialFlowState steps are in correct order`() {
        val flowState = createInitialFlowState("test-project-id")
        val expectedOrder = listOf(
            FlowStepType.IDEA, FlowStepType.PROBLEM, FlowStepType.TARGET_AUDIENCE,
            FlowStepType.SCOPE, FlowStepType.MVP,
            FlowStepType.FEATURES, FlowStepType.ARCHITECTURE, FlowStepType.BACKEND, FlowStepType.FRONTEND
        )
        assertEquals(expectedOrder, flowState.steps.map { it.stepType })
    }
```

- [ ] **Step 3: Remove SPEC from system prompts**

In `backend/src/main/resources/application.yml`, change the system prompt steps from:

```yaml
    You work through these steps in order:
    1. IDEA - The user's initial idea (already captured, you acknowledge it)
    2. PROBLEM - Clarify the core problem being solved
    3. TARGET_AUDIENCE - Define who the product is for
    4. SCOPE - Define what is in and out of scope
    5. MVP - Define the minimum viable product
    6. SPEC - Synthesize everything into a complete specification
```

to:

```yaml
    You work through these steps in order:
    1. IDEA - The user's initial idea (already captured, you acknowledge it)
    2. PROBLEM - Clarify the core problem being solved
    3. TARGET_AUDIENCE - Define who the product is for
    4. SCOPE - Define what is in and out of scope
    5. MVP - Define the minimum viable product
```

Apply the same change to `backend/src/test/resources/application.yml`.

- [ ] **Step 4: Verify it compiles and tests pass**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -15`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt backend/src/test/kotlin/com/agentwork/productspecagent/domain/FlowStateTest.kt backend/src/main/resources/application.yml backend/src/test/resources/application.yml
git commit -m "feat: remove SPEC from FlowStepType enum and system prompt"
```

---

### Task 2: Backend — Auto-generate spec.md on last step

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`

- [ ] **Step 1: Add spec summary generation to processWizardStep**

In `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`, find the `val exportTriggered = isLastStep` line (around line 172) and add the spec generation before it:

```kotlin
        // Generate spec summary on last step
        if (isLastStep && currentStepType != null) {
            val allWizardData = wizardService.getWizardData(projectId)
            val fullContext = contextBuilder.buildWizardContext(allWizardData, step, fields)
            val summaryPrompt = buildString {
                appendLine("Based on all the information gathered in the wizard steps below, generate a complete product specification summary in markdown format.")
                appendLine("Include sections for: Product Overview, Problem, Target Audience, Scope, MVP, and any technical decisions made.")
                appendLine()
                appendLine(fullContext)
            }
            val localeInstruction = buildLocaleInstruction(locale)
            val summarySystemPrompt = "$baseSystemPrompt\n\n$localeInstruction"
            val specContent = runAgent(summarySystemPrompt, summaryPrompt)
            projectService.saveSpecFile(projectId, "spec.md", specContent)
        }

        val exportTriggered = isLastStep
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew compileKotlin 2>&1 | tail -5`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Run all tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -10`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt
git commit -m "feat: auto-generate spec.md from wizard data on last step completion"
```

---

### Task 3: Backend — Update ExportService to include spec.md

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/export/ExportService.kt`

- [ ] **Step 1: Update generateSpec to also read spec.md directly**

In `backend/src/main/kotlin/com/agentwork/productspecagent/export/ExportService.kt`, replace the `generateSpec` method (lines 100-113):

```kotlin
    private fun generateSpec(projectId: String, flowState: FlowState): String = buildString {
        appendLine("# Product Specification")
        appendLine()

        // Include auto-generated spec.md if it exists
        val autoSpec = projectService.readSpecFile(projectId, "spec.md")
        if (autoSpec != null) {
            appendLine(autoSpec)
            appendLine()
            appendLine("---")
            appendLine()
        }

        // Include individual step files
        for (step in flowState.steps) {
            val fileName = step.stepType.name.lowercase() + ".md"
            val content = projectService.readSpecFile(projectId, fileName)
            if (content != null) {
                appendLine(content)
                appendLine()
                appendLine("---")
                appendLine()
            }
        }
    }
```

- [ ] **Step 2: Verify it compiles and tests pass**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -10`
Expected: All pass (SPEC.md test in ExportControllerTest will still pass since the export generates a header "# Product Specification" which gets written as SPEC.md)

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/export/ExportService.kt
git commit -m "feat: ExportService includes auto-generated spec.md in export"
```

---

### Task 4: Frontend — Remove SPEC from all step lists and delete SpecForm

**Files:**
- Modify: `frontend/src/lib/stores/wizard-store.ts`
- Modify: `frontend/src/lib/category-step-config.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/step-field-labels.ts`
- Modify: `frontend/src/components/wizard/WizardForm.tsx`
- Modify: `frontend/src/components/spec-flow/editor.ts`
- Delete: `frontend/src/components/wizard/steps/SpecForm.tsx`

- [ ] **Step 1: Remove SPEC from wizard-store.ts**

In `frontend/src/lib/stores/wizard-store.ts`, remove the SPEC entry from `WIZARD_STEPS`:

```typescript
export const WIZARD_STEPS = [
  { key: "IDEA", label: "Idee" },
  { key: "PROBLEM", label: "Problem" },
  { key: "TARGET_AUDIENCE", label: "Zielgruppe" },
  { key: "SCOPE", label: "Scope" },
  { key: "MVP", label: "MVP" },
  { key: "FEATURES", label: "Features" },
  { key: "ARCHITECTURE", label: "Architektur" },
  { key: "BACKEND", label: "Backend" },
  { key: "FRONTEND", label: "Frontend" },
] as const;
```

- [ ] **Step 2: Remove SPEC from category-step-config.ts**

In `frontend/src/lib/category-step-config.ts`, change `ALL_STEP_KEYS`:

```typescript
export const ALL_STEP_KEYS = [
  "IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP",
  "FEATURES", "ARCHITECTURE", "BACKEND", "FRONTEND",
] as const;
```

Change `BASE_STEPS`:

```typescript
const BASE_STEPS = ["IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP", "FEATURES"] as const;
```

- [ ] **Step 3: Remove SPEC from api.ts StepType**

In `frontend/src/lib/api.ts`, change StepType:

```typescript
export type StepType = "IDEA" | "PROBLEM" | "TARGET_AUDIENCE" | "SCOPE" | "MVP" | "FEATURES" | "ARCHITECTURE" | "BACKEND" | "FRONTEND";
```

- [ ] **Step 4: Remove SPEC from step-field-labels.ts**

In `frontend/src/lib/step-field-labels.ts`, remove the SPEC entry from `STEP_FIELD_LABELS`:

```typescript
  // Remove this block:
  // SPEC: {
  //   generatedSpec: "Generierte Spec",
  // },
```

Also remove `SPEC: "Spec"` from the `stepLabel` mapping inside `formatStepFields()`.

- [ ] **Step 5: Remove SPEC from WizardForm.tsx**

In `frontend/src/components/wizard/WizardForm.tsx`:

Remove the import:
```typescript
import { SpecForm } from "./steps/SpecForm";
```

Remove from FORM_MAP:
```typescript
  SPEC: SpecForm,
```

- [ ] **Step 6: Remove SPEC from editor.ts**

In `frontend/src/components/spec-flow/editor.ts`, change the `STEPS` array (lines 25-32) to remove the SPEC entry:

```typescript
const STEPS: { type: StepType; label: string }[] = [
  { type: "IDEA", label: "Idee" },
  { type: "PROBLEM", label: "Problem" },
  { type: "TARGET_AUDIENCE", label: "Zielgruppe" },
  { type: "SCOPE", label: "Scope" },
  { type: "MVP", label: "MVP" },
];
```

- [ ] **Step 7: Delete SpecForm.tsx**

```bash
rm frontend/src/components/wizard/steps/SpecForm.tsx
```

- [ ] **Step 8: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add -A frontend/src/lib/stores/wizard-store.ts frontend/src/lib/category-step-config.ts frontend/src/lib/api.ts frontend/src/lib/step-field-labels.ts frontend/src/components/wizard/WizardForm.tsx frontend/src/components/spec-flow/editor.ts
git rm frontend/src/components/wizard/steps/SpecForm.tsx
git commit -m "feat: remove SPEC step from wizard, delete SpecForm.tsx"
```

---

### Task 5: Full build verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run all backend tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -15`
Expected: All pass

- [ ] **Step 2: Run frontend TypeScript check**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Run frontend build**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Manual verification checklist**

1. Open wizard — no SPEC step visible (9 steps for SaaS, not 10)
2. Steps numbered correctly (MVP = 5, Features = 6, etc.)
3. Category "Library" shows 6 steps (not 7)
4. Complete all steps to the last one, click "Abschliessen"
5. Agent generates spec summary in chat
6. `spec.md` is saved in project files
7. Export ZIP contains `SPEC.md` with auto-generated content

# Feature 13: Wizard-Chat Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user completes a wizard step (clicks "Weiter"), the form data is sent as a readable message to the chat and to a new backend endpoint. The agent processes the data, responds in the chat, and the wizard advances to the next step. On the last step, the scaffold export is triggered.

**Architecture:** Two-layer change. Backend: new `WizardStepCompleteRequest/Response` models, new `WizardChatController` endpoint, extended `SpecContextBuilder` with wizard context, new `processWizardStep()` method in `IdeaToSpecAgent`. Frontend: new API function, `STEP_FIELD_LABELS` for human-readable formatting, updated `wizard-store.completeStep()` to post to chat and call the new endpoint, updated `WizardForm` with loading state.

**Tech Stack:** Kotlin + Spring Boot (backend), React 19 + Next.js 16 + Zustand 5 (frontend)

---

## File Structure

**Backend — Create:**
- `backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt` — Request/Response data classes
- `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt` — New REST endpoint
- `backend/src/test/kotlin/com/agentwork/productspecagent/api/WizardChatControllerTest.kt` — Integration tests

**Backend — Modify:**
- `backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt` — Add `buildWizardContext()`
- `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt` — Add `processWizardStep()`

**Frontend — Create:**
- `frontend/src/lib/step-field-labels.ts` — Human-readable labels per step/field

**Frontend — Modify:**
- `frontend/src/lib/api.ts` — Add `WizardStepCompleteRequest/Response` types and `completeWizardStep()` function
- `frontend/src/lib/stores/wizard-store.ts` — Extend `completeStep()` with chat + endpoint integration
- `frontend/src/components/wizard/WizardForm.tsx` — Add loading state, disable button during agent call

---

### Task 1: Backend — Request/Response models

**Files:**
- Create: `backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt`

- [ ] **Step 1: Create the data classes**

```kotlin
// backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt
package com.agentwork.productspecagent.domain

data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>
)

data class WizardStepCompleteResponse(
    val message: String,
    val nextStep: String?,
    val exportTriggered: Boolean = false
)
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew compileKotlin 2>&1 | tail -5`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt
git commit -m "feat: add WizardStepCompleteRequest/Response models"
```

---

### Task 2: Backend — Extend SpecContextBuilder with wizard context

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilderWizardTest.kt`:

```kotlin
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.WizardData
import com.agentwork.productspecagent.domain.WizardStepData
import kotlinx.serialization.json.JsonPrimitive
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest
class SpecContextBuilderWizardTest {

    @Autowired
    lateinit var contextBuilder: SpecContextBuilder

    @Test
    fun `buildWizardContext includes current step fields`() {
        val fields = mapOf(
            "productName" to "MeinTool",
            "vision" to "Ein SaaS fuer PM",
            "category" to "SaaS"
        )
        val context = contextBuilder.buildWizardContext(
            wizardData = WizardData(
                projectId = "test",
                steps = mapOf(
                    "IDEA" to WizardStepData(
                        fields = fields.mapValues { JsonPrimitive(it.value) },
                        completedAt = "2026-03-31T10:00:00Z"
                    )
                )
            ),
            currentStep = "PROBLEM",
            currentFields = mapOf("coreProblem" to "Zu viel manueller Aufwand")
        )

        assertTrue(context.contains("MeinTool"))
        assertTrue(context.contains("Ein SaaS fuer PM"))
        assertTrue(context.contains("Zu viel manueller Aufwand"))
        assertTrue(context.contains("CURRENT STEP: PROBLEM"))
    }

    @Test
    fun `buildWizardContext with empty wizard data works`() {
        val context = contextBuilder.buildWizardContext(
            wizardData = WizardData(projectId = "test"),
            currentStep = "IDEA",
            currentFields = mapOf("productName" to "Test")
        )

        assertTrue(context.contains("CURRENT STEP: IDEA"))
        assertTrue(context.contains("Test"))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test --tests "*SpecContextBuilderWizardTest" 2>&1 | tail -10`
Expected: FAIL — `buildWizardContext` method does not exist yet

- [ ] **Step 3: Implement buildWizardContext**

Add this method to `SpecContextBuilder` in `backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt`:

```kotlin
    fun buildWizardContext(
        wizardData: WizardData,
        currentStep: String,
        currentFields: Map<String, Any>
    ): String {
        return buildString {
            appendLine("=== WIZARD CONTEXT ===")

            // Previous completed steps
            val completedSteps = wizardData.steps.filter { it.value.completedAt != null }
            if (completedSteps.isNotEmpty()) {
                appendLine("=== COMPLETED STEPS ===")
                for ((stepName, stepData) in completedSteps) {
                    appendLine("### $stepName")
                    for ((key, value) in stepData.fields) {
                        appendLine("$key: $value")
                    }
                    appendLine()
                }
            }

            // Current step being submitted
            appendLine("=== CURRENT STEP: $currentStep ===")
            for ((key, value) in currentFields) {
                appendLine("$key: $value")
            }
            appendLine()
            appendLine("=== END WIZARD CONTEXT ===")
        }.trim()
    }
```

You need to add the import for `WizardData` and `WizardStepData` at the top of the file:

```kotlin
import com.agentwork.productspecagent.domain.WizardData
import com.agentwork.productspecagent.domain.WizardStepData
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test --tests "*SpecContextBuilderWizardTest" 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt backend/src/test/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilderWizardTest.kt
git commit -m "feat: add buildWizardContext to SpecContextBuilder"
```

---

### Task 3: Backend — Add processWizardStep to IdeaToSpecAgent

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`

- [ ] **Step 1: Add the processWizardStep method**

Add these imports at the top of `IdeaToSpecAgent.kt`:

```kotlin
import com.agentwork.productspecagent.domain.WizardStepCompleteResponse
import com.agentwork.productspecagent.service.WizardService
```

Modify the constructor to add `WizardService`:

```kotlin
@Service
open class IdeaToSpecAgent(
    private val contextBuilder: SpecContextBuilder,
    private val projectService: ProjectService,
    @Value("\${agent.system-prompt}") private val baseSystemPrompt: String,
    private val decisionService: DecisionService,
    private val clarificationService: ClarificationService,
    private val wizardService: WizardService,
    private val koogRunner: KoogAgentRunner? = null
)
```

Add this new method after the existing `chat()` method:

```kotlin
    suspend fun processWizardStep(
        projectId: String,
        step: String,
        fields: Map<String, Any>
    ): WizardStepCompleteResponse {
        val wizardData = wizardService.getWizardData(projectId)
        val wizardContext = contextBuilder.buildWizardContext(wizardData, step, fields)

        val prompt = buildString {
            appendLine("The user just completed wizard step: $step")
            appendLine("Please provide brief, helpful feedback about their input for this step.")
            appendLine("Be encouraging and mention any suggestions for improvement if applicable.")
            appendLine()
            appendLine(wizardContext)
        }

        val systemPromptWithContext = "$baseSystemPrompt\n\n$wizardContext"

        val rawResponse = runAgent(systemPromptWithContext, prompt)
        val cleanMessage = rawResponse
            .replace("[STEP_COMPLETE]", "")
            .replace(Regex("""\[STEP_SUMMARY]:[^\n]*"""), "")
            .replace(Regex("""\[DECISION_NEEDED]:[^\n]*"""), "")
            .replace(Regex("""\[CLARIFICATION_NEEDED]:[^\n]*"""), "")
            .trim()

        // Determine next step
        val currentStepType = try { FlowStepType.valueOf(step) } catch (_: Exception) { null }
        val isLastStep = currentStepType != null && stepOrder.indexOf(currentStepType) == stepOrder.size - 1

        // For dynamic wizard: check if this is the last visible step
        // The frontend determines visibility; backend just checks if there's a next step in the full order
        val nextStepType = if (currentStepType != null && !isLastStep) {
            val idx = stepOrder.indexOf(currentStepType)
            if (idx + 1 < stepOrder.size) stepOrder[idx + 1] else null
        } else {
            null
        }

        // Update flow state
        if (currentStepType != null) {
            val flowState = projectService.getFlowState(projectId)
            val now = java.time.Instant.now().toString()
            val updatedSteps = flowState.steps.map { s ->
                when (s.stepType) {
                    currentStepType -> s.copy(status = FlowStepStatus.COMPLETED, updatedAt = now)
                    nextStepType -> s.copy(status = FlowStepStatus.IN_PROGRESS, updatedAt = now)
                    else -> s
                }
            }
            val newFlowState = flowState.copy(
                steps = updatedSteps,
                currentStep = nextStepType ?: currentStepType
            )
            projectService.updateFlowState(projectId, newFlowState)

            // Save spec file for the completed step
            val fileName = step.lowercase() + ".md"
            val title = step.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }
            val fieldsMarkdown = fields.entries.joinToString("\n") { "- **${it.key}**: ${it.value}" }
            val markdownContent = "# $title\n\n$fieldsMarkdown"
            projectService.saveSpecFile(projectId, fileName, markdownContent)
        }

        // Trigger export on last step
        val exportTriggered = isLastStep

        return WizardStepCompleteResponse(
            message = cleanMessage,
            nextStep = nextStepType?.name,
            exportTriggered = exportTriggered
        )
    }
```

Also add this import if not already present:

```kotlin
import com.agentwork.productspecagent.domain.FlowStepStatus
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew compileKotlin 2>&1 | tail -10`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: Fix the ChatControllerTest**

The test creates a test `IdeaToSpecAgent` via constructor — it needs to pass `wizardService` now. Update the `TestAgentConfig` in `backend/src/test/kotlin/com/agentwork/productspecagent/api/ChatControllerTest.kt`:

Change the test bean factory method signature to include `WizardService`:

```kotlin
        @Bean
        @Primary
        fun testAgent(
            contextBuilder: SpecContextBuilder,
            projectService: ProjectService,
            @Value("\${agent.system-prompt}") systemPrompt: String,
            decisionService: DecisionService,
            clarificationService: ClarificationService,
            wizardService: WizardService
        ): IdeaToSpecAgent {
            return object : IdeaToSpecAgent(contextBuilder, projectService, systemPrompt, decisionService, clarificationService, wizardService) {
```

Add the import at the top:

```kotlin
import com.agentwork.productspecagent.service.WizardService
```

- [ ] **Step 4: Verify existing tests still pass**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -15`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt backend/src/test/kotlin/com/agentwork/productspecagent/api/ChatControllerTest.kt
git commit -m "feat: add processWizardStep to IdeaToSpecAgent"
```

---

### Task 4: Backend — WizardChatController with tests

**Files:**
- Create: `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt`
- Create: `backend/src/test/kotlin/com/agentwork/productspecagent/api/WizardChatControllerTest.kt`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/kotlin/com/agentwork/productspecagent/api/WizardChatControllerTest.kt`:

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.agent.SpecContextBuilder
import com.agentwork.productspecagent.service.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class WizardChatControllerTest {

    @TestConfiguration
    class TestAgentConfig {
        @Bean
        @Primary
        fun testAgent(
            contextBuilder: SpecContextBuilder,
            projectService: ProjectService,
            @Value("\${agent.system-prompt}") systemPrompt: String,
            decisionService: DecisionService,
            clarificationService: ClarificationService,
            wizardService: WizardService
        ): IdeaToSpecAgent {
            return object : IdeaToSpecAgent(contextBuilder, projectService, systemPrompt, decisionService, clarificationService, wizardService) {
                override suspend fun runAgent(systemPrompt: String, userMessage: String): String {
                    return "Great idea! Let's move on to define the problem."
                }
            }
        }
    }

    @Autowired
    lateinit var mockMvc: MockMvc

    private fun createProject(name: String = "Test Project"): String {
        val result = mockMvc.perform(
            post("/api/v1/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "$name", "idea": "A great idea"}""")
        ).andExpect(status().isCreated()).andReturn()

        val body = result.response.contentAsString
        return """"id"\s*:\s*"([^"]+)"""".toRegex().find(body)!!.groupValues[1]
    }

    @Test
    fun `POST wizard-step-complete returns agent response with nextStep`() {
        val projectId = createProject()

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/wizard-step-complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"step": "IDEA", "fields": {"productName": "MeinTool", "vision": "SaaS tool", "category": "SaaS"}}""")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Great idea! Let's move on to define the problem."))
            .andExpect(jsonPath("$.nextStep").value("PROBLEM"))
            .andExpect(jsonPath("$.exportTriggered").value(false))
    }

    @Test
    fun `POST wizard-step-complete with empty step returns 400`() {
        val projectId = createProject()

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/wizard-step-complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"step": "", "fields": {}}""")
        )
            .andExpect(status().isBadRequest())
    }

    @Test
    fun `POST wizard-step-complete with FRONTEND sets exportTriggered`() {
        val projectId = createProject()

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/wizard-step-complete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"step": "FRONTEND", "fields": {"framework": "Next.js+React"}}""")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nextStep").isEmpty())
            .andExpect(jsonPath("$.exportTriggered").value(true))
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test --tests "*WizardChatControllerTest" 2>&1 | tail -10`
Expected: FAIL — endpoint does not exist yet

- [ ] **Step 3: Create the controller**

Create `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt`:

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.WizardStepCompleteRequest
import com.agentwork.productspecagent.domain.WizardStepCompleteResponse
import kotlinx.coroutines.runBlocking
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects")
class WizardChatController(
    private val ideaToSpecAgent: IdeaToSpecAgent
) {

    @PostMapping("/{id}/agent/wizard-step-complete")
    fun wizardStepComplete(
        @PathVariable id: String,
        @RequestBody request: WizardStepCompleteRequest
    ): ResponseEntity<WizardStepCompleteResponse> {
        if (request.step.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        val response = runBlocking {
            ideaToSpecAgent.processWizardStep(id, request.step, request.fields)
        }

        return ResponseEntity.ok(response)
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test --tests "*WizardChatControllerTest" 2>&1 | tail -10`
Expected: PASS

- [ ] **Step 5: Run all backend tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -15`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt backend/src/test/kotlin/com/agentwork/productspecagent/api/WizardChatControllerTest.kt
git commit -m "feat: add WizardChatController with POST /agent/wizard-step-complete endpoint"
```

---

### Task 5: Frontend — API types and function

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add types and function to api.ts**

Add the following at the end of `frontend/src/lib/api.ts`, before the closing of the file (after the `exportProject` function):

```typescript
// ─── Wizard Chat Types ───────────────────────────────────────────────────────

export interface WizardStepCompleteRequest {
  step: string;
  fields: Record<string, any>;
}

export interface WizardStepCompleteResponse {
  message: string;
  nextStep: string | null;
  exportTriggered: boolean;
}

export async function completeWizardStep(
  projectId: string,
  data: WizardStepCompleteRequest
): Promise<WizardStepCompleteResponse> {
  return apiFetch<WizardStepCompleteResponse>(
    `/api/v1/projects/${projectId}/agent/wizard-step-complete`,
    { method: "POST", body: JSON.stringify(data) }
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add completeWizardStep API function and types"
```

---

### Task 6: Frontend — STEP_FIELD_LABELS

**Files:**
- Create: `frontend/src/lib/step-field-labels.ts`

- [ ] **Step 1: Create the labels file**

```typescript
// frontend/src/lib/step-field-labels.ts

export const STEP_FIELD_LABELS: Record<string, Record<string, string>> = {
  IDEA: {
    productName: "Produktname",
    vision: "Produktidee / Vision",
    category: "Kategorie",
  },
  PROBLEM: {
    coreProblem: "Kernproblem",
    affected: "Wer ist betroffen?",
    workarounds: "Aktuelle Workarounds",
    impact: "Auswirkung (Impact)",
  },
  TARGET_AUDIENCE: {
    primaryAudience: "Primaere Zielgruppe",
    painPoints: "Pain Points",
    techLevel: "Technisches Level",
    secondaryAudience: "Sekundaere Zielgruppe",
  },
  SCOPE: {
    inScope: "In Scope",
    outOfScope: "Out of Scope",
  },
  MVP: {
    mvpGoal: "MVP-Ziel",
    mvpFeatures: "MVP Features",
    successCriteria: "Erfolgskriterien",
  },
  SPEC: {
    generatedSpec: "Generierte Spec",
  },
  FEATURES: {
    features: "Feature-Liste",
  },
  ARCHITECTURE: {
    architecture: "System-Architektur",
    database: "Datenbank",
    deployment: "Deployment",
    notes: "Architektur-Notizen",
  },
  BACKEND: {
    framework: "Sprache / Framework",
    apiStyle: "API-Stil",
    auth: "Auth-Methode",
  },
  FRONTEND: {
    framework: "Framework",
    uiLibrary: "UI Library",
    styling: "Styling",
    theme: "Theme",
  },
};

export function formatStepFields(step: string, fields: Record<string, any>): string {
  const labels = STEP_FIELD_LABELS[step] ?? {};
  const stepLabel = {
    IDEA: "Idee", PROBLEM: "Problem", TARGET_AUDIENCE: "Zielgruppe",
    SCOPE: "Scope", MVP: "MVP", SPEC: "Spec", FEATURES: "Features",
    ARCHITECTURE: "Architektur", BACKEND: "Backend", FRONTEND: "Frontend",
  }[step] ?? step;

  const lines: string[] = [`**${stepLabel}**`, ""];

  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") continue;
    const label = labels[key] ?? key;
    const display = Array.isArray(value) ? value.join(", ") : String(value);
    lines.push(`${label}: ${display}`);
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/step-field-labels.ts
git commit -m "feat: add STEP_FIELD_LABELS and formatStepFields for readable chat messages"
```

---

### Task 7: Frontend — Update wizard-store completeStep with chat integration

**Files:**
- Modify: `frontend/src/lib/stores/wizard-store.ts`

- [ ] **Step 1: Add imports and update completeStep**

Add these imports at the top of `frontend/src/lib/stores/wizard-store.ts`:

```typescript
import { getWizardData, saveWizardStep, completeWizardStep } from "@/lib/api";
import { formatStepFields } from "@/lib/step-field-labels";
import { useProjectStore } from "@/lib/stores/project-store";
```

(Replace the existing import of `getWizardData, saveWizardStep` to also include `completeWizardStep`.)

Add `chatPending` to the state interface and initial state:

In the `WizardState` interface, add:
```typescript
  chatPending: boolean;
```

In the initial state (inside `create<WizardState>`), add:
```typescript
  chatPending: false,
```

Replace the `completeStep` method with:

```typescript
  completeStep: async (projectId, step) => {
    const { data, visibleSteps } = get();
    if (!data) return;
    const stepData = data.steps[step] ?? { fields: {}, completedAt: null };
    const completed = { ...stepData, completedAt: new Date().toISOString() };

    // Save the step completion locally
    set({ saving: true });
    try {
      const result = await saveWizardStep(projectId, step, completed);
      set({ data: result, saving: false });
    } catch {
      set({ saving: false });
      return;
    }

    // Format fields as readable chat message
    const fields = stepData.fields ?? {};
    const plainFields: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      plainFields[k] = typeof v === "object" && v !== null && "value" in v
        ? (v as any).value
        : v;
    }
    const chatMessage = formatStepFields(step, plainFields);

    // Add user message to chat
    const projectStore = useProjectStore.getState();
    const userMsg = {
      id: `wizard-${Date.now()}`,
      role: "user" as const,
      content: chatMessage,
      timestamp: Date.now(),
    };
    useProjectStore.setState((s) => ({
      messages: [...s.messages, userMsg],
      chatSending: true,
    }));

    // Send to backend agent endpoint
    set({ chatPending: true });
    try {
      const response = await completeWizardStep(projectId, { step, fields: plainFields });

      // Add agent response to chat
      const agentMsg = {
        id: `wizard-agent-${Date.now()}`,
        role: "agent" as const,
        content: response.message,
        timestamp: Date.now(),
      };
      useProjectStore.setState((s) => ({
        messages: [...s.messages, agentMsg],
        chatSending: false,
      }));

      // Navigate to next step
      if (response.nextStep) {
        const steps = visibleSteps();
        const nextVisible = steps.find((s) => s.key === response.nextStep);
        if (nextVisible) {
          set({ activeStep: response.nextStep, chatPending: false });
        } else {
          // nextStep not visible in current category — stay on current
          set({ chatPending: false });
        }
      } else {
        set({ chatPending: false });
      }

      // Handle export trigger on last step
      if (response.exportTriggered) {
        const systemMsg = {
          id: `wizard-export-${Date.now()}`,
          role: "system" as const,
          content: "Export wurde gestartet. Das Projekt wird jetzt exportiert...",
          timestamp: Date.now(),
        };
        useProjectStore.setState((s) => ({
          messages: [...s.messages, systemMsg],
        }));
      }
    } catch (err) {
      const errMsg = {
        id: `wizard-err-${Date.now()}`,
        role: "system" as const,
        content: `Fehler: ${err instanceof Error ? err.message : "Agent konnte nicht antworten"}`,
        timestamp: Date.now(),
      };
      useProjectStore.setState((s) => ({
        messages: [...s.messages, errMsg],
        chatSending: false,
      }));
      set({ chatPending: false });
    }
  },
```

Also update the `reset` to include `chatPending`:

```typescript
  reset: () => set({ data: null, activeStep: "IDEA", loading: false, saving: false, chatPending: false }),
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/stores/wizard-store.ts
git commit -m "feat: wizard completeStep sends formatted data to chat and agent endpoint"
```

---

### Task 8: Frontend — Update WizardForm with loading state

**Files:**
- Modify: `frontend/src/components/wizard/WizardForm.tsx`

- [ ] **Step 1: Add chatPending to the component and disable button**

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
  const { activeStep, saving, chatPending, completeStep, goPrev, visibleSteps } = useWizardStore();

  const steps = visibleSteps();
  const stepInfo = steps.find((s) => s.key === activeStep);
  const stepIdx = steps.findIndex((s) => s.key === activeStep);
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === steps.length - 1;
  const isWorking = saving || chatPending;

  const FormComponent = FORM_MAP[activeStep];

  async function handleNext() {
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
      <div className="shrink-0 border-t px-8 py-3 flex items-center justify-between bg-card/50">
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
          <Button size="sm" onClick={handleNext} disabled={isWorking} className="gap-1.5">
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

Key changes vs previous:
- Added `chatPending` from store
- Removed `goNext` import — step navigation is now handled by `completeStep` based on agent response
- `isWorking = saving || chatPending` — disables both buttons during agent communication
- Loading text shows "Agent antwortet..." when `chatPending`, "Saving..." when just `saving`
- `handleNext()` only calls `completeStep()` — no more `goNext()` call, the store does it

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/wizard/WizardForm.tsx
git commit -m "feat: WizardForm shows loading state during agent communication, disables buttons"
```

---

### Task 9: Full build verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run full backend tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -15`
Expected: All tests pass

- [ ] **Step 2: Run frontend TypeScript check**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Run frontend build**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Manual verification checklist**

Start both backend and frontend dev servers:

1. Open a project wizard
2. Fill in Step 1 (Idee) with a product name, vision, and category
3. Click "Weiter" — observe:
   - Chat shows formatted user message with field labels
   - Loading indicator shows "Agent antwortet..."
   - Weiter/Zurueck buttons are disabled during loading
   - Agent response appears in chat
   - Wizard automatically advances to Step 2 (Problem)
4. Fill in Step 2, click "Weiter" — same flow for Problem step
5. Navigate to last visible step, click "Abschliessen" — observe:
   - Agent responds
   - `exportTriggered` message appears in chat
   - Wizard stays on last step (no navigation)
6. Test error case: stop backend, click "Weiter" — observe error message in chat, wizard stays on current step

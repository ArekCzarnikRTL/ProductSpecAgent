# Feature 1b: Koog IdeaToSpec Agent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AI-powered IdeaToSpec agent using JetBrains Koog that guides users through a structured spec creation process.

**Architecture:** IdeaToSpecAgent wraps a Koog AIAgent with project-context injection. The agent receives the current project state, converses with the user, and produces structured outputs that advance the flow. A ChatController exposes the agent via REST. Agent responses include both a user-facing message and optional flow-state mutations.

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, JetBrains Koog 0.7.3, Anthropic Claude

---

## Prerequisites

Feature 1a must be complete before starting this feature. The following types must exist:

- `Project` data class with `id: String`, `name: String`, `idea: String`, `createdAt: Instant`
- `FlowStep` enum: `IDEA`, `PROBLEM`, `TARGET_AUDIENCE`, `SCOPE`, `MVP`, `SPEC`
- `StepStatus` enum: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`
- `FlowState` data class with `projectId: String`, `steps: Map<FlowStep, StepStatus>`
- `ProjectStorage` — reads/writes projects and spec files from `spec/` directory on disk
- `ProjectService` — creates projects, reads project data, updates flow state

---

## Task 1: Update application.yml for Koog

- [ ] Update `backend/src/main/resources/application.yml` with proper Koog/Anthropic configuration
- [ ] The `ai.koog.anthropic.api-key` property activates the `anthropicExecutor` bean from the Spring Boot starter
- [ ] Add agent system prompt and model config under a custom `agent:` key
- [ ] Commit

**File:** `backend/src/main/resources/application.yml`

```yaml
server:
  port: 8080

spring:
  application:
    name: product-spec-agent

cors:
  allowed-origins: "http://localhost:3000"

ai:
  koog:
    anthropic:
      api-key: ${ANTHROPIC_API_KEY}

agent:
  model: claude-sonnet-4-6
  system-prompt: |
    You are IdeaToSpec, an expert product specification assistant. You guide product teams through a structured process to turn raw ideas into detailed specifications.

    You work through these steps in order:
    1. IDEA — The user's initial idea (already captured on project creation, you just acknowledge it)
    2. PROBLEM — Clarify the core problem being solved
    3. TARGET_AUDIENCE — Define who the product is for
    4. SCOPE — Define what is in and out of scope
    5. MVP — Define the minimum viable product
    6. SPEC — Synthesize everything into a complete specification

    At any point during the conversation you can see the current project context injected into your prompt. Use this to maintain continuity.

    When you have gathered enough information to fully complete the current step, end your response with the marker [STEP_COMPLETE] on its own line, followed by a markdown summary of the step's findings also on its own line prefixed with [STEP_SUMMARY]:

    Example:
      [STEP_COMPLETE]
      [STEP_SUMMARY]: The core problem is X. Users currently struggle with Y because Z.

    Do not emit [STEP_COMPLETE] until you are confident the step is truly done. Ask follow-up questions as needed before completing a step.
```

---

## Task 2: Chat DTOs

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt`
- [ ] `ChatRequest` — inbound message from user
- [ ] `ChatResponse` — agent reply with optional flow mutation metadata
- [ ] Commit

**File:** `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt`

```kotlin
package com.agentwork.productspecagent.domain

data class ChatRequest(
    val message: String
)

data class ChatResponse(
    val message: String,
    val flowStateChanged: Boolean,
    val currentStep: String
)
```

---

## Task 3: SpecContextBuilder

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt`
- [ ] `@Component` — injected by Spring
- [ ] `buildContext(projectId: String): String` — reads project, flow state, and all existing spec markdown files, formats them into a single prompt-friendly context block
- [ ] Reads spec files for completed steps from `spec/<projectId>/<stepName>.md` via `ProjectStorage`
- [ ] Write unit test using a temp directory as the storage root
- [ ] Commit

**File:** `backend/src/main/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilder.kt`

```kotlin
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.stereotype.Component

@Component
class SpecContextBuilder(
    private val projectService: ProjectService
) {

    /**
     * Builds a formatted context string describing the current project state.
     * This is injected into the Koog agent prompt before each user message.
     */
    fun buildContext(projectId: String): String {
        val project = projectService.getProject(projectId)
            ?: return "No project found with id: $projectId"

        val flowState = projectService.getFlowState(projectId)

        val currentStep = flowState.steps.entries
            .firstOrNull { it.value == StepStatus.IN_PROGRESS }
            ?.key
            ?: flowState.steps.entries
                .firstOrNull { it.value == StepStatus.NOT_STARTED }
                ?.key
            ?: FlowStep.SPEC

        val completedSteps = flowState.steps
            .filter { it.value == StepStatus.COMPLETED }
            .keys
            .toList()

        val stepSummaries = completedSteps.joinToString("\n\n") { step ->
            val content = projectService.readSpecFile(projectId, step.name.lowercase())
            "### ${step.name}\n$content"
        }

        return buildString {
            appendLine("=== PROJECT CONTEXT ===")
            appendLine("Project ID: ${project.id}")
            appendLine("Project Name: ${project.name}")
            appendLine("Initial Idea: ${project.idea}")
            appendLine()
            appendLine("Current Step: ${currentStep.name}")
            appendLine("Completed Steps: ${if (completedSteps.isEmpty()) "none" else completedSteps.joinToString { it.name }}")
            appendLine()
            if (stepSummaries.isNotBlank()) {
                appendLine("=== COMPLETED STEP SUMMARIES ===")
                appendLine(stepSummaries)
                appendLine()
            }
            appendLine("=== END OF PROJECT CONTEXT ===")
        }.trim()
    }
}
```

**Test file:** `backend/src/test/kotlin/com/agentwork/productspecagent/agent/SpecContextBuilderTest.kt`

```kotlin
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.FlowState
import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.Project
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.time.Instant
import kotlin.test.assertContains
import kotlin.test.assertTrue

class SpecContextBuilderTest {

    private val projectService: ProjectService = mock(ProjectService::class.java)
    private val builder = SpecContextBuilder(projectService)

    @Test
    fun `buildContext includes project name and idea`() {
        val project = Project(
            id = "proj-1",
            name = "My App",
            idea = "An app that helps people track habits",
            createdAt = Instant.now()
        )
        val flowState = FlowState(
            projectId = "proj-1",
            steps = mapOf(
                FlowStep.IDEA to StepStatus.COMPLETED,
                FlowStep.PROBLEM to StepStatus.IN_PROGRESS,
                FlowStep.TARGET_AUDIENCE to StepStatus.NOT_STARTED,
                FlowStep.SCOPE to StepStatus.NOT_STARTED,
                FlowStep.MVP to StepStatus.NOT_STARTED,
                FlowStep.SPEC to StepStatus.NOT_STARTED
            )
        )

        `when`(projectService.getProject("proj-1")).thenReturn(project)
        `when`(projectService.getFlowState("proj-1")).thenReturn(flowState)
        `when`(projectService.readSpecFile("proj-1", "idea")).thenReturn("User wants to track daily habits.")

        val context = builder.buildContext("proj-1")

        assertContains(context, "My App")
        assertContains(context, "An app that helps people track habits")
        assertContains(context, "Current Step: PROBLEM")
        assertContains(context, "IDEA")
    }

    @Test
    fun `buildContext returns error message for unknown project`() {
        `when`(projectService.getProject("unknown")).thenReturn(null)

        val context = builder.buildContext("unknown")

        assertTrue(context.contains("No project found"))
    }

    @Test
    fun `buildContext includes step summaries for completed steps`() {
        val project = Project(
            id = "proj-2",
            name = "Problem Solver",
            idea = "Automate tedious work",
            createdAt = Instant.now()
        )
        val flowState = FlowState(
            projectId = "proj-2",
            steps = mapOf(
                FlowStep.IDEA to StepStatus.COMPLETED,
                FlowStep.PROBLEM to StepStatus.COMPLETED,
                FlowStep.TARGET_AUDIENCE to StepStatus.IN_PROGRESS,
                FlowStep.SCOPE to StepStatus.NOT_STARTED,
                FlowStep.MVP to StepStatus.NOT_STARTED,
                FlowStep.SPEC to StepStatus.NOT_STARTED
            )
        )

        `when`(projectService.getProject("proj-2")).thenReturn(project)
        `when`(projectService.getFlowState("proj-2")).thenReturn(flowState)
        `when`(projectService.readSpecFile("proj-2", "idea")).thenReturn("Automate tedious work.")
        `when`(projectService.readSpecFile("proj-2", "problem")).thenReturn("Manual data entry wastes 2 hours/day.")

        val context = builder.buildContext("proj-2")

        assertContains(context, "COMPLETED STEP SUMMARIES")
        assertContains(context, "Manual data entry wastes 2 hours/day.")
        assertContains(context, "Current Step: TARGET_AUDIENCE")
    }
}
```

---

## Task 4: IdeaToSpecAgent Service

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`
- [ ] `@Service` injecting `PromptExecutor` (the `anthropicExecutor` bean from Koog starter) and `SpecContextBuilder` and `ProjectService`
- [ ] `suspend fun chat(projectId: String, userMessage: String): ChatResponse`
- [ ] Reads agent config (model name, system prompt) from `@Value`-injected properties
- [ ] Builds a fresh `AIAgent` per request with current project context included in system prompt
- [ ] Parses `[STEP_COMPLETE]` and `[STEP_SUMMARY]:` markers from agent response
- [ ] On step complete: saves `[STEP_SUMMARY]` content as markdown, advances flow state
- [ ] Returns `ChatResponse` with cleaned message (markers stripped), `flowStateChanged`, and `currentStep`
- [ ] Write integration test with mocked `PromptExecutor`
- [ ] Commit

**File:** `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`

```kotlin
package com.agentwork.productspecagent.agent

import ai.koog.agents.core.agent.AIAgent
import ai.koog.prompt.executor.model.PromptExecutor
import ai.koog.prompt.llm.anthropic.AnthropicModels
import com.agentwork.productspecagent.domain.ChatResponse
import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class IdeaToSpecAgent(
    @Qualifier("anthropicExecutor")
    private val promptExecutor: PromptExecutor,
    private val contextBuilder: SpecContextBuilder,
    private val projectService: ProjectService,
    @Value("\${agent.system-prompt}")
    private val baseSystemPrompt: String,
    @Value("\${agent.model}")
    private val modelName: String
) {

    private val stepOrder = listOf(
        FlowStep.IDEA,
        FlowStep.PROBLEM,
        FlowStep.TARGET_AUDIENCE,
        FlowStep.SCOPE,
        FlowStep.MVP,
        FlowStep.SPEC
    )

    suspend fun chat(projectId: String, userMessage: String): ChatResponse {
        val context = contextBuilder.buildContext(projectId)
        val flowState = projectService.getFlowState(projectId)

        val currentStep = flowState.steps.entries
            .firstOrNull { it.value == StepStatus.IN_PROGRESS }
            ?.key
            ?: flowState.steps.entries
                .firstOrNull { it.value == StepStatus.NOT_STARTED }
                ?.key
            ?: FlowStep.SPEC

        val systemPromptWithContext = """
            $baseSystemPrompt

            $context
        """.trimIndent()

        val agent = AIAgent(
            promptExecutor = promptExecutor,
            systemPrompt = systemPromptWithContext,
            llmModel = AnthropicModels.Sonnet_4_6
        )

        val rawResponse = agent.run(userMessage)

        val stepCompleted = rawResponse.contains("[STEP_COMPLETE]")
        val summaryMatch = Regex("""\[STEP_SUMMARY\]:\s*(.+)""", RegexOption.DOT_MATCHES_ALL)
            .find(rawResponse)
        val summaryContent = summaryMatch?.groupValues?.get(1)?.trim()

        val cleanMessage = rawResponse
            .replace(Regex("""\[STEP_COMPLETE\]\s*"""), "")
            .replace(Regex("""\[STEP_SUMMARY\]:[^\n]*\n?"""), "")
            .trim()

        var nextStep = currentStep
        var flowStateChanged = false

        if (stepCompleted) {
            val stepFileName = currentStep.name.lowercase()
            val markdownContent = buildString {
                appendLine("# ${currentStep.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }}")
                appendLine()
                appendLine(summaryContent ?: cleanMessage)
            }
            projectService.saveSpecFile(projectId, stepFileName, markdownContent)

            val updatedSteps = flowState.steps.toMutableMap()
            updatedSteps[currentStep] = StepStatus.COMPLETED

            val currentIndex = stepOrder.indexOf(currentStep)
            if (currentIndex >= 0 && currentIndex + 1 < stepOrder.size) {
                nextStep = stepOrder[currentIndex + 1]
                updatedSteps[nextStep] = StepStatus.IN_PROGRESS
            } else {
                nextStep = currentStep
            }

            projectService.updateFlowState(projectId, flowState.copy(steps = updatedSteps))
            flowStateChanged = true
        }

        return ChatResponse(
            message = cleanMessage,
            flowStateChanged = flowStateChanged,
            currentStep = nextStep.name
        )
    }
}
```

**Test file:** `backend/src/test/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgentTest.kt`

```kotlin
package com.agentwork.productspecagent.agent

import ai.koog.agents.core.agent.AIAgent
import ai.koog.prompt.executor.model.PromptExecutor
import com.agentwork.productspecagent.domain.FlowState
import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.Project
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class IdeaToSpecAgentTest {

    private val promptExecutor: PromptExecutor = mock(PromptExecutor::class.java)
    private val contextBuilder: SpecContextBuilder = mock(SpecContextBuilder::class.java)
    private val projectService: ProjectService = mock(ProjectService::class.java)

    private val systemPrompt = "You are IdeaToSpec."
    private val modelName = "claude-sonnet-4-6"

    private val agent = IdeaToSpecAgent(
        promptExecutor = promptExecutor,
        contextBuilder = contextBuilder,
        projectService = projectService,
        baseSystemPrompt = systemPrompt,
        modelName = modelName
    )

    private fun stubProjectAndFlow(projectId: String, currentStep: FlowStep) {
        val project = Project(
            id = projectId,
            name = "Test Project",
            idea = "A great idea",
            createdAt = Instant.now()
        )
        val steps = FlowStep.values().associateWith { step ->
            when {
                stepOrder.indexOf(step) < stepOrder.indexOf(currentStep) -> StepStatus.COMPLETED
                step == currentStep -> StepStatus.IN_PROGRESS
                else -> StepStatus.NOT_STARTED
            }
        }
        val flowState = FlowState(projectId = projectId, steps = steps)

        `when`(projectService.getProject(projectId)).thenReturn(project)
        `when`(projectService.getFlowState(projectId)).thenReturn(flowState)
        `when`(contextBuilder.buildContext(projectId)).thenReturn("=== PROJECT CONTEXT ===")

        // stub readSpecFile for all completed steps
        FlowStep.values()
            .filter { stepOrder.indexOf(it) < stepOrder.indexOf(currentStep) }
            .forEach { step ->
                `when`(projectService.readSpecFile(projectId, step.name.lowercase()))
                    .thenReturn("Summary for ${step.name}")
            }
    }

    private val stepOrder = listOf(
        FlowStep.IDEA,
        FlowStep.PROBLEM,
        FlowStep.TARGET_AUDIENCE,
        FlowStep.SCOPE,
        FlowStep.MVP,
        FlowStep.SPEC
    )

    @Test
    fun `chat returns plain message when agent response has no STEP_COMPLETE marker`() = runBlocking {
        stubProjectAndFlow("p1", FlowStep.PROBLEM)

        // We test the parsing logic by creating the agent with a fake executor that returns a plain response.
        // Since AIAgent.run() calls PromptExecutor internally, we mock at the AIAgent level via a subclass.
        val agentUnderTest = object : IdeaToSpecAgent(
            promptExecutor = promptExecutor,
            contextBuilder = contextBuilder,
            projectService = projectService,
            baseSystemPrompt = systemPrompt,
            modelName = modelName
        ) {
            override suspend fun runAgent(systemPromptWithContext: String, userMessage: String): String {
                return "What specific pain points does your target user experience?"
            }
        }

        val response = agentUnderTest.chat("p1", "The problem is about task management")

        assertEquals("What specific pain points does your target user experience?", response.message)
        assertFalse(response.flowStateChanged)
        assertEquals("PROBLEM", response.currentStep)
    }

    @Test
    fun `chat advances flow when agent response contains STEP_COMPLETE marker`() = runBlocking {
        stubProjectAndFlow("p1", FlowStep.PROBLEM)

        val agentUnderTest = object : IdeaToSpecAgent(
            promptExecutor = promptExecutor,
            contextBuilder = contextBuilder,
            projectService = projectService,
            baseSystemPrompt = systemPrompt,
            modelName = modelName
        ) {
            override suspend fun runAgent(systemPromptWithContext: String, userMessage: String): String {
                return "Great, I have a clear picture of the problem.\n[STEP_COMPLETE]\n[STEP_SUMMARY]: The core problem is that users lose track of tasks across tools."
            }
        }

        val response = agentUnderTest.chat("p1", "People forget their tasks because they switch tools constantly")

        assertTrue(response.flowStateChanged)
        assertEquals("TARGET_AUDIENCE", response.currentStep)
        assertFalse(response.message.contains("[STEP_COMPLETE]"))
        assertFalse(response.message.contains("[STEP_SUMMARY]"))

        val flowStateCaptor = ArgumentCaptor.forClass(FlowState::class.java)
        verify(projectService).updateFlowState(org.mockito.kotlin.eq("p1"), flowStateCaptor.capture())
        val savedFlow = flowStateCaptor.value
        assertEquals(StepStatus.COMPLETED, savedFlow.steps[FlowStep.PROBLEM])
        assertEquals(StepStatus.IN_PROGRESS, savedFlow.steps[FlowStep.TARGET_AUDIENCE])

        verify(projectService).saveSpecFile(
            org.mockito.kotlin.eq("p1"),
            org.mockito.kotlin.eq("problem"),
            org.mockito.kotlin.any()
        )
    }

    @Test
    fun `chat does not advance beyond SPEC step`() = runBlocking {
        stubProjectAndFlow("p1", FlowStep.SPEC)

        val agentUnderTest = object : IdeaToSpecAgent(
            promptExecutor = promptExecutor,
            contextBuilder = contextBuilder,
            projectService = projectService,
            baseSystemPrompt = systemPrompt,
            modelName = modelName
        ) {
            override suspend fun runAgent(systemPromptWithContext: String, userMessage: String): String {
                return "Here is your full specification.\n[STEP_COMPLETE]\n[STEP_SUMMARY]: Full spec document."
            }
        }

        val response = agentUnderTest.chat("p1", "Finalize the spec")

        assertTrue(response.flowStateChanged)
        assertEquals("SPEC", response.currentStep)
    }
}
```

**Note:** The `IdeaToSpecAgent` must expose `runAgent` as an `open` `protected` method so tests can override it without needing to mock internal Koog wiring. Update the service to extract the actual agent call:

```kotlin
// Add inside IdeaToSpecAgent class — the suspend fun chat calls this:
protected open suspend fun runAgent(systemPromptWithContext: String, userMessage: String): String {
    val agent = AIAgent(
        promptExecutor = promptExecutor,
        systemPrompt = systemPromptWithContext,
        llmModel = AnthropicModels.Sonnet_4_6
    )
    return agent.run(userMessage)
}
```

And in `chat()`, replace the direct `AIAgent` construction + `agent.run()` block with:

```kotlin
val rawResponse = runAgent(systemPromptWithContext, userMessage)
```

**Complete final version of IdeaToSpecAgent.kt with `runAgent` extracted:**

```kotlin
package com.agentwork.productspecagent.agent

import ai.koog.agents.core.agent.AIAgent
import ai.koog.prompt.executor.model.PromptExecutor
import ai.koog.prompt.llm.anthropic.AnthropicModels
import com.agentwork.productspecagent.domain.ChatResponse
import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
open class IdeaToSpecAgent(
    @Qualifier("anthropicExecutor")
    private val promptExecutor: PromptExecutor,
    private val contextBuilder: SpecContextBuilder,
    private val projectService: ProjectService,
    @Value("\${agent.system-prompt}")
    private val baseSystemPrompt: String,
    @Value("\${agent.model}")
    private val modelName: String
) {

    private val stepOrder = listOf(
        FlowStep.IDEA,
        FlowStep.PROBLEM,
        FlowStep.TARGET_AUDIENCE,
        FlowStep.SCOPE,
        FlowStep.MVP,
        FlowStep.SPEC
    )

    suspend fun chat(projectId: String, userMessage: String): ChatResponse {
        val context = contextBuilder.buildContext(projectId)
        val flowState = projectService.getFlowState(projectId)

        val currentStep = flowState.steps.entries
            .firstOrNull { it.value == StepStatus.IN_PROGRESS }
            ?.key
            ?: flowState.steps.entries
                .firstOrNull { it.value == StepStatus.NOT_STARTED }
                ?.key
            ?: FlowStep.SPEC

        val systemPromptWithContext = """
            $baseSystemPrompt

            $context
        """.trimIndent()

        val rawResponse = runAgent(systemPromptWithContext, userMessage)

        val stepCompleted = rawResponse.contains("[STEP_COMPLETE]")
        val summaryMatch = Regex("""\[STEP_SUMMARY\]:\s*(.+)""", RegexOption.DOT_MATCHES_ALL)
            .find(rawResponse)
        val summaryContent = summaryMatch?.groupValues?.get(1)?.trim()

        val cleanMessage = rawResponse
            .replace(Regex("""\[STEP_COMPLETE\]\s*"""), "")
            .replace(Regex("""\[STEP_SUMMARY\]:[^\n]*\n?"""), "")
            .trim()

        var nextStep = currentStep
        var flowStateChanged = false

        if (stepCompleted) {
            val stepFileName = currentStep.name.lowercase()
            val markdownContent = buildString {
                appendLine("# ${currentStep.name.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }}")
                appendLine()
                appendLine(summaryContent ?: cleanMessage)
            }
            projectService.saveSpecFile(projectId, stepFileName, markdownContent)

            val updatedSteps = flowState.steps.toMutableMap()
            updatedSteps[currentStep] = StepStatus.COMPLETED

            val currentIndex = stepOrder.indexOf(currentStep)
            if (currentIndex >= 0 && currentIndex + 1 < stepOrder.size) {
                nextStep = stepOrder[currentIndex + 1]
                updatedSteps[nextStep] = StepStatus.IN_PROGRESS
            } else {
                nextStep = currentStep
            }

            projectService.updateFlowState(projectId, flowState.copy(steps = updatedSteps))
            flowStateChanged = true
        }

        return ChatResponse(
            message = cleanMessage,
            flowStateChanged = flowStateChanged,
            currentStep = nextStep.name
        )
    }

    protected open suspend fun runAgent(systemPromptWithContext: String, userMessage: String): String {
        val agent = AIAgent(
            promptExecutor = promptExecutor,
            systemPrompt = systemPromptWithContext,
            llmModel = AnthropicModels.Sonnet_4_6
        )
        return agent.run(userMessage)
    }
}
```

---

## Task 5: ChatController (TDD)

- [ ] Write the test first: `backend/src/test/kotlin/com/agentwork/productspecagent/api/ChatControllerTest.kt`
- [ ] Then create `backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt`
- [ ] `POST /api/v1/projects/{id}/agent/chat` — accepts `ChatRequest`, returns `ChatResponse`
- [ ] The endpoint is `permitAll()` (or secured — match the project's security policy; for now permit all under `/api/v1/**`)
- [ ] Update `SecurityConfig` to allow `/api/v1/**`
- [ ] Commit

**Test file:** `backend/src/test/kotlin/com/agentwork/productspecagent/api/ChatControllerTest.kt`

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.ChatRequest
import com.agentwork.productspecagent.domain.ChatResponse
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class ChatControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var ideaToSpecAgent: IdeaToSpecAgent

    @Test
    fun `POST api v1 projects id agent chat returns 200 with agent response`() {
        runBlocking {
            `when`(ideaToSpecAgent.chat("proj-abc", "Tell me about the problem"))
                .thenReturn(
                    ChatResponse(
                        message = "What pain point does this solve?",
                        flowStateChanged = false,
                        currentStep = "PROBLEM"
                    )
                )
        }

        val requestBody = objectMapper.writeValueAsString(ChatRequest(message = "Tell me about the problem"))

        mockMvc.perform(
            post("/api/v1/projects/proj-abc/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("What pain point does this solve?"))
            .andExpect(jsonPath("$.flowStateChanged").value(false))
            .andExpect(jsonPath("$.currentStep").value("PROBLEM"))
    }

    @Test
    fun `POST api v1 projects id agent chat returns 200 when flow state changes`() {
        runBlocking {
            `when`(ideaToSpecAgent.chat("proj-xyz", "Users are small business owners"))
                .thenReturn(
                    ChatResponse(
                        message = "Excellent, the target audience is now defined. Let's talk about scope.",
                        flowStateChanged = true,
                        currentStep = "SCOPE"
                    )
                )
        }

        val requestBody = objectMapper.writeValueAsString(ChatRequest(message = "Users are small business owners"))

        mockMvc.perform(
            post("/api/v1/projects/proj-xyz/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.flowStateChanged").value(true))
            .andExpect(jsonPath("$.currentStep").value("SCOPE"))
    }

    @Test
    fun `POST api v1 projects id agent chat returns 400 when message is blank`() {
        val requestBody = objectMapper.writeValueAsString(ChatRequest(message = ""))

        mockMvc.perform(
            post("/api/v1/projects/proj-abc/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
        )
            .andExpect(status().isBadRequest())
    }
}
```

**Controller file:** `backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt`

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.ChatRequest
import com.agentwork.productspecagent.domain.ChatResponse
import kotlinx.coroutines.runBlocking
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/projects")
class ChatController(
    private val ideaToSpecAgent: IdeaToSpecAgent
) {

    @PostMapping("/{id}/agent/chat")
    fun chat(
        @PathVariable id: String,
        @RequestBody request: ChatRequest
    ): ResponseEntity<ChatResponse> {
        if (request.message.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        val response = runBlocking {
            ideaToSpecAgent.chat(id, request.message)
        }

        return ResponseEntity.ok(response)
    }
}
```

**Security update:** `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt`

```kotlin
package com.agentwork.productspecagent.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain

@Configuration
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors {}
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/health").permitAll()
                    .requestMatchers("/api/v1/**").permitAll()
                    .anyRequest().authenticated()
            }
        return http.build()
    }
}
```

---

## Task 6: End-to-End Test

- [ ] Create `backend/src/test/kotlin/com/agentwork/productspecagent/e2e/FullFlowIntegrationTest.kt`
- [ ] Tests the full flow: create project → chat with agent → verify flow advances → chat again → verify next step
- [ ] Mocks only the Koog `PromptExecutor` (or `IdeaToSpecAgent.runAgent`) — all other beans are real
- [ ] Asserts spec files are written to disk
- [ ] Commit

**Test file:** `backend/src/test/kotlin/com/agentwork/productspecagent/e2e/FullFlowIntegrationTest.kt`

```kotlin
package com.agentwork.productspecagent.e2e

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.ChatRequest
import com.agentwork.productspecagent.domain.FlowStep
import com.agentwork.productspecagent.domain.StepStatus
import com.agentwork.productspecagent.service.ProjectService
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.doAnswer
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.SpyBean
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@SpringBootTest
@AutoConfigureMockMvc
class FullFlowIntegrationTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @Autowired
    lateinit var projectService: ProjectService

    @SpyBean
    lateinit var ideaToSpecAgent: IdeaToSpecAgent

    private val createdProjectIds = mutableListOf<String>()

    @AfterEach
    fun cleanup() {
        createdProjectIds.forEach { projectService.deleteProject(it) }
        createdProjectIds.clear()
    }

    @Test
    fun `full flow - create project then chat advances from PROBLEM to TARGET_AUDIENCE`() {
        // Step 1: Create project (Feature 1a endpoint)
        val createResponse = mockMvc.perform(
            post("/api/v1/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "E2E Test Project", "idea": "An app to help teams manage their OKRs"}""")
        )
            .andExpect(status().isCreated())
            .andReturn()

        val projectJson = objectMapper.readTree(createResponse.response.contentAsString)
        val projectId = projectJson.get("id").asText()
        createdProjectIds.add(projectId)

        // Verify initial flow state: IDEA should be COMPLETED (set on creation), PROBLEM IN_PROGRESS
        val initialFlow = projectService.getFlowState(projectId)
        assertEquals(StepStatus.COMPLETED, initialFlow.steps[FlowStep.IDEA])
        assertEquals(StepStatus.IN_PROGRESS, initialFlow.steps[FlowStep.PROBLEM])

        // Step 2: First chat message — agent does NOT complete the step
        doAnswer { invocation ->
            runBlocking {
                // Return a simple follow-up question without [STEP_COMPLETE]
                "What specific challenges do OKR teams face today? Is it tracking, alignment, or something else?"
            }
        }.`when`(ideaToSpecAgent).runAgent(
            org.mockito.kotlin.any(),
            org.mockito.kotlin.eq("Teams struggle to stay aligned on quarterly goals")
        )

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ChatRequest("Teams struggle to stay aligned on quarterly goals")))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.flowStateChanged").value(false))
            .andExpect(jsonPath("$.currentStep").value("PROBLEM"))

        // Flow state should still be at PROBLEM
        val midFlow = projectService.getFlowState(projectId)
        assertEquals(StepStatus.IN_PROGRESS, midFlow.steps[FlowStep.PROBLEM])

        // Step 3: Second chat — agent completes the PROBLEM step
        doAnswer { _ ->
            runBlocking {
                "Perfect, I have a clear understanding of the problem.\n[STEP_COMPLETE]\n[STEP_SUMMARY]: Teams using OKRs lose alignment mid-quarter because there is no central, real-time view of progress across departments."
            }
        }.`when`(ideaToSpecAgent).runAgent(
            org.mockito.kotlin.any(),
            org.mockito.kotlin.eq("It's mainly alignment — people don't know if their work connects to top-level goals")
        )

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ChatRequest("It's mainly alignment — people don't know if their work connects to top-level goals")))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.flowStateChanged").value(true))
            .andExpect(jsonPath("$.currentStep").value("TARGET_AUDIENCE"))

        // Verify flow state advanced
        val advancedFlow = projectService.getFlowState(projectId)
        assertEquals(StepStatus.COMPLETED, advancedFlow.steps[FlowStep.PROBLEM])
        assertEquals(StepStatus.IN_PROGRESS, advancedFlow.steps[FlowStep.TARGET_AUDIENCE])

        // Verify spec file was written for PROBLEM step
        val problemSpecContent = projectService.readSpecFile(projectId, "problem")
        assertNotNull(problemSpecContent)
        assert(problemSpecContent.contains("alignment")) {
            "Expected spec file to contain summary content, but got: $problemSpecContent"
        }
    }

    @Test
    fun `full flow - chat with blank message returns 400`() {
        val createResponse = mockMvc.perform(
            post("/api/v1/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""{"name": "Blank Message Test", "idea": "Something"}""")
        )
            .andExpect(status().isCreated())
            .andReturn()

        val projectJson = objectMapper.readTree(createResponse.response.contentAsString)
        val projectId = projectJson.get("id").asText()
        createdProjectIds.add(projectId)

        mockMvc.perform(
            post("/api/v1/projects/$projectId/agent/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(ChatRequest("")))
        )
            .andExpect(status().isBadRequest())
    }
}
```

---

## Notes for Implementers

### Koog Import Paths
The exact import paths depend on the Koog 0.7.3 artifact layout. Verify these during implementation:
- `AIAgent` — likely `ai.koog.agents.core.agent.AIAgent`
- `PromptExecutor` — likely `ai.koog.prompt.executor.model.PromptExecutor`
- `AnthropicModels` — likely `ai.koog.prompt.llm.anthropic.AnthropicModels`

If exact names differ, check the published jar with `jar tf ~/.gradle/caches/.../koog-agents-core-0.7.3.jar | grep -i agent`.

### Spring Boot 4.0.5 Test Annotations
Use `@AutoConfigureMockMvc` from `org.springframework.boot.webmvc.test.autoconfigure` (not the old `org.springframework.boot.test.autoconfigure.web.servlet` package).

### Coroutines in Controllers
`IdeaToSpecAgent.chat()` is a `suspend fun`. The controller bridges to blocking code with `runBlocking { ... }`. If the project later adds WebFlux or Coroutine support at the controller layer, this bridge can be removed.

### `ProjectService` Required Methods (from Feature 1a)
The following methods on `ProjectService` are used by this feature and must be present after Feature 1a:
- `getProject(id: String): Project?`
- `getFlowState(id: String): FlowState`
- `updateFlowState(id: String, flowState: FlowState)`
- `saveSpecFile(projectId: String, stepName: String, content: String)`
- `readSpecFile(projectId: String, stepName: String): String`
- `deleteProject(id: String)` (for test cleanup)

### Step Completion Convention
The `[STEP_COMPLETE]` and `[STEP_SUMMARY]:` markers are part of the agent's system prompt instructions. The marker convention is simple and avoids JSON parsing of LLM output. If the LLM ignores the markers (e.g., during early conversations), no state change occurs and the user continues chatting until the agent is confident enough to emit `[STEP_COMPLETE]`.

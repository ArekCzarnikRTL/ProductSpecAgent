# Feature 2a: Guided Decisions Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement decision domain model, persistence, CRUD API, and DecisionAgent that generates structured decision options.

**Architecture:** Decision is a @Serializable data class stored as JSON in data/projects/{id}/decisions/{decision-id}.json. DecisionStorage handles file I/O. DecisionService manages business logic. DecisionController exposes REST endpoints. DecisionAgent generates options using the same pattern as IdeaToSpecAgent (open runAgent method). The IdeaToSpecAgent is extended to detect [DECISION_NEEDED] markers.

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, kotlinx-serialization

---

## Task 1: Decision Domain Models

- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/domain/Decision.kt`
- [ ] Define `DecisionStatus` enum with values `PENDING` and `RESOLVED`, annotated with `@Serializable`
- [ ] Define `DecisionOption` data class with fields: `id: String`, `label: String`, `pros: List<String>`, `cons: List<String>`, `recommended: Boolean` — annotated with `@Serializable`
- [ ] Define `Decision` data class with fields: `id: String`, `projectId: String`, `stepType: FlowStepType`, `title: String`, `options: List<DecisionOption>`, `recommendation: String`, `status: DecisionStatus`, `chosenOptionId: String?`, `rationale: String?`, `createdAt: String`, `resolvedAt: String?` — annotated with `@Serializable`
- [ ] Define `CreateDecisionRequest` data class with fields: `title: String`, `stepType: FlowStepType` — annotated with `@Serializable`
- [ ] Define `ResolveDecisionRequest` data class with fields: `chosenOptionId: String`, `rationale: String` — annotated with `@Serializable`
- [ ] Create unit test `DecisionModelsTest` that instantiates a `Decision`, verifies `status` defaults to `PENDING` and `chosenOptionId` is null, and checks `options` list is accessible
- [ ] Commit

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/domain/Decision.kt
package com.agentwork.productspecagent.domain

import kotlinx.serialization.Serializable

@Serializable
enum class DecisionStatus { PENDING, RESOLVED }

@Serializable
data class DecisionOption(
    val id: String,
    val label: String,
    val pros: List<String>,
    val cons: List<String>,
    val recommended: Boolean
)

@Serializable
data class Decision(
    val id: String,
    val projectId: String,
    val stepType: FlowStepType,
    val title: String,
    val options: List<DecisionOption>,
    val recommendation: String,
    val status: DecisionStatus = DecisionStatus.PENDING,
    val chosenOptionId: String? = null,
    val rationale: String? = null,
    val createdAt: String,
    val resolvedAt: String? = null
)

@Serializable
data class CreateDecisionRequest(
    val title: String,
    val stepType: FlowStepType
)

@Serializable
data class ResolveDecisionRequest(
    val chosenOptionId: String,
    val rationale: String
)
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/domain/DecisionModelsTest.kt
package com.agentwork.productspecagent.domain

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DecisionModelsTest {

    @Test
    fun `Decision has PENDING status by default`() {
        val decision = Decision(
            id = "d1",
            projectId = "p1",
            stepType = FlowStepType.SCOPE,
            title = "Should feature X be in MVP?",
            options = listOf(
                DecisionOption(
                    id = "opt-1",
                    label = "Include in MVP",
                    pros = listOf("Users need it early"),
                    cons = listOf("Increases dev time"),
                    recommended = true
                )
            ),
            recommendation = "Include in MVP because users need it.",
            createdAt = "2026-03-30T00:00:00Z"
        )

        assertEquals(DecisionStatus.PENDING, decision.status)
        assertNull(decision.chosenOptionId)
        assertNull(decision.rationale)
        assertNull(decision.resolvedAt)
        assertEquals(1, decision.options.size)
        assertEquals("opt-1", decision.options[0].id)
    }
}
```

---

## Task 2: DecisionStorage

- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/storage/DecisionStorage.kt`
- [ ] Annotate with `@Service`
- [ ] Inject `@Value("\${app.data-path}") private val dataPath: String`
- [ ] Inject `Json` bean (or create a local instance) for kotlinx-serialization
- [ ] Implement `saveDecision(decision: Decision)` — writes to `{dataPath}/projects/{projectId}/decisions/{id}.json`
- [ ] Implement `loadDecision(projectId: String, decisionId: String): Decision` — reads and deserializes JSON; throws `DecisionNotFoundException` if file missing
- [ ] Implement `listDecisions(projectId: String): List<Decision>` — reads all `*.json` files in the decisions directory; returns empty list if directory absent
- [ ] Implement `deleteDecision(projectId: String, decisionId: String)` — deletes the file; no-op if absent
- [ ] Create `DecisionStorageTest` using `@TempDir`, no mocks, exercising all four methods
- [ ] Commit

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/storage/DecisionStorage.kt
package com.agentwork.productspecagent.storage

import com.agentwork.productspecagent.domain.Decision
import com.agentwork.productspecagent.service.DecisionNotFoundException
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.*

@Service
class DecisionStorage(
    @Value("\${app.data-path}") private val dataPath: String
) {
    private val json = Json { ignoreUnknownKeys = true; prettyPrint = true }

    private fun decisionsDir(projectId: String): Path =
        Path.of(dataPath, "projects", projectId, "decisions")

    private fun decisionFile(projectId: String, decisionId: String): Path =
        decisionsDir(projectId).resolve("$decisionId.json")

    fun saveDecision(decision: Decision) {
        val dir = decisionsDir(decision.projectId)
        Files.createDirectories(dir)
        decisionFile(decision.projectId, decision.id).writeText(json.encodeToString(decision))
    }

    fun loadDecision(projectId: String, decisionId: String): Decision {
        val file = decisionFile(projectId, decisionId)
        if (!file.exists()) throw DecisionNotFoundException(decisionId)
        return json.decodeFromString(file.readText())
    }

    fun listDecisions(projectId: String): List<Decision> {
        val dir = decisionsDir(projectId)
        if (!dir.exists()) return emptyList()
        return dir.listDirectoryEntries("*.json")
            .map { json.decodeFromString<Decision>(it.readText()) }
            .sortedBy { it.createdAt }
    }

    fun deleteDecision(projectId: String, decisionId: String) {
        decisionFile(projectId, decisionId).deleteIfExists()
    }
}
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/storage/DecisionStorageTest.kt
package com.agentwork.productspecagent.storage

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.DecisionNotFoundException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class DecisionStorageTest {

    @TempDir
    lateinit var tempDir: Path

    private fun storage() = DecisionStorage(tempDir.toString())

    private fun sampleDecision(id: String = "d1", projectId: String = "p1") = Decision(
        id = id,
        projectId = projectId,
        stepType = FlowStepType.SCOPE,
        title = "Test decision",
        options = listOf(
            DecisionOption("opt-1", "Option A", listOf("pro1"), listOf("con1"), true),
            DecisionOption("opt-2", "Option B", listOf("pro2"), listOf("con2"), false)
        ),
        recommendation = "Choose A",
        createdAt = "2026-03-30T00:00:00Z"
    )

    @Test
    fun `saveDecision and loadDecision round-trip`() {
        val storage = storage()
        val decision = sampleDecision()
        storage.saveDecision(decision)
        val loaded = storage.loadDecision("p1", "d1")
        assertEquals(decision, loaded)
    }

    @Test
    fun `loadDecision throws DecisionNotFoundException for missing file`() {
        val storage = storage()
        assertThrows(DecisionNotFoundException::class.java) {
            storage.loadDecision("p1", "nonexistent")
        }
    }

    @Test
    fun `listDecisions returns empty list when directory absent`() {
        val storage = storage()
        assertEquals(emptyList<Decision>(), storage.listDecisions("p1"))
    }

    @Test
    fun `listDecisions returns all saved decisions`() {
        val storage = storage()
        val d1 = sampleDecision("d1").copy(createdAt = "2026-03-30T00:00:00Z")
        val d2 = sampleDecision("d2").copy(createdAt = "2026-03-30T01:00:00Z")
        storage.saveDecision(d1)
        storage.saveDecision(d2)
        val list = storage.listDecisions("p1")
        assertEquals(2, list.size)
        assertTrue(list.any { it.id == "d1" })
        assertTrue(list.any { it.id == "d2" })
    }

    @Test
    fun `deleteDecision removes file`() {
        val storage = storage()
        storage.saveDecision(sampleDecision())
        storage.deleteDecision("p1", "d1")
        assertThrows(DecisionNotFoundException::class.java) {
            storage.loadDecision("p1", "d1")
        }
    }

    @Test
    fun `deleteDecision is no-op when file absent`() {
        val storage = storage()
        assertDoesNotThrow { storage.deleteDecision("p1", "nonexistent") }
    }
}
```

---

## Task 3: DecisionAgent

- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/agent/DecisionAgent.kt`
- [ ] Annotate with `@Service`, declare as `open class` (same pattern as `IdeaToSpecAgent`)
- [ ] Constructor-inject `SpecContextBuilder` and `@Value("\${agent.system-prompt}") val systemPrompt: String`
- [ ] Declare `open fun runAgent(systemPrompt: String, userMessage: String): String` — calls the LLM (delegate to same underlying mechanism as `IdeaToSpecAgent`)
- [ ] Implement `suspend fun generateDecision(projectId: String, title: String, stepType: FlowStepType): Decision`
  - Build a user message with project context (via `SpecContextBuilder`) and the decision title/stepType
  - System prompt instructs the LLM to respond with a JSON object containing `options` (2–4 items with `id`, `label`, `pros`, `cons`, `recommended`) and `recommendation` string
  - Call `runAgent`, parse the JSON response to extract options and recommendation
  - Construct and return a `Decision` with a new UUID, `status = PENDING`, `createdAt` set to current ISO timestamp
- [ ] Create `DecisionAgentTest` with a subclass that overrides `runAgent` to return a hardcoded JSON string; assert the returned `Decision` is correctly parsed
- [ ] Commit

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/agent/DecisionAgent.kt
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.SpecContextBuilder
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Serializable
private data class AgentDecisionResponse(
    val options: List<DecisionOption>,
    val recommendation: String
)

@Service
open class DecisionAgent(
    private val specContextBuilder: SpecContextBuilder,
    @Value("\${agent.system-prompt}") val systemPrompt: String
) {
    private val json = Json { ignoreUnknownKeys = true }

    open fun runAgent(systemPrompt: String, userMessage: String): String {
        // Delegates to actual LLM — same mechanism as IdeaToSpecAgent
        throw NotImplementedError("runAgent must be implemented or overridden")
    }

    suspend fun generateDecision(projectId: String, title: String, stepType: FlowStepType): Decision {
        val context = specContextBuilder.buildContext(projectId)
        val userMessage = """
            Project context:
            $context

            A decision is needed for step ${stepType.name}:
            "$title"

            Respond ONLY with a JSON object (no markdown, no extra text) in this exact shape:
            {
              "options": [
                {
                  "id": "opt-1",
                  "label": "...",
                  "pros": ["..."],
                  "cons": ["..."],
                  "recommended": true
                }
              ],
              "recommendation": "..."
            }

            Provide 2 to 4 options. Mark exactly one as recommended: true.
        """.trimIndent()

        val raw = runAgent(systemPrompt, userMessage)
        val jsonText = extractJson(raw)
        val parsed = json.decodeFromString<AgentDecisionResponse>(jsonText)

        return Decision(
            id = UUID.randomUUID().toString(),
            projectId = projectId,
            stepType = stepType,
            title = title,
            options = parsed.options,
            recommendation = parsed.recommendation,
            status = DecisionStatus.PENDING,
            createdAt = Instant.now().toString()
        )
    }

    private fun extractJson(raw: String): String {
        val start = raw.indexOf('{')
        val end = raw.lastIndexOf('}')
        return if (start != -1 && end != -1 && end > start) raw.substring(start, end + 1) else raw.trim()
    }
}
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/agent/DecisionAgentTest.kt
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class DecisionAgentTest {

    private val fakeJson = """
        {
          "options": [
            {
              "id": "opt-1",
              "label": "Include in MVP",
              "pros": ["Users need it early", "Competitive advantage"],
              "cons": ["Increases dev time"],
              "recommended": true
            },
            {
              "id": "opt-2",
              "label": "Defer to v2",
              "pros": ["Faster MVP launch"],
              "cons": ["Users may not adopt without it"],
              "recommended": false
            }
          ],
          "recommendation": "Include in MVP because users need it early."
        }
    """.trimIndent()

    private fun fakeAgent(): DecisionAgent {
        val mockContextBuilder = object : com.agentwork.productspecagent.service.SpecContextBuilder(
            com.agentwork.productspecagent.storage.ProjectStorage("/tmp/fake")
        ) {
            override fun buildContext(projectId: String) = "Fake context for $projectId"
        }
        return object : DecisionAgent(mockContextBuilder, "system-prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String) = fakeJson
        }
    }

    @Test
    fun `generateDecision parses agent JSON response into Decision`() = runBlocking {
        val agent = fakeAgent()
        val decision = agent.generateDecision("p1", "Should feature X be in MVP?", FlowStepType.SCOPE)

        assertNotNull(decision.id)
        assertEquals("p1", decision.projectId)
        assertEquals(FlowStepType.SCOPE, decision.stepType)
        assertEquals("Should feature X be in MVP?", decision.title)
        assertEquals(DecisionStatus.PENDING, decision.status)
        assertNull(decision.chosenOptionId)
        assertNull(decision.resolvedAt)
        assertEquals(2, decision.options.size)

        val recommended = decision.options.single { it.recommended }
        assertEquals("opt-1", recommended.id)
        assertEquals("Include in MVP", recommended.label)
        assertEquals(2, recommended.pros.size)

        assertTrue(decision.recommendation.isNotBlank())
    }

    @Test
    fun `generateDecision handles JSON wrapped in extra text`() = runBlocking {
        val mockContextBuilder = object : com.agentwork.productspecagent.service.SpecContextBuilder(
            com.agentwork.productspecagent.storage.ProjectStorage("/tmp/fake")
        ) {
            override fun buildContext(projectId: String) = "context"
        }
        val agent = object : DecisionAgent(mockContextBuilder, "prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String) =
                "Here is the JSON:\n$fakeJson\nEnd of response."
        }

        val decision = agent.generateDecision("p1", "Title", FlowStepType.MVP)
        assertEquals(2, decision.options.size)
    }
}
```

---

## Task 4: DecisionService

- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/service/DecisionNotFoundException.kt` (or add to existing exceptions file) — extends `RuntimeException`
- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/service/DecisionService.kt`
- [ ] Annotate with `@Service`, constructor-inject `DecisionStorage` and `DecisionAgent`
- [ ] Implement `suspend fun createDecision(projectId: String, title: String, stepType: FlowStepType): Decision` — calls `DecisionAgent.generateDecision`, saves via `DecisionStorage`, returns the `Decision`
- [ ] Implement `suspend fun requestDecision(projectId: String, request: CreateDecisionRequest): Decision` — delegates to `createDecision`
- [ ] Implement `fun resolveDecision(projectId: String, decisionId: String, request: ResolveDecisionRequest): Decision` — loads decision, asserts status is `PENDING`, copies with `status = RESOLVED`, `chosenOptionId`, `rationale`, `resolvedAt = now`, saves and returns
- [ ] Implement `fun getDecision(projectId: String, decisionId: String): Decision` — delegates to `DecisionStorage.loadDecision`
- [ ] Implement `fun listDecisions(projectId: String): List<Decision>` — delegates to `DecisionStorage.listDecisions`
- [ ] Create `DecisionServiceTest` with `@TempDir` for real `DecisionStorage` and a fake `DecisionAgent` subclass that overrides `runAgent`; cover all five methods
- [ ] Commit

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/service/DecisionNotFoundException.kt
package com.agentwork.productspecagent.service

class DecisionNotFoundException(id: String) : RuntimeException("Decision not found: $id")
```

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/service/DecisionService.kt
package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.agent.DecisionAgent
import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.DecisionStorage
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class DecisionService(
    private val decisionStorage: DecisionStorage,
    private val decisionAgent: DecisionAgent
) {
    suspend fun createDecision(projectId: String, title: String, stepType: FlowStepType): Decision {
        val decision = decisionAgent.generateDecision(projectId, title, stepType)
        decisionStorage.saveDecision(decision)
        return decision
    }

    suspend fun requestDecision(projectId: String, request: CreateDecisionRequest): Decision =
        createDecision(projectId, request.title, request.stepType)

    fun resolveDecision(projectId: String, decisionId: String, request: ResolveDecisionRequest): Decision {
        val existing = decisionStorage.loadDecision(projectId, decisionId)
        check(existing.status == DecisionStatus.PENDING) {
            "Decision $decisionId is already resolved"
        }
        val resolved = existing.copy(
            status = DecisionStatus.RESOLVED,
            chosenOptionId = request.chosenOptionId,
            rationale = request.rationale,
            resolvedAt = Instant.now().toString()
        )
        decisionStorage.saveDecision(resolved)
        return resolved
    }

    fun getDecision(projectId: String, decisionId: String): Decision =
        decisionStorage.loadDecision(projectId, decisionId)

    fun listDecisions(projectId: String): List<Decision> =
        decisionStorage.listDecisions(projectId)
}
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/service/DecisionServiceTest.kt
package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.agent.DecisionAgent
import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.DecisionStorage
import com.agentwork.productspecagent.storage.ProjectStorage
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.util.UUID

class DecisionServiceTest {

    @TempDir
    lateinit var tempDir: Path

    private val fakeOptions = listOf(
        DecisionOption("opt-1", "Option A", listOf("pro1"), listOf("con1"), true),
        DecisionOption("opt-2", "Option B", listOf("pro2"), listOf("con2"), false)
    )

    private fun fakeAgent(dataPath: String): DecisionAgent {
        val mockContextBuilder = object : SpecContextBuilder(ProjectStorage(dataPath)) {
            override fun buildContext(projectId: String) = "context"
        }
        return object : DecisionAgent(mockContextBuilder, "prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String): String {
                return """{"options":[{"id":"opt-1","label":"Option A","pros":["pro1"],"cons":["con1"],"recommended":true},{"id":"opt-2","label":"Option B","pros":["pro2"],"cons":["con2"],"recommended":false}],"recommendation":"Choose A"}"""
            }
        }
    }

    private fun service(): DecisionService {
        val dataPath = tempDir.toString()
        val storage = DecisionStorage(dataPath)
        val agent = fakeAgent(dataPath)
        return DecisionService(storage, agent)
    }

    @Test
    fun `createDecision generates and persists decision`() = runBlocking {
        val svc = service()
        val decision = svc.createDecision("p1", "Should X be in MVP?", FlowStepType.SCOPE)
        assertNotNull(decision.id)
        assertEquals("p1", decision.projectId)
        assertEquals(DecisionStatus.PENDING, decision.status)
        assertEquals(2, decision.options.size)
    }

    @Test
    fun `requestDecision delegates to createDecision`() = runBlocking {
        val svc = service()
        val req = CreateDecisionRequest("Should Y be deferred?", FlowStepType.MVP)
        val decision = svc.requestDecision("p1", req)
        assertEquals(FlowStepType.MVP, decision.stepType)
    }

    @Test
    fun `listDecisions returns all decisions for project`() = runBlocking {
        val svc = service()
        svc.createDecision("p1", "Decision 1", FlowStepType.SCOPE)
        svc.createDecision("p1", "Decision 2", FlowStepType.MVP)
        val list = svc.listDecisions("p1")
        assertEquals(2, list.size)
    }

    @Test
    fun `getDecision returns correct decision`() = runBlocking {
        val svc = service()
        val created = svc.createDecision("p1", "My decision", FlowStepType.SCOPE)
        val fetched = svc.getDecision("p1", created.id)
        assertEquals(created.id, fetched.id)
        assertEquals("My decision", fetched.title)
    }

    @Test
    fun `resolveDecision updates status and stores chosenOptionId`() = runBlocking {
        val svc = service()
        val created = svc.createDecision("p1", "Resolve me", FlowStepType.SCOPE)
        val req = ResolveDecisionRequest("opt-1", "Because option A is better")
        val resolved = svc.resolveDecision("p1", created.id, req)
        assertEquals(DecisionStatus.RESOLVED, resolved.status)
        assertEquals("opt-1", resolved.chosenOptionId)
        assertEquals("Because option A is better", resolved.rationale)
        assertNotNull(resolved.resolvedAt)
    }

    @Test
    fun `resolveDecision throws when already resolved`() = runBlocking {
        val svc = service()
        val created = svc.createDecision("p1", "Resolve me", FlowStepType.SCOPE)
        val req = ResolveDecisionRequest("opt-1", "reason")
        svc.resolveDecision("p1", created.id, req)
        assertThrows(IllegalStateException::class.java) {
            svc.resolveDecision("p1", created.id, req)
        }
    }

    @Test
    fun `getDecision throws DecisionNotFoundException for missing id`() {
        val svc = service()
        assertThrows(DecisionNotFoundException::class.java) {
            svc.getDecision("p1", UUID.randomUUID().toString())
        }
    }
}
```

---

## Task 5: DecisionController (TDD)

- [ ] Write integration tests first in `DecisionControllerTest` using `@SpringBootTest` + `@AutoConfigureMockMvc` and a `@TestConfiguration` providing a fake `DecisionAgent`
- [ ] Create `src/main/kotlin/com/agentwork/productspecagent/api/DecisionController.kt`
- [ ] Map `GET /api/v1/projects/{id}/decisions` — returns `200` with list of `Decision` as JSON
- [ ] Map `POST /api/v1/projects/{id}/decisions` — body `CreateDecisionRequest`, returns `201` with created `Decision`
- [ ] Map `GET /api/v1/projects/{id}/decisions/{did}` — returns `200` with single `Decision`; `404` if not found
- [ ] Map `POST /api/v1/projects/{id}/decisions/{did}/resolve` — body `ResolveDecisionRequest`, returns `200` with resolved `Decision`
- [ ] Update `GlobalExceptionHandler` to handle `DecisionNotFoundException` and return `404` with `ErrorResponse`
- [ ] Verify all four endpoints return correct HTTP status codes and JSON bodies
- [ ] Commit

```kotlin
// src/main/kotlin/com/agentwork/productspecagent/api/DecisionController.kt
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.DecisionService
import kotlinx.coroutines.runBlocking
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/decisions")
class DecisionController(private val decisionService: DecisionService) {

    @GetMapping
    fun listDecisions(@PathVariable projectId: String): List<Decision> =
        decisionService.listDecisions(projectId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun requestDecision(
        @PathVariable projectId: String,
        @RequestBody request: CreateDecisionRequest
    ): Decision = runBlocking {
        decisionService.requestDecision(projectId, request)
    }

    @GetMapping("/{decisionId}")
    fun getDecision(
        @PathVariable projectId: String,
        @PathVariable decisionId: String
    ): Decision = decisionService.getDecision(projectId, decisionId)

    @PostMapping("/{decisionId}/resolve")
    fun resolveDecision(
        @PathVariable projectId: String,
        @PathVariable decisionId: String,
        @RequestBody request: ResolveDecisionRequest
    ): Decision = decisionService.resolveDecision(projectId, decisionId, request)
}
```

```kotlin
// GlobalExceptionHandler addition — add this handler to the existing class:
@ExceptionHandler(DecisionNotFoundException::class)
@ResponseStatus(HttpStatus.NOT_FOUND)
fun handleDecisionNotFound(ex: DecisionNotFoundException): ErrorResponse =
    ErrorResponse(
        error = "DECISION_NOT_FOUND",
        message = ex.message ?: "Decision not found",
        timestamp = Instant.now().toString()
    )
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/api/DecisionControllerTest.kt
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.DecisionAgent
import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.SpecContextBuilder
import com.agentwork.productspecagent.storage.ProjectStorage
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class DecisionControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @TestConfiguration
    class FakeAgentConfig {
        @Bean
        @Primary
        fun fakeDecisionAgent(): DecisionAgent {
            val fakeContextBuilder = object : SpecContextBuilder(ProjectStorage("/tmp/fake")) {
                override fun buildContext(projectId: String) = "context"
            }
            return object : DecisionAgent(fakeContextBuilder, "prompt") {
                override fun runAgent(systemPrompt: String, userMessage: String): String =
                    """{"options":[{"id":"opt-1","label":"Option A","pros":["pro1"],"cons":["con1"],"recommended":true},{"id":"opt-2","label":"Option B","pros":["pro2"],"cons":["con2"],"recommended":false}],"recommendation":"Choose A"}"""
            }
        }
    }

    @Test
    fun `GET decisions returns 200 with empty list for new project`() {
        mockMvc.perform(get("/api/v1/projects/new-project-id/decisions"))
            .andExpect(status().isOk)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$").isArray)
    }

    @Test
    fun `POST decisions returns 201 and creates decision`() {
        val body = """{"title":"Should X be in MVP?","stepType":"SCOPE"}"""
        mockMvc.perform(
            post("/api/v1/projects/p1/decisions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.title").value("Should X be in MVP?"))
            .andExpect(jsonPath("$.stepType").value("SCOPE"))
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.options").isArray)
    }

    @Test
    fun `GET single decision returns 200 after creation`() {
        val body = """{"title":"Find me later","stepType":"MVP"}"""
        val result = mockMvc.perform(
            post("/api/v1/projects/p2/decisions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isCreated)
            .andReturn()

        val responseBody = result.response.contentAsString
        val id = org.springframework.test.util.JsonPathExpectationsHelper("$.id")
            .let {
                com.jayway.jsonpath.JsonPath.read<String>(responseBody, "$.id")
            }

        mockMvc.perform(get("/api/v1/projects/p2/decisions/$id"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.title").value("Find me later"))
    }

    @Test
    fun `GET single decision returns 404 for missing id`() {
        mockMvc.perform(get("/api/v1/projects/p1/decisions/nonexistent-id"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `POST resolve returns 200 with resolved decision`() {
        val createBody = """{"title":"To be resolved","stepType":"SCOPE"}"""
        val createResult = mockMvc.perform(
            post("/api/v1/projects/p3/decisions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(createBody)
        )
            .andExpect(status().isCreated)
            .andReturn()

        val id = com.jayway.jsonpath.JsonPath.read<String>(createResult.response.contentAsString, "$.id")

        val resolveBody = """{"chosenOptionId":"opt-1","rationale":"Best choice"}"""
        mockMvc.perform(
            post("/api/v1/projects/p3/decisions/$id/resolve")
                .contentType(MediaType.APPLICATION_JSON)
                .content(resolveBody)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.status").value("RESOLVED"))
            .andExpect(jsonPath("$.chosenOptionId").value("opt-1"))
            .andExpect(jsonPath("$.rationale").value("Best choice"))
            .andExpect(jsonPath("$.resolvedAt").isNotEmpty)
    }
}
```

---

## Task 6: Extend IdeaToSpecAgent for [DECISION_NEEDED]

- [ ] Add optional `decisionId: String?` field to `ChatResponse` in `ChatModels.kt` (or wherever `ChatResponse` is defined), defaulting to `null`
- [ ] In `IdeaToSpecAgent.chat()`, after receiving the agent response string, scan for `[DECISION_NEEDED]: <title>` pattern using a regex
- [ ] When the marker is found: extract the title, call `decisionService.createDecision(projectId, title, currentStep)` via `runBlocking` or as a suspend call, include the resulting `decision.id` in `ChatResponse`
- [ ] Remove the `[DECISION_NEEDED]: ...` line from the message text returned to the user
- [ ] Inject `DecisionService` into `IdeaToSpecAgent` (constructor injection; check for circular dependency — if present, use `@Lazy`)
- [ ] Update `ChatResponse` serialization to include `decisionId` (nullable, omit if null using `@EncodeDefault` or `explicitNulls = false` in Json config)
- [ ] Write tests verifying the marker is detected, decision is created, and `decisionId` appears in the response
- [ ] Commit

```kotlin
// ChatResponse update — add decisionId field:
@Serializable
data class ChatResponse(
    val message: String,
    val flowStateChanged: Boolean,
    val currentStep: String,
    val decisionId: String? = null
)
```

```kotlin
// IdeaToSpecAgent.chat() — add detection logic after getting agentResponse:

private val decisionNeededRegex = Regex("""\[DECISION_NEEDED\]:\s*(.+)""")

// Inside chat(), after val agentResponse = runAgent(...):
val decisionMatch = decisionNeededRegex.find(agentResponse)
var triggeredDecisionId: String? = null

if (decisionMatch != null) {
    val decisionTitle = decisionMatch.groupValues[1].trim()
    val decision = runBlocking {
        decisionService.createDecision(projectId, decisionTitle, currentFlowStep)
    }
    triggeredDecisionId = decision.id
    // Strip marker from message shown to user
    cleanedResponse = agentResponse.replace(decisionMatch.value, "").trim()
}

// When constructing ChatResponse, pass decisionId = triggeredDecisionId
```

```kotlin
// src/test/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgentDecisionTest.kt
package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.FlowStepType
import com.agentwork.productspecagent.storage.DecisionStorage
import com.agentwork.productspecagent.storage.ProjectStorage
import com.agentwork.productspecagent.service.DecisionService
import com.agentwork.productspecagent.service.SpecContextBuilder
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class IdeaToSpecAgentDecisionTest {

    @TempDir
    lateinit var tempDir: Path

    private fun buildAgent(): IdeaToSpecAgent {
        val dataPath = tempDir.toString()
        val projectStorage = ProjectStorage(dataPath)
        val decisionStorage = DecisionStorage(dataPath)
        val contextBuilder = object : SpecContextBuilder(projectStorage) {
            override fun buildContext(projectId: String) = "context"
        }
        val fakeDecisionAgent = object : DecisionAgent(contextBuilder, "prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String): String =
                """{"options":[{"id":"opt-1","label":"A","pros":["p1"],"cons":["c1"],"recommended":true}],"recommendation":"Choose A"}"""
        }
        val decisionService = DecisionService(decisionStorage, fakeDecisionAgent)

        return object : IdeaToSpecAgent(contextBuilder, decisionService, "system-prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String): String =
                "Let me think about this. [DECISION_NEEDED]: Should feature X be in scope?"
        }
    }

    @Test
    fun `chat detects DECISION_NEEDED marker and returns decisionId`() {
        val agent = buildAgent()
        // Create a dummy project first so storage is consistent
        val projectStorage = ProjectStorage(tempDir.toString())
        val projectId = "test-project"

        val response = agent.chat(projectId, "Tell me about scope")

        assertNotNull(response.decisionId)
        assertFalse(response.message.contains("[DECISION_NEEDED]"))
        assertTrue(response.message.contains("Let me think about this"))
    }

    @Test
    fun `chat without DECISION_NEEDED marker returns null decisionId`() {
        val dataPath = tempDir.toString()
        val projectStorage = ProjectStorage(dataPath)
        val decisionStorage = DecisionStorage(dataPath)
        val contextBuilder = object : SpecContextBuilder(projectStorage) {
            override fun buildContext(projectId: String) = "context"
        }
        val fakeDecisionAgent = object : DecisionAgent(contextBuilder, "prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String): String =
                """{"options":[],"recommendation":""}"""
        }
        val decisionService = DecisionService(decisionStorage, fakeDecisionAgent)

        val agent = object : IdeaToSpecAgent(contextBuilder, decisionService, "system-prompt") {
            override fun runAgent(systemPrompt: String, userMessage: String): String =
                "Normal response without any special markers."
        }

        val response = agent.chat("project-id", "Hello")
        assertNull(response.decisionId)
    }
}
```

---

## Implementation Notes

- All data classes that are serialized to/from JSON must carry `@Serializable` from `kotlinx.serialization`.
- `DecisionStorage` follows the exact same file-path convention as `ProjectStorage`: `{dataPath}/projects/{projectId}/decisions/{id}.json`.
- `DecisionAgent.runAgent` is declared `open` so tests can subclass and override it without Mockito.
- `@AutoConfigureMockMvc` must be imported from `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc`.
- All controller test HTTP calls use `MockMvcRequestBuilders.get/post` — NOT Kotlin DSL.
- If `IdeaToSpecAgent` introduces a circular dependency through `DecisionService` → `DecisionAgent` → `SpecContextBuilder`, inject `DecisionService` with `@Lazy`.
- The `[DECISION_NEEDED]: <title>` marker is stripped from the message shown to the user; only `decisionId` surfaces it to the frontend.

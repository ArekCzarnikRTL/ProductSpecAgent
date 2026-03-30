# Feature 3a: Clarification Engine Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement clarification domain model, persistence, CRUD API, and ClarificationAgent that detects gaps and contradictions.

**Architecture:** Clarification is a @Serializable data class stored as JSON in data/projects/{id}/clarifications/. ClarificationStorage handles file I/O. ClarificationService manages business logic. ClarificationController exposes REST. IdeaToSpecAgent extended to detect [CLARIFICATION_NEEDED] markers.

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, kotlinx-serialization

---

## Task 1: Clarification Domain Models

Create all domain model classes for the clarification feature.

**Files to create:**
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationStatus.kt`
- `src/main/kotlin/com/agentwork/productspecagent/clarification/Clarification.kt`
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationModels.kt`
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationNotFoundException.kt`

**ClarificationStatus.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

enum class ClarificationStatus {
    OPEN,
    ANSWERED
}
```

**Clarification.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import kotlinx.serialization.Serializable

@Serializable
data class Clarification(
    val id: String,
    val projectId: String,
    val stepType: String,
    val question: String,
    val reason: String,
    val status: ClarificationStatus,
    val answer: String? = null,
    val createdAt: String,
    val answeredAt: String? = null
)
```

**ClarificationModels.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import kotlinx.serialization.Serializable

@Serializable
data class CreateClarificationRequest(
    val question: String,
    val reason: String,
    val stepType: String
)

@Serializable
data class AnswerClarificationRequest(
    val answer: String
)
```

**ClarificationNotFoundException.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

class ClarificationNotFoundException(projectId: String, clarificationId: String) :
    RuntimeException("Clarification '$clarificationId' not found in project '$projectId'")
```

---

## Task 2: ClarificationStorage

Implement file-based JSON persistence for clarifications, mirroring DecisionStorage patterns.

**Files to create:**
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationStorage.kt`
- `src/test/kotlin/com/agentwork/productspecagent/clarification/ClarificationStorageTest.kt`

**ClarificationStorage.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.springframework.stereotype.Component
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.exists

@Component
class ClarificationStorage(
    private val json: Json
) {
    private fun clarificationDir(projectId: String): Path =
        Path.of("data/projects/$projectId/clarifications")

    private fun clarificationFile(projectId: String, clarificationId: String): Path =
        clarificationDir(projectId).resolve("$clarificationId.json")

    fun save(clarification: Clarification) {
        val dir = clarificationDir(clarification.projectId)
        Files.createDirectories(dir)
        val file = clarificationFile(clarification.projectId, clarification.id)
        Files.writeString(file, json.encodeToString(clarification))
    }

    fun load(projectId: String, clarificationId: String): Clarification? {
        val file = clarificationFile(projectId, clarificationId)
        if (!file.exists()) return null
        return json.decodeFromString<Clarification>(Files.readString(file))
    }

    fun list(projectId: String): List<Clarification> {
        val dir = clarificationDir(projectId)
        if (!dir.exists()) return emptyList()
        return Files.list(dir)
            .filter { it.toString().endsWith(".json") }
            .map { json.decodeFromString<Clarification>(Files.readString(it)) }
            .sorted(Comparator.comparing(Clarification::createdAt))
            .toList()
    }

    fun delete(projectId: String, clarificationId: String): Boolean {
        val file = clarificationFile(projectId, clarificationId)
        return if (file.exists()) {
            Files.delete(file)
            true
        } else {
            false
        }
    }
}
```

**ClarificationStorageTest.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.time.Instant
import java.util.UUID

class ClarificationStorageTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun createStorage(tempDir: Path): ClarificationStorage {
        // Override data directory to use tempDir
        return object : ClarificationStorage(json) {
            override fun clarificationDir(projectId: String): Path =
                tempDir.resolve("projects/$projectId/clarifications")
        }
    }

    private fun sampleClarification(projectId: String = UUID.randomUUID().toString()) = Clarification(
        id = UUID.randomUUID().toString(),
        projectId = projectId,
        stepType = "SCOPE",
        question = "How should the system handle offline users?",
        reason = "The spec mentions both online-first and offline support, which may conflict.",
        status = ClarificationStatus.OPEN,
        answer = null,
        createdAt = Instant.now().toString(),
        answeredAt = null
    )

    @Test
    fun `save and load returns same clarification`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        val clarification = sampleClarification()

        storage.save(clarification)
        val loaded = storage.load(clarification.projectId, clarification.id)

        assertEquals(clarification, loaded)
    }

    @Test
    fun `load returns null for missing clarification`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        assertNull(storage.load("project-1", "nonexistent-id"))
    }

    @Test
    fun `list returns all clarifications for project`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        val projectId = UUID.randomUUID().toString()
        val c1 = sampleClarification(projectId)
        val c2 = sampleClarification(projectId)

        storage.save(c1)
        storage.save(c2)

        val list = storage.list(projectId)
        assertEquals(2, list.size)
        assertTrue(list.any { it.id == c1.id })
        assertTrue(list.any { it.id == c2.id })
    }

    @Test
    fun `list returns empty list for project with no clarifications`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        assertEquals(emptyList<Clarification>(), storage.list("nonexistent-project"))
    }

    @Test
    fun `delete removes clarification and returns true`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        val clarification = sampleClarification()

        storage.save(clarification)
        val deleted = storage.delete(clarification.projectId, clarification.id)

        assertTrue(deleted)
        assertNull(storage.load(clarification.projectId, clarification.id))
    }

    @Test
    fun `delete returns false for nonexistent clarification`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        assertFalse(storage.delete("project-1", "nonexistent-id"))
    }

    @Test
    fun `save updated clarification with answer`(@TempDir tempDir: Path) {
        val storage = createStorage(tempDir)
        val clarification = sampleClarification()

        storage.save(clarification)
        val answered = clarification.copy(
            status = ClarificationStatus.ANSWERED,
            answer = "We will go with online-first approach with offline read-only mode.",
            answeredAt = Instant.now().toString()
        )
        storage.save(answered)

        val loaded = storage.load(clarification.projectId, clarification.id)
        assertEquals(ClarificationStatus.ANSWERED, loaded?.status)
        assertNotNull(loaded?.answer)
        assertNotNull(loaded?.answeredAt)
    }
}
```

**Note:** ClarificationStorage needs `clarificationDir` to be open/overridable for testing. Make the method `open` (or `protected open`) in the actual implementation so tests can override it with @TempDir.

---

## Task 3: ClarificationService + ClarificationController

Wire the service layer and expose REST endpoints. Update GlobalExceptionHandler for ClarificationNotFoundException.

**Files to create:**
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationService.kt`
- `src/main/kotlin/com/agentwork/productspecagent/clarification/ClarificationController.kt`
- `src/test/kotlin/com/agentwork/productspecagent/clarification/ClarificationServiceTest.kt`
- `src/test/kotlin/com/agentwork/productspecagent/clarification/ClarificationControllerTest.kt`

**Files to modify:**
- `src/main/kotlin/com/agentwork/productspecagent/exception/GlobalExceptionHandler.kt` — add handler for ClarificationNotFoundException

**ClarificationService.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

@Service
class ClarificationService(
    private val clarificationStorage: ClarificationStorage
) {
    fun createClarification(
        projectId: String,
        question: String,
        reason: String,
        stepType: String
    ): Clarification {
        val clarification = Clarification(
            id = UUID.randomUUID().toString(),
            projectId = projectId,
            stepType = stepType,
            question = question,
            reason = reason,
            status = ClarificationStatus.OPEN,
            answer = null,
            createdAt = Instant.now().toString(),
            answeredAt = null
        )
        clarificationStorage.save(clarification)
        return clarification
    }

    fun answerClarification(projectId: String, clarificationId: String, answer: String): Clarification {
        val existing = clarificationStorage.load(projectId, clarificationId)
            ?: throw ClarificationNotFoundException(projectId, clarificationId)
        val answered = existing.copy(
            status = ClarificationStatus.ANSWERED,
            answer = answer,
            answeredAt = Instant.now().toString()
        )
        clarificationStorage.save(answered)
        return answered
    }

    fun listClarifications(projectId: String): List<Clarification> =
        clarificationStorage.list(projectId)

    fun getClarification(projectId: String, clarificationId: String): Clarification =
        clarificationStorage.load(projectId, clarificationId)
            ?: throw ClarificationNotFoundException(projectId, clarificationId)

    fun deleteClarification(projectId: String, clarificationId: String) {
        if (!clarificationStorage.delete(projectId, clarificationId)) {
            throw ClarificationNotFoundException(projectId, clarificationId)
        }
    }
}
```

**ClarificationController.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/clarifications")
class ClarificationController(
    private val clarificationService: ClarificationService
) {
    @GetMapping
    fun listClarifications(@PathVariable projectId: String): List<Clarification> =
        clarificationService.listClarifications(projectId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createClarification(
        @PathVariable projectId: String,
        @RequestBody request: CreateClarificationRequest
    ): Clarification =
        clarificationService.createClarification(
            projectId = projectId,
            question = request.question,
            reason = request.reason,
            stepType = request.stepType
        )

    @GetMapping("/{clarificationId}")
    fun getClarification(
        @PathVariable projectId: String,
        @PathVariable clarificationId: String
    ): Clarification =
        clarificationService.getClarification(projectId, clarificationId)

    @PostMapping("/{clarificationId}/answer")
    fun answerClarification(
        @PathVariable projectId: String,
        @PathVariable clarificationId: String,
        @RequestBody request: AnswerClarificationRequest
    ): Clarification =
        clarificationService.answerClarification(projectId, clarificationId, request.answer)

    @DeleteMapping("/{clarificationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteClarification(
        @PathVariable projectId: String,
        @PathVariable clarificationId: String
    ) = clarificationService.deleteClarification(projectId, clarificationId)
}
```

**GlobalExceptionHandler.kt — add this handler alongside the existing DecisionNotFoundException handler:**
```kotlin
@ExceptionHandler(ClarificationNotFoundException::class)
@ResponseStatus(HttpStatus.NOT_FOUND)
fun handleClarificationNotFound(ex: ClarificationNotFoundException): Map<String, String> =
    mapOf("error" to (ex.message ?: "Clarification not found"))
```

**ClarificationServiceTest.kt:**
```kotlin
package com.agentwork.productspecagent.clarification

import kotlinx.serialization.json.Json
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path

class ClarificationServiceTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun createService(tempDir: Path): ClarificationService {
        val storage = object : ClarificationStorage(json) {
            override fun clarificationDir(projectId: String): Path =
                tempDir.resolve("projects/$projectId/clarifications")
        }
        return ClarificationService(storage)
    }

    @Test
    fun `createClarification returns OPEN clarification with correct fields`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        val projectId = "proj-1"

        val result = service.createClarification(
            projectId = projectId,
            question = "How should the system handle offline users?",
            reason = "Spec mentions both online-first and offline support.",
            stepType = "SCOPE"
        )

        assertEquals(projectId, result.projectId)
        assertEquals("How should the system handle offline users?", result.question)
        assertEquals(ClarificationStatus.OPEN, result.status)
        assertNull(result.answer)
        assertNull(result.answeredAt)
        assertNotNull(result.id)
        assertNotNull(result.createdAt)
    }

    @Test
    fun `answerClarification updates status to ANSWERED`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        val projectId = "proj-1"

        val created = service.createClarification(
            projectId = projectId,
            question = "What is the target audience?",
            reason = "Audience not specified in the brief.",
            stepType = "USERS"
        )

        val answered = service.answerClarification(
            projectId = projectId,
            clarificationId = created.id,
            answer = "B2B enterprise customers."
        )

        assertEquals(ClarificationStatus.ANSWERED, answered.status)
        assertEquals("B2B enterprise customers.", answered.answer)
        assertNotNull(answered.answeredAt)
    }

    @Test
    fun `answerClarification throws ClarificationNotFoundException for missing id`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        assertThrows<ClarificationNotFoundException> {
            service.answerClarification("proj-1", "nonexistent", "some answer")
        }
    }

    @Test
    fun `listClarifications returns all clarifications for project`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        val projectId = "proj-list"

        service.createClarification(projectId, "Question 1", "Reason 1", "SCOPE")
        service.createClarification(projectId, "Question 2", "Reason 2", "USERS")

        val list = service.listClarifications(projectId)
        assertEquals(2, list.size)
    }

    @Test
    fun `getClarification throws for nonexistent clarification`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        assertThrows<ClarificationNotFoundException> {
            service.getClarification("proj-1", "nonexistent")
        }
    }

    @Test
    fun `deleteClarification removes clarification`(@TempDir tempDir: Path) {
        val service = createService(tempDir)
        val projectId = "proj-del"

        val created = service.createClarification(projectId, "To delete?", "Because reasons.", "SCOPE")
        service.deleteClarification(projectId, created.id)

        assertThrows<ClarificationNotFoundException> {
            service.getClarification(projectId, created.id)
        }
    }
}
```

**ClarificationControllerTest.kt** — integration test with @TestConfiguration and @Primary:
```kotlin
package com.agentwork.productspecagent.clarification

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Instant
import java.util.UUID

@WebMvcTest(ClarificationController::class)
class ClarificationControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var clarificationService: ClarificationService

    private fun sampleClarification(projectId: String = "proj-1") = Clarification(
        id = UUID.randomUUID().toString(),
        projectId = projectId,
        stepType = "SCOPE",
        question = "How should the system handle offline users?",
        reason = "Spec mentions conflicting requirements.",
        status = ClarificationStatus.OPEN,
        answer = null,
        createdAt = Instant.now().toString(),
        answeredAt = null
    )

    @Test
    fun `GET clarifications returns list`() {
        val projectId = "proj-1"
        val clarifications = listOf(sampleClarification(projectId))
        whenever(clarificationService.listClarifications(projectId)).thenReturn(clarifications)

        mockMvc.get("/api/v1/projects/$projectId/clarifications")
            .andExpect {
                status { isOk() }
                content { contentType(MediaType.APPLICATION_JSON) }
                jsonPath("$[0].question") { value("How should the system handle offline users?") }
            }
    }

    @Test
    fun `POST clarification creates and returns 201`() {
        val projectId = "proj-1"
        val request = CreateClarificationRequest(
            question = "What is the target audience?",
            reason = "Not specified in brief.",
            stepType = "USERS"
        )
        val created = sampleClarification(projectId).copy(
            question = request.question,
            reason = request.reason,
            stepType = request.stepType
        )
        whenever(clarificationService.createClarification(eq(projectId), any(), any(), any()))
            .thenReturn(created)

        mockMvc.post("/api/v1/projects/$projectId/clarifications") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.question") { value("What is the target audience?") }
        }
    }

    @Test
    fun `POST answer updates clarification`() {
        val projectId = "proj-1"
        val clarificationId = UUID.randomUUID().toString()
        val request = AnswerClarificationRequest(answer = "B2B enterprise.")
        val answered = sampleClarification(projectId).copy(
            id = clarificationId,
            status = ClarificationStatus.ANSWERED,
            answer = request.answer,
            answeredAt = Instant.now().toString()
        )
        whenever(clarificationService.answerClarification(eq(projectId), eq(clarificationId), eq(request.answer)))
            .thenReturn(answered)

        mockMvc.post("/api/v1/projects/$projectId/clarifications/$clarificationId/answer") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ANSWERED") }
            jsonPath("$.answer") { value("B2B enterprise.") }
        }
    }

    @Test
    fun `GET clarification returns 404 when not found`() {
        val projectId = "proj-1"
        val clarificationId = "nonexistent"
        whenever(clarificationService.getClarification(projectId, clarificationId))
            .thenThrow(ClarificationNotFoundException(projectId, clarificationId))

        mockMvc.get("/api/v1/projects/$projectId/clarifications/$clarificationId")
            .andExpect {
                status { isNotFound() }
            }
    }
}
```

---

## Task 4: Extend IdeaToSpecAgent for [CLARIFICATION_NEEDED]

Detect `[CLARIFICATION_NEEDED]: <question> | <reason>` markers in LLM responses, auto-create clarifications, add `clarificationId` to ChatResponse, and strip the marker from the displayed message.

**Files to modify:**
- `src/main/kotlin/com/agentwork/productspecagent/chat/ChatModels.kt` — add `clarificationId: String? = null` to ChatResponse
- `src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt` — detect and handle `[CLARIFICATION_NEEDED]` markers

**ChatModels.kt — update ChatResponse (add clarificationId field):**
```kotlin
// Existing fields remain unchanged; add:
@Serializable
data class ChatResponse(
    val message: String,
    val projectId: String? = null,
    val decisionId: String? = null,
    val clarificationId: String? = null  // ADD THIS FIELD
)
```

**IdeaToSpecAgent.kt — add clarification detection logic:**

Add the following pattern and detection in `runAgent` (or equivalent), mirroring the `[DECISION_NEEDED]` detection:

```kotlin
private val clarificationPattern = Regex("""\[CLARIFICATION_NEEDED\]:\s*(.+?)\s*\|\s*(.+)""")

// Inside runAgent, after getting the LLM response string:
fun detectAndCreateClarification(projectId: String, responseText: String): Pair<String, String?> {
    val match = clarificationPattern.find(responseText) ?: return Pair(responseText, null)

    val question = match.groupValues[1].trim()
    val reason = match.groupValues[2].trim()

    val clarification = clarificationService.createClarification(
        projectId = projectId,
        question = question,
        reason = reason,
        stepType = currentStepType  // use current agent step context
    )

    // Strip the marker from the displayed message
    val cleanedMessage = responseText.replace(match.value, "").trim()
    return Pair(cleanedMessage, clarification.id)
}
```

The `runAgent` method should call `detectAndCreateClarification` on the LLM output and populate `ChatResponse.clarificationId` with the result, matching the same pattern used for `[DECISION_NEEDED]`.

**IdeaToSpecAgentTest.kt — add tests for clarification detection:**
```kotlin
@Test
fun `detects CLARIFICATION_NEEDED marker and creates clarification`() {
    val projectId = "proj-test"
    val responseWithMarker = "Let me analyze this. [CLARIFICATION_NEEDED]: How should we handle offline users? | The spec mentions both online-first and offline support."

    // Use test agent with overridden runAgent that returns responseWithMarker
    // Verify clarificationId is set in ChatResponse
    // Verify marker is stripped from response message
    // Verify clarification is persisted with OPEN status
}

@Test
fun `response without CLARIFICATION_NEEDED marker has null clarificationId`() {
    val projectId = "proj-test"
    val normalResponse = "Here is the scope definition for your product."

    // Verify clarificationId is null in ChatResponse
}
```

---

## Task 5: Tests Verification

Ensure all tests pass before marking feature complete.

**Run all tests:**
```bash
./gradlew test
```

**Checklist:**
- [ ] ClarificationStorageTest — all CRUD operations pass with @TempDir
- [ ] ClarificationServiceTest — create, answer, list, get, delete pass; exceptions thrown correctly
- [ ] ClarificationControllerTest — REST endpoints return correct HTTP status codes and bodies
- [ ] IdeaToSpecAgentTest — marker detection tests pass; ChatResponse includes clarificationId
- [ ] No regressions in existing Decision tests
- [ ] GlobalExceptionHandler returns 404 for ClarificationNotFoundException
- [ ] `./gradlew test` exits with code 0

**If tests fail:**
1. Check that `clarificationDir` is `open` in `ClarificationStorage` so tests can override it
2. Verify `ClarificationStatus` serialization (enum name matches JSON string)
3. Ensure `GlobalExceptionHandler` imports `ClarificationNotFoundException`
4. Check that `ChatResponse.clarificationId` is optional with default null so existing tests are not broken

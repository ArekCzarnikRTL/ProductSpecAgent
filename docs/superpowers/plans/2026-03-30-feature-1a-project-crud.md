# Feature 1a: Project CRUD + Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement project create/read/delete with filesystem persistence and flow-state management.

**Architecture:** Domain models serialized as JSON to `data/projects/{id}/`. ProjectStorage service handles all file I/O. ProjectController exposes REST endpoints. FlowState tracks which step the user is on in the Idea-to-Spec process.

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, kotlinx-serialization, Jackson

---

## Task 1: Domain Models

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/domain/Project.kt`
- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt`
- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ApiModels.kt`
- [ ] Write unit tests for `createInitialFlowState`
- [ ] Commit

### `backend/src/main/kotlin/com/agentwork/productspecagent/domain/Project.kt`

```kotlin
package com.agentwork.productspecagent.domain

import kotlinx.serialization.Serializable

enum class ProjectStatus {
    DRAFT, IN_PROGRESS, COMPLETED
}

@Serializable
data class Project(
    val id: String,
    val name: String,
    val ownerId: String,
    val status: ProjectStatus,
    val createdAt: String,
    val updatedAt: String
)
```

### `backend/src/main/kotlin/com/agentwork/productspecagent/domain/FlowState.kt`

```kotlin
package com.agentwork.productspecagent.domain

import kotlinx.serialization.Serializable
import java.time.Instant

enum class FlowStepType {
    IDEA, PROBLEM, TARGET_AUDIENCE, SCOPE, MVP, SPEC
}

enum class FlowStepStatus {
    OPEN, IN_PROGRESS, COMPLETED
}

@Serializable
data class FlowStep(
    val stepType: FlowStepType,
    val status: FlowStepStatus,
    val updatedAt: String
)

@Serializable
data class FlowState(
    val projectId: String,
    val steps: List<FlowStep>,
    val currentStep: FlowStepType
)

fun createInitialFlowState(projectId: String): FlowState {
    val now = Instant.now().toString()
    val steps = FlowStepType.entries.map { stepType ->
        FlowStep(
            stepType = stepType,
            status = if (stepType == FlowStepType.IDEA) FlowStepStatus.IN_PROGRESS else FlowStepStatus.OPEN,
            updatedAt = now
        )
    }
    return FlowState(
        projectId = projectId,
        steps = steps,
        currentStep = FlowStepType.IDEA
    )
}
```

### `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ApiModels.kt`

```kotlin
package com.agentwork.productspecagent.domain

data class CreateProjectRequest(
    val name: String,
    val idea: String
)

data class ProjectResponse(
    val project: Project,
    val flowState: FlowState
)

data class ErrorResponse(
    val error: String,
    val message: String,
    val timestamp: String
)
```

### `backend/src/test/kotlin/com/agentwork/productspecagent/domain/FlowStateTest.kt`

```kotlin
package com.agentwork.productspecagent.domain

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class FlowStateTest {

    @Test
    fun `createInitialFlowState creates all 6 steps`() {
        val flowState = createInitialFlowState("test-project-id")

        assertEquals(6, flowState.steps.size)
    }

    @Test
    fun `createInitialFlowState sets IDEA step as IN_PROGRESS`() {
        val flowState = createInitialFlowState("test-project-id")

        val ideaStep = flowState.steps.find { it.stepType == FlowStepType.IDEA }
        assertNotNull(ideaStep)
        assertEquals(FlowStepStatus.IN_PROGRESS, ideaStep!!.status)
    }

    @Test
    fun `createInitialFlowState sets all other steps as OPEN`() {
        val flowState = createInitialFlowState("test-project-id")

        val nonIdeaSteps = flowState.steps.filter { it.stepType != FlowStepType.IDEA }
        assertTrue(nonIdeaSteps.all { it.status == FlowStepStatus.OPEN })
    }

    @Test
    fun `createInitialFlowState sets currentStep to IDEA`() {
        val flowState = createInitialFlowState("test-project-id")

        assertEquals(FlowStepType.IDEA, flowState.currentStep)
    }

    @Test
    fun `createInitialFlowState sets correct projectId`() {
        val projectId = "my-project-123"
        val flowState = createInitialFlowState(projectId)

        assertEquals(projectId, flowState.projectId)
    }

    @Test
    fun `createInitialFlowState steps are in correct order`() {
        val flowState = createInitialFlowState("test-project-id")

        val expectedOrder = listOf(
            FlowStepType.IDEA,
            FlowStepType.PROBLEM,
            FlowStepType.TARGET_AUDIENCE,
            FlowStepType.SCOPE,
            FlowStepType.MVP,
            FlowStepType.SPEC
        )
        assertEquals(expectedOrder, flowState.steps.map { it.stepType })
    }
}
```

---

## Task 2: ProjectStorage Service

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/storage/ProjectStorage.kt`
- [ ] Add `app.data-path: ./data` to `backend/src/main/resources/application.yml`
- [ ] Write integration tests with temp directory
- [ ] Commit

### `backend/src/main/kotlin/com/agentwork/productspecagent/storage/ProjectStorage.kt`

```kotlin
package com.agentwork.productspecagent.storage

import com.agentwork.productspecagent.domain.FlowState
import com.agentwork.productspecagent.domain.Project
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

@Service
class ProjectStorage(
    @Value("\${app.data-path}") private val dataPath: String
) {

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
    }

    private fun projectDir(projectId: String): Path =
        Paths.get(dataPath, "projects", projectId)

    private fun projectFile(projectId: String): Path =
        projectDir(projectId).resolve("project.json")

    private fun flowStateFile(projectId: String): Path =
        projectDir(projectId).resolve("flow-state.json")

    private fun specDir(projectId: String): Path =
        projectDir(projectId).resolve("spec")

    fun saveProject(project: Project) {
        val dir = projectDir(project.id)
        Files.createDirectories(dir)
        Files.writeString(projectFile(project.id), json.encodeToString(project))
    }

    fun loadProject(projectId: String): Project? {
        val file = projectFile(projectId)
        if (!Files.exists(file)) return null
        return json.decodeFromString<Project>(Files.readString(file))
    }

    fun deleteProject(projectId: String) {
        val dir = projectDir(projectId)
        if (Files.exists(dir)) {
            dir.toFile().deleteRecursively()
        }
    }

    fun listProjects(): List<Project> {
        val projectsDir = Paths.get(dataPath, "projects")
        if (!Files.exists(projectsDir)) return emptyList()
        return Files.list(projectsDir)
            .filter { Files.isDirectory(it) }
            .mapNotNull { loadProject(it.fileName.toString()) }
            .toList()
    }

    fun saveFlowState(flowState: FlowState) {
        val dir = projectDir(flowState.projectId)
        Files.createDirectories(dir)
        Files.writeString(flowStateFile(flowState.projectId), json.encodeToString(flowState))
    }

    fun loadFlowState(projectId: String): FlowState? {
        val file = flowStateFile(projectId)
        if (!Files.exists(file)) return null
        return json.decodeFromString<FlowState>(Files.readString(file))
    }

    fun saveSpecStep(projectId: String, fileName: String, content: String) {
        val dir = specDir(projectId)
        Files.createDirectories(dir)
        Files.writeString(dir.resolve(fileName), content)
    }
}
```

### `backend/src/main/resources/application.yml` (add `app.data-path`)

Add the following under the root level of `application.yml`:

```yaml
app:
  data-path: ./data
```

### `backend/src/test/kotlin/com/agentwork/productspecagent/storage/ProjectStorageTest.kt`

```kotlin
package com.agentwork.productspecagent.storage

import com.agentwork.productspecagent.domain.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import java.time.Instant

class ProjectStorageTest {

    @TempDir
    lateinit var tempDir: Path

    private lateinit var storage: ProjectStorage

    @BeforeEach
    fun setUp() {
        storage = ProjectStorage(tempDir.toString())
    }

    private fun makeProject(id: String = "proj-1") = Project(
        id = id,
        name = "Test Project",
        ownerId = "user-1",
        status = ProjectStatus.DRAFT,
        createdAt = Instant.now().toString(),
        updatedAt = Instant.now().toString()
    )

    @Test
    fun `saveProject and loadProject round-trips correctly`() {
        val project = makeProject()
        storage.saveProject(project)

        val loaded = storage.loadProject(project.id)
        assertNotNull(loaded)
        assertEquals(project.id, loaded!!.id)
        assertEquals(project.name, loaded.name)
        assertEquals(project.status, loaded.status)
    }

    @Test
    fun `loadProject returns null for non-existent project`() {
        val result = storage.loadProject("does-not-exist")
        assertNull(result)
    }

    @Test
    fun `deleteProject removes project directory`() {
        val project = makeProject()
        storage.saveProject(project)
        assertNotNull(storage.loadProject(project.id))

        storage.deleteProject(project.id)
        assertNull(storage.loadProject(project.id))
    }

    @Test
    fun `deleteProject on non-existent project does not throw`() {
        assertDoesNotThrow { storage.deleteProject("ghost-project") }
    }

    @Test
    fun `listProjects returns all saved projects`() {
        val project1 = makeProject("proj-1")
        val project2 = makeProject("proj-2")
        storage.saveProject(project1)
        storage.saveProject(project2)

        val projects = storage.listProjects()
        assertEquals(2, projects.size)
        assertTrue(projects.any { it.id == "proj-1" })
        assertTrue(projects.any { it.id == "proj-2" })
    }

    @Test
    fun `listProjects returns empty list when no projects exist`() {
        val projects = storage.listProjects()
        assertEquals(emptyList<Project>(), projects)
    }

    @Test
    fun `saveFlowState and loadFlowState round-trips correctly`() {
        val project = makeProject()
        storage.saveProject(project)
        val flowState = createInitialFlowState(project.id)
        storage.saveFlowState(flowState)

        val loaded = storage.loadFlowState(project.id)
        assertNotNull(loaded)
        assertEquals(flowState.projectId, loaded!!.projectId)
        assertEquals(flowState.currentStep, loaded.currentStep)
        assertEquals(6, loaded.steps.size)
    }

    @Test
    fun `loadFlowState returns null for non-existent project`() {
        val result = storage.loadFlowState("no-such-project")
        assertNull(result)
    }

    @Test
    fun `saveSpecStep writes file to spec directory`() {
        val project = makeProject()
        storage.saveProject(project)
        storage.saveSpecStep(project.id, "idea.md", "# My Idea\nThis is a great idea.")

        val specFile = tempDir.resolve("projects/${project.id}/spec/idea.md")
        assertTrue(specFile.toFile().exists())
        assertEquals("# My Idea\nThis is a great idea.", specFile.toFile().readText())
    }
}
```

---

## Task 3: ProjectService (Business Logic)

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/service/ProjectService.kt`
- [ ] Write unit tests with mocked ProjectStorage
- [ ] Commit

### `backend/src/main/kotlin/com/agentwork/productspecagent/service/ProjectService.kt`

```kotlin
package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.ProjectStorage
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

class ProjectNotFoundException(id: String) : RuntimeException("Project not found: $id")

@Service
class ProjectService(private val storage: ProjectStorage) {

    fun createProject(name: String, idea: String): ProjectResponse {
        val now = Instant.now().toString()
        val project = Project(
            id = UUID.randomUUID().toString(),
            name = name,
            ownerId = "anonymous",
            status = ProjectStatus.DRAFT,
            createdAt = now,
            updatedAt = now
        )
        val flowState = createInitialFlowState(project.id)

        storage.saveProject(project)
        storage.saveFlowState(flowState)
        storage.saveSpecStep(project.id, "idea.md", "# Idea\n\n$idea")

        return ProjectResponse(project = project, flowState = flowState)
    }

    fun getProject(id: String): ProjectResponse {
        val project = storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        val flowState = storage.loadFlowState(id) ?: throw ProjectNotFoundException(id)
        return ProjectResponse(project = project, flowState = flowState)
    }

    fun deleteProject(id: String) {
        storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        storage.deleteProject(id)
    }

    fun listProjects(): List<Project> = storage.listProjects()

    fun getFlowState(id: String): FlowState {
        storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        return storage.loadFlowState(id) ?: throw ProjectNotFoundException(id)
    }
}
```

### `backend/src/test/kotlin/com/agentwork/productspecagent/service/ProjectServiceTest.kt`

```kotlin
package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.ProjectStorage
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import java.time.Instant

class ProjectServiceTest {

    private lateinit var storage: ProjectStorage
    private lateinit var service: ProjectService

    @BeforeEach
    fun setUp() {
        storage = mock()
        service = ProjectService(storage)
    }

    private fun makeProject(id: String = "proj-1") = Project(
        id = id,
        name = "Test Project",
        ownerId = "anonymous",
        status = ProjectStatus.DRAFT,
        createdAt = Instant.now().toString(),
        updatedAt = Instant.now().toString()
    )

    @Test
    fun `createProject saves project, flowState, and idea file`() {
        val response = service.createProject("My Project", "A great idea")

        verify(storage).saveProject(any())
        verify(storage).saveFlowState(any())
        verify(storage).saveSpecStep(any(), eq("idea.md"), any())

        assertEquals("My Project", response.project.name)
        assertEquals(ProjectStatus.DRAFT, response.project.status)
        assertEquals(FlowStepType.IDEA, response.flowState.currentStep)
    }

    @Test
    fun `createProject sets ownerId to anonymous`() {
        val response = service.createProject("Test", "Idea")
        assertEquals("anonymous", response.project.ownerId)
    }

    @Test
    fun `getProject returns project and flowState`() {
        val project = makeProject()
        val flowState = createInitialFlowState(project.id)
        whenever(storage.loadProject(project.id)).thenReturn(project)
        whenever(storage.loadFlowState(project.id)).thenReturn(flowState)

        val response = service.getProject(project.id)

        assertEquals(project.id, response.project.id)
        assertEquals(flowState.currentStep, response.flowState.currentStep)
    }

    @Test
    fun `getProject throws ProjectNotFoundException when project not found`() {
        whenever(storage.loadProject("ghost")).thenReturn(null)

        assertThrows(ProjectNotFoundException::class.java) {
            service.getProject("ghost")
        }
    }

    @Test
    fun `deleteProject calls storage deleteProject`() {
        val project = makeProject()
        whenever(storage.loadProject(project.id)).thenReturn(project)

        service.deleteProject(project.id)

        verify(storage).deleteProject(project.id)
    }

    @Test
    fun `deleteProject throws ProjectNotFoundException when project not found`() {
        whenever(storage.loadProject("ghost")).thenReturn(null)

        assertThrows(ProjectNotFoundException::class.java) {
            service.deleteProject("ghost")
        }
    }

    @Test
    fun `listProjects delegates to storage`() {
        val projects = listOf(makeProject("p1"), makeProject("p2"))
        whenever(storage.listProjects()).thenReturn(projects)

        val result = service.listProjects()

        assertEquals(2, result.size)
        verify(storage).listProjects()
    }

    @Test
    fun `getFlowState returns flowState for existing project`() {
        val project = makeProject()
        val flowState = createInitialFlowState(project.id)
        whenever(storage.loadProject(project.id)).thenReturn(project)
        whenever(storage.loadFlowState(project.id)).thenReturn(flowState)

        val result = service.getFlowState(project.id)

        assertEquals(project.id, result.projectId)
    }

    @Test
    fun `getFlowState throws ProjectNotFoundException when project not found`() {
        whenever(storage.loadProject("ghost")).thenReturn(null)

        assertThrows(ProjectNotFoundException::class.java) {
            service.getFlowState("ghost")
        }
    }
}
```

---

## Task 4: Update SecurityConfig

- [ ] Modify `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt` to permit `/api/v1/**`
- [ ] Test that `/api/v1/projects` is accessible without auth
- [ ] Commit

### `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt` (updated)

```kotlin
package com.agentwork.productspecagent.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/health").permitAll()
                    .requestMatchers("/api/v1/**").permitAll()  // Temporary: permit all until auth is implemented
                    .anyRequest().authenticated()
            }
        return http.build()
    }
}
```

### `backend/src/test/kotlin/com/agentwork/productspecagent/config/SecurityConfigTest.kt`

```kotlin
package com.agentwork.productspecagent.config

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `GET api v1 projects is accessible without authentication`() {
        mockMvc.perform(get("/api/v1/projects"))
            .andExpect(status().isOk)
    }

    @Test
    fun `GET api health is still accessible without authentication`() {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk)
    }
}
```

> Note: The `AutoConfigureMockMvc` import is `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc` in Spring Boot 4.

---

## Task 5: ProjectController (TDD)

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/api/ProjectController.kt`
- [ ] Write integration tests with MockMvc
- [ ] Commit

### `backend/src/test/kotlin/com/agentwork/productspecagent/api/ProjectControllerTest.kt` (write tests first)

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.ProjectNotFoundException
import com.agentwork.productspecagent.service.ProjectService
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.mockito.kotlin.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.Instant

@SpringBootTest
@AutoConfigureMockMvc
class ProjectControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var objectMapper: ObjectMapper

    @MockBean
    lateinit var projectService: ProjectService

    private fun makeProject(id: String = "proj-1") = Project(
        id = id,
        name = "Test Project",
        ownerId = "anonymous",
        status = ProjectStatus.DRAFT,
        createdAt = Instant.now().toString(),
        updatedAt = Instant.now().toString()
    )

    private fun makeProjectResponse(id: String = "proj-1"): ProjectResponse {
        val project = makeProject(id)
        val flowState = createInitialFlowState(project.id)
        return ProjectResponse(project = project, flowState = flowState)
    }

    @Test
    fun `POST api v1 projects creates a new project`() {
        val request = CreateProjectRequest(name = "My Project", idea = "A great idea")
        val response = makeProjectResponse()
        whenever(projectService.createProject("My Project", "A great idea")).thenReturn(response)

        mockMvc.perform(
            post("/api/v1/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.project.name").value("Test Project"))
            .andExpect(jsonPath("$.flowState.currentStep").value("IDEA"))
    }

    @Test
    fun `GET api v1 projects returns list of projects`() {
        val projects = listOf(makeProject("p1"), makeProject("p2"))
        whenever(projectService.listProjects()).thenReturn(projects)

        mockMvc.perform(get("/api/v1/projects"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("p1"))
            .andExpect(jsonPath("$[1].id").value("p2"))
    }

    @Test
    fun `GET api v1 projects returns empty list when no projects exist`() {
        whenever(projectService.listProjects()).thenReturn(emptyList())

        mockMvc.perform(get("/api/v1/projects"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(0))
    }

    @Test
    fun `GET api v1 projects id returns project details`() {
        val response = makeProjectResponse("proj-1")
        whenever(projectService.getProject("proj-1")).thenReturn(response)

        mockMvc.perform(get("/api/v1/projects/proj-1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.project.id").value("proj-1"))
            .andExpect(jsonPath("$.flowState.projectId").value("proj-1"))
    }

    @Test
    fun `GET api v1 projects id returns 404 for non-existent project`() {
        whenever(projectService.getProject("ghost")).thenThrow(ProjectNotFoundException("ghost"))

        mockMvc.perform(get("/api/v1/projects/ghost"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `DELETE api v1 projects id deletes project`() {
        doNothing().whenever(projectService).deleteProject("proj-1")

        mockMvc.perform(delete("/api/v1/projects/proj-1"))
            .andExpect(status().isNoContent)
    }

    @Test
    fun `DELETE api v1 projects id returns 404 for non-existent project`() {
        whenever(projectService.deleteProject("ghost")).thenThrow(ProjectNotFoundException("ghost"))

        mockMvc.perform(delete("/api/v1/projects/ghost"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `GET api v1 projects id flow returns flow state`() {
        val flowState = createInitialFlowState("proj-1")
        whenever(projectService.getFlowState("proj-1")).thenReturn(flowState)

        mockMvc.perform(get("/api/v1/projects/proj-1/flow"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.projectId").value("proj-1"))
            .andExpect(jsonPath("$.currentStep").value("IDEA"))
            .andExpect(jsonPath("$.steps.length()").value(6))
    }

    @Test
    fun `GET api v1 projects id flow returns 404 for non-existent project`() {
        whenever(projectService.getFlowState("ghost")).thenThrow(ProjectNotFoundException("ghost"))

        mockMvc.perform(get("/api/v1/projects/ghost/flow"))
            .andExpect(status().isNotFound)
    }
}
```

### `backend/src/main/kotlin/com/agentwork/productspecagent/api/ProjectController.kt`

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.CreateProjectRequest
import com.agentwork.productspecagent.domain.FlowState
import com.agentwork.productspecagent.domain.Project
import com.agentwork.productspecagent.domain.ProjectResponse
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects")
class ProjectController(private val projectService: ProjectService) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createProject(@RequestBody request: CreateProjectRequest): ProjectResponse {
        return projectService.createProject(request.name, request.idea)
    }

    @GetMapping
    fun listProjects(): List<Project> {
        return projectService.listProjects()
    }

    @GetMapping("/{id}")
    fun getProject(@PathVariable id: String): ProjectResponse {
        return projectService.getProject(id)
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteProject(@PathVariable id: String) {
        projectService.deleteProject(id)
    }

    @GetMapping("/{id}/flow")
    fun getFlowState(@PathVariable id: String): FlowState {
        return projectService.getFlowState(id)
    }
}
```

---

## Task 6: Error Handling

- [ ] Create `backend/src/main/kotlin/com/agentwork/productspecagent/api/GlobalExceptionHandler.kt`
- [ ] Test 404 for non-existent project
- [ ] Commit

### `backend/src/main/kotlin/com/agentwork/productspecagent/api/GlobalExceptionHandler.kt`

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.ErrorResponse
import com.agentwork.productspecagent.service.ProjectNotFoundException
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ProjectNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleProjectNotFound(ex: ProjectNotFoundException): ErrorResponse {
        return ErrorResponse(
            error = "NOT_FOUND",
            message = ex.message ?: "Project not found",
            timestamp = Instant.now().toString()
        )
    }
}
```

### `backend/src/test/kotlin/com/agentwork/productspecagent/api/GlobalExceptionHandlerTest.kt`

```kotlin
package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.service.ProjectNotFoundException
import com.agentwork.productspecagent.service.ProjectService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
class GlobalExceptionHandlerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @MockBean
    lateinit var projectService: ProjectService

    @Test
    fun `GET non-existent project returns 404 with error body`() {
        whenever(projectService.getProject("missing-id"))
            .thenThrow(ProjectNotFoundException("missing-id"))

        mockMvc.perform(get("/api/v1/projects/missing-id"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Project not found: missing-id"))
            .andExpect(jsonPath("$.timestamp").isNotEmpty)
    }

    @Test
    fun `DELETE non-existent project returns 404 with error body`() {
        whenever(projectService.deleteProject("missing-id"))
            .thenThrow(ProjectNotFoundException("missing-id"))

        mockMvc.perform(delete("/api/v1/projects/missing-id"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Project not found: missing-id"))
            .andExpect(jsonPath("$.timestamp").isNotEmpty)
    }

    @Test
    fun `GET flow for non-existent project returns 404 with error body`() {
        whenever(projectService.getFlowState("missing-id"))
            .thenThrow(ProjectNotFoundException("missing-id"))

        mockMvc.perform(get("/api/v1/projects/missing-id/flow"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("Project not found: missing-id"))
    }
}
```

---

## Task 7: All Tests Green + Final Verification

- [ ] Run all tests
- [ ] Manual curl test of all endpoints
- [ ] Commit

### Run all tests

```bash
cd backend && ./gradlew test
```

All tests should pass. If any fail, investigate and fix before proceeding.

### Manual curl smoke tests

Start the application:

```bash
cd backend && ./gradlew bootRun
```

Then run the following curl commands:

```bash
# Create a project
curl -s -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project", "idea": "An app that helps users track their habits"}' | jq .

# List all projects
curl -s http://localhost:8080/api/v1/projects | jq .

# Get a specific project (replace PROJECT_ID with the id from create response)
PROJECT_ID="<id-from-create-response>"
curl -s http://localhost:8080/api/v1/projects/$PROJECT_ID | jq .

# Get flow state for the project
curl -s http://localhost:8080/api/v1/projects/$PROJECT_ID/flow | jq .

# Delete the project
curl -s -X DELETE http://localhost:8080/api/v1/projects/$PROJECT_ID -w "%{http_code}"

# Verify 404 on deleted project
curl -s http://localhost:8080/api/v1/projects/$PROJECT_ID | jq .
```

Expected results:
- POST returns `201 Created` with project and flowState
- GET list returns array (including newly created project)
- GET by id returns project and flowState
- GET flow returns flowState with 6 steps, currentStep = IDEA
- DELETE returns `204 No Content`
- GET after delete returns `404 Not Found` with error body

### Final commit checklist

- [ ] All 7 domain model tests pass
- [ ] All 8 storage integration tests pass
- [ ] All 9 service unit tests pass
- [ ] SecurityConfig test passes (no auth required for `/api/v1/**`)
- [ ] All 9 controller integration tests pass
- [ ] All 3 exception handler tests pass
- [ ] Manual curl smoke tests all return expected status codes
- [ ] `data/projects/` directory is created on first project creation
- [ ] `data/projects/{id}/project.json` contains correct JSON
- [ ] `data/projects/{id}/flow-state.json` contains correct JSON
- [ ] `data/projects/{id}/spec/idea.md` contains idea text

---

## File Summary

| File | Purpose |
|------|---------|
| `backend/src/main/kotlin/.../domain/Project.kt` | Project data class with status enum |
| `backend/src/main/kotlin/.../domain/FlowState.kt` | FlowState, FlowStep data classes + factory function |
| `backend/src/main/kotlin/.../domain/ApiModels.kt` | Request/Response/Error DTOs |
| `backend/src/main/kotlin/.../storage/ProjectStorage.kt` | Filesystem persistence service |
| `backend/src/main/kotlin/.../service/ProjectService.kt` | Business logic + ProjectNotFoundException |
| `backend/src/main/kotlin/.../config/SecurityConfig.kt` | Updated to permit `/api/v1/**` |
| `backend/src/main/kotlin/.../api/ProjectController.kt` | REST endpoints |
| `backend/src/main/kotlin/.../api/GlobalExceptionHandler.kt` | 404 error handling |
| `backend/src/test/kotlin/.../domain/FlowStateTest.kt` | Unit tests for createInitialFlowState |
| `backend/src/test/kotlin/.../storage/ProjectStorageTest.kt` | Integration tests with temp directory |
| `backend/src/test/kotlin/.../service/ProjectServiceTest.kt` | Unit tests with mocked storage |
| `backend/src/test/kotlin/.../config/SecurityConfigTest.kt` | Auth-free access tests |
| `backend/src/test/kotlin/.../api/ProjectControllerTest.kt` | MockMvc integration tests |
| `backend/src/test/kotlin/.../api/GlobalExceptionHandlerTest.kt` | 404 response body tests |

*Note: `...` = `com/agentwork/productspecagent`*

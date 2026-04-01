# Feature 20: Spec-to-Docs Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically regenerate project docs from spec files after each wizard step completion.

**Architecture:** Extend `ScaffoldContext` with 5 new spec content fields, wire `ScaffoldContextBuilder` into `ProjectService.generateDocsScaffold()`, trigger regeneration from `saveSpecFile()`, extend Mustache templates, add REST endpoint.

**Tech Stack:** Kotlin 2.2, Spring Boot 4, Mustache templates, JUnit 5

---

### Task 1: Extend ScaffoldContext with new spec fields

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/export/DocsScaffoldGenerator.kt:8-16`
- Modify: `backend/src/test/kotlin/com/agentwork/productspecagent/export/DocsScaffoldGeneratorTest.kt:10-25`

- [ ] **Step 1: Add 5 nullable fields to ScaffoldContext**

In `DocsScaffoldGenerator.kt`, add the new fields to the `ScaffoldContext` data class:

```kotlin
data class ScaffoldContext(
    val projectName: String,
    val features: List<FeatureContext>,
    val decisions: List<DecisionContext>,
    val scopeContent: String?,
    val mvpContent: String?,
    val techStack: String,
    val problemContent: String?,
    val targetAudienceContent: String?,
    val architectureContent: String?,
    val backendContent: String?,
    val frontendContent: String?
)
```

- [ ] **Step 2: Fix existing test — add new fields to sampleContext()**

In `DocsScaffoldGeneratorTest.kt`, update `sampleContext()` to include the new fields with `null` values:

```kotlin
private fun sampleContext() = ScaffoldContext(
    projectName = "Test App",
    features = listOf(
        FeatureContext(
            number = 1, title = "Auth", slug = "auth", filename = "01-auth.md",
            description = "Authentication system", estimate = "L", dependencies = "—",
            stories = listOf(StoryContext(1, "Login Page", "Build login form")),
            acceptanceCriteria = listOf(TaskContext("Form works", "Submits credentials")),
            tasks = listOf(TaskContext("Login Page", "Build login form"), TaskContext("Form works", "Submits credentials"))
        )
    ),
    decisions = listOf(DecisionContext("Use JWT", "JWT tokens", "Stateless auth")),
    scopeContent = "Core auth features only.",
    mvpContent = "Login + Register.",
    techStack = "Kotlin + Spring Boot",
    problemContent = null,
    targetAudienceContent = null,
    architectureContent = null,
    backendContent = null,
    frontendContent = null
)
```

- [ ] **Step 3: Run existing tests to verify nothing broke**

Run: `cd backend && ./gradlew test --tests "com.agentwork.productspecagent.export.DocsScaffoldGeneratorTest" --info`
Expected: All 6 existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/export/DocsScaffoldGenerator.kt backend/src/test/kotlin/com/agentwork/productspecagent/export/DocsScaffoldGeneratorTest.kt
git commit -m "refactor: add spec content fields to ScaffoldContext"
```

---

### Task 2: Extend Mustache templates to render new spec content

**Files:**
- Modify: `backend/src/main/resources/templates/scaffold/docs/architecture/overview.md.mustache`
- Modify: `backend/src/main/resources/templates/scaffold/docs/backend/api.md.mustache`
- Modify: `backend/src/main/resources/templates/scaffold/docs/frontend/design.md.mustache`

- [ ] **Step 1: Write test for new template content**

Add a new test in `DocsScaffoldGeneratorTest.kt` that creates a context with spec content filled in and verifies the templates render it:

```kotlin
private fun fullSpecContext() = ScaffoldContext(
    projectName = "Test App",
    features = emptyList(),
    decisions = emptyList(),
    scopeContent = "Core auth features only.",
    mvpContent = "Login + Register.",
    techStack = "Kotlin + Spring Boot",
    problemContent = "Users cannot manage credentials securely.",
    targetAudienceContent = "Enterprise developers needing SSO.",
    architectureContent = "Microservice architecture with API gateway.",
    backendContent = "REST API with Spring Boot, JWT auth.",
    frontendContent = "React SPA with shadcn/ui components."
)

@Test
fun `architecture overview includes problem and target audience`() {
    val result = generator.generate(fullSpecContext())
    val arch = result["docs/architecture/overview.md"]!!
    assertContains(arch, "Users cannot manage credentials securely.")
    assertContains(arch, "Enterprise developers needing SSO.")
    assertContains(arch, "Microservice architecture with API gateway.")
}

@Test
fun `backend api doc includes backend spec content`() {
    val result = generator.generate(fullSpecContext())
    val api = result["docs/backend/api.md"]!!
    assertContains(api, "REST API with Spring Boot, JWT auth.")
}

@Test
fun `frontend design doc includes frontend spec content`() {
    val result = generator.generate(fullSpecContext())
    val design = result["docs/frontend/design.md"]!!
    assertContains(design, "React SPA with shadcn/ui components.")
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./gradlew test --tests "com.agentwork.productspecagent.export.DocsScaffoldGeneratorTest" --info`
Expected: 3 new tests FAIL (templates don't render the new fields yet)

- [ ] **Step 3: Update overview.md.mustache**

Replace the full content of `backend/src/main/resources/templates/scaffold/docs/architecture/overview.md.mustache`:

```mustache
# Architecture Overview: {{projectName}}

{{#problemContent}}
## Problem
{{{problemContent}}}

{{/problemContent}}
{{#targetAudienceContent}}
## Zielgruppe
{{{targetAudienceContent}}}

{{/targetAudienceContent}}
## Scope
{{#scopeContent}}{{{scopeContent}}}{{/scopeContent}}
{{^scopeContent}}Noch nicht definiert.{{/scopeContent}}

## MVP
{{#mvpContent}}{{{mvpContent}}}{{/mvpContent}}
{{^mvpContent}}Noch nicht definiert.{{/mvpContent}}

## Entscheidungen

| Entscheidung | Gewaehlt | Begruendung |
|-------------|----------|-------------|
{{#decisions}}
| {{title}} | {{chosen}} | {{rationale}} |
{{/decisions}}
{{^decisions}}
Keine Entscheidungen getroffen.
{{/decisions}}

{{#architectureContent}}
## Architektur
{{{architectureContent}}}
{{/architectureContent}}
```

- [ ] **Step 4: Update api.md.mustache**

Replace the full content of `backend/src/main/resources/templates/scaffold/docs/backend/api.md.mustache`:

```mustache
# Backend API: {{projectName}}

{{#backendContent}}
{{{backendContent}}}

{{/backendContent}}
## Endpoints

{{#features}}
### {{title}}
{{#tasks}}
- {{title}}{{#description}} — {{description}}{{/description}}
{{/tasks}}

{{/features}}

## Technologie
{{techStack}}
```

- [ ] **Step 5: Update design.md.mustache**

Replace the full content of `backend/src/main/resources/templates/scaffold/docs/frontend/design.md.mustache`:

```mustache
# Frontend Design: {{projectName}}

{{#frontendContent}}
{{{frontendContent}}}

{{/frontendContent}}
## UI Komponenten

{{#features}}
### {{title}}
{{#stories}}
- {{title}}{{#description}}: {{description}}{{/description}}
{{/stories}}

{{/features}}

## Tech-Stack
{{techStack}}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && ./gradlew test --tests "com.agentwork.productspecagent.export.DocsScaffoldGeneratorTest" --info`
Expected: All 9 tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/templates/scaffold/docs/ backend/src/test/kotlin/com/agentwork/productspecagent/export/DocsScaffoldGeneratorTest.kt
git commit -m "feat: extend Mustache templates to render spec content"
```

---

### Task 3: Wire ScaffoldContextBuilder into ProjectService and add trigger

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/export/ScaffoldContextBuilder.kt:56-66`
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/service/ProjectService.kt:16-62`

- [ ] **Step 1: Extend ScaffoldContextBuilder.build() to read all spec files**

In `ScaffoldContextBuilder.kt`, add the 5 new `readSpecFile` calls and pass them to the `ScaffoldContext` constructor. Replace lines 56-66:

```kotlin
        val scopeContent = projectService.readSpecFile(projectId, "scope.md")
        val mvpContent = projectService.readSpecFile(projectId, "mvp.md")
        val problemContent = projectService.readSpecFile(projectId, "problem.md")
        val targetAudienceContent = projectService.readSpecFile(projectId, "target_audience.md")
        val architectureContent = projectService.readSpecFile(projectId, "architecture.md")
        val backendContent = projectService.readSpecFile(projectId, "backend.md")
        val frontendContent = projectService.readSpecFile(projectId, "frontend.md")

        return ScaffoldContext(
            projectName = project.name,
            features = features,
            decisions = resolvedDecisions,
            scopeContent = scopeContent,
            mvpContent = mvpContent,
            techStack = "See SPEC.md for full tech stack details.",
            problemContent = problemContent,
            targetAudienceContent = targetAudienceContent,
            architectureContent = architectureContent,
            backendContent = backendContent,
            frontendContent = frontendContent
        )
```

- [ ] **Step 2: Update ProjectService to inject ScaffoldContextBuilder and use it**

In `ProjectService.kt`, add `ScaffoldContextBuilder` as an optional constructor parameter and update `generateDocsScaffold()`:

```kotlin
@Service
class ProjectService(
    private val storage: ProjectStorage,
    private val scaffoldGenerator: DocsScaffoldGenerator? = null,
    private val scaffoldContextBuilder: ScaffoldContextBuilder? = null
) {
```

Replace `generateDocsScaffold()` (lines 48-62):

```kotlin
    private fun generateDocsScaffold(projectId: String, projectName: String) {
        val generator = scaffoldGenerator ?: return
        val context = if (scaffoldContextBuilder != null) {
            scaffoldContextBuilder.build(projectId)
        } else {
            ScaffoldContext(
                projectName = projectName,
                features = emptyList(),
                decisions = emptyList(),
                scopeContent = null,
                mvpContent = null,
                techStack = "See SPEC.md for tech stack details.",
                problemContent = null,
                targetAudienceContent = null,
                architectureContent = null,
                backendContent = null,
                frontendContent = null
            )
        }
        val entries = generator.generate(context)
        for ((path, content) in entries) {
            storage.saveDocsFile(projectId, path, content)
        }
    }
```

- [ ] **Step 3: Add regeneration trigger to saveSpecFile()**

In `ProjectService.kt`, update `saveSpecFile()` (lines 87-90) to call `regenerateDocsScaffold()`:

```kotlin
    fun saveSpecFile(projectId: String, fileName: String, content: String) {
        storage.loadProject(projectId) ?: throw ProjectNotFoundException(projectId)
        storage.saveSpecStep(projectId, fileName, content)
        regenerateDocsScaffold(projectId)
    }
```

- [ ] **Step 4: Run all tests**

Run: `cd backend && ./gradlew test --info`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/export/ScaffoldContextBuilder.kt backend/src/main/kotlin/com/agentwork/productspecagent/service/ProjectService.kt
git commit -m "feat: trigger docs regeneration on spec file save"
```

---

### Task 4: Add REST endpoint for manual docs regeneration

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/api/ProjectController.kt:37-41`

- [ ] **Step 1: Add endpoint to ProjectController**

Add the new endpoint before the closing brace of the class (after line 40):

```kotlin
    @PostMapping("/{id}/docs/regenerate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun regenerateDocs(@PathVariable id: String) {
        projectService.regenerateDocsScaffold(id)
    }
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && ./gradlew test --info`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/api/ProjectController.kt
git commit -m "feat: add POST endpoint for manual docs regeneration"
```

---

### Task 5: Update feature spec to match implementation

**Files:**
- Modify: `docs/features/20-spec-to-docs-sync.md`

- [ ] **Step 1: Update feature spec**

In `docs/features/20-spec-to-docs-sync.md`, update the "Feature-Parsing" section (lines 181-183) to reflect the actual implementation:

Replace:
```markdown
### Feature-Parsing aus `spec/features.md`

Die `features.md` wird vom Agent als strukturiertes Markdown erzeugt. Der `DocsScaffoldGenerator` parsed diese Datei, um pro Feature eine `FeatureContext`-Instanz zu erzeugen. Falls das Parsing fehlschlaegt (unstrukturierter Freitext), wird die gesamte `features.md` als einzelner Block in die Overview-Datei geschrieben.
```

With:
```markdown
### Feature-Extraktion aus Tasks

Features werden aus den bestehenden SpecTasks (EPICs) extrahiert, nicht aus `spec/features.md`. Der `ScaffoldContextBuilder` baut `FeatureContext`-Instanzen aus der Task-Hierarchie (EPIC → STORY → TASK). Dies nutzt die bereits typisierte und strukturierte Datenquelle.
```

- [ ] **Step 2: Commit**

```bash
git add docs/features/20-spec-to-docs-sync.md
git commit -m "docs: update feature 20 spec to match implementation approach"
```

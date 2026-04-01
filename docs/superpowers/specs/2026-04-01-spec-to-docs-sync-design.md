# Design: Spec-to-Docs Synchronisation (Feature 20)

## Ueberblick

Nach jedem `saveSpecFile()`-Aufruf werden die Projekt-Docs automatisch aus den aktuellen Spec-Dateien und Tasks regeneriert. Der bestehende `DocsScaffoldGenerator` + `ScaffoldContextBuilder` bleiben die zentrale Docs-Engine.

**Entscheidungen:**
- Features werden aus Tasks (EPICs) extrahiert, nicht aus `spec/features.md` — die Task-Struktur ist bereits typisiert und der `ScaffoldContextBuilder` dafuer gebaut.
- Trigger bei jedem `saveSpecFile()` — Mustache-Rendering + File-Write ist guenstig, und der User sieht im Explorer immer aktuelle Docs.
- REST-Endpoint `POST /api/v1/projects/{id}/docs/regenerate` wird hinzugefuegt fuer manuelle Regenerierung.

## Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `DocsScaffoldGenerator.kt` | `ScaffoldContext` erhaelt 5 neue nullable String-Felder |
| `ScaffoldContextBuilder.kt` | `build()` liest zusaetzliche Spec-Dateien |
| `ProjectService.kt` | `saveSpecFile()` ruft `regenerateDocsScaffold()` auf; `generateDocsScaffold()` nutzt `ScaffoldContextBuilder` |
| `ProjectController.kt` | Neuer Endpoint `POST /{id}/docs/regenerate` |
| `overview.md.mustache` | Neue Abschnitte: Problem, Zielgruppe, Architektur |
| `api.md.mustache` | Backend-Spec-Inhalt einfliessen lassen |
| `design.md.mustache` | Frontend-Spec-Inhalt einfliessen lassen |
| `DocsScaffoldGeneratorTest.kt` | Tests fuer neue Context-Felder |

## Datenfluss

```
IdeaToSpecAgent --> ProjectService.saveSpecFile()
                      |-- storage.saveSpecStep()          (Spec auf Disk)
                      +-- regenerateDocsScaffold()
                            |-- ScaffoldContextBuilder.build()
                            |     |-- storage.loadSpecStep()  (alle Spec-Dateien)
                            |     |-- taskService.listTasks() (Features aus EPICs)
                            |     +-- decisionService.listDecisions()
                            |-- DocsScaffoldGenerator.generate()  (Mustache rendern)
                            +-- storage.saveDocsFile()        (Docs auf Disk)
```

## Aenderungen im Detail

### 1. ScaffoldContext erweitern (DocsScaffoldGenerator.kt)

5 neue nullable Felder:

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

### 2. ScaffoldContextBuilder.build() erweitern

Die Methode liest bereits `scope.md` und `mvp.md`. Zusaetzlich werden `problem.md`, `target_audience.md`, `architecture.md`, `backend.md` und `frontend.md` geladen:

```kotlin
fun build(projectId: String): ScaffoldContext {
    // ... bestehende Logik (epics, features, decisions) ...

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
}
```

### 3. ProjectService: Trigger in saveSpecFile()

`saveSpecFile()` ruft nach dem Speichern `regenerateDocsScaffold()` auf:

```kotlin
fun saveSpecFile(projectId: String, fileName: String, content: String) {
    storage.loadProject(projectId) ?: throw ProjectNotFoundException(projectId)
    storage.saveSpecStep(projectId, fileName, content)
    regenerateDocsScaffold(projectId)
}
```

### 4. ProjectService: generateDocsScaffold() ueber ScaffoldContextBuilder

Die bisherige `generateDocsScaffold()` baut den Context manuell mit leeren Listen. Sie wird auf den `ScaffoldContextBuilder` umgestellt:

```kotlin
@Service
class ProjectService(
    private val storage: ProjectStorage,
    private val scaffoldGenerator: DocsScaffoldGenerator? = null,
    private val scaffoldContextBuilder: ScaffoldContextBuilder? = null
) {
    // ...

    private fun generateDocsScaffold(projectId: String, projectName: String) {
        val generator = scaffoldGenerator ?: return
        val builder = scaffoldContextBuilder
        val context = if (builder != null) {
            builder.build(projectId)
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
}
```

**Hinweis:** Der Fallback ohne `ScaffoldContextBuilder` bleibt fuer Tests erhalten, bei denen kein vollstaendiger Spring-Context vorliegt.

### 5. ProjectController: Neuer Endpoint

```kotlin
@PostMapping("/{id}/docs/regenerate")
fun regenerateDocs(@PathVariable id: String): ResponseEntity<Void> {
    projectService.regenerateDocsScaffold(id)
    return ResponseEntity.noContent().build()
}
```

### 6. Mustache-Templates

**`overview.md.mustache`** — erweitert um Problem, Zielgruppe, Architektur:

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
|---|---|---|
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

**`api.md.mustache`** — Backend-Spec vor Endpoints:

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

**`design.md.mustache`** — Frontend-Spec vor Komponenten:

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

### 7. Tests

**`DocsScaffoldGeneratorTest`** — bestehende Tests anpassen: `ScaffoldContext`-Konstruktor benoetigt die 5 neuen Felder (alle `null` in bestehenden Tests).

**Neuer Test:** Context mit befuellten Spec-Feldern erstellen und pruefen, dass die generierten Docs die Inhalte enthalten.

## Nicht im Scope

- Parsen von `spec/features.md` — Features kommen aus Tasks (EPICs)
- Merge von manuellen Docs-Aenderungen — Templates sind autoritativ, ueberschreiben immer
- Frontend-Aenderungen — der Explorer zeigt die Docs-Dateien bereits an

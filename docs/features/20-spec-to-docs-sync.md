# Feature 20: Spec-to-Docs Synchronisation

## Zusammenfassung
Wenn der Agent im Wizard Spec-Dateien erzeugt oder aktualisiert (`data/projects/{id}/spec/`), werden die Inhalte automatisch in die passende Docs-Struktur (`data/projects/{id}/docs/`) uebernommen. Dabei wird die bestehende Docs-Ordnerstruktur beruecksichtigt: Spec-Inhalte wie `scope.md`, `mvp.md` und Decisions fliessen in `docs/architecture/overview.md`, Feature-Beschreibungen in `docs/features/`, Backend/Frontend-Inhalte in `docs/backend/api.md` bzw. `docs/frontend/design.md`, und die `docs/features/00-feature-set-overview.md` wird als Index aktuell gehalten. Aktuell wird das Docs-Scaffold nur einmalig beim Erstellen eines Projekts generiert — danach veralten die Docs waehrend der Wizard-Progression. Dieses Feature schliesst diese Luecke.

## User Stories
1. Als PO moechte ich, dass meine Docs automatisch aktuell bleiben, wenn ich im Wizard Fortschritte mache, damit ich nicht manuell nacharbeiten muss.
2. Als PO moechte ich, dass die `00-feature-set-overview.md` immer den aktuellen Stand meiner Features widerspiegelt, inklusive Abhaengigkeiten und Aufwand.
3. Als PO moechte ich, dass Architektur-Entscheidungen, Scope und MVP in der `docs/architecture/overview.md` landen, sobald ich die entsprechenden Wizard-Steps abschliesse.
4. Als PO moechte ich im Explorer die generierten Docs sehen und als Grundlage fuer den Export oder Handoff nutzen koennen.

## Acceptance Criteria
- [ ] Nach Abschluss eines Wizard-Steps werden die Docs automatisch regeneriert
- [ ] `docs/features/00-feature-set-overview.md` enthaelt immer die aktuelle Feature-Liste mit Nummern, Titeln, Dateinamen, Abhaengigkeiten und Aufwand
- [ ] Pro Feature existiert eine eigene Datei in `docs/features/` (z.B. `01-user-management.md`) mit Zusammenfassung, User Stories und Acceptance Criteria
- [ ] `docs/architecture/overview.md` enthaelt Scope, MVP und getroffene Decisions
- [ ] `docs/backend/api.md` wird aus den Backend-Spec-Inhalten befuellt (Tasks, Endpoints)
- [ ] `docs/frontend/design.md` wird aus den Frontend-Spec-Inhalten befuellt (Stories, Komponenten)
- [ ] Bereits existierende Docs-Dateien werden ueberschrieben (kein Merge, Template ist autoritativ)
- [ ] Docs-Generierung ist idempotent: mehrfaches Ausfuehren erzeugt dasselbe Ergebnis
- [ ] Manuelle API zum erneuten Generieren existiert (`POST /api/v1/projects/{id}/docs/regenerate`)
- [ ] Spec-Dateien ohne verwertbaren Inhalt (z.B. nur Platzhalter) fuehren nicht zu leeren Docs-Abschnitten

## Technische Details

### Mapping: Spec-Dateien → Docs-Ordner

| Spec-Datei | Ziel-Docs | Abschnitt |
|------------|-----------|-----------|
| `spec/idea.md` | `docs/features/00-feature-set-overview.md` | Projektname, Einfuehrung |
| `spec/problem.md` | `docs/architecture/overview.md` | Problemkontext |
| `spec/target_audience.md` | `docs/architecture/overview.md` | Zielgruppe |
| `spec/scope.md` | `docs/architecture/overview.md` | Scope |
| `spec/mvp.md` | `docs/architecture/overview.md` | MVP |
| `spec/features.md` | `docs/features/00-feature-set-overview.md` + pro Feature eine Datei | Feature-Index + Einzeldateien |
| `spec/architecture.md` | `docs/architecture/overview.md` | Architektur-Entscheidungen, Tech-Stack |
| `spec/backend.md` | `docs/backend/api.md` | Endpoints, Services |
| `spec/frontend.md` | `docs/frontend/design.md` | Komponenten, UI-Patterns |
| `spec/spec.md` | Kein separates Docs-Ziel | Wird fuer den Export als `SPEC.md` genutzt |

### Backend

**`DocsScaffoldGenerator` erweitern**

Der bestehende `DocsScaffoldGenerator` bleibt die zentrale Stelle fuer die Docs-Erzeugung. Die `ScaffoldContext`-Klasse wird erweitert, um die zusaetzlichen Spec-Inhalte aufzunehmen:

```kotlin
data class ScaffoldContext(
    val projectName: String,
    val features: List<FeatureContext>,
    val decisions: List<DecisionContext>,
    val scopeContent: String?,
    val mvpContent: String?,
    val techStack: String,
    // Neu:
    val problemContent: String?,
    val targetAudienceContent: String?,
    val architectureContent: String?,
    val backendContent: String?,
    val frontendContent: String?
)
```

**`ProjectService.saveSpecFile()` — Trigger**

Nach jedem `saveSpecFile()`-Aufruf wird `regenerateDocsScaffold()` aufgerufen, um die Docs zu aktualisieren:

```kotlin
fun saveSpecFile(projectId: String, fileName: String, content: String) {
    storage.saveSpecStep(projectId, fileName, content)
    regenerateDocsScaffold(projectId)
}
```

**`ProjectService.generateDocsScaffold()` — Context-Aufbau**

Der Context wird aus allen vorhandenen Spec-Dateien zusammengebaut. Fehlende Dateien fuehren zu `null`-Werten:

```kotlin
private fun generateDocsScaffold(projectId: String, projectName: String) {
    val generator = scaffoldGenerator ?: return
    val context = ScaffoldContext(
        projectName = projectName,
        features = buildFeatureContexts(projectId),
        decisions = buildDecisionContexts(projectId),
        scopeContent = storage.loadSpecStep(projectId, "scope.md"),
        mvpContent = storage.loadSpecStep(projectId, "mvp.md"),
        problemContent = storage.loadSpecStep(projectId, "problem.md"),
        targetAudienceContent = storage.loadSpecStep(projectId, "target_audience.md"),
        architectureContent = storage.loadSpecStep(projectId, "architecture.md"),
        backendContent = storage.loadSpecStep(projectId, "backend.md"),
        frontendContent = storage.loadSpecStep(projectId, "frontend.md"),
        techStack = inferTechStack(projectId)
    )
    val entries = generator.generate(context)
    for ((path, content) in entries) {
        storage.saveDocsFile(projectId, path, content)
    }
}
```

**`ProjectStorage` — neue Methode**

```kotlin
fun loadSpecStep(projectId: String, fileName: String): String? {
    val file = projectDir(projectId).resolve("spec/$fileName")
    return if (Files.exists(file)) Files.readString(file) else null
}
```

### Mustache-Templates erweitern

**`docs/architecture/overview.md.mustache`** — neue Abschnitte:

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
...

{{#architectureContent}}
## Architektur
{{{architectureContent}}}
{{/architectureContent}}
```

**`docs/backend/api.md.mustache`** — Backend-Spec einfliessen lassen:

```mustache
# Backend API: {{projectName}}

{{#backendContent}}
{{{backendContent}}}
{{/backendContent}}

## Endpoints
...
```

**`docs/frontend/design.md.mustache`** — Frontend-Spec einfliessen lassen:

```mustache
# Frontend Design: {{projectName}}

{{#frontendContent}}
{{{frontendContent}}}
{{/frontendContent}}

## UI Komponenten
...
```

### REST API

Bestehender Endpoint bleibt erhalten:

```
POST /api/v1/projects/{id}/docs/regenerate
```

Dieser ruft `projectService.regenerateDocsScaffold(projectId)` auf und gibt `204 No Content` zurueck.

### Feature-Parsing aus `spec/features.md`

Die `features.md` wird vom Agent als strukturiertes Markdown erzeugt. Der `DocsScaffoldGenerator` parsed diese Datei, um pro Feature eine `FeatureContext`-Instanz zu erzeugen. Falls das Parsing fehlschlaegt (unstrukturierter Freitext), wird die gesamte `features.md` als einzelner Block in die Overview-Datei geschrieben.

## Abhaengigkeiten
- Feature 1 (Idea-to-Spec Flow) — Spec-Dateien werden im Wizard erzeugt
- Feature 4 (Spec + Plan + Tasks) — Tasks und Features als Input
- Feature 10 (Project Scaffold Export) — Docs-Scaffold-Grundstruktur
- Feature 11 (Guided Wizard Forms) — Wizard-Steps als Trigger

## Aufwand
M (Medium)

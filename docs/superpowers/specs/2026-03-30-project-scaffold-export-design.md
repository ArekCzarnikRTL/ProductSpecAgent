# Design: Feature 10 — Project Scaffold Export

**Datum**: 2026-03-30
**Status**: Approved

## Ziel

Beim Export (Feature 5) und Handoff (Feature 8) wird automatisch eine vollstaendige `docs/`-Struktur generiert, die der des Product-Spec-Agent Projekts selbst entspricht. Mustache-Templates auf dem Classpath werden zur Laufzeit mit Projektdaten gefuellt.

## Architektur-Entscheidungen

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| Template Engine | Mustache (mustache.java) | Leichtgewichtig, logiklos, kein Spring-Template noetig |
| Generierung | Immer (beide Exports) | User will Scaffold in normalem + Handoff-Export |
| Backend-Docs | `api.md` generiert | Endpoints aus Tasks/Spec ableitbar |
| Frontend-Docs | `design.md` generiert | UI-Beschreibung aus Spec ableitbar |
| Leere Ordner | `.gitkeep` | Standard-Pattern fuer Git |

## Generierte Docs-Struktur im ZIP

```
{project-slug}/
├── docs/
│   ├── architecture/
│   │   └── overview.md          <- aus overview.md.mustache
│   ├── backend/
│   │   └── api.md               <- aus api.md.mustache
│   ├── features/
│   │   ├── 00-feature-set-overview.md  <- aus 00-feature-set-overview.md.mustache
│   │   ├── 01-{slug}.md         <- aus feature.md.mustache (pro EPIC)
│   │   ├── 02-{slug}.md
│   │   └── ...
│   └── frontend/
│       └── design.md            <- aus design.md.mustache
├── README.md
├── SPEC.md
├── PLAN.md
├── ...
```

## Komponenten

### 1. Mustache Templates

Pfad: `backend/src/main/resources/templates/scaffold/`

#### `docs/features/00-feature-set-overview.md.mustache`

```mustache
# Feature Set: {{projectName}}

Jedes Feature ist eine eigenstaendige, implementierbare Einheit.

## Reihenfolge

| # | Feature | Datei | Abhaengig von | Aufwand |
|---|---------|-------|---------------|---------|
{{#features}}
| {{number}} | {{title}} | [{{filename}}]({{filename}}) | {{dependencies}} | {{estimate}} |
{{/features}}

## Architecture Docs

| Thema | Datei |
|-------|-------|
| Uebersicht | [../architecture/overview.md](../architecture/overview.md) |
| API | [../backend/api.md](../backend/api.md) |
| Design | [../frontend/design.md](../frontend/design.md) |

## Tech-Stack

{{techStack}}
```

#### `docs/features/feature.md.mustache`

```mustache
# Feature {{number}}: {{title}}

## Zusammenfassung
{{description}}

## User Stories
{{#stories}}
{{index}}. Als User moechte ich {{title}}{{#description}} — {{description}}{{/description}}.
{{/stories}}

## Acceptance Criteria
{{#acceptanceCriteria}}
- [ ] {{title}}{{#description}}: {{description}}{{/description}}
{{/acceptanceCriteria}}

## Technische Details
{{#technicalDetails}}
- {{.}}
{{/technicalDetails}}

## Abhaengigkeiten
{{dependencies}}

## Aufwand
{{estimate}}
```

#### `docs/architecture/overview.md.mustache`

```mustache
# Architecture Overview: {{projectName}}

## Entscheidungen

| Entscheidung | Gewaehlt | Begruendung |
|-------------|----------|-------------|
{{#decisions}}
| {{title}} | {{chosen}} | {{rationale}} |
{{/decisions}}
{{^decisions}}
Keine Entscheidungen getroffen.
{{/decisions}}

## Scope
{{#scopeContent}}
{{{scopeContent}}}
{{/scopeContent}}
{{^scopeContent}}
Noch nicht definiert.
{{/scopeContent}}

## MVP
{{#mvpContent}}
{{{mvpContent}}}
{{/mvpContent}}
{{^mvpContent}}
Noch nicht definiert.
{{/mvpContent}}
```

#### `docs/backend/api.md.mustache`

```mustache
# Backend API: {{projectName}}

## Endpoints

Die folgenden Endpoints werden fuer die Implementierung benoetigt:

{{#features}}
### {{title}}
{{#tasks}}
- `{{title}}`{{#description}} — {{description}}{{/description}}
{{/tasks}}

{{/features}}

## Technologie
{{techStack}}
```

#### `docs/frontend/design.md.mustache`

```mustache
# Frontend Design: {{projectName}}

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

### 2. DocsScaffoldGenerator Service

```kotlin
@Service
class DocsScaffoldGenerator {
    fun generate(context: ScaffoldContext): Map<String, String>
}
```

- Laedt Templates via `ClassPathResource("templates/scaffold/...")`
- Kompiliert mit `com.github.mustachejava.DefaultMustacheFactory`
- Iteriert ueber `features` fuer die einzelnen Feature-Dokumente
- Gibt `Map<String, String>` zurueck (relativerPfad → generierter Inhalt)

### 3. ScaffoldContext (Datenmodell)

```kotlin
data class ScaffoldContext(
    val projectName: String,
    val features: List<FeatureContext>,
    val decisions: List<DecisionContext>,
    val scopeContent: String?,
    val mvpContent: String?,
    val techStack: String
)

data class FeatureContext(
    val number: Int,
    val title: String,
    val slug: String,
    val filename: String,          // "01-auth.md"
    val description: String,
    val estimate: String,
    val dependencies: String,
    val stories: List<StoryContext>,
    val acceptanceCriteria: List<TaskContext>,
    val tasks: List<TaskContext>,
    val technicalDetails: List<String>
)

data class StoryContext(val index: Int, val title: String, val description: String)
data class TaskContext(val title: String, val description: String)
data class DecisionContext(val title: String, val chosen: String, val rationale: String)
```

### 4. Integration

`ExportService.exportProject()` und `HandoffService.exportHandoff()` rufen nach den bestehenden ZIP-Eintraegen auf:

```kotlin
val scaffoldEntries = scaffoldGenerator.generate(buildScaffoldContext(projectId))
for ((path, content) in scaffoldEntries) {
    zip.addEntry("$prefix/$path", content)
}
```

`buildScaffoldContext()` wird als private Methode in beiden Services implementiert (oder in eine gemeinsame Hilfsklasse extrahiert). Liest:
- EPICs → Features
- STORYs pro Epic → User Stories
- TASKs pro Story → Acceptance Criteria
- Resolved Decisions → Entscheidungstabelle
- scope.md / mvp.md → Spec-Inhalte
- Tech-Stack aus Spec oder Platzhalter "See SPEC.md"

### 5. Dependency

```kotlin
// build.gradle.kts
implementation("com.github.spullara.mustache.java:compiler:0.9.14")
```

## Kein Frontend noetig

Scaffold wird automatisch in beide Exports eingefuegt. Keine Checkbox, kein neuer Dialog — es ist einfach immer dabei.

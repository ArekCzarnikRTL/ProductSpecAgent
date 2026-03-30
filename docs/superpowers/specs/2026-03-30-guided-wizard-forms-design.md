# Design: Feature 11 — Guided Wizard Forms

**Datum**: 2026-03-30
**Status**: Approved

## Ziel

Der Rete.js Node-Graph im Workspace wird durch einen Wizard mit horizontalem Step-Indicator und gefuehrten Formularen ersetzt. 10 Schritte: 6 Spec-Schritte + 4 Projekt-Schritte (Features, Architektur, Backend, Frontend).

## Architektur-Entscheidungen

| Entscheidung | Wahl | Begruendung |
|-------------|------|-------------|
| Layout | Wizard mit Step-Indicator (Option B) | Maximaler Formular-Platz, klarer Flow |
| Rete.js Graph | Wird ersetzt | Step-Indicator uebernimmt die Navigation |
| Schritte | 10 (6 Spec + 4 Projekt) | Vollstaendige Abdeckung von Idee bis Tech-Stack |
| Formular-Elemente | Chip-Select, Tag-Input, Textarea, sortierbare Listen | Strukturierte Eingaben statt Freitext |
| Persistenz | `wizard.json` pro Projekt | Auto-Save mit Debounce |
| FlowStepType | Erweitert um FEATURES, ARCHITECTURE, BACKEND, FRONTEND | Backend unterstuetzt alle 10 Schritte |

## Layout

```
+--------------------------------------------------+
| Header: Breadcrumb + Export + Handoff             |
+------+-------------------------------------------+
| Act. | Step-Indicator                             |
| Bar  | [1]--[2]--[3]--[4]--[5]--[6]--[7]--[8]--[9]--[10] |
| (40) |                                           |
|      | +-------------------+ +------------------+|
|      | | Formular          | | Rechte Sidebar   ||
|      | | (aktiver Schritt) | | Chat/Decisions/  ||
|      | |                   | | Clarif./Tasks/   ||
|      | |                   | | Checks (340px)   ||
|      | | Zurueck | Weiter  | |                  ||
|      | +-------------------+ +------------------+|
+------+-------------------------------------------+
```

## Datenmodell

### WizardData (Backend)

```kotlin
@Serializable
data class WizardData(
    val projectId: String,
    val steps: Map<String, WizardStepData> = emptyMap()
)

@Serializable
data class WizardStepData(
    val fields: Map<String, JsonElement> = emptyMap(),
    val completedAt: String? = null
)
```

Gespeichert als `data/projects/{id}/wizard.json`.

### FlowStepType Erweiterung

```kotlin
enum class FlowStepType {
    IDEA, PROBLEM, TARGET_AUDIENCE, SCOPE, MVP, SPEC,
    FEATURES, ARCHITECTURE, BACKEND, FRONTEND
}
```

### API

```
GET  /api/v1/projects/{id}/wizard          -> WizardData
PUT  /api/v1/projects/{id}/wizard          -> WizardData (speichert)
PUT  /api/v1/projects/{id}/wizard/{step}   -> WizardStepData (speichert einzelnen Schritt)
```

## Frontend-Komponenten

### StepIndicator
- Horizontale Leiste mit 10 nummerierten Kreisen
- Verbindungslinien zwischen Kreisen
- Status-Farben: completed=#22c55e, active=#3b82f6, open=#2a2a3e
- Klick auf Kreis navigiert zum Schritt
- Labels unter den Kreisen

### WizardForm
- Container der das richtige Step-Formular rendert
- Zurueck/Weiter Navigation
- Auto-Save bei Feld-Aenderungen (500ms Debounce)

### ChipSelect
- Wiederverwendbare Chip/Toggle-Auswahl
- Single-Select oder Multi-Select Modus
- Props: options, value, onChange, multiSelect

### TagInput
- Text-Input mit Tag-Anzeige
- Enter oder Komma fuegt Tag hinzu
- X-Button entfernt Tag
- Props: tags, onAdd, onRemove, placeholder

### SortableList
- Drag & Drop sortierbare Liste
- Jedes Item: Titel, optionales Label (Must/Should/Could)
- Props: items, onReorder, onLabelChange

### Step-Formulare (10 Stueck)
Jeder Schritt als eigene Komponente:
- `IdeaForm`, `ProblemForm`, `TargetAudienceForm`, `ScopeForm`, `MvpForm`, `SpecForm`
- `FeaturesForm`, `ArchitectureForm`, `BackendForm`, `FrontendForm`

Jede Form-Komponente:
- Empfaengt `data: WizardStepData` und `onChange: (data) => void`
- Rendert die spezifischen Felder des Schritts
- Validiert Required-Felder

## Interaktion mit bestehendem System

- **Chat-Agent**: Wird zum Assistenten — hilft kontextbezogen pro Schritt
- **Spec-Dateien**: Beim Speichern eines Schritts wird auch die spec/*.md Datei aktualisiert
- **Features-Schritt**: Erstellt/aktualisiert EPIC-Tasks im TaskService
- **Architektur/Backend/Frontend**: Fliessen in den Export und Handoff ein
- **Consistency Checks**: Pruefen auch Wizard-Felder auf Vollstaendigkeit

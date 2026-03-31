# Feature 15: Interne Dateien im Explorer verstecken

## Zusammenfassung
Der File Explorer in der linken Sidebar zeigt keine internen Projektdateien mehr an. Die Dateien `project.json`, `flow-state.json` und `wizard.json` werden vom Backend aus dem File-Listing gefiltert, bevor sie ans Frontend gesendet werden. Der User sieht nur inhaltlich relevante Dateien wie Spec-Dokumente, Entscheidungen, Tasks und generierte Dokumentation.

## User Stories
1. Als PO moechte ich im Explorer nur inhaltlich relevante Dateien sehen, damit ich nicht durch technische Konfigurationsdateien verwirrt werde.

## Acceptance Criteria
- [ ] `project.json` erscheint nicht im Explorer
- [ ] `flow-state.json` erscheint nicht im Explorer
- [ ] `wizard.json` erscheint nicht im Explorer
- [ ] Spec-Dateien (`spec/`), Dokumentation (`docs/`), Entscheidungen (`decisions/`), Klaerungen (`clarifications/`) und Tasks (`tasks/`) bleiben sichtbar
- [ ] Das Verstecken ist fest — kein Toggle, keine Option zum Einblenden
- [ ] Direkter Dateizugriff via API (`GET /files/project.json`) bleibt funktionsfaehig (nur das Listing filtert)

## Technische Details

### Backend

**Aenderung in `FileController.kt`**

Die Methode `buildTree()` filtert im Root-Verzeichnis des Projekts die internen Dateien aus:

```kotlin
private val HIDDEN_FILES = setOf("project.json", "flow-state.json", "wizard.json")
```

In `buildTree()` werden Dateien uebersprungen, deren Name in `HIDDEN_FILES` enthalten ist und die sich im Root-Verzeichnis befinden (`relativePath` ist leer).

### Frontend

Keine Aenderung noetig — das Frontend zeigt an, was das Backend liefert.

## Abhaengigkeiten
- Feature 9 (Spec File Explorer) — Explorer-Grundstruktur, FileController

## Aufwand
XS (Extra Small)

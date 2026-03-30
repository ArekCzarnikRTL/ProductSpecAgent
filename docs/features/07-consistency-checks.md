# Feature 7: Consistency Checks

## Zusammenfassung
Automatische Prüfung, ob Ziele, Anforderungen, User Stories und Tasks zueinander passen. Inkonsistenzen werden markiert und dem User zur Klärung vorgelegt.

## User Stories
1. Als PO möchte ich automatisch gewarnt werden, wenn ein Task keinem Ziel zugeordnet ist.
2. Als PO möchte ich sehen, ob alle definierten Ziele durch User Stories abgedeckt sind.
3. Als PO möchte ich Inkonsistenzen zwischen Scope-Entscheidungen und generierten Tasks erkennen.

## Acceptance Criteria
- [ ] "Run Checks" Button prüft das gesamte Projekt auf Konsistenz
- [ ] Checks laufen auch automatisch nach jeder Änderung (mit Debounce)
- [ ] Prüfungen: Ziel → Story Mapping, Story → Task Mapping, Scope vs. Tasks, Widersprüche in Decisions
- [ ] Ergebnisse als Liste mit Severity (Fehler/Warnung/Info)
- [ ] Jedes Finding verlinkt auf die betroffenen Artefakte
- [ ] Agent schlägt Fixes vor (z.B. fehlende Story erzeugen)

## Technische Details
- **Backend**: `ConsistencyCheckAgent` (Koog) analysiert Projekt-Artefakte
- **Frontend**: Check-Results Panel mit Severity-Icons und Links
- **API**: `POST /api/v1/projects/{id}/checks`, `GET /api/v1/projects/{id}/checks/results`
- **Persistenz**: Check-Results werden nicht persistiert (on-demand berechnet)

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)
- Feature 4 (Spec + Plan + Tasks)

## Aufwand
L (Large)

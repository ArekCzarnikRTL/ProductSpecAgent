# Feature 4: Spec + Plan + Tasks

## Zusammenfassung
Aus der fertigen Spec werden automatisch Umsetzungspakete generiert — Epics, User Stories und Tasks. Die Hierarchie ist navigierbar und editierbar.

## User Stories
1. Als PO möchte ich aus einer fertigen Spec automatisch Epics und User Stories generieren lassen.
2. Als PO möchte ich die generierten Tasks bearbeiten, umpriorisieren und gruppieren können.
3. Als PO möchte ich eine Übersicht sehen, wie viel der Spec bereits in Tasks überführt ist.

## Acceptance Criteria
- [ ] Button "Generate Plan" erzeugt aus fertiger Spec eine Task-Hierarchie (Epic → Story → Task)
- [ ] Jeder Task hat: Titel, Beschreibung, Schätzung, Abhängigkeiten
- [ ] Tasks sind per Drag & Drop umpriorisierbar
- [ ] Coverage-Indikator zeigt, welche Spec-Abschnitte Tasks haben und welche nicht
- [ ] Tasks werden als strukturierte Dateien im Filesystem gespeichert

## Technische Details
- **Backend**: `PlanGeneratorAgent` (Koog) generiert Task-Hierarchie aus Spec
- **Frontend**: Task-Board mit Drag & Drop, Tree-View für Hierarchie
- **API**: `GET/POST /api/v1/projects/{id}/tasks`, `PUT /api/v1/projects/{id}/tasks/{taskId}`
- **Persistenz**: `data/projects/{id}/tasks/{task-id}.json`

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)

## Aufwand
XL (Extra Large)

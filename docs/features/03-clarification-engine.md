# Feature 3: Clarification Engine

## Zusammenfassung
Der Agent erkennt Lücken, Widersprüche oder Unklarheiten in den bisherigen Eingaben und stellt gezielte Rückfragen. Diese erscheinen als eigene Nodes im Flow oder als Inline-Hinweise.

## User Stories
1. Als PO möchte ich auf Widersprüche in meinen Anforderungen hingewiesen werden.
2. Als PO möchte ich gezielte Rückfragen bekommen, wenn meine Angaben unvollständig sind.
3. Als PO möchte ich sehen, welche offenen Klärungspunkte es noch gibt.

## Acceptance Criteria
- [ ] Agent analysiert nach jedem Schritt die bisherigen Eingaben auf Lücken/Widersprüche
- [ ] Rückfragen erscheinen als markierte Clarification-Nodes im Graph
- [ ] Offene Clarifications sind in einer Sidebar/Übersicht gelistet
- [ ] Beantwortete Clarifications werden als "geklärt" markiert
- [ ] Der Agent erklärt, warum eine Klärung nötig ist

## Technische Details
- **Backend**: `ClarificationAgent` (Koog) analysiert Projekt-Kontext auf Lücken
- **Frontend**: Clarification-Badge auf Nodes, Sidebar mit offenen Fragen
- **API**: `GET/POST /api/v1/projects/{id}/clarifications`
- **Persistenz**: `data/projects/{id}/clarifications/{clarification-id}.json`

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)

## Aufwand
L (Large)

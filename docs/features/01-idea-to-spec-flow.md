# Feature 1: Idea-to-Spec Flow

## Zusammenfassung
Der User gibt eine grobe Idee als Freitext ein. Der Koog-Agent führt ihn schrittweise durch einen strukturierten Prozess — von der Problemdefinition über Zielgruppe, Scope bis zur fertigen Spec. Der Fortschritt wird im Frontend als Rete.js Node-Graph visualisiert.

## User Stories
1. Als PO möchte ich eine Idee als Freitext eingeben und daraus schrittweise eine Spec generieren lassen.
2. Als PO möchte ich den aktuellen Stand meines Spec-Prozesses als visuellen Flow sehen (welche Schritte erledigt, welche offen).
3. Als PO möchte ich jederzeit zu einem früheren Schritt zurückspringen können.

## Acceptance Criteria
- [ ] Eingabefeld für Freitext-Idee vorhanden
- [ ] Koog-Agent analysiert die Idee und erzeugt den ersten Node (Problemdefinition)
- [ ] Node-Graph zeigt Nodes: Idee → Problem → Zielgruppe → Scope → MVP → Spec
- [ ] Jeder Node hat einen Status (offen/in Arbeit/fertig)
- [ ] Navigation zwischen Nodes möglich
- [ ] Ergebnis jedes Schritts wird als strukturiertes JSON im Filesystem gespeichert

## Technische Details
- **Backend**: `IdeaToSpecAgent` (Koog) analysiert Freitext, erzeugt strukturierten Flow
- **Frontend**: Rete.js Node-Graph mit Custom Nodes pro Schritt
- **API**: `POST /api/v1/projects/{id}/agent/chat` für Agent-Interaktion
- **Persistenz**: `data/projects/{id}/spec/` und `data/projects/{id}/flow-state.json`

## Abhängigkeiten
- Feature 0 (Project Setup)

## Aufwand
XL (Extra Large)

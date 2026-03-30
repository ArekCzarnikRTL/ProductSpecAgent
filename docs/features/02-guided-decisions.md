# Feature 2: Guided Decisions

## Zusammenfassung
An definierten Entscheidungspunkten im Flow bekommt der PO strukturierte Entscheidungshilfen — Multiple-Choice, Pro/Contra-Vergleiche, Empfehlungen. Der Agent stellt Optionen auf und gibt eine begründete Empfehlung.

## User Stories
1. Als PO möchte ich bei Scope-Entscheidungen klare Optionen mit Pro/Contra sehen.
2. Als PO möchte ich eine AI-Empfehlung bekommen, die ich annehmen oder überschreiben kann.
3. Als PO möchte ich getroffene Entscheidungen mit Begründung nachvollziehen können.

## Acceptance Criteria
- [ ] Decision-Points sind im Flow als eigene Nodes sichtbar
- [ ] Jede Decision zeigt 2-4 Optionen mit Pro/Contra
- [ ] Agent liefert eine Empfehlung mit Begründung
- [ ] User kann Option wählen oder eigene eingeben
- [ ] Entscheidungen werden mit Timestamp und Begründung persistiert
- [ ] Decision-Log ist jederzeit einsehbar

## Technische Details
- **Backend**: `DecisionAgent` (Koog) generiert Optionen basierend auf Kontext
- **Frontend**: Decision-Card Component mit Option-Selector
- **API**: `GET/POST /api/v1/projects/{id}/decisions`
- **Persistenz**: `data/projects/{id}/decisions/{decision-id}.json`

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)

## Aufwand
L (Large)

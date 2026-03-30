# Feature 8: Agent-ready Project Handoff

## Zusammenfassung
Über den reinen Git-Export hinaus wird ein optimiertes Paket erzeugt, das speziell für AI-Coding-Agents aufbereitet ist — mit `CLAUDE.md`, `AGENTS.md`, kontextreichen Prompts und einer empfohlenen Implementierungsreihenfolge.

## User Stories
1. Als PO möchte ich ein Projekt so exportieren, dass ein AI-Agent (Claude Code, Codex) sofort damit arbeiten kann.
2. Als PO möchte ich den AI-Agent-Kontext (CLAUDE.md, AGENTS.md) automatisch generieren lassen.
3. Als PO möchte ich eine empfohlene Reihenfolge für die Implementierung sehen, die der Agent befolgen kann.

## Acceptance Criteria
- [ ] Generiert `CLAUDE.md` mit Projektkontext, Tech-Stack, Konventionen
- [ ] Generiert `AGENTS.md` mit Anweisungen für AI-Agents
- [ ] Erzeugt `implementation-order.md` mit priorisierter Feature-Reihenfolge
- [ ] Jeder Task enthält genug Kontext, dass ein Agent ihn ohne Rückfragen umsetzen kann
- [ ] Preview-Funktion: User kann das generierte Handoff-Paket vor Export sehen und anpassen
- [ ] Unterstützt verschiedene Agent-Formate (Claude Code, Codex, Custom)

## Technische Details
- **Backend**: Handoff-Service nutzt Templates + Koog-Agent für kontextreiche Generierung
- **Frontend**: Handoff-Preview mit editierbaren Sektionen
- **API**: `POST /api/v1/projects/{id}/handoff/preview`, `POST /api/v1/projects/{id}/handoff/export`
- **Templates**: `backend/src/main/resources/templates/handoff/claude.md.mustache`, `agents.md.mustache`

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 5 (Git-Repository Output)
- Feature 4 (Spec + Plan + Tasks)

## Aufwand
L (Large)

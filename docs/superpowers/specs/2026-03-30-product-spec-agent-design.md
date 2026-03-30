# Design: Product-Spec-Agent — Projekt Setup & Feature Set

**Datum**: 2026-03-30
**Status**: Approved

## Vision

Product-Spec-Agent ist eine intelligente App für Product Owner, die aus einer Idee Schritt für Schritt ein belastbares Produktkonzept macht. Von der ersten Problemdefinition über Scope, Priorisierung und Lösungsbild bis hin zu einer umsetzbaren Produktspezifikation. Am Ende entsteht ein sauber strukturiertes, Git-fähiges Repository für AI-Coding-Agents.

## Architektur-Entscheidungen

| Entscheidung | Wahl | Begründung |
|-------------|------|-----------|
| Repo-Struktur | Monorepo (`/frontend` + `/backend`) | Einfacher für AI-Agents, ein Git-History |
| Backend | Kotlin + Spring Boot 4 | Robust, guter Kotlin-Support, Spring Security |
| AI-Engine | JetBrains Koog | Agent-Framework im Backend für Spec-Flow-Logik |
| Frontend | Next.js + React + shadcn/ui | Modernes UI-Framework, gute DX |
| Node-Graph | Rete.js | Visualisierung des Idea-to-Spec Flows |
| Persistenz | Filesystem/Git (kein DB) | Konsistent mit Git-Repository Output |
| API | REST | Einfach, ausreichend für Request/Response |
| Auth | JWT via Spring Security | Multi-User, stateless |
| Multi-User | Ja, mit Rollen (Owner/Contributor/Viewer) | Team-Arbeit an Specs |
| Deployment | Docker Compose (Self-hosted) | User betreibt es selbst |

## Feature Set

### Feature 0: Project Setup
Technisches Scaffolding: Monorepo, Docker Compose, Auth-Grundgerüst, Dev-Workflow.
- Spec: [docs/features/00-project-setup.md](../../features/00-project-setup.md)

### Feature 1: Idea-to-Spec Flow
Freitext-Idee → strukturierter Spec-Prozess via Koog-Agent, visualisiert als Rete.js Node-Graph.
- Spec: [docs/features/01-idea-to-spec-flow.md](../../features/01-idea-to-spec-flow.md)

### Feature 2: Guided Decisions
Strukturierte Entscheidungshilfen mit Multiple-Choice, Pro/Contra, AI-Empfehlung.
- Spec: [docs/features/02-guided-decisions.md](../../features/02-guided-decisions.md)

### Feature 3: Clarification Engine
Automatische Erkennung von Lücken/Widersprüchen, gezielte Rückfragen.
- Spec: [docs/features/03-clarification-engine.md](../../features/03-clarification-engine.md)

### Feature 4: Spec + Plan + Tasks
Automatische Generierung von Epics, User Stories und Tasks aus der Spec.
- Spec: [docs/features/04-spec-plan-tasks.md](../../features/04-spec-plan-tasks.md)

### Feature 5: Git-Repository Output
Export der Produktspezifikation als strukturiertes Git-Repository.
- Spec: [docs/features/05-git-repository-output.md](../../features/05-git-repository-output.md)

### Feature 6: Beautiful UI
Modernes Dashboard mit Projekt-Übersicht, interaktivem Node-Graph, Dark/Light Mode.
- Spec: [docs/features/06-beautiful-ui.md](../../features/06-beautiful-ui.md)

### Feature 7: Consistency Checks
Automatische Prüfung ob Ziele, Stories und Tasks zueinander passen.
- Spec: [docs/features/07-consistency-checks.md](../../features/07-consistency-checks.md)

### Feature 8: Agent-ready Project Handoff
Optimiertes Export-Paket für AI-Coding-Agents (CLAUDE.md, AGENTS.md, Implementation Order).
- Spec: [docs/features/08-agent-ready-handoff.md](../../features/08-agent-ready-handoff.md)

## Architecture Docs

- [Monorepo-Struktur](../../architecture/monorepo-structure.md)
- [Authentifizierung](../../architecture/auth.md)
- [REST API Design](../../architecture/rest-api.md)
- [Persistenz](../../architecture/persistence.md)
- [Koog Agent Integration](../../architecture/koog-agents.md)

## Implementierungsreihenfolge

1. **Feature 0** — Project Setup (Basis für alles)
2. **Feature 6** — Beautiful UI (parallel zum Backend, UI-Shell early)
3. **Feature 1** — Idea-to-Spec Flow (Kern-Feature)
4. **Feature 2** — Guided Decisions (erweitert den Flow)
5. **Feature 3** — Clarification Engine (erweitert den Flow)
6. **Feature 4** — Spec + Plan + Tasks (setzt fertigen Flow voraus)
7. **Feature 7** — Consistency Checks (setzt Tasks voraus)
8. **Feature 5** — Git-Repository Output (setzt Tasks voraus)
9. **Feature 8** — Agent-ready Handoff (setzt Export voraus)

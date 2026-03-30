# Feature Set: Product-Spec-Agent

Jedes Feature ist eine eigenständige, implementierbare Einheit. Die Reihenfolge ist so gewählt, dass jedes Feature auf dem vorherigen aufbaut.

## Reihenfolge

| # | Feature | Datei | Abhängig von | Aufwand |
|---|---------|-------|-------------|---------|
| 0 | Project Setup | [00-project-setup.md](00-project-setup.md) | — | L |
| 1 | Idea-to-Spec Flow | [01-idea-to-spec-flow.md](01-idea-to-spec-flow.md) | Feature 0 | XL |
| 2 | Guided Decisions | [02-guided-decisions.md](02-guided-decisions.md) | Feature 0, 1 | L |
| 3 | Clarification Engine | [03-clarification-engine.md](03-clarification-engine.md) | Feature 0, 1 | L |
| 4 | Spec + Plan + Tasks | [04-spec-plan-tasks.md](04-spec-plan-tasks.md) | Feature 0, 1 | XL |
| 5 | Git-Repository Output | [05-git-repository-output.md](05-git-repository-output.md) | Feature 0, 1, 4 | M |
| 6 | Beautiful UI | [06-beautiful-ui.md](06-beautiful-ui.md) | Feature 0 | L |
| 7 | Consistency Checks | [07-consistency-checks.md](07-consistency-checks.md) | Feature 0, 1, 4 | L |
| 8 | Agent-ready Handoff | [08-agent-ready-handoff.md](08-agent-ready-handoff.md) | Feature 0, 4, 5 | L |

## Architecture Docs

| Thema | Datei |
|-------|-------|
| Monorepo-Struktur | [../architecture/monorepo-structure.md](../architecture/monorepo-structure.md) |
| Authentifizierung | [../architecture/auth.md](../architecture/auth.md) |
| REST API Design | [../architecture/rest-api.md](../architecture/rest-api.md) |
| Persistenz | [../architecture/persistence.md](../architecture/persistence.md) |
| Koog Agents | [../architecture/koog-agents.md](../architecture/koog-agents.md) |

## Frontend Docs

| Thema | Datei |
|-------|-------|
| Design System | [../frontend/design-system.md](../frontend/design-system.md) |

## Tech-Stack

### Frontend
- Next.js (App Router) + React + TypeScript
- shadcn/ui (Component Library)
- Rete.js (Node-Graph Visualisierung)

### Backend
- Kotlin 2.2 + Spring Boot 4
- JetBrains Koog (AI Agent Framework)
- Filesystem/Git Persistenz

### Deployment
- Docker Compose (Self-hosted)
- Multi-User mit JWT Auth

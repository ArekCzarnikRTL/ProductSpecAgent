# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

Respond in German. Keep code identifiers, commit messages, and technical terms in English.

## Project

Product-Spec-Agent: A wizard-based app that guides product owners from a rough idea to a complete, structured product specification. Uses AI agents (JetBrains Koog framework with OpenAI models) to analyze input, generate decisions, surface clarifications, and produce exportable specs.

## Tech Stack

- **Backend**: Kotlin 2.3, Spring Boot 4, Java 21, Gradle, JetBrains Koog 0.7.3
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Rete.js, Zustand
- **Persistence**: Filesystem (JSON + Markdown in `data/projects/{id}/`), no database
- **Deployment**: Docker Compose (backend:8080, frontend:3000)

## Commands

### Backend (run from `backend/`)
```bash
./gradlew bootRun --quiet          # Start backend (port 8080)
./gradlew test                     # Run all tests
./gradlew test --tests "com.agentwork.productspecagent.export.DocsScaffoldGeneratorTest"  # Single test class
./gradlew test --tests "*.DocsScaffoldGeneratorTest.generates feature overview"           # Single test method
./gradlew bootJar                  # Build JAR
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # Dev server (port 3000)
npm run build     # Production build
npm run lint      # ESLint
```

### Both services
```bash
./start.sh                # Run backend + frontend in parallel
docker-compose up         # Docker (needs OPENAI_API_KEY env var)
```

## Architecture

### 9-Step Wizard Flow
Projects progress through: `IDEA → PROBLEM → TARGET_AUDIENCE → SCOPE → MVP → FEATURES → ARCHITECTURE → BACKEND → FRONTEND`. Each step has a status (`OPEN`, `IN_PROGRESS`, `COMPLETED`) tracked in `flow-state.json`. Steps can be dynamically shown/hidden based on project category.

### Agent Marker Protocol
`IdeaToSpecAgent` parses special markers from AI responses to trigger side effects:
- `[STEP_COMPLETE]` — advances flow state, saves spec file
- `[DECISION_NEEDED]: title` — creates a Decision entity via `DecisionAgent`
- `[CLARIFICATION_NEEDED]: question | why` — creates a Clarification entity

Markers must appear on their own line, no markdown formatting. This is the core mechanism that drives wizard progression.

### Persistence (No DB)
All data lives under `data/projects/{project-id}/`:
- `project.json`, `flow-state.json`, `wizard.json` — project metadata
- `spec/` — Markdown files per wizard step (idea.md, problem.md, etc.)
- `decisions/`, `clarifications/`, `tasks/` — JSON entities
- `docs/` — Auto-generated documentation (Mustache templates, regenerated on every spec save)

Storage classes (`ProjectStorage`, `DecisionStorage`, etc.) use `java.nio.file` directly. Tests use `@TempDir` for isolation.

### Docs Scaffold System
`ScaffoldContextBuilder` assembles a `ScaffoldContext` from spec files + tasks (EPICs) + decisions. `DocsScaffoldGenerator` renders Mustache templates into `docs/features/`, `docs/architecture/`, `docs/backend/`, `docs/frontend/`. Docs regenerate automatically on every `saveSpecFile()` call.

### Backend Layers
- `api/` — REST controllers (`/api/v1/projects/...`)
- `agent/` — Koog agents (`IdeaToSpecAgent`, `DecisionAgent`, `ClarificationAgent`, `PlanGeneratorAgent`)
- `domain/` — Data classes (kotlinx.serialization)
- `storage/` — Filesystem persistence
- `export/` — Scaffold generation, ZIP export, handoff
- `config/` — CORS, Security, Jackson

### Frontend Patterns
- API client: `lib/api.ts` — fetch-based `apiFetch<T>()` wrapper, all types defined here
- State: Zustand stores in `lib/stores/` (project, wizard, decision, clarification, task)
- Components: `components/ui/` (shadcn), `components/wizard/`, `components/chat/`

## Key Conventions

- Use superpowers for new features and code example research with context7.
- Feature specs go in `docs/features/NN-feature-name.md` (German, numbered, kebab-case)
- Design specs go in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Implementation plans go in `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- Always write the feature doc BEFORE implementing code
- `@Lazy` is used on `ScaffoldContextBuilder` injection in `ProjectService` to break a circular dependency

## Environment Variables

- `OPENAI_API_KEY` — Required for Koog agents (set in shell or docker-compose)
- `NEXT_PUBLIC_API_URL` — Frontend API base URL (default: `http://localhost:8080`)
- `app.data-path` — Backend data directory (default: `./data`)

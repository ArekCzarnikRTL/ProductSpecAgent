# Feature 0: Project Setup

## Zusammenfassung
Technisches Scaffolding des Monorepos mit Frontend (Next.js) und Backend (Kotlin/Spring Boot), Docker Compose Setup, Auth-Grundgerüst und Dev-Workflow.

## Tech-Stack
- **Backend**: Kotlin 2.2, Spring Boot 4, Gradle, JetBrains Koog
- **Frontend**: Next.js (App Router), React, TypeScript, shadcn/ui, Rete.js
- **Deployment**: Docker Compose (Self-hosted)
- **Auth**: Spring Security + JWT
- **Persistenz**: Filesystem/Git (keine Datenbank)

## Repo-Layout
```
ProductSpecAgent/
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # shadcn/ui + eigene Components
│   │   ├── lib/               # API Client, Utilities
│   │   └── features/          # Feature-Module
│   └── Dockerfile
├── backend/
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── src/main/kotlin/com/agentwork/productspecagent/
│   │   ├── api/               # REST Controller
│   │   ├── domain/            # Domain-Modelle
│   │   ├── agent/             # Koog Agent-Logik
│   │   ├── auth/              # Authentifizierung
│   │   └── export/            # Git/File Export
│   └── Dockerfile
├── docs/
├── docker-compose.yml
├── README.md
└── .gitignore
```

## User Stories
1. Als Entwickler möchte ich mit einem einzigen `docker-compose up` das gesamte System starten können.
2. Als Entwickler möchte ich Frontend und Backend unabhängig voneinander entwickeln können (Hot-Reload).
3. Als Entwickler möchte ich eine klare Ordnerstruktur, die sofort zeigt wo was hingehört.

## Acceptance Criteria
- [ ] `docker-compose up` startet Frontend (Port 3000) und Backend (Port 8080)
- [ ] Frontend zeigt eine Startseite mit shadcn/ui-Styling
- [ ] Backend antwortet auf `GET /api/health` mit `200 OK`
- [ ] Frontend kann Backend über REST erreichen (CORS konfiguriert)
- [ ] Koog-Dependency ist im Gradle Build eingebunden
- [ ] JWT-basierte Auth-Middleware ist vorbereitet (Login-Endpoint existiert)

## Abhängigkeiten
Keine — dies ist das Basis-Feature.

## Aufwand
L (Large)

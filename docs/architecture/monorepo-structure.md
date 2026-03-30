# Architecture: Monorepo-Struktur

## Überblick
Product-Spec-Agent ist als Monorepo organisiert mit zwei Hauptmodulen: `frontend/` (Next.js) und `backend/` (Kotlin/Spring Boot).

## Verzeichnisstruktur

```
ProductSpecAgent/
├── frontend/                  # Next.js App
│   ├── package.json
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/               # Next.js App Router (Pages, Layouts)
│   │   ├── components/        # shadcn/ui + eigene Components
│   │   ├── lib/               # API Client, Utilities, Types
│   │   └── features/          # Feature-Module (spec-flow, decisions, etc.)
│   └── Dockerfile
├── backend/                   # Kotlin/Spring Boot
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   ├── src/
│   │   ├── main/kotlin/com/agentwork/productspecagent/
│   │   │   ├── api/           # REST Controller
│   │   │   ├── domain/        # Domain-Modelle (Project, Spec, Task, Decision)
│   │   │   ├── agent/         # Koog Agent-Pipelines
│   │   │   ├── auth/          # JWT Auth, User Management
│   │   │   ├── export/        # Git/File Export + Handoff
│   │   │   └── storage/       # Filesystem-Persistenz
│   │   └── main/resources/
│   │       ├── application.yml
│   │       └── templates/     # Export/Handoff Templates
│   └── Dockerfile
├── data/                      # Runtime-Daten (gitignored)
│   └── projects/              # Projekt-Verzeichnisse
├── docs/                      # Dokumentation
│   ├── features/              # Feature-Spezifikationen (00-08)
│   ├── architecture/          # Architektur-Dokumente
│   ├── backend/               # Backend-spezifische Docs
│   └── frontend/              # Frontend-spezifische Docs
├── docker-compose.yml
├── README.md
└── .gitignore
```

## Konventionen
- Frontend und Backend haben jeweils eigene Dependency-Management (npm / Gradle)
- Shared Types werden nicht geteilt — der Frontend API-Client wird aus der REST-API-Dokumentation generiert
- `data/` ist gitignored und enthält Runtime-Daten (Projekte, User-Files)

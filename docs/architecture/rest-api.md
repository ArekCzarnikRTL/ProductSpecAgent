# Architecture: REST API Design

## Überblick
RESTful API mit Prefix `/api/v1/`. JSON Request/Response Bodies.

## Endpoints

### Auth
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registrieren |
| POST | `/api/v1/auth/login` | Login, JWT erhalten |
| POST | `/api/v1/auth/refresh` | Token erneuern |

### Projects
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/projects` | Alle Projekte des Users |
| POST | `/api/v1/projects` | Neues Projekt erstellen |
| GET | `/api/v1/projects/{id}` | Projekt-Details |
| PUT | `/api/v1/projects/{id}` | Projekt aktualisieren |
| DELETE | `/api/v1/projects/{id}` | Projekt löschen |

### Spec Flow
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/flow` | Aktueller Flow-Status |
| POST | `/api/v1/projects/{id}/agent/chat` | Agent-Interaktion |

### Decisions
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/decisions` | Alle Decisions |
| POST | `/api/v1/projects/{id}/decisions` | Decision treffen |
| GET | `/api/v1/projects/{id}/decisions/{did}` | Einzelne Decision |

### Clarifications
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/clarifications` | Alle Clarifications |
| POST | `/api/v1/projects/{id}/clarifications/{cid}` | Clarification beantworten |

### Tasks
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/v1/projects/{id}/tasks` | Alle Tasks |
| POST | `/api/v1/projects/{id}/tasks/generate` | Tasks aus Spec generieren |
| PUT | `/api/v1/projects/{id}/tasks/{tid}` | Task bearbeiten |
| DELETE | `/api/v1/projects/{id}/tasks/{tid}` | Task löschen |

### Export & Handoff
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | `/api/v1/projects/{id}/export` | Git-Repo Export |
| POST | `/api/v1/projects/{id}/handoff/preview` | Handoff-Preview |
| POST | `/api/v1/projects/{id}/handoff/export` | Handoff Export |

### System
| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| GET | `/api/health` | Health Check |

## Error Format
```json
{
  "error": "NOT_FOUND",
  "message": "Project not found",
  "timestamp": "2026-03-30T12:00:00Z"
}
```

## CORS
- Erlaubte Origins: `http://localhost:3000` (Dev), konfigurierbar via `application.yml`
- Erlaubte Methods: GET, POST, PUT, DELETE, OPTIONS

# Architecture: Persistenz (Filesystem/Git)

## Überblick
Alle Daten werden als JSON/Markdown-Dateien im Filesystem gespeichert. Keine Datenbank. Optionales Git-Tracking für Versionshistorie.

## Verzeichnisstruktur

```
data/
├── users/
│   └── {user-id}.json              # User-Profil, gehashtes Passwort
├── projects/
│   └── {project-id}/
│       ├── project.json             # Metadaten (Name, Owner, Status, Members)
│       ├── members.json             # Projekt-Mitgliedschaften mit Rollen
│       ├── flow-state.json          # Aktueller Stand im Node-Graph
│       ├── spec/
│       │   ├── idea.md              # Ursprüngliche Idee
│       │   ├── problem.md           # Problemdefinition
│       │   ├── target-audience.md   # Zielgruppe
│       │   ├── scope.md             # Scope-Definition
│       │   ├── mvp.md               # MVP-Definition
│       │   └── full-spec.md         # Vollständige Spezifikation
│       ├── decisions/
│       │   └── {decision-id}.json   # Entscheidung mit Optionen, Wahl, Begründung
│       ├── clarifications/
│       │   └── {clarification-id}.json  # Rückfrage mit Status, Antwort
│       └── tasks/
│           └── {task-id}.json       # Task mit Titel, Beschreibung, Status, Links
```

## Datei-Formate

### project.json
```json
{
  "id": "uuid",
  "name": "Projektname",
  "ownerId": "user-uuid",
  "status": "in_progress",
  "createdAt": "2026-03-30T12:00:00Z",
  "updatedAt": "2026-03-30T14:00:00Z"
}
```

### Spec-Dateien (Markdown mit Frontmatter)
```markdown
---
step: "problem"
status: "completed"
updatedAt: "2026-03-30T12:00:00Z"
---
# Problemdefinition
...
```

### Git-Tracking (optional)
- Jedes Projekt-Verzeichnis kann als Git-Repo initialisiert werden
- Jede Änderung wird automatisch committed mit beschreibender Message
- Ermöglicht Undo/Redo und Versionsvergleich

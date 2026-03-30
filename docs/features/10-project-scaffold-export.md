# Feature 10: Project Scaffold Export

## Zusammenfassung
Beim Export oder Handoff eines Projekts wird automatisch eine vollstaendige Docs-Grundstruktur angelegt, die der Struktur des Product-Spec-Agent Projekts selbst entspricht. Jedes exportierte Projekt erhaelt die Ordner `docs/architecture`, `docs/backend`, `docs/features`, `docs/frontend` sowie eine `00-feature-set-overview.md` mit der gleichen tabellarischen Struktur wie im Quellprojekt.

## User Stories
1. Als PO moechte ich, dass mein exportiertes Projekt sofort eine professionelle Docs-Struktur hat, ohne sie manuell anlegen zu muessen.
2. Als PO moechte ich eine Feature-Uebersicht (`00-feature-set-overview.md`) mit allen generierten Features, Abhaengigkeiten und Aufwandsschaetzungen.
3. Als PO moechte ich, dass Architecture-Docs automatisch aus meinen Spec-Schritten und Decisions abgeleitet werden.

## Acceptance Criteria
- [ ] Export erzeugt folgende Verzeichnisstruktur im ZIP:
  ```
  project-name/
  ├── docs/
  │   ├── architecture/
  │   │   └── overview.md
  │   ├── backend/
  │   │   └── .gitkeep
  │   ├── features/
  │   │   ├── 00-feature-set-overview.md
  │   │   ├── 01-feature-name.md
  │   │   ├── 02-feature-name.md
  │   │   └── ...
  │   └── frontend/
  │       └── .gitkeep
  ├── CLAUDE.md
  ├── AGENTS.md
  ├── SPEC.md
  ├── PLAN.md
  ├── ...
  ```
- [ ] `00-feature-set-overview.md` hat die gleiche Tabellenstruktur wie das Quellprojekt:
  - Feature-Nummer, Name, Datei-Link, Abhaengigkeiten, Aufwand
  - Architecture Docs Tabelle
  - Tech-Stack Sektion
- [ ] Jeder Task vom Typ EPIC wird als eigenes Feature-Dokument exportiert (`01-feature-name.md`)
- [ ] Feature-Dokumente enthalten: Zusammenfassung, User Stories (aus Subtasks), Acceptance Criteria, Technische Details, Abhaengigkeiten, Aufwand
- [ ] `docs/architecture/overview.md` wird aus resolved Decisions und Spec-Inhalten generiert
- [ ] Leere Ordner (`backend/`, `frontend/`) erhalten `.gitkeep` Dateien

## Technische Details
- **Backend**: Erweiterung des `ExportService` und `HandoffService` um Docs-Scaffold-Generierung
- **Frontend**: Option im Export-Dialog und Handoff-Dialog: "Include docs scaffold"
- **API**: Bestehende Export/Handoff-Endpoints erhalten neues Flag `includeDocsScaffold: Boolean`

### Generierungslogik

#### Feature-Uebersicht (`00-feature-set-overview.md`)
Wird aus den EPIC-Tasks generiert:
```markdown
# Feature Set: {Projektname}

Jedes Feature ist eine eigenstaendige, implementierbare Einheit.

## Reihenfolge

| # | Feature | Datei | Abhaengig von | Aufwand |
|---|---------|-------|---------------|---------|
| 1 | {Epic Title} | [01-{slug}.md](01-{slug}.md) | — | {Estimate} |
| 2 | {Epic Title} | [02-{slug}.md](02-{slug}.md) | Feature 1 | {Estimate} |

## Architecture Docs

| Thema | Datei |
|-------|-------|
| Uebersicht | [../architecture/overview.md](../architecture/overview.md) |

## Tech-Stack

{Aus Spec/Decisions abgeleitet}
```

#### Feature-Dokumente (`01-feature-name.md`)
Pro EPIC-Task ein Dokument:
```markdown
# Feature {N}: {Epic Title}

## Zusammenfassung
{Epic Description}

## User Stories
{Aus STORY-Subtasks generiert}

## Acceptance Criteria
{Aus TASK-Subtasks generiert als Checkbox-Liste}

## Technische Details
{Aus Task-Beschreibungen}

## Abhaengigkeiten
{Aus Task-Dependencies}

## Aufwand
{Epic Estimate}
```

#### Architecture Overview (`docs/architecture/overview.md`)
Aus Decisions und Spec-Schritten:
```markdown
# Architecture Overview: {Projektname}

## Entscheidungen
{Resolved Decisions als Tabelle}

## Scope
{Aus scope.md Spec-Schritt}

## MVP
{Aus mvp.md Spec-Schritt}
```

## Abhaengigkeiten
- Feature 5 (Git-Repository Output)
- Feature 8 (Agent-ready Handoff)
- Feature 4 (Spec + Plan + Tasks)

## Aufwand
M (Medium)

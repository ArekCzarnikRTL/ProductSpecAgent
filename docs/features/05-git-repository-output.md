# Feature 5: Git-Repository Output

## Zusammenfassung
Die gesamte Produktspezifikation (Spec, Plan, Tasks, Entscheidungen) wird als sauber strukturiertes Git-Repository exportiert. Das Ergebnis ist direkt nutzbar für Claude Code, Codex oder andere AI-Coding-Agents.

## User Stories
1. Als PO möchte ich meine fertige Spec als Git-Repository exportieren können.
2. Als PO möchte ich wählen können, welche Artefakte im Export enthalten sind.
3. Als PO möchte ich, dass das exportierte Repo eine klare README und Verzeichnisstruktur hat, die AI-Agents sofort verstehen.

## Acceptance Criteria
- [ ] Export-Button erzeugt ein `.zip` oder initialisiert ein lokales Git-Repo
- [ ] Export enthält: `SPEC.md`, `PLAN.md`, `tasks/`, `decisions/`, `README.md`
- [ ] README beschreibt das Projekt, den Tech-Stack und verweist auf die Spec
- [ ] Dateien folgen einem konsistenten Markdown-Format mit Frontmatter
- [ ] Export ist konfigurierbar (welche Artefakte, welches Format)
- [ ] Exportiertes Repo ist sofort `git init`-fähig mit sinnvoller `.gitignore`

## Technische Details
- **Backend**: Export-Service generiert Verzeichnisstruktur und ZIP
- **Frontend**: Export-Dialog mit Konfigurationsoptionen
- **API**: `POST /api/v1/projects/{id}/export` (Returns ZIP oder Pfad)
- **Persistenz**: Export-Templates unter `backend/src/main/resources/templates/export/`

## Abhängigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)
- Feature 4 (Spec + Plan + Tasks)

## Aufwand
M (Medium)

# Feature 9: Spec File Explorer

## Zusammenfassung
Der Spec File Explorer zeigt in Echtzeit den generierten Spec File an, waehrend der User seinen Agent-Graphen baut. Er besteht aus Activity Bar, Explorer Panel, Spec File Viewer Modal und einem Status-System, das den Zustand der generierten Dateien anzeigt.

## User Stories
1. Als PO moechte ich jederzeit sehen, welche Dateien mein Spec-Projekt enthaelt, waehrend ich im Agent-Flow arbeite.
2. Als PO moechte ich einzelne generierte Dateien oeffnen und mit Syntax Highlighting lesen koennen.
3. Als PO moechte ich auf einen Blick erkennen, ob meine Spec-Dateien aktuell, veraltet oder ungueltig sind.

## Acceptance Criteria
- [ ] Activity Bar (40px, links) mit Toggle-Button fuer das Explorer-Panel, aktiver Zustand farblich hervorgehoben
- [ ] Explorer Panel (240px Sidebar) mit Status-Badge im Header: idle, generating (Spinner), valid (gruen), stale (gelb), invalid (rot)
- [ ] File Tree im Explorer Panel — rekursiv, Ordner zuerst, Dateien danach, auf-/zuklappbar
- [ ] Klick auf Datei oeffnet Spec File Viewer Modal
- [ ] Spec File Viewer Modal (720px Overlay) mit Tab-Leiste — mehrere Dateien gleichzeitig offen, einzeln schliessbar
- [ ] Syntax Highlighting via Shiki (one-dark-pro Theme) fuer Kotlin, Groovy, Dockerfile, YAML, Properties, Markdown, JSON
- [ ] Footer im Viewer mit Sprache, Zeilenanzahl, UTF-8 Badge
- [ ] Modal schliessbar per Escape, Backdrop-Klick oder Tab-X
- [ ] File Tree aktualisiert sich automatisch wenn neue Spec-Schritte abgeschlossen werden

## Technische Details

### Frontend-Komponenten

| Komponente | Beschreibung |
|-----------|-------------|
| `ActivityBar` | Vertikale Icon-Leiste (40px), Toggle fuer Explorer Panel |
| `ExplorerPanel` | 240px Sidebar mit Status-Badge Header + File Tree |
| `FileTree` | Rekursive Baumansicht: Ordner auf-/zuklappbar, Dateien klickbar |
| `SpecFileViewer` | Modal (720px) mit Tab-Leiste, Syntax Highlighting, Footer |

### Status-System

| Status | Badge | Bedeutung |
|--------|-------|-----------|
| `idle` | Grau | Kein Spec generiert |
| `generating` | Spinner | Spec wird gerade generiert |
| `valid` | Gruen | Alle Dateien aktuell |
| `stale` | Gelb | Flow hat sich geaendert, Dateien veraltet |
| `invalid` | Rot | Fehler in der Generierung |

### Syntax Highlighting
- **Bibliothek:** Shiki (one-dark-pro Theme)
- **Unterstuetzte Sprachen:** Kotlin, Groovy, Dockerfile, YAML, Properties, Markdown, JSON, TypeScript

### API
- `GET /api/v1/projects/{id}/files` — Liste aller Dateien im Projekt-Verzeichnis (rekursiv)
- `GET /api/v1/projects/{id}/files/{path}` — Inhalt einer einzelnen Datei

### Persistenz
Keine zusaetzliche Persistenz — liest direkt aus dem bestehenden `data/projects/{id}/` Verzeichnis.

## Abhaengigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)
- Feature 6 (Beautiful UI)

## Aufwand
L (Large)

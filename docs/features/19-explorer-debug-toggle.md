N# Feature 19: Debug-Toggle im Explorer

## Zusammenfassung
Der File Explorer blendet standardmaessig alle internen/technischen Dateien aus: `*.json`-Dateien sowie die Ordner `clarifications`, `decisions` und `tasks`. Ein Debug-Toggle (Bug-Icon) im Explorer-Header macht diese Dateien bei Bedarf wieder sichtbar. Damit sieht der User im Normalfall nur die inhaltlich relevanten Spec-Dokumente, kann aber jederzeit in den Debug-Modus wechseln um die volle Projektstruktur zu inspizieren.

Ersetzt Feature 15 (statisches Backend-Filtering) durch flexibles Frontend-Filtering mit Toggle.

## User Stories
1. Als PO moechte ich im Explorer nur inhaltlich relevante Dateien sehen (keine JSON-Konfiguration, keine internen Ordner), damit ich mich auf den Spec-Inhalt konzentrieren kann.
2. Als Entwickler moechte ich per Debug-Toggle alle Dateien einblenden koennen (inkl. `flow-state.json`, `project.json`, `wizard.json`), damit ich den internen Zustand inspizieren kann.

## Acceptance Criteria
- [ ] Standardmaessig (Debug aus) sind alle `*.json`-Dateien im Explorer unsichtbar
- [ ] Standardmaessig sind die Ordner `clarifications`, `decisions`, `tasks` unsichtbar
- [ ] Ein Bug-Icon-Button im Explorer-Header toggelt den Debug-Modus
- [ ] Bei Debug an: Button wird amber/gelb hervorgehoben, Tooltip zeigt "Debug: An"
- [ ] Bei Debug an: Alle Dateien und Ordner sind sichtbar (inkl. JSON, Steuerungsordner)
- [ ] Bei Debug aus: Tooltip zeigt "Debug: Aus"
- [ ] Die Filterung ist rekursiv — auch JSON-Dateien in Unterordnern werden gefiltert
- [ ] Backend liefert alle Dateien (keine serverseitige Filterung mehr)
- [ ] Direkter Dateizugriff via API bleibt uneingeschraenkt funktionsfaehig

## Technische Details

### Backend

**Aenderung in `FileController.kt`**

Das bisherige `hiddenFiles`-Set und die Root-Level-Filterung in `buildTree()` werden entfernt. Das Backend liefert nun alle Dateien uneingeschraenkt ans Frontend.

### Frontend

**Aenderung in `ExplorerPanel.tsx`**

- Neuer State `debug` (default: `false`)
- `filterEntries(entries, debug)` Funktion filtert rekursiv:
  - `*.json` Dateien ausblenden wenn `!debug`
  - Ordner `clarifications`, `decisions`, `tasks` (case-insensitive) ausblenden wenn `!debug`
  - Bei `debug === true`: keine Filterung, alles sichtbar
- Debug-Toggle-Button (Bug-Icon von lucide-react) im Header neben Refresh-Button
- Amber-Farbe bei aktivem Debug-Modus via `cn()` utility

### Kein neuer State-Store noetig
Der Debug-Zustand ist lokal im ExplorerPanel und muss nicht persistiert werden.

## Abhaengigkeiten
- Feature 9 (Spec File Explorer) — Explorer-Grundstruktur
- Ersetzt Feature 15 (Hide Internal Files) — Backend-Filterung wird durch Frontend-Filterung abgeloest

## Aufwand
S (Small)

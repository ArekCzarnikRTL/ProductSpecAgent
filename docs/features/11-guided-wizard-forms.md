# Feature 11: Guided Wizard Forms

## Zusammenfassung
Der Rete.js Node-Graph im Workspace wird durch einen horizontalen Step-Indicator mit gefuehrten Formularen ersetzt. 10 Schritte fuehren den User durch den gesamten Spec-Prozess: 6 Spec-Schritte (Idee, Problem, Zielgruppe, Scope, MVP, Spec) und 4 Projekt-Schritte (Features, Architektur, Backend, Frontend). Jeder Schritt hat spezialisierte Formularfelder mit Chip-Auswahl, Tag-Listen und AI-Unterstuetzung.

## User Stories
1. Als PO moechte ich Schritt fuer Schritt durch den Spec-Prozess gefuehrt werden, mit klaren Formularfeldern pro Schritt.
2. Als PO moechte ich bei technischen Entscheidungen (Architektur, Backend, Frontend) aus vordefinierten Optionen waehlen koennen.
3. Als PO moechte ich den Fortschritt meiner Spec im Step-Indicator sehen und zwischen Schritten navigieren koennen.
4. Als PO moechte ich, dass der Agent mir bei jedem Schritt kontextbezogen hilft.

## Acceptance Criteria
- [ ] Horizontaler Step-Indicator ersetzt den Rete.js Graph im Hauptbereich
- [ ] 10 Schritte: Idee, Problem, Zielgruppe, Scope, MVP, Spec, Features, Architektur, Backend, Frontend
- [ ] Jeder Schritt hat eigene, spezialisierte Formularfelder
- [ ] Step-Indicator zeigt Status pro Schritt: completed (gruen), active (blau), open (grau)
- [ ] Navigation: Zurueck/Weiter Buttons + Klick auf Step-Indicator
- [ ] Chip/Toggle-Auswahl fuer Kategorien, Tech-Stack, Architektur etc.
- [ ] Scope-Schritt: In-Scope/Out-of-Scope Split-View mit Tags
- [ ] MVP-Schritt: Sortierbare Feature-Liste mit Must/Should/Could Prioritaet
- [ ] Spec-Schritt: Auto-generierte Zusammenfassung, editierbar
- [ ] Features-Schritt: Liste mit Add + "Agent vorschlagen lassen" Button
- [ ] Formular-Daten werden im Backend gespeichert und beim Laden wiederhergestellt
- [ ] Chat-Sidebar zeigt kontextbezogene Hilfe pro Schritt

## Prozess-Schritte im Detail

### Step 1: Idee
| Feld | Typ | Required |
|------|-----|----------|
| Produktname | Text Input | Ja |
| Produktidee / Vision | Textarea | Ja |
| Kategorie | Chip-Auswahl (SaaS, Mobile App, CLI Tool, Library, Desktop, API) | Nein |

Tipps-Sidebar mit Hinweisen zur Ideenbeschreibung.

### Step 2: Problem
| Feld | Typ | Required |
|------|-----|----------|
| Kernproblem | Textarea | Ja |
| Wer ist betroffen? | Text Input | Ja |
| Aktuelle Workarounds | Textarea | Nein |
| Auswirkung (Impact) | Chip-Auswahl (Gering, Mittel, Hoch, Kritisch) | Nein |

### Step 3: Zielgruppe
| Feld | Typ | Required |
|------|-----|----------|
| Primaere Zielgruppe | Text Input | Ja |
| Pain Points | Tag-Input (kommasepariert) | Nein |
| Technisches Level | Chip-Auswahl (Nicht-technisch, Technisch, Entwickler) | Nein |
| Sekundaere Zielgruppe | Text Input | Nein |

### Step 4: Scope
| Feld | Typ | Required |
|------|-----|----------|
| In Scope | Tag-Liste (hinzufuegbar, entfernbar) | Ja |
| Out of Scope | Tag-Liste (hinzufuegbar, entfernbar) | Nein |

Split-View: Links gruen (In Scope), rechts rot (Out of Scope).

### Step 5: MVP
| Feld | Typ | Required |
|------|-----|----------|
| MVP-Ziel | Textarea | Ja |
| MVP Features | Sortierbare Liste aus Scope (Drag & Drop, Must/Should/Could) | Ja |
| Erfolgskriterien | Textarea | Nein |

### Step 6: Spec (Zusammenfassung)
| Feld | Typ | Required |
|------|-----|----------|
| Generierte Spec | Editierbarer Markdown-Block | Auto |

Buttons: "Neu generieren" (Agent generiert aus Steps 1-5), "Editieren" (Inline-Edit).

### Step 7: Features
| Feld | Typ | Required |
|------|-----|----------|
| Feature-Liste | Dynamische Liste mit Titel, Beschreibung, Aufwand (XS-XL) | Ja |

Buttons: "+ Feature hinzufuegen", "Agent vorschlagen lassen".

### Step 8: Architektur
| Feld | Typ | Required |
|------|-----|----------|
| System-Architektur | Chip-Auswahl (Monolith, Microservices, Serverless) | Ja |
| Datenbank | Chip-Auswahl (PostgreSQL, MongoDB, SQLite, Filesystem, Redis) | Ja |
| Deployment | Chip-Auswahl (Docker, Vercel+Cloud, Self-hosted, Kubernetes) | Ja |
| Architektur-Notizen | Textarea | Nein |

### Step 9: Backend
| Feld | Typ | Required |
|------|-----|----------|
| Sprache / Framework | Chip-Auswahl (Kotlin+Spring, Node+Express, Python+FastAPI, Go, Rust) | Ja |
| API-Stil | Chip-Auswahl (REST, GraphQL, gRPC) | Ja |
| Auth-Methode | Chip-Auswahl (JWT, Session, OAuth, API Key) | Ja |

### Step 10: Frontend
| Feld | Typ | Required |
|------|-----|----------|
| Framework | Chip-Auswahl (Next.js+React, Vue+Nuxt, Svelte, Angular) | Ja |
| UI Library | Chip-Auswahl (shadcn/ui, Material UI, Ant Design, Custom) | Nein |
| Styling | Chip-Auswahl (Tailwind CSS, CSS Modules, Styled Components) | Nein |
| Theme | Chip-Auswahl (Dark only, Light only, Both) | Nein |

## Technische Details

### Layout
- Step-Indicator: horizontale Leiste oben im Hauptbereich (ersetzt Rete.js Graph)
- Formular: volle Breite des Hauptbereichs, scrollbar
- Rechte Sidebar: Chat + Tabs bleiben unveraendert
- Activity Bar + Explorer: bleiben unveraendert

### Backend
- Neues Datenmodell `WizardData` — speichert Formular-Eingaben pro Schritt als JSON
- Persistenz in `data/projects/{id}/wizard.json`
- API: `GET/PUT /api/v1/projects/{id}/wizard` — lesen/speichern der Wizard-Daten
- Erweiterte FlowStepType um 4 neue Steps: FEATURES, ARCHITECTURE, BACKEND, FRONTEND

### Frontend
- Neue Komponente `StepIndicator` — horizontale Stepper-Leiste
- Neue Komponente `WizardForm` — rendert das richtige Formular pro Schritt
- 10 Step-Formulare als eigene Komponenten
- Neue Komponente `ChipSelect` — wiederverwendbare Chip-Auswahl
- Neue Komponente `TagInput` — Input mit Tags (hinzufuegen/entfernen)
- Zustand: `wizard-store.ts` — Wizard-State mit auto-save (Debounce)

### Interaktion mit bestehendem System
- Formular-Eingaben ersetzen den bisherigen Chat-basierten Spec-Flow
- Der Chat-Agent wird zum Assistenten: hilft bei Fragen, gibt Vorschlaege
- Beim "Weiter"-Klick: Daten werden gespeichert, Step wird als COMPLETED markiert
- Spec-Schritt (6) nutzt den Agent zum Auto-Generieren der Zusammenfassung
- Features-Schritt (7) erstellt automatisch EPIC-Tasks im TaskService

## Abhaengigkeiten
- Feature 0 (Project Setup)
- Feature 1 (Idea-to-Spec Flow)
- Feature 4 (Spec + Plan + Tasks)
- Feature 6 (Beautiful UI)

## Aufwand
XL (Extra Large)

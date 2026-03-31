# Feature 12: Dynamische Wizard-Steps

## Zusammenfassung
Die Kategorie-Auswahl in Step 1 (Idee) bestimmt dynamisch, welche Steps im Wizard sichtbar sind und welche Felder sie enthalten. Steps 1-6 (Idee, Problem, Zielgruppe, Scope, MVP, Spec) bleiben fuer alle Kategorien gleich. Steps 7-10 (Features, Architektur, Backend, Frontend) werden basierend auf der Kategorie ein- oder ausgeblendet, und ihre Formular-Felder passen sich kategorie-spezifisch an. Die Anpassung passiert live bei Kategorie-Auswahl im StepIndicator.

## User Stories
1. Als PO moechte ich, dass der Wizard nur die Steps zeigt, die fuer meine Produktkategorie relevant sind, damit ich keine irrelevanten Schritte ausfuellen muss.
2. Als PO moechte ich, dass die Formular-Felder in den technischen Steps (Architektur, Backend, Frontend) zur gewaehlten Kategorie passen, damit ich sinnvolle Optionen zur Auswahl habe.
3. Als PO moechte ich sofort sehen, wie sich der Wizard anpasst, wenn ich die Kategorie aendere.
4. Als PO moechte ich die Kategorie nachtraeglich aendern koennen, ohne dass bereits eingegebene Daten verloren gehen.

## Acceptance Criteria
- [ ] Kategorie-Auswahl in Step 1 bestimmt sichtbare Steps im StepIndicator — Aenderung passiert live
- [ ] Steps 1-6 sind immer sichtbar, unabhaengig von der Kategorie
- [ ] Steps 7-10 werden pro Kategorie ein-/ausgeblendet (siehe Step-Sichtbarkeits-Matrix)
- [ ] Formular-Felder in Steps 8-10 zeigen kategorie-spezifische Chip-Optionen
- [ ] StepIndicator-Nummerierung passt sich dynamisch an (z.B. Library: Steps 1-7 statt 1-10)
- [ ] "Weiter"/"Abschliessen" Button erkennt den letzten sichtbaren Step korrekt
- [ ] Kategorie-Wechsel blendet Steps aus, loescht aber keine gespeicherten Daten
- [ ] Ohne Kategorie-Auswahl werden alle Steps angezeigt (Fallback)

## Step-Sichtbarkeits-Matrix

| Kategorie    | 1-6 (Spec) | 7 Features | 8 Architektur | 9 Backend | 10 Frontend |
|-------------|------------|------------|---------------|-----------|-------------|
| SaaS        | alle       | ja         | ja            | ja        | ja          |
| Mobile App  | alle       | ja         | ja            | ja        | ja          |
| Desktop App | alle       | ja         | ja            | ja (opt.) | ja          |
| CLI Tool    | alle       | ja         | ja             | nein      | nein        |
| Library     | alle       | ja         | nein          | nein      | nein        |
| API         | alle       | ja         | ja            | ja        | nein        |

## Kategorie-spezifische Felder

### Step 7: Features (alle Kategorien — gleiche Felder)
Keine Aenderung. Feature-Liste mit Titel, Beschreibung, Aufwand (XS-XL).

### Step 8: Architektur

**SaaS**
| Feld | Optionen |
|------|----------|
| System-Architektur | Monolith, Microservices, Serverless |
| Datenbank | PostgreSQL, MongoDB, SQLite, Redis |
| Deployment | Docker, Vercel+Cloud, Kubernetes |
| Architektur-Notizen | Textarea |

**Mobile App**
| Feld | Optionen |
|------|----------|
| System-Architektur | Monolith, Microservices, Serverless |
| Datenbank | PostgreSQL, MongoDB, SQLite, Firebase |
| Deployment | App Store, Play Store, TestFlight |
| Architektur-Notizen | Textarea |

**Desktop App**
| Feld | Optionen |
|------|----------|
| System-Architektur | Monolith, Plugin-basiert |
| Datenbank | SQLite, PostgreSQL, Filesystem |
| Deployment | Installer, App Store, Portable |
| Architektur-Notizen | Textarea |

**CLI Tool**
| Feld | Optionen |
|------|----------|
| System-Architektur | Single Binary, Multi-Command |
| Datenbank | Filesystem, SQLite |
| Deployment | npm/pip/brew, Binary Release |
| Architektur-Notizen | Textarea |

**API**
| Feld | Optionen |
|------|----------|
| System-Architektur | Monolith, Microservices, Serverless |
| Datenbank | PostgreSQL, MongoDB, Redis |
| Deployment | Docker, Vercel+Cloud, Kubernetes |
| Architektur-Notizen | Textarea |

### Step 9: Backend

**SaaS**
| Feld | Optionen |
|------|----------|
| Sprache / Framework | Kotlin+Spring, Node+Express, Python+FastAPI, Go, Rust |
| API-Stil | REST, GraphQL, gRPC |
| Auth-Methode | JWT, Session, OAuth, API Key |

**Mobile App**
| Feld | Optionen |
|------|----------|
| Sprache / Framework | Kotlin+Spring, Node+Express, Python+FastAPI, Go |
| API-Stil | REST, GraphQL |
| Auth-Methode | JWT, OAuth, API Key |

**Desktop App**
| Feld | Optionen |
|------|----------|
| Sprache / Framework | Kotlin+Spring, Node+Express, Python+FastAPI |
| API-Stil | REST, IPC |
| Auth-Methode | OAuth, Local Auth |

**API**
| Feld | Optionen |
|------|----------|
| Sprache / Framework | Kotlin+Spring, Node+Express, Python+FastAPI, Go, Rust |
| API-Stil | REST, GraphQL, gRPC |
| Auth-Methode | JWT, OAuth, API Key |

### Step 10: Frontend

**SaaS**
| Feld | Optionen |
|------|----------|
| Framework | Next.js+React, Vue+Nuxt, Svelte, Angular |
| UI Library | shadcn/ui, Material UI, Ant Design, Custom |
| Styling | Tailwind CSS, CSS Modules, Styled Components |
| Theme | Dark only, Light only, Both |

**Mobile App**
| Feld | Optionen |
|------|----------|
| Framework | React Native, Flutter, SwiftUI, Kotlin Multiplatform |
| UI Library | Native Components, React Native Paper, Custom |
| Styling | StyleSheet, NativeWind, Styled Components |
| Theme | System Default, Dark only, Light only, Both |

**Desktop App**
| Feld | Optionen |
|------|----------|
| Framework | Electron, Tauri, SwiftUI, WPF |
| UI Library | Native Components, shadcn/ui, Custom |
| Styling | Tailwind CSS, Native Styling, CSS Modules |
| Theme | System Default, Dark only, Light only, Both |

## Technische Details

### Datenmodell: `CATEGORY_STEP_CONFIG`

Zentrale Konfiguration als Konstante im Frontend, die pro Kategorie definiert:
- Welche Steps sichtbar sind
- Welche Chip-Optionen pro Feld verfuegbar sind

```typescript
type CategoryConfig = {
  visibleSteps: string[];        // z.B. ["IDEA", "PROBLEM", ..., "FEATURES"]
  fieldOptions: {
    [stepKey: string]: {         // z.B. "ARCHITECTURE"
      [fieldKey: string]: string[];  // z.B. "database": ["PostgreSQL", "MongoDB"]
    };
  };
};

const CATEGORY_STEP_CONFIG: Record<string, CategoryConfig> = {
  "SaaS": { visibleSteps: [...], fieldOptions: { ... } },
  "CLI Tool": { visibleSteps: [...], fieldOptions: { ... } },
  // ...
};
```

### Frontend-Aenderungen

**`wizard-store.ts`**
- Neue Funktion `getVisibleSteps(category: string)` — gibt gefilterte Step-Liste zurueck
- Navigation (goNext, goPrev) nutzt `getVisibleSteps()` statt statisches `WIZARD_STEPS`
- `completeStep()` bestimmt naechsten Step basierend auf sichtbaren Steps

**`StepIndicator.tsx`**
- Bekommt `visibleSteps` statt `WIZARD_STEPS`
- Nummerierung: fortlaufend basierend auf sichtbare Steps (1, 2, 3... nicht 1, 2, 3, 7)

**`WizardForm.tsx`**
- `isLast` basiert auf letztem sichtbaren Step
- Liest Kategorie aus `data.steps["IDEA"]?.fields?.category`

**Step-Formulare (ArchitectureForm, BackendForm, FrontendForm)**
- Lesen Kategorie aus Wizard-Daten
- Chip-Optionen kommen aus `CATEGORY_STEP_CONFIG[category].fieldOptions[step]`
- Fallback auf Default-Optionen wenn keine Kategorie gewaehlt

**`IdeaForm.tsx`**
- Keine strukturelle Aenderung — Kategorie-Auswahl triggert `updateField()`, Store reagiert

### Backend-Aenderungen
- Keine strukturellen Aenderungen noetig
- Backend speichert Wizard-Daten als flexibles JSON (`Map<String, Any>`)
- Daten ausgeblendeter Steps bleiben in `wizard.json` erhalten
- Optionale Validierung: Backend kann Step-Kategorie-Zuordnung pruefen

### Verhalten bei Kategorie-Wechsel
1. User aendert Kategorie in Step 1 (z.B. SaaS → CLI Tool)
2. `updateField("IDEA", "category", "CLI Tool")` wird aufgerufen
3. `getVisibleSteps("CLI Tool")` gibt reduzierte Step-Liste zurueck
4. StepIndicator rendert nur sichtbare Steps (1-8 statt 1-10)
5. Daten von Backend-Step und Frontend-Step bleiben in `wizard.json`
6. Wechselt User zurueck auf SaaS, erscheinen die Steps wieder mit ihren gespeicherten Daten

## Abhaengigkeiten
- Feature 11 (Guided Wizard Forms) — Wizard-Grundstruktur, Step-Formulare, wizard-store
- Feature 13 (Wizard-Chat Integration) — Chat-Integration muss dynamische Steps beruecksichtigen

## Aufwand
M (Medium)

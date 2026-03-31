# Feature 16: SPEC-Step entfernen, Zusammenfassung am Ende

## Zusammenfassung
Der SPEC-Step (bisher Step 6 im Wizard) wird entfernt. Er war ein manueller Zusammenfassungs-Schritt, der jetzt automatisiert wird: Beim Klick auf "Abschliessen" auf dem letzten sichtbaren Step generiert der Agent automatisch eine Zusammenfassung aus allen bisherigen Wizard-Daten und speichert sie als `spec.md`. Die Zusammenfassung passiert vor dem Export-Trigger. Da die Step-Reihenfolge dynamisch ist (Feature 12), wird der letzte Step nicht hardcoded, sondern zur Laufzeit bestimmt.

## User Stories
1. Als PO moechte ich keinen separaten Zusammenfassungs-Schritt ausfuellen muessen, weil der Agent das automatisch aus meinen bisherigen Eingaben generieren kann.
2. Als PO moechte ich, dass am Ende trotzdem eine vollstaendige Spec-Zusammenfassung als `spec.md` existiert, damit der Export ein komplettes Dokument enthaelt.

## Acceptance Criteria
- [ ] SPEC-Step erscheint nicht mehr im Wizard (StepIndicator, WizardForm)
- [ ] SPEC-Step existiert nicht mehr im `FlowStepType` enum
- [ ] Nummerierung der verbleibenden Steps passt sich an (MVP = 5, Features = 6, etc.)
- [ ] Beim Klick auf "Abschliessen" (letzter sichtbarer Step) generiert der Agent eine Zusammenfassung
- [ ] Zusammenfassung wird als `spec.md` in den Spec-Dateien gespeichert
- [ ] Zusammenfassung basiert auf allen Wizard-Daten (alle abgeschlossenen Steps)
- [ ] Export (Feature 10) enthaelt weiterhin eine `SPEC.md` — jetzt automatisch generiert
- [ ] Bestehende Projekte mit SPEC-Step-Daten behalten ihre Daten (kein Datenverlust)
- [ ] `SpecForm.tsx` wird geloescht
- [ ] Alle Referenzen auf SPEC-Step in Frontend und Backend werden entfernt

## Technische Details

### Backend

**`FlowStepType` enum (`FlowState.kt`)**

`SPEC` entfernen:
```kotlin
enum class FlowStepType {
    IDEA, PROBLEM, TARGET_AUDIENCE, SCOPE, MVP,
    FEATURES, ARCHITECTURE, BACKEND, FRONTEND
}
```

**`application.yml` — System-Prompt**

Step 6 "SPEC" aus der Schritt-Liste entfernen. Die Nummerierung der folgenden Steps anpassen.

**`IdeaToSpecAgent.processWizardStep()`**

Beim letzten Step (dynamisch bestimmt via `stepOrder`):
1. Normales Step-Processing wie bisher (Feedback, FlowState-Update)
2. Zusaetzlicher Agent-Call: Zusammenfassung generieren aus allen Wizard-Daten
3. Ergebnis als `spec.md` speichern via `projectService.saveSpecFile()`
4. Dann `exportTriggered = true` setzen (wie bisher)

```kotlin
if (isLastStep) {
    // Generate spec summary from all wizard data
    val allWizardData = wizardService.getWizardData(projectId)
    val summaryPrompt = "Based on all the wizard data below, generate a complete product specification summary in markdown format.\n\n" +
        contextBuilder.buildWizardContext(allWizardData, step, fields)
    val summaryResponse = runAgent(systemPromptWithContext, summaryPrompt)
    projectService.saveSpecFile(projectId, "spec.md", summaryResponse)
}
```

**`createInitialFlowState()`**

Erzeugt keinen SPEC-FlowStep mehr, da `FlowStepType.SPEC` nicht mehr existiert.

### Frontend

**`wizard-store.ts` — `WIZARD_STEPS`**

SPEC-Eintrag entfernen:
```typescript
export const WIZARD_STEPS = [
  { key: "IDEA", label: "Idee" },
  { key: "PROBLEM", label: "Problem" },
  { key: "TARGET_AUDIENCE", label: "Zielgruppe" },
  { key: "SCOPE", label: "Scope" },
  { key: "MVP", label: "MVP" },
  { key: "FEATURES", label: "Features" },
  { key: "ARCHITECTURE", label: "Architektur" },
  { key: "BACKEND", label: "Backend" },
  { key: "FRONTEND", label: "Frontend" },
] as const;
```

**`category-step-config.ts`**

`SPEC` aus `ALL_STEP_KEYS` und `BASE_STEPS` entfernen:
```typescript
export const ALL_STEP_KEYS = [
  "IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP",
  "FEATURES", "ARCHITECTURE", "BACKEND", "FRONTEND",
] as const;

const BASE_STEPS = ["IDEA", "PROBLEM", "TARGET_AUDIENCE", "SCOPE", "MVP", "FEATURES"] as const;
```

**`api.ts` — `StepType`**

`"SPEC"` entfernen:
```typescript
export type StepType = "IDEA" | "PROBLEM" | "TARGET_AUDIENCE" | "SCOPE" | "MVP" | "FEATURES" | "ARCHITECTURE" | "BACKEND" | "FRONTEND";
```

**`WizardForm.tsx` — `FORM_MAP`**

`SPEC: SpecForm` Mapping und Import entfernen.

**`step-field-labels.ts`**

SPEC-Eintrag aus `STEP_FIELD_LABELS` und aus dem `stepLabel`-Mapping in `formatStepFields()` entfernen.

**`editor.ts` (spec-flow)**

SPEC-Eintrag aus der Step-Liste entfernen.

**`SpecForm.tsx`**

Datei loeschen.

### Abwaertskompatibilitaet

- Bestehende `wizard.json`-Dateien mit SPEC-Step-Daten behalten ihre Daten — die Daten werden einfach ignoriert
- Bestehende `flow-state.json` mit SPEC-Step werden beim naechsten Laden ungueltig — der FlowState muss neu initialisiert werden wenn ein unbekannter StepType enthalten ist
- `spec.md` wird jetzt automatisch generiert statt manuell erstellt

## Abhaengigkeiten
- Feature 11 (Guided Wizard Forms) — Wizard-Grundstruktur
- Feature 12 (Dynamische Wizard-Steps) — dynamische Step-Sichtbarkeit bestimmt letzten Step
- Feature 13 (Wizard-Chat Integration) — Zusammenfassung wird beim letzten Step via Agent generiert

## Aufwand
M (Medium)

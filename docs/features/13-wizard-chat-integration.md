# Feature 13: Wizard-Chat Integration

## Zusammenfassung
Wenn der User einen Wizard-Schritt abschliesst (Weiter/Abschliessen), werden die Formular-Daten automatisch als lesbare Nachricht im Chat angezeigt und an einen dedizierten Backend-Endpoint gesendet. Der Agent verarbeitet die Eingaben im Kontext aller bisherigen Steps, antwortet im Chat und wechselt den Wizard automatisch zum naechsten Schritt. Beim letzten Schritt (Frontend, Step 10) stoesst der Agent den Scaffold-Export (Feature 10) an.

## User Stories
1. Als PO moechte ich, dass meine Wizard-Eingaben automatisch im Chat erscheinen, damit ich den Verlauf meiner Spec-Erstellung nachvollziehen kann.
2. Als PO moechte ich, dass der Agent auf meine Eingaben reagiert und mir kontextbezogenes Feedback gibt, bevor der naechste Schritt beginnt.
3. Als PO moechte ich, dass der Agent den naechsten Wizard-Schritt automatisch oeffnet, damit ich nahtlos weiterarbeiten kann.
4. Als PO moechte ich, dass nach dem letzten Schritt automatisch der Projekt-Export angestossen wird.

## Acceptance Criteria
- [ ] Klick auf "Weiter" sendet Formular-Daten als lesbare Nachricht in den Chat
- [ ] Chat zeigt User-Nachricht mit formatierten Feld-Werten (z.B. "Produktname: MeinTool, Kategorie: SaaS")
- [ ] Neuer Endpoint `POST /api/v1/projects/{id}/agent/wizard-step-complete` nimmt Step-Key + Felder entgegen
- [ ] Agent antwortet im Chat mit kontextbezogenem Feedback zum abgeschlossenen Schritt
- [ ] Agent-Response enthaelt `nextStep` — Frontend wechselt den Wizard-Step automatisch
- [ ] `SpecContextBuilder` bezieht Wizard-Daten (alle bisherigen Steps) in den Agent-Kontext ein
- [ ] Waehrend der Agent antwortet, zeigt der Chat einen Loading-Indikator
- [ ] Letzter Schritt (FRONTEND): Agent stoesst Scaffold-Export (Feature 10) an statt naechsten Step zu setzen
- [ ] Letzter Schritt: Response enthaelt `exportTriggered: true`, Frontend zeigt entsprechendes Feedback
- [ ] Fehlerfall: Bei Agent-Fehler bleibt der Wizard auf dem aktuellen Step, Chat zeigt Fehlermeldung

## Technische Details

### Neuer Endpoint

```
POST /api/v1/projects/{id}/agent/wizard-step-complete

Request Body:
{
  "step": "IDEA",
  "fields": {
    "productName": "MeinTool",
    "productIdea": "Ein SaaS Tool fuer...",
    "category": "SaaS"
  }
}

Response Body:
{
  "message": "Gute Idee! Ich sehe du planst ein SaaS Tool...",
  "nextStep": "PROBLEM",
  "exportTriggered": false
}
```

- `nextStep` ist `null` beim letzten Step (FRONTEND)
- `exportTriggered` ist `true` nur beim letzten Step

### Backend

**Neuer Controller: `WizardChatController`**
- Endpoint `POST /{id}/agent/wizard-step-complete`
- Nimmt `WizardStepCompleteRequest(step: String, fields: Map<String, Any>)` entgegen
- Delegiert an `IdeaToSpecAgent` mit neuer Methode `processWizardStep()`

**Erweiterung `IdeaToSpecAgent`**
- Neue Methode `processWizardStep(projectId, step, fields): WizardStepCompleteResponse`
- Baut Prompt mit: System-Prompt + Kontext (bisherige Steps) + aktuelle Formular-Daten
- Agent-Prompt-Template pro Step-Typ (z.B. fuer IDEA anders als fuer ARCHITECTURE)
- Parst Agent-Antwort, bestimmt `nextStep` aus der Step-Reihenfolge
- Beim letzten Step: ruft Export-Logik (Feature 10) auf, setzt `exportTriggered: true`

**Erweiterung `SpecContextBuilder`**
- Neue Methode `buildWizardContext(projectId, currentStep, fields): String`
- Liest Wizard-Daten aller bisherigen Steps aus `wizard.json`
- Fuegt aktuelle Formular-Daten als strukturierten Block hinzu

**Neues Request/Response Model**
```kotlin
data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>
)

data class WizardStepCompleteResponse(
    val message: String,
    val nextStep: String?,
    val exportTriggered: Boolean = false
)
```

### Frontend

**Chat-Nachricht formatieren**

Jeder Wizard-Step hat ein Mapping von Feld-Keys zu lesbaren Labels. Beim Absenden werden die Felder als formatierte Nachricht dargestellt:

```
Step 1 - Idee

Produktname: MeinTool
Produktidee: Ein SaaS Tool fuer Projektmanagement...
Kategorie: SaaS
```

Die Feld-Labels kommen aus einer Konstante `STEP_FIELD_LABELS` im Frontend (z.B. `{ IDEA: { productName: "Produktname", productIdea: "Produktidee", category: "Kategorie" } }`).

**Erweiterung `wizard-store.ts`**
- `completeStep()` wird erweitert:
  1. Formatiert Felder als lesbare Chat-Nachricht
  2. Fuegt User-Nachricht zum Chat hinzu (via `project-store`)
  3. Sendet `POST /agent/wizard-step-complete` mit Step + Felder
  4. Fuegt Agent-Antwort als Chat-Nachricht hinzu
  5. Wechselt Wizard-Step basierend auf `nextStep` aus der Response
  6. Bei `exportTriggered: true` — navigiert zur Export-Seite oder zeigt Export-Dialog

**Neue API-Funktion in `api.ts`**
```typescript
export interface WizardStepCompleteRequest {
  step: string;
  fields: Record<string, any>;
}

export interface WizardStepCompleteResponse {
  message: string;
  nextStep: string | null;
  exportTriggered: boolean;
}

export async function completeWizardStep(
  projectId: string,
  data: WizardStepCompleteRequest
): Promise<WizardStepCompleteResponse> {
  return apiFetch<WizardStepCompleteResponse>(
    `/api/v1/projects/${projectId}/agent/wizard-step-complete`,
    { method: "POST", body: JSON.stringify(data) }
  );
}
```

**Erweiterung `WizardForm.tsx`**
- `handleNext()` zeigt Loading-State waehrend Agent-Kommunikation
- Wizard-Step-Wechsel passiert erst nach Agent-Antwort (nicht sofort)
- Deaktiviert "Weiter"-Button waehrend Agent arbeitet

### Interaktion mit bestehendem System

- Der bestehende Chat-Endpoint (`/agent/chat`) bleibt unveraendert fuer freie User-Nachrichten
- Der neue Endpoint ist ausschliesslich fuer Wizard-Step-Uebergaben
- Wizard-Daten werden weiterhin in `wizard.json` gespeichert (Feature 11)
- Der Agent nutzt `SpecContextBuilder` fuer Kontext — erweitert um Wizard-Daten
- FlowState wird beim Step-Wechsel aktualisiert (COMPLETED fuer aktuellen, IN_PROGRESS fuer naechsten Step)
- Feature 10 (Scaffold-Export) wird als Abschluss-Aktion beim letzten Step getriggert

## Abhaengigkeiten
- Feature 1 (Idea-to-Spec Flow) — Chat-Infrastruktur, IdeaToSpecAgent
- Feature 10 (Project Scaffold Export) — Export-Logik fuer letzten Step
- Feature 11 (Guided Wizard Forms) — Wizard-Formulare, wizard-store, WizardData API
- Feature 12 (Dynamische Wizard-Steps) — dynamische Steps muessen bei Chat-Integration beruecksichtigt werden

## Aufwand
L (Large)

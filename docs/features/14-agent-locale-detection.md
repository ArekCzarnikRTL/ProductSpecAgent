# Feature 14: Agent-Sprache nach Browser-Einstellung

## Zusammenfassung
Der Agent antwortet in der Sprache, die der Browser des Users eingestellt hat. Das Frontend liest `navigator.language` und sendet den Sprachcode als `locale`-Feld bei jedem Agent-Request mit. Das Backend fuegt eine Sprach-Instruktion in den System-Prompt ein, damit der LLM in der richtigen Sprache antwortet. Es werden keine Sprachen eingeschraenkt — der Agent versucht jede vom Browser gemeldete Sprache.

## User Stories
1. Als PO moechte ich, dass der Agent mir in meiner Browser-Sprache antwortet, ohne dass ich die Sprache manuell einstellen muss.
2. Als PO mit englischem Browser moechte ich englische Agent-Antworten bekommen, auch wenn die UI auf Deutsch ist.

## Acceptance Criteria
- [ ] Frontend liest `navigator.language` und sendet `locale` bei `/agent/chat` und `/agent/wizard-step-complete`
- [ ] Backend fuegt Sprach-Instruktion in den System-Prompt ein (z.B. "Always respond in: Deutsch (de)")
- [ ] Agent antwortet in der Browser-Sprache des Users
- [ ] Default-Locale ist `"en"` wenn `navigator.language` nicht verfuegbar
- [ ] Keine Einschraenkung auf bestimmte Sprachen — der Agent versucht jede Sprache
- [ ] UI-Texte (Buttons, Labels, Step-Namen) bleiben unveraendert auf Deutsch
- [ ] Bestehende Chat- und Wizard-Funktionalitaet bleibt unbeeintraechtigt

## Technische Details

### Frontend

**Erweiterung `ChatRequest` in `api.ts`**
```typescript
export interface ChatRequest {
  message: string;
  locale: string;
}
```

**Erweiterung `WizardStepCompleteRequest` in `api.ts`**
```typescript
export interface WizardStepCompleteRequest {
  step: string;
  fields: Record<string, any>;
  locale: string;
}
```

**Erweiterung `project-store.ts` — `sendMessage()`**
- Liest `navigator.language` (z.B. `"de-DE"`, `"en-US"`, `"fr"`)
- Sendet als `locale`-Feld im ChatRequest mit: `{ message, locale: navigator.language ?? "en" }`

**Erweiterung `wizard-store.ts` — `completeStep()`**
- Liest `navigator.language`
- Sendet als `locale`-Feld im WizardStepCompleteRequest mit

### Backend

**Erweiterung `ChatRequest` in `ChatModels.kt`**
```kotlin
data class ChatRequest(
    val message: String,
    val locale: String = "en"
)
```

**Erweiterung `WizardStepCompleteRequest` in `WizardChatModels.kt`**
```kotlin
data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>,
    val locale: String = "en"
)
```

**Neue Hilfsfunktion `buildLocaleInstruction()`**

Wandelt einen Locale-Code in eine Sprach-Instruktion um:

```kotlin
fun buildLocaleInstruction(locale: String): String {
    val langCode = locale.split("-", "_").first().lowercase()
    val languageName = mapOf(
        "de" to "Deutsch", "en" to "English", "fr" to "Français",
        "es" to "Español", "it" to "Italiano", "pt" to "Português",
        "nl" to "Nederlands", "pl" to "Polski", "ja" to "日本語",
        "zh" to "中文", "ko" to "한국어", "ru" to "Русский"
    )[langCode]

    return if (languageName != null) {
        "IMPORTANT: Always respond in $languageName ($langCode). Do not switch languages."
    } else {
        "IMPORTANT: Always respond in the language with code '$langCode'. Do not switch languages."
    }
}
```

Fuer unbekannte Sprachcodes wird der Code direkt uebergeben — der LLM kennt die meisten ISO-639-Codes.

**Erweiterung `IdeaToSpecAgent`**

`chat()` — Locale wird durchgereicht und in den System-Prompt eingefuegt:
```kotlin
suspend fun chat(projectId: String, userMessage: String, locale: String = "en"): ChatResponse {
    // ...
    val localeInstruction = buildLocaleInstruction(locale)
    val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$context"
    // ...
}
```

`processWizardStep()` — gleich:
```kotlin
suspend fun processWizardStep(
    projectId: String, step: String, fields: Map<String, Any>, locale: String = "en"
): WizardStepCompleteResponse {
    // ...
    val localeInstruction = buildLocaleInstruction(locale)
    val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$wizardContext"
    // ...
}
```

**Erweiterung Controller**

`ChatController.chat()` — gibt `request.locale` an `ideaToSpecAgent.chat()` weiter.

`WizardChatController.wizardStepComplete()` — gibt `request.locale` an `ideaToSpecAgent.processWizardStep()` weiter.

### Kein i18n-Framework

- Keine Uebersetzungsdateien, kein next-intl, kein Locale-Routing
- UI-Texte bleiben hart auf Deutsch (Buttons, Labels, Step-Namen)
- Nur der LLM-Prompt bekommt eine Sprach-Instruktion

## Abhaengigkeiten
- Feature 1 (Idea-to-Spec Flow) — Chat-Endpoint
- Feature 13 (Wizard-Chat Integration) — Wizard-Chat-Endpoint

## Aufwand
S (Small)

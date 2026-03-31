# Feature 14: Agent-Locale Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The agent responds in the user's browser language by reading `navigator.language` and passing a locale instruction into the LLM system prompt.

**Architecture:** Frontend reads `navigator.language` and sends it as a `locale` field in both `ChatRequest` and `WizardStepCompleteRequest`. Backend adds a `buildLocaleInstruction(locale)` helper and injects the resulting instruction into the system prompt for both `chat()` and `processWizardStep()`.

**Tech Stack:** Kotlin + Spring Boot (backend), React 19 + Next.js 16 + Zustand 5 (frontend)

---

## File Structure

**Backend — Modify:**
- `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt` — add `locale` field to `ChatRequest`
- `backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt` — add `locale` field to `WizardStepCompleteRequest`
- `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt` — add `buildLocaleInstruction()`, pass locale through `chat()` and `processWizardStep()`
- `backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt` — pass `request.locale` to agent
- `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt` — pass `request.locale` to agent

**Frontend — Modify:**
- `frontend/src/lib/api.ts` — add `locale` to `ChatRequest` and `WizardStepCompleteRequest`
- `frontend/src/lib/stores/project-store.ts` — send `navigator.language` in `sendMessage()`
- `frontend/src/lib/stores/wizard-store.ts` — send `navigator.language` in `completeStep()`

---

### Task 1: Backend — Add locale to request models and buildLocaleInstruction

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt`
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt`
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`

- [ ] **Step 1: Add `locale` to ChatRequest**

In `backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt`, replace:

```kotlin
data class ChatRequest(
    val message: String
)
```

with:

```kotlin
data class ChatRequest(
    val message: String,
    val locale: String = "en"
)
```

- [ ] **Step 2: Add `locale` to WizardStepCompleteRequest**

In `backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt`, replace:

```kotlin
data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>
)
```

with:

```kotlin
data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>,
    val locale: String = "en"
)
```

- [ ] **Step 3: Add `buildLocaleInstruction()` and locale params to IdeaToSpecAgent**

In `backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt`, add this private method before `runAgent()`:

```kotlin
    private fun buildLocaleInstruction(locale: String): String {
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

Add `locale: String = "en"` parameter to `chat()` method signature:

```kotlin
    suspend fun chat(projectId: String, userMessage: String, locale: String = "en"): ChatResponse {
```

In `chat()`, change line 31 from:

```kotlin
        val systemPromptWithContext = "$baseSystemPrompt\n\n$context"
```

to:

```kotlin
        val localeInstruction = buildLocaleInstruction(locale)
        val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$context"
```

Add `locale: String = "en"` parameter to `processWizardStep()` method signature:

```kotlin
    suspend fun processWizardStep(
        projectId: String,
        step: String,
        fields: Map<String, Any>,
        locale: String = "en"
    ): WizardStepCompleteResponse {
```

In `processWizardStep()`, change line 126 from:

```kotlin
        val systemPromptWithContext = "$baseSystemPrompt\n\n$wizardContext"
```

to:

```kotlin
        val localeInstruction = buildLocaleInstruction(locale)
        val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$wizardContext"
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew compileKotlin 2>&1 | tail -5`
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Run all tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -10`
Expected: All tests pass (locale has default value, so existing tests are unaffected)

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/domain/ChatModels.kt backend/src/main/kotlin/com/agentwork/productspecagent/domain/WizardChatModels.kt backend/src/main/kotlin/com/agentwork/productspecagent/agent/IdeaToSpecAgent.kt
git commit -m "feat: add locale field to requests and buildLocaleInstruction for agent language"
```

---

### Task 2: Backend — Pass locale through controllers

**Files:**
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt`
- Modify: `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt`

- [ ] **Step 1: Update ChatController to pass locale**

In `backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt`, change line 26 from:

```kotlin
            ideaToSpecAgent.chat(id, request.message)
```

to:

```kotlin
            ideaToSpecAgent.chat(id, request.message, request.locale)
```

- [ ] **Step 2: Update WizardChatController to pass locale**

In `backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt`, change the `processWizardStep` call from:

```kotlin
            ideaToSpecAgent.processWizardStep(id, request.step, request.fields)
```

to:

```kotlin
            ideaToSpecAgent.processWizardStep(id, request.step, request.fields, request.locale)
```

- [ ] **Step 3: Verify it compiles and tests pass**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew compileKotlin 2>&1 | tail -5 && ./gradlew test 2>&1 | tail -10`
Expected: BUILD SUCCESSFUL, all tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/kotlin/com/agentwork/productspecagent/api/ChatController.kt backend/src/main/kotlin/com/agentwork/productspecagent/api/WizardChatController.kt
git commit -m "feat: pass locale from requests through controllers to agent"
```

---

### Task 3: Frontend — Send locale in all agent requests

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/stores/project-store.ts`
- Modify: `frontend/src/lib/stores/wizard-store.ts`

- [ ] **Step 1: Add `locale` to ChatRequest in api.ts**

In `frontend/src/lib/api.ts`, change:

```typescript
export interface ChatRequest {
  message: string;
}
```

to:

```typescript
export interface ChatRequest {
  message: string;
  locale: string;
}
```

- [ ] **Step 2: Add `locale` to WizardStepCompleteRequest in api.ts**

In `frontend/src/lib/api.ts`, change:

```typescript
export interface WizardStepCompleteRequest {
  step: string;
  fields: Record<string, any>;
}
```

to:

```typescript
export interface WizardStepCompleteRequest {
  step: string;
  fields: Record<string, any>;
  locale: string;
}
```

- [ ] **Step 3: Send locale in project-store sendMessage()**

In `frontend/src/lib/stores/project-store.ts`, change line 83 from:

```typescript
      const resp: ChatResponse = await sendChatMessage(projectId, { message });
```

to:

```typescript
      const locale = typeof navigator !== "undefined" ? navigator.language : "en";
      const resp: ChatResponse = await sendChatMessage(projectId, { message, locale });
```

- [ ] **Step 4: Send locale in wizard-store completeStep()**

In `frontend/src/lib/stores/wizard-store.ts`, change line 167 from:

```typescript
      const response = await completeWizardStep(projectId, { step, fields: plainFields });
```

to:

```typescript
      const locale = typeof navigator !== "undefined" ? navigator.language : "en";
      const response = await completeWizardStep(projectId, { step, fields: plainFields, locale });
```

- [ ] **Step 5: Verify it compiles**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty 2>&1 | head -10`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/stores/project-store.ts frontend/src/lib/stores/wizard-store.ts
git commit -m "feat: send navigator.language as locale in all agent requests"
```

---

### Task 4: Full build verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run backend tests**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend && ./gradlew test 2>&1 | tail -10`
Expected: All pass

- [ ] **Step 2: Run frontend TypeScript check**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 3: Run frontend build**

Run: `cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Manual verification checklist**

1. Set browser language to English — agent responds in English
2. Set browser language to German — agent responds in German
3. Free chat (`/agent/chat`) sends locale correctly
4. Wizard step complete (`/agent/wizard-step-complete`) sends locale correctly
5. UI labels remain in German regardless of browser language

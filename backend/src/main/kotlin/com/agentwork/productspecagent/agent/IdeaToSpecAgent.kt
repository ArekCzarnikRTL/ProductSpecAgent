package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.ClarificationService
import com.agentwork.productspecagent.service.DecisionService
import com.agentwork.productspecagent.service.ProjectService
import com.agentwork.productspecagent.service.WizardService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant

@Service
open class IdeaToSpecAgent(
    private val contextBuilder: SpecContextBuilder,
    private val projectService: ProjectService,
    @Value("\${agent.system-prompt}") private val baseSystemPrompt: String,
    private val decisionService: DecisionService,
    private val clarificationService: ClarificationService,
    private val wizardService: WizardService,
    private val koogRunner: KoogAgentRunner? = null
) {

    private val stepOrder = FlowStepType.entries.toList()

    suspend fun chat(projectId: String, userMessage: String, locale: String = "en"): ChatResponse {
        val flowState = projectService.getFlowState(projectId)
        val context = contextBuilder.buildContext(projectId)

        val currentStep = flowState.currentStep

        val localeInstruction = buildLocaleInstruction(locale)
        val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$context"

        val rawResponse = runAgent(systemPromptWithContext, userMessage)

        val stepCompleted = rawResponse.contains("[STEP_COMPLETE]")
        val summaryMatch = Regex("""\[STEP_SUMMARY]:\s*(.+)""", RegexOption.DOT_MATCHES_ALL)
            .find(rawResponse)
        val summaryContent = summaryMatch?.groupValues?.get(1)?.trim()

        val decisionMatch = Regex("""\[DECISION_NEEDED]:\s*(.+)""").find(rawResponse)
        val decisionTitle = decisionMatch?.groupValues?.get(1)?.trim()

        val clarificationMatch = Regex("""\[CLARIFICATION_NEEDED]:\s*([^|]+)\|\s*(.+)""").find(rawResponse)
        val clarificationQuestion = clarificationMatch?.groupValues?.get(1)?.trim()
        val clarificationReason = clarificationMatch?.groupValues?.get(2)?.trim()

        val cleanMessage = rawResponse
            .replace("[STEP_COMPLETE]", "")
            .replace(Regex("""\[STEP_SUMMARY]:[^\n]*"""), "")
            .replace(Regex("""\[DECISION_NEEDED]:[^\n]*"""), "")
            .replace(Regex("""\[CLARIFICATION_NEEDED]:[^\n]*"""), "")
            .trim()

        var nextStep = currentStep
        var flowStateChanged = false
        var createdDecisionId: String? = null

        if (decisionTitle != null) {
            val decision = decisionService.createDecision(projectId, decisionTitle, currentStep)
            createdDecisionId = decision.id
        }

        var createdClarificationId: String? = null

        if (clarificationQuestion != null && clarificationReason != null) {
            val clarification = clarificationService.createClarification(
                projectId, clarificationQuestion, clarificationReason, currentStep
            )
            createdClarificationId = clarification.id
        }

        if (stepCompleted) {
            val fileName = currentStep.name.lowercase() + ".md"
            val title = currentStep.name.replace("_", " ").lowercase()
                .replaceFirstChar { it.uppercase() }
            val markdownContent = "# $title\n\n${summaryContent ?: cleanMessage}"
            projectService.saveSpecFile(projectId, fileName, markdownContent)

            val now = Instant.now().toString()
            val updatedSteps = flowState.steps.map { step ->
                when (step.stepType) {
                    currentStep -> step.copy(status = FlowStepStatus.COMPLETED, updatedAt = now)
                    else -> step
                }
            }

            val currentIndex = stepOrder.indexOf(currentStep)
            if (currentIndex + 1 < stepOrder.size) {
                nextStep = stepOrder[currentIndex + 1]
                val finalSteps = updatedSteps.map { step ->
                    if (step.stepType == nextStep) step.copy(status = FlowStepStatus.IN_PROGRESS, updatedAt = now)
                    else step
                }
                projectService.updateFlowState(projectId, flowState.copy(
                    steps = finalSteps, currentStep = nextStep
                ))
            } else {
                projectService.updateFlowState(projectId, flowState.copy(steps = updatedSteps))
            }
            flowStateChanged = true
        }

        return ChatResponse(
            message = cleanMessage,
            flowStateChanged = flowStateChanged,
            currentStep = nextStep.name,
            decisionId = createdDecisionId,
            clarificationId = createdClarificationId
        )
    }

    suspend fun processWizardStep(
        projectId: String,
        step: String,
        fields: Map<String, Any>,
        locale: String = "en"
    ): WizardStepCompleteResponse {
        val wizardData = wizardService.getWizardData(projectId)
        val wizardContext = contextBuilder.buildWizardContext(wizardData, step, fields)

        val prompt = buildString {
            appendLine("The user just completed wizard step: $step")
            appendLine("Please provide brief, helpful feedback about their input for this step.")
            appendLine("Be encouraging and mention any suggestions for improvement if applicable.")
        }

        val localeInstruction = buildLocaleInstruction(locale)
        val systemPromptWithContext = "$baseSystemPrompt\n\n$localeInstruction\n\n$wizardContext"

        val rawResponse = runAgent(systemPromptWithContext, prompt)
        val cleanMessage = rawResponse
            .replace("[STEP_COMPLETE]", "")
            .replace(Regex("""\[STEP_SUMMARY]:[^\n]*"""), "")
            .replace(Regex("""\[DECISION_NEEDED]:[^\n]*"""), "")
            .replace(Regex("""\[CLARIFICATION_NEEDED]:[^\n]*"""), "")
            .trim()

        // Determine next step
        val currentStepType = try { FlowStepType.valueOf(step) } catch (_: Exception) { null }
        val isLastStep = currentStepType != null && stepOrder.indexOf(currentStepType) == stepOrder.size - 1

        val nextStepType = if (currentStepType != null && !isLastStep) {
            val idx = stepOrder.indexOf(currentStepType)
            if (idx + 1 < stepOrder.size) stepOrder[idx + 1] else null
        } else {
            null
        }

        // Update flow state
        if (currentStepType != null) {
            val flowState = projectService.getFlowState(projectId)
            val now = java.time.Instant.now().toString()
            val updatedSteps = flowState.steps.map { s ->
                when (s.stepType) {
                    currentStepType -> s.copy(status = FlowStepStatus.COMPLETED, updatedAt = now)
                    nextStepType -> s.copy(status = FlowStepStatus.IN_PROGRESS, updatedAt = now)
                    else -> s
                }
            }
            val newFlowState = flowState.copy(
                steps = updatedSteps,
                currentStep = nextStepType ?: currentStepType
            )
            projectService.updateFlowState(projectId, newFlowState)

            // Save spec file
            val fileName = step.lowercase() + ".md"
            val title = step.replace("_", " ").lowercase().replaceFirstChar { it.uppercase() }
            val fieldsMarkdown = fields.entries.joinToString("\n") { "- **${it.key}**: ${it.value}" }
            val markdownContent = "# $title\n\n$fieldsMarkdown"
            projectService.saveSpecFile(projectId, fileName, markdownContent)
        }

        // Generate spec summary on last step
        if (isLastStep && currentStepType != null) {
            val allWizardData = wizardService.getWizardData(projectId)
            val fullContext = contextBuilder.buildWizardContext(allWizardData, step, fields)
            val summaryPrompt = buildString {
                appendLine("Based on all the information gathered in the wizard steps below, generate a complete product specification summary in markdown format.")
                appendLine("Include sections for: Product Overview, Problem, Target Audience, Scope, MVP, and any technical decisions made.")
                appendLine()
                appendLine(fullContext)
            }
            val localeInstruction = buildLocaleInstruction(locale)
            val summarySystemPrompt = "$baseSystemPrompt\n\n$localeInstruction"
            val specContent = runAgent(summarySystemPrompt, summaryPrompt)
            projectService.saveSpecFile(projectId, "spec.md", specContent)
        }

        val exportTriggered = isLastStep

        return WizardStepCompleteResponse(
            message = cleanMessage,
            nextStep = nextStepType?.name,
            exportTriggered = exportTriggered
        )
    }

    private fun buildLocaleInstruction(locale: String): String {
        val langCode = locale.split("-", "_").first().lowercase()
        val languageName = mapOf(
            "de" to "Deutsch", "en" to "English", "fr" to "Français",
            "es" to "Español", "it" to "Italiano", "pt" to "Português",
            "nl" to "Nederlands", "pl" to "Polski", "ja" to "日本語",
            "zh" to "中文", "ko" to "한국語", "ru" to "Русский"
        )[langCode]

        return if (languageName != null) {
            "IMPORTANT: Always respond in $languageName ($langCode). Do not switch languages."
        } else {
            "IMPORTANT: Always respond in the language with code '$langCode'. Do not switch languages."
        }
    }

    protected open suspend fun runAgent(systemPrompt: String, userMessage: String): String {
        return koogRunner?.run(systemPrompt, userMessage)
            ?: throw UnsupportedOperationException("KoogAgentRunner not configured.")
    }
}

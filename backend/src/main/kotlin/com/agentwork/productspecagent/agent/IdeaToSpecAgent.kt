package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.ClarificationService
import com.agentwork.productspecagent.service.DecisionService
import com.agentwork.productspecagent.service.ProjectService
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
    private val koogRunner: KoogAgentRunner? = null
) {

    private val stepOrder = FlowStepType.entries.toList()

    suspend fun chat(projectId: String, userMessage: String): ChatResponse {
        val flowState = projectService.getFlowState(projectId)
        val context = contextBuilder.buildContext(projectId)

        val currentStep = flowState.currentStep

        val systemPromptWithContext = "$baseSystemPrompt\n\n$context"

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

    protected open suspend fun runAgent(systemPrompt: String, userMessage: String): String {
        return koogRunner?.run(systemPrompt, userMessage)
            ?: throw UnsupportedOperationException("KoogAgentRunner not configured.")
    }
}

package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.FlowStepStatus
import com.agentwork.productspecagent.domain.FlowStepType
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.stereotype.Component

@Component
class SpecContextBuilder(
    private val projectService: ProjectService
) {
    fun buildContext(projectId: String): String {
        val projectResponse = projectService.getProject(projectId)
        val project = projectResponse.project
        val flowState = projectResponse.flowState

        val completedSteps = flowState.steps
            .filter { it.status == FlowStepStatus.COMPLETED }

        val stepSummaries = completedSteps.mapNotNull { step ->
            val fileName = step.stepType.name.lowercase() + ".md"
            val content = projectService.readSpecFile(projectId, fileName)
            if (content != null) "### ${step.stepType.name}\n$content" else null
        }.joinToString("\n\n")

        return buildString {
            appendLine("=== PROJECT CONTEXT ===")
            appendLine("Project: ${project.name}")
            appendLine("Current Step: ${flowState.currentStep.name}")
            appendLine()
            if (stepSummaries.isNotBlank()) {
                appendLine("=== COMPLETED STEPS ===")
                appendLine(stepSummaries)
                appendLine()
            }
            appendLine("=== END CONTEXT ===")
        }.trim()
    }
}

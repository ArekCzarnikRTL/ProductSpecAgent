package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.WizardStepCompleteRequest
import com.agentwork.productspecagent.domain.WizardStepCompleteResponse
import kotlinx.coroutines.runBlocking
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects")
class WizardChatController(
    private val ideaToSpecAgent: IdeaToSpecAgent
) {

    @PostMapping("/{id}/agent/wizard-step-complete")
    fun wizardStepComplete(
        @PathVariable id: String,
        @RequestBody request: WizardStepCompleteRequest
    ): ResponseEntity<WizardStepCompleteResponse> {
        if (request.step.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        val validSteps = com.agentwork.productspecagent.domain.FlowStepType.entries.map { it.name }
        if (request.step !in validSteps) {
            return ResponseEntity.badRequest().build()
        }

        val response = runBlocking {
            ideaToSpecAgent.processWizardStep(id, request.step, request.fields)
        }

        return ResponseEntity.ok(response)
    }
}

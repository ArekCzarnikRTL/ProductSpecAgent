package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.DecisionService
import kotlinx.coroutines.runBlocking
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/decisions")
class DecisionController(private val decisionService: DecisionService) {

    @GetMapping
    fun listDecisions(@PathVariable projectId: String): List<Decision> {
        return decisionService.listDecisions(projectId)
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createDecision(
        @PathVariable projectId: String,
        @RequestBody request: CreateDecisionRequest
    ): Decision {
        return runBlocking {
            decisionService.createDecision(projectId, request.title, request.stepType)
        }
    }

    @GetMapping("/{decisionId}")
    fun getDecision(
        @PathVariable projectId: String,
        @PathVariable decisionId: String
    ): Decision {
        return decisionService.getDecision(projectId, decisionId)
    }

    @PostMapping("/{decisionId}/resolve")
    fun resolveDecision(
        @PathVariable projectId: String,
        @PathVariable decisionId: String,
        @RequestBody request: ResolveDecisionRequest
    ): Decision {
        return decisionService.resolveDecision(projectId, decisionId, request.chosenOptionId, request.rationale)
    }
}

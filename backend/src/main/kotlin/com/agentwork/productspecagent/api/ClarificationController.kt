package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.ClarificationService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/clarifications")
class ClarificationController(private val clarificationService: ClarificationService) {

    @GetMapping
    fun listClarifications(@PathVariable projectId: String): List<Clarification> {
        return clarificationService.listClarifications(projectId)
    }

    @GetMapping("/{clarificationId}")
    fun getClarification(
        @PathVariable projectId: String,
        @PathVariable clarificationId: String
    ): Clarification {
        return clarificationService.getClarification(projectId, clarificationId)
    }

    @PostMapping("/{clarificationId}/answer")
    fun answerClarification(
        @PathVariable projectId: String,
        @PathVariable clarificationId: String,
        @RequestBody request: AnswerClarificationRequest
    ): Clarification {
        return clarificationService.answerClarification(projectId, clarificationId, request.answer)
    }
}

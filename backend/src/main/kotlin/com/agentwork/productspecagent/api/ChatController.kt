package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.agent.IdeaToSpecAgent
import com.agentwork.productspecagent.domain.ChatRequest
import com.agentwork.productspecagent.domain.ChatResponse
import kotlinx.coroutines.runBlocking
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects")
class ChatController(
    private val ideaToSpecAgent: IdeaToSpecAgent
) {

    @PostMapping("/{id}/agent/chat")
    fun chat(
        @PathVariable id: String,
        @RequestBody request: ChatRequest
    ): ResponseEntity<ChatResponse> {
        if (request.message.isBlank()) {
            return ResponseEntity.badRequest().build()
        }

        val response = runBlocking {
            ideaToSpecAgent.chat(id, request.message)
        }

        return ResponseEntity.ok(response)
    }
}

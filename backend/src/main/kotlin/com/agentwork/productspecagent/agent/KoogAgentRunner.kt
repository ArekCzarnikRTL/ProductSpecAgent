package com.agentwork.productspecagent.agent

import ai.koog.agents.core.agent.AIAgent
import ai.koog.prompt.executor.clients.openai.OpenAIModels
import ai.koog.prompt.executor.model.PromptExecutor
import ai.koog.prompt.llm.LLModel
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * Central service for running Koog AI agents.
 * Injected by all agent services to avoid duplicating Koog wiring.
 */
@Component
class KoogAgentRunner(
    @Qualifier("openAIExecutor") private val promptExecutor: PromptExecutor,
    @Value("\${agent.model}") private val modelName: String
) {
    private val logger = LoggerFactory.getLogger(KoogAgentRunner::class.java)

    private val model: LLModel by lazy {
        resolveModel(modelName)
    }

    private fun resolveModel(name: String): LLModel = when (name) {
        "gpt-4o" -> OpenAIModels.Chat.GPT4o
        "gpt-4o-mini" -> OpenAIModels.Chat.GPT4oMini
        "gpt-4.1" -> OpenAIModels.Chat.GPT4_1
        "gpt-4.1-mini" -> OpenAIModels.Chat.GPT4_1Mini
        "gpt-4.1-nano" -> OpenAIModels.Chat.GPT4_1Nano
        else -> OpenAIModels.Chat.GPT4o
    }

    suspend fun run(systemPrompt: String, userMessage: String): String {
        logger.debug("Running Koog agent with model={}, prompt length={}", modelName, systemPrompt.length)

        val agent = AIAgent(
            promptExecutor = promptExecutor,
            systemPrompt = systemPrompt,
            llmModel = model
        )

        return agent.run(userMessage)
    }
}

package com.agentwork.productspecagent.agent

import ai.koog.agents.core.agent.AIAgent
import ai.koog.prompt.executor.model.PromptExecutor
import ai.koog.prompt.llm.LLModel
import ai.koog.prompt.llm.OpenAILLMProvider
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
        LLModel(
            id = modelName,
            provider = OpenAILLMProvider()
        )
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

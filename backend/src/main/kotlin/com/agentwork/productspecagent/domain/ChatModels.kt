package com.agentwork.productspecagent.domain

data class ChatRequest(
    val message: String
)

data class ChatResponse(
    val message: String,
    val flowStateChanged: Boolean,
    val currentStep: String,
    val decisionId: String? = null,
    val clarificationId: String? = null
)

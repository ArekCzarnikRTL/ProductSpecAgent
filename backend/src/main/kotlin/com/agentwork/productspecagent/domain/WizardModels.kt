package com.agentwork.productspecagent.domain

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class WizardData(
    val projectId: String,
    val steps: Map<String, WizardStepData> = emptyMap()
)

@Serializable
data class WizardStepData(
    val fields: Map<String, JsonElement> = emptyMap(),
    val completedAt: String? = null
)

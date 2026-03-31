package com.agentwork.productspecagent.domain

data class WizardStepCompleteRequest(
    val step: String,
    val fields: Map<String, Any>
)

data class WizardStepCompleteResponse(
    val message: String,
    val nextStep: String?,
    val exportTriggered: Boolean = false
)

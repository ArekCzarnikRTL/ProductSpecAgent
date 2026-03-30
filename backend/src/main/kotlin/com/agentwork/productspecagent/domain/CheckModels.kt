package com.agentwork.productspecagent.domain

import kotlinx.serialization.Serializable

@Serializable
enum class CheckSeverity { ERROR, WARNING, INFO }

@Serializable
data class CheckResult(
    val id: String,
    val severity: CheckSeverity,
    val category: String,
    val message: String,
    val relatedArtifact: String? = null,
    val suggestedFix: String? = null
)

@Serializable
data class CheckSummary(
    val errors: Int,
    val warnings: Int,
    val infos: Int,
    val passed: Boolean
)

@Serializable
data class CheckReport(
    val projectId: String,
    val results: List<CheckResult>,
    val checkedAt: String,
    val summary: CheckSummary
)

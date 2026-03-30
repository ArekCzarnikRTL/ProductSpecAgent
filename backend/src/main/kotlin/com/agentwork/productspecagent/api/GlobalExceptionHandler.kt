package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.ErrorResponse
import com.agentwork.productspecagent.service.ClarificationNotFoundException
import com.agentwork.productspecagent.service.DecisionNotFoundException
import com.agentwork.productspecagent.service.ProjectNotFoundException
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(ProjectNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleProjectNotFound(ex: ProjectNotFoundException): ErrorResponse {
        return ErrorResponse(
            error = "NOT_FOUND",
            message = ex.message ?: "Project not found",
            timestamp = Instant.now().toString()
        )
    }

    @ExceptionHandler(DecisionNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleDecisionNotFound(ex: DecisionNotFoundException): ErrorResponse {
        return ErrorResponse(
            error = "NOT_FOUND",
            message = ex.message ?: "Decision not found",
            timestamp = Instant.now().toString()
        )
    }

    @ExceptionHandler(ClarificationNotFoundException::class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    fun handleClarificationNotFound(ex: ClarificationNotFoundException): ErrorResponse {
        return ErrorResponse(
            error = "NOT_FOUND",
            message = ex.message ?: "Clarification not found",
            timestamp = Instant.now().toString()
        )
    }
}

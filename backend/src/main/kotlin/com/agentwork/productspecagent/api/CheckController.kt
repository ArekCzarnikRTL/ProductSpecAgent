package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.CheckReport
import com.agentwork.productspecagent.service.ConsistencyCheckService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/checks")
class CheckController(private val checkService: ConsistencyCheckService) {

    @PostMapping
    fun runChecks(@PathVariable projectId: String): CheckReport {
        return checkService.runChecks(projectId)
    }

    @GetMapping("/results")
    fun getResults(@PathVariable projectId: String): CheckReport {
        return checkService.runChecks(projectId)
    }
}

package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.TaskService
import kotlinx.coroutines.runBlocking
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/tasks")
class TaskController(private val taskService: TaskService) {

    @GetMapping
    fun listTasks(@PathVariable projectId: String): List<SpecTask> {
        return taskService.listTasks(projectId)
    }

    @PostMapping("/generate")
    @ResponseStatus(HttpStatus.CREATED)
    fun generatePlan(@PathVariable projectId: String): List<SpecTask> {
        return runBlocking { taskService.generatePlan(projectId) }
    }

    @GetMapping("/{taskId}")
    fun getTask(@PathVariable projectId: String, @PathVariable taskId: String): SpecTask {
        return taskService.getTask(projectId, taskId)
    }

    @PutMapping("/{taskId}")
    fun updateTask(
        @PathVariable projectId: String,
        @PathVariable taskId: String,
        @RequestBody request: UpdateTaskRequest
    ): SpecTask {
        return taskService.updateTask(projectId, taskId, request)
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTask(@PathVariable projectId: String, @PathVariable taskId: String) {
        taskService.deleteTask(projectId, taskId)
    }

    @GetMapping("/coverage")
    fun getCoverage(@PathVariable projectId: String): Map<String, Boolean> {
        return taskService.getCoverage(projectId)
    }
}

package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.ProjectStorage
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID

class ProjectNotFoundException(id: String) : RuntimeException("Project not found: $id")

@Service
class ProjectService(private val storage: ProjectStorage) {

    fun createProject(name: String, idea: String): ProjectResponse {
        val now = Instant.now().toString()
        val project = Project(
            id = UUID.randomUUID().toString(),
            name = name,
            ownerId = "anonymous",
            status = ProjectStatus.DRAFT,
            createdAt = now,
            updatedAt = now
        )
        val flowState = createInitialFlowState(project.id)

        storage.saveProject(project)
        storage.saveFlowState(flowState)
        storage.saveSpecStep(project.id, "idea.md", "# Idea\n\n$idea")

        return ProjectResponse(project = project, flowState = flowState)
    }

    fun getProject(id: String): ProjectResponse {
        val project = storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        val flowState = storage.loadFlowState(id) ?: throw ProjectNotFoundException(id)
        return ProjectResponse(project = project, flowState = flowState)
    }

    fun deleteProject(id: String) {
        storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        storage.deleteProject(id)
    }

    fun listProjects(): List<Project> = storage.listProjects()

    fun getFlowState(id: String): FlowState {
        storage.loadProject(id) ?: throw ProjectNotFoundException(id)
        return storage.loadFlowState(id) ?: throw ProjectNotFoundException(id)
    }
}

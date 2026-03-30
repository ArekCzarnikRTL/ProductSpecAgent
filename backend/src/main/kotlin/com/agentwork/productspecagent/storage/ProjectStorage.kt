package com.agentwork.productspecagent.storage

import com.agentwork.productspecagent.domain.FlowState
import com.agentwork.productspecagent.domain.Project
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

@Service
class ProjectStorage(
    @Value("\${app.data-path}") private val dataPath: String
) {

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
    }

    private fun projectDir(projectId: String): Path =
        Paths.get(dataPath, "projects", projectId)

    private fun projectFile(projectId: String): Path =
        projectDir(projectId).resolve("project.json")

    private fun flowStateFile(projectId: String): Path =
        projectDir(projectId).resolve("flow-state.json")

    private fun specDir(projectId: String): Path =
        projectDir(projectId).resolve("spec")

    fun saveProject(project: Project) {
        val dir = projectDir(project.id)
        Files.createDirectories(dir)
        Files.writeString(projectFile(project.id), json.encodeToString(project))
    }

    fun loadProject(projectId: String): Project? {
        val file = projectFile(projectId)
        if (!Files.exists(file)) return null
        return json.decodeFromString<Project>(Files.readString(file))
    }

    fun deleteProject(projectId: String) {
        val dir = projectDir(projectId)
        if (Files.exists(dir)) {
            dir.toFile().deleteRecursively()
        }
    }

    fun listProjects(): List<Project> {
        val projectsDir = Paths.get(dataPath, "projects")
        if (!Files.exists(projectsDir)) return emptyList()
        return Files.list(projectsDir).use { stream ->
            stream.filter { Files.isDirectory(it) }
                .toList()
                .mapNotNull { loadProject(it.fileName.toString()) }
        }
    }

    fun saveFlowState(flowState: FlowState) {
        val dir = projectDir(flowState.projectId)
        Files.createDirectories(dir)
        Files.writeString(flowStateFile(flowState.projectId), json.encodeToString(flowState))
    }

    fun loadFlowState(projectId: String): FlowState? {
        val file = flowStateFile(projectId)
        if (!Files.exists(file)) return null
        return json.decodeFromString<FlowState>(Files.readString(file))
    }

    fun saveSpecStep(projectId: String, fileName: String, content: String) {
        val dir = specDir(projectId)
        Files.createDirectories(dir)
        Files.writeString(dir.resolve(fileName), content)
    }

    fun loadSpecStep(projectId: String, fileName: String): String? {
        val file = specDir(projectId).resolve(fileName)
        if (!Files.exists(file)) return null
        return Files.readString(file)
    }
}

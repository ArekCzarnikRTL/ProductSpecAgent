package com.agentwork.productspecagent.export

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.*
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

@Service
class HandoffService(
    private val projectService: ProjectService,
    private val decisionService: DecisionService,
    private val taskService: TaskService,
    private val exportService: ExportService
) {

    fun generatePreview(projectId: String, format: String = "claude-code"): HandoffPreview {
        val projectResponse = projectService.getProject(projectId)
        val project = projectResponse.project
        val flowState = projectResponse.flowState
        val decisions = decisionService.listDecisions(projectId)
        val tasks = taskService.listTasks(projectId)

        return HandoffPreview(
            claudeMd = generateClaudeMd(project, flowState, projectId, decisions, tasks),
            agentsMd = generateAgentsMd(project, format),
            implementationOrder = generateImplementationOrder(tasks),
            format = format
        )
    }

    fun exportHandoff(projectId: String, request: HandoffExportRequest = HandoffExportRequest()): ByteArray {
        val projectResponse = projectService.getProject(projectId)
        val project = projectResponse.project
        val slug = project.name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')

        val preview = if (request.claudeMd != null || request.agentsMd != null || request.implementationOrder != null) {
            // Use custom overrides where provided, generate defaults for the rest
            val defaults = generatePreview(projectId, request.format)
            HandoffPreview(
                claudeMd = request.claudeMd ?: defaults.claudeMd,
                agentsMd = request.agentsMd ?: defaults.agentsMd,
                implementationOrder = request.implementationOrder ?: defaults.implementationOrder,
                format = request.format
            )
        } else {
            generatePreview(projectId, request.format)
        }

        // Get base export ZIP
        val baseZip = exportService.exportProject(projectId)

        // Combine base export with handoff files
        val baos = ByteArrayOutputStream()
        ZipOutputStream(baos).use { zip ->
            // Copy all entries from the base export
            ZipInputStream(ByteArrayInputStream(baseZip)).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    zip.putNextEntry(ZipEntry(entry.name))
                    zis.copyTo(zip)
                    zip.closeEntry()
                    entry = zis.nextEntry
                }
            }

            // Add handoff files
            zip.addEntry("$slug/CLAUDE.md", preview.claudeMd)
            zip.addEntry("$slug/AGENTS.md", preview.agentsMd)
            zip.addEntry("$slug/implementation-order.md", preview.implementationOrder)
        }

        return baos.toByteArray()
    }

    private fun generateClaudeMd(
        project: Project,
        flowState: FlowState,
        projectId: String,
        decisions: List<Decision>,
        tasks: List<SpecTask>
    ): String = buildString {
        appendLine("# ${project.name}")
        appendLine()
        appendLine("## Project Overview")
        appendLine()

        // Completed spec steps
        val completedSteps = flowState.steps.filter { it.status == FlowStepStatus.COMPLETED }
        if (completedSteps.isNotEmpty()) {
            appendLine("## Specification")
            appendLine()
            for (step in completedSteps) {
                val fileName = step.stepType.name.lowercase() + ".md"
                val content = projectService.readSpecFile(projectId, fileName)
                if (content != null) {
                    appendLine("### ${step.stepType.name}")
                    appendLine()
                    appendLine(content)
                    appendLine()
                }
            }
        }

        // Resolved decisions
        val resolved = decisions.filter { it.status == DecisionStatus.RESOLVED }
        if (resolved.isNotEmpty()) {
            appendLine("## Decisions")
            appendLine()
            for (d in resolved) {
                val chosen = d.options.find { it.id == d.chosenOptionId }
                appendLine("- **${d.title}**: ${chosen?.label ?: "N/A"} — ${d.rationale ?: ""}")
            }
            appendLine()
        }

        // Task summary
        if (tasks.isNotEmpty()) {
            appendLine("## Tasks")
            appendLine()
            val byStatus = tasks.groupBy { it.status }
            for ((status, group) in byStatus) {
                appendLine("- ${status.name}: ${group.size}")
            }
            appendLine()
        }

        appendLine("## Implementation Notes")
        appendLine()
        appendLine("- Follow the implementation order in `implementation-order.md`")
        appendLine("- See `AGENTS.md` for agent-specific instructions")
        appendLine("- Refer to `SPEC.md` for full specification details")
    }

    private fun generateAgentsMd(project: Project, format: String): String = buildString {
        appendLine("# AI Coding Agent Instructions")
        appendLine()
        appendLine("Project: ${project.name}")
        appendLine()
        appendLine("## General Guidelines")
        appendLine()
        appendLine("- Read `CLAUDE.md` for project context before starting")
        appendLine("- Follow `implementation-order.md` for task sequencing")
        appendLine("- Implement one task at a time, commit after each")
        appendLine("- Write tests for all new functionality")
        appendLine()

        when (format) {
            "claude-code" -> {
                appendLine("## Claude Code")
                appendLine()
                appendLine("- Use `CLAUDE.md` as the project brief")
                appendLine("- Reference `implementation-order.md` for task priority")
                appendLine("- Commit after completing each task")
            }
            "codex" -> {
                appendLine("## Codex")
                appendLine()
                appendLine("- Use the specification files as context")
                appendLine("- Follow the implementation order strictly")
                appendLine("- Validate each task against the spec before moving on")
            }
            else -> {
                appendLine("## Custom Agent ($format)")
                appendLine()
                appendLine("- Adapt the project files to your agent's workflow")
                appendLine("- Use `SPEC.md` and `PLAN.md` as primary references")
            }
        }
    }

    private fun generateImplementationOrder(tasks: List<SpecTask>): String = buildString {
        appendLine("# Implementation Order")
        appendLine()

        val epics = tasks.filter { it.type == TaskType.EPIC }.sortedBy { it.priority }
        if (epics.isEmpty()) {
            appendLine("No tasks defined yet.")
            return@buildString
        }

        var taskNumber = 1
        for (epic in epics) {
            appendLine("## ${epic.title}")
            appendLine()
            val stories = tasks.filter { it.parentId == epic.id }.sortedBy { it.priority }
            for (story in stories) {
                appendLine("### ${story.title}")
                appendLine()
                val subtasks = tasks.filter { it.parentId == story.id }.sortedBy { it.priority }
                for (task in subtasks) {
                    appendLine("$taskNumber. **${task.title}** (${task.estimate}) — ${task.description}")
                    taskNumber++
                }
                appendLine()
            }
        }
    }

    private fun ZipOutputStream.addEntry(name: String, content: String) {
        putNextEntry(ZipEntry(name))
        write(content.toByteArray())
        closeEntry()
    }
}

package com.agentwork.productspecagent.api

import com.agentwork.productspecagent.domain.HandoffExportRequest
import com.agentwork.productspecagent.domain.HandoffPreview
import com.agentwork.productspecagent.export.HandoffService
import com.agentwork.productspecagent.service.ProjectService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/projects/{projectId}/handoff")
class HandoffController(
    private val handoffService: HandoffService,
    private val projectService: ProjectService
) {

    @PostMapping("/preview")
    fun preview(
        @PathVariable projectId: String,
        @RequestParam(defaultValue = "claude-code") format: String
    ): ResponseEntity<HandoffPreview> {
        val preview = handoffService.generatePreview(projectId, format)
        return ResponseEntity.ok(preview)
    }

    @PostMapping("/export")
    fun export(
        @PathVariable projectId: String,
        @RequestBody(required = false) request: HandoffExportRequest?
    ): ResponseEntity<ByteArray> {
        val project = projectService.getProject(projectId).project
        val slug = project.name.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
        val zipBytes = handoffService.exportHandoff(projectId, request ?: HandoffExportRequest())

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"$slug-handoff.zip\"")
            .contentType(MediaType.parseMediaType("application/zip"))
            .body(zipBytes)
    }
}

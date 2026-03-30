package com.agentwork.productspecagent.service

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.storage.ProjectStorage
import org.springframework.stereotype.Service

@Service
class WizardService(private val storage: ProjectStorage) {

    fun getWizardData(projectId: String): WizardData {
        storage.loadProject(projectId) ?: throw ProjectNotFoundException(projectId)
        return storage.loadWizardData(projectId) ?: WizardData(projectId = projectId)
    }

    fun saveWizardData(projectId: String, data: WizardData): WizardData {
        storage.loadProject(projectId) ?: throw ProjectNotFoundException(projectId)
        val saved = data.copy(projectId = projectId)
        storage.saveWizardData(projectId, saved)
        return saved
    }

    fun saveStepData(projectId: String, stepName: String, stepData: WizardStepData): WizardData {
        storage.loadProject(projectId) ?: throw ProjectNotFoundException(projectId)
        val existing = storage.loadWizardData(projectId) ?: WizardData(projectId = projectId)
        val updated = existing.copy(steps = existing.steps + (stepName to stepData))
        storage.saveWizardData(projectId, updated)
        return updated
    }
}

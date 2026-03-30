package com.agentwork.productspecagent.domain

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class FlowStateTest {

    @Test
    fun `createInitialFlowState creates all 6 steps`() {
        val flowState = createInitialFlowState("test-project-id")
        assertEquals(6, flowState.steps.size)
    }

    @Test
    fun `createInitialFlowState sets IDEA step as IN_PROGRESS`() {
        val flowState = createInitialFlowState("test-project-id")
        val ideaStep = flowState.steps.find { it.stepType == FlowStepType.IDEA }
        assertNotNull(ideaStep)
        assertEquals(FlowStepStatus.IN_PROGRESS, ideaStep!!.status)
    }

    @Test
    fun `createInitialFlowState sets all other steps as OPEN`() {
        val flowState = createInitialFlowState("test-project-id")
        val nonIdeaSteps = flowState.steps.filter { it.stepType != FlowStepType.IDEA }
        assertTrue(nonIdeaSteps.all { it.status == FlowStepStatus.OPEN })
    }

    @Test
    fun `createInitialFlowState sets currentStep to IDEA`() {
        val flowState = createInitialFlowState("test-project-id")
        assertEquals(FlowStepType.IDEA, flowState.currentStep)
    }

    @Test
    fun `createInitialFlowState sets correct projectId`() {
        val flowState = createInitialFlowState("my-project-123")
        assertEquals("my-project-123", flowState.projectId)
    }

    @Test
    fun `createInitialFlowState steps are in correct order`() {
        val flowState = createInitialFlowState("test-project-id")
        val expectedOrder = listOf(
            FlowStepType.IDEA, FlowStepType.PROBLEM, FlowStepType.TARGET_AUDIENCE,
            FlowStepType.SCOPE, FlowStepType.MVP, FlowStepType.SPEC
        )
        assertEquals(expectedOrder, flowState.steps.map { it.stepType })
    }
}

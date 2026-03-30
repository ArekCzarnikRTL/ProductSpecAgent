package com.agentwork.productspecagent.agent

import com.agentwork.productspecagent.domain.*
import com.agentwork.productspecagent.service.DecisionService
import com.agentwork.productspecagent.service.ProjectService
import com.agentwork.productspecagent.storage.DecisionStorage
import com.agentwork.productspecagent.storage.ProjectStorage
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Path
import kotlin.test.*

class IdeaToSpecAgentTest {

    @TempDir
    lateinit var tempDir: Path

    private lateinit var storage: ProjectStorage
    private lateinit var projectService: ProjectService
    private lateinit var contextBuilder: SpecContextBuilder
    private lateinit var decisionStorage: DecisionStorage
    private lateinit var decisionService: DecisionService

    @BeforeEach
    fun setup() {
        storage = ProjectStorage(tempDir.toString())
        projectService = ProjectService(storage)
        contextBuilder = SpecContextBuilder(projectService)
        decisionStorage = DecisionStorage(tempDir.toString())
        val fakeDecisionAgent = object : DecisionAgent(contextBuilder) {
            override suspend fun runAgent(prompt: String): String {
                return """{"options":[{"label":"Yes","pros":["pro1"],"cons":[],"recommended":true},{"label":"No","pros":[],"cons":["con1"],"recommended":false}],"recommendation":"Go with Yes"}"""
            }
        }
        decisionService = DecisionService(decisionStorage, fakeDecisionAgent)
    }

    private fun createTestAgent(agentResponse: String): IdeaToSpecAgent {
        return object : IdeaToSpecAgent(contextBuilder, projectService, "You are IdeaToSpec.", decisionService) {
            override suspend fun runAgent(systemPrompt: String, userMessage: String): String {
                return agentResponse
            }
        }
    }

    @Test
    fun `chat returns plain message when no STEP_COMPLETE marker`() = runBlocking {
        val project = projectService.createProject("Test", "My idea")
        val agent = createTestAgent("What problem are you solving?")

        val response = agent.chat(project.project.id, "Hello")

        assertEquals("What problem are you solving?", response.message)
        assertFalse(response.flowStateChanged)
        assertEquals("IDEA", response.currentStep)
    }

    @Test
    fun `chat advances flow when STEP_COMPLETE marker present`() = runBlocking {
        val project = projectService.createProject("Test", "My idea")
        val agent = createTestAgent(
            "Great idea!\n[STEP_COMPLETE]\n[STEP_SUMMARY]: The idea is about productivity tracking."
        )

        val response = agent.chat(project.project.id, "My idea is about tracking productivity")

        assertTrue(response.flowStateChanged)
        assertEquals("PROBLEM", response.currentStep)
        assertFalse(response.message.contains("[STEP_COMPLETE]"))
        assertFalse(response.message.contains("[STEP_SUMMARY]"))

        // Verify flow state was updated
        val flowState = projectService.getFlowState(project.project.id)
        assertEquals(FlowStepType.PROBLEM, flowState.currentStep)
        val ideaStep = flowState.steps.find { it.stepType == FlowStepType.IDEA }
        assertEquals(FlowStepStatus.COMPLETED, ideaStep?.status)
        val problemStep = flowState.steps.find { it.stepType == FlowStepType.PROBLEM }
        assertEquals(FlowStepStatus.IN_PROGRESS, problemStep?.status)

        // Verify spec file was saved
        val specContent = projectService.readSpecFile(project.project.id, "idea.md")
        assertNotNull(specContent)
    }

    @Test
    fun `chat does not advance beyond SPEC step`() = runBlocking {
        val project = projectService.createProject("Test", "Idea")
        // Manually advance to SPEC step
        val flowState = projectService.getFlowState(project.project.id)
        val allCompleted = flowState.steps.map { step ->
            if (step.stepType == FlowStepType.SPEC) step.copy(status = FlowStepStatus.IN_PROGRESS)
            else step.copy(status = FlowStepStatus.COMPLETED)
        }
        projectService.updateFlowState(project.project.id, flowState.copy(
            steps = allCompleted, currentStep = FlowStepType.SPEC
        ))

        val agent = createTestAgent("Here is your spec.\n[STEP_COMPLETE]\n[STEP_SUMMARY]: Full specification.")
        val response = agent.chat(project.project.id, "Finalize")

        assertTrue(response.flowStateChanged)
        assertEquals("SPEC", response.currentStep)
    }

    @Test
    fun `chat strips markers from message`() = runBlocking {
        val project = projectService.createProject("Test", "Idea")
        val agent = createTestAgent("Summary done.\n[STEP_COMPLETE]\n[STEP_SUMMARY]: The summary.")

        val response = agent.chat(project.project.id, "Summarize")

        assertFalse(response.message.contains("[STEP_COMPLETE]"))
        assertFalse(response.message.contains("[STEP_SUMMARY]"))
        assertTrue(response.message.contains("Summary done."))
    }

    @Test
    fun `chat creates decision when DECISION_NEEDED marker present`() = runBlocking {
        val project = projectService.createProject("Test", "My idea")
        val agent = createTestAgent(
            "I think we need to decide on the scope.\n[DECISION_NEEDED]: Should feature X be in MVP?"
        )

        val response = agent.chat(project.project.id, "What about the scope?")

        assertFalse(response.message.contains("[DECISION_NEEDED]"))
        assertNotNull(response.decisionId)

        // Verify decision was created
        val decisions = decisionService.listDecisions(project.project.id)
        assertEquals(1, decisions.size)
        assertEquals("Should feature X be in MVP?", decisions[0].title)
    }
}

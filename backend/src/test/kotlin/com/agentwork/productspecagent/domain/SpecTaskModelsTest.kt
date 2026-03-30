package com.agentwork.productspecagent.domain

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class SpecTaskModelsTest {

    @Test
    fun `SpecTask has TODO status by default`() {
        val task = SpecTask(
            id = "t1", projectId = "p1", type = TaskType.EPIC,
            title = "Auth", createdAt = "2026-03-30T00:00:00Z",
            updatedAt = "2026-03-30T00:00:00Z"
        )
        assertEquals(TaskStatus.TODO, task.status)
        assertNull(task.parentId)
        assertEquals(0, task.priority)
        assertEquals(emptyList<String>(), task.dependencies)
    }

    @Test
    fun `SpecTask with parentId represents a child`() {
        val story = SpecTask(
            id = "s1", projectId = "p1", parentId = "e1", type = TaskType.STORY,
            title = "Login", createdAt = "now", updatedAt = "now"
        )
        assertEquals("e1", story.parentId)
        assertEquals(TaskType.STORY, story.type)
    }
}

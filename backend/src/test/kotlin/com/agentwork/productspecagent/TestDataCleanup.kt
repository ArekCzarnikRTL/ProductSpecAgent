package com.agentwork.productspecagent

import org.springframework.test.context.TestContext
import org.springframework.test.context.TestExecutionListener
import java.nio.file.Files
import java.nio.file.Path

class TestDataCleanup : TestExecutionListener {

    override fun afterTestMethod(testContext: TestContext) {
        val dataPath = testContext.applicationContext
            .environment
            .getProperty("app.data-path") ?: return
        val projectsDir = Path.of(dataPath, "projects")
        if (Files.exists(projectsDir)) {
            projectsDir.toFile().deleteRecursively()
        }
    }
}

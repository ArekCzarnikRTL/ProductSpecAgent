package com.agentwork.productspecagent.service

class TaskNotFoundException(id: String) : RuntimeException("Task not found: $id")

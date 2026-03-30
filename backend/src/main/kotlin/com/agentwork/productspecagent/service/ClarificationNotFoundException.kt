package com.agentwork.productspecagent.service

class ClarificationNotFoundException(id: String) : RuntimeException("Clarification not found: $id")

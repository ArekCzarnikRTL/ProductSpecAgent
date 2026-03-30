package com.agentwork.productspecagent.service

class DecisionNotFoundException(id: String) : RuntimeException("Decision not found: $id")

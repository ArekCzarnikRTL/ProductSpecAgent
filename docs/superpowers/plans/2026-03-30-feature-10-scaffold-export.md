# Feature 10: Project Scaffold Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Mustache-template-based docs scaffold generation to both ExportService and HandoffService, producing a professional `docs/` structure in every ZIP export.

**Architecture:** DocsScaffoldGenerator loads `.mustache` templates from classpath, fills them with project data (EPICs as features, resolved Decisions, Spec content), and returns a Map of path→content. ExportService and HandoffService call it and add entries to the ZIP.

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, mustache.java 0.9.14

---

## Tasks

### Task 1: Add mustache dependency
### Task 2: Create Mustache templates (5 files)
### Task 3: ScaffoldContext data model + DocsScaffoldGenerator service
### Task 4: Integrate into ExportService
### Task 5: Integrate into HandoffService
### Task 6: Tests + verification

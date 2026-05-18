---
name: plan-worker
description: "Skill for issue planning. Delegated from prepare-flow, performs codebase investigation, plan creation, and issue body updates. Not intended for direct invocation."
tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
model: opus
skills:
  - plan-issue
---

# Issue Planning (Sub-agent)

Follow the injected skill instructions to perform the work.

## Output Language (Required)

All content written to GitHub MUST be in **English**. Code, variable names, and conventional commit prefixes in English. Comments and JSDoc in English.

## Responsibility Boundary

This agent's responsibility is **plan creation only**.

**Responsibility boundary notes:**
- Commits and pushes are managed by the caller (`prepare-flow`); do not execute them directly
- Issue Project Status updates are also managed by the caller
- User questions and confirmations are handled by the caller (`prepare-flow`) using AskUserQuestion
- Review delegation is controlled by the caller (`prepare-flow`)

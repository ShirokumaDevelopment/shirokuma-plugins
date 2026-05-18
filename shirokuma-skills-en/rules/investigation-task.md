---
paths:
  - ".claude/skills/researching-best-practices/**"
  - ".claude/skills/analyze-issue/**"
  - ".claude/skills/review-issue/**"
---

# Investigation Task Practices

Defines how investigation and analysis tasks (workflow audits, gap analyses, design reviews, etc.) should be carried out.

## 1. Do Not Delegate Investigation Wholesale to Subagents

In investigation tasks, **the manager (main AI) reads the source code itself and writes the detailed processing flow**. Do not hand off to a subagent.

### Always do

- Read source code yourself
- Document the concrete processing flow: which command, what it does, in what order, which functions it calls
- Trace error paths, conditional branches, and argument flow

### Never do

- Stop at a side-effect matrix (✓/✗ table) only
- Have an agent build the side-effect matrix without reading the source
- Post artifacts to Issues / Discussions before showing them to the user
- Create a branch for an investigation task that produces no code changes

**Past failure:** Delegated investigation to a subagent, which produced only a side-effect matrix without reading the source. The "what / in what order / which functions" detail was missing from each command, making the document useless for problem identification. The agent then posted 10 comments to an Issue without the user reviewing them, and they all had to be deleted.

## 2. Question Fundamental Design, Not Just Surface Inventory

Investigation tasks should not get stuck inventorying function calls. **Question the assumptions of the current design.**

### Things to challenge during the "ideal design" phase

- Is this status model (FSM) appropriate?
- Is this responsibility split appropriate?
- Is this pattern actually necessary?
- Is the design consistent with other commands?
- Has the "ideal design" merely transcribed the current design into an FSM without challenging it?

**Past failure:** Spent time counting cache function call gaps and missed the fundamental issues:
- "Spec Review" status was referenced in SKILL.md but absent from the status model
- PRs started with `In Progress` status on creation (should have been `Review`)
- Issues and PRs shared the same status model despite having different lifecycles

## 3. Stage Through Review Gates

After producing an investigation artifact (Discussion, Issue body, report), **insert a user review before moving to the next phase**.

### Review checkpoints

| Phase | What to confirm |
|-------|-----------------|
| Processing flow detail | Whether the granularity and angle are sufficient |
| Side-effect matrix | Whether the extracted side effects are valid |
| Gap analysis | Whether the comparison target and criteria are valid |
| Issue / ADR creation | The actual scope of items to escalate |

In particular, **always insert a review before moving from gap analysis to Issue creation**. Do not chain ahead.

**Past failure:** Ran a shallow analysis through D1–D5 → gap analysis → 6 Issues created → status set to Review without pause. Off-target Issues were created. The user pointed out the fundamental problems before the AI noticed them.

## 4. Do Not Hand Reviewers a List of Files to Check

When reviewing an investigation artifact for accuracy and completeness (a "gap-detection review"), **do not hand the reviewer a list of source files to check**.

### Why

The whole point of a gap-detection review is to discover what was missed. Limiting the review scope guarantees gaps will not be detected. Pass only the target Discussion / Issue number and instruct the reviewer to explore the entire codebase.

### Pass / do not pass

| Category | Pass | Do not pass |
|----------|------|-------------|
| Target | Discussion / Issue number | — |
| Instruction | "Explore the entire project and cross-check" | — |
| Hints | — | List of source files to check |
| Scope | — | Directory limits, exploration hints |

**Past failure:** Tried to enumerate the source files to check during a D1/D2 review, then realized that limiting the scope of a gap-detection review defeats its purpose.

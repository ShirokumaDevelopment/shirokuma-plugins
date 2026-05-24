---
name: requirements-flow
description: "Orchestrator for the requirements definition phase at the Discussion level. Does not change Issue status; only searches existing ADRs/Discussions for consistency, delegates ADR creation to write-adr, and creates specification Discussions. Decision rule: if an Issue already exists and its status needs to move forward, use /prepare-flow; if you only need to record a decision at the Discussion level, use /requirements-flow; to simply register a GitHub Issue/Discussion right now, use /issue-flow. Triggers: \"requirements\", \"requirements definition\", \"create ADR\", \"create spec\", \"define requirements\", \"record architecture decision\", \"technology selection\"."
allowed-tools: Bash, AskUserQuestion, Agent, TaskCreate, TaskUpdate, TaskGet, TaskList
---

!`shirokuma-flow rules inject --scope orchestrator`

# Requirements Definition Phase (Orchestrator)

Orchestrate the requirements definition phase: **first run a discovery (whiteboarding) session with the user to surface the points of contention, options, and trade-offs**, then determine task type, delegate to `requirements-worker` (`write-adr` / specification Discussion creation), and persist the deliverables. **Does not change Issue status (operates at the Discussion level).**

Symmetrically with how `design-flow` embeds `discovering-design` as Phase 2, `requirements-flow` **embeds a discovery (whiteboarding) phase**. Discovery is the phase for nailing down the points specific to requirements definition (which ADRs to adopt, trade-offs, consistency with existing decisions) through a conversation with the user before moving on to deliverable creation. It has no dedicated skill — it is executed as a phase within this skill.

## Phase Structure

| Phase | Content | Actor |
|-------|---------|-------|
| Phase 1 | Context analysis (tentative task type detection) | Manager direct |
| Phase 2 | **Discovery (whiteboarding)**: surface points of contention, options, and trade-offs through user dialogue, and lock in the direction | Manager direct (`AskUserQuestion`) |
| Phase 3 | Auto-discover related references (duplicate / conflict check + body embedding) | Manager direct (Bash) |
| Phase 4 | Delegate to requirements-worker via Agent (ADR creation / spec drafting) | Agent: `requirements-worker` |
| Phase 5 | Completion and next steps guidance | Manager direct |

## Timeline of Entry Points

There are two timeline-based entry points for launching `requirements-flow`:

| Entry point | Timing | Flow |
|-------------|--------|------|
| **First time (project start)** | At project kickoff, when no foundational ADRs/specs exist yet | **Requirements-first**. Lock in the foundational architecture decisions through whiteboarding. After completion, optionally proceed to `/issue-flow` to raise implementation-unit Issues |
| **Afterward (steady state)** | Foundational ADRs already exist and day-to-day development is running | **issue-flow-first**. Development normally starts from `issue-flow` triage; only **when an ADR drift is detected** do you return to `requirements-flow` to update the ADR (see "Receiving Reverse Routing from issue-flow" below) |

In other words, requirements and issue-flow go **back and forth bidirectionally**. Forward = after requirements completes, optionally to issue-flow. Reverse = when issue-flow triage detects an ADR drift, return to requirements-flow.

## Task Registration (Required)

Register all chain steps via TaskCreate **before starting work**.

| # | content | activeForm | Method |
|---|---------|------------|--------|
| 1 | Context analysis (task type detection) | Analyzing task type | Manager direct |
| 2 | Discovery (whiteboarding): surface points of contention, options, and trade-offs | Locking in direction via whiteboarding | Manager direct (`AskUserQuestion`) |
| 3 | Search related Discussions | Searching existing Discussions | Bash: `shirokuma-flow discussion adr list` + `discussion search` |
| 4 | Delegate to requirements-worker | Executing ADR creation / spec drafting | Agent: `requirements-worker` |
| 5 | Complete and guide next steps | Creating completion report | Manager direct |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4.

Update each step to `in_progress` at start and `completed` on finish via TaskUpdate.

## Workflow

### Step 1: Context Analysis

Determine the task type from the user's input and conversation context.

#### Routing Determination

| Condition | Route |
|-----------|-------|
| ADR-related keywords ("ADR", "architecture decision", "technology selection", "record decision", "tech choice") | `write-adr` (mode detection delegated to write-adr) |
| Spec-related keywords ("spec", "requirements", "define requirements", "functional requirements", "non-functional requirements") | Specification Discussion creation (Bash: `shirokuma-flow discussion add`) |
| Contains both types of keywords (compound) | `write-adr` then specification Discussion creation, in sequence |
| Cannot determine | Ask via AskUserQuestion |

#### Confirmation When Cannot Determine

```text
AskUserQuestion(
  "What type of requirements work do you need?\n- Create an ADR (Architecture Decision Record)\n- Create a specification Discussion\n- Both"
)
```

Note that the Step 1 determination is **tentative**; the final task type and scope are locked in after the Step 2 discovery.

### Step 2: Discovery (Whiteboarding)

Before starting to write the ADR / spec, surface the **points of contention, options, and trade-offs** through dialogue with the user and lock in the direction. This is the requirements-definition counterpart to `design-flow`'s `discovering-design` (locking in the Design Brief and Aesthetic Direction). It has no dedicated skill — it is executed as a phase within this skill using `AskUserQuestion`.

If the points are clear enough that discovery is unnecessary (e.g., simply recording a decision that has already been made), you may skip it and proceed to Step 3.

#### Aspects to Surface

| Aspect | Question |
|--------|----------|
| Problem to solve | What is being decided? What is the background / constraints? |
| Options | What approaches / technologies / designs are available (at least 2)? |
| Trade-offs | Pros / cons / cost / risk of each option |
| Relationship to existing decisions | Build on existing ADRs/specs, or supersede them? |
| Scope | What does this requirements work decide, and what is deferred? |

#### Procedure

1. Building on the tentative determination from Step 1, present the unresolved points to the user via `AskUserQuestion`
2. When there are multiple options, present them with a recommended choice (do not just throw the points back without a proposal)
3. Once the user's answer locks in the direction, make it concrete enough to be reflected in the deliverable's `## Context` / `## Decision` / spec body
4. Carry the locked-in direction over to the Step 4 `requirements-worker` delegation prompt

The conclusions of discovery (the chosen option, rejected alternatives, trade-offs) become material for the ADR's `## Considered Options` / `## Decision Outcome`, so be sure to pass them downstream.

### Step 3: Auto-Discover Related References (duplicate / conflict check + body embedding)

Check for duplicates or conflicts with existing ADRs and specs **and simultaneously** embed the discovered references in the deliverable's body (ADR / spec Discussion) as a `## Related References` section. Search logic and placement spec follow the `doc-search-rules` rule.

#### Search Commands

```bash
# Canonical docs (grep)
grep -l "<keyword>" -r guide/ pages/specs/ CLAUDE.md

# ADRs (Accepted)
shirokuma-flow discussion adr list

# Related Discussions / Issues
shirokuma-flow discussion search "{keyword}"
shirokuma-flow issue search "{keyword}" --limit 5
```

#### Two Uses for the Search Results

The search results serve two purposes:

1. **Duplicate / conflict checking** (existing usage): include in the requirements-worker delegation prompt so write-adr can judge "does this conflict with an existing ADR?" and "is this re-adopting a Deprecated/Superseded option?"
2. **Building the `## Related References` section** (new): place the discovered references at the top of the body to prime reviewers with the context

#### Placement (per deliverable)

| Deliverable | Placement |
|-------------|-----------|
| ADR | Between `## Status` and `## Context` |
| Spec Discussion | Between `## Purpose` and `## Summary` |

#### Sub-section Skip

- One category has 0 hits → skip only that sub-section
- All categories have 0 hits → skip the entire `## Related References` section

For detailed search rules, keyword generation, and templates, see [`doc-search-rules`](../../rules/doc-search-rules.md) (auto-loaded via `paths` when editing this skill).

### Step 4: Delegate to requirements-worker via Agent Tool

Start `requirements-worker` via the Agent tool based on the routing result.

For every route, include the direction locked in during the Step 2 discovery (chosen option, rejected alternatives, trade-offs) in the delegation prompt.

#### ADR Creation Route

```text
Agent(
  description: "requirements-worker ADR",
  subagent_type: "requirements-worker",
  prompt: "Use write-adr to create an ADR.\n\nContext:\n{user input}\n\nDirection locked in during discovery (Step 2):\n- Chosen option: {...}\n- Rejected alternatives: {...}\n- Trade-offs: {...}\n→ Reflect these in the ADR's `## Considered Options` / `## Decision Outcome`.\n\nRelated References (already discovered in Step 3 and embedded in the body's `## Related References` section):\n{summary of Step 3 search results}\n\nUse these results also as material for duplicate / conflict checks. Watch out for re-adopting Deprecated/Superseded options."
)
```

#### Specification Discussion Creation Route

```text
Agent(
  description: "requirements-worker spec",
  subagent_type: "requirements-worker",
  prompt: "Create a specification Discussion.\nRun `shirokuma-flow discussion add` directly via Bash (Ideas category, with [Spec] title prefix).\n\nContext:\n{user input}\n\nDirection locked in during discovery (Step 2):\n{chosen approach, scope, trade-offs}\n\nRelated References (already discovered in Step 3 and embedded in the body's `## Related References` section):\n{summary of Step 3 search results}\n\nUse these results also as material for duplicate / conflict checks. Watch out for re-adopting Deprecated/Superseded options."
)
```

#### Compound Route (ADR + Spec)

```text
Agent(
  description: "requirements-worker ADR+spec",
  subagent_type: "requirements-worker",
  prompt: "Execute the following two tasks in order:\n1. Use write-adr to create an ADR\n2. Run `shirokuma-flow discussion add` directly via Bash to create a specification Discussion (Ideas category, with [Spec] title prefix)\n\nContext:\n{user input}\n\nDirection locked in during discovery (Step 2):\n{chosen option, rejected alternatives, trade-offs, scope}\n\nRelated References (already discovered in Step 3 and embedded in the body's `## Related References` section):\n{summary of Step 3 search results}\n\nUse these results also as material for duplicate / conflict checks. Watch out for re-adopting Deprecated/Superseded options."
)
```

#### Post-Completion Handling

If requirements-worker completes successfully, proceed to Step 5. If an error occurs, stop and report to the user.

### Step 5: Completion and Next Steps Guidance

Display a deliverable summary and guide next steps. Follow the `completion-report-style` rule for formatting.

**Required fields**:
- **Created deliverables:** Discussion number + title (ADR / Spec)
- **Type:** ADR / Spec / Compound

**Next steps guidance (by condition)**:

| Condition | Next steps |
|-----------|-----------|
| ADR or spec created | If Issue tracking needed, suggest `/issue-flow` |
| Related implementation Issue exists | Suggest `/implement-flow` for `#IssueNumber` |
| Standalone (no Issue) | Suggest `issue-flow` for Issue creation if needed |

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Keyword (ADR/spec) | "Create ADR for authentication approach" | Auto-detect task type and start |
| No argument | — | Ask task type via AskUserQuestion |

## Receiving Reverse Routing from issue-flow

`requirements-flow` is also the **receiving end of reverse routing** from `issue-flow` triage.

During `issue-flow` triage, `analyze-issue requirements` runs a project requirements consistency check (ADR reference) and returns `**Project Requirements Consistency:** NEEDS_REVISION` when the Issue body conflicts with an existing ADR. At that point, the option "review the existing ADR first" is presented, and if the user chooses it, control returns to `requirements-flow`.

### Entry When Launched via Reverse Routing

When launched via reverse routing, the user's context includes "which Issue," "which ADR," and "how it conflicts." Handling in this case:

| Step | Handling |
|------|----------|
| Phase 1 | Task type is fixed as **ADR update (write-adr update / supersede)**, not new ADR creation |
| Phase 2 (discovery) | Whiteboard starting from the conflict. Lock in with the user whether to "update the ADR to adopt the new approach," "align the Issue side with the ADR," or "mark the ADR as Superseded and create a new ADR" |
| Phase 3 | Reliably fetch the conflicting existing ADR as a related reference |
| Phase 4 | Delegate to `requirements-worker` to **update the ADR in update / supersede mode** (mode detection is delegated to write-adr) |
| Phase 5 | After completion, guide resuming triage of the original Issue (re-run the requirements review via `/issue-flow` → once consistent, progress Backlog → Review → ToDo) |

### Bidirectional Relationship (Forward and Reverse)

| Direction | Trigger | Flow |
|-----------|---------|------|
| Forward | requirements completes | `requirements-flow` completes → optionally raise implementation-unit Issues via `/issue-flow` |
| Reverse | issue-flow triage detects ADR drift | `issue-flow` (`analyze-issue requirements` returns NEEDS_REVISION) → return to `requirements-flow` to update the ADR → resume issue-flow triage |

> The trigger point for reverse routing (the `analyze-issue requirements` consistency check and the option presented on NEEDS_REVISION) is implemented on the `issue-flow` side. `requirements-flow` closes the loop by completing the ADR update as the receiving end and guiding the resumption of Issue triage.

## Edge Cases

| Situation | Action |
|-----------|--------|
| Possible duplicate of existing ADR | Include Step 3 search results in delegation prompt; let write-adr decide |
| Spec Discussion Spec category not configured | requirements-worker asks via AskUserQuestion to confirm category |
| User cannot determine | Ask type via AskUserQuestion before delegating |
| Launched with points / options unorganized | Whiteboard in Step 2 (discovery) before proceeding to deliverable creation |
| Reverse-routed from issue-flow triage due to ADR drift | Follow the entry handling in "Receiving Reverse Routing from issue-flow" above; after the ADR update, guide resuming Issue triage |

## No Status Transitions

`requirements-flow` does not manipulate Issues. It is a Discussion-level orchestrator and does not handle Issue status changes. Status management when an Issue exists is the responsibility of the caller (e.g., `implement-flow`).

## Standalone Path

Both `write-adr` and specification Discussion creation can be invoked standalone without going through `requirements-flow`. `requirements-flow` is an orchestrator that routes to these — it does not prevent direct invocation.

## Rule References

| Reference | Usage |
|-----------|-------|
| `output-language` rule | Output language for Discussion body and comments |
| `github-writing-style` rule | Bullet-point vs prose guidelines |
| `completion-report-style` rule | Completion report format |
| `doc-search-rules` rule (shared) | Step 3 search logic and placement spec for canonical docs / ADRs / existing issues |

## Tool Usage

| Tool | When |
|------|------|
| Bash | `shirokuma-flow discussion adr list` / `discussion search` |
| AskUserQuestion | Confirm task type when it cannot be determined / Step 2 discovery (whiteboarding) |
| Agent (requirements-worker) | Step 4: Delegate ADR creation and spec drafting (subagent, context isolation) |
| TaskCreate, TaskUpdate, TaskGet, TaskList | Progress tracking for all steps |

## Skill Selection Guide

This skill and `issue-flow` can both create GitHub items, but they serve different purposes.

| Goal | Which skill to use |
|------|-------------------|
| "I want to run the full requirements definition process" / "I want to create an ADR" / "I want to create a spec Discussion" | `requirements-flow` (this skill) |
| "I want to register this conversation as an Issue right now" / "I need a follow-up Issue" | `/issue-flow` |

**Decision rule**: If the goal is "run the requirements definition / ADR creation process," use `requirements-flow`. If the goal is only "register a GitHub Issue/Discussion right now," use `issue-flow`.

### Responsibility Boundary with `issue-flow`

- `requirements-flow` is the **requirements phase orchestrator** — it handles the full pipeline: searching existing ADRs/Discussions for consistency → creating ADRs and spec Discussions → guiding next steps
- `issue-flow` is the **UI layer** — it immediately registers an Issue/Discussion from the current conversation context. It does not handle the requirements definition process
- Requests like "create a spec" or "write an ADR" should route to this skill. `issue-flow` does not handle the requirements definition process

## Notes

- This skill is the **orchestrator** — actual ADR creation and specification drafting are delegated to `requirements-worker` via the Agent tool
- **Discovery (whiteboarding) is a phase within this skill** — it has no dedicated skill (symmetric with `design-flow`'s `discovering-design`, but the requirements-definition version is run directly by this skill in the main context using `AskUserQuestion`)
- **Does not change Issue status** — Discussion-level operations only. Even when updating an ADR via reverse routing, advancing the Issue's triage Status is the responsibility of `issue-flow`
- Mode detection for `write-adr` (create / update / supersede) is delegated to the `write-adr` skill itself (requirements-flow does not make this determination)
- **There are two entry points along the timeline**: the first time (project start) is requirements-first; afterward it is issue-flow-first. Requirements and issue-flow go back and forth bidirectionally

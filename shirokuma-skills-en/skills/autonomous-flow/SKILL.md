---
name: autonomous-flow
description: Orchestrator that processes multiple Issues sequentially in autonomous mode. The --autopilot flag auto-passes approval gates to achieve batch processing and full phase chaining. Built-in safety mechanisms (consecutive-failure stop, count limit, audit records, dry-run). Triggers: "autopilot", "autonomous", "autonomous mode", "batch run", "process in sequence", "run automatically".
allowed-tools: Bash, Read, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---

!`shirokuma-flow rules inject --scope orchestrator`

# Process Multiple Issues Sequentially in Autonomous Mode (Orchestrator)

> **Chain autonomy (most important rule)**: After launching each phase flow (`design-flow` / `prepare-flow` / `implement-flow`) via the Skill tool, you MUST execute the next step (approval-gate handling or next-phase launch) **within the same response**. Ending with text only while a single Issue's phase chain is still mid-stream is a chain-break error.

A higher-level orchestrator that processes multiple Issues sequentially in autonomous mode (autopilot). It runs each Issue through all phases (triage → design → plan → implement), and only auto-passes approval gates when launched with the `--autopilot` flag (ADR-v3-024: comprehensive delegation, Proposed #2706).

**Note**: This skill processes multiple Issues **sequentially** (one at a time). It is a higher-level concept distinct from the "sequential batch of multiple tasks within a single Issue" that `implement-flow` holds internally. This skill handles Issue selection, queueing, and phase-chain connection, and delegates the details within each phase (design, planning, implementation) to the existing flow skills.

## Core Concept: Comprehensive Delegation

The act of launching autonomous mode is itself treated as an "explicit bulk approval by a human (comprehensive delegation)". Auto-passing each approval gate is "fulfillment of the delegation" and is structurally different from the "opacity of implicit approval" that ADR-v3-016 eliminated (all auto-approvals are recorded in audit records and can be reviewed afterward).

```
Normal mode (default):
  At each approval gate: user confirmation → approval operation → next phase

Autonomous mode (autopilot, opt-in):
  At launch the user declares comprehensive delegation (--autopilot flag)
    → each approval gate is auto-passed as "fulfillment of the delegation"
    → all auto-approvals recorded in audit records (reviewable afterward)
```

## Delegation Mechanism (Option A: Launch flows via the Skill tool)

This skill is a higher-level orchestrator that launches each phase flow sequentially via the **Skill tool**. Approval gates are completed by this skill itself via the CLI (`shirokuma-flow submit/approve/pr merge`) before launching the next phase. Rather than bypassing the AskUserQuestion (approval gate) of each flow skill, it **completes the approval operation first at the orchestrator layer** and then calls the next phase's Skill.

```
autonomous-flow (manager, launches each flow via the Skill tool)
  ├─ design-flow (Skill)        → design phase (only when design is NEEDED)
  ├─ approve (Bash)             → auto-pass the design approval gate (when --autopilot)
  ├─ prepare-flow (Skill)       → planning phase
  ├─ approve (Bash)             → auto-pass the plan approval gate (when --autopilot)
  ├─ implement-flow (Skill)     → implementation through PR
  └─ pr merge (Bash)            → auto-pass the PR merge gate (when --autopilot)
```

## Task Registration (Required)

**Before starting batch processing**, register the following steps via TaskCreate.

| # | content | activeForm | Owner |
|---|---------|------------|-------|
| 1 | Build the queue | Building the queue | Manager direct: `shirokuma-flow issue list` |
| 2 | Confirm autonomous mode and queue | Confirming autonomous mode and queue | Manager direct: AskUserQuestion |
| 3 | Create the batch summary Issue | Creating the batch summary Issue | Manager direct: `shirokuma-flow issue add` |
| 4 | Run the Issue loop (process each Issue through all phases) | Running the Issue loop | Skill: `design-flow`/`prepare-flow`/`implement-flow` + Bash |
| 5 | Display the completion report | Displaying the completion report | Manager direct: update the batch summary Issue |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4.

Use TaskUpdate to set each step to `in_progress` when execution starts and `completed` when finished. Step 3 runs only when `--autopilot` is enabled and `--dry-run` is not set.

> **Subtasks inside the Issue loop**: Inside the Issue loop (step 4), run the phase chain (triage → design → plan → implement) for each Issue. You may dynamically add per-Issue progress via TaskCreate, but it is not required (the batch summary Issue is the source of truth for persistent progress).

## Batch State (held within the skill)

```
queue:                list of Issue numbers
processed:            processed Issues and results (SUCCESS / FAILED / SKIPPED)
consecutiveFailures:  consecutive-failure count
maxFailures:          stop threshold (default 3, overridable via --max-failures)
limit:                count limit (default 10, max 20, controlled by --limit)
autopilotMode:        true / false (--autopilot flag)
dryRun:               true / false (--dry-run flag)
summaryIssueNumber:   batch summary Issue number
batchId:              autopilot-{timestamp}
```

## Workflow

### Step 1: Build the Queue

Build the queue from arguments and flags (used together with the phase-resumption detection in [reference/chain-recovery.md](reference/chain-recovery.md)).

| Case | Queue construction logic |
|------|--------------------------|
| Explicit list (`#101 #102 #103`) | Use the specified numbers as the queue. If it exceeds `--limit`, warn and process only the first `--limit` items |
| Filter (`--status ToDo`) | Collect via `shirokuma-flow issue list --status <status>` and narrow to `--limit` items |
| Combined (explicit + filter) | Prioritize the explicit list; the filter is supplementary |

```bash
# Auto-collect via filter
shirokuma-flow issue list --status ToDo --format json
# → extract numbers from items in the JSON and narrow to --limit items
```

**Count limit**: default 10, max 20. If exceeded, warn + trim (first N items only) rather than erroring out.

### Step 2: Confirm Autonomous Mode and Queue

The mode branches on the presence of the `--autopilot` flag.

| Mode | Flag | Behavior |
|------|------|----------|
| Normal mode (default) | none | Confirm via AskUserQuestion at each approval gate |
| Autonomous mode (comprehensive delegation) | `--autopilot` | Auto-pass approval gates |

**Confirmation at `--autopilot` launch (required)**: Present the comprehensive-delegation explanation and queue contents, and take a final confirmation via AskUserQuestion.

```
Autonomous mode (autopilot) will process the following {N} items sequentially.
Each Issue's approval gates (triage approval, design approval, plan approval,
PR merge) will be auto-passed (comprehensive delegation / ADR-v3-024, Proposed #2706).

Target Issues: #101, #102, #103
Consecutive-failure limit: 3 (auto-stop when exceeded)

Proceed with this?
```

**Dry-run**: Do not run step 4; display each Issue's planned actions and exit (see "Dry-run Mode" below).

### Step 3: Create the Batch Summary Issue (only when `--autopilot` and not `--dry-run`)

Create a tracking Issue at batch start. Title: `[Autopilot] Batch Processing Summary: {timestamp}`.

> **Skip in dry-run**: When `--dry-run` is set, do not run this step; only display "would have created a batch summary Issue" (no real Issue is created).

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/autopilot-summary.md <<'EOF'
## Batch Processing Summary

**Batch ID:** autopilot-{timestamp}
**Target Issues:** #101, #102, #103
**Started:** {ISO8601}

| Issue | Result | Phase | PR |
|-------|--------|-------|-----|
| #101  | Processing | — | — |
| #102  | Pending | — | — |
| #103  | Pending | — | — |
EOF
shirokuma-flow issue add "[Autopilot] Batch Processing Summary: {timestamp}" /tmp/shirokuma-flow/autopilot-summary.md
# → keep the returned Issue number as summaryIssueNumber
```

See [reference/audit-record.md](reference/audit-record.md) for the audit-record format.

### Step 4: Issue Loop (process each Issue through all phases)

Process the Issues in the queue one at a time. For each Issue, do the following.

#### 4a. Check Status → Determine Start Phase

Run `shirokuma-flow issue context {number}` to get the current status and child Issues, and determine the start phase. To resolve ToDo ambiguity (awaiting design / awaiting plan / awaiting implementation), follow the phase-resumption detection algorithm in [reference/chain-recovery.md](reference/chain-recovery.md).

| Current status | Start phase |
|----------------|-------------|
| Backlog | Triage submit (`submit`) → triage approve (`approve`) → phase determination |
| Review (awaiting triage) | Triage approve (`approve`) → phase determination |
| ToDo | Determine the phase by child Issue presence and titles (see [reference/chain-recovery.md](reference/chain-recovery.md)) |
| In progress | Continue the current phase (determine by child Issue status) |
| Done | Skip (record as already processed; reset `consecutiveFailures`) |
| Blocked | Skip (log as requiring manual action; reset `consecutiveFailures`) |

#### 4b. Execute the Phase Chain

Execute the required phases in order from the start phase. Each approval gate is auto-passed when `--autopilot` is set.

**Triage auto-pass (H-1: always 2 steps):**

```bash
shirokuma-flow submit {number}    # Backlog → Review (triage submit)
shirokuma-flow approve {number}   # Review → ToDo (triage approve)
```

> **The CLI rejects `approve` with an error if the Issue is not in Review.** Calling `approve` directly from Backlog fails, so always transition to Review via `submit` before `approve`. For an Issue already in Review, skip `submit` and run `approve` only.

**Phase delegation (Skill tool) and approval gates:**

```
# Design phase (only when design is NEEDED)
Skill(skill: "design-flow", args: "#{number}")
  → design approval gate (when --autopilot):
     shirokuma-flow approve {design-issue-number}   # Review → ToDo

# Planning phase
Skill(skill: "prepare-flow", args: "#{number}")
  → plan approval gate (when --autopilot):
     shirokuma-flow approve {plan-issue-number}      # Review → ToDo (approval inheritance moves impl sub-issues to ToDo)

# Implementation phase (decide whether begin is needed by the plan Issue's status)
#   Only when the plan Issue is ToDo: begin to transition to In progress
#   When the plan Issue is already In progress: skip begin
shirokuma-flow begin {plan-issue-number}             # ToDo → In progress (only when ToDo)
Skill(skill: "implement-flow", args: "#{plan-issue-number}")
  → PR merge gate (when --autopilot):
     # Obtain the PR number: after implement-flow completes, check linked PRs via issue context
     shirokuma-flow issue context {plan-issue-number}  # → get pull_requests[0].number
     # Merge only when a PR exists (no PR on the no-changes path)
     if pull_requests is not empty:
       shirokuma-flow pr merge {pr-number}              # Review → Done
     else:
       # Completed with no changes (record as SUCCESS)
```

> **The source of truth for `approve` is the `approve-flow` SKILL.md** (all kinds Review → ToDo, side effects branch by `issue_kind`). Part of `pages/specs/workflow-status/` (the plan-approval transition) still has drift found in the ADR-v3-022 consistency audit, so this skill references the `approve-flow` SKILL.md as the source of truth.

> **Do not trigger `implement-flow`'s batch mode (M-1)**: Call `implement-flow` **once** per Issue (with a single Issue number). Passing multiple numbers at once like `#101 #102 #103` triggers `implement-flow`'s sequential batch, so always call one at a time (1 Issue = 1 PR).

#### 4c. Post the Audit Record

When `--autopilot`, record each auto-approval operation (submit/approve/PR merge) as a comment on the target Issue. See [reference/audit-record.md](reference/audit-record.md) for the format (record triage as 2 steps: submit + approve).

#### 4d. Record Results and Check Consecutive Failures

Record the result (SUCCESS / FAILED / SKIPPED) in the batch state and the batch summary Issue. Failure behavior (H-2):

```
On failure:
  if the Issue reached In progress:
    → shirokuma-flow block {number} --reason "autopilot: {failed phase/cause}"      # In progress → Blocked (the only failure transition)
    → consecutiveFailures += 1
  else:
    → no status change (skip straight to the next Issue; log only)
    → consecutiveFailures += 1
  → record the failure in the audit record (cause)

  if consecutiveFailures >= maxFailures (default 3):
    → stop entirely. Record in the batch summary Issue and report to the user
  else:
    → continue to the next Issue

On success:
  → consecutiveFailures = 0 (reset)
  → next Issue

On skip (Done / Blocked Issue):
  → consecutiveFailures = 0 (reset) — not a systematic failure; do not count toward consecutive failures
  → next Issue
```

> **`In progress → Blocked` is the only failure transition the CLI allows.** Do not forcibly change the status of an Issue that has not reached In progress (Backlog / ToDo / Review) on failure (log only and skip).

### Step 5: Completion Report

After processing all Issues (or after an auto-stop on consecutive failures), summarize and report the results. Follow the `completion-report-style` rule for formatting.

```
## Autonomous Processing Complete

**Batch ID:** autopilot-{timestamp}
**Processed:** {success} succeeded / {failed} failed / {skipped} skipped
**Batch summary:** #{summaryIssueNumber}

| Issue | Result | Phase | PR |
|-------|--------|-------|-----|
| #101  | SUCCESS | All phases complete | #201 |
| #102  | FAILED (Blocked) | Failed at prepare-flow | — |
| #103  | SUCCESS | All phases complete | #202 |
```

> **The `**Batch summary:** #{summaryIssueNumber}` line is conditional**: Display it only when `--autopilot` is set and `--dry-run` is not (i.e., when the batch summary Issue was actually created). In normal mode and dry-run mode, `summaryIssueNumber` is unset, so omit this line.

Update the batch summary Issue with the final results. If auto-stopped on consecutive failures, also list the unprocessed Issues and recommended actions (re-run the rest with `/autonomous-flow` or handle individually).

## Dry-run Mode (`--dry-run`)

Display planned actions without performing the operations. Show triage explicitly as 2 steps: submit + approve.

```
[Dry-run] The following operations are planned:

Issue #101 (title...):
  1. Triage submit: Backlog → Review (submit #101)
  2. Triage approve: Review → ToDo (approve #101) * approve can only run on Issues in Review
  3. Run design-flow (design needed: NEEDED)
  4. Design approve: Review → ToDo (approve #{design-issue-number})
  5. Run prepare-flow
  6. Plan approve: Review → ToDo (approve #{plan-issue-number})
  7. begin #{plan-issue-number} (ToDo → In progress)
  8. Run implement-flow
  9. PR merge (pr merge #{PR-number})

Issue #102 (title...):
  1. Resume from prepare-flow (status: ToDo / has child Issue "Plan:")
  ...

To actually run, remove --dry-run.
```

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Multiple Issues | `#101 #102 #103` | Explicit queue |
| Single Issue | `#101` | Process one only (the minimal queue for autonomous-flow) |
| No args | — | A filter is required; otherwise confirm via AskUserQuestion |

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--autopilot` | off | Autonomous mode (comprehensive delegation). Auto-pass approval gates |
| `--dry-run` | off | Display planned actions (do not perform operations) |
| `--status <status>` | — | Auto-collect the queue by status filter |
| `--label <label>` | — | Label filter (supplementary) |
| `--limit <n>` | 10 | Count limit (max 20) |
| `--max-failures <n>` | 3 | Consecutive-failure auto-stop threshold |

## Responsibility Boundaries

| Responsibility | autonomous-flow | implement-flow |
|----------------|----------------|----------------|
| Selecting and queueing target Issues | Owns | Out of scope |
| Phase-chain connection (design → prepare → implement) | Owns | Out of scope |
| Auto-passing approval gates | Owns (when `--autopilot`) | Out of scope (defers to the human via AskUserQuestion) |
| Implementing, committing, creating PRs for individual Issues | Delegates to `implement-flow` | Owns |
| Coding, testing, review responses | Delegates to `implement-flow` | Owns |

- **autonomous-flow processes one at a time, sequentially (H-3/M-1).** To avoid triggering `implement-flow`'s existing sequential batch mode, call `implement-flow` with a single Issue number per Issue.
- **The source of truth for approval is the `approve-flow` SKILL.md.** The drift in `status.md` (plan-approval transition) is to be addressed in a separate fix Issue; this skill references the transition definition (Review → ToDo) in the `approve-flow` SKILL.md.

## Edge Cases

| Situation | Action |
|-----------|--------|
| Empty queue | Warn and exit (nothing to process) |
| `--limit` exceeded | Warn + trim to the first N items (do not error out) |
| `approve` errors because not in Review | Run `submit` first, then `approve` (see [reference/chain-recovery.md](reference/chain-recovery.md)) |
| Consecutive failures reach the threshold | Stop entirely + record in the batch summary + present the list of unprocessed Issues |
| Issue already Done | Skip (record as processed) |
| Multiple Issues without `--autopilot` | Normal mode (AskUserQuestion at each gate). Do not create a batch summary Issue |
| Phase chain interrupted | Follow the recovery procedure in [reference/chain-recovery.md](reference/chain-recovery.md) |

## Rule References

| Rule | Purpose |
|------|---------|
| `project-items` | Status workflow, the "common gate for the next flow" section (source of truth for start behavior) |
| `output-language` | Language convention for GitHub output |
| `github-writing-style` | Bullet-vs-prose guidance |
| `completion-report-style` | Completion-report formatting |
| `approve-flow` skill | Source of truth for approval transitions (Review → ToDo, side effects branch by issue_kind) |

## Tool Usage

| Tool | Timing |
|------|--------|
| AskUserQuestion | Confirm autonomous mode / queue, each approval gate in normal mode |
| Bash | `shirokuma-flow submit/approve/begin/block/issue list/issue add/issue comment/pr merge` |
| Skill | Launch `design-flow` / `prepare-flow` / `implement-flow` |
| TaskCreate, TaskUpdate | Track batch-processing step progress |

## Notes

- This skill is the **manager (the AI agent in the main process)** for multi-Issue processing, a higher-level orchestrator that launches each phase flow via the Skill tool
- **Assumed effort**: xhigh. It carries out chain orchestration across multiple Issues × multiple phases, so secure sufficient reasoning depth
- **Autonomous mode is opt-in**: Without `--autopilot`, it runs in normal mode (AskUserQuestion at each gate). It does not auto-pass approvals by default
- **The orchestrator completes approval gates first via the CLI** before launching the next phase (does not bypass the AskUserQuestion of each flow skill)
- **Chain autonomy (most important)**: After a phase flow (Skill tool) completes, proceed to approval-gate handling → next-phase launch within the same response. Do not stop until a single Issue's phase chain is complete
- All auto-approvals are kept in audit records (per-Issue comments + batch summary Issue) and are reviewable afterward
- Parallel batch processing is out of scope (`parallel-coding-worker` is deprecated). Sequential processing only

---
name: implement-flow
description: Dispatches work by taking an issue number or task description, selecting the appropriate skill, and orchestrating the full workflow from implementation to PR. Triggers: "work on", "work on #42", "do this", "start working".
allowed-tools: Bash, Read, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---

!`shirokuma-flow rules inject --scope orchestrator`

# Working on Issue (Orchestrator)

> **Chain Autonomous Progression (MOST IMPORTANT RULE)**: When a Skill tool or Agent tool completes, you **MUST invoke the next tool in the same response**. This is the single most important rule of this orchestrator. Generating a text-only response while TaskList has pending steps is a chain-breaking error that forces the user to manually type "continue".

Orchestrate the full workflow from planning to implementation, commit, and PR based on issue type or task description.

**Note**: For session setup, use `starting-session`. This skill works both within a session and standalone (without `starting-session`). It is the primary entry point for working on a specific task in either mode.

## Task Registration (Required)

Register **all chain steps** via TaskCreate **before starting work**.

**Implementation / Bug Fix / Refactoring / Chore:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Implement changes | Implementing changes | `code-issue` (subagent: `coding-worker`) |
| 2 | Commit and push changes | Committing and pushing | `commit-issue` (subagent) |
| 3 | Create pull request (PR created in Backlog) | Creating pull request | `open-pr-issue` (subagent) |
| 4 | Run AI review (transition PR to Review on PASS) | Running AI review | `review-flow` (Skill tool) |
| 5 | Post-process code (simplify, security review, lint docs, improvement commit) | Post-processing code | `finalize-changes` (Skill tool) |
| 6 | Post work summary | Posting work summary | Manager direct: `issue comment` |
| 7 | Verify PR has transitioned to Review (**do NOT transition the issue to Review**) | Verifying PR status | Manager direct: `status get <PR>` |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4, step 6 blockedBy 5, step 7 blockedBy 6.

> **Step 4 positioning (AI review gate)**: The `pr create` invocation in step 3 creates the PR itself in **Status: Backlog** (#2802). This step invokes `review-flow` via the Skill tool to run the AI review, and **only on PASS** does `review-flow` transition the PR from `Backlog → Review` (the explicit signal that code review is complete). `review-flow` is an orchestrator launched via the Skill tool and completes in the main context.
>
> **Stop the chain on FAIL**: If the AI review FAILs (or has unresolved threads), the PR stays in `Backlog` and `review-flow` enters its thread-handling flow. In that case, stop the chain and return control to the user. The PR only moves to Review once a fix + re-review passes.

> **Step 7 positioning (PR state verification only)**: This step only verifies via `status get <PR>` that `review-flow` (step 4) has transitioned the PR to **Status: Review** after an AI review PASS. It does NOT `submit` the issue or plan issue (per the "DO NOT" list in `project-items.md` Review section — one-Review-per-entity principle).
>
> During implementation, the PR itself carries `Status: Review`; the issue and plan issue stay in In progress. They transition directly to `Status: Done` at `pr merge` time.
>
> **When PR is not in Review**: The case where the chain continues with the AI review still FAILed is not expected (FAIL stops the chain at step 4). If verification finds the PR not in Review, it means the AI review is incomplete, so check the `review-flow` state. **Never submit the issue or plan issue.**

> **No-changes branch**: When `coding-worker` completes with `changes_made: false`, skip steps 2–5 (commit, PR, review-flow, finalize-changes) and proceed to step 6 (no-changes work summary) → step 7 (status determination). See the "No-Changes Path" sections in [reference/chain-execution.md](reference/chain-execution.md) and [reference/chain-end-steps.md](reference/chain-end-steps.md) for details.

**Research:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Conduct research | Conducting research | `researching-best-practices` (subagent) |
| 2 | Save findings to Discussion | Creating Discussion | `shirokuma-flow discussion add` |

Dependencies: step 2 blockedBy 1.

Use TaskUpdate to set each step to `in_progress` when starting and `completed` when done.

## Workflow

### Step 1: Analyze Work

#### Plan Issue Auto-Resolution (Step 1 Pre-processing)

When the received issue title starts with "Plan: " or "計画: ", treat it as a plan issue and auto-redirect to the parent issue:

1. Check the `parent` field from the cache frontmatter
2. If `parent` is set → run `issue context` with the parent issue number, and continue the flow using the parent issue number (the plan issue number is only used for plan context reference)
3. If `parent` is not set → re-fetch via `issue context {number}` to check for `parent`
4. If `parent` is still unknown → display error message and stop:
   "Cannot determine parent issue for plan issue #{number}. Please specify the parent issue number directly."

**Issue number provided**: `shirokuma-flow issue context {number}` to fetch and cache, then read `.shirokuma/github/{org}/{repo}/issues/{number}/body.md` to extract title/body/labels/status/priority/size.

#### Sub-Issue Detection

When `.shirokuma/github/{org}/{repo}/issues/{number}/body.md` frontmatter contains a `parentIssue` field, the issue is a sub-issue of an epic:

1. Identify the plan issue (child issue with a title starting with "Plan:" or "計画:") from the parent's `subIssuesSummary`, fetch it via `issue context {plan-issue-number}`, and use its body as overall context
2. Set base branch to the parent's integration branch instead of `develop` (Step 3)
3. `open-pr-issue` will self-detect the sub-issue via the `parentIssue` field, so explicit context passing is not required (if passed, it is used as supplementary; otherwise, self-detection is the fallback)

```bash
# Check parent issue
shirokuma-flow issue context {parent-number}
# → Read .shirokuma/github/{org}/{repo}/issues/{parent-number}/body.md
# Identify child issue with title starting with "Plan:" from subIssuesSummary
shirokuma-flow issue context {plan-issue-number}
# → Fetch plan body and use as context
```

#### Plan Check (when issue number provided)

Check `subIssuesSummary` for a child issue with a title starting with "Plan:" or "計画:".

| Plan State | Condition | Action |
|-----------|-----------|--------|
| — | Review status | → Review status priority path (follow flow below) |
| No plan issue | Size XS/S (clear requirements) and not a sub-issue, and not Review | → Skip planning, proceed directly to `code-issue` |
| No plan issue | Size M+ or ambiguous requirements | → Delegate to `prepare-flow` |
| No plan issue | Sub-issue (`parentIssue` present) | → Delegate to `prepare-flow` regardless of size |
| Plan issue exists | — | → Fetch plan issue body via `issue context {plan-issue-number}` and pass as context to implementation skill |

#### Review Status Priority Path

Review status is an explicit signal that planning is complete. It takes priority over Size-based determination regardless of issue size. Decision flow:

```
Review status
  → Check for plan issue (child issue with title starting "Plan:" in subIssuesSummary)
    exists → Fetch plan issue body and use as context (same as normal path)
    none → Anomaly: status is Review but no plan found
           → Display warning message, fall back to Size-based determination
```

Warning message example for anomaly fallback: "⚠️ Status is Review but no plan issue was found. Falling back to Size-based determination."

#### Fetching Plan Details

When a plan issue exists (new approach):

```bash
shirokuma-flow issue context {plan-issue-number}
# → Read .shirokuma/github/{org}/{repo}/issues/{plan-issue-number}/body.md to get plan content
```

**XS/S direct implementation path criteria:** Apply when the Issue Size field is XS or S, and the title and body clearly indicate what needs to be changed (mechanical transformation such as pattern replacement, type fix, rename). Sub-issues (`parentIssue` field present) always require a plan regardless of size. Additionally, issues with Review status are excluded from this path (the Review status priority path is evaluated first). If Size is unset, requirements are ambiguous, the issue is a sub-issue, or judgment is uncertain, delegate to `prepare-flow`. See the `issue-flow` skill "Requirements Clarity Criteria" for the canonical definition.

#### Reading Phase / PR Timing from the Plan (Required)

After fetching the plan Issue body, **always parse the PR timing section first**. Common patterns:

| Plan instruction | Implementation scope and PR timing |
|------------------|-----------------------------------|
| "Commit at the end of each Phase, open PR after Phase {final}" | **Implement all phases together and open a single PR**. Do not open per-phase PRs |
| "Open a PR per Phase" | Open one PR per phase (only when explicitly stated) |
| No statement | Single PR as usual |

The prompt passed to `coding-worker` (Agent) must include **all phases that should be implemented**, based on this parse. Do not narrow scope to "Phase 0 only" unless the plan explicitly says "PR per phase".

**Past failure:** An XL Issue's plan said "open PR after all phases complete" but the implementer scoped the worker to Phase 0 and opened a PR there, contradicting the user's instruction "do everything at once".

#### Transition from In Progress Status (Planning Phase)

| Plan state | Action |
|-----------|--------|
| In Progress + no plan | → Delegate to `prepare-flow` |
| In Progress + plan exists | → Transition to Review, ask user approval |

**Text description only**: Classify using dispatch condition table (Step 4) keywords.

### Step 1a: Issue Resolution (text description only)

When called with text only, delegate to `issue-flow` skill to ensure an issue exists.

```text
Text description → issue-flow → Issue number → Join Step 1
```

### Step 2: Update Status

If issue is not already In Progress: run `shirokuma-flow begin {number}` (transitions status to In progress and assigns @me)

**Start-work behavior (Next-Flow Common Gate)**: The "start-work behavior" of a task Issue by status is **canonically defined in the "Next-Flow Common Gate" section of the `project-items` rule**. The summary below uses identical transitions.

| Current task Issue Status | Action |
|---------------------------|--------|
| `Backlog` (untriaged) | Cannot start. Triage incomplete — guide the user to advance to `Review` (triage-pending) and stop |
| `Review` (triage-pending) | Confirm approval via AskUserQuestion → if approved, `approve` (normal branch) for `Review → ToDo` → `begin {plan-issue-number}` for In progress and start implementation |
| `ToDo` (approved) | Run `begin {plan-issue-number}` directly for In progress and start implementation |
| `In progress` (continuing) | Skip status update and continue implementation |

> **Distinction from the plan issue child's Review**: The table above is the common gate for the **task Issue (parent)** status. When `/implement-flow` is invoked from a **plan Issue (child)** in Review, first prompt `approve {plan-issue-number}` (`Review → ToDo`; the plan issue is the implementation unit, so it is not set to Done), then run `begin` (`ToDo → In progress`) on the **plan Issue itself**. The parent (task) Issue is not operated directly — `syncParentStatus` derives it from its children. See the "Next-Flow Common Gate" section of the `project-items` rule for details.

Guidance message when plan Issue is still in Review:

```text
Plan Issue #{plan-number} is in Review status.
To start implementation, please approve the plan first:
  shirokuma-flow approve {plan-number}
  (This transitions the plan issue Review → ToDo; syncParentStatus then derives the parent from its children)
```

> **Note**: `approve` branches by `issue_kind`. For plan/design issues it transitions `Review → ToDo` (plan/design approved, ready to start — not set to Done in the planning phase), and `syncParentStatus` then derives the parent issue from its children. For a plan issue's approve, approval inheritance additionally cascades sibling implementation sub-issues under the same parent from `Backlog → ToDo`. For task issues (normal branch = triage approval) it also transitions `Review → ToDo` (ready to start).

### Step 3: Ensure Feature Branch

If on `develop` (or the integration branch for sub-issues), create branch per `branch-workflow` rule:

```bash
# Normal issue
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}

# Sub-issue (branch from integration branch)
git checkout epic/{parent-number}-{slug} && git pull origin epic/{parent-number}-{slug}
git checkout -b {type}/{number}-{slug}
```

**Sub-issue integration branch detection** (in order):

1. Extract branch name from parent issue body: look for `### Integration Branch` (EN) / `### Integration ブランチ` (JA) heading, extract branch name from the backtick block immediately following (any prefix accepted: `epic/`, `chore/`, `feat/`, etc.)
2. Fallback: `git branch -r --list "origin/*/{parent-number}-*"` (1 match → auto-select, multiple → AskUserQuestion, 0 → fall back to `develop`)
3. Not found: Use `develop` as base and warn user

### Step 3b: Propose ADR (Feature M+ only)

For Feature type, Size M+, suggest ADR creation (AskUserQuestion).

### Step 3c: Detect Local Documentation (coding tasks only)

For coding-type tasks (implementation, bug fix, refactoring), detect available local documentation before invoking `code-issue`:

```bash
shirokuma-flow docs detect --format json
```

Collect `status: "ready"` sources and include in the Agent prompt (use `docs search "<keyword>" --source <name> --section`). Omit if no ready sources or non-coding task.

### Step 4: Select and Execute Skill

#### Dispatch Condition Table

| Work Type | Condition | Delegate To | TDD |
|-----------|-----------|-------------|-----|
| General Coding | Implementation, bug fix, refactoring, config, Markdown editing | `code-issue` (subagent: `coding-worker`) | Yes (implementation, bug fix, refactoring) |
| Research | Keywords: `research`, `investigate` | `researching-best-practices` (subagent) | No |
| Review | Keywords: `review`, `audit` | `review-issue` (subagent: `review-worker`) | No |
| Project Setup | Keywords: `setup project`, `initialize` | `setting-up-project` | No |

**Pre-resolution logic**: Subagent workers cannot use `AskUserQuestion`, so the manager (main AI) resolves edge cases before invocation:

| Edge Case | Manager's (Main AI) Pre-action |
|-----------|---------------------|
| Staging target files unclear | Check `git status` and pass file list as argument |
| Multiple branch matches | Check branch list and pass correct branch as argument |
| Uncommitted changes present | Invoke `commit-issue` first |

#### TDD Workflow (when TDD applies)

For TDD-applicable work types, wrap the `code-issue` invocation with TDD:

```text
Test Design → Test Creation → Test Gate → [code-issue] → Test Run → Verification
```

See [docs/tdd-workflow.md](docs/tdd-workflow.md) for details.

### Step 5: Sequential Workflow Execution

After work completes, execute the chain **automatically**. No user confirmation between steps.

| Work Type | Chain |
|-----------|-------|
| General Coding | Work → Commit → PR(Backlog) → review-flow → [Review] → finalize-changes → Work Summary + PR Page Generation → Status Update |
| Research | Research → Discussion |
| Review | Review → Report posted → Complete (no commit/PR chain) |

> **AI review gate in the coding chain (#2802)**: `PR(Backlog)` denotes that `pr create` creates the PR in Backlog. When `review-flow`'s AI review PASSes, it proceeds to `[Review]` (transitioning the PR `Backlog → Review`). If the AI review FAILs or has unresolved threads, stop the chain and return control to the user (the PR stays in Backlog).

- **Merge is NOT part of the chain**
- No confirmation between steps, one-line progress reports
- On failure: stop chain, report status, return control to user

**Chain completion guarantee**: After each skill/subagent completes, the manager (main AI) **immediately proceeds to the next step**. The Status Update at the end of the chain is executed directly by the manager (not via subagent), eliminating the risk of chain interruption.

**Skill tool vs Agent tool completion patterns:**

| Invocation Method | Completion Handling |
|-------------------|-------------------|
| Skill tool (`reviewing-claude-config`, etc.) | Completes in main context. Proceed to next step if no errors. No YAML parsing needed |
| Agent tool (`coding-worker`, `review-worker`, `commit-worker`, `pr-worker`) | Parse YAML frontmatter for `action` field: `CONTINUE` → next step, `STOP` → halt (see [reference/worker-completion-pattern.md](reference/worker-completion-pattern.md)) |

**Agent tool output parse checkpoint** — On receiving Agent tool (subagent) output:

1. Read `action` from YAML frontmatter
2. `action: CONTINUE` → apply the exception checks below, then **immediately** invoke the skill in the `next` field **in the same response** (output only a one-line summary from the body's first line)
3. `action: STOP` / `REVISE` → stop chain, report to user

Exceptions (in priority order):
1. **`coding-worker` with `changes_made: false`**: Ignore the `next` field and branch to the no-changes chain (see "No-Changes Path" in [reference/chain-execution.md](reference/chain-execution.md)). This is evaluated before the `ucp_required` check
2. **`ucp_required: true` or `suggestions_count > 0`**: Present to user via AskUserQuestion before continuing

**The core rule: when a skill or subagent completes, respond with a tool call, not text output.**

**Tasks continuation invariant**: After each skill/subagent completes, check TaskList. If any step is still `pending`, you MUST invoke the next tool call in the same response — generating a final text-only response while pending steps remain is a chain-breaking error.

See [reference/chain-execution.md](reference/chain-execution.md) for the full chain delegation table, pseudocode, and Agent tool structured data field definitions.

#### Skill and Subagent Invocation Pattern

Skills are invoked via Skill tool (main context) or Agent tool (subagent). Skills benefiting from context isolation run as subagents to prevent main context bloat. Rules are injected into sub-agents via `` `shirokuma-flow rules inject --scope {worker}` `` in each worker skill.

| Skill | Invocation | Reason |
|-------|-----------|--------|
| `code-issue` | Agent (`coding-worker`) | Context isolation (implementation work bloats main context) |
| `review-flow` | Skill tool | AI review gate orchestrator. Transitions the PR `Backlog → Review` on PASS. **Do NOT invoke via Agent tool** (it is an orchestrator that completes in the main context) |
| `finalize-changes` | Skill tool | Post-processing chain: `/simplify` + `reviewing-security` + `lint docs` + improvement commit. **Do NOT invoke via Agent tool** |
| `review-issue` | Agent (`review-worker`) | Context isolation + opus model selection |
| `reviewing-claude-config` | Skill tool | Needs project rules for quality standards, relatively lightweight |
| `commit-issue` | Agent (`commit-worker`) | Git operations only |
| `open-pr-issue` | Agent (`pr-worker`) | GitHub operations only |
| `researching-best-practices` | Agent (`research-worker`) | External research |

**Skill tool:** `Skill(skill: "{name}", args: "#{number}")`

**Agent tool:** `Agent(description: "{worker} #{number}", subagent_type: "{worker}", prompt: "#{number}")`

**⚠️ `pr-worker` MUST include the issue number in prompt** (omitting it skips `Closes #N` and breaks the PR-Issue link).

> **CRITICAL — Chain continuation after Skill tool / Agent tool returns**: When a Skill tool (`finalize-changes`, etc.) or sub-agent (`pr-worker`, `commit-worker`, etc.) completes, **check TaskList for remaining `pending` steps**. If pending steps remain (commit, PR creation, work summary, status update), **immediately proceed to the next pending step in the same response**. Do NOT stop, summarize, or ask the user. A Skill tool or Agent tool returning is a chain mid-point, not a completion signal. The PR → `finalize-changes` transition is particularly prone to chain breaks — pay extra attention.

See [reference/chain-end-steps.md](reference/chain-end-steps.md) for details on chain end steps (work summary, status update, plan issue done update, next steps suggestion).

See the "PR Page Generation (HTML)" section in [reference/chain-end-steps.md](reference/chain-end-steps.md) for the PR page (HTML) generation procedure.

### Step 6: Evolution Signal Auto-Recording

After successful chain completion (skip on chain failure), auto-record Evolution signals following the "Auto-Recording Procedure at Skill Completion" in the `rule-evolution` rule. Do not register as a task (non-blocking processing).

## Auto-Actions After PR Merge (Out-of-Chain)

**Merge is not part of the chain.** Run `shirokuma-flow pr merge` separately. Post-merge auto-actions (Done transitions, syncParentStatus, next-issue suggestions) are handled by `pr merge`. Follow its `next_action` directive.

## Batch Mode

Multiple issues (e.g., `#101 #102 #103`) are processed sequentially in a single branch and PR. See [reference/batch-workflow.md](reference/batch-workflow.md) for details.

> **Parallel batch is deprecated** (`parallel-coding-worker` removed). Use sequential batch.

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `#42` | Fetch issue, analyze type |
| Multiple issues | `#101 #102 #103` | Sequential batch mode |
| Description | `implement dashboard` | Text classification → `issue-flow` |
| No argument | — | AskUserQuestion |

### Flags

| Flag | Description |
|------|-------------|
| `--headless` | Headless mode. Applies default behaviors to UCPs and skips interactive confirmations |

## Headless Mode (`--headless`)

Applies default behaviors to UCPs and completes the chain without interactive confirmations. See [reference/headless-mode.md](reference/headless-mode.md) for preconditions, UCP default behaviors, and usage examples.

**Preconditions (summary):** Explicit issue number / status is Review or ToDo / plan issue exists — all three must be satisfied.

## Edge Cases

| Situation | Action |
|-----------|--------|
| Issue not found | AskUserQuestion for number |
| Issue Done | Warn, confirm reopen |
| Already In Progress | Continue without status change |
| Wrong branch | AskUserQuestion: switch or continue |
| Chain failure | Report completed/remaining steps, return control. See [reference/chain-recovery.md](reference/chain-recovery.md) |
| `coding-worker` completes with `changes_made: false` | Skip commit / PR / finalize-changes, post no-changes work summary, confirm status via AskUserQuestion (cancel via `issue cancel` — internally translated to Done + state_reason: not_planned / Blocked / ToDo). See "No-Changes Path" in [reference/chain-end-steps.md](reference/chain-end-steps.md) |
| Issue was reverted (after PR revert) | Run `shirokuma-flow issue rollback {plan-issue#} --action revert` to batch-execute revert branch creation, revert PR creation, and reset the plan Issue to ToDo. Then re-implement on a new branch. See [reference/chain-recovery.md](reference/chain-recovery.md) |
| Sub-issue with no integration branch | Use `develop` as base, warn user |
| Epic issue selected directly | Check for non-plan child issues; see "Epic Issue Entry Point" below |
| `--headless` + precondition not met | Display error message and stop |
| `--headless` + wrong branch (W4) | Warn and stop (no auto-switch) |
| `--headless` + worker UCP (W5) | Skip and record in Issue comment |

See [reference/chain-recovery.md](reference/chain-recovery.md) for details on recovery after PR revert and chain recovery procedure.

## Epic Issue Entry Point

When an epic issue is directly specified, execute the epic workflow instead of standard implementation dispatch.

See [reference/epic-entry.md](reference/epic-entry.md) for details (preconditions, integration branch creation, sub-issue batch creation, execution order presentation).

**Flow summary:** Create integration branch → batch-create sub-issues (if none exist) → present execution order and stop (do not start implementation immediately).

## Rule References

| Rule | Usage |
|------|-------|
| `branch-workflow` | Branch naming, creation from `develop`, integration branch |
| `batch-workflow` | Batch eligibility, quality standards, branch naming |
| `epic-workflow` reference | Epic/sub-issue workflow overview |
| `project-items` | Status workflow, field requirements, "Next-Flow Common Gate" section (canonical start-work behavior), "What/Why Separation" section (on plan deviation, update Issue body = latest What payload / record the deviation reason in a comment first) |
| `git-commit-style` | Commit message format |
| `output-language` | GitHub output language convention |
| `github-writing-style` | Bullet-point vs prose guidelines |
| `worker-completion-pattern` reference | Worker completion unified pattern, extended schema |

## Tool Usage

| Tool | When |
|------|------|
| AskUserQuestion | Requirement clarification, approach selection, edge cases (manager (main AI) pre-resolves) |
| TaskCreate, TaskUpdate | Chain step registration and status updates (required for all work) |
| TaskList, TaskGet | Check pending steps and task state |
| Bash | Git operations, `shirokuma-flow issue` commands |

## Notes

- This skill is the **manager (the main-process AI agent)** — work is delegated via Agent tool (coding-worker, review-worker, commit-worker, pr-worker, research-worker) or Skill tool (reviewing-claude-config)
- **Effort assumption**: Assumes xhigh. Ensures sufficient reasoning depth for multi-step chain orchestration
- Update issue status before starting
- Ensure correct feature branch
- TDD-applicable work types wrap `code-issue` invocation with TDD ([docs/tdd-workflow.md](docs/tdd-workflow.md))
- Workflow executes sequentially (Commit → PR → Work Summary → Status Update). **Merge is NOT included**
- Chain execution stops on error and returns control to user
- **Chain autonomous progression (MOST IMPORTANT)**: When a Skill tool or Agent tool completes, respond with a tool call, not text output. As long as TaskList has pending steps, invoke the next Skill/Agent tool in the same response. The `open-pr-issue` → manager steps transition is the most common break point — immediately execute Work Summary → Status Update via Bash

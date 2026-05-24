# Phase-Resumption Detection / Chain Recovery Reference

The phase-resumption detection algorithm for `autonomous-flow` and a recovery guide for interrupted chains.

See: [SKILL.md](../SKILL.md)

## Phase-Resumption Detection Algorithm

At the start of processing each Issue, determine "which phase to start from" based on the current status and child-Issue composition. In particular, **ToDo is ambiguous** (awaiting design / awaiting plan / awaiting implementation), so disambiguate by child-Issue presence and titles.

### Start Phase by Status

| Current status | Start phase |
|----------------|-------------|
| Backlog | `submit` (Backlog → Review) → `approve` (Review → ToDo) → child-Issue determination |
| Review (awaiting triage) | `approve` (Review → ToDo) → child-Issue determination |
| ToDo | Follow "ToDo Disambiguation" below |
| In progress | Continue the current phase (determine by child-Issue status) |
| Done | Skip (record as processed) |
| Blocked | Skip (log as requiring manual handling) |

### ToDo Disambiguation (pseudocode)

For a ToDo Issue, disambiguate the phase by child-Issue presence and title prefix.

```text
# Get child Issues from subIssuesSummary of issue context {number}
children = issue_context.subIssuesSummary

if children is empty:
    # No child Issues → neither design nor plan exists yet → roughly the issue-flow phase
    # = start from design-flow (which includes the design-needed determination)
    start_phase = "design-flow"  # if design-flow determines NOT_NEEDED, it auto-advances to prepare-flow

else:
    design_child = the child whose title starts with "Design:" or "設計:"
    plan_child   = the child whose title starts with "Plan:" or "計画:"

    if design_child exists and design_child.status in [Backlog, Review]:
        # Design phase incomplete
        start_phase = "design-flow"

    elif plan_child exists:
        if plan_child.status == ToDo:
            # Plan approved, awaiting start → begin then implement
            start_phase = "implement-flow"  # begin {plan_child.number} beforehand
        elif plan_child.status in [Backlog, Review]:
            # Planning phase continues (planning in progress or awaiting plan approval)
            start_phase = "prepare-flow"
        else:
            # In progress / Done etc. → implementation phase
            start_phase = "implement-flow"

    elif design_child exists and design_child.status == ToDo:
        # Design approved, planning not started → from the planning phase
        start_phase = "prepare-flow"

    else:
        # Has child Issues but they are not design/plan Issues (e.g., impl sub-issues)
        # → planning is needed
        start_phase = "prepare-flow"
```

### Disambiguation Logic Summary

| Child-Issue state | Start phase |
|-------------------|-------------|
| No child Issues | From `design-flow` (includes design-needed determination) |
| "Design:" child is Backlog/Review | Resume from `design-flow` |
| "Design:" child is Backlog/Review + "Plan:" child also exists | Resume from `design-flow` (algorithm priority: design > plan > implement) |
| "Design:" child is ToDo (planning not started) | From `prepare-flow` |
| "Plan:" child is Backlog/Review | Resume from `prepare-flow` |
| "Plan:" child is ToDo | `begin` then `implement-flow` |
| "Plan:" child is In progress/Done | From `implement-flow` |
| Only impl sub-issues (no plan Issue) | From `prepare-flow` |

> **begin when the plan Issue is ToDo**: Plan approval (`approve`) transitions the plan Issue `Review → ToDo`. Before starting implementation, transition `ToDo → In progress` via `shirokuma-flow begin {plan-issue-number}`, then launch `implement-flow` (since `ISSUE_FORWARD_TRANSITIONS` has no direct Backlog → In progress transition, always go through ToDo).

## Idempotency of the Triage 2-step (H-1)

Triage approval is done in **2 steps: submit → approve**. Skip steps based on the current state.

| Current status | submit | approve |
|----------------|--------|---------|
| Backlog | Run (Backlog → Review) | Run (Review → ToDo) |
| Review | Skip (already Review) | Run (Review → ToDo) |
| ToDo or later | Skip | Skip (already approved) |

> **The CLI rejects `approve` with an error if the Issue is not in Review** (returns `result: "error"`). Calling `approve` directly from Backlog fails, so always run `submit` first. For an Issue already in Review, skip `submit` and run `approve` only.

## Recovery by Interruption Point

If the phase chain stops mid-stream, identify which phase it stopped at before resuming.

### Resumable State by Phase

| Stopped phase | Check | Recovery action |
|---------------|-------|-----------------|
| Triage (submit/approve) | Check status via `issue context {n}` | If Review, `approve`; if Backlog, `submit` → `approve` |
| design-flow | Presence/status of "Design:" child Issue | Relaunch `design-flow` via the Skill tool |
| prepare-flow | Presence/status of "Plan:" child Issue | Relaunch `prepare-flow` via the Skill tool |
| implement-flow | Check PR via `gh pr list --head {branch}` | Relaunch `implement-flow` via the Skill tool (idempotent) |
| PR merge | Check merge state via `shirokuma-flow pr view {pr}` | If not merged, `pr merge {pr}` |

### Whole-batch Recovery

If batch processing is interrupted (auto-stop on consecutive failures / session disconnect, etc.), the batch summary Issue is the source of truth for processing state.

```text
1. Read the batch summary Issue → check each Issue's result (SUCCESS / FAILED / SKIPPED / Pending)
2. Re-run "Pending" Issues as a new queue via /autonomous-flow
3. Recommend handling FAILED (Blocked) Issues individually (may exclude from autonomous re-run)
```

## Idempotency Guarantees

| State | Behavior |
|-------|----------|
| Already triaged (Review/ToDo) | Skip `submit`/`approve` per state |
| Plan Issue already exists | `prepare-flow` confirms overwrite (autopilot respects the existing plan) |
| Branch already exists | `implement-flow` switches to the existing branch |
| PR already exists | `implement-flow` (pr-worker) detects and skips |
| PR already merged | Skip `pr merge` (record as Done) |
| Batch summary Issue already exists | Update the existing one instead of creating a new one (on re-run) |

## Notes

- Do not skip phases — each phase's deliverable (design Issue / plan Issue / PR) is used by the next phase
- If recovery repeatedly fails, record the current state in the batch summary Issue, report to the user, and stop
- After an auto-stop on consecutive failures, verify the root cause (possibly a systemic problem) before re-running

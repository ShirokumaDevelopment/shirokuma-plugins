# Chain Execution Reference

Detailed reference for Step 5 (Sequential Workflow Execution) in `implement-flow`.

## Chain Delegation Table (MUST follow)

| Completed Skill | Invocation | Next Skill | Invocation | Prohibited Action |
|----------------|-----------|------------|-----------|------------------|
| `code-issue` (`changes_made: true`) | Agent (`coding-worker`) | `commit-issue` | Agent (`commit-worker`) | Do NOT re-invoke `code-issue` |
| `code-issue` (`changes_made: false`) | Agent (`coding-worker`) | **No-changes chain** (see "No-Changes Path" below) | Manager direct execution | Skip commit / PR / finalize-changes |
| `commit-issue` | Agent (`commit-worker`) | `open-pr-issue` | Agent (`pr-worker`) | Do NOT delegate to `code-issue` |
| `open-pr-issue` | Agent (`pr-worker`) | `finalize-changes` | Skill tool | The PR stays in Backlog. The Review transition is performed when the user runs `/review-flow`. implement-flow does NOT auto-launch code review (#2818) |
| `finalize-changes` | Skill tool | **Start manager-managed steps** (see below) | Direct execution | Do NOT invoke via Agent tool |
| `review-issue` | Agent (`review-worker`) | **Complete** (no commit/PR chain; see Review Work Type below for CONTINUE/STOP details) | — | Do NOT trigger commit chain |

## Testing Status Transition Policy

The `Testing` status is NOT automatically set by `implement-flow`. It is transitioned manually by the user or automatically after CI completion.

| Trigger | Who Sets It |
|---------|------------|
| CI pipeline completes successfully | CI system (auto) or user |
| User manually verifies the implementation | User (manual) |
| After PR is merged and deployed to staging | User (manual) |

**Do NOT** set status to `Testing` within the chain. The chain creates the PR in Backlog and ends the chain with the PR still in Backlog (#2818). The `Backlog → Review` transition happens when the user runs `/review-flow` (#2802). The issue itself is not changed at the end of the chain (one-Review-per-entity principle). `Testing` is the responsibility of the human or CI system.

## Manager-Managed Steps After `finalize-changes` (Most Common Break Point)

After `finalize-changes` completes, the next steps are manager-direct, not subagent. The post-processing completion gives a visual "done" feeling, but **TaskList still has pending steps**. Do NOT stop — execute the following via Bash tools **in the same response**:

1. **Work Summary**: Post work summary as Issue comment (Bash: `shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-work-summary.md`)
2. **Next-flow guidance**: At the end of the chain, present `/review-flow #{PR#}` as guidance. The PR stays in Backlog through the end of the chain. Do NOT verify the PR's Review status (implement-flow does NOT auto-launch code review; #2818). **Do NOT `submit` the issue itself to Review** (one-Review-per-entity principle)
3. **Evolution**: Auto-record signals (Step 5)

> **Why breaks happen here**: PR creation and the finalize-changes chain have strong visual "completion" cues that cause the LLM to output a summary and stop. But the chain is not done until TaskList pending count reaches 0.

## Chain Progression Logic (Pseudocode)

```text
// Step 1: code-issue (Agent tool — coding-worker)
subagent_output = invoke_agent("coding-worker")
frontmatter, body = parse_yaml_frontmatter(subagent_output)
if frontmatter.action == "STOP":
  handle_failure(frontmatter, body)
  break
TaskUpdate("implement", "completed")

// Step 1b: No-changes branch (coding-worker only)
if frontmatter.changes_made == false:
  // Skip commit / PR / finalize-changes, proceed to no-changes chain
  // See chain-end-steps.md "No-Changes Path" section
  execute_no_changes_chain(frontmatter, body)
  break

// Steps 2-3: commit, pr (Agent tool — subagent)
// pr create creates the PR in Backlog (#2802). The PR stays in Backlog through the end of the chain
for each step in [commit, pr]:
  subagent_output = invoke_agent(step)
  frontmatter, body = parse_yaml_frontmatter(subagent_output)
  if frontmatter.action == "STOP":
    handle_failure(frontmatter, body)
    break
  TaskUpdate(step, "completed")

// Step 4: finalize-changes (Skill tool)
// Encapsulates: /simplify → reviewing-security → lint docs → improvement commit (if changes)
// implement-flow does NOT auto-launch code review (review-flow) (#2818)
invoke_skill("finalize-changes")
// Skill tool completes in main context. Proceed if no errors.
TaskUpdate("finalize_changes", "completed")

// Steps 5-6: work_summary, next_flow_guidance (manager direct execution)
post_work_summary()  // shirokuma-flow issue comment {N} /tmp/...
TaskUpdate("work_summary", "completed")
// At the end of the chain, present /review-flow #{PR#} as guidance. The PR stays in Backlog (no verification)
// The Backlog → Review transition happens when the user runs /review-flow
guide_next_flow()  // present "/review-flow #{PR#}"
TaskUpdate("next_flow_guidance", "completed")
```

## No-Changes Path (`changes_made: false`)

When `coding-worker` completes with `changes_made: false`, the normal commit → PR → finalize chain is not executed. Instead, the following manager-direct steps run:

1. **Post no-changes work summary**: Post Issue comment as an investigation result (see "No-Changes Work Summary" in chain-end-steps.md)
2. **Status determination**: Determine the reason from the coding-worker body and update status (see "Status Determination for No Changes" in chain-end-steps.md)
3. **Next-step suggestions**: Omit `/review-flow` since no PR exists

Mark the commit-issue / open-pr-issue / finalize-changes tasks as `skipped` (or treat as `completed`-equivalent skip).

## Agent Tool Structured Data Field Definitions

Applies to `commit-worker` and `pr-worker`:

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `action` | Yes | `CONTINUE` / `STOP` | Behavioral directive for orchestrator (first field) |
| `next` | Conditional | skill name | Skill to invoke when `action: CONTINUE` |
| `status` | Yes | `SUCCESS` / `FAIL` | Result state |
| `ref` | Conditional | GitHub reference | Human-readable reference when GitHub write occurred |
| `comment_id` | Conditional | numeric (database_id) | Only when a comment was posted. For reply-to / edit |
| `ucp_required` | No | boolean | Set to `true` when the worker requires user judgment |
| `suggestions_count` | No | number | Number of improvement suggestions |
| `followup_candidates` | No | string[] | Follow-up Issue candidates |

The `Summary` field is abolished. Instead, the **body's first line** is treated as the summary.

Agent tool structured data is internal processing data, not user-facing output. Output only a one-line summary and immediately proceed to the next tool call.

## Review Work Type Chain

`review-issue` (subagent: `review-worker`) completes with a report — no commit or PR chain follows.

```
review-issue → Report posted → Complete
```

After `review-issue` completes:
1. Check `action` field from `review-worker` output
2. `action: CONTINUE` with `ucp_required: true` → present review results to user via AskUserQuestion before proceeding with fixes
3. `action: STOP` → chain complete, report to user

See [docs/reviewing-reference.md](../docs/reviewing-reference.md) for delegation conditions.

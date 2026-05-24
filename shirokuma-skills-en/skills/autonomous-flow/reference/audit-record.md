# Audit-Record Format Reference

In `--autopilot` mode, `autonomous-flow` keeps each auto-approval operation as an audit record. This mechanism ensures the transparency of comprehensive delegation (ADR-v3-024, Proposed #2706) and makes all auto-approvals reviewable afterward.

See: [SKILL.md](../SKILL.md)

## Dual-Record Policy

| Record target | Content | Purpose |
|---------------|---------|---------|
| Comment on the target Issue | The Issue's auto-approval details, timestamp, and executor | Post-hoc review of each Issue |
| Batch summary Issue | The batch's overall results (success / failure / list of auto-approvals) | Post-hoc audit of the whole batch |

> Detailed logging to a local log (`/tmp/shirokuma-flow/autopilot-{timestamp}.log`) is optional (for debugging). The GitHub Issue is the source of truth and is reviewable across sessions.

## Per-Issue Comment Format

After all phases of an Issue complete (or on failure), post a comment to that Issue.

```markdown
## [Autopilot] Auto-Approval Record

**Batch ID:** autopilot-{timestamp}
**Executor:** @{user} (comprehensive delegation)

| Gate | Operation | Timestamp |
|------|-----------|-----------|
| Triage submit (submit) | Backlog → Review | 2026-05-23T09:59:00Z |
| Triage approve (approve) | Review → ToDo | 2026-05-23T10:00:00Z |
| Design approve (approve) | Review → ToDo | 2026-05-23T10:03:00Z |
| Plan approve (approve) | Review → ToDo | 2026-05-23T10:05:00Z |
| PR merge (pr merge) | Review → Done | 2026-05-23T10:15:00Z |

**ADR basis:** ADR-v3-024 (auto-passing approval gates via comprehensive delegation)
```

> **Triage is always 2 rows (H-1)**: Triage approval consists of 2 steps, `submit` (Backlog → Review) and `approve` (Review → ToDo), so **record a separate submit row and approve row** in the audit record as well. Do not combine them into one row.

> **Record only the gates that were executed**: If the design phase is NOT_NEEDED, omit the "Design approve" row. When some gates were already passed via phase resumption, record only the operations performed in this session.

> **Resolving `{user}`**: Retrieve the executing user's login name with `gh api user -q .login` (e.g., `particles7`).

### Comment Post Command

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/{number}-autopilot-audit.md <<'EOF'
## [Autopilot] Auto-Approval Record

**Batch ID:** autopilot-{timestamp}
**Executor:** @{user} (comprehensive delegation)

| Gate | Operation | Timestamp |
|------|-----------|-----------|
| Triage submit (submit) | Backlog → Review | {ts1} |
| Triage approve (approve) | Review → ToDo | {ts2} |

**ADR basis:** ADR-v3-024 (auto-passing approval gates via comprehensive delegation)
EOF
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-autopilot-audit.md
```

## Batch Summary Issue Format

Create at batch start and update after processing each Issue. Title: `[Autopilot] Batch Processing Summary: {timestamp}`.

```markdown
## Batch Processing Summary

**Batch ID:** autopilot-{timestamp}
**Target Issues:** #101, #102, #103
**Started:** 2026-05-23T10:00:00Z
**Completed:** 2026-05-23T10:30:00Z

| Issue | Result | Phase | PR |
|-------|--------|-------|-----|
| #101  | SUCCESS | All phases complete | #201 |
| #102  | FAILED (Blocked) | Failed at prepare-flow | — |
| #103  | SUCCESS | All phases complete | #202 |
```

### Result Status Definitions

| Result | Meaning |
|--------|---------|
| SUCCESS | All phases complete; reached PR creation (or merge) |
| FAILED (Blocked) | Failed after reaching In progress. Transitioned to Blocked via `block --reason "autopilot: {failure cause}"` |
| SKIPPED | Failed before reaching In progress (no status change), or already Done |
| Processing | The Issue currently being processed |
| Pending | Registered in the queue but not yet processed |

### Addendum on Auto-Stop from Consecutive Failures

If consecutive failures reach the threshold (default 3) and the batch auto-stops, append the following to the batch summary Issue.

```markdown
## Auto-Stop (consecutive failures: {N})

**Reason:** Auto-stopped due to {N} consecutive failures (possibly a systemic problem).

**Unprocessed Issues:** #104, #105

**Recommended actions:**
- After checking the failure cause, re-run the rest with `/autonomous-flow #104 #105`
- Or handle the FAILED Issues individually
```

## Audit-Record Timing

| Timing | Record target |
|--------|---------------|
| At batch start | Create the batch summary Issue (initialize all targets as "Pending") |
| When each Issue starts processing | Update that row in the batch summary Issue to "Processing" |
| When each Issue finishes | Post the auto-approval comment to that Issue + update its row in the batch summary Issue to the result |
| At batch completion | Update the "Completed" timestamp in the batch summary Issue |
| On auto-stop | Append an "Auto-Stop" section to the batch summary Issue |

## Notes

- Record timestamps in ISO8601 format (UTC)
- Record the executor (`@{user}`) as the batch launcher to make the subject of the comprehensive delegation explicit
- Always record triage as 2 separate steps, submit + approve (H-1)
- Write audit records in English per the `output-language` rule (the JA version uses Japanese)

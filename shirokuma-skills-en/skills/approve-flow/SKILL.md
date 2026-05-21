---
name: approve-flow
description: Explicitly approve a Review-status Issue. Branches by issue_kind — plan/design issues (child) transition Review → Done (syncParentStatus syncs parent Backlog → ToDo), task issues (triage) transition Review → ToDo. Triggers: "approve", "approve issue", "approve plan".
allowed-tools: Bash, Read, Edit
---

# Approve Issue

Explicitly approve a Review-status Issue. The transition target branches by `issue_kind`.

| Issue Type | Transition Target | Description |
|-----------|-------------------|-------------|
| Plan / Design Issue (child) | **Done** | Plan/design complete. `syncParentStatus` syncs parent from Backlog → ToDo |
| Task Issue (triage) | **ToDo** | Triage approved. `Review → ToDo`. The next flow starts work via `begin` |

**Approval model**: `approve` branches by `issue_kind`. Plan/design issues (child) transition Review → Done, and `syncParentStatus` automatically syncs the parent Issue from Backlog → ToDo (ready to start). Task issues (normal branch = triage approval) transition Review → ToDo (no parent sync). When `/implement-flow` is launched, if the task Issue is in ToDo, `begin` transitions it to In progress.

> **Reintroduction of `Review → ToDo`**: The `Review → ToDo` path is reintroduced for task issue triage approval. This is a **different concept** from the "**plan approval** Review → ToDo" abolished in ADR-v3-018; this one is **task issue triage approval** (untriaged Backlog → triage-pending Review → approved ToDo). Plan/design issue approval remains Review → Done.

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `#42` | Approve specified Issue |
| No args | — | AskUserQuestion to confirm |

## Workflow

1. **Execute approval**: Run `shirokuma-flow approve {number}` (top-level alias, equivalent to `status approve` internally). The CLI validates status internally and exits with `result: "error"` if the Issue is not in Review.
2. **Branch on result**: Inspect `result` in the JSON output
   - `"ok"` → Show completion report and present `next_suggestions` to the user
   - `"error"` → Display the `message` field as-is and exit
3. **Completion report** (when `result: "ok"`): Branch by `issue_kind` (also identifiable from the JSON `to` field: `to: "Done"` = plan/design, `to: "ToDo"` = task triage).

**For plan / design Issue (child)** (`to: "Done"`):

```
## Approval Complete

**Issue:** #{number} {title}
**Transition:** Review → Done (plan/design complete)
**Parent Issue sync:** #{parent-number} Backlog → ToDo
**Next action:** /implement-flow #{parent-number} (start implementation)
```

**For task Issue (triage)** (`to: "ToDo"`):

```
## Approval Complete

**Issue:** #{number} {title}
**Transition:** Review → ToDo (triage approved)
**Next action:** /implement-flow #{number} (start work via `begin`)
```

## Edge Cases

| Situation | Action |
|-----------|--------|
| Not Review / Already Done / Issue not found | Surface the CLI `result: "error"` `message` and exit |
| Plan/design issue (child) with parent in Backlog | Review → Done. Parent auto-synced Backlog → ToDo (syncParentStatus) |
| Plan/design issue (child) with parent not in Backlog | Review → Done. Parent status auto-derived from child aggregation via syncParentStatus |
| Task issue (triage) | Review → ToDo. No parent sync. The next flow starts work via `begin` |

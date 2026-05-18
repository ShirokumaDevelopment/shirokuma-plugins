---
name: approve-flow
description: Explicitly approve a Review-status Issue. Transitions Review → Done (ADR-v3-022 Second Revision). For plan issues (issue itemType), syncParentStatus automatically syncs the parent Issue from Backlog → ToDo. Triggers: "approve", "approve issue", "approve plan".
allowed-tools: Bash, Read, Edit
---

# Approve Issue

Explicitly approve a Review-status Issue. Transitions Review → Done (ADR-v3-022 Second Revision).

| Issue Type | Transition Target | Description |
|-----------|-------------------|-------------|
| Plan Issue (plan/design) | **Done** | Plan complete. `syncParentStatus` auto-syncs parent Issue from Backlog → ToDo |
| Other Issue Types | **Done** | Approval complete (fails if not in Review) |

**Approval model (ADR-v3-022 Second Revision)**: `approve` transitions Review → Done. The legacy `Review → ToDo` path is abolished. After plan issue (child) `approve`, `syncParentStatus` automatically syncs the parent Issue from Backlog → ToDo (ready to start). When `/implement-flow` is launched, if the task Issue is in ToDo, `begin` transitions it to In progress.

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
3. **Completion report** (when `result: "ok"`):

```
## Approval Complete

**Issue:** #{number} {title}
**Transition:** Review → Done (plan complete)
**Parent Issue sync:** #{parent-number} Backlog → ToDo (for plan issues)
**Next action:** /implement-flow #{parent-number} (start implementation)
```

## Edge Cases

| Situation | Action |
|-----------|--------|
| Not Review / Already Done / Issue not found | Surface the CLI `result: "error"` `message` and exit |
| Plan issue with parent in Backlog | Parent auto-synced Backlog → ToDo (syncParentStatus) |
| Plan issue with parent not in Backlog | Parent status auto-derived from child aggregation via syncParentStatus |

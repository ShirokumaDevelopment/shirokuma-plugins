---
name: approve-flow
description: Explicitly approve a Review-status Issue. All kinds transition Review → ToDo; side effects branch by issue_kind. Plan issues (child) trigger approval inheritance (sibling implementation sub-issues Backlog → ToDo) plus parent derivation, design issues (child) derive the parent, task issues (triage) have no side effects. Triggers: "approve", "approve issue", "approve plan".
allowed-tools: Bash, Read, Edit
---

# Approve Issue

Explicitly approve a Review-status Issue. **All kinds transition `Review → ToDo`**; the `issue_kind` determines the **side effects**, not the transition target.

| Issue Type | Transition | Side Effects |
|-----------|------------|--------------|
| Plan Issue (child) | **Review → ToDo** | Approval inheritance (sibling implementation sub-issues Backlog → ToDo) + parent derived from children (`syncParentStatus`) |
| Design Issue (child) | **Review → ToDo** | Parent derived from children (`syncParentStatus`). The design Issue is an intermediate box and is not set to Done |
| Task Issue (triage) | **Review → ToDo** | No side effects. The next flow starts work via `begin` |

**Approval model**: `approve` transitions all kinds to `Review → ToDo` and does NOT set Issues to Done during the planning phase (Done is reached in the implementation phase). The `issue_kind` determines side effects.

- **Plan Issue (child)**: `Review → ToDo`. As **approval inheritance (downward cascade)**, sibling "non-plan/non-design children" = implementation sub-issues under the same parent (task Issue) that are in **Backlog are batch-transitioned `Backlog → ToDo`** (plan approval = inheritance of readiness to start implementation). The parent Issue is then derived/synced from the aggregation of its children by `syncParentStatus`.
- **Design Issue (child)**: `Review → ToDo`. The design Issue is an intermediate box (not set to Done, derived from children), and the parent Issue is derived/synced from its children by `syncParentStatus`. No sibling cascade (plan approve only).
- **Task Issue (normal branch = triage approval)**: `Review → ToDo`. No parent sync or cascade. When `/implement-flow` is launched, if the task Issue is in ToDo, `begin` transitions it to In progress.

> **Parent Issue is derived from children**: On plan/design child approval, the parent Issue is not written directly; `syncParentStatus` derives it from the aggregation of children (upward, child → parent only). This is the opposite direction of the approval-inheritance downward cascade (sibling → sibling), so no cycle occurs.

> **`Review → Done` is for PR merge only**: Issue approval never produces `Review → Done`. `Review → Done` is reserved for PR merge approval (`pr merge`).

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
3. **Completion report** (when `result: "ok"`): Branch by `issue_kind` (all kinds report `to: "ToDo"`, so identify via the `issue_kind` field).

**For plan Issue (child)** (`issue_kind: "plan"`):

```
## Approval Complete

**Issue:** #{number} {title}
**Transition:** Review → ToDo (plan approved)
**Approval inheritance:** implementation sub-issues #{...} synced Backlog → ToDo (see pending_subissues / logs)
**Parent Issue sync:** #{parent-number} derived from children (syncParentStatus)
**Next action:** /implement-flow #{parent-number} (start implementation)
```

**For design Issue (child)** (`issue_kind: "design"`):

```
## Approval Complete

**Issue:** #{number} {title}
**Transition:** Review → ToDo (design approved)
**Parent Issue sync:** #{parent-number} derived from children (syncParentStatus)
**Next action:** /prepare-flow #{parent-number} or /implement-flow #{parent-number}
```

**For task Issue (triage)** (`issue_kind: "normal"`):

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
| Plan issue (child) | Review → ToDo. Approval inheritance moves Backlog implementation sub-issues to ToDo. Parent derived from child aggregation via syncParentStatus |
| Design issue (child) | Review → ToDo. Parent derived from child aggregation via syncParentStatus (no sibling cascade) |
| Task issue (triage) | Review → ToDo. No parent sync or cascade. The next flow starts work via `begin` |

# Chain End Steps Reference

Details of the final steps executed at the end of the `implement-flow` chain.

## Work Summary (Issue Comment)

After PR creation, post a technical work summary to the Issue as a comment. This is the primary context record referenced in future conversations for Issue context.

The work summary focuses on **technical work details** — what was changed, which files were modified, and technical decisions made.

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-work-summary.md
```

Where `/tmp/shirokuma-flow/{number}-work-summary.md` contains:

```markdown
## Work Summary

### Changes
{What was implemented or fixed — technical details}

### Modified Files
- `path/file.ts` - {Change description}

### Pull Request
PR #{pr-number}

### Technical Decisions
- {Decision and rationale}
```

Skip this step if no issue number is associated with the work.

**Standalone completion**: When `implement-flow` completes its chain (standalone or within a session), the Work Summary is automatically posted.

## Status (End of Chain)

> **New model (ADR-v3-022 fourth revision)**: The implementation unit (the plan Issue, or the task Issue for XS/S direct implementation) stays `In progress` during implement. **Code review is carried by the PR's Review** (`open-pr-issue`'s `pr create` transitions the PR `In progress → Review`). Per the 1-entity-1-Review principle, the implementation unit Issue is NOT transitioned to Review (the old-model `submit {number}` / `status transition {number} --to Review` is not performed; in the new model `ISSUE_FORWARD` has no `In progress → Review` and it would fail).

Only post the work summary Issue comment (previous section); do not change the implementation unit Issue's Status at the end of the chain.

## Plan Issue Done (Reached on PR Merge)

> The plan Issue is the implementation unit. implement runs `begin` (`ToDo → In progress`) and opens a PR. **The plan Issue reaches Done on PR merge** (review-flow / `pr merge` transitions the PR `Review → Done`, `Closes #N` closes the plan Issue, and `syncParentStatus` derives the parent from its children). At the end of the implement-flow chain the plan Issue stays `In progress` (awaiting PR review); no Done update is performed here.

The XS/S direct path (no plan Issue) is the same: the task Issue stays `In progress` and reaches Done on PR merge.

## Next Steps Suggestion (End of Chain)

After Status update, present next action candidates to the user. Extract the PR number from `open-pr-issue`'s output to provide specific guidance. If the PR number is unavailable (e.g., PR not created), omit the `/review-flow` line.

```
## Next Steps

- `/review-flow #{pr-number}` — Run self-review on the PR
```

## No-Changes Path (when `coding-worker` completes with `changes_made: false`)

When `coding-worker` returns `changes_made: false`, skip the normal chain (commit → PR → finalize-changes) and execute the following procedure.

### No-Changes Work Summary

Since no PR exists, use a dedicated template that omits the `### Pull Request` section. Record as an investigation result ("already implemented", "spec-correct", "cannot reproduce", etc.).

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-no-changes-summary.md
```

Where `/tmp/shirokuma-flow/{number}-no-changes-summary.md` contains:

```markdown
## Work Summary (No Changes)

### Investigation Result
{What coding-worker confirmed — why no change was needed}

### Determination
{e.g., Already implemented, Spec-correct, Cannot reproduce, etc.}

### Files Examined
- `path/file.ts` - {What was checked}

### Technical Decisions
- {Decision and rationale}
```

### Status Determination for No Changes

When the chain ends with no changes, there is no code change or PR, so the issue cannot progress from `In progress` through the normal `Review` / `Done` transitions (see `STATUS_TRANSITIONS` in `status-workflow.ts`). The valid routes are:

| Option | Transition Command | Use Case |
|--------|--------------------|----------|
| Cancel (Done + not_planned) | `shirokuma-flow issue cancel {n} --comment "{reason}"` | Close the issue as "no changes needed" (recommended) |
| Blocked | `shirokuma-flow block {n} --reason "{reason}"` | Awaiting reconsideration or more information (reason recorded as comment) |
| ToDo | `shirokuma-flow status transition {n} --to ToDo` | Re-evaluate later |

> **Important**: Cancellation must be set via the dedicated **`issue cancel`** command. The `Cancelled` Status was removed and is now recorded as `state_reason: not_planned` Close + Status: Done (see `isCancelledEquivalent` in `status-workflow.ts`).

Implementation:

```text
reason = extract_first_line(body)  # coding-worker body first-line summary
user_choice = AskUserQuestion(
    "Completed with no changes. Reason: {reason}. How should the status be handled?",
    options=[
      "Cancel (recommended; recorded as Done with state_reason: not_planned)",
      "Blocked (pending reconsideration)",
      "ToDo (re-evaluate later)"
    ]
)

if user_choice == "Cancel":
    run: shirokuma-flow issue cancel {number} --comment "{reason}"
elif user_choice == "Blocked":
    run: shirokuma-flow block {number} --reason "{reason}"
else:
    run: shirokuma-flow status transition {number} --to ToDo
```

In headless mode (`--headless`), skip AskUserQuestion and run `issue cancel {number} --comment "{reason}"` as the default action (the cancellation can be reversed via `issue reopen` + `status transition --to ToDo`).

### Next Steps Suggestion for No Changes

Since no PR exists, omit the `/review-flow` line and present only:

```
## Next Steps

No changes were deemed necessary. If needed:
- `/implement-flow #{number}` — Re-run (in case the determination was incorrect)
```

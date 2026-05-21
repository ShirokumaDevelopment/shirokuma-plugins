# Epic Issue Entry Point Details

When an epic issue is directly specified (detected by non-plan child issues existing, or a plan issue whose body contains a `### Sub-Issue Structure` section), execute the following flow instead of standard implementation dispatch.

## Pre-condition: Plan Issue with Sub-Issue Structure

The epic must have a plan issue (child issue with title starting with "Plan:" or "計画:") whose body contains a `### Sub-Issue Structure` section. If no plan issue exists, delegate to `prepare-flow` first (standard flow).

## Epic Workflow

1. **Create integration branch**: Extract branch name from `### Integration Branch` in the plan, create from `develop`:
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b epic/{number}-{slug}
   git push -u origin epic/{number}-{slug}
   ```

   | Condition | Step 2 |
   |-----------|--------|
   | No non-plan child issues exist | Create sub-issues |
   | Non-plan child issues already exist | Skip (already created by `prepare-flow`) |

2. **Create sub-issues in batch** (only when no non-plan child issues exist): Skip this step if sub-issues were already created by `prepare-flow`. Parse the `### Sub-Issue Structure` table from the plan issue body. For each row, create a sub-issue via CLI:
   ```bash
   shirokuma-flow issue add /tmp/shirokuma-flow/{slug}.md
   ```
   Body: Minimal stub referencing the parent plan (`See #{epic-number} for full plan`).
   After creation, update the plan issue's `### Sub-Issue Structure` table placeholders (`#{sub1}`, etc.) with actual issue numbers and sync via `issue update {plan-issue-number} /tmp/shirokuma-flow/{plan-issue-number}-body.md`.

3. **Present execution order**: Based on the `### Execution Order` section or dependency column, display the recommended order and end. Do NOT propose immediate work start — each sub-issue should be worked on in a separate conversation per the epic pattern in `best-practices-first`:
   ```
   Epic setup complete.

   **Integration branch:** `epic/{number}-{slug}`
   **Sub-issues created:** #{sub1}, #{sub2}, #{sub3}

   Recommended execution order:
   1. #{sub1} - {title} (no dependencies)
   2. #{sub2} - {title} (depends on #{sub1})
   3. #{sub3} - {title} (depends on #{sub2})

   Start each sub-issue in a new conversation with `/implement-flow #{sub}`.
   ```

## Responsibility Note

Sub-issue creation in this flow uses `shirokuma-flow issue add` directly (not `issue-flow`). The plan already specifies sub-issue details, so `issue-flow`'s inference logic is unnecessary.

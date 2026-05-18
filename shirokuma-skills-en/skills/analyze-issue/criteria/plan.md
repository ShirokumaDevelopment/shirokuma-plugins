# Plan Review Criteria

A catalog of review viewpoints used by the `plan` role when analyzing plan Issues. Use alongside the checklist in `roles/plan.md`. Each viewpoint comes from observed failure patterns and should be raised at High severity or above when violated.

## V1: Verifying Parent Issue / Premises

A plan is built on top of the parent Issue's "background" and "current behavior (confirmed)" sections. **If the parent's premises diverge from the implementation, the plan's investigation viewpoints and expected outputs inherit the false premises.**

- Are constant maps, default values, and enum sizes/contents re-verified against actual code (grep / Read)?
- Are file line numbers and function signatures consistent with the implementation?
- Has the plan independently verified the scope of existing guards (idempotency guard, clear logic) on each status?
- Has the plan inherited ADR trade-off statements without challenge?
- For prior-review feedback that the plan re-iterates, was each item grep-confirmed once more (prior reviews have been wrong)?

If verification is missing and the implementation diverges, raise the issue under both `[Plan]` (add a re-verification task) and `[Issue body]` (correct the background statement).

## V2: Internal Consistency Across Plan Sections

For numeric statements like "replace N occurrences", **cross-check that the variation target / task breakdown / risk concern sections all count by the same rule**.

- Do numbers ("8 occurrences", "9 occurrences", etc.) match across sections?
- When references are explicitly excluded, does "all N occurrences" in the task breakdown include or exclude them — is it stated explicitly?
- When the body says "N occurrences (lines M and others)", is the unaccounted-for "others" reconcilable with the total?

After a strategy pivot, also confirm **rationale comments and judgment notes are updated** (`plan_rationale_comment_drift_after_pivot`). Make sure phase-level pivots also schedule sync-update tasks for the parent Issue / ADR (`plan_phase_pivot_unsynced_to_epic`).

Watch for option renames (`--file → --body-file` etc.) silently embedded in migration tables, with no backward-compatibility strategy defined (`plan_silent_option_rename_in_migration_table`).

## V3: Acceptance Criteria Must Be Single-Purpose

Reject sub-Issue acceptance criteria of the form "do A, **or** decide not to and close the Issue". The implementer cannot tell what counts as done.

- For "A or B" criteria, **collapse the goal to one of: implementation / decision / meta-task**
- Confirm consistency with sibling sub-Issues that are codifying principles (e.g. CLI consolidation principle) so the criteria don't internally contradict the principle

## V4: Verifying "Current State" Claims Against Code

`plan-worker` output frequently writes "currently X is missing" near change snippets. **Asserting without reading the source string to its end produces unnecessary tasks in the plan.**

- For claims about specific tokens within `.description(...)`, JSDoc, or descriptive strings, Read the entire string and verify
- On mismatch, raise at Medium or above and note in the completion report: "feed back `verify current-state claims by reading source to the end` to the next `plan-worker` run"

## V5: Scope Boundaries and Exclusions

Check whether the plan **drops items from the parent's original scope on a one-sided argument**, and whether residual use cases / a separate Issue are mentioned.

- Are remaining `@deprecated` callers explicitly scoped (`plan_deprecated_symbols_scope_ambiguity`)?
- For deduplication refactors, does the plan only inherit the parent's FIX-N enumeration and leave sibling FIX patterns out of scope (`plan_refactor_scope_omits_sibling_duplication`)?
- For excluded items, are both sides of the trade-off written (`plan_scope_drop_without_tradeoff`)?
- In epic plans, are sub-Issue dependencies uniformly "after investigation" — blocking parallel work on confirmed fixes (`plan_subissue_dependency_vs_confirmed_fixes`)?

## V6: Env Vars / Data Sources / Guard Semantics

**Lock down the semantics of new mechanisms in the plan body.**

- New env var: state what it overrides; identify the existing `homedir()` call sites being replaced
- New command: confirm the data source has been verified, not just "assumed to fetch from X" (`plan_new_command_with_unverified_data_source`)
- Test-coverage guard: state whether it logs a warning (continues) or refuses the write (`plan_guard_behavior_ambiguity`)
- Env-isolation: place the guard in the resolver, not in each caller — placing it in callers means new write paths miss the guard (`plan_env_var_semantics_undefined` / `env_guard_resolver_vs_caller`)

## V7: Detecting Coexisting Plan Issues

When a plan is redone, leaving the old plan in `Review` without `cancel` causes `sub-list {parent}` to return two plans — implementers may read the old one and apply the wrong change.

- At plan review start, always run `shirokuma-flow issue sub-list {parent}`
- If multiple plan Issues coexist, raise **Critical** and require either `issue cancel` for the rejected one (cancel automatically unparents from the parent issue, #2252), or an explicit "discard #X, adopt #Y" comment
- Even when the user states the old plan is "already cancelled" as a precondition for re-review, run `shirokuma-flow issue pull {old-plan}` to verify `status` (Done with `state_reason: not_planned`) and `parent` against GitHub state

## V8: Reachability of Extracted Helpers

For PRs that extract a shared helper, verify **not just the helper's quality, but whether the actual user-visible code path reaches it**.

1. Standalone quality (JSDoc / contract / tests)
2. Reachability from the call site: trace the actual path (CLI → skill → subcommand) and verify the helper is invoked using realistic data
3. Conflated concerns: confirm two distinct concerns (e.g. "identify the Issue number" and "inject into PR body") are not gated on the same condition

How to check: read the actual templates (e.g. `issue template pr` output, the PR body templates used by skills) and trace which branch real examples take.

## V9: Test Coverage Reproducing the Production Path

When every test in a `describe` block shares the same setup (`bodyFile: undefined`, etc.), regression coverage for paths where the precondition no longer holds disappears entirely.

- Within a single describe, do `beforeEach` / each `it` share the same precondition (`undefined`, `null`, empty string)?
- For PRs whose primary purpose is "add regression tests", do tests reproduce the actual data shape supplied by the real caller?
- For an `if (X === null / empty)` branch in code, is the **non-**null path placed outside the describe's precondition?
- For helper-extraction refactors, are direct unit tests for the helper added; does old call-site mock wiring linger as dead code (`helper_extraction_test_drift`)?

How to check: read one real upstream template output (`/tmp/shirokuma-flow/*-pr-body.md` etc.) and verify that value appears in the test setup. If not, suspect an uncovered Critical path.

## V10: PR Body vs. Implementation Drift (also for PR review)

Cross-check the PR body's "implementation approach" against actual code behavior. Four variants:

| Variant | Description |
|---------|-------------|
| A: behavioral drift | Body says "retries by re-applying when not yet Done", implementation is verify-only |
| B: body > diff | Body lists 5 items, actual diff has 3 (the other 2 came from earlier PRs) |
| C: body < diff | Branch name and body describe a single-Issue fix, but `base = develop` makes it a multi-Issue rollup PR |
| D: function-name hallucination | Body says "added `createXxx()`", but the diff just adds an inline `.command(...)` registration in the existing function |

Steps:
1. Pull verbs from the PR body bullets (retry / fallback / auto-fix / change / add) and confirm each maps to a concrete implementation
2. Run `git log origin/{base}...HEAD` to count commits; if the body describes one change but multiple commits exist, suspect an epic rollup PR
3. Check base-branch / head-branch consistency: `fix/N-*` aimed at develop with commits from earlier sibling PRs should target the epic branch instead

## V11: API Drift in Rule-Doc Sample Code

For new or updated rule files (`.shirokuma/rules/shirokuma-flow/*.md` etc.), verify that TypeScript samples match the implementation.

- Cross-check argument count and order via grep (e.g. `getIssueDetail(owner, repo, number, logger)` written when the implementation takes 3 args)
- Cross-check field names on return types (e.g. `detail?.projectStatus` written when the implementation exposes `.status`)
- For ADR-driven PRs, the implementation and the rule file are added together — make consistency between them part of the review

## V12: Enum / Constant Drift

- A new enum value is used on the write path, but the validator's VALID constant is not updated, causing every subsequent `integrity` run to report a permanent error (`enum_constant_drift_from_new_usage`)
- A "case mismatch fix" task destroys an existing constant that intentionally separates new vs. LEGACY casing (`plan_case_mismatch_breaks_legacy_split`)

## V13: Error / Exception Semantics

- Plans that "reuse the existing try/catch" without checking that the catch message's semantics still apply to the new failure surface (`plan_reuses_catch_block_with_mismatched_semantics`)
- Exception clauses where "could not retrieve" and "conceptually nonexistent" are conflated under the same `undefined` (`exception_clause_new_addition`)
- Refactors that change wrapper `package.json` repair from "restore existing file" to "registry required", removing the offline recovery path (`script_hard_fail_removes_offline_recovery`)
- `stat -c | cut || stat -f` patterns that fail on non-GNU systems due to POSIX pipeline exit-code semantics (`shell_stat_pipeline_fallback_broken`)

## V14: Plan Revision Sync Between Parent and Children

Updating only the child plan and leaving the parent Issue body stale recreates parent/child drift (`plan_revision_recreates_parent_drift`).

- For NEEDS_REVISION re-reviews, judge both whether the High / Medium / Low items are root-resolved, and whether the revision introduces new secondary issues (e.g. status-table inconsistencies) (`plan_revision_addressing_high_medium_low`)
- Has design-review feedback at the parent level been mirrored only into sub-Issues, leaving the parent body's tables stale and creating two sources of truth (`plan_naming_drift_from_design_review_feedback`)?

## V15: Adopting Parent's Operational Directives

The plan must absorb the parent Issue's operational directives (file format, aggregation markers, baseline commits, etc.) rather than dropping them (`plan_missing_parent_operational_directives`).

- Are the parent Issue's "operational rules", "implementation guide", and "constraint" sections reflected in plan tasks?
- Has the plan inherited the parent Issue's factual inaccuracies (`plan_inherits_parent_factual_inaccuracy`)?
- Has the plan inherited "presumed cause (conditional / "possibly")" wording from the parent without verification — and then misread the absence of that processing in code as a relaxation of conditions (`plan_inherits_false_causal_claim`)?

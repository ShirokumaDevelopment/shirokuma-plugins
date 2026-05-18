---
name: finalize-worker
description: SubAgent that runs post-change quality checks (/simplify and reviewing-security) inside its own context to keep intermediate output (diffs, finding lists) out of the main context. Delegated from the finalize-changes skill.
tools: Bash, Skill
model: sonnet
---

# Finalize Worker (SubAgent)

Runs `/simplify` and `reviewing-security` sequentially inside a SubAgent context and returns only a change summary to the main context. The intermediate output (full code review, diff rehashing, finding lists) stays inside the SubAgent context and is discarded on completion, which reduces main-context consumption.

## Output Language (Required)

If a GitHub comment is generated, write it in **Japanese**.

## Responsibility Boundary

Scope is **running `/simplify` and `reviewing-security` only**. The following are managed by the caller (`finalize-changes`):

- `shirokuma-flow lint docs` execution
- Improvement commit decision and delegation to `commit-worker`
- Work summary posting
- Status updates

## Workflow

### Step A: AI-consumed Asset Skip Check (Pre-flight Bash)

Before running the heavy AI-driven `reviewing-security` step, fetch the changed file list via Bash and decide up front whether the diff is human-docs-only.

```bash
git diff --name-only origin/develop...HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD
```

When working on a sub-issue with a non-`develop` base branch (an integration branch), use the base branch passed by the caller. If the base branch is unknown, default to `develop`.

Decision:

| Condition | Action |
|-----------|--------|
| All files are human docs only (none match the allowlist in `reviewing-security/SKILL.md`) | Log `SECURITY_SKIPPED: human-docs-only diff` and skip Step C |
| At least one file matches the allowlist | Run `reviewing-security` in Step C |

`reviewing-security` itself also has a skip check (defense in depth). See `plugin/specs/skills/finalize-changes/DESIGN.md` for the rationale of intentionally keeping the duplication and the retirement decision.

### Step B: Simplify (`/simplify`)

Run `/simplify` via the Skill tool:

```text
Skill(skill: "simplify")
```

> **Error handling**: If `/simplify` fails, still run Step C (security review). Record the failure in the summary as `simplify: FAILED` and continue. Step B failure alone does not produce `status: FAIL`.

### Step C: Security Review (`reviewing-security`)

If Step A emitted `SECURITY_SKIPPED`, skip this entire step. Otherwise run `reviewing-security` via the Skill tool:

```text
Skill(skill: "reviewing-security")
```

> **Error handling**: If `reviewing-security` fails, still return as success (`status: SUCCESS`). Record the failure in the summary as `security: FAILED`. The failure handling is owned by the `reviewing-security` skill internally.

## Completion Output Format

Return YAML frontmatter following `worker-completion-pattern.md`:

```yaml
---
action: CONTINUE
status: SUCCESS
---

simplify: {OK|FAILED|NO_CHANGE}, security: {OK|FAILED|SKIPPED}
(Add notes on subsequent lines only when useful)
```

### Field Decisions

| Field | Value | Criterion |
|-------|-------|-----------|
| `action` | `CONTINUE` | The caller (`finalize-changes`) runs the subsequent steps (lint docs, commit), so this is always `CONTINUE` |
| `status` | `SUCCESS` | Even if Step B or Step C fails, the value stays `SUCCESS` so that `finalize-changes` does not abort the post-processing chain |
| `status` | `FAIL` | Only on fatal SubAgent errors (Step A Bash exits non-zero with no output, Skill tool itself cannot launch, etc.) |

The `changes_made` field is not returned. `finalize-changes` decides whether an improvement commit is needed using `git diff --stat`, so the worker does not need to surface it.

## Rules

1. **Run security review even if `/simplify` fails** — Record the error and continue
2. **`reviewing-security` failure still returns `status: SUCCESS`** — Do not abort the `finalize-changes` chain
3. **Do not truncate output** — Do not pipe Skill-tool output through `| tail` / `| head` / `| grep`
4. **Do not pass intermediate output to the main context** — Keep verbose Skill output inside the SubAgent context; the summary body is 1-2 lines
5. **Fall back to `develop` when the base branch is unknown** — For sub-issues on an integration branch, follow the base-branch context passed from the caller

---
name: finalize-changes
description: Small orchestrator that runs the common post-processing chain (finalize-worker SubAgent for /simplify+security review → lint docs → improvement commit) after code changes. Called from implement-flow and review-flow.
allowed-tools: Bash, Agent
---

# Finalize Changes

Common post-processing chain shared by `implement-flow` and `review-flow`. Runs the `finalize-worker` SubAgent (which internally runs `/simplify` and `reviewing-security` in sequence) followed by `lint docs`, and pushes an improvement commit only when changes were made.

## Callers

| Skill | When Called |
|-------|------------|
| `implement-flow` | After PR creation (post-processing chain for steps 4-5) |
| `review-flow` | After review fix commit (post-processing in step 5) |

## Design Note: Context Isolation

Both `/simplify` and `reviewing-security` emit large intermediate output (full-codebase reviews, diffs, finding lists). Invoking them sequentially via the Skill tool from the main context fills up context near the end of `implement-flow`, and the processing freezes just before auto-compression. Delegating to the `finalize-worker` SubAgent confines the intermediate output to the SubAgent context, so only a change summary is returned to the main context.

## Workflow

### Step 1: Delegate to finalize-worker SubAgent

Launch `finalize-worker` via the Agent tool. The SubAgent runs Step A (skip check) → Step B (`/simplify`) → Step C (`reviewing-security`) in sequence internally (see `plugin/shirokuma-skills-en/agents/finalize-worker.md` for details).

```text
Agent(
  description: "finalize-worker simplify+security",
  subagent_type: "finalize-worker",
  prompt: "Run post-change quality checks (/simplify and reviewing-security)."
)
```

When working on a sub-issue with a non-`develop` base branch, the caller passes the base branch (e.g., `epic/2612-finalize-worker-subagent`) inside the prompt. If the base branch is unknown, the worker falls back to `develop`.

> **Completion decision**: Parse the YAML frontmatter following the Agent-tool completion pattern in `worker-completion-pattern.md`. `status: SUCCESS` → proceed to the next step. `status: FAIL` (fatal SubAgent error) → emit a warning and continue to the `lint docs` step (do not abort the whole chain). `action: STOP` is not normally returned, but if it is, report the stop to the caller.

> **Error handling**: Both `/simplify` failure and `reviewing-security` failure are absorbed inside the SubAgent and reported as `status: SUCCESS` (see worker-internal rules). From `finalize-changes`'s perspective the SubAgent looks clean.

### Step 2: lint docs (Mechanical Docs Drift Detection)

Run `shirokuma-flow lint docs` to detect structural documentation drift (missing required sections, broken references, etc.). **Step 1's `/simplify` handles content quality (redundancy, consistency), whereas this step is a structural check — they cover separate concerns.**

```bash
shirokuma-flow lint docs
```

Decision:

| Result | Action |
|--------|--------|
| **PASS** | Proceed to the next step (improvement commit) |
| **Error detected (inline-fixable)** | Fix within the same PR, then proceed. Criteria: **3 or fewer additional files need fixing, Markdown / config files only (`.md` / `.yaml` / `.yml` / `.json` / `.toml`)**. Files already being edited as part of the PR's main work do not count toward the threshold. When in doubt, prefer inline fix |
| **Error detected (large-scale / structural)** | Create a derived Issue via `issue-flow` (or record manually). Treat the current PR's work as complete and address in the derived Issue |

> **Error handling**: Distinguish the two cases below.
>
> - **Drift detected (non-zero exit, expected behavior)**: Handle according to the decision table above (inline fix or derived Issue)
> - **Command execution failure (CLI crash, etc.)**: Output a warning and continue to the next step. Do not treat as drift detection

### Step 3: Improvement Commit (Only When Changes Were Made)

If Step 1 (`/simplify` and `reviewing-security` inside `finalize-worker`) or Step 2 (`lint docs`) produced code changes, delegate an additional commit to `commit-worker`:

```bash
# Check if changes exist
git diff --stat
```

If changes exist:

```text
Agent(
  description: "commit-worker simplify/security improvements",
  subagent_type: "commit-worker",
  prompt: "Commit and push improvements from simplify/security-review. Use `shirokuma-flow git commit-push` for committing."
)
```

If no changes, skip this step and continue.

## Rules

1. **Continue even if `finalize-worker` returns `status: FAIL`** — Proceed to the `lint docs` step (do not abort the whole chain)
2. **Skip if no changes** — Confirm with `git diff --stat` before running the improvement commit
3. **Do not truncate output** — Do not pipe SubAgent output through `| tail` / `| head` / `| grep`
4. **Caller owns the work summary** — This skill does not post work summaries
5. **Do not invoke `Skill` directly** — `/simplify` and `reviewing-security` invocations are confined to the `finalize-worker` SubAgent. This skill excludes `Skill` from `allowed-tools`, guaranteeing context isolation structurally

## Tool Usage

| Tool | When |
|------|------|
| Agent | `finalize-worker` (Step 1), `commit-worker` for improvement commit (Step 3, if changes exist) |
| Bash | `shirokuma-flow lint docs` (Step 2), `git diff --stat` to check for changes (Step 3) |

---
paths:
  - ".claude/skills/**/*.md"
# Scope note: This rule uses 'paths' (skill-file-scoped) rather than 'scope: default' intentionally.
# Rationale: output destination decisions are relevant only during skill authoring and editing.
# Loading this rule globally (scope: default) would add noise to non-skill contexts.
# The skill context (when reading/writing .claude/skills/**/*.md) is the correct load point.
---

# Output Destinations Rule

## Overview

Claude Code skills produce two types of output. Route each to the appropriate destination.

## Output Types

| Type | Purpose | Destination | Lifetime |
|------|---------|-------------|----------|
| **Working reports** | Human review during work | GitHub Discussions (Reports) | Temporary |
| **Final documentation** | Project-wide records | shirokuma-flow generate portal | Permanent |

## Working Reports

**Use for**: Review reports, implementation progress, lint results

**Destination**: GitHub Discussions → Reports category

```bash
# Create via shirokuma-flow CLI (frontmatter includes metadata)
shirokuma-flow discussion add /tmp/shirokuma-flow/report.md
```

**Characteristics**:
- Created during active work sessions
- For human confirmation and feedback
- Can be periodically cleaned up
- Viewable in GitHub browser UI

## Final Documentation

**Use for**: Complete feature docs, API references, architecture diagrams

**Destination**: shirokuma-flow generate portal

```bash
# Build portal
shirokuma-flow generate portal -p . -o docs/portal

# Or via skill
/shirokuma-md build
```

**Characteristics**:
- Created after work completion
- Permanent project documentation
- Auto-generated from code annotations
- Viewable at docs portal URL

## Migration from Local Logs

**Old pattern** (deprecated):
```
logs/reports/YYYY-MM-DD-*.md
logs/reviews/YYYY-MM-DD-*.md
```

**New pattern**:
```
Working → GitHub Discussions (Reports)
Final   → shirokuma-flow generate portal
```

## Skill Updates

When updating skills, replace local log references:

| Old | New |
|-----|-----|
| `Save to logs/reports/` | `Create Discussion in Reports category` |
| `Save to logs/reviews/` | `Create Discussion in Reports category` |
| Report file path output | Discussion URL output |

## PR Reviews → PR Comments

Review results targeting a PR should be posted directly as PR comments.

```bash
shirokuma-flow issue comment {PR#} /tmp/shirokuma-flow/{PR#}-review-summary.md
```

| Condition | Destination |
|-----------|-------------|
| PR review (normal) | PR comment (summary) |
| PR review (5+ errors) | PR comment + Discussion (detailed) |
| File/directory review | Discussion (Reports) |

## Reports Category Usage

| Purpose | Example |
|---------|---------|
| Comprehensive review reports | Project-wide security audit |
| Research results | Best practice research, technology comparisons |
| Self-review feedback | Pattern accumulation from automated review loops |

**Do NOT save to Reports**: PR-specific review results (→ post as PR comment instead)

## Investigation / Design Artifacts

Intermediate artifacts produced by AI during investigation or design phases — process flow diagrams, side-effect matrices, ideal-state designs, gap analysis reports — must not be dumped into Issue comments by default. Doing so buries them in chronological order and makes them hard to find, structure, or update.

### Destination Map

| Artifact Type | Destination | Rationale |
|--------------|-------------|-----------|
| Process flow detail / side-effect matrix / gap analysis | **Discussion (Reports)** | Structured reference resource. Searchable and easy to link |
| Best-practice research / technology comparison | **Discussion (Research)** | Default destination for `researching-best-practices`. Reusable research knowledge |
| Ideal-state design / architecture proposal | **Discussion (Knowledge)** or ADR (`write-adr`) | Persistent reference, likely to be updated later |
| Plan | **Plan Issue (child issue) body** | `plan-issue` persists plans as `Plan: {title}` child issues. Parent Issue's `## Plan` section is treated as legacy/back-compat |
| Requirements / decisions | **Discussion / ADR** | Owned by `requirements-flow`. No designated section in Issue body by convention |
| Temporary work notes / verification logs | **Issue comments** | Time-ordered ephemeral information with low reference frequency |
| Final API references / architecture documentation | **`docs/` directory** or **shirokuma-flow portal** | Persisted in repository. Versioned alongside code |

### Decision Flow

1. **Will it be referenced persistently?** → Yes: Discussion (Knowledge) or `docs/` / ADR
2. **Is it a best-practice research result?** → Yes: Discussion (Research)
3. **Is it a structured reference resource?** → Yes: Discussion (Reports)
4. **Is it a plan?** → Yes: Create a plan Issue (child issue) via `plan-issue`
5. **Is it requirements or a decision?** → Yes: Discussion / ADR via `requirements-flow`
6. **Is it ephemeral information that should remain in chronological order?** → Yes: Issue comments

If none of the above match, default to **Discussion (Reports)**. Issue comments are the fallback only when no other destination applies.

### Past Incident

In past investigation tasks, process flow detail and side-effect matrices were posted as Issue comments. They became chronologically buried and difficult to reuse. This was not a deliberate design decision — it was the residual choice when "no code changes" eliminated other options. This rule prevents recurrence.

### Affected Skills

- `analyze-issue` (plan/requirements/design/research roles) outputs
- `researching-best-practices` research results (default to Discussion (Research))
- `designing-generic` (built into `shirokuma-skills`) plus `designing-nextjs` / `designing-shadcn-ui` / `designing-drizzle` (from the `shirokuma-nextjs` plugin) and other design skills' artifacts

These skills must follow this rule and select the destination based on the artifact's nature.

## Notes

- **No local files**: Avoid storing reports in repository
- **Browser-friendly**: GitHub Discussions for easy human review
- **Clean separation**: Temporary (Discussions) vs Permanent (Portal)
- **PR reviews → PR comments**: Post PR-targeted reviews directly on the PR
- **Don't dump investigation/design artifacts into Issue comments**: follow the destination map above

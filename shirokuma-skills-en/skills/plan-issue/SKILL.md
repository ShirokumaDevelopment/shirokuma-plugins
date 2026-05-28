---
name: plan-issue
description: "Skill for issue planning. Delegated from prepare-flow via Skill tool, performs codebase investigation, plan creation, and plan issue creation. Not intended for direct invocation."
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
---

!`shirokuma-flow rules inject --scope plan-worker`

# Planning on Issue

Analyze issue requirements, create an implementation plan, and persist it as a plan issue (child issue). This skill performs the actual planning work — orchestration (status management, review delegation, user interaction) is handled by `prepare-flow`.

## Plan Depth Levels

Plan depth is determined by **issue content complexity**, not by Size.

| Level | Content | Examples |
|-------|---------|----------|
| Lightweight | 1-2 line approach + confirmation | Typo fix, config change, simple bug fix |
| Standard | Approach + target files + task breakdown | New feature, refactoring, moderate fix |
| Detailed | Multi-option comparison + risk analysis + test strategy | Architecture change, breaking change, multi-system integration |

### Depth Assessment Criteria

AI assesses from issue title/body/type/comments:

| Criteria | Lightweight | Standard | Detailed |
|----------|-------------|----------|----------|
| Estimated files changed | 1-2 | 3-5 | 6+ |
| Design decisions | None | Present | Multiple options |
| Impact on existing behavior | None | Limited | Widespread |
| Test impact | Existing sufficient | Additions needed | Strategy review needed |

If any criterion matches a higher level, use that level.

## Workflow

### Step 1: Fetch Issue

```bash
shirokuma-flow issue context {number}
# → Read .shirokuma/github/{org}/{repo}/issues/{number}/body.md
```

Review title, body, type, priority, size, labels, and comments.

### Step 2: Codebase Investigation

Investigate code related to the issue requirements.

1. **Existing implementation**: Use Grep/Glob to identify related files
2. **Dependencies**: Identify modules and tests affected by changes
3. **Patterns**: Check for similar implementations in the codebase
4. **Skill behavior change ripple check**: When the issue involves skill behavior changes (deprecation, responsibility change, behavioral modification), grep for the skill name across the following file categories and verify no descriptions based on the old behavior remain:
   - `i18n/cli/{ja,en}.json` skill descriptions
   - `plugin/*/rules/` skill responsibility descriptions
   - `plugin/*/skills/*/reference/` descriptions referencing other skill behavior
   - `plugin/evals/*/` evaluation scenarios

### Step 3: Create Plan

Assess the plan depth level from issue content and investigation results, then create a plan matching that level.

Plan templates for each level (Lightweight/Standard/Detailed/Epic) are in [reference/plan-templates.md](reference/plan-templates.md).

#### Sub-issue Body Template for Epic Issues

When planning an Epic issue, create each sub-issue body based on the `### Sub-Issue Structure` table. Each sub-issue body must include a reference to the parent plan:

```markdown
See #{epic-number} for the plan.
```

This allows `implement-flow` to reference the parent context when processing sub-issues, preserving consistency across the work.

**Note**: Exclude the Epic issue's plan issue (the child issue named `Plan: {title}`) from the sub-issue structure count. Only include the Epic's actual work sub-issues in the `### Sub-Issue Structure` table.

### Step 4: Create Plan Issue

Create a plan issue using `issue add` with the plan content from Step 3 as the body.

Create the plan issue body file:

```bash
cat > /tmp/shirokuma-flow/{number}-plan-issue.md <<'EOF'
---
title: "Plan: {parent issue title}"
status: "Backlog"
---

## Plan

{Full plan content based on the level-specific template from Step 3}

## Parent Issue

See #{parent-number} for the task context.
EOF
shirokuma-flow issue add /tmp/shirokuma-flow/{number}-plan-issue.md
```

After the plan issue is created, record the returned issue number as `PLAN_ISSUE_NUMBER`.

Transition to Review using `submit` (plan issues are created with Backlog status):

```bash
shirokuma-flow submit {PLAN_ISSUE_NUMBER}
```

> The plan issue body language and style must comply with the `output-language` rule and `github-writing-style` rule.

### Step 4a: Post Thinking Process Comment to Plan Issue

Post the decision rationale, alternatives, and constraints as a **comment on the plan issue** (not the parent issue).

```bash
cat > /tmp/shirokuma-flow/{number}-reasoning.md <<'EOF'
## Plan Decision Rationale

### Selected Approach
{The chosen approach and the reason for selecting it}

### Alternatives Considered
{Alternatives evaluated and why they were rejected. If none: "No alternatives (single clear approach)"}

### Constraints Discovered
{Technical constraints and dependencies found during codebase investigation. If none: "No constraints"}
EOF
shirokuma-flow issue comment {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{number}-reasoning.md
```

> Comment language and style must comply with the `output-language` rule and `github-writing-style` rule.

### Step 4b: Set Parent-Child Relationship

Register the plan issue as a child of the parent issue using the `issue parent` command.

```bash
shirokuma-flow issue parent {PLAN_ISSUE_NUMBER} {parent-number}
```

### Step 4c: Create Sub-issues and Replace Placeholders (Epic Plans Only)

Execute this step only when the plan issue body contains a `### Sub-Issue Structure` table. Skip this step for plan issues without that table (Lightweight, Standard, and Detailed plans).

> **Role split with the orchestrator**: `plan-issue` is responsible for **creating** sub-issues and **replacing** placeholders. The orchestrator (`prepare-flow`) triggers this step at Step 4a.

#### Sub-issue Creation Procedure

1. Parse the `### Sub-Issue Structure` table from the plan issue body and create a sub-issue for each row:

   ```bash
   # Create the body file for each sub-issue (n is the table row number)
   cat > /tmp/shirokuma-flow/{parent-number}-sub-{n}.md <<'EOF'
   ---
   title: "{sub-issue title}"
   status: "Backlog"
   ---

   See #{parent-number} for full plan.
   EOF

   # Create the sub-issue (record the returned number as sub_N_NUMBER)
   shirokuma-flow issue add /tmp/shirokuma-flow/{parent-number}-sub-{n}.md
   ```

2. Set the parent-child relationship for each sub-issue:

   ```bash
   shirokuma-flow issue parent {sub-N-number} {parent-number}
   ```

#### Placeholder Replacement Procedure

After all sub-issues are created, replace the placeholders (`{sub1}`–`{subN}` or `#{sub1}`–`#{subN}`) in the plan issue body with the actual issue numbers, then sync via `issue update`.

```bash
# Fetch the current plan issue body
shirokuma-flow issue context {PLAN_ISSUE_NUMBER}
# → Read .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md

# Copy the body to a local file and replace placeholders
cp .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md \
   /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md

# Replace placeholders with actual issue numbers using python3
# (handles both {sub1} → #{sub1-number} and #{sub1} → #{sub1-number} forms)
python3 - <<'PYEOF'
with open("/tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md", "r") as f:
    body = f.read()

# Mapping of placeholders to actual issue numbers
replacements = {
    "#{sub1}": "#{sub1-number}",
    "{sub1}": "#{sub1-number}",
    "#{sub2}": "#{sub2-number}",
    "{sub2}": "#{sub2-number}",
    # Add more as needed
}
for placeholder, actual in replacements.items():
    body = body.replace(placeholder, actual)

with open("/tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md", "w") as f:
    f.write(body)
PYEOF

# Update the plan issue with the replaced body
shirokuma-flow issue update {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md

# Push the local body diff to remote GitHub
shirokuma-flow issue push {PLAN_ISSUE_NUMBER}
```

> **Placeholder formats**: Replace both `{subN}` and `#{subN}` forms. All replaced values use the `#{actual-number}` format. Maintain accurate mapping between the order listed in the table (sub1, sub2, …) and the created issue numbers.

## Constraints

- Runs via Skill tool (main context), but progress management and user interaction are handled by the orchestrator (`prepare-flow`)
- Plan review is handled by `prepare-flow` — this skill only creates the plan
- **Does not update parent issue status** — parent issue status transitions (In Progress, Review) are managed by `prepare-flow`
- Plan issues are created with status `Backlog`, then transitioned to `Review` via `submit`

## GitHub Writing Rules

Issue comments and body content must comply with the `output-language` rule and `github-writing-style` rule.

**NG example (English setting but wrong language):**

```
### アプローチ
各スキルに GitHub 書き込みルールの参照を追加し...  ← Wrong language for English setting
```

**OK example:**

```
### Approach
Add GitHub writing rule references to each skill...
```

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `#42` | Fetch issue and create plan |

## Edge Cases

| Situation | Action |
|-----------|--------|
| Issue body is empty | Create plan issue with plan content only |
| Epic issue (has sub-issues) | Use epic plan template with integration branch and sub-issue structure (exclude the plan issue itself from sub-issue counts) |
| No `### Sub-Issue Structure` table | Skip Step 4c (Lightweight, Standard, Detailed plans) |
| Sub-issues already created (re-plan) | Skip Step 4c (already excluded by `prepare-flow` Step 4a condition check) |

## Rule References

| Rule | Usage |
|------|-------|
| `project-items` | Review status workflow |
| `branch-workflow` | Branch naming reference (for plan documentation) |
| `output-language` | Output language for issue comments and body |
| `github-writing-style` | Bullet-point vs prose guidelines |

## Notes

- **Does not implement** — planning only. Implementation is `implement-flow`'s responsibility
- Plans are persisted as plan issues (child issues) — available across sessions
- This skill is invoked via Skill tool from `prepare-flow` — orchestration is handled by `prepare-flow`

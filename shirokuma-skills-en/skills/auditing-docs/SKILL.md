---
name: auditing-docs
description: Periodically audits document structure, detecting docs-layering / docs-layout rule violations, missing ADRs, orphan rules, etc., and proposes improvement Issues. Triggers: "document audit", "structural docs audit", "structure audit", "auditing-docs".
allowed-tools: Read, Bash, Glob, Grep
---

# Document Structure Audit

A skill that combines mechanical inspection via `lint docs` with AI-driven structural auditing to detect and report document placement issues.

## Scope

- **Category:** Investigation Worker
- **Scope:** Mechanical inspection via `shirokuma-flow lint docs`, AI structural auditing based on `docs-layering` / `docs-layout` rules, severity classification of detected issues, proposal of improvement Issue creation.
- **Out of scope:** Automatic file relocation or auto-fixing, auto-creating Issues without user confirmation. Issue creation is performed only after user confirmation.

> **Bash exception**: `shirokuma-flow lint docs`, `git log`, `wc`, `diff`, and similar read/search commands are permitted. Automatic file moves or deletions are prohibited.

## Workflow

```
Mechanical inspection (lint docs) → AI structural audit (Grep/Read) → Severity classification → Summary report → HTML Report Decision → Issue creation proposal
```

## Steps

### 1. Run Mechanical Inspection

```bash
shirokuma-flow lint docs
```

Collect from the output:
- Errors (`❌`): missing required sections, OVERVIEW.md / ADR structural violations
- Warnings (`⚠️`): minor structural issues

> **Current inspection scope**: `lint docs` focuses on file existence and required section checks. The `claude-md-budget` / `claude-md-index-drift` rules implemented in Phase 1 belong to `lint workflow`, and until they are wired into `workflow.ts`, they do not appear in `lint docs` output. This skill covers those areas via AI inspection in Steps 2c/2d.

### 2. AI-Driven Structural Audit

Reference `docs-layering` / `docs-layout` rules and investigate using `Grep` / `Read`:

#### 2a. Detect Layering Violations

Detect placement mismatches:

```bash
# Check if project-rule-level content is mixed into plugin/shirokuma-skills-ja/rules/
# (repo-specific content that has no meaning in other projects)
grep -r "{target-doc-name}" .shirokuma/rules/ --include="*.md" -l
```

```bash
# Check if plugin-rule-level content is in .shirokuma/rules/{project}/
# (generic practices that would be useful in other projects)
# Manual check: Read each file to inspect its scope
```

Decision criteria (from `docs-layering` rule Q2):
- "Would this be useful in other projects?" → YES = plugin rule is correct
- "Is it tightly coupled to code?" → YES = project rule is correct

#### 2b. Detect EN/JA Sync Gaps (only for projects shipping both EN and JA)

> **Applicability**: Run only in repositories that ship both `plugin/shirokuma-skills-en/` and `plugin/shirokuma-skills-ja/`. Skip this step in single-language projects.

```bash
# Filename-level existence check (lightweight)
diff <(ls plugin/shirokuma-skills-ja/rules/ | sort) <(ls plugin/shirokuma-skills-en/rules/ | sort)
diff <(ls plugin/shirokuma-skills-ja/skills/ | sort) <(ls plugin/shirokuma-skills-en/skills/ | sort)
```

> **Limitation**: `ls + diff` only detects filename mismatches. Content drift (one side updated, the other outdated) requires reading each pair via `Read` or comparing line counts with `wc -l`.

#### 2c. Detect Orphan Rules / Broken Links

For each project rule file, search its basename across all locations where it might be referenced (CLAUDE.md, `.shirokuma/rules/`, the whole `plugin/` tree):

```bash
# Count references per file (excluding the file itself)
for f in .shirokuma/rules/{project}/*.md; do
  name=$(basename "$f")
  count=$(grep -rl "$name" CLAUDE.md .shirokuma/rules/ plugin/ --include="*.md" 2>/dev/null | grep -v "^$f$" | wc -l)
  echo "$count $name"
done | sort -n | head -10
```

Files with a reference count of **0** are orphan candidates. This also captures indirect references through `rules-index.md` and references from plugin SKILL.md files.

#### 2d. CLAUDE.md Budget Check (interim)

```bash
wc -l CLAUDE.md
```

Warn if over 150 lines (configured line budget).

> **Interim**: Once the `claude-md-budget` lint rule (already implemented in Phase 1) is wired into `workflow.ts`, this check will be performed mechanically by Tier 1 (lint workflow). Until then, this skill provides AI-side coverage.

#### 2e. Possible Missing ADRs

The following signs may indicate unrecorded important decisions:

- A large refactor PR contains silent policy changes without explanation
- Important design constraints in `.shirokuma/rules/` or `SKILL.md` lack a "why" explanation

```bash
# Check recent large changes (for reference)
git log --oneline -20
```

### 3. Severity Classification

Classify detected issues by the following criteria:

| Severity | Criteria | Action |
|----------|----------|--------|
| **High** | EN/JA sync gap (only one side exists), lint docs error | Recommend individual Issue creation |
| **Medium** | Layering violation (clear mismatch), orphan rule | Recommend individual Issue creation |
| **Low** | CLAUDE.md budget exceeded, possible missing ADR, minor structural improvement | Aggregate same-category issues into 1 Issue |

**False positive suppression**: When a single category (e.g. orphan rules, minor layering violations, CLAUDE.md budget overruns) has **3 or more** Low-severity issues, create a category-level aggregate Issue instead of individual ones.

### 4. Summary Report

Report to the user in this format:

```markdown
## Document Audit Results

**Audit date:** {date}

### Mechanical Inspection (lint docs)
| Result | Count |
|--------|-------|
| Errors | {n} |
| Warnings | {n} |

### AI Structural Audit
| Severity | Issue | Location |
|----------|-------|----------|
| High | EN/JA sync gap: {filename} | Exists in plugin/shirokuma-skills-ja/rules/, missing from EN side |
| Medium | Layering violation: {filename} | Generic rule placed in .shirokuma/rules/ |
| Low | CLAUDE.md budget exceeded | {n} lines (limit: 150) |

### Issue Creation Candidates
- [ ] [High] EN/JA sync gap: add {filename} to EN side
- [ ] [Medium] Move {filename} to plugin rules
- [ ] [Low] Bundle: minor structural improvements ({n} items)
```

### 5. HTML Report Decision

Based on the size of the summary report (Step 4), decide whether to promote it to an HTML report. This skill itself does not generate HTML; it presents **decision information** to the caller or, when run directly, to the user.

**Canonical source for decision criteria, template mapping, and category mapping**: [`html-report-criteria.md`](../../rules/html-report-criteria.md) (do not duplicate threshold values, template names, or category names into this file).

#### 5-1. Generate Decision Information

Measure the summary report from Step 4 and produce the structured data:

```yaml
html_report_required: true|false
template_name: review-summary
category: reviews
slug: docs-{year}{quarter}  # e.g. docs-2026q2
report_lines: 142
report_kb: 12.4
critical_high_count: 5  # High count (auditing-docs treats High as the top severity)
report_type: docs-audit
```

`html_report_required` is `true` when any of the `html-report-criteria.md` §2 thresholds is met (lines ≥ 80, size ≥ 8 KB, or Critical+High ≥ 3); otherwise `false`. auditing-docs uses threshold-based decisions and is not always HTML.

#### 5-2. When HTML is YES

This skill does not generate HTML itself; it presents the decision information to the user (direct invocation) or to the calling orchestrator. The actual `writing-html-explainer` call is the user's instruction or the orchestrator's responsibility (per the responsibility boundary in `html-report-criteria.md` §1).

Parameters are fixed per `html-report-criteria.md` §3 / §4:

| Parameter | Value |
|-----------|-------|
| `--template` | `review-summary` (canonical: `html-report-criteria.md` §3) |
| `--category` | `reviews` (canonical: documentation audit row in `html-report-criteria.md` §4) |
| `--slug` | `docs-{year}{quarter}` (e.g. `docs-2026q2`; see naming convention in `html-report-criteria.md` §4) |

For report structuring, follow the template mapping in `html-report-criteria.md` §3 and use these components:

- **`review-score-card`**: overall verdict for the mechanical inspection result (lint docs error / warning counts)
- **`issue-list-table`**: drift list, missing required sections, broken references, layering violations, and orphan rules ordered by High / Medium / Low priority
- **`action-items`**: ordered list of candidate issues to file

#### 5-3. style.css `?v=N` Bumping Policy

Large audits may surface many findings, so new styling may be added. Only when `pages/assets/style.css` is updated, increment the `?v=N` cache buster across 4 locations together (see "?v=N Bumping Policy" in `writing-html-explainer/SKILL.md`). **If `style.css` is unchanged, no `?v=N` updates are required.**

#### 5-4. When HTML is NO

Keep the Markdown-only summary report as before with no additional processing. Proceed to Step 6 (Issue creation).

### 6. Create Issues (After User Confirmation)

Create Issues only after the user confirms. This skill does not auto-create Issues.

Write the Issue body to a temporary file and create the Issue via `shirokuma-flow issue add` (same pattern as `auditing-security`):

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/audit-issue-{slug}.md <<'EOF'
---
title: "fix(docs): {problem summary}"
priority: "Medium"
size: "S"
labels: ["area:{docs-area}"]
---

## Purpose
Fix {problem description} to restore document structure integrity.

## Background
- **Detected by:** auditing-docs skill structural audit
- **Rule reference:** docs-layering / docs-layout
- **Impact:** {description of impact}

## Tasks
- [ ] {concrete fix steps}
- [ ] Verify lint docs passes

## Deliverable
`shirokuma-flow lint docs` returns clean and the structure complies with the docs-layering rule.
EOF

shirokuma-flow issue add /tmp/shirokuma-flow/audit-issue-{slug}.md
```

For larger tasks that require requirement analysis or sub-Issue decomposition, you may invoke `create-item-flow` instead (only when you want to leverage its inference logic).

## Periodic Execution via GitHub Actions (Reference)

> **Positioning**: Only Tier 1 (`lint docs`) can run automatically on a schedule. The full skill (including AI inspection) is invoked manually. Use scheduled `lint docs` as a trigger condition — when it reports errors in a given week, run `/auditing-docs` manually.

```yaml
# .github/workflows/docs-audit.yml (reference example)
name: docs-audit
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 09:00 UTC (lint docs only)
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run lint docs (mechanical inspection)
        run: shirokuma-flow lint docs
      # When lint docs reports errors, a developer manually runs /auditing-docs
```

## Notes

- **Structural issues can exist even when lint docs passes**: Mechanical inspection checks file existence and format, but the appropriateness of placement (layering) is judged by AI
- **Recommended after large changes**: Run a structural audit after adding plugin rules or after a major refactor
- **Suggested frequency**: Monthly, or after major PR merges

## Quick Reference

```bash
# Mechanical inspection only
shirokuma-flow lint docs

# Manually invoke the full structural audit
/auditing-docs
```

---
name: analyze-issue
description: Provides Issue analysis roles (plan / requirements / design / research). Checks plan quality, requirements quality, design quality, and research quality, then posts reports as Issue comments. Triggers: "plan review", "requirements review", "design review", "research review", "requirements check", "design assessment", "research quality".
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

## Project Rules

!`shirokuma-flow rules inject --scope review-worker`

# Issue Analysis

A dedicated Issue analysis skill that reviews Issue content (plan, requirements, design, research) by specialized role. Split from `review-issue` as the Issue analysis dedicated skill.

## Available Roles

| Role | Focus | Trigger |
|------|-------|---------|
| **plan** | Requirements coverage, task granularity, risks | "plan review", "計画レビュー" |
| **requirements** | Issue body completeness, clarity, implementability | "requirements review", "要件レビュー", "要件確認" |
| **design** | Design Brief, Aesthetic Direction, UI implementation | "design review", "設計レビュー" |
| **research** | Requirement alignment, research quality, implementability | "research review", "リサーチレビュー" |

## Workflow

```
Role Selection → Load Knowledge → Fetch Issue → Analyze → Generate Report → Save as Issue Comment → HTML Report Decision
```

### 1. Role Selection

Based on user request, select the appropriate role:

| Keyword | Role | Files to Load | HTML Template |
|---------|------|---------------|---------------|
| "plan", "計画レビュー" | plan | roles/plan.md, criteria/plan.md | `review-summary` |
| "requirements", "要件レビュー", "要件確認" | requirements | roles/requirements.md | `review-summary` |
| "design", "設計レビュー", "デザイン" | design | criteria/design, roles/design | `design-review` |
| "research", "リサーチレビュー" | research | roles/research, criteria/research | `review-summary` |

> **HTML Template column**: the `template_name` value returned to the calling orchestrator in Step 7 "HTML Report Decision". The canonical mapping of templates to roles is defined in [`html-report-criteria.md`](../../rules/html-report-criteria.md) §3.

**HTML decision skip condition**: After role selection, if a PASS verdict with zero findings and a report under 80 lines is already certain, the structured output in Step 7 may return `html_report_required: false` (the canonical threshold lives in `html-report-criteria.md` §2). **Exception: roles in `always_html_types` are exempt from this skip condition — always return `html_report_required: true`. This currently covers: `requirements` (`report_type: requirements-review`) and `design` (`report_type: design-review`).**

### 2. Load Knowledge

Read required knowledge files based on role:

```
1. Auto-loaded: .claude/rules/*.md (based on file paths)
2. Role-specific: roles/{role}.md
3. Criteria: criteria/{relevant}.md (for plan / design / research roles)
```

**Note**: Project-specific rules are auto-loaded from `.claude/rules/` — no manual loading needed.

### 3. Run shirokuma-flow Lints

**Skip for all roles (target is Issue body / design artifacts / research findings, not code/document files)**

### 4. Issue Analysis

**Requirements role:**

1. Fetch Issue body via `shirokuma-flow issue context {number}` and read `.shirokuma/github/{org}/{repo}/issues/{number}/body.md`
2. Analyze each section (purpose, overview, reproduction steps, deliverables, considerations) for presence and content
3. Evaluate each item in review checklist (`roles/requirements.md`)
4. Check against anti-patterns
5. Assess completeness, clarity, implementability, and consistency
6. Perform the design assessment and append `**Design assessment:** NEEDED / NOT_NEEDED` to the report (see the Design Assessment section in `roles/requirements.md`)

**Plan role:**

1. Fetch the parent Issue via `shirokuma-flow issue context {number}` and read `.shirokuma/github/{org}/{repo}/issues/{number}/body.md`
2. Identify the plan issue from `subIssuesSummary` — the child issue with a title starting with "Plan:" or "計画:" (this is `{plan-issue-number}`)
3. Fetch the plan issue body via `shirokuma-flow issue context {plan-issue-number}` and read `.shirokuma/github/{org}/{repo}/issues/{plan-issue-number}/body.md`
4. Extract the `## Plan` / `## 計画` section from the plan issue body as the review target
5. Evaluate each item in review checklist (`roles/plan.md`)
6. Cross-check against the 15 viewpoints in `criteria/plan.md` and surface High-or-above findings
7. Check against anti-patterns
8. Verify consistency with requirements and deliverables
9. **Detect coexisting plan Issues**: run `shirokuma-flow issue sub-list {parent}` and raise Critical when more than one plan Issue is present (`criteria/plan.md` V7)
10. **Comment destination**: Post the review result **as a comment on the plan issue (child) at `{plan-issue-number}`** — not on the parent issue. This allows human reviewers to see the review comment directly when the plan issue (child) is in Review status

**Backward compatibility**: When no plan issue (child issue) exists but the parent issue body contains a `## Plan` / `## 計画` section (legacy approach), use the parent issue's plan section as the review target, and post the comment on the parent issue.

**Design role:**

1. Fetch Issue body via `shirokuma-flow issue context {number}` and read `.shirokuma/github/{org}/{repo}/issues/{number}/body.md`
2. Extract Design Brief, Aesthetic Direction, and UI implementation results
3. Evaluate each item in review checklist (`roles/design.md`)
4. Check against review criteria (`criteria/design.md`)
5. Check against anti-patterns
6. Verify requirements alignment and technical feasibility

**Research role:**

1. Fetch research findings (Discussion or Issue comment)
2. Verify requirement alignment (`criteria/research.md`)
3. Evaluate research quality (source diversity, version consistency, source attribution)
4. Verify implementability (specificity, incremental adoption, risk identification)
5. Assess alignment level using the mismatch decision matrix (`roles/research.md`)
6. Create adoption proposals for mismatched but useful patterns

### 5. Generate Report

Use `templates/report.md` format:

1. Summary (**lead with a 1–2 sentence prose overview** — state key findings and overall assessment conclusion-first)
2. **Issue Summary** (breakdown table of detected issues by severity)
3. Critical Issues
4. Improvements
5. Best Practices
6. Recommendations

**Issue summary table** (placed immediately after the Summary section):

```markdown
### Issue Summary
| Severity | Count |
|----------|-------|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |
| **Total** | **{n}** |
```

If 0 issues are found, state "No issues were detected" and omit the table.

### 6. Save Report

Post as Issue comment based on analysis context.

```bash
# After creating file with Write tool
shirokuma-flow issue comment {issue#} /tmp/shirokuma-flow/{number}-analyze-report.md
```

#### 6-1. Routing Summary

| Context | Output Destination |
|---------|-------------------|
| Issue number (plan role) | **Comment on plan issue (child)** (so reviewers can see the comment when plan issue is in Review. Backward compat: comment on parent when no plan issue exists) |
| Issue number (requirements role) | Issue comment |
| Issue number (design role) | Issue comment |
| Issue number (research role) | Issue comment |

> See `rules/output-destinations.md` for the full output destination policy. In particular, the "Investigation / Design Artifacts" section defines the routing criteria for intermediate artifacts (process flows, side-effect matrices, gap analysis, design proposals) produced by the plan/requirements/design/research roles — do not default to Issue comments; pick Discussion (Reports/Research/Knowledge) or ADR based on the artifact's nature.

### 7. HTML Report Decision

After saving the report, this skill itself does not generate HTML. Instead, it returns **decision information** as structured data to the calling orchestrator (`design-flow` / `prepare-flow` / `review-flow` / `implement-flow`, etc.). The actual HTML generation (invoking `writing-html-explainer`) is the orchestrator's responsibility.

The **canonical source** for decision criteria, template mapping, and category mapping is [`html-report-criteria.md`](../../rules/html-report-criteria.md) (do not duplicate threshold values, template names, or category names into this file).

**`auditing-security` exclusion note**: `auditing-security` is a dependency-vulnerability scanner that completes within Issue creation, so it is outside this decision step. `reviewing-security` (PR security review) is always an HTML target. See the note in `html-report-criteria.md` §2.

#### 7-1. Returned Fields

Measure the report generated in Step 5 and return the following structured data (YAML frontmatter) to the orchestrator:

```yaml
html_report_required: true|false
template_name: review-summary|design-review
category: reviews|issues|discussions
slug: pr-{number}-r{round}|research-{issue-number}|{issue-number}
report_lines: 142
report_kb: 12.4
critical_high_count: 5
report_type: plan-review|requirements-review|design-review|research-review
```

#### 7-2. Template Selection (by Role)

Fix `template_name` per role as below (canonical: `html-report-criteria.md` §3):

| Role | `template_name` |
|------|----------------|
| plan | `review-summary` |
| requirements | `review-summary` |
| design | `design-review` |
| research | `review-summary` |

#### 7-3. Category and Slug Determination

The orchestrator chooses category and slug per `html-report-criteria.md` §4 "Report Type ↔ Category Mapping". This skill only returns the decision information and does not control the final `--category` / `--slug`.

#### 7-4. Responsibility Boundary

| Layer | Responsibility |
|-------|----------------|
| `analyze-issue` (this skill) | Generate Markdown report + post Issue comment + return decision information |
| Orchestrator | Compare decision information against the thresholds in `html-report-criteria.md` §2 and make the final HTML decision |
| `writing-html-explainer` | Invoked by the orchestrator with `--template` to generate HTML |

## Review Result Expressions

On analysis completion, output the following standard expressions so that the calling orchestrator can consistently determine the result.

### Plan Review Mode (plan role)

When invoked from `prepare-flow` with plan role, post the plan review result **as a comment on the plan issue (child)** (so that human reviewers can access the review result directly when the plan issue is in Review status) and include the following verdict.

- **PASS**: `**Review result:** PASS` — No critical issues in the plan (Suggestions may still be present)
- **NEEDS_REVISION**: `**Review result:** NEEDS_REVISION` — Missing requirements, significant inconsistencies, or anti-patterns detected

On NEEDS_REVISION, classify issues into `[Plan]` and `[Issue description]`. `plan-issue` uses this classification to perform fixes.

### Requirements Review Mode (requirements role)

When invoked with requirements role, post the requirements review result as an Issue comment and include the following verdict.

- **PASS**: `**Review result:** PASS` — No critical issues in the Issue body (improvement suggestions may still be present)
- **NEEDS_REVISION**: `**Review result:** NEEDS_REVISION` — Missing required sections, fatal ambiguities, or unimplementable requirements

On NEEDS_REVISION, classify issues into `[Completeness]`, `[Clarity]`, and `[Implementability]`.

Regardless of whether the result is PASS or NEEDS_REVISION, perform the design assessment (see `roles/requirements.md` "Design Assessment" section) and always append:

- **Assessment NEEDED**: `**Design assessment:** NEEDED` — Design phase is required
- **Assessment NOT_NEEDED**: `**Design assessment:** NOT_NEEDED` — Design phase is not required

This structured output is mandatory because `issue-flow` scans for the `**Design assessment:**` string to automatically branch to the next flow.

The trigger conditions, check items, and structured output fields (`**Project Requirement Consistency:**` / `**Referenced ADRs:**`) for the Project Requirement Consistency check are authoritatively defined in [`roles/requirements.md` "Project Requirement Consistency"](roles/requirements.md#project-requirement-consistency). `issue-flow` Step 2b scans these fields to branch downstream processing.

### Design Review Mode (design role)

When invoked with design role, post the design review result as an Issue comment and include the following verdict.

- **PASS**: `**Review result:** PASS` — No critical issues in the design (improvement suggestions may still be present)
- **NEEDS_REVISION**: `**Review result:** NEEDS_REVISION` — Missing Design Brief, uncovered requirements, accessibility violations, significant inconsistencies

### Research Review Mode (research role)

When invoked with research role, post the research review result as an Issue comment and include the following verdict.

- **PASS**: `**Review result:** PASS` — No critical issues in research findings, aligned with requirements
- **NEEDS_REVISION**: `**Review result:** NEEDS_REVISION` — Insufficient sources, version inconsistencies, critical mismatches with requirements

## Progressive Disclosure

For token efficiency:

1. **Auto-loaded**: `.claude/rules/*.md` based on analysis targets
2. **On Demand**: Load knowledge files based on role
3. **Minimal Output**: Summary first, details on request

## Quick Reference

```bash
"plan review #42"          # Plan review
"requirements review #42"  # Requirements review
"design review #42"        # Design review
"research review #42"      # Research review
```

## Next Steps

When invoked standalone (not via `implement-flow`), suggest next workflow steps after analysis:

```
Analysis complete. If changes were made based on findings:
→ Suggest re-analysis after fixing Issue body
```

## Execution Context

When invoked via Skill tool, this skill runs in the main context with access to project-specific rules from `.claude/rules/`.

### Error Recovery

If analysis is incomplete:
1. Identify missing coverage
2. Load additional patterns
3. Re-analyze missed areas
4. Update report

## Notes

- **Reports saved**: Posted as Issue comments (see `rules/output-destinations.md`)
- **Role-based**: Load only relevant knowledge files
- **Progressive**: Summary first, details on request
- **Rules auto-loaded**: Project conventions from `.claude/rules/` (including paths-based rules when running in main context)
- **Main context execution**: Runs via Skill tool in the main context, enabling access to project-specific rules
- **Caller's comment-first compliance**: This skill posts comments but does not update bodies
- **Effort assumption**: Assumes xhigh. Ensures sufficient reasoning depth for ADR consistency checks, anti-pattern matching, and multi-faceted quality evaluation

## Language

Review reports (Issue comments) must follow the language specified in the `output-language` rule.

## Anti-Patterns

- **Focus on reporting findings**: Do not modify Issues. Combining analysis and fixes erodes review objectivity
- **Load only role-specific files**: Do not bulk-load all knowledge files. Loading only role-specific files keeps context focused

## Reference Documents

| Directory | Files |
|-----------|-------|
| `criteria/` | [plan](criteria/plan.md), [design](criteria/design.md), [research](criteria/research.md) |
| `roles/` | [plan](roles/plan.md), [requirements](roles/requirements.md), [design](roles/design.md), [research](roles/research.md) |
| `templates/` | [report](templates/report.md) |
| `docs/` | [adr-filter-logic](docs/adr-filter-logic.md) |

See the role selection table in Step 1 for per-role file loading.

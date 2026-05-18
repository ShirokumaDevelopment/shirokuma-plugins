# HTML Report Decision (review-issue Detailed Spec)

Detailed spec for `review-issue` SKILL.md Step 7 (HTML Report Decision).

## Role

After saving the report, this skill itself does not generate HTML. It returns **decision information** as structured data to the calling orchestrator (`review-flow`, etc.). The actual HTML generation (invoking `writing-html-explainer`) is the orchestrator's responsibility.

**Canonical source for decision criteria, template mapping, and category mapping**: [`.shirokuma/rules/shirokuma-flow/html-report-criteria.md`](../../../../../.shirokuma/rules/shirokuma-flow/html-report-criteria.md) (do not duplicate threshold values, template names, or category names into this file).

## Decision Skip Condition

When a PASS verdict with zero findings and a report under 80 lines is already certain, you may return `html_report_required: false` (the canonical threshold lives in `html-report-criteria.md` §2).

## Returned Fields

Measure the report generated in Step 5 and return the following structured data (YAML frontmatter) to the orchestrator:

```yaml
html_report_required: true|false
template_name: review-summary
category: reviews|discussions
slug: pr-{number}-r{round}
report_lines: 142
report_kb: 12.4
critical_high_count: 5
report_type: pr-review|code-review|docs-audit|testing-review|config-review
```

## Template Selection (by Role)

Fix `template_name` per role as below (canonical: `html-report-criteria.md` §3):

| Role | `template_name` |
|------|----------------|
| code / config / code+annotation | `review-summary` |
| security | `review-summary` |
| testing | `review-summary` |
| nextjs (fallback execution) | `review-summary` |
| docs | `review-summary` |

**Delegation note**: When the `nextjs` role is delegated to `reviewing-nextjs`, that delegate makes the decision. The table above applies only when this skill performs fallback execution.

## Category and Slug Determination

The orchestrator chooses category and slug per `html-report-criteria.md` §4 "Report Type ↔ Category Mapping". This skill only returns the decision information and does not control the final `--category` / `--slug`.

## Responsibility Split

| Layer | Responsibility |
|-------|----------------|
| `review-issue` (this skill) | Generate Markdown report + post PR / Discussion + return decision information |
| Orchestrator (`review-flow`, etc.) | Compare decision information against the thresholds in `html-report-criteria.md` §2 and make the final HTML decision. Only when YES, invoke `writing-html-explainer` via the Skill tool |
| `writing-html-explainer` | Invoked by the orchestrator with `--template` to generate HTML |

## `auditing-security` Exclusion Note

`auditing-security` is a dependency-vulnerability scanner that completes within Issue creation, so it is outside this decision step. `reviewing-security` (PR security review) is always an HTML target. See the note in `html-report-criteria.md` §2.

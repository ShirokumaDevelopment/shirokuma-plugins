---
paths:
  - "**/skills/analyze-issue/**"
  - "**/skills/review-issue/**"
  - "**/skills/review-flow/**"
  - "**/skills/reviewing-security/**"
  - "**/skills/auditing-docs/**"
  - "**/skills/writing-html-explainer/**"
  - "**/skills/design-flow/**"
  - "**/skills/implement-flow/**"
---

# HTML Promotion Criteria for Reporting Skills

A single source of truth governing whether the Markdown reports produced by reporting skills (`analyze-issue` / `review-flow` / `review-issue` / `reviewing-security` / `auditing-docs`) are promoted to HTML reports, plus template selection and output-category decisions.

**Canonical source**: this file. Do **not** hardcode thresholds, template names, or category names into each SKILL.md. Reference this file only, to prevent drift.

---

## 1. HTML Promotion Responsibilities

| Layer | Owner | Responsibility |
|-------|-------|----------------|
| Reporting skills (investigation) | `analyze-issue`, etc. | Generate the Markdown report and post it as a GitHub comment. Return **decision information** (line count, KB, Critical+High count, report type) to the caller |
| Orchestrator | `design-flow` / `review-flow` / `implement-flow` | Compare returned decision information against the criteria in this file to decide on HTML promotion. Only on YES, invoke `writing-html-explainer` |
| HTML generation engine (mutation) | `writing-html-explainer` | Receive the template-type parameter and generate HTML. Commit the submodule and regenerate the index |

**Responsibility boundary**: investigation skills must NOT directly Skill-invoke the mutation skill (`writing-html-explainer`). Follow the "no category mixing" and "separate proposal from execution" principles in `skill-scope-boundaries`.

---

## 2. Decision Criteria Table

Perform HTML promotion if **any one** of the following is met. If none are met, keep the conventional Markdown comment only.

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| Line count | report body **≥ 80 lines** | The point where GitHub comment readability degrades significantly |
| Size | report body **≥ 8 KB** | Impact on comment rendering performance |
| Finding count (Critical + High total) | **≥ 3** | High value for priority-grouped organization and recommended-action display |
| Report-type specific (always HTML) | `postmortem` | Incident reports always need structured display |
| Report-type specific (always HTML) | `security-pr-review` (result of `reviewing-security`) | PR security reviews always need structured display |

> **Note**: the decision uses only the Critical + High total. The report body's "finding summary table" displays Critical / High / Medium / Low individually, but do not conflate the decision formula with the displayed items.

> **`auditing-security` is out of scope**: `auditing-security` is a skill that completes with dependency-vulnerability scanning → Issue filing, and does not generate HTML reports. The "always HTML" target is limited to `reviewing-security` (PR security review).

---

## 3. Template Mapping

`writing-html-explainer` selects a template type via the `--template` parameter. The four templates and their main parts (from the snippets.md catalog):

| Template | Use / target skills | Main parts |
|----------|---------------------|------------|
| `review-summary` | Review results in general. `analyze-issue` (plan / requirements / design / research), `review-issue` (code / security / testing / docs), `review-flow`, `auditing-docs` | `review-score-card` (PASS/FAIL/NEEDS_REVISION) / `issue-list-table` (Critical/High/Medium/Low finding list) / `action-items` (ordered list of recommended actions) |
| `design-review` | Design review. `design-flow` / `analyze-issue` design role | `phase-card` (section cards) / `review-score-card` / `summary-card` (Design Brief consistency / Aesthetic Direction evaluation summary) |
| `postmortem` | Incident reports (incident response) | `status-header` (4-column meta: ID + SEV + Status + Duration) / `event-log` (timestamped timeline) / `metric-grid` (impact-metric card grid) |
| `implementation-plan` | Epic plan reports. `prepare-flow` epic plan docs / `plan-issue` Markdown support | `hero` (project overview + tags) / `milestone-timeline` (Week N · day–day grouping + child task groups) / risk `<table>` / data-flow SVG |

**Drift-prevention rule**: do not hardcode template names or thresholds into each SKILL.md. Always reference this file (`html-report-criteria.md`). Manage template additions and threshold changes centrally here.

---

## 4. Report Type ↔ Category Mapping

Output categories and slug naming conventions for the `pages/` submodule.

| Report type | Category | Path example | Slug convention | Use |
|-------------|----------|--------------|-----------------|-----|
| PR review result | `reviews` | `pages/reviews/pr-{number}-r{round}/` | `pr-{number}-r{round}` | Code review results (`r1`, `r2` for round management) |
| Issue requirements review | `issues` | `pages/issues/{number}/` | Issue number | Requirements / design quality detailed report |
| Discussion / ADR review | `discussions` | `pages/discussions/{number}/` | Discussion number | Discussion #N evaluation result |
| Design review (standalone) | `reviews` | `pages/reviews/design-{issue-number}/` | `design-{issue-number}` | `design-flow` design evaluation result |
| Research review | `reviews` | `pages/reviews/research-{issue-number}/` | `research-{issue-number}` | research role evaluation result |
| Security PR review | `reviews` | `pages/reviews/security-pr-{number}/` | `security-pr-{number}` | `reviewing-security` PR security review result |
| Documentation audit | `reviews` | `pages/reviews/docs-{year}{quarter}/` | `docs-{year}{quarter}` (e.g. `docs-2026q2`) | `auditing-docs` structural audit result |
| Incident postmortem | `incidents` | `pages/incidents/{year}-{slug}/` | `{year}-{slug}` (e.g. `2026-05-outage`) | Incident report (uses `postmortem` template) |
| Progress / period report | `status` | `pages/status/{slug}/` | `{period}` (e.g. `q1-2026`) | Q1 report, etc. |

**Slug convention**: within the `reviews/` category, PR review / design review / security review / documentation audit may coexist, so a prefix (`pr-` / `design-` / `security-pr-` / `docs-` / `research-`) is required to keep the listing scannable.

**Placement exception**: when pairing with PR supplementary material (diff explanation, design decisions), placement under `prs/{number}/` is also allowed (the orchestrator presents the options).

The category ↔ URL mapping follows each project's pages configuration (category definitions).

---

## 5. Orchestrator Implementation Guide

The decision → invocation flow that orchestrators (`design-flow` / `review-flow` / `implement-flow`) perform after a reporting skill completes.

### 5-1. Receiving Decision Information

Reporting skills (`analyze-issue` / `review-issue` / `review-flow` / `auditing-docs` / `reviewing-security`) return the following information to the orchestrator upon report completion:

| Field | Content |
|-------|---------|
| `report_lines` | Line count of the report body |
| `report_kb` | Size of the report body (KB) |
| `critical_high_count` | Total Critical + High count |
| `report_type` | Report type (`pr-review` / `design-review` / `requirements-review` / `research-review` / `docs-audit` / `security-pr-review` / `postmortem`, etc.) |

### 5-2. Decision Formula (pseudocode)

```
always_html_types = ["postmortem", "security-pr-review"]

should_html = (
  report_type in always_html_types
  or report_lines >= 80
  or report_kb >= 8
  or critical_high_count >= 3
)
```

### 5-3. Invocation When HTML = YES

```
1. Determine template type (§3 mapping)
   - Review result   → review-summary
   - Design review   → design-review
   - Incident report → postmortem
   - Epic plan       → implementation-plan
2. Determine category and slug (§4 mapping)
3. Invoke writing-html-explainer (Skill tool / SubAgent)
   - --template <type>
   - --category <category>
   - --slug <slug per convention>
   - --title <page title>
   - --source-report <Markdown report body or reference>
4. Obtain the published URL from the return value
5. Append "summary table + URL" to the Issue / PR comment (§5-4)
```

### 5-4. Comment Body Template (when HTML = YES)

```markdown
## {Report Type} Complete

{1-2 sentence overall evaluation comment.}

### Finding Summary

| Severity | Count |
|----------|-------|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |

> HTML decision: Critical + High total {n} (threshold: ≥ 3 / lines {lines} / size {kb} KB)

**Recommended actions (top 3):**
1. {highest-priority action}
2. {next action}
3. {optional action}

See the [HTML report]({URL}) for details.
```

When HTML = NO, post the Markdown body as the comment as before.

---

## 6. Drift Prevention and Update Procedure

**Drift-prevention rules**:
- Each SKILL.md must **not** hardcode threshold values, template names, or category names
- Always link to this file in the form "see `html-report-criteria.md` for details"
- Make threshold changes, template additions, and category changes centrally in this file

**Checks when updating this file**:
1. Does the project's pages category definition agree with §4?
2. Does the corresponding template HTML exist under `writing-html-explainer/reference/`?
3. Does the corresponding snippets section exist in `writing-html-explainer/reference/snippets.md`?
4. Is the JA version synchronized with the EN version `plugin/shirokuma-skills-ja/skills/writing-html-explainer/`?

---

## 7. JA/EN Synchronization Checkpoints

The JA / EN versions of `writing-html-explainer` and the reporting skills referenced by this file (`analyze-issue` / `review-flow` / `review-issue` / `reviewing-security` / `auditing-docs`) must maintain structural equivalence.

### Synchronization Check Criteria

`auditing-docs` step 2b "Detect EN/JA sync gaps" uses the following thresholds:

| Target | Threshold | Detection method |
|--------|-----------|------------------|
| SKILL.md line-count difference | **≥ 50 lines** | `wc -l plugin/shirokuma-skills-{ja,en}/skills/{skill}/SKILL.md` |
| `reference/snippets.md` line-count difference | **≥ 50 lines** | `wc -l plugin/shirokuma-skills-{ja,en}/skills/writing-html-explainer/reference/snippets.md` |
| Template HTML placeholder-count difference | **≥ 1** | Compare `grep -oE '\{\{[A-Z_]+\}\}' {template}.html \| sort -u \| wc -l` between JA/EN |
| `snippets.md` / `SKILL.md` code-block-count difference | **≥ 1** | Compare the count of lines starting with ` ``` ` between JA/EN |
| `style.css` / `theme.js` byte-count difference | **≠ 0** | Language-independent files must be byte-identical (verify with `diff -q`) |

A line-count difference of ≥ 50 is warned as **suspected content drift** (not an immediate error; treated as needs-review).

### Synchronization Principles

- **JA is the canonical version** — make fixes in JA first, then translate and synchronize the corresponding EN section
- **Language-independent files** (`style.css` / `theme.js` / template HTML placeholders and structure) must be byte-identical
- **`reference/html-report-decision.md`** and other one-level-deeper files are also placed under both JA / EN with the same name (only reference paths adjust for the depth difference)

### Related References

- The "Multilingual support" section of `plugin/specs/skills/writing-html-explainer/DESIGN.md` (supplementary implementation guide and command examples)
- `skill-scope-boundaries` rule (skill responsibility boundaries)
- Step 2b of `plugin/shirokuma-skills-*/skills/auditing-docs/SKILL.md`

---

## Related

- `pages-publishing` (project-specific) — pages submodule operation rules
- `skill-scope-boundaries` — investigation / mutation responsibility boundary
- `docs-layering` rule — three-layer placement model
- `plugin/shirokuma-skills-en/skills/writing-html-explainer/SKILL.md` — HTML generation engine

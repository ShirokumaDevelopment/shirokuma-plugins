---
name: review-issue
description: Provides comprehensive review workflow with specialized roles for code quality, security, testing patterns, and documentation. Triggers: "review", "security audit", "security check", "test review", "test quality", "Next.js review", "docs review", "code review", "config review". Issue analysis (plan, requirements, design, research) has moved to analyze-issue.
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

## Project Rules

!`shirokuma-flow rules inject --scope review-worker`

# Issue Reviewing Skill

Comprehensive review workflow with specialized roles for different review types.

## Available Roles

| Role | Focus | Trigger |
|------|-------|---------|
| **code** | Quality, patterns, style | "review", "コードレビュー" |
| **config** | Config file quality, best practices compliance | Auto-detected from `code` role, or "config review", "設定レビュー" |
| **code+annotation** | JSDoc annotations | "annotation review", "アノテーションレビュー" |
| **security** | OWASP, CVEs, auth | "security review", "セキュリティ" |
| **testing** | TDD, coverage, mocks | "test review", "テストレビュー" |
| **nextjs** | Framework, patterns (delegates to `reviewing-nextjs` with fallback) | "Next.js review", "プロジェクト" |
| **docs** | Markdown structure, links, terminology | "docs review", "ドキュメントレビュー" |

> **Issue analysis roles (plan / requirements / design / research) have moved to `analyze-issue`.** Backward compatibility stubs will automatically delegate to `analyze-issue` when these keywords are used.

## Backward Compatibility Delegation Stubs

When `review-issue` is invoked with the following keywords, it automatically delegates to `analyze-issue`:

| Keyword | Delegated Role |
|---------|---------------|
| "plan review", "計画レビュー", "計画チェック" | `analyze-issue` plan |
| "requirements review", "要件レビュー", "要件確認", "要件整合性", "ADR 確認" | `analyze-issue` requirements |
| "design review", "設計レビュー", "デザインレビュー" | `analyze-issue` design |
| "research review", "リサーチレビュー" | `analyze-issue` research |

**Behavior**: When a keyword is detected, output the following message and exit (no Skill delegation):

```
This role has moved to the analyze-issue skill. Please use `analyze-issue {role name}`.
```

Example: when "plan review" is detected → output `"This role has moved to the analyze-issue skill. Please use \`analyze-issue plan\`."` and exit.

## Workflow

```
Role Selection → Load Knowledge → Run Lints → Analyze Code/Plan → Generate Report → Save Report → HTML Report Decision
```

**7 Steps**: Select Role → Load → **Lint** → Analyze → Report → Save → **HTML Report Decision**

### 1. Role Selection

Based on user request, select appropriate role:

| Keyword | Role | Files to Load |
|---------|------|---------------|
| "review", "レビュー" | code | criteria/code-quality, criteria/coding-conventions, patterns/server-actions, patterns/drizzle-orm, patterns/jsdoc |
| "config review", "設定レビュー" | config | `reviewing-claude-config/SKILL.md` validation rules |
| "annotation", "アノテーション" | code+annotation | roles/code.md |
| "security", "セキュリティ" | security | criteria/security, patterns/better-auth |
| "test", "テスト" | testing | criteria/testing, patterns/e2e-testing |
| "Next.js", "nextjs" | nextjs | Discover `reviewing-nextjs` via `skills routing reviewing`; fall back to ALL knowledge files if not installed |
| "docs", "ドキュメント" | docs | roles/docs.md |
| "plan", "計画レビュー" | → delegate to `analyze-issue` | — |
| "requirements", "要件レビュー", "要件確認" | → delegate to `analyze-issue` | — |
| "design", "設計レビュー", "デザイン" | → delegate to `analyze-issue` | — |
| "research", "リサーチレビュー" | → delegate to `analyze-issue` | — |

#### `nextjs` Role Dynamic Delegation (`skills routing reviewing` Integration)

When the `nextjs` role is selected, attempt dynamic discovery of `reviewing-*` skills:

```bash
shirokuma-flow skills routing reviewing
```

If a `key: "nextjs"` entry exists in the `routes` array (`reviewing-nextjs` is installed):
- **Delegate via Skill** to `reviewing-nextjs` to execute the review
- Receive the completion report from `reviewing-nextjs` and use this skill's report-saving logic to determine the output destination

If no `key: "nextjs"` entry exists (`shirokuma-nextjs` is not installed):
- Fallback: execute the traditional `nextjs` role processing (load all knowledge files)

Similarly, for other review targets (Drizzle, shadcn/ui, AWS, CDK, etc.), check the `routes` array and delegate to plugin-specific `reviewing-*` skills when available.

#### Multi-Role Auto-Detection

Scan all keywords in the user request. When 2 or more code review roles match, switch to multi-role mode.

**Detection Flow:**

```
User request
  ↓ Scan all keywords
  ↓ Generate list of matched roles
  ↓
  [1 role] → Normal single-role execution
  [2+ roles] → Sequential execution based on role execution order table
```

**Role Execution Order Table:**

| Priority | Role | Reason |
|----------|------|--------|
| 1 | code | Foundation role. Code quality insights benefit other roles |
| 2 | security | Security analysis builds on code structure understanding |
| 3 | testing | Code and security insights inform test perspectives |
| 4 | nextjs | Framework-specific insights |
| 5 | docs | Document analysis is independent of code analysis |
| 6 | code+annotation | Special mode of code |

**Excluded roles:** plan / requirements / design / research have moved to `analyze-issue` and are excluded from multi-role auto-detection in this skill.

**Exclusion rules:**
- `code` and `config` are subject to auto-switching, so when both match, the existing `config` auto-detection logic takes priority (no multi-role).
- `code` and `code+annotation` are mutually exclusive. When both match, `code+annotation` takes priority (it is a superset of `code`).

#### `config` Role Auto-Detection (when `code` role is selected)

When the role resolves to `code`, analyze changed files to auto-determine the review strategy:

```bash
git diff --name-only origin/{base-branch}...HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD
```

Match the file list against the following config file patterns:

| Pattern | Target |
|---------|--------|
| `plugin/**/*.md` | Skill files (SKILL.md), rule files (rules/*.md), agent files (AGENT.md) |
| `plugin/**/*.json` | plugin.json and other config |
| `.claude/**/*.md` | Project-local rules and skills |
| `.claude/**/*.json` | Project-local config |
| `.claude/**/*.yaml` | Project-local YAML config |

| Result | Action |
|--------|--------|
| All files match config file patterns | Switch to `config` role |
| Some or all files do not match | Keep `code` role |
| Cannot retrieve changed files | Fall back to `code` role |
| `config` explicitly specified | Skip file analysis, use `config` role |

### 2. Load Knowledge

Read required knowledge files based on role:

```
1. Auto-loaded: .claude/rules/*.md (based on file paths)
2. Role-specific: roles/{role}.md
3. Criteria: criteria/{relevant}.md
4. Patterns: patterns/{relevant}.md
```

**Note**: Project-specific rules are auto-loaded from `.claude/rules/` - no manual loading needed.

#### 2a. Local Documentation Check (code / security / testing / nextjs roles)

For code review roles (code, security, testing, nextjs), reference locally fetched documentation to improve review accuracy:

```bash
# Check available documentation sources
shirokuma-flow docs detect --format json
```

If `status: "ready"` sources exist, search with keywords related to the tech stack in the code under review:

```bash
shirokuma-flow docs search "<tech keyword>" --source <source-name> --section --limit 3
```

Skip this substep if no local documentation is available (no `ready` sources).

> **Note**: The `--limit 3` here is optimized for review context and takes precedence over the `local-docs-lookup` rule's default (`--limit 5`).

### 3. Run shirokuma-flow Lints (REQUIRED)

**Execute automated checks before manual review. Lint commands vary by role:**

| Role | Lint Commands |
|------|--------------|
| code, code+annotation, nextjs | `lint all` (all types at once) recommended. Individual: lint tests, lint coverage, lint code, lint structure, lint annotations |
| security | lint security, lint code, lint structure (security-related only) |
| testing | lint tests, lint coverage (test-related only) |
| docs | lint docs (document structure only) |
| config | Skip (config files are analyzed using `reviewing-claude-config` validation logic) |
| plan / requirements / design / research | Delegate to `analyze-issue` (these roles are not handled by this skill) |

**code / code+annotation / nextjs roles:**

```bash
# Recommended: run all lints at once
shirokuma-flow lint all -p .

# Individual execution (when only specific lints are needed):
# Test documentation (@testdoc, @skip-reason)
shirokuma-flow lint tests -p . -f terminal

# Implementation-test coverage
shirokuma-flow lint coverage -p . -f summary

# Code structure (Server Actions, annotations)
shirokuma-flow lint code -p . -f terminal

# Project structure (directories, naming)
shirokuma-flow lint structure -p . -f terminal

# Annotation consistency (@usedComponents, @screen)
shirokuma-flow lint annotations -p . -f terminal
```

**docs role:**

```bash
# Document structure validation
shirokuma-flow lint docs -p . -f terminal
```

**Key rules to check:**

| Rule | Description |
|------|-------------|
| `skipped-test-report` | Reports `.skip` tests (ensure `@skip-reason` present) |
| `testdoc-required` | All tests need `@testdoc` |
| `lint coverage` | Source files need corresponding tests |
| `annotation-required` | Server Actions need `@serverAction` |

See project-specific workflow documentation for detailed fix instructions.

### 4. Analyze Code / Plan

**Code roles (code, security, testing, nextjs, docs):**

1. Read target files
2. Apply criteria from loaded knowledge
3. Check against known issues
4. Cross-reference with shirokuma-flow lint results
5. Identify violations and improvements

**Config role:** Reference `reviewing-claude-config/SKILL.md` validation logic (8 checks; see [reference/review-checklist.md](reference/review-checklist.md) for details).

**Artifact Review** (only when prompt contains "Artifact review targets:"): Fetch each `#N` via `issue context`, apply `roles/code.md` "GitHub Document Review Perspectives". See [reference/review-checklist.md](reference/review-checklist.md) for details.

### 5. Generate Report

Use `templates/report.md` format:

1. Summary (**lead with a 1–2 sentence prose overview** — state key findings and overall assessment conclusion-first; include shirokuma-flow lint summary)
2. **Issue Summary** (breakdown table of detected issues by severity)
3. Critical Issues
4. Improvements
5. Best Practices
6. Recommendations

**Issue summary table** (placed immediately after the Summary section): see template in [reference/review-checklist.md](reference/review-checklist.md). If 0 issues are found, state "No issues were detected" and omit the table.

### 6. Save Report

Route the output based on the review context.

#### PR Review (when PR number is in context)

Post review summary as a PR issuecomment (not a review thread comment):

```bash
# Write tool でファイル作成後
shirokuma-flow issue comment {PR#} /tmp/shirokuma-flow/{number}-review-summary.md
```

> **Note**: `issue comment` posts an issuecomment on the PR. These appear in the `issue_comments` section of `pr comments` output, separate from review thread comments.

Only save a detailed report to Discussions when there are many critical issues (severity: error, 5 or more), and link the Discussion URL in the PR comment.

#### File/Directory Review (no PR number)

Create Discussion in Reports category (existing behavior):

```bash
# Prepare a file with title and category set in the frontmatter, then run
shirokuma-flow discussion add /tmp/shirokuma-flow/review-report.md
```

Report the Discussion URL to the user.

#### Routing Summary

| Context | Primary Output | Detailed Report |
|---------|---------------|-----------------|
| PR number specified | PR comment (summary) | Discussion only if 5+ errors |
| File/directory | Discussion (Reports) | — |
| Issue analysis (plan/requirements/design/research) | Delegate to `analyze-issue` | — |

> See `rules/output-destinations.md` for the full output destination policy.

### 7. HTML Report Decision

After saving the report, this skill itself does not generate HTML. It returns **decision information** as structured data to the calling orchestrator (`review-flow`, etc.). For decision criteria, returned fields, and template selection details, see [reference/html-report-decision.md](reference/html-report-decision.md) (canonical: [`html-report-criteria.md`](../../rules/html-report-criteria.md)).

> `auditing-security` is a dependency-vulnerability scanner that completes within Issue creation, so it is outside this decision. `reviewing-security` (PR security review) is always an HTML target.

## Knowledge Update

When user requests `--update`, delegate to knowledge-manager ("ソース更新して"). It updates Next.js/React/Tailwind CSS/Better Auth/OWASP via web search, then redistribute with "配布して".

## Progressive Disclosure

For token efficiency:

1. **Auto-loaded**: `.claude/rules/*.md` (based on the review target's file paths)
2. **On-demand**: Load knowledge files based on role / findings
3. **Minimal output**: Summary first; details on request

## Quick Reference

| Example | Role |
|---------|------|
| `"review lib/actions/"` | code |
| `"security review lib/actions/"` | security |
| `"test review"` | testing |
| `"Next.js review"` | nextjs |
| `"security + code review src/"` | multi-role |
| `"reviewer --update"` | knowledge update |

> Issue analysis (plan/requirements/design/research) has moved to `analyze-issue`.

## Next Steps

When invoked standalone (not via `implement-flow`), suggest the next workflow step after the review:

```
Review complete. If changes were made based on findings:
→ `/commit-issue` to stage and commit your changes
```

## Execution Context

When invoked via Skill tool, this skill runs in the main context with access to project-specific rules from `.claude/rules/`. This enables rule-compliant reviews.

### Progress Reporting

See `reference/progress-report-examples.md` for per-role format examples.

### Error Recovery

If analysis is incomplete:
1. Identify missing coverage
2. Load additional patterns
3. Re-analyze missed areas
4. Update report

## Multi-Role Execution Mode

When multiple roles are requested, the skill runs 7 steps sequentially for each role and posts reports individually.

| Aspect | Normal (Single Role) | Multi-Role |
|--------|---------------------|------------|
| Role Selection | From user request | Auto-detected or caller-specified |
| Execution | Once | Per role, in priority order |
| Report Save | PR/Issue comment | Per role individually |

Progress reporting examples: `reference/progress-report-examples.md` "Multi-Role" section. Earlier-role lint results are available as context for later roles (reports remain independent).

## Notes

- **Reports saved**: PR → PR comment, files → Discussion Reports (`rules/output-destinations.md`)
- **Role-based**: Load only relevant knowledge files (progressive disclosure)
- **Main context execution**: Runs via Skill tool with access to `.claude/rules/`
- **Comment-first**: Posts review comments only, does not update bodies (`item-maintenance.md`)
- **Context boundary**: Do not suggest referencing other skills' `reference/` by file path

## Review Result Expressions

On completion, output a standard verdict so the orchestrator can determine the result. Plan / requirements / design / research roles have moved to `analyze-issue` — see that skill for their verdicts.

### Normal Review Mode (code / security / testing / docs / config roles)

Save the report to GitHub and include one of these verdicts:

- **PASS**: `**Review result:** PASS` — No critical issues
- **FAIL**: `**Review result:** FAIL` — Critical issues found

## Language

Review reports (PR comments, Discussions) must follow the language specified in the `output-language` rule.

## Anti-Patterns

- Avoid modifying code — the reviewer role is to report findings, not implement fixes (mixing both roles dilutes review objectivity)
- Avoid loading all knowledge files at once — role-specific loading keeps context focused and prevents information overload

## Reference Documents

| Directory | Files |
|-----------|-------|
| `criteria/` | [code-quality](criteria/code-quality.md), [coding-conventions](criteria/coding-conventions.md), [security](criteria/security.md), [testing](criteria/testing.md) |
| `patterns/` | [server-actions](patterns/server-actions.md), [server-actions-structure](patterns/server-actions-structure.md), [drizzle-orm](patterns/drizzle-orm.md), [better-auth](patterns/better-auth.md), [e2e-testing](patterns/e2e-testing.md), [tailwind-v4](patterns/tailwind-v4.md), [radix-ui-hydration](patterns/radix-ui-hydration.md), [jsdoc](patterns/jsdoc.md), [nextjs-patterns](patterns/nextjs-patterns.md), [i18n](patterns/i18n.md), [code-quality](patterns/code-quality.md), [account-lockout](patterns/account-lockout.md), [audit-logging](patterns/audit-logging.md), [docs-management](patterns/docs-management.md) |
| `reference/` | [tech-stack](reference/tech-stack.md), [progress-report-examples](reference/progress-report-examples.md), [review-checklist](reference/review-checklist.md), [html-report-decision](reference/html-report-decision.md) |
| `roles/` | [code](roles/code.md), [security](roles/security.md), [testing](roles/testing.md), [nextjs](roles/nextjs.md), [docs](roles/docs.md) |
| `templates/` | [report](templates/report.md) |
| `docs/setup/` | [auth-setup](docs/setup/auth-setup.md), [database-setup](docs/setup/database-setup.md), [infra-setup](docs/setup/infra-setup.md), [project-init](docs/setup/project-init.md), [styling-setup](docs/setup/styling-setup.md) |
| `docs/workflows/` | [annotation-consistency](docs/workflows/annotation-consistency.md), [shirokuma-flow-verification](docs/workflows/shirokuma-flow-verification.md) |

> **Issue analysis skill references**: For plan/requirements/design/research role knowledge files, see the `analyze-issue/` skill.

See the role selection table in Step 1 for per-role file loading.

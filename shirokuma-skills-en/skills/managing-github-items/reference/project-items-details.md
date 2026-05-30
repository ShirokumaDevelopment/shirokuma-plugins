# Project Items Details

Supplementary details for the `project-items` rule. Covers epic status management, built-in automations, labels, item body maintenance, and item creation guidelines.

## Epic Status Management

Epics (`subIssuesSummary.total > 0`) follow these rules:

| Event | Epic Action |
|-------|-------------|
| First sub-issue becomes In Progress | Epic → In Progress |
| Sub-issue PR merged | Epic remains In Progress |
| Final PR: integration → develop merged | Epic → Done |
| Sub-issue blocked | Epic → Blocked (run `block <epic-N> --reason "..."`) |

Epic Done is determined by the final integration branch merge, not by individual sub-issue completions. See `epic-workflow` reference for details.

## Built-in Automations

GitHub Projects V2 provides built-in automation workflows that complement the CLI-based status updates.

### Recommended Automations

| Workflow | Trigger | Action | Status |
|----------|---------|--------|--------|
| Item closed | Issue is closed | Set Status → Done | **Enable** |
| Pull request merged | PR merged | Set Status → Done | **Enable** |

### How to Enable

Built-in automations are configured via the GitHub UI (not API):

1. Navigate to your GitHub Project's **Settings > Workflows**
2. Enable "Item closed" → set target status to **Done**
3. Enable "Pull request merged" → set target status to **Done**

### CLI Compatibility

| CLI Feature | Behavior with Automations |
|-------------|--------------------------|
| `status update-batch --review` | Sets Review. When PR merges, automation moves to Done |
| `status update-batch --review` (PR already merged) | Auto-promotes to Done via `findMergedPrForIssue()` — idempotent with automation |
| `status update-batch --done` | Sets Done directly — idempotent with automation |
| `integrity` | Reports disabled recommended automations as warnings |
| `integrity --fix` | Fixes inconsistencies — compatible with automation |
| `issue cancel` | Sets Done (state_reason: not_planned) after close. Idempotent with "Item closed → Done" automation (Cancelled was unified into Done). |

### Checking Automation Status

```bash
shirokuma-flow project workflows
```

Reports all workflows with their enabled/disabled status and recommendations.

## Labels

Labels indicate **where** work applies (cross-cutting attribute). Work type classification uses Issue Types (Type field).

| Label type | Role | Example |
|------------|------|---------|
| Area labels | Scope of impact | `area:<scope>` (per project) |
| Operational labels | Triage | `duplicate`, `invalid`, `wontfix` |

### Label Rules

1. **Area labels are optional** - Use when the affected area is not obvious from the title
2. **Multiple area labels allowed** - Cross-cutting issues may have multiple areas
3. **Operational labels for triage** - `duplicate`, `invalid`, `wontfix` are set when closing or redirecting

### Label Categories

| Prefix | Purpose | Examples |
|--------|---------|---------|
| `area:` | Codebase area affected | `area:<scope>` (vocabulary per project) |
| (none) | Operational / triage | `duplicate`, `invalid`, `wontfix` |

## Item Body Maintenance (Issues / Discussions / PRs)

**Body = latest payload, comments = Why & history** (What/Why Separation). The single source of truth for the principle is the "What/Why Separation" section of the `project-items` rule; for implementer-facing procedures, see `managing-github-items/reference/item-maintenance.md`.

> **Comment-first** (the update order of What/Why Separation): Always post a comment before updating the body. See the "What/Why Separation" section of the `project-items` rule for details.

Comment operation CLI commands:

| Operation | Command | Notes |
|-----------|---------|-------|
| Add comment | `issue comment {number} {file}` | Works for Issues and PRs/Discussions, auto-saves to cache |
| List comments | `issue comments {number}` | JSON output |
| Edit comment | `issue update {number} --comment-id {comment-id} {file}` | Write file → update workflow |

## Creating Items

When creating new items:

1. Set all required fields immediately
2. Use the body template
3. XL items should be split into smaller items
4. Link related items in body if applicable

### Initial Status Guidelines

`issue add` automatically sets Status to **In progress** by default. Override with `status` frontmatter field when needed:

| Scenario | Status |
|----------|--------|
| Default (planned work) | In progress |
| Awaiting start / backlog | ToDo |
| Low priority / future idea | ToDo |
| Needs requirements review | Review |

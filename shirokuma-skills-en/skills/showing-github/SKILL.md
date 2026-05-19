---
name: showing-github
description: Displays GitHub project data including dashboard, items, issues, PRs, and specs. Triggers: "dashboard", "show items", "show issues", "show PRs", "show specs", "project status".
allowed-tools: Bash, Read, Glob
---

# Showing GitHub

Display GitHub project data. Consolidates dashboard, items, issues, PRs, and specs into one skill.

> **Reference**: See `reference/github-operations.md` for CLI commands, Status Workflow, and error handling.

## /show-dashboard

Full project dashboard aggregating GitHub data.

```
/show-dashboard              # Full dashboard
/show-dashboard --quick      # Quick summary only
```

### Workflow

1. Get repository info: `shirokuma-flow repo info` (always JSON output; refer to `full_name` field)
2. Run in parallel:
   - `shirokuma-flow issue list` (default `--format table-json` returns `{repository, total_count, columns, rows}`. Derive open issue count from `total_count`, group `rows` by the Status column)
   - `shirokuma-flow pr list` (default `--format table-json` returns `{repository, total_count, columns, rows}`. Derive PR count from `total_count`)
   - `gh api repos/{owner}/{repo}/commits?per_page=5` (recent commits)

### Display Format

```markdown
# Project Dashboard

**Repository:** {owner}/{repo}
**Generated:** {timestamp}

## Project Items
| Status | Count | Bar |
|--------|-------|-----|
| In progress | 1 | ██ |
| ToDo | 2 | ████ |

**Total:** {total} | **Completion:** {done/total * 100}%

## Activity
| Metric | Count |
|--------|-------|
| Open Issues | {count} |
| Open PRs | {count} |
| Commits (7d) | {count} |
```

### Quick Mode (--quick)

```markdown
## Quick Status
**Items:** 6 Done / 1 In progress / 2 ToDo
**Issues:** 3 open | **PRs:** 1 open
**Last commit:** {message} ({time ago})
```

---

## /show-items [filter]

GitHub Project items with Status filter.

```
/show-items              # Active items (excludes Done)
/show-items all          # All items including Done
/show-items backlog      # Items with "ToDo" status (formerly Backlog)
/show-items in-progress  # Items with "In progress" status
/show-items review       # Items with "Review" status
/show-items blocked      # Items with "Blocked" status
```

### Workflow

```bash
# Default (open issues)
shirokuma-flow issue list

# With filter
shirokuma-flow issue list --all
shirokuma-flow issue list --status ToDo
shirokuma-flow issue list --status "In progress" --status Review
```

### Display Format (Grouped View)

```markdown
## Project Items

**In progress (1):**
- #9 Task title (XL, Medium)

**ToDo (2):**
- #10 Feature A (M, High)
- #8 Future enhancement (L, Low)

**Review (1):**
- #11 Refactor module (S, Medium)

---
Total: 4 active items
```

### Filtered View

```markdown
## ToDo Items (2)
| # | Title | Priority | Size |
|---|-------|----------|------|
| #10 | Feature A | High | M |
```

---

## /show-issues [--label X] [--assignee X]

GitHub Issues list with filtering.

```
/show-issues                 # All open issues
/show-issues --all           # Include closed
/show-issues --label bug     # Filter by label
/show-issues --assignee @me  # My issues
```

### Workflow

```bash
shirokuma-flow issue list --format json
```

### Display Format

```markdown
## Issues

**Filter:** {description} | **Total:** {count}

| # | Title | Labels | Assignee | Updated |
|---|-------|--------|----------|---------|
| #123 | Fix login bug | `bug` | @user | 2d ago |
```

---

## /show-prs [filter|number]

PR list and details.

```
/show-prs                  # Open PRs list
/show-prs --state closed   # Closed PRs
/show-prs --state merged   # Merged PRs
/show-prs --state all      # All PRs
/show-prs 42               # Specific PR details
```

### Workflow

**List view:**

```bash
# Default (open PRs)
shirokuma-flow pr list

# With filters
shirokuma-flow pr list --state merged --limit 10
shirokuma-flow pr list --state all
```

**Detail view:**

```bash
shirokuma-flow pr show {number}
```

### Display Format (List)

```markdown
## Pull Requests

**Filter:** {description} | **Total:** {count}

| # | Title | Branch | Review |
|---|-------|--------|--------|
| #42 | feat: Add new feature | feat/42-new-feature | APPROVED |
```

### Display Format (Detail)

```markdown
## PR #{number}: {title}

**Status:** {state} | **Review:** {review_decision}
**Branch:** {head} → {base}

### Summary
{body}

### Change Stats
| File | Additions | Deletions |
|------|-----------|-----------|
| src/file.ts | +50 | -10 |

### Linked Issues
- #42 (Closes)
```

---

## /show-specs [--recent] ["keyword"]

Spec Discussions from Ideas category.

```
/show-specs              # All specs
/show-specs --recent     # Last 5
/show-specs "keyword"    # Search
```

### Workflow

```bash
gh api graphql -f query='{
  repository(owner: "{owner}", name: "{repo}") {
    discussions(first: 20, categoryId: "{ideas_id}", orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { number title createdAt author { login } comments { totalCount } url }
    }
  }
}'
```

### Display Format

```markdown
## Specifications

| # | Title | Author | Comments | Created |
|---|-------|--------|----------|---------|
| #10 | [Spec] Auth Flow | @user | 5 | 1w ago |
```

### Status Indicators

```
ToDo | In progress | Review | Blocked | Done
```

---

## Error Handling

| Error | Action |
|-------|--------|
| No project found | Show only Issues/PRs/Commits |
| No items match filter | "No items with status '{filter}'. Try `/show-items`." |
| No Discussions/category | Check local files or skip gracefully |
| No specs found | "No specs found. Create one with `/create-spec`." |
| gh not authenticated | Prompt: `gh auth login` |

## Reference Documents

### Skill Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [reference/github-operations.md](reference/github-operations.md) | GitHub CLI commands and status workflow | All subcommands |

## Batch Candidates in /show-items

When displaying project items via `/show-items`, add a batch candidate section after the grouped view.

### Detection

1. From the issue list, filter: Status = ToDo, Size = XS or S
2. Group by `area:*` label (primary) or title keyword similarity (fallback: 2+ common nouns)
3. Show groups with 3+ issues, max 3 groups

### Display

```markdown
### Batch Candidates
| Group | Issues | Area |
|-------|--------|------|
| Plugin fixes | #101, #102, #105 | area:plugin |
| CLI improvements | #110, #112, #115 | area:cli |

Batch processing: `/implement-flow #101 #102 #105`
```

If no batch candidates found, omit this section.

## Notes

- All data fetched on-demand (not cached)
- Items sorted by Priority within each status
- Specs stored in "Ideas" category by convention
- When the request is ambiguous, use AskUserQuestion to confirm which subcommand (dashboard/items/issues/prs/specs)
- This is a display-only task; Tasks API is not needed

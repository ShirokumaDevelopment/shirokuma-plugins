---
scope: default
category: shirokuma-flow
priority: required
---

# shirokuma-flow CLI Invocation

## Direct Call (No npx)

`shirokuma-flow` is installed globally. Always call it directly:

```bash
# Correct
shirokuma-flow dashboard
shirokuma-flow issue list
shirokuma-flow lint tests -p .

# Wrong - unnecessary overhead
npx shirokuma-flow dashboard
```

## Prohibited Commands (Covered by CLI)

The following commands are handled internally by the `shirokuma-flow` CLI. Direct use is prohibited.

| Prohibited Command | CLI Alternative |
|-------------------|----------------|
| `gh issue list`, `gh issue view`, `gh issue create` | `shirokuma-flow issue list`, `issue context {number}`, `issue add` |
| `gh issue comment` | `shirokuma-flow issue comment {number} {file}` |
| `gh issue edit` | `shirokuma-flow issue update {number}` / `status transition {number} --to <status>` |
| `gh issue close` | `shirokuma-flow issue close {number}` |
| `gh pr create`, `gh pr view`, `gh pr list` | `shirokuma-flow pr create`, `pr show`, `pr list` |
| `gh pr review`, `gh api .../pulls/.../comments` | `shirokuma-flow pr comments`, `pr reply`, `pr resolve` |
| `gh project item-list`, `gh project field-list` | `shirokuma-flow issue list`, `issue fields` (`project list/fields` deprecated) |
| `gh api .../discussions` | `shirokuma-flow discussion list`, `discussion search` |
| `gh search issues` | `shirokuma-flow issue search` |
| `gh search issues --include-prs` | `shirokuma-flow issue search --type issues` |
| Discussions cross-search | `shirokuma-flow issue search --type discussions` |
| Issues + Discussions cross-search | `shirokuma-flow issue search --type issues,discussions` |

### Common Mistake Patterns

```bash
# NG: raw gh commands
gh issue view 42
gh pr create --base develop --title "..."

# OK: shirokuma-flow CLI
shirokuma-flow issue context 42
shirokuma-flow pr create --from-file /tmp/shirokuma-flow/pr.md
```

**Exception**: Operations not covered by the `shirokuma-flow` CLI (e.g., `gh repo view` for repository metadata) may use `gh` directly.

## Verbose Option

Default output is minimal (errors, warnings, success messages only). Progress logs and detailed info are suppressed.

- **Do not** use `--verbose` in AI workflows — it increases context window consumption
- `--verbose` is for human debugging only

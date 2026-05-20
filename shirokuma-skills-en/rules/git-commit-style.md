---
scope: default
category: general
priority: required
---

# Git Commit Style

## Commit Message Format

```
{type}: {description} (#{issue-number})

{optional body}
```

## Conventional Commit Types

| Type | When |
|------|------|
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `chore` | Config, tooling, dependencies |

## Rules

1. **First line under 72 characters** — `lint workflow`'s `commit-format` flags violations at info level (past violations occurred). Keep the subject as a summary; push issue numbers, sub-issues, and scope details into the body
2. **Reference issue number** when applicable: `(#39)`
3. **Imperative mood** in description: "add feature" not "added feature"
4. **Body is optional** - Use for complex changes that need explanation
5. **Blank line** between subject and body

### Rewriting subjects that exceed 72 characters

| Bad (over) | Good (≤ 72) |
|-----------|-------------|
| `feat(skill): writing-html-explainer adds remaining 5 html-effectiveness parts (decision-card / triage-board / artboard / flag / card-titles) + ?v=12 bump (#N)` (160 chars) | `feat(skill): add 5 html-effectiveness parts (#N)` (52 chars) + body with detail |
| `chore(pages): update submodule pointer (rewrite §5.3 to .milestone-timeline) (#N)` (84 chars) | `chore(pages): bump submodule (§5.3 → milestone-timeline) (#N)` (62 chars) |

### Pre-commit self-check

```bash
# Check subject length (in characters)
git log -1 --format=%s | wc -m
```

Confirm the output is 73 or fewer (72 chars + 1 newline from `wc -m`) before pushing.

## Examples

```
feat: add branch workflow rules (#39)

fix: pass repo name to getProjectId for cross-repo support (#34)

refactor: separate marketplace and plugin directory structure (#27)

chore: update dependencies
```

## Code Language

| Element | Language |
|---------|----------|
| Code / Variable names | English |
| Comments / JSDoc / TSDoc | English |
| Commit messages | English (conventional commits format) |
| CLI output messages | Per i18n dictionary (`i18n/cli/`) |

## Notes

- Include `Signed-off-by` lines only when explicitly required by the project
- Avoid `--no-verify`; fix the root cause of hook failures instead (bypassing hooks skips CI quality checks)
- Use amend only when explicitly asked by the user (prevents unintended history rewrites)
- Force push only for dedicated use cases outside the base branch (force pushing to the base branch destroys teammates' work)

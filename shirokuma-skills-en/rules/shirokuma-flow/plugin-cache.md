---
scope:
  - main
category: shirokuma-flow
priority: required
---

# Plugin Cache Management

## Architecture

Claude Code loads skills from the **global cache**, not the project directory. Plugins are distributed via the `shirokuma-plugins` marketplace repository.

```
ShirokumaLibrary/shirokuma-plugins (marketplace repo)
    ↓ claude plugin install/update
~/.claude/plugins/cache/shirokuma-library/...  (global cache — Claude Code reads from here)
    ↓ shirokuma-flow init / update
.claude/rules/shirokuma/  (deployed rules — project-local, gitignored)
```

**Key change (#486):** The project-local `.claude/plugins/` directory is no longer used. Plugins are fetched directly from the marketplace to the global cache.

## Recommended: `shirokuma-flow update`

`shirokuma-flow update` updates the global cache and redeploys rules in one command. The `--sync` flag is enabled by default. It also accepts `--with-rules` and other options (formerly available via `update-skills`).

```bash
# Recommended
shirokuma-flow update

# With additional options
shirokuma-flow update --sync --with-rules
```

## Initial Setup

`shirokuma-flow init --with-skills` automatically:
1. Registers the marketplace (`claude plugin marketplace add`)
2. Installs plugins to global cache (`claude plugin install`)
3. Deploys rules to `.claude/rules/shirokuma/`

## Manual Cache Operations

```bash
# Update plugin to latest version
claude plugin update shirokuma-skills-en@shirokuma-library --scope project

# Force reinstall (same version but updated content)
claude plugin uninstall shirokuma-skills-en@shirokuma-library --scope project
claude plugin install shirokuma-skills-en@shirokuma-library --scope project
```

A new session is required after cache update for skills to appear.

## Cache Hygiene

`shirokuma-flow update` automatically handles:

- **Old cache version cleanup**: Keeps the latest 3 versions (`keepCount = 3`), removes older directories
- **Semver sorting**: Resolves version directories by semver order (numeric comparison, not lexicographic)
- **Marketplace source check**: Detects `Source: Directory` (local reference) and auto-re-registers as `Source: GitHub` (fresh clone)
- **`local/` directory exclusion**: The `local/` directory is used for local installations (`plugin install-local`) and is not a semver version, so it is excluded from version sorting and cleanup

## When to Guide the User

| Symptom | Cause | Action |
|---------|-------|--------|
| New skill not in skill list | Cache not updated | `shirokuma-flow update` or `claude plugin uninstall` + `install` |
| `plugin update` says "already at latest" | Same version number | Use uninstall + install instead |
| Skill works in one project but not another | Plugin scope mismatch | Check `--scope` (user vs project) |
| `.claude/plugins/` directory still exists | Legacy installation | `shirokuma-flow update` will auto-cleanup |
| `disable` / `uninstall` scope mismatch error | Plugin installed with `--scope project` | Use `--scope project` explicitly, or omit `--scope` for auto-detect |
| Marketplace registered as `Source: Directory` | Stale local reference | `shirokuma-flow update` will auto-re-register, or manually: `claude plugin marketplace remove shirokuma-library` → `claude plugin marketplace add ShirokumaLibrary/shirokuma-plugins` |

## Rules

1. **Never write directly to the global cache** — use `claude plugin` commands
2. **Use `shirokuma-flow update`** — updates cache + redeploys rules in one command
3. **Version-same updates require uninstall + install** — `plugin update` skips when version unchanged
4. **`.claude/plugins/` is legacy** — if present, `shirokuma-flow update` will clean it up automatically
5. **Cache cleanup is automatic** — `shirokuma-flow update` removes old versions (keeps latest 3)

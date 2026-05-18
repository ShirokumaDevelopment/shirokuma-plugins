---
name: starting-session
description: Conversation initialization skill that loads default rules at the start of a new conversation. Triggers: "start session", "begin work", "session start", "initialize conversation", "init session".
allowed-tools: Bash
---

!`shirokuma-flow rules inject --scope main`

# Conversation Initialization

Load the project's default rules at the start of a new conversation.

If `#N` is provided, route to `implement-flow #N`. Otherwise output nothing.

## Issue-Bound Mode

When invoked as `/starting-session #N`:

```
Skill: implement-flow
Args: #{N}
```

## Notes

- For project state (open issues, PRs, batch candidates, evolution signals), use `/show-dashboard` (`showing-github` skill) explicitly.
- For PreCompact backup recovery, inspect `shirokuma-flow dashboard` output (`backups` field).
- This skill performs no GitHub queries on its own — keep it minimal.

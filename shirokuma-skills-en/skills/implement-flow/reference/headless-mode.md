# Headless Mode Details

When `--headless` is specified, default behaviors are applied to implementation-phase UCPs (User Control Points), completing the chain without interactive confirmations. Use for batch execution via `claude -p` or to skip confirmations within an interactive session.

## Preconditions

All of the following must be met to run in headless mode:

1. An **explicit issue number** is provided as an argument
2. The issue status is **Review** or **ToDo**
   - plan/design Issue: **ToDo** is required (must be approved first via `approve` (`Review → Done`); Review status will stop with a precondition error)
   - Normal Issue: **Review** is required
3. A plan issue (child issue with title starting with "Plan:" or "計画:") exists

If any precondition is not met, display an error message and stop (no fallback to normal mode).

> **Note:** Issues with statuses other than Review or ToDo (e.g., In progress, Blocked) will also stop with a precondition error when `--headless` is specified. Issues in In progress status (planning phase) require interactive planning via `prepare-flow` and are therefore excluded from headless mode. Also, plan/design Issues in Review status will stop with a precondition error — explicit approval via `status approve` (`Review → Done`; `syncParentStatus` auto-syncs parent `Backlog → ToDo`) must be completed first.

## UCP Default Behaviors

| UCP ID | Location | Normal Mode | Headless Mode Default |
|--------|----------|-------------|----------------------|
| W1 | No-argument invocation | AskUserQuestion for number | Stop with precondition error |
| W2 | Issue is Done | Confirm reopen | Warn and stop (prevent accidental execution) |
| W3 | ADR proposal (Feature M+) | AskUserQuestion for confirmation | Skip (continue without ADR) |
| W4 | Wrong branch detected | AskUserQuestion for switch | Warn and stop (highest risk) |
| W5 | Worker's ucp_required flag | AskUserQuestion with suggestions | Skip and record in Issue comment |

### W5 Skip Recording in Issue Comment

When W5 (worker UCP) is skipped in headless mode, record it as an Issue comment in the following format:

```
**[Headless] UCP Skipped:** {worker name}
**Suggestion:** {summary of skipped suggestion}
**Default action:** Skipped and continued
```

## Usage Examples

```bash
# Batch execution via claude -p
claude -p "/implement-flow --headless #42"

# Skip confirmations within interactive session
/implement-flow #42 --headless
```

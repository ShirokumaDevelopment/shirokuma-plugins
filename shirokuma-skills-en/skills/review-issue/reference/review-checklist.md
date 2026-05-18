# Review Checklist Details

## Config Role: Config File Validation Logic

Reference the validation logic in `reviewing-claude-config/SKILL.md` and check the changed config files for:

1. Temporary markers (`TODO:`, `FIXME:`, `WIP`, `TBD`, `DRAFT`, `PLACEHOLDER`, `XXX:`, `**NEW**`)
2. Broken internal links (verify referenced files exist)
3. Required frontmatter fields (skills: `name`, `description`; agents: `name`, `description`)
4. Trigger keywords present in `description`
5. File length check (SKILL.md over 500 lines is Warning)
6. `plugin.json` version consistency (match against `package.json`)
7. Manual date stamps
8. ASCII art diagrams

## Artifact Review

Only when prompt contains "Artifact review targets:" or "成果物レビュー対象:" in a PR context.

For each `#N` listed in the section:

1. Fetch via `shirokuma-flow issue context {N}` and read `.shirokuma/github/{org}/{repo}/issues/{N}/body.md`
2. Apply "GitHub Document Review Perspectives" from `roles/code.md`:
   - Format compliance (format appropriate for the Discussion category)
   - YAML frontmatter leakage check
   - Cross-reference consistency
   - Consistency with codebase
   - Terminology consistency
3. Append artifact review results to the main code review report

This substep is skipped when neither section is present (backward compatibility preserved).

## Issue Summary Table Template

```markdown
### Issue Summary
| Severity | Count |
|----------|-------|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |
| **Total** | **{n}** |
```

If 0 issues are found, state "No issues were detected" and omit the table.

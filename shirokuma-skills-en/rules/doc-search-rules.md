---
paths:
  - "**/skills/issue-flow/**/*.md"
  - "**/skills/requirements-flow/**/*.md"
# Scope note: This rule defines the auto-discovery logic for canonical docs / ADRs / related issues.
# It is shared between issue-flow (Issue / Discussion creation) and requirements-flow
# (ADR / spec Discussion creation), so we use a paths scope that loads only when editing these skills.
---

# Canonical Doc / ADR Auto-Discovery Rules

Defines the shared logic for auto-discovering related canonical docs, ADRs, and existing issues during item creation, and embedding them as a `## Related References` section in the body.

## Applicable Skills

| Skill | Step | Output target |
|-------|------|--------------|
| `issue-flow` | Step 1c | Issue body (between `## Purpose` and `## Summary`) |
| `requirements-flow` | Step 2 extension | Discussion body (placement depends on ADR / spec template) |

## Design Principles

1. **Start simple (YAGNI)**: Begin with the simple case (use the title's noun phrases as-is). Consider escalating only if hit rate is poor
2. **Fail-safe**: Zero results do not raise errors — skip the section and proceed
3. **Reader-first**: Place discovered references near the top of the body so reviewers without context can prime themselves
4. **Precision over redundancy**: Filter aggressively when more than 5 issues / ADRs match (avoid noise)

## Search Targets and Commands

| Category | Search method | Top N | Output sub-section |
|----------|--------------|-------|-------------------|
| Canonical docs | `grep -l "<keyword>" -r guide/ docs/specs/ CLAUDE.md` → Read relevant excerpts | Up to 5 (key passages only) | `### Canonical Documents` |
| ADR (Accepted) | `shirokuma-flow discussion adr list` → match titles / bodies by keyword | 3-5 | `### Related ADRs (Accepted)` |
| Existing issues / PRs / Discussions | `shirokuma-flow issue search "<keyword>" --limit 5` | Up to 5 | `### Related Existing Issues / PRs` |

## Keyword Generation

### Simple Case (default)

Extract from the title in this priority order:

1. **Use the entire title as one query** (`issue search` is full-text)
2. Split the title into **noun phrases** (including compounds) and use each as an individual query

#### Japanese Title Fallback Splitting

Skip morphological analysis; use these simple rules:

- **Delimiters**: spaces, punctuation, brackets (`（）「」『』 ・,.:;`)
- **Length filter**: keep tokens of 2+ characters (drop 1-character tokens)
- **Minimal stop-word removal**: drop only `する`, `した`, `など`, `こと`, `もの` (do not over-filter)

#### Examples

| Input title | Tokens (candidate keywords) |
|-------------|----------------------------|
| `feat(skill): issue-flow に正本ドキュメント・ADR 自動探索ステップを追加` | `issue-flow`, `正本ドキュメント`, `ADR`, `自動探索`, `ステップ`, `追加` |
| `fix: Review 遷移仕様乖離を解消` | `Review`, `遷移仕様`, `乖離`, `解消` |
| `chore: 依存パッケージを更新` | `依存パッケージ`, `更新` |

### Degradation Signals (rule-revisit triggers)

When any of the following occur, treat the simple case as insufficient and propose a rule revision:

- **3 consecutive zero-hit runs**: 3 runs in a row return 0 hits across all categories → consider adding stop words / introducing morphological analysis
- **Hit-rate skew**: every category returns 10+ hits every run (noise overload) → consider tf-idf-style weighting
- **Synonym misses**: synonyms like "Issue" / "課題", "Plan" / "計画" cause noticeable misses → consider adding a synonym dictionary as a supplementary reference

Record these signals as Issue comments or as Evolution Issues (evaluate after accumulation).

## Embedding into the Body

### Placement (per skill)

| Skill / Type | Placement |
|--------------|-----------|
| `issue-flow` (Issue / Discussion) | Between `## Purpose` and `## Summary` |
| `requirements-flow` (ADR) | Between `## Status` and `## Context` |
| `requirements-flow` (spec Discussion) | Between `## Purpose` and `## Summary` (same as issue-flow) |

### Common Template

```markdown
## Related References

> **Purpose of this section**: list related canonical docs, ADRs, and prior issues at the top so readers can prime themselves with the prerequisite context.

### Canonical Documents
| Document | Relevant section | Relation to this issue / ADR / spec |
|----------|------------------|------------------------------------|
| ... | ... | ... |

### Related ADRs (Accepted)
| ADR | Number | Relation |
|-----|--------|----------|
| ... | ... | ... |

### Related Existing Issues / PRs / Discussions
| Number | State | Relation |
|--------|-------|----------|
| ... | ... | ... |
```

### Sub-section Skip Rules

| State | Behavior |
|-------|----------|
| One category has 0 hits | Skip only that sub-section |
| All categories have 0 hits | Skip the entire `## Related References` section |

When the section is skipped, the body falls back to the conventional template structure.

## Filters / Limits

### Count Limits

- **Canonical docs**: up to 5 files (pick the most relevant if there are too many)
- **ADRs**: 3-5 (Accepted only; exclude Deprecated / Superseded)
- **Issues / PRs / Discussions**: up to 5 (Open + the most recent merged/closed within ~6 months)

### Excerpt Format for Canonical Docs

In the "Relevant section" column, write a line range plus a short summary. Avoid long verbatim quotes (they bloat the body).

```
| `guide/<doc>.md` | Relevant section L<start>-<end> | Relation to this issue / ADR |
```

## Boundary with `analyze-issue requirements` (when applied via issue-flow)

Pre-creation discovery (this rule) and `analyze-issue requirements`'s project-requirement-consistency check (post-creation verification) play **complementary roles separated by time and purpose**. Do not merge them; preserve both.

| Aspect | Pre-creation discovery (this rule) | `analyze-issue requirements` |
|--------|----------------------------------|----------------------------|
| Timing | **Before** item creation | **After** item creation |
| Goal | Embed comprehensive references in the body | Verify ADR consistency and judge PASS / NEEDS_REVISION |
| Output target | `## Related References` in the body | Issue comment |
| Failure mode | Skip section on 0 hits (fail-safe) | Loop revisions on NEEDS_REVISION |

## Integration with `requirements-flow` Existing Step 2

`requirements-flow` SKILL.md step 2 ("Verify against existing ADRs / specs for duplicates and conflicts") already performs similar searches. This rule **extends** step 2:

1. Format step 2's search results as a `## Related References` section in the Discussion body
2. Skip a sub-section when its category returns 0 hits
3. Skip the entire `## Related References` section when all categories return 0 hits

This allows "duplicate / conflict checking" and "reviewer context priming" to share the same search results.

## Future Extension to `design-flow`

`design-flow` would also benefit from the same context discovery when creating Design Briefs / Aesthetic Directions. Extending this rule's `paths` to include design-flow is a lightweight change; defer to a separate follow-up issue.

# ADR Filter Logic Specification

Defines the ADR filtering method used by `analyze-issue requirements` when performing Project Requirement Consistency checks.

## Overview

**Confirmed method:** Extract 3-5 keywords from the Issue title and `##`-level headings → Use `shirokuma-flow discussion search "<keywords>"` for initial filtering → Retrieve details for up to 5 results (`discussion adr get {number}`)

```bash
# Initial filtering
shirokuma-flow discussion search "<extracted keywords>"

# Retrieve details (top 5)
shirokuma-flow discussion adr get {number}
```

## Keyword Extraction Rules

### Extraction Targets

- Nouns and proper nouns in the Issue title
- Nouns and proper nouns in `##`-level headings in the body

### Stop Words to Exclude

Exclude the following generic terms:

- Generic verbs: "add", "fix", "handle", "implement", "change", "update", "create", "delete"
- Generic nouns: "project", "feature", "process", "target", "method", "approach", "content", "configuration"

### Priority Order (when more than 3-5 candidates exist)

1. First word(s) in the title
2. Heading words
3. Body keywords

### Label Supplementation

Add the value portion of `area:*` labels as additional keywords (e.g., `area:<scope>` → `<scope>`).

## Fallback

When search returns zero results:

```bash
shirokuma-flow discussion adr list
```

Retrieve the full list of ADR titles and switch to lightweight title-only reference (do not retrieve body details).

## Upper Limit

- Retrieve details for a maximum of 5 results
- When more than 5 results hit: narrow down to top 5 by relevance score (title match priority)

## Exclusion Conditions

Exclude ADRs with Superseded/Deprecated status from filtered results.

**Exception:** For the "re-adoption check" (check item 3), review Superseded ADRs separately:

```bash
# Search including Deprecated/Superseded ADRs (for re-adoption check only)
shirokuma-flow discussion search "<keyword>"
# → Identify entries with "Deprecated" or "Superseded" in the title and review them
```

## Execution Example

Issue title: "Change the storage method for auth tokens"
Labels: `area:auth`

1. Keyword extraction: "authentication", "token", "storage method", "auth" (4 items)
2. Search: `shirokuma-flow discussion search "authentication token"`
3. Hits: ADR-003 (auth architecture), ADR-007 (data storage policy) → prioritize ADR-003
4. Detail retrieval: `shirokuma-flow discussion adr get {ADR-003 discussion number}`
5. Consistency check: Compare ADR-003 content with the Issue's direction

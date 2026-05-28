---
scope:
  - main
  - coding-worker
category: documentation
priority: recommended
---

# Document Placement Rules (docs-layering)

Criteria for deciding where to place new documents, rules, skills, and ADRs.

## Three-Layer Placement Model

| Category | Location | Reason |
|---------|----------|--------|
| Workflow-driving rules (always needed) | `CLAUDE.md` (index format) | LLM loads every session. Keep to minimum |
| Code-synchronized reference | `.shirokuma/rules/{project}/` | Update in same commit as code changes |
| Plugin-distributed rules (generic, AI-facing) | `plugin/shirokuma-skills-{en,ja}/rules/` | Deployed by `init`, AI references at runtime |
| Human-facing explanations / tutorials | `docs/` | For humans. AI does not normally reference |
| Skill / rule / workflow specification | `pages/specs/{slug}/index.html` (in the `pages/` submodule) | HTML is the single source of truth; design rationale and evaluation criteria live here too |
| Architectural decisions / discussion log (ADR) | GitHub Discussion (ADR category) | Persistent decision records |
| Temporary plans / TODOs | Issue body | Ephemeral. Disappears when the issue closes |

## Decision Flow

Answer these questions before creating a new document:

```
Q1: Is it tightly coupled to code (needs updating whenever code changes)?
  → YES: Place in .shirokuma/rules/{project}/

Q2: Does the LLM need to reference it on every workflow run?
  → YES: Add as an index entry in CLAUDE.md (body goes in a separate file)
  → NO, but generic knowledge AI can reference optionally: place in plugin/shirokuma-skills-{en,ja}/rules/

Q3: Is it recording an architectural decision?
  → YES: Create in GitHub Discussion (ADR category) using the write-adr skill

Q4: Is it a temporary plan or TODO?
  → YES: Write in the Issue body (do not put in docs/ or rules)

Q5: Does it record design background or evaluation criteria for a skill, rule, or workflow?
  → YES: Place in pages/specs/{slug}/index.html (when the project has a pages/ submodule) or an equivalent specification location, written as HTML/Markdown

Q6: Is it a human-readable explanation or tutorial?
  → YES: Place in docs/
```

## Boundary Cases (Concrete Examples)

### 1. Reference (code-synchronized) vs Tutorial (human-facing)

**Reference**: e.g., subcommand list and option definitions from a CLI command implementation. Must update when code changes → `.shirokuma/rules/{project}/command-reference.md`

**Tutorial**: e.g., a how-to guide for "using feature X". Human-facing explanation that does not depend on code → `guide/`

### 2. Project Rule vs Plugin Rule

**Project rule** (`.shirokuma/rules/{project}/`): Implementation details specific to that project (internal command behavior, schema definitions, etc.). Meaningless in other projects.

**Plugin rule** (`plugin/shirokuma-skills-{en,ja}/rules/`): Generic practices (commit style, how to write ADRs, etc.). Deployable via `init` to other projects.

**Deciding factor**: "Would this be useful in other projects?" → YES = plugin rule, NO = project rule.

### 3. Skill Spec (`pages/specs/`) vs SKILL.md

**SKILL.md**: The "work procedure" the AI reads when executing a skill. Strictly under 500 lines.

**pages/specs/{slug}/index.html**: HTML specification page recording design rationale, alternatives considered, and evaluation criteria. Not needed at runtime; humans reference it when improving the skill.

**Deciding factor**: "Does the AI need this to execute the skill?" → YES = SKILL.md, NO = pages/specs/ (when the project uses a pages/ submodule) or an equivalent specification location

### 4. ADR (GitHub Discussion) vs Reference Doc

**ADR**: Records "why X was chosen" — the reasoning and context behind a decision. Persisted as a Discussion. Changes are made by superseding with a new ADR.

**Reference doc**: "How to use/configure X" — implementation knowledge. Updated in sync with code changes.

**Deciding factor**: "Is this preserving the reason behind a past decision?" → YES = ADR.

### 5. Temporary Plan (Issue Body) vs Reference Doc

**Issue body**: Sprint plan, step-by-step task procedure, temporary TODO list. Disappears when the issue closes.

**Reference doc**: Procedures, conventions, and constraints referenced repeatedly. Remains valid after the issue closes.

**Deciding factor**: "Will this still have reference value after the task completes?" → YES = extract to a reference doc.

### 6. Dev-Environment-Specific Rules (out of plugin scope)

**Examples**: Build procedures, dev/release switch scripts, local environment setup instructions.

**Location**: Repository-specific dev-environment knowledge is out of scope for this generic rule. Each project defines its own **project-specific layout convention** (e.g. via a project's `.claude/rules/` and `.shirokuma/rules/{project}/docs-layout.md`).

**Deciding factor**: "Is this valuable for other projects?" → NO = project-specific convention. This generic rule only handles decision criteria that apply across projects.

## New File Creation Checklist

- [ ] Determined the location using the decision flow above
- [ ] Rule added under `plugin/` → also updated `rules-index.md`
- [ ] Rule added under `.shirokuma/rules/{project}/` → added to the rule table in CLAUDE.md (if needed)
- [ ] Recording as an ADR → used the `write-adr` skill
- [ ] SKILL.md approaching 500 lines → moved design rationale and alternatives to `pages/specs/{slug}/index.html` (or an equivalent specification location)
- [ ] Plugin rule → created the same content (translated) in both EN and JA

## Related Rules

| Rule | Responsibility Division |
|------|------------------------|
| `skill-authoring.md` | Naming and language guidelines for skill authoring (generic) |

Projects may add complementary rules under `.shirokuma/rules/{project}/` (e.g. `rule-maintenance`, `spec-modification-policy`, `skill-authoring-quality`). This rule only governs **placement decisions** — maintenance and quality conventions for already-placed docs are left to project-specific layout conventions.

---
name: writing-html-explainer
description: Write detailed explainers, concept docs, and design reviews as HTML rather than Markdown. Uses a custom template (warm palette + rounded sans-serif + dark mode) to produce a single page that can be self-hosted via Docker nginx + cloudflared named tunnel. Triggers: "write a rich HTML doc", "HTML explainer", "Pages document", "concept explainer HTML", "detailed explainer page", "rich doc HTML", "explainer HTML".
allowed-tools: Read, Write, Edit, Bash
---

# HTML Explainer Authoring

**Scope:** Mutation worker — generates and updates HTML / CSS / JS files and reflects them into the `pages/` submodule. Delegates commits and pushes to `commit-issue`.

Produce a single HTML page for **long-form explainers, design reviews, and concept discussions** that Markdown cannot express well. Paste the URL into Issue / Discussion / PR bodies to get a **browser-viewable** detailed document.

## When to Use

| Situation | Example |
|-----------|---------|
| You want to thoroughly explain a design concept | "shirokuma-flow's collaborative phase model" |
| Visualize workflow / state transitions | "Full Issue lifecycle overview" |
| Organize past discussions | "Summary of points in Discussion #N" |
| Reference doc linked from an Issue | "Detailed background for this decision on a separate page" |
| Markdown is insufficient | Sidebar TOC, color categorization, SVG diagrams, dark mode |

Don't use this when a short explanation or plain Markdown is enough.

## Design Principles

Characteristics of the HTML this skill produces:

1. **Single-page complete**: `index.html` + `assets/style.css` only. No build step.
2. **Zero external CSS deps**: No frameworks like Bulma. Custom palette.
3. **Google Fonts only**: `Kosugi Maru` / `M PLUS Rounded 1c` / `M PLUS 1 Code`.
4. **Built-in dark mode**: `data-theme="dark|light"` toggle + `localStorage` persistence.
5. **HSP-aware**: No pure white or pure black. Warm palette + rounded sans-serif to reduce visual intensity.
6. **Semantic color coding**: Colors carry meaning (phase/step type), not decoration.
7. **SVG follows theme**: Color choices that read well in both light and dark modes.

## Workflow

### Step 1: Determine Category and Path (Required)

Read the submodule path, categories, and base URL from the **`pages` section in `.shirokuma/config.yaml`**.

Category selection flowchart:

| Scenario | Category | Example Path |
|----------|----------|--------------|
| Supplemental for Issue #N | `issues` | `pages/issues/{N}/` |
| Supplemental for PR #N | `prs` | `pages/prs/{N}/` |
| Supplemental for Discussion #N (ADR / RFC / discussion) | `discussions` | `pages/discussions/{N}/` |
| Concept / design deep dive | `explainers` | `pages/explainers/{topic-slug}/` |
| Code / design review result | `reviews` | `pages/reviews/{topic-slug}/` |
| Progress / period report | `status` | `pages/status/{topic-slug}/` |
| Incident / postmortem | `incidents` | `pages/incidents/{topic-slug}/` |

`{topic-slug}` is a **short kebab-case alphanumeric** (e.g. `workflow-review`, `auth-migration-2026q2`).

Confirm with the user:

| Item | Example |
|------|---------|
| Category | `explainers` |
| topic slug or number | `concept-workflow` or `2620` |
| Page title | Human-readable title for display |
| Source | Referenced Issue / Discussion / ADR / existing material |

Operational details follow your project's pages publishing setup (submodule and hosting).

### Template Kind Selection

The caller (orchestrator / user) chooses the template kind via the `--template` parameter. Default is `default` (existing behavior using `template.html`).

| `--template` value | reference HTML | Primary use | Primary callers |
|--------------------|---------------|-------------|-----------------|
| `default` | `template.html` | Concept explainer / free-form document | Direct calls to `writing-html-explainer`, anything in the `explainers` category |
| `review-summary` | `review-summary.html` | General review results (verdict + issue list + recommended actions) | `analyze-issue`, `review-issue`, `review-flow`, `auditing-docs` (via orchestrators) |
| `design-review` | `design-review.html` | Design review (Design Brief alignment + Aesthetic Direction evaluation + UI checks) | `design-flow`, `analyze-issue` design role (via orchestrators) |
| `postmortem` | `postmortem.html` | Incident report (status-header + event-log + metric-grid + RCA + actions) | Incident response (always HTML) |
| `implementation-plan` | `implementation-plan.html` | Epic plan (hero + milestone-timeline + risks + dataflow) | `prepare-flow` epic plan docs, `plan-issue` Markdown supplement |

**Canonical source for decision criteria, corresponding orchestrators, and output categories**: [`html-report-criteria.md`](../../rules/html-report-criteria.md)

#### Template Selection Flowchart

```
What is the report type?
├─ Incident report (postmortem)           → postmortem
├─ Epic plan / roadmap                    → implementation-plan
├─ Design review / Design Brief evaluation → design-review
├─ Review result (PR / Issue / docs / security) → review-summary
└─ Anything else (free-form document)     → default (template.html)
```

#### Relationship with Category Selection

`--template` controls the report's **structure (interior layout)**, while `--category` (`pages/<category>/<slug>/` directory) controls the **placement**. Specify them independently. Examples:

| Case | `--template` | `--category` | `--slug` |
|------|--------------|--------------|----------|
| Security review for PR #1234 | `review-summary` | `reviews` | `security-pr-1234` |
| Design review for Issue #N | `design-review` | `reviews` | `design-{N}` |
| Incident report from 2026-05 | `postmortem` | `incidents` | `2026-05-outage` |
| Epic #N plan doc | `implementation-plan` | `issues` | `{N}` |
| Concept explainer | `default` | `explainers` | `concept-workflow` |

The full category ↔ report-type mapping is in [`html-report-criteria.md`](../../rules/html-report-criteria.md) §4.

### Step 2: Verify Shared Assets and Copy Template

`pages/assets/` holds the **shared** `style.css` and `theme.js`. HTML files reference them via absolute paths `/assets/style.css` and `/assets/theme.js`.

```bash
SKILL=plugin/shirokuma-skills-en/skills/writing-html-explainer/reference

# Place shared assets only on first run (overwrite only when updating styles)
mkdir -p pages/assets
[ -f pages/assets/style.css ] || cp $SKILL/style.css pages/assets/style.css
[ -f pages/assets/theme.js ]  || cp $SKILL/theme.js  pages/assets/theme.js

# Example: explainers category with topic="concept-workflow"
CATEGORY=explainers
TOPIC=concept-workflow
OUTDIR=pages/${CATEGORY}/${TOPIC}

# Switch the source file based on the template kind
# --template default            → template.html
# --template review-summary     → review-summary.html
# --template design-review      → design-review.html
# --template postmortem         → postmortem.html
# --template implementation-plan → implementation-plan.html
TEMPLATE_FILE=template.html  # Example: --template default

mkdir -p ${OUTDIR}
cp $SKILL/${TEMPLATE_FILE} ${OUTDIR}/index.html
```

**Important**: do not create an `assets/` directory under each page (the shared one is referenced).

Replace the placeholders inside the template:

**Common placeholders (all templates):**

| Placeholder | Replace with |
|-------------|--------------|
| `{{TITLE}}` | Page title (used both in h1 and `<title>`) |
| `{{OUTPUT_PATH}}` | `pages/{category}/{slug}/index.html` |
| `{{PURPOSE}}` | One-line statement of the document's purpose |

**Template-specific placeholders:**

| Template | Placeholder | Replace with |
|----------|-------------|--------------|
| `review-summary` / `design-review` | `{{REPORT_TYPE}}` | Report type (e.g. `pr-review` / `design-review` / `requirements-review`) |
| `review-summary` / `design-review` | `{{REPORT_LEAD}}` | Lead sentence (1–2 sentences for the overall verdict) |
| `review-summary` | `{{TARGET}}` / `{{ROUND}}` | Review target (e.g. PR number) / round number |
| `review-summary` / `design-review` | `{{SCORE_HINT}}` | Hint sentence for the score card |
| `postmortem` | `{{INCIDENT_ID}}` / `{{SEV}}` / `{{STATUS}}` / `{{DURATION}}` | Four values for status-header |
| `postmortem` | `{{REQUEST_FAILURES}}` / `{{AFFECTED_USERS}}` / `{{PEAK_LATENCY}}` | Numeric values for metric-grid |
| `postmortem` | `{{ACTION_N}}` / `{{OWNER_N}}` / `{{DUE_N}}` | Rows of the action-item table |
| `implementation-plan` | `{{PERIOD}}` / `{{PROJECT_LEAD}}` / `{{STATUS}}` | Hero meta info |
| `implementation-plan` | `{{RISK_N}}` / `{{IMPACT_N}}` / `{{MITIGATION_N}}` | Rows of the risks table |
| `implementation-plan` | `{{CRITERIA_N}}` | Acceptance-criteria items |

> **Note**: `implementation-plan` uses `{{PROJECT_LEAD}}` for the lead paragraph placeholder, distinct from `{{REPORT_LEAD}}` used by the other templates. This separates the lead text of the project overview (mid- to long-term goals) from the report-level lead (1–2 sentence verdict summary).

Delete unused placeholder scaffolding; replace only the placeholders you need with real values.

**When you also need to update shared CSS/JS** (adding new components / changing existing styles):

```bash
# 1. Edit the reference side
$EDITOR $SKILL/style.css     # or theme.js
# 2. Mirror to the submodule + bump the cache buster
cp $SKILL/style.css pages/assets/style.css
cp $SKILL/theme.js  pages/assets/theme.js
# 3. Increment all 4 locations by +1 to the same value per the "?v=N Bumping policy" below
```

#### `?v=N` Bumping Policy (Cache Buster)

When you update `pages/assets/style.css` or `pages/assets/theme.js`, **increment the `?v=N` in the 4 locations below by +1 to the same value**. If the values diverge, browsers selectively miss the cache and the UI shows partially stale state.

| File | `?v=N` to update |
|------|-----------------|
| Every page under `pages/explainers/*/index.html`, `pages/issues/*/index.html`, etc. | `<link href="/assets/style.css?v=N">` / `<script src="/assets/theme.js?v=N">` |
| `pages/index.html` (root index) | Same as above (the `?v=N` embedded in the output template of `build-pages-index.mjs`) |
| `plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/template.html` | Initial value at file-generation time, kept in sync |
| `plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/review-summary.html` | Same as above (review-style templates) |
| `plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/design-review.html` | Same as above |
| `plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/postmortem.html` | Same as above |
| `plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/implementation-plan.html` | Same as above |
| `scripts/build-pages-index.mjs` | Embedded template value used when regenerating the index |

Verification command:

```bash
grep -rnE 'style\.css\?v=|theme\.js\?v=' pages/ plugin/shirokuma-skills-en/skills/writing-html-explainer/reference/ scripts/build-pages-index.mjs
# → confirm every line shows the same `?v=N`
```

### Step 3: Fill in the Content

Pick patterns from the component catalog in `reference/snippets.md` and insert content.

**Typical composition** (not required):

```
1. Overview / preamble (blockquote + short intro)
2. Big picture (phase cards / table / SVG)
3. Detail sections (multiple)
   - phase-card to divide chapters
   - timeline + chips to visualize steps
   - qbox to highlight decision points
4. Cross-cutting concerns (panel-style table or plain table)
5. Reference table (approval gates / components / etc.)
6. Discussion wrap-up (numbered list)
7. Meta info (footer)
```

**Checklist while writing:**

- [ ] Update the sidebar TOC to match actual content
- [ ] Add an `id=""` to each `<h2>` (for TOC links)
- [ ] **Pick SVG fill/stroke colors from the "SVG color palette (dark-ready)"** (see "Adding and Customizing Components"). For any color not in that table, you **must** add the dark pair `[data-theme="dark"] .diagram svg [fill="..."] / [stroke="..."]` to style.css
- [ ] After adding an SVG, **verify there are no unregistered colors using the command below** (don't rely on visual inspection alone)
- [ ] Always set `fill` on SVG `<text>` (or intentionally omit it to follow body color)
- [ ] Wrap only identifiers and short commands in `<code>`
- [ ] Avoid overusing `<strong>` (at most 1–2 per paragraph)

**Verify SVG dark-mode coverage** (mechanically detect unregistered colors; run from `pages/`):

```bash
for c in $(grep -oE '(fill|stroke)="#[0-9A-Fa-f]{3,6}"' ${CATEGORY}/${TOPIC}/index.html \
            | grep -oE '#[0-9A-Fa-f]{3,6}' | sort -u); do
  grep -q "\[fill=\"$c\"\]\|\[stroke=\"$c\"\]" assets/style.css || echo "unregistered: $c"
done
# No output means every color follows dark mode
```

### Step 4: Local Verification

Because content uses absolute `/assets/...` paths, start the server **at the submodule root (`pages/`)**:

```bash
cd pages
python3 -m http.server 8080
# Open http://localhost:8080/${CATEGORY}/${TOPIC}/ in a browser
```

Verification items:

- [ ] Light mode renders correctly
- [ ] Theme toggle switches to dark mode
- [ ] TOC links scroll to each section
- [ ] SVG diagrams are readable in both light and dark modes
- [ ] **Clicking an SVG opens the zoom dialog; ESC closes it**
- [ ] On mobile (< 900 px) the TOC collapses to the top

### Step 5: Regenerate the Index Page

When you add a new page or change an existing page's title, regenerate the **cross-cutting top-level index** at `pages/index.html`:

```bash
node scripts/build-pages-index.mjs
```

The script scans all `pages/{category}/{topic}/index.html` files and produces a category-grouped index with live search. Output goes to `pages/index.html`.

### Step 6: Submodule Commit + Parent Repo Pointer Bump

Because `pages/` is a submodule, **commit and push inside the submodule first**, then update the pointer in the parent repo.

```bash
# 6-1. Submodule side (new page + regenerated index.html together)
cd pages
git add ${CATEGORY}/${TOPIC}/ index.html
git commit -m "docs(${CATEGORY}): add ${TOPIC}"
git push origin main

# 6-2. Back in the parent repo, advance the submodule pointer
cd ..
git add pages
git commit -m "chore(pages): bump submodule for ${CATEGORY}/${TOPIC}"
```

Pushing the parent repo is handled by the normal implement-flow / commit-issue (PR-based).

### Step 7: Present the Public URL

After pushing the submodule, the host-side nginx bind mount **reflects the change immediately** (no external build needed). Accessible at the fixed URL via the cloudflared named tunnel. Generate the URL from `pages.baseUrl`:

```
{baseUrl}/{category}/{topic}/
```

Examples:
- `explainers` → `{baseUrl}/explainers/concept-workflow/`
- `issues/{number}` → `{baseUrl}/issues/{number}/`

**Example link from an Issue / PR / Discussion:**

```markdown
See [{title}]({URL}) for details.
```

After completion, present to the user:
1. Generated path (`pages/{category}/{topic}/`)
2. Public URL (`baseUrl/{category}/{topic}/`)
3. Markdown snippet for linking
4. Submodule progress (pushed / parent commit done)

## Component Selection Guide

Quick reference for when to use each component in `reference/snippets.md`:

| Situation | Component |
|-----------|-----------|
| Show a top-level list of sections at the start | `.toc-grid` (numbered TOC grid) |
| Strongly state "what this page is" at the top | `.hero` (eyebrow + h1 + lead + tags) |
| Compare 3–4 options side by side | `.card-grid` (`.card` auto-fit grid) |
| Semantic before/after / migration comparison | `.before-after` (fixed danger ↔ ok coloring) |
| Place code and result (or diagram) side by side | `.code-visual` (`<pre>` ↔ `.visual`) |
| Aggregate section summary / key fact into one block | `.summary-card` (`warn` / `ok` / no modifier) |
| Highlight "see details" links | `.cta-link` (auto `→` suffix) |
| Collapse long code or supplementary info | `details.collapse` (0.2 s chevron rotation) |
| Card-ify a chapter | `.phase-card` (color variants) |
| Show ordered steps | `.timeline` + type chips |
| Highlight a discussion point | `.qbox` |
| Known issue / caution | `blockquote.warn` |
| Confirmed success / verified hypothesis | `blockquote.callout` |
| Short identifier | `<code>` |
| State / classification tag | `<span class="tag ...">` |
| Big-picture / relationship diagram | SVG (colors from the recommended pairs) |
| Tabular data | `<table>` |

## Adding and Customizing Components

When **adding a new selector** to the base style.css:

1. Compose the color from existing variables (`--accent` / `--ok` / etc.)
2. Always add a dark-mode override under the `[data-theme="dark"]` section
3. When using a new color in SVG, add the `[data-theme="dark"] .diagram svg [fill="..."]` rule

When bumping the CSS version, increment `N` in `<link href="assets/style.css?v=N">` (browser cache busting).

### SVG color palette (dark-ready)

Prefer SVG `fill` / `stroke` colors from this table. **Each already has a `[data-theme="dark"]` dark pair in style.css, so it follows dark mode automatically — no registration needed.** Map them to meaning (phase / category).

| Role | Light bg (box) | Mid (line / marker) | Dark (heading text) |
|------|----------------|---------------------|---------------------|
| Neutral | `#F0EEE6` / `#FAF9F5` | `#87867F` | `#3D3D3A` |
| Purple (accent) | `#e6dde9` | `#856ea3` | `#4b3680` |
| Blue (info) | `#dde5ef` | `#4d7299` | `#2c4d75` |
| Green (ok) | `#dde5d0` | `#788C5D` | `#4f5f3d` |
| Amber (warn) | `#f0e3c0` / `#f0e3b8` | `#b08838` | `#6e5417` |
| Red-brown (danger) | `#ecd6cd` | `#a85040` | `#6e2f25` |
| Tan / clay | `#E3DACC` | `#D97757` | — |

- For simple diagrams, use **CSS variables** like `fill="var(--bg-soft)"` / `fill="var(--fg-strong)"` / `stroke="var(--border)"` — these follow the theme automatically with no registration (see the `.artboard` example).
- If you must use a color not in the table above, add its `[data-theme="dark"]` dark pair to style.css and **confirm zero unregistered colors with the verification command above**. Skipping this causes the classic "visible in light, washed-out background in dark" bug.

## Anti-patterns

- ❌ Converting content that fits in Markdown to HTML (keep low-density content in Markdown)
- ❌ Mixing in CSS libraries (Bulma / Tailwind / Pico) — breaks the palette
- ❌ Dynamic rendering via JavaScript — keep it as static HTML
- ❌ Pure `#fff` / `#000` colors — maintain the warm palette
- ❌ Omitting `fill` on SVG `<text>` — leaves it invisible in dark mode
- ❌ Adding more Google Font families — stick to the 3 declared families

## Prerequisites (Submodule Initial Setup)

This skill assumes `pages/` is **already added as a submodule of the parent repo**. If not, follow your project's pages submodule setup procedure.

## Reference Implementation

`docs/workflow-review/index.html` is the reference implementation (a prototype before the submodule migration). After the submodule is in place, prefer moving it to `pages/explainers/workflow-review/`.

## Localization

- This skill is provided in both **JA** (`plugin/shirokuma-skills-ja/skills/writing-html-explainer/`) and **EN** (this file). Keep them in sync: JA is the source of truth; EN follows.
- When updating, modify the JA copy first, then translate corresponding sections here. The skill internals (CSS / JS / HTML templates) are language-agnostic; only `SKILL.md` and `snippets.md` natural language is translated.
- Sync policy follows the EN sync design (HTML reporting template family).

## Related Skills

- `commit-issue`: commits and pushes after generation
- `writing-manual`: systematic Diátaxis-based manuals (Markdown)
- `write-adr`: record design decisions (Discussion)

Use `writing-manual` when a short explanation is sufficient. Choose HTML only when "information density is high and visual organization directly improves readability."

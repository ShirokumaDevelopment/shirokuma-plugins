# HTML Explainer Component Catalog

This file is the reference for **reusable HTML components** used by the `writing-html-explainer` skill.
When filling in HTML, pick a pattern from below and copy it, then swap in your content.

## Category Reverse Lookup

| Category | Components | Use |
|----------|-----------|-----|
| Navigation | `aside.toc` (sidebar TOC) | Section selection / non-linear reading |
| Layout | `.hero`, `.card-grid`, `.code-visual`, `.before-after`, `.status-header`, `.artboard` | Page structure / visual organization / meta display / parallel design exploration |
| Emphasis | `.summary-card`, `.qbox`, `blockquote` variants, `.cta-link`, `.review-score-card`, `.action-items`, `.approach` / `.tradeoffs`, `.bubble` / `.checklist`, `.decision-card` | Highlighting key information / recording decisions |
| Hierarchy | `details.collapse`, `.phase-card`, `.card.variant .card-titles` | Collapsible content / section grouping / card heading hierarchy |
| Flow | `.timeline`, `.event-log`, `.milestone-timeline` | Steps / chronological events / period grouping |
| Decoration | `.tag` / `.t-tag`, `.badge` (5 variants), `.chip` | Inline labels / status badges |
| Diagrams | SVG (`.diagram`), `.diagram-panel` / `.repo-line` | Flow / relationship diagrams / codebase structure |
| Data | `<table>`, `.issue-list-table`, `.metric-grid`, `.tile` / `.tile-grid`, `.board`, `.flag-list` | Tabular data / metric cards / trend tiles / kanban board / config values |
| Meta | `.meta` | File-info footer |

---

## Navigation

### Sidebar TOC (`aside.toc`)

A persistent TOC for long pages. Always visible thanks to `position: sticky`. **Do not hand-write `<aside class="toc">`** — `theme.js` generates the whole thing (theme toggle, the TOC auto-built from the page's `<h2>` headings, and the navigation). The page HTML only needs the `<main>` body.

```html
<!-- HTML only needs this; theme.js injects the aside under <body> -->
<body data-parent-href="/specs/skills-overview/" data-parent-label="Skills overview">
<main>
  <h1>...</h1>
  <h2 id="sec-1">Top-level item</h2>   <!-- ← TOC is built from these <h2> -->
  ...
</main>
</body>
```

- The TOC is auto-generated from `<h2>` directly under `<main>` only (h3 and deeper are not listed). Leading "N. " numbering is stripped from the displayed text
- Add an `id` to each `<h2>` for a stable anchor (JS auto-slugs missing ones)
- Navigation: a link to the **documentation root (`/`) is always added**. If a parent page is needed, define it via `<body data-parent-href="..." data-parent-label="...">` (omit the attributes when there is none)
- Switches to `position: static` and folds to the top below 900 px

---

## Layout

### Hero (`.hero`)

Strongly conveys "what this page is" at the top. Three-piece composition: title + lead + tags.

```html
<div class="hero">
  <p class="eyebrow">EXPLAINER · 2026-05-17</p>
  <h1>shirokuma-flow Workflow Deep-dive</h1>
  <p class="lead">Organize the full Issue lifecycle around four phases, and explain how Status transitions map to worker responsibilities.</p>
  <div class="tags">
    <span class="tag orch">orchestrator</span>
    <span class="tag worker">worker</span>
    <span class="tag gate">gate</span>
  </div>
</div>
```

- `eyebrow` is optional (use it for a date, category, or parent concept)
- Works with `h1` or `h2` (the `border-bottom: none` reset already applies)
- Left border: `var(--clay)` 4 px, background: `var(--bg-soft)`

### Card Comparison Grid (`.card-grid`)

Compare 3–4 options or perspectives side by side. `auto-fit` wraps automatically when the row runs out of width.

```html
<div class="card-grid">
  <div class="card">
    <h3>Option A</h3>
    <p>Description goes here.</p>
    <a class="cta-link" href="#detail-a">See details</a>
  </div>
  <div class="card">
    <h3>Option B</h3>
    <p>Description goes here.</p>
    <a class="cta-link" href="#detail-b">See details</a>
  </div>
  <div class="card">
    <h3>Option C</h3>
    <p>Description goes here.</p>
    <a class="cta-link" href="#detail-c">See details</a>
  </div>
</div>
```

- Minimum width 240 px, `auto-fit` chooses the column count
- Hover transitions `border-color: var(--clay)` + `background: var(--bg-soft)` over 150 ms
- Single column below the mobile breakpoint

### Code + Visual Side-by-side (`.code-visual`)

Put "code ↔ result" or "source ↔ diagram" next to each other to aid understanding.

```html
<div class="code-visual">
  <pre><code>:root {
  --bg: var(--ivory);
  --fg: var(--gray-700);
}</code></pre>
  <div class="visual">
    <svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="180" height="60" rx="6"
            fill="#FAF9F5" stroke="#D1CFC5"/>
      <text x="100" y="45" text-anchor="middle"
            font-family="var(--mono)" fill="#3D3D3A">--bg / --fg</text>
    </svg>
  </div>
</div>
```

- `pre` background: `var(--code-bg)`, `.visual` background: `var(--bg-soft)`
- Both sides match height via `align-items: stretch`
- Stacks vertically on mobile

### Before/After Comparison (`.before-after`)

Place "before/after fix" or "before/after migration" side by side with fixed semantic colors (Before = danger, After = ok).

```html
<div class="before-after">
  <div class="before">
    <h4>Before</h4>
    <pre><code>const x = data.map(d =&gt; d.id);</code></pre>
    <p>Does not consider async processing</p>
  </div>
  <div class="after">
    <h4>After</h4>
    <pre><code>const x = await Promise.all(data.map(d =&gt; fetchId(d)));</code></pre>
    <p>Parallelizes I/O waits</p>
  </div>
</div>
```

- Before: `var(--danger-soft)` background + `var(--danger)` left border
- After: `var(--ok-soft)` background + `var(--ok)` left border
- Separate component from `.card-grid` because the semantic color coding is fixed

### Status Header (`.status-header`) *(style.css §12-4)*

Show 4-axis meta information such as **ID / SEV / Status / Duration** at the top of a page. Use it right under the `postmortem` template, or under the hero in a plan document.

```html
<div class="status-header">
  <dl>
    <div><dt>Incident ID</dt><dd>INC-2026-051</dd></div>
    <div><dt>Severity</dt><dd>SEV-2</dd></div>
    <div><dt>Status</dt><dd>RESOLVED</dd></div>
    <div><dt>Duration</dt><dd>22 min</dd></div>
  </dl>
</div>
```

- The inner `<dl>` uses CSS Grid (4-column auto-fit)
- `<dt>` is a small mono-font label (`var(--muted)`)
- `<dd>` emphasizes the value with the display font (`var(--slate)`)
- Background: `var(--bg-soft)`, left border: `var(--clay)` (meta display matching `.hero`)
- Wraps to 2 columns on mobile

### Artboard (`.artboard` / `.artboards`) *(style.css §12-16)*

Show design candidates, visual variations, or UI mocks as **parallel frames**. Use it in the "direction candidates" section of `design-review`, or as a comparison board during design exploration. Each frame is a 3-tier composition: frame + label + rationale.

```html
<div class="artboards">
  <div class="artboard es-a">
    <div class="artboard-frame">
      <svg viewBox="0 0 160 100" role="img" aria-label="Inline editor preview">
        <rect x="10" y="20" width="140" height="60" rx="4" fill="var(--bg-soft)" stroke="var(--border)" stroke-width="1.5"/>
        <text x="80" y="56" text-anchor="middle" font-size="11" fill="var(--fg-strong)">inline editor</text>
      </svg>
    </div>
    <p class="artboard-label">Option A · Inline editor</p>
    <p class="artboard-rationale">Write short comments inline, no context switch.</p>
  </div>
  <div class="artboard es-b">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option B · Floating panel</p>
    <p class="artboard-rationale">Dedicated editing area; can move between drafts.</p>
  </div>
  <div class="artboard es-c">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option C · Modal review</p>
    <p class="artboard-rationale">Full-screen focused review, loses surrounding context.</p>
  </div>
  <div class="artboard es-d">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option D · Sidebar drawer</p>
    <p class="artboard-rationale">Pinned to sidebar, always visible. Cramped on narrow screens.</p>
  </div>
</div>
```

**Building blocks:**

- `.artboards`: `auto-fit minmax(280px, 1fr)` grid (collapses to 1 column on mobile)
- `.artboard`: rounded card with `var(--bg)` background + 1.5px border
- `.artboard-frame`: 16:10 aspect ratio, `var(--bg-soft)` background, content (SVG/figure) centered
- `.artboard-label`: display font, 700, `var(--slate)`
- `.artboard-rationale`: italic, small, `var(--muted)`
- `.es-a` / `.es-b` / `.es-c` / `.es-d`: frame `border-top` color (`--clay` / `--olive` / `--purple` / `--accent` respectively). Treat the color as "option ID" and keep it stable.

`.artboards` is ideal for showing 2–4 candidates side by side. If there are 5+, collapse extras with `details.collapse` or split into a separate page. The frame body accepts SVG, images, screenshots, or text mocks.

---

## Emphasis

### Summary Card (`.summary-card`)

Aggregate a section summary, key point, or confirmed fact into a single block. Three variants.

```html
<div class="summary-card warn">
  <span class="label">Important</span>
  <p>Summarize the section's main finding in 1–2 sentences.</p>
</div>

<div class="summary-card ok">
  <span class="label">Verified</span>
  <p>Show verified facts or confirmed decisions.</p>
</div>

<div class="summary-card">
  <span class="label">Note</span>
  <p>Neutral supplementary information.</p>
</div>
```

**Variants:**

| Class | Background | Left border | Label color | Use |
|-------|-----------|-------------|-------------|-----|
| `.summary-card.warn` | `var(--warn-soft)` | `var(--warn)` | `var(--warn-dark)` | Caution / important |
| `.summary-card.ok` | `var(--ok-soft)` | `var(--ok)` | `var(--ok-dark)` | Verified / success |
| `.summary-card` (no modifier) | `var(--bg-soft)` | `var(--border)` | `var(--muted)` | Neutral note |

### Q Box (`.qbox`)

```html
<div class="qbox">A point you want to discuss. You can also include <code>code</code> and <strong>emphasis</strong>.</div>

<!-- Resolved point (green + check) -->
<div class="qbox resolved">A resolved point. Records an approved / finalized design decision.</div>
```

Purple frame with a `Q` badge on the left. Highlights "I need a decision here" in the body.
`.qbox.resolved` (green + `✓`) is for **resolved** points.

**Design-points section convention**: In sections like "Design points" / "Open questions", separate **open (`.qbox`) on top, resolved (`.qbox.resolved`) at the bottom**, divided by `### Open` / `### Resolved` subheadings. Sinking resolved items to the bottom keeps "what needs a decision now" at the top and improves readability.

**Always include a proposal in each open point**: An open `.qbox` should state not just `Problem:` (what the question is) but also a **`Proposal:` (the recommended decision)**. A point without a proposal leaves the reader unsure what to decide next and tends to be left unresolved. Don't stop at "needs sorting out" / "to be considered" — write a concrete straw-man conclusion.

### Callout Blockquotes

```html
<blockquote>Regular quote or preface</blockquote>
<blockquote class="callout">Success / confirmed (green left border)</blockquote>
<blockquote class="warn">Known issue / caution (yellow background, amber left border)</blockquote>
<blockquote class="question">Open question (purple background)</blockquote>
```

### Arrow CTA Link (`.cta-link`)

Highlight "See details" or "View design" links inside cards.

```html
<a class="cta-link" href="#detail">See details</a>
<a class="cta-link" href="https://example.com">External link</a>
```

- Color: `var(--clay)`, font: `var(--display)`
- Automatically appends ` →` via `::after` (don't write the arrow in HTML)
- Underline on hover (color: `var(--clay)`, offset: 0.2 em)

### Review Score Card (`.review-score-card`) *(style.css §12-1)*

Highlight the overall review verdict (PASS / FAIL / NEEDS_REVISION) in a single block. Use it at the top of the `review-summary` / `design-review` templates. Three variants:

```html
<div class="review-score-card pass">
  <span class="label">Verdict</span>
  <p class="score">PASS</p>
  <p class="hint">All major criteria are met</p>
</div>

<div class="review-score-card fail">
  <span class="label">Verdict</span>
  <p class="score">FAIL</p>
  <p class="hint">Two Critical findings require fixes</p>
</div>

<div class="review-score-card warn">
  <span class="label">Verdict</span>
  <p class="score">NEEDS_REVISION</p>
  <p class="hint">Recommend re-review after addressing High findings</p>
</div>
```

**Variants:**

| Class | Background | Label color | Use |
|-------|-----------|-------------|-----|
| `.review-score-card.pass` | `var(--ok-soft)` | `var(--ok-dark)` | Pass / approved |
| `.review-score-card.fail` | `var(--danger-soft)` | `var(--danger-dark)` | Fail / send back |
| `.review-score-card.warn` | `var(--warn-soft)` | `var(--warn-dark)` | Conditional / needs revision |

- `.label` is a small mono-font caption
- `.score` uses the display font at large size
- `.hint` is body-size supplementary text

### Recommended Actions List (`.action-items`) *(style.css §12-3)*

Show the "next steps to take" from a review as a numbered list with priority chips. Use it near the end of the `review-summary` / `design-review` templates.

```html
<ol class="action-items">
  <li>
    <span class="tag priority-high">HIGH</span>
    Fix the missing authorization middleware
  </li>
  <li>
    <span class="tag priority-medium">MEDIUM</span>
    Standardize error response message formatting
  </li>
  <li>
    <span class="tag priority-low">LOW</span>
    Add JSDoc comments (optional)
  </li>
</ol>
```

**Priority chip colors:**

| Class | Background | Text | Use |
|-------|-----------|------|-----|
| `.tag.priority-high` | `var(--danger-soft)` | `var(--danger-dark)` | Top priority (must address) |
| `.tag.priority-medium` | `var(--warn-soft)` | `var(--warn-dark)` | Next priority |
| `.tag.priority-low` | `var(--bg-soft)` | `var(--muted)` | Optional |

- Numbers are auto-counted via CSS `counter()` (same mechanism as `.timeline`)
- Priority chips are `.tag` variants, so they inherit existing `.tag` padding and rounding

### Option Comparison Card (`.approach` / `.tradeoffs`) *(style.css §12-9)*

A dedicated pattern for "comparing multiple options for the same goal side by side with pros/cons". Useful for design exploration, library selection, and implementation approach comparison so reviewers can quickly contrast the upsides and downsides of each candidate. While `.action-items` shows "the steps of a single chosen solution", `.approach` is for "listing several candidates before choosing one".

```html
<div class="approach">
  <div class="approach-head">
    <span class="num">A</span>
    <h3>Custom useDebounce hook</h3>
  </div>
  <p>Call <code>useDebounce(value, 300)</code> in the React component and put the debounced value in the dependency array.</p>
  <div class="tradeoffs">
    <div class="pro">
      <h4>Pros</h4>
      <ul>
        <li>Zero external dependencies</li>
        <li>Easy to test (pure-function friendly)</li>
      </ul>
    </div>
    <div class="con">
      <h4>Cons</h4>
      <ul>
        <li><code>maxWait</code> / <code>leading</code> options need to be hand-rolled</li>
      </ul>
    </div>
  </div>
</div>

<div class="approach">
  <div class="approach-head">
    <span class="num">B</span>
    <h3>Wrap lodash.debounce</h3>
  </div>
  <p>Wrap the existing <code>lodash.debounce</code> with <code>useMemo</code>.</p>
  <div class="tradeoffs">
    <div class="pro">
      <h4>Pros</h4>
      <ul>
        <li>Battle-tested implementation that handles edge cases well</li>
        <li><code>maxWait</code> / <code>leading</code> / <code>trailing</code> all available out of the box</li>
      </ul>
    </div>
    <div class="con">
      <h4>Cons</h4>
      <ul>
        <li>Larger bundle size (per-method import required to avoid pulling all of lodash)</li>
      </ul>
    </div>
  </div>
</div>
```

**Components:**

- `.approach-head .num`: Candidate number badge (`var(--oat)` background, 1–2 chars like A/B/C)
- `.approach-head h3`: Candidate title (display font, 1.15rem)
- `.approach > p`: Candidate description (max-width: 720px)
- `.tradeoffs`: 2-column grid for pros/cons (collapses to 1 column on mobile)
- `.tradeoffs .pro`: `var(--ok-soft)` background + `var(--ok)` left border (same green family as `.before-after .after`)
- `.tradeoffs .con`: `var(--danger-soft)` background + `var(--danger)` left border (same red family)
- `.tradeoffs h4`: Pros/cons label (mono font, uppercase, small)

`.approach` is designed to be stacked 2–3 times vertically (switch to `.card-grid` or a comparison table for 4+ candidates). Keep pros/cons within 5 lines per side and use `details.collapse` for any additional detail.

### Review Comment Bubble (`.bubble` / `.avatar` / `.checklist`) *(style.css §12-10)*

Display PR review comments, chat-style feedback, or Q&A in a two-column structure of **avatar + body card**. Use it for the review history section of `design-review` templates or stakeholder interviews in `postmortem`.

```html
<div class="bubble">
  <div class="avatar">RB</div>
  <div class="bubble-body">
    <div class="bubble-head">
      <span class="author-name">Reviewer Bot</span>
      <span class="chip blocking">blocking</span>
      <span class="chip">line 142</span>
    </div>
    <p>Validation inside <code>setItemFields</code> was removed. Do it at each CLI entry point.</p>
    <ul class="checklist">
      <li><label><input type="checkbox" checked> Located the affected code</label></li>
      <li><label><input type="checkbox"> Moved validation to the CLI entry point</label></li>
      <li><label><input type="checkbox"> Adjusted existing tests</label></li>
    </ul>
  </div>
</div>
```

**Components:**

- `.bubble`: Flex layout (avatar on the left + body card on the right; stacks vertically on mobile)
- `.avatar`: Circular 36×36px, `var(--oat)` background with `var(--mono)` 2-char initials
- `.bubble-body`: Rounded card (10px) with `var(--bg-soft)` background
- `.bubble-head`: Top meta row (author + multiple `.chip`s with flex-wrap)
- `.chip`: Pill shape (999px radius, `var(--mono)`, small). **Use `.tag` for inline body labels and `.chip` exclusively for meta rows inside `.bubble` etc.**
- `.chip.blocking`: `var(--danger-soft)` background + `var(--danger-dark)` text, bold uppercase
- `.checklist`: `<ul>` structure with `accent-color: var(--olive)` checkboxes and body labels

Multiple `.bubble`s in a row read like a conversation log. There are no `.bubble.blocking` variants; signal review severity via `.chip.blocking` in the meta row instead.

### Decision Card (`.decision-card` / `.decision-deck`) *(style.css §12-14)*

For weekly status reports, planning reviews, and retros, display **decisions as individual cards** that can be scanned side by side. Each card is a 5-tier composition: eyebrow (date/category) + title + context + Q/A + byline. The `.lean` variant omits context for shorter entries.

```html
<div class="decision-deck">
  <div class="decision-card">
    <p class="eyebrow">DECISION · 2026-W11</p>
    <h3>New worker split policy</h3>
    <p class="decision-context">Decision about SubAgent-izing work that needs context isolation.</p>
    <p class="decision-q"><strong>Q:</strong> Which skills should become SubAgents?</p>
    <p><strong>A:</strong> Introduce finalize-worker that bundles /simplify and reviewing-security.</p>
    <p class="byline">— @author, Discussion #N</p>
  </div>
  <div class="decision-card lean">
    <p class="eyebrow">DECISION · 2026-W12</p>
    <h3>HTML report threshold</h3>
    <p class="decision-q"><strong>Q:</strong> When do we switch to HTML?</p>
    <p><strong>A:</strong> Convert when review body exceeds 80 lines (feature-flag gated).</p>
    <p class="byline">— @author, PR #N</p>
  </div>
</div>
```

**Building blocks:**

- `.decision-deck`: `auto-fit minmax(280px, 1fr)` grid (collapses to 1 column on mobile)
- `.decision-card`: rounded card (12px radius) with `var(--bg)` background + 1.5px border, padding 1.4rem
- `.decision-card .eyebrow`: mono, uppercase, letter-spacing 0.08em, `var(--muted)`
- `.decision-card h3`: display font, 700, `var(--slate)`
- `.decision-card .decision-context`: italic, small, `var(--muted)` (the situational lead-in)
- `.decision-card .decision-q`: `var(--clay)` to highlight the question ("Q:" + question)
- `.decision-card .byline`: right-aligned mono, `var(--gray-500)` (decision owner / reference link)
- `.decision-card.lean`: smaller padding, context hidden. Use for short decisions that resolve with just Q/A

**`.bubble` vs `.decision-card`:**

| Component | Use | Viewpoint | Feel |
|-----------|-----|-----------|------|
| `.bubble` | Individual review comments, dialogue | "Who said what" | Conversational / chat-like |
| `.decision-card` | Settled decisions on record | "What was decided and why" | Catalog / ledger-like |

Mixing `.decision-card` and `.decision-card.lean` inside the same `.decision-deck` lets you weight important decisions (full) against supporting ones (lean) visually. Designed for the "decisions this week" section at the end of weekly reports, with 3–6 cards.

---

## Hierarchy

### Collapsible (`details.collapse`)

Collapse long code or extra information to keep the initial view clean.

```html
<details class="collapse">
  <summary>View full style.css</summary>
  <pre><code>:root {
  --ivory: #FAF9F5;
  --slate: #141413;
  /* ... */
}</code></pre>
</details>

<details class="collapse" open>
  <summary>Initially expanded example</summary>
  <p>Adding the `open` attribute starts it open.</p>
</details>
```

- Summary background: `var(--bg-soft)`, content background: `var(--bg)`
- The `▶` chevron rotates 90 deg when `[open]` (0.2 s transition)
- Direct non-summary children get automatic padding
- Place `<pre>` as a direct child to get continuous border / radius

### Phase Card (`.phase-card`)

```html
<section class="phase-card designing" id="p-{slug}">
  <header>
    <span>{title}</span>
    <span class="tag orch">{orchestrator name}</span>
    <span class="tag status">status: {status}</span>
  </header>
  <div class="body">
    <h4>Purpose</h4>
    <p>...</p>
    <h4>Related items</h4>
    <p>...</p>
  </div>
</section>
```

**`phase-card` variants** (the `<header>` background changes):

| Class | Background | Use |
|-------|-----------|-----|
| `designing` / `preparing` / `working` | accent-soft (dusty blue) | Regular phases |
| `reviewing` | ok-soft (olive) | Review / completion phases |
| `requirements` | purple-soft | Auxiliary processes |

### Card Heading Hierarchy (`.card.variant .card-titles`) *(style.css §12-18)*

A variant of `.card-grid .card` that strengthens the heading area into a **3-tier "title + subtitle + auxiliary meta"** structure. The hierarchical heading is only active on cards that carry `.card.variant` (plain `.card` is unaffected). Use it for component catalogs, sample galleries, and template collections where each card should expose 3 levels of meta information.

```html
<div class="card-grid">
  <div class="card variant">
    <header class="card-titles">
      <p class="card-title">Primary Button</p>
      <p class="card-sub">var(--clay) background + ivory text</p>
      <p class="card-head-meta">12 usages · Acme/Web</p>
    </header>
    <div class="card-body">
      <a class="cta-link" href="#">See example</a>
    </div>
  </div>
  <div class="card variant">
    <header class="card-titles">
      <p class="card-title">Ghost Button</p>
      <p class="card-sub">Transparent background + 1.5px border</p>
      <p class="card-head-meta">8 usages · Acme/Web</p>
    </header>
    <div class="card-body">
      <a class="cta-link" href="#">See example</a>
    </div>
  </div>
</div>
```

**Building blocks:**

- `.card.variant .card-titles`: vertically stacked 3-tier heading block with a 1.5px border-bottom
- `.card-title`: display font, 600, `var(--slate)` (same weight as the existing `h3`)
- `.card-sub`: italic, small, `var(--muted)` (supplementary description of the title)
- `.card-head-meta`: mono, x-small, `var(--gray-500)` with letter-spacing (usage count, owner, etc.)
- `.card-body`: existing `.card` body region, with sizing tweaks

**Plain `.card` vs `.card.variant`:**

| Variant | Heading structure | Use |
|---------|-------------------|-----|
| `.card-grid .card` (default) | Single `<h3>` line + body | Simple comparisons / brief overviews |
| `.card-grid .card.variant` | 3-tier `.card-titles` + body | Catalogs / template sets / sample listings |

Pick `.card.variant` when "the title alone is not enough — I need a subtitle and a numeric meta line." Keep `.card-head-meta` limited to 1–2 numeric/affiliation items; if it grows, move metrics into the body using `.metric-grid` instead.

---

## Flow

### Timeline + Type Chip (`.timeline`)

```html
<h4>Processing Flow</h4>
<ol class="timeline">
  <li><span class="t-tag status">STATUS</span>Status change<span class="desc">Supplementary note (optional)</span></li>
  <li><span class="t-tag worker">WORKER</span>Agent delegation</li>
  <li><span class="t-tag check">CHECK</span>Investigate / verify</li>
  <li><span class="t-tag task">TASK</span>Regular task</li>
  <li><span class="t-tag ai">AI</span>AI judgment / review</li>
  <li><span class="t-tag gate">GATE</span>Human approval</li>
  <li><span class="t-tag post">POST</span>Post-processing</li>
</ol>
```

**Chip color mapping:**
- `status`: dusty blue (accent)
- `worker`: olive (ok)
- `check` / `task`: muted gray
- `ai`: dusty purple
- `gate`: oat / clay
- `post`: warn amber

Numbers are auto-counted via CSS `counter()`.

### Timestamp Timeline (`.event-log`) *(style.css §12-5)*

For incident timelines and meeting logs: a vertical list of **absolute timestamps + descriptions**. Use it in the timeline section of the `postmortem` template. Each `.entry` (dot column + pill time badge + body) is laid out with a vertical rule drawn by the `::before` pseudo-element.

```html
<div class="event-log">
  <div class="entry">
    <span class="dot impact"></span>
    <span class="time">14:02</span>
    <div class="body"><strong>Impact starts</strong>: Monitoring alert fired. p99 latency exceeded threshold</div>
  </div>
  <div class="entry">
    <span class="dot"></span>
    <span class="time">14:05</span>
    <div class="body">On-call engineer began investigation</div>
  </div>
  <div class="entry">
    <span class="dot mitigated"></span>
    <span class="time">14:18</span>
    <div class="body"><strong>Mitigated</strong>: Identified root cause as deployment B, rolled back</div>
  </div>
  <div class="entry">
    <span class="dot resolved"></span>
    <span class="time">14:24</span>
    <div class="body"><strong>Resolved</strong>: Confirmed metric normalization, incident resolved</div>
  </div>
</div>
```

- `.dot` is `position: absolute`, overlaid on the vertical rule (`::before` pseudo-element / `var(--border)` 2 px)
- `.dot` variants: default (`var(--clay)` outline, hollow) / `.impact` (filled `var(--clay)`) / `.mitigated`, `.resolved` (filled `var(--olive)`)
- `.time` is a pill-style time badge (`var(--bg-soft)` background + `var(--border)` outline + mono font)
- `.body` is body text. Use `<strong>` to emphasize key milestones (`var(--slate)`)
- Independent from `.timeline` (step number + chip) — keeping them as separate classes reduces CSS complexity

### Period-grouped Timeline (`.milestone-timeline`) *(style.css §12-6)*

For epic plans and roadmaps: a gantt-style 3-column grid where each milestone is a row. Period label on the left, dot + line (vertical connector) in the middle, body on the right. Use it in the roadmap section of the `implementation-plan` template.

```html
<div class="milestone-timeline">

  <div class="milestone">
    <div class="when">Week 1 · Mon–Tue</div>
    <div class="dot-col">
      <span class="dot done"></span>
      <span class="line"></span>
    </div>
    <div class="body">
      <h3>Schema & API contract</h3>
      <p>Finalize the table definitions and OpenAPI to lock the front/back contract.</p>
      <div class="tags">
        <span class="tag">~2 days</span>
        <span class="tag">backend</span>
      </div>
    </div>
  </div>

  <div class="milestone">
    <div class="when">Week 1 · Wed</div>
    <div class="dot-col">
      <span class="dot current"></span>
      <span class="line"></span>
    </div>
    <div class="body">
      <h3>Composer UI</h3>
      <p>Implement the post composer form on top of shadcn/ui.</p>
    </div>
  </div>

  <!-- Omit .line on the last milestone -->
  <div class="milestone">
    <div class="when">Week 2 · Fri</div>
    <div class="dot-col">
      <span class="dot"></span>
    </div>
    <div class="body">
      <h3>Release</h3>
      <p>Production release. Renovate auto PRs already configured.</p>
    </div>
  </div>

</div>
```

- Each milestone is a 3-column grid (`120px 28px 1fr`): `.when` / `.dot-col` / `.body`
- `.dot` variants: default (`var(--clay)` outline, not started) / `.done` (filled `var(--olive)`, completed) / `.current` (filled `var(--clay)`, in progress)
- `.line` draws the vertical connector to the next milestone. Omit it on the last milestone
- `.body .tags` lets you lay out `.tag` elements horizontally
- On mobile the `.when` column shrinks to 80 px to keep things readable

### Code diff block (`.diff-block` / `.diff-line`) *(style.css §12-8)*

GitHub-style code diff (added / removed / context) display. Use it for "configuration change examples" in the `postmortem` template, or "before/after migration code" in the `implementation-plan` template.

```html
<div class="diff-block">
  <span class="diff-line ctx"> originRequest:</span>
  <span class="diff-line del">-  connectTimeout: 30s</span>
  <span class="diff-line add">+  connect_timeout: 30s</span>
  <span class="diff-line ctx"> tunnel: my-tunnel</span>
</div>
```

- `.diff-block` has a `var(--bg-soft)` background + `var(--border)` outline, rendered in `var(--mono)` at 0.82 rem
- `.diff-line.ctx` is the context line (`var(--gray-500)`, gray)
- `.diff-line.del` is a removed line (`var(--danger-dark)`, red-ish)
- `.diff-line.add` is an added line (`var(--ok-dark)`, green-ish)
- `white-space: pre` preserves indentation. Horizontal scroll is available (`overflow-x: auto`)

---

## Decoration

### Tag (`.tag`)

```html
<span class="tag">Neutral</span>
<span class="tag status">status</span>     <!-- background only -->
<span class="tag orch">accent color</span> <!-- dusty blue -->
<span class="tag worker">ok color</span>   <!-- olive -->
<span class="tag gate">warn color</span>   <!-- amber -->
<span class="tag question">purple</span>
```

### Status Badge (`.badge`, 5 variants) *(style.css §12-12)*

While `.tag` is for inline body labels (e.g. the `.hero` tag row or `.timeline` type chips), `.badge` is for **standalone status / category display**. Use it for the status column of a table, the current-state label at the top of a summary, or a KPI tile delta direction — anywhere you need a "single label with semantic color".

```html
<span class="badge accent">accent</span>
<span class="badge neutral">neutral</span>
<span class="badge success">success</span>
<span class="badge warning">warning</span>
<span class="badge danger">danger</span>
```

**Variant color map:**

| Class | Background | Text | Border | Example use |
|-------|-----------|------|--------|-------------|
| `.badge.accent` | `var(--oat)` | `var(--clay)` | `var(--clay)` | Category / type (NEW / FEATURED) |
| `.badge.neutral` | `var(--bg-soft)` | `var(--gray-700)` | `var(--border)` | Neutral attribute (DRAFT / TODO) |
| `.badge.success` | `var(--ok-soft)` | `var(--ok-dark)` | `var(--ok)` | Success / completion (DONE / PASSED) |
| `.badge.warning` | `var(--warn-soft)` | `var(--warn-dark)` | `var(--warn)` | Attention / action needed (PENDING / WARN) |
| `.badge.danger` | `var(--danger-soft)` | `var(--danger-dark)` | `var(--danger)` | Failure / blocking (FAILED / BLOCKED) |

**When to use `.tag` vs `.chip` vs `.badge`:**

| Component | Use | Shape | Main variants |
|-----------|-----|-------|---------------|
| `.tag` | Inline body labels | Rounded 6px | `.orch` / `.worker` / `.gate` / `.question` / `.priority-*` |
| `.chip` | Meta row inside `.bubble` etc. | Pill (999px) | `.blocking` |
| `.badge` | Standalone status / category | Rounded 6px | `.accent` / `.neutral` / `.success` / `.warning` / `.danger` |

---

## Diagrams

### SVG Diagrams (Phase / Loop)

SVG follows the theme via CSS variables. When you add a new color, register it in the `[data-theme="dark"] .diagram svg [fill="..."]` rules at the bottom of `style.css` (otherwise it stays black in dark mode).

#### Basic Structure

```html
<div class="diagram">
<svg viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagram label">
  <defs>
    <marker id="arr-main" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3D3D3A"/>
    </marker>
  </defs>

  <!-- Boxes: fill = soft color, stroke = stronger color -->
  <rect x="40" y="40" width="160" height="80" rx="8"
        fill="#dde5ef" stroke="#4d7299" stroke-width="2"/>
  <text x="120" y="68" text-anchor="middle" font-size="14" font-weight="700"
        fill="#2c4d75">Title</text>
  <text x="120" y="88" text-anchor="middle" font-size="11"
        fill="#2c4d75">Sub</text>

  <!-- Arrow -->
  <line x1="200" y1="80" x2="240" y2="80"
        stroke="#3D3D3A" stroke-width="2.5" marker-end="url(#arr-main)"/>
</svg>
</div>
```

#### Recommended Color Pairs (fill / stroke / text)

| Use | fill (soft) | stroke (mid) | text (dark) |
|-----|-------------|--------------|-------------|
| process (blue) | `#dde5ef` | `#4d7299` | `#2c4d75` |
| review / ok (olive) | `#dde5d0` | `#788C5D` | `#4f5f3d` |
| requirements / upstream (purple) | `#e6dde9` | `#856ea3` | `#4b3680` |
| warn / gate (amber) | `#f0e3c0` | `#b08838` | `#6e5417` |
| danger (terracotta) | `#ecd6cd` | `#a85040` | `#6e2f25` |
| neutral | `#F0EEE6` | `#D1CFC5` | `#3D3D3A` |
| muted text | — | `#87867F` | `#87867F` |

#### Notes on SVG `<text>`

- Always specify `fill="..."` on colored text (without it, `:not([fill])` in CSS makes text follow the body color, which loses the color-coding intent)
- Also set `fill` explicitly on decorative text such as arrow labels

### SVG Diagrams (Extended Pattern Set)

The hex values in the "Recommended Color Pairs" table (`#dde5ef` / `#4d7299` / `#788C5D` / `#f0e3c0` / `#a85040` / `#F0EEE6` / `#87867F` / `#3D3D3A` etc.) are **already registered in the `[data-theme="dark"]` overrides at the bottom of `style.css`**, so no CSS additions are needed while you stay within those colors. Only when you introduce a new fill color, add the corresponding `[data-theme="dark"] .diagram svg [fill="..."]` rule. Never use pure white `#FFFFFF` or pure black `#000000` anywhere in the SVG — use `#F0EEE6` (gray-150) for light fills and `#3D3D3A` (gray-700) for dark strokes/text.

Every SVG must include `role="img"` + `aria-label="..."`, and a `viewBox` is required.

#### A. Pipeline Flowchart (Vertical, Decision Diamonds + Annotations)

Define multiple colored arrow markers in `<defs>`, then express branching with a sequence of `.node` rectangles and a `.node.gate` diamond (drawn as a `<path>`). Place `yes` / `no` labels alongside the edges.

```html
<div class="diagram">
<svg viewBox="0 0 540 720" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="CI/CD pipeline flowchart (lint → test → gate → deploy)">
  <defs>
    <marker id="arr-neutral" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#87867F"/>
    </marker>
    <marker id="arr-olive" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#788C5D"/>
    </marker>
    <marker id="arr-rust" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#a85040"/>
    </marker>
  </defs>

  <!-- nodes (center lane x=110-310, center=210) -->
  <g>
    <rect x="140" y="12" width="140" height="44" rx="22"
          fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
    <text x="210" y="32" text-anchor="middle" font-size="12" fill="#3D3D3A">git push</text>
    <text x="210" y="46" text-anchor="middle" font-size="10" fill="#87867F">trigger</text>
  </g>
  <g>
    <rect x="110" y="92" width="200" height="56" rx="8"
          fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
    <text x="210" y="114" text-anchor="middle" font-size="12" fill="#3D3D3A">lint + typecheck</text>
    <text x="210" y="132" text-anchor="middle" font-size="10" fill="#87867F">~2 min</text>
  </g>
  <g>
    <rect x="110" y="184" width="200" height="56" rx="8"
          fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
    <text x="210" y="206" text-anchor="middle" font-size="12" fill="#3D3D3A">unit + integration</text>
    <text x="210" y="224" text-anchor="middle" font-size="10" fill="#87867F">~6 min · 3 shards</text>
  </g>
  <g>
    <path d="M210,280 L266,320 L210,360 L154,320 Z"
          fill="#f0e3c0" stroke="#b08838" stroke-width="1.5"/>
    <text x="210" y="324" text-anchor="middle" font-size="11" fill="#6e5417">pass?</text>
  </g>
  <g>
    <rect x="110" y="400" width="200" height="56" rx="8"
          fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
    <text x="210" y="422" text-anchor="middle" font-size="12" fill="#3D3D3A">build + push image</text>
    <text x="210" y="440" text-anchor="middle" font-size="10" fill="#87867F">ghcr.io</text>
  </g>
  <g>
    <rect x="110" y="492" width="200" height="56" rx="8"
          fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
    <text x="210" y="514" text-anchor="middle" font-size="12" fill="#3D3D3A">canary 5%</text>
    <text x="210" y="532" text-anchor="middle" font-size="10" fill="#87867F">10 min soak</text>
  </g>
  <g>
    <rect x="140" y="640" width="140" height="48" rx="22"
          fill="#dde5d0" stroke="#788C5D" stroke-width="1.5"/>
    <text x="210" y="670" text-anchor="middle" font-size="12" fill="#4f5f3d">deploy complete</text>
  </g>
  <!-- right lane: notify failure -->
  <g>
    <rect x="370" y="292" width="160" height="56" rx="8"
          fill="#ecd6cd" stroke="#a85040" stroke-width="1.5"/>
    <text x="450" y="314" text-anchor="middle" font-size="12" fill="#6e2f25">notify failure</text>
    <text x="450" y="332" text-anchor="middle" font-size="10" fill="#a85040">slack #ci</text>
  </g>

  <!-- edges (drawn last, arrows stop 4-6px before next node) -->
  <path d="M210,56 L210,86" fill="none" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-neutral)"/>
  <path d="M210,148 L210,178" fill="none" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-neutral)"/>
  <path d="M210,240 L210,274" fill="none" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-neutral)"/>
  <path d="M210,360 L210,394" fill="none" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-olive)"/>
  <text x="218" y="382" font-size="11" fill="#4f5f3d">pass</text>
  <path d="M266,320 L364,320" fill="none" stroke="#a85040" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-rust)"/>
  <text x="290" y="312" font-size="11" fill="#6e2f25">fail</text>
  <path d="M210,456 L210,486" fill="none" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-neutral)"/>
  <path d="M210,548 L210,634" fill="none" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-olive)"/>
  <text x="218" y="594" font-size="11" fill="#4f5f3d">SLO ok</text>
</svg>
</div>
```

**When to use and caveats:** Best for vertical processing pipelines (CI/CD, workflows, flows that include state transitions). Use `.node.gate` (the diamond) to make branches explicit, and label edges with `yes`/`no`. Failure paths use a dashed line + rust (terracotta) color to stand apart. Defining multiple `<marker>` elements lets the arrowheads themselves carry color and stay consistent with their edges.

#### B. Hub & Spoke (Fanout)

Arrows fan out from a central node to four peripheral nodes — a stock pattern for parallel processing, fan-out, or delegation.

```html
<div class="diagram">
<svg viewBox="0 0 540 320" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Hub-and-spoke diagram of implement-flow delegating to 4 workers">
  <defs>
    <marker id="arr-hub" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#87867F"/>
    </marker>
  </defs>

  <!-- Central hub -->
  <rect x="220" y="128" width="100" height="64" rx="10"
        fill="#E3DACC" stroke="#3D3D3A" stroke-width="2"/>
  <text x="270" y="156" text-anchor="middle" font-size="12" fill="#3D3D3A">implement-flow</text>
  <text x="270" y="174" text-anchor="middle" font-size="10" fill="#87867F">orchestrator</text>

  <!-- 4 peripheral nodes -->
  <rect x="20" y="40" width="140" height="52" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="90" y="62" text-anchor="middle" font-size="12" fill="#3D3D3A">coding-worker</text>
  <text x="90" y="80" text-anchor="middle" font-size="10" fill="#87867F">code edits</text>

  <rect x="380" y="40" width="140" height="52" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="450" y="62" text-anchor="middle" font-size="12" fill="#3D3D3A">commit-worker</text>
  <text x="450" y="80" text-anchor="middle" font-size="10" fill="#87867F">stage + push</text>

  <rect x="20" y="232" width="140" height="52" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="90" y="254" text-anchor="middle" font-size="12" fill="#3D3D3A">pr-worker</text>
  <text x="90" y="272" text-anchor="middle" font-size="10" fill="#87867F">create PR</text>

  <rect x="380" y="232" width="140" height="52" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="450" y="254" text-anchor="middle" font-size="12" fill="#3D3D3A">finalize-worker</text>
  <text x="450" y="272" text-anchor="middle" font-size="10" fill="#87867F">simplify + sec</text>

  <!-- Spoke arrows -->
  <line x1="220" y1="148" x2="166" y2="80"  stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="320" y1="148" x2="374" y2="80"  stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="220" y1="172" x2="166" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="320" y1="172" x2="374" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>

  <text x="270" y="304" text-anchor="middle" font-size="11" fill="#87867F">Parent delegates to 4 workers sequentially (chain, not parallel)</text>
</svg>
</div>
```

**When to use and caveats:** Fit for any 1:N relationship — orchestrator → workers, API → microservices, data source → multiple sinks. Make the hub `var(--oat)` (warm) and the spokes `var(--bg-soft)` (neutral) so the "main actor vs supporting cast" distinction reads visually. Above ~5 peripheral nodes the layout starts to break — switch to a ring (hub + 6-8 around the perimeter) or a hierarchical layout.

#### C. Retry / Chained Failure

Place attempt nodes (circle + ✕ / ✓) along a horizontal timeline, and connect failure → failure transitions with dashed arches. Ideal for exponential backoff or staged retry policies.

```html
<div class="diagram">
<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Retry diagram with 4 attempts under exponential backoff">
  <!-- Timeline axis -->
  <line x1="40" y1="150" x2="560" y2="150" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="40"  y="174" font-size="11" fill="#87867F">t = 0</text>
  <text x="560" y="174" text-anchor="end" font-size="11" fill="#87867F">time →</text>

  <!-- Attempt 1: fail -->
  <circle cx="80" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="75" y1="145" x2="85" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="85" y1="145" x2="75" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="80" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 1</text>

  <!-- Attempt 2: fail -->
  <circle cx="160" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="155" y1="145" x2="165" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="165" y1="145" x2="155" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="160" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 2</text>

  <!-- Attempt 3: fail -->
  <circle cx="300" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="295" y1="145" x2="305" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="305" y1="145" x2="295" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="300" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 3</text>

  <!-- Attempt 4: success -->
  <circle cx="500" cy="150" r="10" fill="#788C5D" stroke="#3D3D3A" stroke-width="1.5"/>
  <path d="M495,150 L499,154 L506,144" fill="none" stroke="#F0EEE6"
        stroke-width="1.5" stroke-linecap="round"/>
  <text x="500" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 4</text>

  <!-- Backoff arches -->
  <path d="M80,142 Q120,90 160,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="120" y="84" text-anchor="middle" font-size="11" fill="#87867F">+1s</text>

  <path d="M160,142 Q230,72 300,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="230" y="64" text-anchor="middle" font-size="11" fill="#87867F">+2s</text>

  <path d="M300,142 Q400,40 500,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="400" y="34" text-anchor="middle" font-size="11" fill="#87867F">+4s</text>

  <text x="40" y="222" font-size="11" fill="#87867F">Each failure waits twice as long before re-queuing; jitter not pictured.</text>
</svg>
</div>
```

**When to use and caveats:** Use for chained failures on a time axis — retry policies, exponential backoff, circuit breaker recovery, HTTP retransmission. The success node alone gets a filled `var(--olive)` with a white checkmark, while failure nodes are stroke-only with ✕. Placing the wait-time label at each arch's apex makes the exponential spacing intuitive.

#### D. State Transition Diagram

Arrange multiple state rectangles, and connect them with transition arrows (forward = solid, rollback = dashed). The Issue lifecycle in shirokuma-flow is a fitting subject.

```html
<div class="diagram">
<svg viewBox="0 0 720 260" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="5-state transition diagram of the Issue lifecycle">
  <defs>
    <marker id="arr-fwd" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#788C5D"/>
    </marker>
    <marker id="arr-back" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#a85040"/>
    </marker>
  </defs>

  <!-- 5 states (horizontal) -->
  <rect x="20"  y="100" width="116" height="60" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="78" y="128" text-anchor="middle" font-size="12" fill="#3D3D3A">Backlog</text>
  <text x="78" y="146" text-anchor="middle" font-size="10" fill="#87867F">not started</text>

  <rect x="166" y="100" width="116" height="60" rx="8"
        fill="#dde5ef" stroke="#4d7299" stroke-width="1.5"/>
  <text x="224" y="128" text-anchor="middle" font-size="12" fill="#2c4d75">ToDo</text>
  <text x="224" y="146" text-anchor="middle" font-size="10" fill="#4d7299">ready</text>

  <rect x="312" y="100" width="116" height="60" rx="8"
        fill="#f0e3c0" stroke="#b08838" stroke-width="1.5"/>
  <text x="370" y="128" text-anchor="middle" font-size="12" fill="#6e5417">In progress</text>
  <text x="370" y="146" text-anchor="middle" font-size="10" fill="#b08838">working</text>

  <rect x="458" y="100" width="116" height="60" rx="8"
        fill="#e6dde9" stroke="#856ea3" stroke-width="1.5"/>
  <text x="516" y="128" text-anchor="middle" font-size="12" fill="#4b3680">Review</text>
  <text x="516" y="146" text-anchor="middle" font-size="10" fill="#856ea3">in review</text>

  <rect x="604" y="100" width="96" height="60" rx="8"
        fill="#dde5d0" stroke="#788C5D" stroke-width="1.5"/>
  <text x="652" y="128" text-anchor="middle" font-size="12" fill="#4f5f3d">Done</text>
  <text x="652" y="146" text-anchor="middle" font-size="10" fill="#788C5D">complete</text>

  <!-- Forward transitions -->
  <line x1="136" y1="130" x2="162" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="149" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">plan</text>

  <line x1="282" y1="130" x2="308" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="295" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">begin</text>

  <line x1="428" y1="130" x2="454" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="441" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">submit</text>

  <line x1="574" y1="130" x2="600" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="587" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">approve</text>

  <!-- Rollback transition (Review → In progress) -->
  <path d="M460,160 C420,200 380,200 372,162" fill="none" stroke="#a85040"
        stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arr-back)"/>
  <text x="416" y="218" text-anchor="middle" font-size="10" fill="#6e2f25">request-changes</text>

  <text x="20" y="34" font-size="11" fill="#87867F">Forward (plan/begin/submit/approve) is solid; rollback is dashed</text>
</svg>
</div>
```

**When to use and caveats:** Use for state machines, Issue/PR lifecycles, job status transitions, order workflows, etc. Distinguish forward and rollback with different markers (colors) and make rollback dashed so "happy path" and "regression" are immediately distinguishable. When coloring each state, unify the semantics: process = blue, in-progress = amber, review = purple, done = olive.

#### E. Sequence Diagram (Lifelines)

Vertical dotted lifelines and horizontal message arrows express interactions in time order. Activations (solid vertical bars) on lifelines emphasize busy intervals.

```html
<div class="diagram">
<svg viewBox="0 0 640 460" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Worker delegation sequence of implement-flow">
  <defs>
    <marker id="arr-msg" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#87867F"/>
    </marker>
    <marker id="arr-ret" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#788C5D"/>
    </marker>
  </defs>

  <!-- Lifeline headers -->
  <rect x="40"  y="20" width="120" height="40" rx="6"
        fill="#E3DACC" stroke="#3D3D3A" stroke-width="1.5"/>
  <text x="100" y="44" text-anchor="middle" font-size="12" fill="#3D3D3A">implement-flow</text>

  <rect x="200" y="20" width="120" height="40" rx="6"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="260" y="44" text-anchor="middle" font-size="12" fill="#3D3D3A">coding-worker</text>

  <rect x="360" y="20" width="120" height="40" rx="6"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="420" y="44" text-anchor="middle" font-size="12" fill="#3D3D3A">commit-worker</text>

  <rect x="520" y="20" width="100" height="40" rx="6"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="570" y="44" text-anchor="middle" font-size="12" fill="#3D3D3A">pr-worker</text>

  <!-- Lifelines (vertical dotted) -->
  <line x1="100" y1="60" x2="100" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="260" y1="60" x2="260" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="420" y1="60" x2="420" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="570" y1="60" x2="570" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>

  <!-- Activations (busy intervals) -->
  <rect x="96"  y="80"  width="8" height="340" fill="#E3DACC" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="256" y="100" width="8" height="100" fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="416" y="230" width="8" height="80"  fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="566" y="340" width="8" height="60"  fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>

  <!-- Message 1: dispatch → coding -->
  <line x1="104" y1="110" x2="256" y2="110" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="180" y="104" text-anchor="middle" font-size="11" fill="#3D3D3A">dispatch(task)</text>

  <!-- Message 2: changes_made → flow -->
  <line x1="256" y1="194" x2="108" y2="194" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="180" y="188" text-anchor="middle" font-size="11" fill="#4f5f3d">changes_made: true</text>

  <!-- Message 3: commit → commit-worker -->
  <line x1="104" y1="240" x2="416" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="260" y="234" text-anchor="middle" font-size="11" fill="#3D3D3A">commit + push</text>

  <!-- Message 4: commit done -->
  <line x1="416" y1="304" x2="108" y2="304" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="260" y="298" text-anchor="middle" font-size="11" fill="#4f5f3d">sha: abc1234</text>

  <!-- Message 5: create PR -->
  <line x1="104" y1="350" x2="566" y2="350" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="335" y="344" text-anchor="middle" font-size="11" fill="#3D3D3A">create PR</text>

  <!-- Message 6: PR url -->
  <line x1="566" y1="394" x2="108" y2="394" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="335" y="388" text-anchor="middle" font-size="11" fill="#4f5f3d">#1234</text>

  <text x="40" y="454" font-size="11" fill="#87867F">Solid: synchronous call / Dashed: return value or notification</text>
</svg>
</div>
```

**When to use and caveats:** Use for time-ordered interactions — API call sequences, orchestration, auth flows, distributed-system messaging. Lifelines are vertical dotted lines, and messages are solid horizontal lines (calls) plus dashed horizontal lines (returns). Activation rectangles (solid vertical bars) on lifelines emphasize busy intervals; for nesting, indent and overlap them.

### Codebase Structure Card (`.diagram-panel` / `.repo-line`) *(style.css §12-11)*

A pattern that stacks "file + line range + one-line description" entries vertically inside a thick-bordered card to visualize codebase structure. You can place both SVG flow diagrams and file lists inside `.diagram-panel`, so "this feature is made up of these 3 files" fits in a single block. Use it for the affected-files list in `design-review` or the "files touched" section of investigation reports.

```html
<div class="diagram-panel">
  <h3>Key files in the auth flow</h3>
  <div class="flow">
    <div class="repo-line">
      <span class="path">apps/web/middleware.ts</span>
      <span class="range">L1-L42</span>
      <span class="snippet">Redirect requests without a session to /login</span>
    </div>
    <div class="repo-line hot">
      <span class="path">packages/auth/session.ts</span>
      <span class="range">L80-L120</span>
      <span class="snippet"><code>resolveSession()</code>: cookie validation and DB lookup core</span>
    </div>
    <div class="repo-line">
      <span class="path">packages/auth/jwt.ts</span>
      <span class="range">L15-L35</span>
      <span class="snippet">JWT signature verification utility</span>
    </div>
  </div>
</div>
```

**Components:**

- `.diagram-panel`: Thick-bordered card (`var(--border)` 1.5px, `var(--bg-soft)` background, 12px radius)
- `.diagram-panel > h3`: Panel title (display font, 1.05rem)
- `.diagram-panel .flow`: Vertical container (can hold either SVG or a series of `.repo-line`s)
- `.repo-line`: 3-column grid (`path | range | snippet`; collapses to 1 column on mobile)
- `.repo-line .path`: File path (`var(--mono)`, `var(--clay)` color)
- `.repo-line .range`: Line range (`var(--mono)`, small, `var(--muted)`, `nowrap`)
- `.repo-line .snippet`: One-line description (body color)
- `.repo-line.hot`: Highlight row (`var(--warn-soft)` background + `var(--warn)` border; path/range follow warn-dark)

It's fine to mix an SVG flow diagram and `.repo-line`s inside one `.diagram-panel` (show structure with SVG first, then list the relevant files). Keep `.repo-line` to roughly 5–10 entries — split by category or wrap in `details.collapse` if you have more.

---

## Data

### Tables

```html
<table>
  <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>
  <tbody>
    <tr><td>...</td><td>...</td></tr>
  </tbody>
</table>
```

`style.css` auto-applies borders, header backgrounds, and alignment.

### Issue List Table (`.issue-list-table`) *(style.css §12-2)*

Show review findings as a 4-column table — **severity badge + title + target file + recommended action** — for Critical / High / Medium / Low. Use it in the `review-summary` template.

```html
<table class="issue-list-table">
  <thead>
    <tr>
      <th>Severity</th>
      <th>Issue</th>
      <th>Target file</th>
      <th>Recommended action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="tag gate">Critical</span></td>
      <td>Authorization check missing</td>
      <td><code>src/api/handler.ts</code></td>
      <td>Insert an auth gate before the middleware</td>
    </tr>
    <tr>
      <td><span class="tag worker">High</span></td>
      <td>Insufficient input validation</td>
      <td><code>src/parsers/input.ts</code></td>
      <td>Add boundary validation with a Zod schema</td>
    </tr>
    <tr>
      <td><span class="tag status">Medium</span></td>
      <td>Inconsistent log level configuration</td>
      <td><code>src/log/config.ts</code></td>
      <td>Unify the error / warn split policy</td>
    </tr>
    <tr>
      <td><span class="tag">Low</span></td>
      <td>Missing JSDoc comments</td>
      <td><code>src/utils/*.ts</code></td>
      <td>Optional</td>
    </tr>
  </tbody>
</table>
```

- The first column reuses existing `.tag` styles as severity badges (`.tag.gate` / `.tag.worker` / `.tag.status` / no modifier)
- A variant of the standard table, so it inherits `<table>` borders, padding, and header background
- Row hover highlight uses `var(--bg-soft)`

### Metric Grid (`.metric-grid`) *(style.css §12-7)*

Display numerical metrics as a grid of cards with a three-line structure: **large number + unit + label**. Use it in the impact section of the `postmortem` template, or for KPI displays in `status`-category reports.

```html
<div class="metric-grid">
  <div class="metric-card">
    <p class="number">12,420</p>
    <p class="unit">requests</p>
    <p class="label">Failed requests</p>
  </div>
  <div class="metric-card">
    <p class="number">348</p>
    <p class="unit">users</p>
    <p class="label">Affected users</p>
  </div>
  <div class="metric-card">
    <p class="number">2,180</p>
    <p class="unit">ms</p>
    <p class="label">Peak p99 latency</p>
  </div>
  <div class="metric-card">
    <p class="number">22</p>
    <p class="unit">min</p>
    <p class="label">Incident duration</p>
  </div>
</div>
```

- `.number` uses the display font at extra-large size (`var(--clay)`)
- `.unit` uses the mono font in a small size (`var(--muted)`)
- `.label` uses body size for the explanation (`var(--fg)`)
- Grid is `auto-fit` 200 px (4 across on desktop, 2 on mobile, 1 on very narrow screens)

### Postmortem Composite Pattern (`postmortem-timeline`)

A postmortem-specific layout combining `.status-header` + `.event-log` + `.metric-grid`. There is no new CSS class — it is documented as a composition pattern of existing components.

```html
<!-- 1. Top: status-header (ID / SEV / Status / Duration) -->
<div class="status-header">
  <dl>
    <div><dt>Incident ID</dt><dd>INC-2026-051</dd></div>
    <div><dt>Severity</dt><dd>SEV-2</dd></div>
    <div><dt>Status</dt><dd>RESOLVED</dd></div>
    <div><dt>Duration</dt><dd>22 min</dd></div>
  </dl>
</div>

<h2 id="tldr">TL;DR</h2>
<blockquote>At 14:02 a deployment-B-induced latency regression occurred. At 14:24 a rollback resolved it.</blockquote>

<!-- 2. Middle: event-log (chronological timeline) -->
<h2 id="timeline">Timeline</h2>
<div class="event-log">
  <div class="entry">
    <span class="dot impact"></span>
    <span class="time">14:02</span>
    <div class="body"><strong>Impact starts</strong>: Monitoring alert fired</div>
  </div>
  <div class="entry">
    <span class="dot mitigated"></span>
    <span class="time">14:18</span>
    <div class="body"><strong>Mitigated</strong>: Rolled back</div>
  </div>
  <div class="entry">
    <span class="dot resolved"></span>
    <span class="time">14:24</span>
    <div class="body"><strong>Resolved</strong>: Confirmed resolution</div>
  </div>
</div>

<!-- 3. Bottom: metric-grid (impact metrics) -->
<h2 id="impact">Impact</h2>
<div class="metric-grid">
  <div class="metric-card">
    <p class="number">12,420</p>
    <p class="unit">requests</p>
    <p class="label">Failed requests</p>
  </div>
  <div class="metric-card">
    <p class="number">348</p>
    <p class="unit">users</p>
    <p class="label">Affected users</p>
  </div>
</div>
```

This pattern is also used in `postmortem.html`. The three-tier layout — `.status-header` (meta) → `.event-log` (timeline) → `.metric-grid` (impact) — sequentially presents an incident report's "when, what, how much."

### Metric Tile (`.tile` / `.tile-grid`) *(style.css §12-13)*

A tile specialized for "status reports / weekly summaries" — more detailed than `.metric-grid` (§12-7). It packs **label + large number + delta vs previous period + sparkline** into a single tile to visualize trends. While `.metric-grid` is ideal for "numeric impact of an incident", `.tile-grid` is ideal for "ongoing KPI monitoring".

```html
<div class="tile-grid">
  <div class="tile">
    <span class="label">Issues closed</span>
    <p class="number">23</p>
    <p class="delta up">+5 vs last week</p>
    <div class="spark">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points="0,20 20,15 40,18 60,8 80,12 100,5"
                  fill="none" stroke="var(--clay)" stroke-width="2"/>
      </svg>
    </div>
  </div>
  <div class="tile">
    <span class="label">Open PRs</span>
    <p class="number">7</p>
    <p class="delta down">-2 vs last week</p>
  </div>
  <div class="tile">
    <span class="label">Merge rate</span>
    <p class="number">92<small>%</small></p>
    <p class="delta up">+3% vs last week</p>
  </div>
</div>
```

**Components:**

- `.tile-grid`: `auto-fit minmax(180px, 1fr)` grid (fixed 2 columns on mobile)
- `.tile`: Rounded card with `var(--bg-soft)` background + `var(--border)` 1.5px
- `.tile .label`: Top caption (mono, small, uppercase, `var(--muted)`)
- `.tile .number`: Large number (display font, 2.5rem, `var(--slate)`)
- `.tile .delta.up`: Upward trend (`var(--ok-dark)`)
- `.tile .delta.down`: Downward trend (`var(--danger-dark)`)
- `.tile .delta` (no variant): Neutral trend (`var(--muted)`)
- `.tile .spark`: 30px-tall sparkline area (embed inline SVG directly)

**When to use `.metric-grid` vs `.tile-grid`:**

| Component | Use | Components | Feel |
|-----------|-----|-----------|------|
| `.metric-grid` | Incident impact / one-off reports | number + unit + label | Emphasizes absolute magnitude |
| `.tile-grid` | Ongoing KPIs / weekly / trends | label + number + delta + spark | Emphasizes direction and trend |

Sparkline is optional. `stroke="var(--clay)"` inside the SVG automatically follows both light and dark themes (CSS variable based, no need to add entries to `[data-theme="dark"] .diagram svg` rules). For `.delta.up` / `.delta.down`, decide by "is bigger better?" — for bug counts a decrease is `.up`; for closed issues an increase is `.up`.

### Triage Board (`.board` / `.board-toolbar`) *(style.css §12-15)*

Lay out issues, PRs, or tasks across multiple lanes (Backlog / In progress / Review / Done, etc.) in a **kanban-style board**. Use `.board-toolbar` for the global filter + summary row and each `.board-lane` for state-based grouping. `.filter-active` highlights the currently selected filter.

```html
<div class="board-toolbar">
  <button class="board-btn filter-active">all</button>
  <button class="board-btn">P0</button>
  <button class="board-btn">P1</button>
  <button class="board-btn">epic</button>
  <span class="board-hintline">23 items · 4 lanes</span>
</div>
<div class="board">
  <section class="board-lane">
    <header class="board-lane-head">
      <h3>Backlog</h3>
      <span class="count">5</span>
    </header>
    <article class="board-item">
      <p class="board-item-title">#N HTML report rollout</p>
      <p class="board-item-meta">epic · 8 subs</p>
    </article>
    <article class="board-item">
      <p class="board-item-title">#N Gallery enhancements</p>
      <p class="board-item-meta">M · area:api</p>
    </article>
  </section>
  <section class="board-lane">
    <header class="board-lane-head">
      <h3>In progress</h3>
      <span class="count">3</span>
    </header>
    <article class="board-item">
      <p class="board-item-title">#N Add remaining 5 patterns</p>
      <p class="board-item-meta">S · area:api</p>
    </article>
  </section>
  <section class="board-lane">
    <header class="board-lane-head">
      <h3>Review</h3>
      <span class="count">2</span>
    </header>
  </section>
  <section class="board-lane">
    <header class="board-lane-head">
      <h3>Done</h3>
      <span class="count">13</span>
    </header>
  </section>
</div>
```

**Building blocks:**

- `.board`: `repeat(4, 1fr)` grid (collapses to 1 column on mobile)
- `.board-lane`: rounded column with `var(--bg-soft)` background + 1.5px border
- `.board-lane-head`: flex (h3 on the left, `.count` badge on the right) with a bottom border
- `.board-lane-head .count`: pill badge (`var(--bg)` background + border)
- `.board-item`: small card with `var(--bg)` background; border turns `var(--clay)` on hover
- `.board-item-title`: sans, small, `var(--fg-strong)` (issue titles, etc.)
- `.board-item-meta`: mono, x-small, `var(--muted)` (type / size / labels)
- `.board-toolbar`: top operations row, flex with button group + right-aligned `.board-hintline`
- `.board-btn`: pill button, `var(--bg-soft)` background, `var(--mono)` font
- `.board-btn.filter-active`: emphasizes the selected filter (`var(--clay)` background + `var(--ivory)` text)
- `.board-hintline`: right-edge summary text (mono, `var(--muted)`, with a `›` prefix)

Treat the board as a **static read-only snapshot**. Interactions like drag-and-drop are out of scope (implement separately in JS if needed). Cap lanes at 4 — 5+ won't fit even at mobile widths, so switch to another representation (table, etc.).

### Config Values (`.flag-list` / `.flag-info` / `.flag-key`) *(style.css §12-17)*

List feature flags, config values, or environment variables as a **3-tier "key + value + description"** column. Use it in `config-reference`-style docs, flag snapshots at release time, or settings panes during debugging.

```html
<div class="flag-list">
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">enable_html_reports</code>
      <span class="flag-value">true</span>
    </div>
    <p class="flag-desc">Enables converting review comments to HTML. Only converts when the threshold is exceeded.</p>
  </div>
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">html_report_threshold_lines</code>
      <span class="flag-value">80</span>
    </div>
    <p class="flag-desc">Report body line threshold. Above this, the report is converted to HTML.</p>
  </div>
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">html_report_output_dir</code>
      <span class="flag-value">"reports/"</span>
    </div>
    <p class="flag-desc">Output directory for HTML reports. Path is relative to the repository root.</p>
  </div>
</div>
```

**Building blocks:**

- `.flag-list`: vertical flex (gap 0.6rem)
- `.flag-info`: rounded card (10px radius) with `var(--bg-soft)` background + 1.5px border
- `.flag-row`: flex (key on the left, value on the right, flex-wrap enabled)
- `.flag-key`: inline-code look (mono, `var(--clay)` text, `var(--bg)` background, small radius)
- `.flag-value`: mono, `var(--ok-dark)` text (true / number / string in monospace)
- `.flag-desc`: sans, small, `var(--muted)` description

**`<table>` vs `.flag-list`:**

| Component | Use | Visual |
|-----------|-----|--------|
| `<table>` | Many columns (key + value + type + default + ...) | Optimized for scanning a matrix |
| `.flag-list` | key + value + 1-sentence description | Easier vertical reading |

`.flag-list` works best when there are ≤10 items and each description fits in 1–2 sentences. For many columns, prefer `<table>` or `.issue-list-table`. The `.flag-value` color is currently flat; future branches like `.flag-value.bool` could split by value type, but for now treat it as a single color.

---

## Meta

### Meta Info Footer (`.meta`)

```html
<div class="meta">
  <strong>File</strong>: <code>docs/explainers/.../index.html</code><br>
  <strong>Source</strong>: related Issue / Discussion / ADR<br>
  <strong>Purpose</strong>: ...
</div>
```

---

## Anti-patterns

| ❌ Don't do | ✅ Do this instead |
|-------------|--------------------|
| Lay out 7 steps as horizontal arrows | Use `<ol class="timeline">` (vertical list + chips) |
| Use raw colors like `#000` / `#fff` | Use palette variables (`var(--fg)` / `var(--bg)`) |
| Omit `fill` on SVG `<text>` | Always set `fill` (or intentionally omit it to follow body color) |
| Decorative circles or lines | A diagram or numbered list that conveys content |
| Heading depth ≥ 5 | `h1`→`h2`→`h3`→`h4` is enough; avoid `h5+` |
| 5+ SVGs per page | Limit to 1–3 key diagrams (cognitive load) |
| Mix Before/After into `.card-grid` | Use the dedicated `.before-after` (fixed semantic colors) |
| Decorative overuse of `.summary-card` | At most one summary per section, at the end |

---

## Color Palette Quick Reference

| Role | Variable | Light | Dark |
|------|----------|-------|------|
| Background | `--bg` | `#FAF9F5` ivory | `#1f1d1a` warm dark |
| Body text | `--fg` | `#3D3D3A` gray-700 | `#d4d0c4` warm light |
| Strong heading | `--slate` / `--fg-strong` | `#141413` | `#f5f2ea` |
| Accent | `--clay` | `#D97757` | `#e89377` |
| Green | `--olive` | `#788C5D` | `#a5b07e` |
| Warm tan | `--oat` | `#E3DACC` | `#3d342a` |
| Border | `--border` | `#D1CFC5` | `#44413c` |
| muted | `--muted` | `#87867F` | `#9b988d` |

Semantic variables (`--accent` / `--ok` / `--warn` / `--danger` / `--purple`) are available at the same variable layer as the body.

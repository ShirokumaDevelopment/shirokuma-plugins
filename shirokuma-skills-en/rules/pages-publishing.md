# Pages Site (pages/ submodule) Operations Rule

`pages/` is a submodule that serves a static site. It is the public-docs store for HTML explainers, review results, incident reports, etc. linked from Issues / PRs / Discussions, and holds the single-page HTML that the `writing-html-explainer` skill generates.

**The only required operation is: "whenever you update `pages/`, push the submodule to `main`."** The deploy mechanism is handled by the hosting side, so you do not need to think about the delivery method (with GitHub Pages, a push to `main` deploys; with a local self-hosted setup, the push keeps the canonical repo in sync).

## Configuration (the `pages` section of `.shirokuma/config.yaml`)

```yaml
pages:
  submodulePath: pages                  # submodule path
  repo: <org>/<pages-repo>              # public docs repo
  baseUrl: https://example.com          # base of the public URL (for link generation)
  defaultBranch: main
  categories:                           # directory ↔ purpose
    specs:       { title: Specs,        path: specs/{topic}/ }
    explainers:  { title: Explainers,   path: explainers/{topic}/ }
    reviews:     { title: Reviews,      path: reviews/{topic}/ }
    incidents:   { title: Incidents,    path: incidents/{topic}/ }
    issues:      { title: Issues,       path: issues/{number}/ }
    prs:         { title: PRs,          path: prs/{number}/ }
    discussions: { title: Discussions,  path: discussions/{number}/ }
    status:      { title: Status,       path: status/{topic}/ }
```

## Initial Setup (adopting pages in a new project)

1. Prepare a docs repo. For GitHub Pages, **public** is recommended. The **site assumes root-domain serving** (each page uses absolute paths like `/assets/...`), so prefer a custom domain (CNAME) or an org-pages repo (`<org>.github.io`). Avoid project-pages subpath serving (`<org>.github.io/<repo>/`) because absolute paths break there
2. Add it as a submodule on the parent repo: `git submodule add <repo-url> pages`
3. Define the `pages` section above in `.shirokuma/config.yaml`
4. Place the shared assets and builder from `writing-html-explainer`'s `reference/`:
   - `style.css` / `theme.js` / `modern-normalize.css` under `pages/assets/`
   - Copy the index builder `build-pages-index.mjs` to the project's `scripts/` (or similar)
5. Create `pages/.nojekyll` (disables GitHub Pages' Jekyll processing so `/assets/` etc. serve as-is)
6. Enable GitHub Pages (repo Settings → Pages → Source: `main` / root). For a custom domain, create `pages/CNAME`
7. Update `pages.baseUrl` to the finalized public URL

## Publishing Workflow

The `writing-html-explainer` skill automates the steps below. Manual steps:

```bash
cd pages
# 1. Generate the page (reference template + assets; each page is {category}/{topic}/index.html)
# 2. Regenerate the index (data in index.json, index.html is a light shell)
node ../scripts/build-pages-index.mjs --title "<site title>" --lang en
# 3. Push to main (← required; this is what publishes the change)
git add . && git commit -m "docs: add {topic}" && git push origin main
# 4. Back in the parent repo, advance the submodule pointer
cd .. && git add pages && git commit -m "chore(pages): bump submodule for {topic}"
```

> **Required**: step 3 (the submodule push to `main`). Whatever the delivery method, nothing is published until you push.

## Directory ↔ URL Mapping

Follows `pages.categories`. URLs are `{baseUrl}/{category}/{topic-or-number}/`.

| Category | Path | Purpose |
|---------|------|---------|
| `specs` | `specs/{topic}/` | Permanent specs (skills, rules, workflows, CLI reference) |
| `explainers` | `explainers/{topic}/` | Issue-specific supplement pages (temporary, hand-written, tied to a specific Issue) |
| `reviews` | `reviews/{topic}/` | Code / design / security review results |
| `incidents` | `incidents/{topic}/` | Incidents / postmortems |
| `issues` | `issues/{number}/` | Issue supplements |
| `prs` | `prs/{number}/` | PR supplements |
| `discussions` | `discussions/{number}/` | Discussion (ADR / RFC) supplements |
| `status` | `status/{topic}/` | Progress / period reports |

For the report-type ↔ category mapping and slug conventions used by reporting skills, see [`html-report-criteria.md`](./html-report-criteria.md) §4.

## Index Page (`build-pages-index.mjs`)

Scans `pages/` and generates two files:

- `pages/index.json` — manifest of all entries (with each page's **git last-updated time `updatedAt` and first-commit time `createdAt`**)
- `pages/index.html` — a light shell with the search UI (fetches `index.json` and renders)

The index is a **newest-first feed** (for glancing at recent pages). You can **toggle between sort-by-updated and sort-by-created**; each row shows the timestamp (YYYY-MM-DD HH:mm) and category. Only the top entries are shown with a "Show more" button, and search covers all entries. Even when a bulk change lines up all the updated times, sort-by-created still distinguishes newly added pages. Because entries live in JSON, **`index.html` stays a constant size even as pages grow**, so the initial load does not get heavy. Args: `--title <site title>` / `--lang ja|en` / `--root <pages dir>` (default `./pages`).

## File Naming

- Each page is `{category}/{topic}/index.html`
- Shared assets live in `pages/assets/` (referenced from each page via the absolute path `/assets/...`)
- Do not write `<aside class="toc">` in the page (`theme.js` generates the sidebar, TOC, and nav)

## Notes

- It is a **public site**, so do not include secrets (verify that any code snippets / screenshots are OK to publish)
- Never change a published URL (avoids broken links from Issues / PRs)
- Prefer a "Deprecated" mark (stated in the page) over deleting old material
- When the delivery method / domain changes, update `pages.baseUrl`
- Modern browsers only (modern CSS / JS such as `:has()` may be used)

#!/usr/bin/env node
// pages/ submodule 配下の全 index.html をスキャンし、検索付きの「更新順フィード」索引を生成する。
//
// 出力:
//   pages/index.json  — 全エントリのマニフェスト（更新日時の新しい順にソート済み）
//   pages/index.html  — 軽量シェル（検索 UI + index.json を fetch して描画する inline script）
//
// 索引は「最近更新されたページをパッと見る」ためのフィード。各ページの更新日時は
// git の最終コミット日時（未コミットの新規ページはファイル mtime）で決まる。
// エントリを JSON に分離するため、ページ数が増えても index.html のサイズは一定。依存なし（Node 標準のみ）。
//
// Usage:
//   node build-pages-index.mjs [--root <pages dir>] [--title <site title>] [--lang ja|en]
// 既定: --root ./pages, --title "Documentation", --lang ja

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

// ---- 引数 ----
const argv = process.argv.slice(2);
const getArg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const ROOT = resolve(process.cwd(), getArg('--root', 'pages'));
const SITE_TITLE = getArg('--title', 'Documentation');
const LANG = getArg('--lang', 'ja') === 'en' ? 'en' : 'ja';
const OUTPUT_HTML = join(ROOT, 'index.html');
const OUTPUT_JSON = join(ROOT, 'index.json');

// ---- ローカライズ ----
const T = {
  ja: { suffix: '索引', headingUpdated: '最近の更新', headingCreated: '最近の作成', sortUpdated: '更新順', sortCreated: '作成順', placeholder: 'タイトル・カテゴリで絞り込み', noMatch: '該当するページがありません。', toggle: 'テーマ切替', more: 'もっと見る（残り {n} 件）', lead: '{n} 件' },
  en: { suffix: 'Index', headingUpdated: 'Recently updated', headingCreated: 'Recently created', sortUpdated: 'Updated', sortCreated: 'Created', placeholder: 'Filter by title or category', noMatch: 'No matching pages.', toggle: 'Toggle theme', more: 'Show more ({n} remaining)', lead: '{n} items' },
}[LANG];

// 既知カテゴリの表示ラベル（未知カテゴリはディレクトリ名をそのまま使う）
const CATEGORY_LABELS = {
  ja: { specs: '仕様書', explainers: '詳細解説', reviews: 'レビュー結果', status: 'ステータス報告', incidents: '障害報告', issues: 'Issue 補足', prs: 'PR 補足', discussions: 'Discussion 補足' },
  en: { specs: 'Specs', explainers: 'Explainers', reviews: 'Reviews', status: 'Status', incidents: 'Incidents', issues: 'Issues', prs: 'PRs', discussions: 'Discussions' },
}[LANG];
const labelFor = (key) => CATEGORY_LABELS[key] || key;

// 初期表示件数（これを超える分は「もっと見る」で表示。検索時は全一致を表示）
const INITIAL_COUNT = 30;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function extractTitle(filepath) {
  const html = await readFile(filepath, 'utf8');
  const t = html.match(/<title>([^<]*)<\/title>/i);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return (t?.[1] || h1?.[1] || '').replace(/<[^>]+>/g, '').trim();
}

// git のコミット日時（ISO）を一度の log で取得。新しい順に並ぶので先頭=最終更新、末尾=作成（初回）。
// 未コミット / 非 git の場合は null。
function gitDates(relDir) {
  try {
    const out = execFileSync('git', ['-C', ROOT, 'log', '--format=%cI', '--', relDir], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!out) return { created: null, updated: null };
    const lines = out.split('\n');
    return { updated: lines[0], created: lines[lines.length - 1] };
  } catch { return { created: null, updated: null }; }
}

async function timestamps(relDir, indexPath) {
  const g = gitDates(relDir);
  let fallback = null;
  if (!g.updated || !g.created) {
    try { fallback = (await stat(indexPath)).mtime.toISOString(); } catch { fallback = new Date().toISOString(); }
  }
  return { createdAt: g.created || fallback, updatedAt: g.updated || fallback };
}

async function scan() {
  const items = [];
  let cats;
  try { cats = await readdir(ROOT, { withFileTypes: true }); } catch { return items; }
  for (const cat of cats) {
    if (!cat.isDirectory()) continue;
    if (cat.name === 'assets' || cat.name.startsWith('.')) continue; // assets/ や .nojekyll を除外
    let topics;
    try { topics = await readdir(join(ROOT, cat.name), { withFileTypes: true }); } catch { continue; }
    for (const t of topics) {
      if (!t.isDirectory()) continue;
      const relDir = `${cat.name}/${t.name}`;
      const indexPath = join(ROOT, cat.name, t.name, 'index.html');
      let title;
      try { title = await extractTitle(indexPath); } catch { continue; } // index.html が無いディレクトリはスキップ
      const { createdAt, updatedAt } = await timestamps(relDir, indexPath);
      items.push({ title: title || t.name, url: `/${relDir}/`, slug: t.name, category: cat.name, categoryLabel: labelFor(cat.name), createdAt, updatedAt });
    }
  }
  return items;
}

function buildManifest(items) {
  // 更新日時の新しい順。同時刻は URL 昇順。
  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.url.localeCompare(b.url, LANG)));
  return { siteTitle: SITE_TITLE, lang: LANG, generatedAt: new Date().toISOString(), total: items.length, items };
}

function renderShell() {
  // index.html は検索 UI と描画スクリプトのみ（固定サイズ）。エントリは index.json から取得する。
  return `<!DOCTYPE html>
<html lang="${LANG}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(SITE_TITLE)} — ${T.suffix}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kosugi+Maru&family=M+PLUS+Rounded+1c:wght@500;700&family=M+PLUS+1+Code:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css?v=20">
<script src="/assets/theme.js?v=4" defer></script>
<style>
/* 索引ページ専用スタイル */
body.index-page { display: block; padding: 0; }
.index-header { background: var(--bg-soft); border-bottom: 1px solid var(--border); padding: 2rem 1.5rem 1.5rem; }
.index-header-inner { max-width: 920px; margin: 0 auto; position: relative; }
.index-header h1 { font-family: var(--display); font-weight: 700; font-size: 2rem; color: var(--slate); margin: 0 0 0.4rem; border: none; padding: 0; }
.index-header .lead { font-family: var(--mono); font-size: 0.82rem; color: var(--muted); margin: 0 0 1.2rem; letter-spacing: 0.04em; }
.index-header .theme-toggle { position: absolute; top: 0; right: 0; width: auto; margin: 0; }
.search-input { width: 100%; box-sizing: border-box; padding: 0.7rem 1rem; font-family: var(--sans); font-size: 1rem; border: 1.5px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--fg); transition: border-color 0.15s ease; }
.search-input:focus { outline: none; border-color: var(--clay); }
.index-main { max-width: 920px; margin: 0 auto; padding: 1.5rem 1.5rem 4rem; }
.feed-head { display: flex; align-items: center; justify-content: space-between; gap: 0.8rem; flex-wrap: wrap; margin: 0 0 0.8rem; }
.feed-heading { font-family: var(--display); font-weight: 700; font-size: 1.1rem; color: var(--slate); margin: 0; }
.sort-toggle { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.sort-btn { font-family: var(--sans); font-size: 0.82rem; padding: 0.35rem 0.9rem; background: var(--bg); color: var(--muted); border: none; cursor: pointer; transition: background 0.15s ease, color 0.15s ease; }
.sort-btn + .sort-btn { border-left: 1px solid var(--border); }
.sort-btn.active { background: var(--oat); color: var(--slate); font-weight: 700; }
.page-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.4rem; }
.page-item a { display: flex; align-items: baseline; justify-content: space-between; gap: 0.8rem; padding: 0.7rem 1rem; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--fg); transition: background 0.15s ease, border-color 0.15s ease; }
.page-item a:hover { background: var(--bg-soft); border-color: var(--clay); }
.page-title { font-family: var(--display); font-weight: 500; font-size: 1rem; color: var(--slate); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-meta { display: flex; align-items: baseline; gap: 0.6rem; flex-shrink: 0; }
.page-cat { font-family: var(--mono); font-size: 0.7rem; background: var(--oat); color: var(--gray-700); padding: 0.1rem 0.5rem; border-radius: 6px; }
.page-date { font-family: var(--mono); font-size: 0.78rem; color: var(--muted); letter-spacing: 0.02em; }
.show-more-wrap { text-align: center; margin: 1.2rem 0 0; }
.show-more { font-family: var(--sans); font-size: 0.9rem; color: var(--clay); background: none; border: 1px solid var(--border); border-radius: 8px; padding: 0.55rem 1.4rem; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
.show-more:hover { background: var(--bg-soft); border-color: var(--clay); }
.no-match { text-align: center; color: var(--muted); font-style: italic; margin: 2rem 0; }
@media (max-width: 560px) {
  .page-item a { flex-direction: column; gap: 0.25rem; }
  .page-title { white-space: normal; }
}
</style>
</head>
<body class="index-page">

<header class="index-header">
  <div class="index-header-inner">
    <button id="theme-toggle" class="theme-toggle" type="button" aria-label="${escapeHtml(T.toggle)}">
      <span class="icon" id="theme-icon">🌙</span>
      <span id="theme-label">Dark mode</span>
    </button>
    <h1>${escapeHtml(SITE_TITLE)}</h1>
    <p class="lead" id="index-lead"></p>
    <input id="search-input" class="search-input" type="search" placeholder="${escapeHtml(T.placeholder)}" autocomplete="off">
  </div>
</header>

<main class="index-main">
  <div class="feed-head">
    <h2 class="feed-heading" id="feed-heading">${escapeHtml(T.headingUpdated)}</h2>
    <div class="sort-toggle" role="group" aria-label="sort">
      <button class="sort-btn active" id="sort-updated" type="button">${escapeHtml(T.sortUpdated)}</button>
      <button class="sort-btn" id="sort-created" type="button">${escapeHtml(T.sortCreated)}</button>
    </div>
  </div>
  <ul class="page-list" id="page-list"></ul>
  <p class="no-match" id="no-match" hidden>${escapeHtml(T.noMatch)}</p>
  <div class="show-more-wrap" id="show-more-wrap" hidden>
    <button class="show-more" id="show-more" type="button"></button>
  </div>
</main>

<script>
(function () {
  const I18N = ${JSON.stringify({ lead: T.lead, more: T.more, headingUpdated: T.headingUpdated, headingCreated: T.headingCreated })};
  const INITIAL = ${INITIAL_COUNT};
  const list = document.getElementById('page-list');
  const noMatch = document.getElementById('no-match');
  const lead = document.getElementById('index-lead');
  const input = document.getElementById('search-input');
  const moreWrap = document.getElementById('show-more-wrap');
  const moreBtn = document.getElementById('show-more');
  const heading = document.getElementById('feed-heading');
  const btnUpdated = document.getElementById('sort-updated');
  const btnCreated = document.getElementById('sort-created');
  const esc  = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFKC');

  let all = [];
  let query = '';
  let limit = INITIAL;
  let sortKey = 'updated'; // 'updated' | 'created'

  // ソート対象の日時（作成順なら createdAt、更新順なら updatedAt。欠損時はもう片方で代替）
  const dateOf = (it) => (sortKey === 'created' ? (it.createdAt || it.updatedAt) : (it.updatedAt || it.createdAt)) || '';

  const matches = (it) => !query
    || norm(it.title).includes(query)
    || norm(it.url).includes(query)
    || norm(it.categoryLabel).includes(query);

  function sortItems() {
    all.sort((a, b) => { const av = dateOf(a), bv = dateOf(b); return av < bv ? 1 : av > bv ? -1 : a.url.localeCompare(b.url); });
  }

  function row(it) {
    const li = document.createElement('li');
    li.className = 'page-item';
    // ソート中の日時を「YYYY-MM-DD HH:mm」で表示（ISO の先頭 16 文字 = コミッタのローカル日時）
    const dt = dateOf(it).slice(0, 16).replace('T', ' ');
    li.innerHTML = '<a href="' + esc(it.url) + '">'
      + '<span class="page-title">' + esc(it.title) + '</span>'
      + '<span class="page-meta"><span class="page-cat">' + esc(it.categoryLabel) + '</span><span class="page-date">' + esc(dt) + '</span></span>'
      + '</a>';
    return li;
  }

  function setSort(key) {
    sortKey = key;
    btnUpdated.classList.toggle('active', key === 'updated');
    btnCreated.classList.toggle('active', key === 'created');
    heading.textContent = key === 'created' ? I18N.headingCreated : I18N.headingUpdated;
    limit = INITIAL;
    sortItems();
    render();
  }

  function render() {
    const filtered = all.filter(matches);
    const showAll = query !== '';
    const slice = showAll ? filtered : filtered.slice(0, limit);
    list.innerHTML = '';
    const frag = document.createDocumentFragment();
    slice.forEach((it) => frag.appendChild(row(it)));
    list.appendChild(frag);
    noMatch.hidden = filtered.length > 0;
    const remaining = filtered.length - slice.length;
    moreWrap.hidden = showAll || remaining <= 0;
    if (!moreWrap.hidden) moreBtn.textContent = I18N.more.replace('{n}', remaining);
  }

  fetch('index.json').then((r) => r.json()).then((data) => {
    all = Array.isArray(data.items) ? data.items : [];
    lead.textContent = I18N.lead.replace('{n}', data.total != null ? data.total : all.length);
    sortItems();
    render();
  }).catch(() => { if (lead) lead.textContent = '⚠ index.json'; });

  btnUpdated.addEventListener('click', () => setSort('updated'));
  btnCreated.addEventListener('click', () => setSort('created'));
  moreBtn.addEventListener('click', () => { limit = Infinity; render(); });
  input.addEventListener('input', () => { query = norm(input.value.trim()); limit = INITIAL; render(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; query = ''; limit = INITIAL; render(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); input.select(); }
  });
})();
</script>

</body>
</html>
`;
}

(async () => {
  const items = await scan();
  const manifest = buildManifest(items);
  await writeFile(OUTPUT_JSON, JSON.stringify(manifest) + '\n', 'utf8');
  await writeFile(OUTPUT_HTML, renderShell(), 'utf8');
  console.log(`✓ Generated ${OUTPUT_HTML}`);
  console.log(`✓ Generated ${OUTPUT_JSON}`);
  console.log(`  ${manifest.total} pages (newest first, lang=${LANG})`);
  for (const it of manifest.items.slice(0, 5)) console.log(`    - ${(it.updatedAt || '').slice(0, 16).replace('T', ' ')}  ${it.url}`);
})();

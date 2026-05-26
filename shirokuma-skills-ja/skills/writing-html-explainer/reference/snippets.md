# HTML Explainer 部品カタログ

このファイルは `writing-html-explainer` スキルが使う **再利用可能 HTML 部品** のリファレンス。
HTML を埋めるときは以下のパターンから選択してコピーし、内容を差し替える。

## カテゴリ一覧（逆引き）

| カテゴリ | 部品 | 用途 |
|---------|------|------|
| ナビゲーション | `aside.toc`（サイドバー目次） | 章選択・非線形読み |
| レイアウト | `.hero`、`.card-grid`、`.code-visual`、`.before-after`、`.status-header`、`.artboard` | ページ構造・視覚整理・メタ表示・設計案並列展示 |
| 強調 | `.summary-card`、`.qbox`、`blockquote` バリアント、`.cta-link`、`.review-score-card`、`.action-items`、`.approach` / `.tradeoffs`、`.bubble` / `.checklist`、`.decision-card` | 重要情報の引き出し・意思決定の記録 |
| 階層 | `details.collapse`、`.phase-card`、`.card.variant .card-titles` | 情報の折り畳み・章立て・カード見出し階層 |
| フロー | `.timeline`、`.event-log`、`.milestone-timeline` | 手順・時系列・期間グルーピング |
| 装飾 | `.tag` / `.t-tag`、`.badge`（5 バリアント）、`.chip` | インラインラベル・状態バッジ |
| 図解 | SVG（`.diagram`）、`.diagram-panel` / `.repo-line` | フロー・関係図・コードベース構造 |
| データ | `<table>`、`.issue-list-table`、`.metric-grid`、`.tile` / `.tile-grid`、`.board`、`.flag-list` | 表形式データ・メトリクスカード・トレンドタイル・カンバンボード・設定値表示 |
| メタ | `.meta` | ファイル情報フッター |

---

## ナビゲーション系

### サイドバー目次（`aside.toc`）

長文ページの常設目次。`position: sticky` で常に見える。**`<aside class="toc">` は手書きしない** — `theme.js` がテーマトグル・目次（本文の `<h2>` から自動生成）・ナビゲーションを含めて丸ごと生成する。ページ HTML 側に必要なのは `<main>` 本文のみ。

```html
<!-- HTML 側はこれだけ。aside は theme.js が <body> 直下に生成する -->
<body data-parent-href="/specs/skills-overview/" data-parent-label="全体索引">
<main>
  <h1>...</h1>
  <h2 id="sec-1">大項目</h2>   <!-- ← 目次はこの <h2> から作られる -->
  ...
</main>
</body>
```

- 目次は `<main>` 直下の `<h2>` のみを対象に自動生成（h3 以下は載らない）。表示テキストは先頭の "N. " 番号を除去
- `<h2>` に `id` を付けると安定アンカーになる（未指定なら JS が slug を自動付与）
- ナビゲーション: **ドキュメントルート（`/`）へのリンクは常に自動付与**。親（上位）ページが必要なら `<body data-parent-href="..." data-parent-label="...">` で定義する（不要なら属性ごと省略）
- モバイル幅（< 900px）で `position: static` に切替・上部に折り畳み

---

## レイアウト系

### ヒーロー（`.hero`）

ページ冒頭で「このページは何か」を強く示す。タイトル + リード文 + タグの 3 要素構成。

```html
<div class="hero">
  <p class="eyebrow">EXPLAINER · 2026-05-17</p>
  <h1>shirokuma-flow ワークフロー詳細レビュー</h1>
  <p class="lead">Issue ライフサイクル全体を 4 フェーズで整理し、Status 遷移と担当 worker の対応関係を解説する。</p>
  <div class="tags">
    <span class="tag orch">orchestrator</span>
    <span class="tag worker">worker</span>
    <span class="tag gate">gate</span>
  </div>
</div>
```

- `eyebrow` は省略可（日付・カテゴリ・上位概念などを置く）
- `h1` でも `h2` でも使える（`border-bottom: none` でリセット済み）
- 左ボーダー: `var(--clay)` 4px、背景: `var(--bg-soft)`

### カード比較グリッド（`.card-grid`）

3〜4 件の選択肢・観点を横並びで比較する。`auto-fit` で幅が足りなければ自動折り返し。

```html
<div class="card-grid">
  <div class="card">
    <h3>選択肢 A</h3>
    <p>説明文をここに。</p>
    <a class="cta-link" href="#detail-a">詳細を見る</a>
  </div>
  <div class="card">
    <h3>選択肢 B</h3>
    <p>説明文をここに。</p>
    <a class="cta-link" href="#detail-b">詳細を見る</a>
  </div>
  <div class="card">
    <h3>選択肢 C</h3>
    <p>説明文をここに。</p>
    <a class="cta-link" href="#detail-c">詳細を見る</a>
  </div>
</div>
```

- 最小幅 240px、`auto-fit` で自動列数
- hover で `border-color: var(--clay)` + `background: var(--bg-soft)` を 150ms transition
- モバイル幅で 1 カラム

### コード+ビジュアル並置（`.code-visual`）

「コード ↔ 結果」「ソース ↔ 図解」を左右に並べて理解を助ける。

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

- `pre` 背景: `var(--code-bg)`、`.visual` 背景: `var(--bg-soft)`
- 左右の高さは `align-items: stretch` で揃う
- モバイル幅で上下 1 カラム

### Before/After 比較（`.before-after`）

修正前後・移行前後を意味的に色分けして並べる。色は固定（Before = danger、After = ok）。

```html
<div class="before-after">
  <div class="before">
    <h4>Before</h4>
    <pre><code>const x = data.map(d =&gt; d.id);</code></pre>
    <p>非同期処理を考慮していない</p>
  </div>
  <div class="after">
    <h4>After</h4>
    <pre><code>const x = await Promise.all(data.map(d =&gt; fetchId(d)));</code></pre>
    <p>I/O 待ちを並列化</p>
  </div>
</div>
```

- Before: `var(--danger-soft)` 背景 + `var(--danger)` 左ボーダー
- After: `var(--ok-soft)` 背景 + `var(--ok)` 左ボーダー
- 意味的な色分けが固定のため `.card-grid` とは別部品

### ステータスヘッダー（`.status-header`） *(style.css §12-4)*

ページ冒頭で **ID / SEV / Status / Duration** のような 4 軸メタ情報を一望させる。`postmortem` テンプレートの直下、または計画書ヒーロー直下のメタ表示で使用。

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

- 内側 `<dl>` は CSS Grid（4 列 auto-fit）で配置
- `<dt>` は mono フォントの小さなラベル（`var(--muted)`）
- `<dd>` は display フォントで値を強調（`var(--slate)`）
- 背景: `var(--bg-soft)`、左ボーダー: `var(--clay)`（`.hero` と同系のメタ表示）
- モバイル幅では 2 列に折り返し

### アートボード（`.artboard` / `.artboards`） *(style.css §12-16)*

設計案・ビジュアルバリエーション・UI モックを **複数フレームの並列展示** で見せる。`design-review` の「方向性候補」セクション、デザイン探索の比較ボードなどで使用。1 枚あたり「フレーム + ラベル + 根拠」の 3 段構成。

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
    <p class="artboard-rationale">短いコメントを編集中に書ける。コンテキスト切替なし。</p>
  </div>
  <div class="artboard es-b">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option B · Floating panel</p>
    <p class="artboard-rationale">独立した編集領域、複数案を行き来できる。</p>
  </div>
  <div class="artboard es-c">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option C · Modal review</p>
    <p class="artboard-rationale">フルスクリーンで集中レビュー。文脈は失う。</p>
  </div>
  <div class="artboard es-d">
    <div class="artboard-frame">...</div>
    <p class="artboard-label">Option D · Sidebar drawer</p>
    <p class="artboard-rationale">サイドバー固定で常時参照可。狭い画面では干渉。</p>
  </div>
</div>
```

**構成要素:**

- `.artboards`: `auto-fit minmax(280px, 1fr)` の grid（モバイル幅で 1 カラム化）
- `.artboard`: `var(--bg)` 背景 + 1.5px border の角丸カード
- `.artboard-frame`: 16:10 アスペクト比、`var(--bg-soft)` 背景、内部の SVG/図を中央配置
- `.artboard-label`: display フォント・700、`var(--slate)`
- `.artboard-rationale`: italic・small、`var(--muted)`
- `.es-a` / `.es-b` / `.es-c` / `.es-d`: フレーム上端の `border-top` 色（順に `--clay` / `--olive` / `--purple` / `--accent`）。意味付けは「色 = 案ID」として固定化する

`.artboards` は 2〜4 案までを並列展示する用途に最適。5 案以上は `details.collapse` で折り畳むか、別ページに分離する。フレーム内は SVG・画像・スクリーンショット・テキストモックのいずれでも可。

---

## 強調系

### サマリーカード（`.summary-card`）

セクションのまとめ・重要事項・確認済み事項を 1 ブロックに集約。3 バリアント。

```html
<div class="summary-card warn">
  <span class="label">重要</span>
  <p>このセクションの主要な発見を 1〜2 文で要約する。</p>
</div>

<div class="summary-card ok">
  <span class="label">確認済み</span>
  <p>検証済みの事実・確定事項を示す。</p>
</div>

<div class="summary-card">
  <span class="label">補足</span>
  <p>中立的な追加情報。</p>
</div>
```

**バリアント:**

| クラス | 背景 | 左ボーダー | label 色 | 用途 |
|--------|------|----------|---------|------|
| `.summary-card.warn` | `var(--warn-soft)` | `var(--warn)` | `var(--warn-dark)` | 注意・重要事項 |
| `.summary-card.ok` | `var(--ok-soft)` | `var(--ok)` | `var(--ok-dark)` | 確認済み・成功 |
| `.summary-card`（無印） | `var(--bg-soft)` | `var(--border)` | `var(--muted)` | 中立補足 |

### Q ボックス（`.qbox`）

```html
<div class="qbox">議論したい論点。これに <code>code</code> や <strong>強調</strong> も含められる。</div>

<!-- 決定済の論点（緑 + ✓） -->
<div class="qbox resolved">決定済の論点。承認・確定した設計判断を記録する。</div>
```

紫の枠 + 左に `Q` バッジ。本文中で「ここを判断したい」点を目立たせる。
`.qbox.resolved`（緑 + `✓`）は**決定済**の論点用。

**設計論点セクションの構成規約**: 「設計論点」「未解決の論点」等のセクションでは、**未解決（`.qbox`）を上、決定済（`.qbox.resolved`）を下**に分け、`### 未解決` / `### 決定済` の小見出しで区切る。決定済を下に沈めることで「いま判断が要るもの」が上部に集まり、可読性が上がる。

**論点には必ず「提案」を併記する**: 未解決の `.qbox` は `問題:`（何が論点か）だけでなく **`提案:`（推奨する決定）** を書く。提案が無い論点は読者が次に何を決めればよいか分からず放置されやすい。「整理する」「検討する」で終わらせず、たたき台の結論まで書く。

### コールアウト blockquote

```html
<blockquote>通常の引用・前置き</blockquote>
<blockquote class="callout">成功・確定事項（緑左ボーダー）</blockquote>
<blockquote class="warn">既知の問題・注意（黄背景・amber 左ボーダー）</blockquote>
<blockquote class="question">未解決の問い（紫背景）</blockquote>
```

### 矢印 CTA リンク（`.cta-link`）

カード内などで「詳細へ」「設計を見る」のような誘導リンクを目立たせる。

```html
<a class="cta-link" href="#detail">詳細を見る</a>
<a class="cta-link" href="https://example.com">外部リンクへ</a>
```

- 色: `var(--clay)`、フォント: `var(--display)`
- `::after` で ` →` を自動付与（HTML 側に矢印を書かない）
- hover で下線（color: `var(--clay)`、offset: 0.2em）

### レビュースコアカード（`.review-score-card`） *(style.css §12-1)*

レビュー結果の総合判定（PASS / FAIL / NEEDS_REVISION）を 1 ブロックで強調表示。`review-summary` / `design-review` テンプレートの冒頭で使用する。バリアント 3 種:

```html
<div class="review-score-card pass">
  <span class="label">判定</span>
  <p class="score">PASS</p>
  <p class="hint">主要な観点を全て満たしています</p>
</div>

<div class="review-score-card fail">
  <span class="label">判定</span>
  <p class="score">FAIL</p>
  <p class="hint">Critical 指摘が 2 件あり対応が必要です</p>
</div>

<div class="review-score-card warn">
  <span class="label">判定</span>
  <p class="score">NEEDS_REVISION</p>
  <p class="hint">High 指摘の修正後に再レビューを推奨します</p>
</div>
```

**バリアント:**

| クラス | 背景 | ラベル色 | 用途 |
|--------|------|---------|------|
| `.review-score-card.pass` | `var(--ok-soft)` | `var(--ok-dark)` | 合格・承認 |
| `.review-score-card.fail` | `var(--danger-soft)` | `var(--danger-dark)` | 不合格・差し戻し |
| `.review-score-card.warn` | `var(--warn-soft)` | `var(--warn-dark)` | 要修正・条件付き |

- `.label` は mono フォントの小さなキャプション
- `.score` は display フォントで大きく表示
- `.hint` は本文サイズで補足説明

### 推奨アクションリスト（`.action-items`） *(style.css §12-3)*

レビュー結果の「次に取るべきアクション」を優先度チップ付き番号リストで明示。`review-summary` / `design-review` の終盤で使用。

```html
<ol class="action-items">
  <li>
    <span class="tag priority-high">HIGH</span>
    認可ミドルウェアの欠落を修正する
  </li>
  <li>
    <span class="tag priority-medium">MEDIUM</span>
    エラーレスポンスのメッセージ整形を統一する
  </li>
  <li>
    <span class="tag priority-low">LOW</span>
    JSDoc コメントの追加（任意）
  </li>
</ol>
```

**優先度チップ色:**

| クラス | 背景 | テキスト | 用途 |
|--------|------|---------|------|
| `.tag.priority-high` | `var(--danger-soft)` | `var(--danger-dark)` | 最優先（必須対応） |
| `.tag.priority-medium` | `var(--warn-soft)` | `var(--warn-dark)` | 次優先 |
| `.tag.priority-low` | `var(--bg-soft)` | `var(--muted)` | 任意 |

- 番号は CSS の `counter()` で自動採番（`.timeline` と同じ仕組み）
- 優先度チップは `.tag` バリアントなので、既存 `.tag` の余白・角丸を継承

### 選択肢比較カード（`.approach` / `.tradeoffs`） *(style.css §12-9)*

「同じ目的を達成する複数の選択肢を pros/cons 付きで並列比較する」専用パターン。設計検討・ライブラリ選定・実装アプローチ比較などで、レビュアーが各案の利点・欠点を素早く対比できるようにする。`.action-items` が「ひとつの解決策の手順」を示すのに対し、`.approach` は「複数の候補を並べてから選ぶ」用途。

```html
<div class="approach">
  <div class="approach-head">
    <span class="num">A</span>
    <h3>カスタム useDebounce フック</h3>
  </div>
  <p>React コンポーネント側で <code>useDebounce(value, 300)</code> を呼び、debounced value を依存配列に置く。</p>
  <div class="tradeoffs">
    <div class="pro">
      <h4>Pros</h4>
      <ul>
        <li>外部依存ゼロで実装可能</li>
        <li>テストが書きやすい（純粋関数化しやすい）</li>
      </ul>
    </div>
    <div class="con">
      <h4>Cons</h4>
      <ul>
        <li><code>maxWait</code> や <code>leading</code> オプションは自前実装が必要</li>
      </ul>
    </div>
  </div>
</div>

<div class="approach">
  <div class="approach-head">
    <span class="num">B</span>
    <h3>lodash.debounce をラップ</h3>
  </div>
  <p>既存の <code>lodash.debounce</code> を <code>useMemo</code> で包んで利用する。</p>
  <div class="tradeoffs">
    <div class="pro">
      <h4>Pros</h4>
      <ul>
        <li>枯れた実装でエッジケースに強い</li>
        <li><code>maxWait</code> / <code>leading</code> / <code>trailing</code> が標準で揃う</li>
      </ul>
    </div>
    <div class="con">
      <h4>Cons</h4>
      <ul>
        <li>バンドルサイズが増加（lodash 全体取り込み回避には個別 import 必須）</li>
      </ul>
    </div>
  </div>
</div>
```

**構成要素:**

- `.approach-head .num`: 候補番号バッジ（`var(--oat)` 背景、A/B/C など 1〜2 文字）
- `.approach-head h3`: 候補タイトル（display フォント、1.15rem）
- `.approach > p`: 候補の概要説明（max-width: 720px）
- `.tradeoffs`: pros/cons の 2 カラム grid（モバイル幅で 1 カラム化）
- `.tradeoffs .pro`: `var(--ok-soft)` 背景 + `var(--ok)` 左ボーダー（既存 `.before-after .after` と同系の緑）
- `.tradeoffs .con`: `var(--danger-soft)` 背景 + `var(--danger)` 左ボーダー（同系の赤）
- `.tradeoffs h4`: pros/cons ラベル（mono フォント、uppercase、small）

`.approach` は縦に 2〜3 個並べる前提（4 個以上になる場合は `.card-grid` や比較表に切り替え）。各候補内の pros/cons 行数は 5 行以内に収め、長くなる場合は別途 `details.collapse` で詳細展開する。

### レビューコメント吹き出し（`.bubble` / `.avatar` / `.checklist`） *(style.css §12-10)*

PR レビューコメント・チャット風フィードバック・対話形式の質疑応答などを、**アバター + 本文カード**の 2 カラム構造で表示する。`design-review` テンプレートのレビュー履歴セクション、`postmortem` の関係者ヒアリングなどで使用。

```html
<div class="bubble">
  <div class="avatar">RB</div>
  <div class="bubble-body">
    <div class="bubble-head">
      <span class="author-name">Reviewer Bot</span>
      <span class="chip blocking">blocking</span>
      <span class="chip">line 142</span>
    </div>
    <p><code>setItemFields</code> 内のバリデーションは廃止された。各 CLI 入口で行うこと。</p>
    <ul class="checklist">
      <li><label><input type="checkbox" checked> 該当箇所を特定</label></li>
      <li><label><input type="checkbox"> CLI 入口にバリデーションを移動</label></li>
      <li><label><input type="checkbox"> 既存テストの調整</label></li>
    </ul>
  </div>
</div>
```

**構成要素:**

- `.bubble`: flex 配置（avatar 左 + 本文カード右、モバイル幅では縦並びに切替）
- `.avatar`: 円形 36×36px、`var(--oat)` 背景・`var(--mono)` フォントでイニシャル 2 文字
- `.bubble-body`: `var(--bg-soft)` 背景の角丸カード（10px）
- `.bubble-head`: 上部メタ行（author + 複数 `.chip` を flex-wrap で配置）
- `.chip`: pill 形（999px radius、`var(--mono)`、small）。**`.tag` がインライン本文中のラベル、`.chip` は `.bubble` 等のメタ行専用**として使い分ける
- `.chip.blocking`: `var(--danger-soft)` 背景 + `var(--danger-dark)` 文字、太字 uppercase
- `.checklist`: `<ul>` 形式、`accent-color: var(--olive)` のチェックボックス + 本文ラベル

`.bubble` は連続して並べると会話履歴のように見える。`.bubble.blocking` 等の追加バリアントは持たず、メタ情報側で `.chip.blocking` を使うことでレビューの深刻度を表現する。

### 意思決定カード（`.decision-card` / `.decision-deck`） *(style.css §12-14)*

週次ステータス・計画レビュー・retro などで、**決定事項を「カード単位」で並べて見せる**。1 枚あたり「eyebrow（日付・カテゴリ）+ タイトル + コンテキスト + Q/A + byline」の 5 要素構成。`.lean` バリアントは context を省略した短縮版。

```html
<div class="decision-deck">
  <div class="decision-card">
    <p class="eyebrow">DECISION · 2026-W11</p>
    <h3>新規 worker の分離方針</h3>
    <p class="decision-context">コンテキスト分離が必要な作業を SubAgent 化する判断について。</p>
    <p class="decision-q"><strong>Q:</strong> どのスキルを SubAgent 化するか？</p>
    <p><strong>A:</strong> /simplify と reviewing-security をまとめた finalize-worker を新設。</p>
    <p class="byline">— @author、Discussion #N</p>
  </div>
  <div class="decision-card lean">
    <p class="eyebrow">DECISION · 2026-W12</p>
    <h3>HTML レポート閾値</h3>
    <p class="decision-q"><strong>Q:</strong> いつから HTML 化するか？</p>
    <p><strong>A:</strong> レビュー本文 80 行超で HTML 化（feature flag 制御）。</p>
    <p class="byline">— @author、PR #N</p>
  </div>
</div>
```

**構成要素:**

- `.decision-deck`: `auto-fit minmax(280px, 1fr)` の grid（モバイル幅で 1 カラム化）
- `.decision-card`: `var(--bg)` 背景 + 1.5px border の角丸カード（12px radius、padding 1.4rem）
- `.decision-card .eyebrow`: mono・uppercase・letter-spacing 0.08em、`var(--muted)`
- `.decision-card h3`: display フォント・700、`var(--slate)`
- `.decision-card .decision-context`: italic・small、`var(--muted)`（カード冒頭の状況説明）
- `.decision-card .decision-q`: `var(--clay)` で質問を強調（"Q:" + 質問文）
- `.decision-card .byline`: 右寄せ mono、`var(--gray-500)`（決定者・参照リンク）
- `.decision-card.lean`: padding 縮小 + context 非表示。Q/A だけで完結する短い決定向け

**`.bubble` との使い分け:**

| 部品 | 用途 | 視点 | 雰囲気 |
|------|------|------|--------|
| `.bubble` | 個別レビューコメント・対話 | 「誰が何を指摘したか」 | 会話・チャット風 |
| `.decision-card` | 確定済みの意思決定の記録 | 「何が決まったか・なぜ」 | カタログ・台帳風 |

`.decision-deck` 内で `.decision-card` と `.decision-card.lean` を混在させることで、重要な決定（フル）と補助的な決定（lean）を視覚的に重み付けできる。週次レポート末尾の「今週の決定」セクションに 3〜6 件並べる用途を想定。

---

## 階層系

### 折り畳み（`details.collapse`）

長いコード片・補足情報を折り畳んで初期状態をスッキリさせる。

```html
<details class="collapse">
  <summary>style.css 全文を見る</summary>
  <pre><code>:root {
  --ivory: #FAF9F5;
  --slate: #141413;
  /* ... */
}</code></pre>
</details>

<details class="collapse" open>
  <summary>初期展開の例</summary>
  <p>open 属性を付けると最初から開いた状態。</p>
</details>
```

- summary 背景: `var(--bg-soft)`、コンテンツ背景: `var(--bg)`
- `▶` chevron が `[open]` で 90deg 回転（0.2s transition）
- `summary` 以外の直接子要素にはパディングが自動付与
- `<pre>` を直接子に置くと枠線・角丸が連続して見える

### フェーズカード（`.phase-card`）

```html
<section class="phase-card designing" id="p-{slug}">
  <header>
    <span>{タイトル}</span>
    <span class="tag orch">{オーケストレーター名}</span>
    <span class="tag status">status: {ステータス}</span>
  </header>
  <div class="body">
    <h4>目的</h4>
    <p>...</p>
    <h4>関連項目</h4>
    <p>...</p>
  </div>
</section>
```

**`phase-card` のバリアント**（`<header>` 背景色が変化）:

| クラス | 背景 | 用途 |
|--------|------|------|
| `designing` / `preparing` / `working` | accent-soft（dusty blue） | 通常フェーズ |
| `reviewing` | ok-soft（olive） | レビュー/完了系 |
| `requirements` | purple-soft | 補助プロセス |

### カード見出し階層（`.card.variant .card-titles`） *(style.css §12-18)*

既存 `.card-grid .card` の見出し部を **「タイトル + サブタイトル + 補助メタ」の 3 階層** に強化したバリアント。`.card.variant` を付けたカードでのみ階層見出しが有効化される（通常の `.card` には影響しない）。コンポーネントカタログ・サンプル一覧・テンプレート集など、各カードに 3 段のメタ情報を持たせたいときに使う。

```html
<div class="card-grid">
  <div class="card variant">
    <header class="card-titles">
      <p class="card-title">Primary Button</p>
      <p class="card-sub">var(--clay) 背景 + ivory 文字</p>
      <p class="card-head-meta">12 usages · Acme/Web</p>
    </header>
    <div class="card-body">
      <a class="cta-link" href="#">サンプルを見る</a>
    </div>
  </div>
  <div class="card variant">
    <header class="card-titles">
      <p class="card-title">Ghost Button</p>
      <p class="card-sub">透明背景 + border 1.5px</p>
      <p class="card-head-meta">8 usages · Acme/Web</p>
    </header>
    <div class="card-body">
      <a class="cta-link" href="#">サンプルを見る</a>
    </div>
  </div>
</div>
```

**構成要素:**

- `.card.variant .card-titles`: 縦並びの 3 階層見出しブロック、下に 1.5px border-bottom
- `.card-title`: display フォント・600、`var(--slate)`（既存の `h3` と同等の重み）
- `.card-sub`: italic・small、`var(--muted)`（タイトルの補足説明）
- `.card-head-meta`: mono・x-small、`var(--gray-500)`、letter-spacing（使用頻度・所属など）
- `.card-body`: 既存 `.card` の本文領域、サイズ調整あり

**通常 `.card` との使い分け:**

| バリアント | 見出し構造 | 用途 |
|-----------|----------|------|
| `.card-grid .card`（通常） | `<h3>` 1 行 + 本文 | シンプルな比較・概要紹介 |
| `.card-grid .card.variant` | 3 階層 `.card-titles` + 本文 | カタログ・テンプレート集・サンプル一覧 |

`.card.variant` は「タイトルだけでは情報が足りず、サブタイトルと数値メタを付けたい」ときに選ぶ。`.card-head-meta` は 1〜2 個の数値・所属情報に限定し、増えすぎる場合は `.metric-grid` を本文側に置く構成にする。

---

## フロー系

### タイムライン + 種別チップ（`.timeline`）

```html
<h4>処理フロー</h4>
<ol class="timeline">
  <li><span class="t-tag status">STATUS</span>ステータス変更<span class="desc">補足説明（任意）</span></li>
  <li><span class="t-tag worker">WORKER</span>Agent 委任</li>
  <li><span class="t-tag check">CHECK</span>調査・確認</li>
  <li><span class="t-tag task">TASK</span>通常作業</li>
  <li><span class="t-tag ai">AI</span>AI 判定/レビュー</li>
  <li><span class="t-tag gate">GATE</span>人による承認</li>
  <li><span class="t-tag post">POST</span>後処理</li>
</ol>
```

**チップ色対応:**
- `status`: dusty blue（accent）
- `worker`: olive（ok）
- `check` / `task`: muted gray
- `ai`: dusty purple
- `gate`: oat / clay
- `post`: warn amber

番号は CSS の `counter()` で自動採番。

### 時刻スタンプ型タイムライン（`.event-log`） *(style.css §12-5)*

インシデント時系列・会議ログのように、**絶対時刻 + 説明本文** の縦列を縦に並べる。`postmortem` テンプレートの時系列セクションで使用する。`.entry`（dot 列 + pill 時刻バッジ + 本文）構造で、縦線は `::before` 疑似要素により描画される。

```html
<div class="event-log">
  <div class="entry">
    <span class="dot impact"></span>
    <span class="time">14:02</span>
    <div class="body"><strong>Impact starts</strong>: 監視アラート発火。p99 レイテンシが閾値超過</div>
  </div>
  <div class="entry">
    <span class="dot"></span>
    <span class="time">14:05</span>
    <div class="body">オンコールが調査開始</div>
  </div>
  <div class="entry">
    <span class="dot mitigated"></span>
    <span class="time">14:18</span>
    <div class="body"><strong>Mitigated</strong>: 原因をデプロイ B 起因と特定、ロールバック実施</div>
  </div>
  <div class="entry">
    <span class="dot resolved"></span>
    <span class="time">14:24</span>
    <div class="body"><strong>Resolved</strong>: メトリクス正常化を確認、収束</div>
  </div>
</div>
```

- `.dot` は `position: absolute` で左側にオーバーレイされ、縦線（`::before` 疑似要素 / `var(--border)` 2px）の上に乗る
- `.dot` のバリアント: デフォルト（`var(--clay)` 枠線・中抜き）/ `.impact`（`var(--clay)` 塗りつぶし）/ `.mitigated`・`.resolved`（`var(--olive)` 塗りつぶし）
- `.time` は pill 風時刻バッジ（`var(--bg-soft)` 背景 + `var(--border)` 枠線 + mono フォント）
- `.body` は本文。`<strong>` で重要マイルストーンの強調（`var(--slate)`）
- `.timeline`（ステップ番号 + チップ）とは独立した部品（バリアント統合より独立クラスのほうが CSS 複雑度が抑えられる）

### 期間グルーピング型タイムライン（`.milestone-timeline`） *(style.css §12-6)*

エピック計画・ロードマップのように、**マイルストーン単位**で進行を縦に並べるガント風 3 カラム grid。左に期間ラベル、中央に dot + line（縦線繋ぎ）、右に本文。`implementation-plan` テンプレートのロードマップセクションで使用。

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
      <p>テーブル定義と OpenAPI を確定し、フロント/バックエンドの契約をロックする。</p>
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
      <p>shadcn/ui ベースで投稿フォームを実装する。</p>
    </div>
  </div>

  <!-- 最終マイルストーンは .line を含めない -->
  <div class="milestone">
    <div class="when">Week 2 · Fri</div>
    <div class="dot-col">
      <span class="dot"></span>
    </div>
    <div class="body">
      <h3>Release</h3>
      <p>本番リリース。Renovate 自動 PR 設定済み。</p>
    </div>
  </div>

</div>
```

- 各マイルストーンは grid 3 カラム（`120px 28px 1fr`）で `.when` / `.dot-col` / `.body` の 3 列構造
- `.dot` のバリアント: デフォルト（`var(--clay)` 枠線・未着手）/ `.done`（`var(--olive)` 塗りつぶし・完了）/ `.current`（`var(--clay)` 塗りつぶし・進行中）
- `.line` が次のマイルストーンへの縦線を描画する。最終マイルストーンには含めない
- `.body .tags` で `.tag` を横並びに配置可能
- モバイル幅では `.when` を 80px に縮小し読みやすさを保つ

### コード差分ブロック（`.diff-block` / `.diff-line`） *(style.css §12-8)*

GitHub 風のコード差分（追加 / 削除 / コンテキスト）を表示する。`postmortem` テンプレートの「設定変更例」や `implementation-plan` の「移行前後のコード」を示すときに使用。

```html
<div class="diff-block">
  <span class="diff-line ctx"> originRequest:</span>
  <span class="diff-line del">-  connectTimeout: 30s</span>
  <span class="diff-line add">+  connect_timeout: 30s</span>
  <span class="diff-line ctx"> tunnel: my-tunnel</span>
</div>
```

- `.diff-block` は `var(--bg-soft)` 背景 + `var(--border)` 枠線で囲み、`var(--mono)` フォント + 0.82rem で表示
- `.diff-line.ctx` はコンテキスト行（`var(--gray-500)`・グレー）
- `.diff-line.del` は削除行（`var(--danger-dark)`・赤系）
- `.diff-line.add` は追加行（`var(--ok-dark)`・緑系）
- `white-space: pre` でインデントを保持。横スクロール可（`overflow-x: auto`）

---

## 装飾系

### タグ（`.tag`）

```html
<span class="tag">中立</span>
<span class="tag status">status</span>     <!-- bg のみ -->
<span class="tag orch">accent 色</span>     <!-- dusty blue -->
<span class="tag worker">ok 色</span>       <!-- olive -->
<span class="tag gate">warn 色</span>       <!-- amber -->
<span class="tag question">purple 色</span>
```

### ステータスバッジ（`.badge` 5 バリアント） *(style.css §12-12)*

`.tag` がインライン本文中のラベル（例: `.hero` のタグ列、`.timeline` の種別チップ）用なのに対し、`.badge` は**独立した状態・カテゴリ表示**用。テーブルの状態列、サマリー先頭の現状ラベル、KPI タイルの増減方向など、「意味色付きの単体ラベル」を表示したいときに使う。

```html
<span class="badge accent">accent</span>
<span class="badge neutral">neutral</span>
<span class="badge success">success</span>
<span class="badge warning">warning</span>
<span class="badge danger">danger</span>
```

**バリアント色対応:**

| クラス | 背景 | 文字 | ボーダー | 用途例 |
|--------|------|------|---------|--------|
| `.badge.accent` | `var(--oat)` | `var(--clay)` | `var(--clay)` | カテゴリ・タイプ（NEW / FEATURED など） |
| `.badge.neutral` | `var(--bg-soft)` | `var(--gray-700)` | `var(--border)` | 中立的な属性（DRAFT / TODO など） |
| `.badge.success` | `var(--ok-soft)` | `var(--ok-dark)` | `var(--ok)` | 成功・完了（DONE / PASSED など） |
| `.badge.warning` | `var(--warn-soft)` | `var(--warn-dark)` | `var(--warn)` | 注意・要対応（PENDING / WARN など） |
| `.badge.danger` | `var(--danger-soft)` | `var(--danger-dark)` | `var(--danger)` | 失敗・ブロッキング（FAILED / BLOCKED など） |

**`.tag` / `.chip` / `.badge` の使い分け:**

| 部品 | 用途 | 形状 | 主要バリアント |
|------|------|------|----------|
| `.tag` | インライン本文中のラベル | 角丸 6px | `.orch` / `.worker` / `.gate` / `.question` / `.priority-*` |
| `.chip` | `.bubble` 等のメタ行 | pill (999px) | `.blocking` |
| `.badge` | 独立した状態・カテゴリ表示 | 角丸 6px | `.accent` / `.neutral` / `.success` / `.warning` / `.danger` |

---

## 図解系

### SVG 図（フェーズ図・ループ図）

SVG は CSS 変数経由でテーマ対応するため、`style.css` 末尾の `[data-theme="dark"] .diagram svg [fill="..."]` ルールに**新規追加色**を必ず登録すること（さもないとダークモードで黒のまま）。

#### 基本構造

```html
<div class="diagram">
<svg viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="図のラベル">
  <defs>
    <marker id="arr-main" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3D3D3A"/>
    </marker>
  </defs>

  <!-- ボックス：fill は soft 色、stroke は強色 -->
  <rect x="40" y="40" width="160" height="80" rx="8"
        fill="#dde5ef" stroke="#4d7299" stroke-width="2"/>
  <text x="120" y="68" text-anchor="middle" font-size="14" font-weight="700"
        fill="#2c4d75">タイトル</text>
  <text x="120" y="88" text-anchor="middle" font-size="11"
        fill="#2c4d75">サブ</text>

  <!-- 矢印 -->
  <line x1="200" y1="80" x2="240" y2="80"
        stroke="#3D3D3A" stroke-width="2.5" marker-end="url(#arr-main)"/>
</svg>
</div>
```

#### 推奨カラーペア（fill / stroke / text）

| 用途 | fill (soft) | stroke (mid) | text (dark) |
|------|-------------|-------------|-------------|
| process（blue） | `#dde5ef` | `#4d7299` | `#2c4d75` |
| review/ok（olive） | `#dde5d0` | `#788C5D` | `#4f5f3d` |
| requirements/upstream（purple） | `#e6dde9` | `#856ea3` | `#4b3680` |
| warn/gate（amber） | `#f0e3c0` | `#b08838` | `#6e5417` |
| danger（terracotta） | `#ecd6cd` | `#a85040` | `#6e2f25` |
| neutral | `#F0EEE6` | `#D1CFC5` | `#3D3D3A` |
| muted text | — | `#87867F` | `#87867F` |

#### SVG 内 text の注意

- 色付き text には必ず `fill="..."` を指定する（指定しないと CSS の `:not([fill])` で本文色に追従するが、色分けの意図が失われる）
- 矢印ラベルなど装飾的 text も fill を明示すること

### SVG 図（拡張パターン集）

「推奨カラーペア」表の hex（`#dde5ef` / `#4d7299` / `#788C5D` / `#f0e3c0` / `#a85040` / `#F0EEE6` / `#87867F` / `#3D3D3A` 等）は **`style.css` 末尾の `[data-theme="dark"]` オーバーライドに登録済み**なので、これらを使う限り CSS 追加は不要。新規 fill 色を導入したときだけ `[data-theme="dark"] .diagram svg [fill="..."]` ルールを追加すること。SVG 全体で純白 `#FFFFFF` / 純黒 `#000000` は使わず、明色は `#F0EEE6` (gray-150)、濃色は `#3D3D3A` (gray-700) を使う。

すべての SVG には `role="img"` + `aria-label="..."` を付与し、`viewBox` を必ず設定する。

#### A. パイプラインフローチャート（縦方向、ガード菱形 + 注釈）

`<defs>` で複数色の矢印 marker を定義し、`.node` の `rect` 連続と `.node.gate` の菱形（`<path>`）でパス分岐を表現する。`yes` / `no` ラベルを edge 横に置く。

```html
<div class="diagram">
<svg viewBox="0 0 540 720" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="CI/CD パイプラインのフローチャート（lint→test→gate→deploy）">
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
  <!-- gate diamond: center (210, 320) -->
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
  <!-- right lane: notify failure (separate column) -->
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

**用途と注意点:** 縦方向の処理パイプライン（CI/CD、ワークフロー、状態遷移を含むフロー）に最適。`.node.gate`（菱形）で分岐を明示し、`yes`/`no` を edge ラベルで補足する。失敗パスは破線 + rust（terracotta）色で区別する。`<marker>` を複数定義することで矢印自体に色を持たせ、edge の色と統一感を出す。

#### B. ハブ&スポーク（Fanout）

中央ノードから 4 個の周辺ノードへ扇状に矢印を伸ばす。並列処理・ファンアウト・委任を視覚化する定型パターン。

```html
<div class="diagram">
<svg viewBox="0 0 540 320" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="implement-flow から 4 ワーカーへの委任を示すハブ&スポーク図">
  <defs>
    <marker id="arr-hub" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="9" markerHeight="9" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#87867F"/>
    </marker>
  </defs>

  <!-- 中央ハブ -->
  <rect x="220" y="128" width="100" height="64" rx="10"
        fill="#E3DACC" stroke="#3D3D3A" stroke-width="2"/>
  <text x="270" y="156" text-anchor="middle" font-size="12" fill="#3D3D3A">implement-flow</text>
  <text x="270" y="174" text-anchor="middle" font-size="10" fill="#87867F">orchestrator</text>

  <!-- 周辺ノード 4 個 -->
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

  <!-- スポーク矢印 -->
  <line x1="220" y1="148" x2="166" y2="80"  stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="320" y1="148" x2="374" y2="80"  stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="220" y1="172" x2="166" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>
  <line x1="320" y1="172" x2="374" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-hub)"/>

  <text x="270" y="304" text-anchor="middle" font-size="11" fill="#87867F">親が 4 ワーカーへ順次委任（並列ではなくチェーン実行）</text>
</svg>
</div>
```

**用途と注意点:** オーケストレーター → 複数ワーカー、API → マイクロサービス、データソース → 複数 sink など、1:N の関係に使う。中央は `var(--oat)` 系（warm）、周辺は `var(--bg-soft)` 系（neutral）で「主役 vs 補助」を視覚的に区別する。ノード数が 5 個を超える場合は配置が崩れやすいため、リング状（中央 + 周囲 6-8）や階層型に切り替える。

#### C. リトライ / 連鎖図

横方向のタイムライン上に試行ノード（円 + ×印 / ✓印）を並べ、失敗 → 失敗の遷移を破線アーチで結ぶ。指数バックオフや段階的リトライを視覚化する。

```html
<div class="diagram">
<svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="指数バックオフによる 4 回試行のリトライ図">
  <!-- タイムライン軸 -->
  <line x1="40" y1="150" x2="560" y2="150" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="40"  y="174" font-size="11" fill="#87867F">t = 0</text>
  <text x="560" y="174" text-anchor="end" font-size="11" fill="#87867F">time →</text>

  <!-- 試行 1: 失敗 -->
  <circle cx="80" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="75" y1="145" x2="85" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="85" y1="145" x2="75" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="80" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 1</text>

  <!-- 試行 2: 失敗 -->
  <circle cx="160" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="155" y1="145" x2="165" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="165" y1="145" x2="155" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="160" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 2</text>

  <!-- 試行 3: 失敗 -->
  <circle cx="300" cy="150" r="9" fill="#F0EEE6" stroke="#a85040" stroke-width="2"/>
  <line x1="295" y1="145" x2="305" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <line x1="305" y1="145" x2="295" y2="155" stroke="#a85040" stroke-width="1.5"/>
  <text x="300" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 3</text>

  <!-- 試行 4: 成功 -->
  <circle cx="500" cy="150" r="10" fill="#788C5D" stroke="#3D3D3A" stroke-width="1.5"/>
  <path d="M495,150 L499,154 L506,144" fill="none" stroke="#F0EEE6"
        stroke-width="1.5" stroke-linecap="round"/>
  <text x="500" y="194" text-anchor="middle" font-size="11" fill="#3D3D3A">try 4</text>

  <!-- バックオフアーチ -->
  <path d="M80,142 Q120,90 160,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="120" y="84" text-anchor="middle" font-size="11" fill="#87867F">+1s</text>

  <path d="M160,142 Q230,72 300,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="230" y="64" text-anchor="middle" font-size="11" fill="#87867F">+2s</text>

  <path d="M300,142 Q400,40 500,142" fill="none" stroke="#87867F"
        stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="400" y="34" text-anchor="middle" font-size="11" fill="#87867F">+4s</text>

  <text x="40" y="222" font-size="11" fill="#87867F">各失敗は前回の 2 倍待ってから再試行。jitter は省略。</text>
</svg>
</div>
```

**用途と注意点:** リトライポリシー、指数バックオフ、サーキットブレーカー復帰、HTTP 再送等の時間軸を持つ失敗連鎖に使う。成功ノードのみ `var(--olive)` 塗りつぶし + 白チェックマーク、失敗ノードは枠線のみ + ×印で区別する。アーチの最高点で待ち時間ラベルを置くと指数的な間隔が直感的に伝わる。

#### D. ステート遷移図

複数の状態 rect を配置し、状態間の遷移矢印（forward は実線、rollback は破線）で結ぶ。shirokuma-flow の Issue ライフサイクル等が題材として適している。

```html
<div class="diagram">
<svg viewBox="0 0 720 260" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="Issue ライフサイクルの 5 状態遷移図">
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

  <!-- 5 状態（横並び） -->
  <rect x="20"  y="100" width="116" height="60" rx="8"
        fill="#F0EEE6" stroke="#D1CFC5" stroke-width="1.5"/>
  <text x="78" y="128" text-anchor="middle" font-size="12" fill="#3D3D3A">Backlog</text>
  <text x="78" y="146" text-anchor="middle" font-size="10" fill="#87867F">未着手</text>

  <rect x="166" y="100" width="116" height="60" rx="8"
        fill="#dde5ef" stroke="#4d7299" stroke-width="1.5"/>
  <text x="224" y="128" text-anchor="middle" font-size="12" fill="#2c4d75">ToDo</text>
  <text x="224" y="146" text-anchor="middle" font-size="10" fill="#4d7299">準備済</text>

  <rect x="312" y="100" width="116" height="60" rx="8"
        fill="#f0e3c0" stroke="#b08838" stroke-width="1.5"/>
  <text x="370" y="128" text-anchor="middle" font-size="12" fill="#6e5417">In progress</text>
  <text x="370" y="146" text-anchor="middle" font-size="10" fill="#b08838">作業中</text>

  <rect x="458" y="100" width="116" height="60" rx="8"
        fill="#e6dde9" stroke="#856ea3" stroke-width="1.5"/>
  <text x="516" y="128" text-anchor="middle" font-size="12" fill="#4b3680">Review</text>
  <text x="516" y="146" text-anchor="middle" font-size="10" fill="#856ea3">レビュー中</text>

  <rect x="604" y="100" width="96" height="60" rx="8"
        fill="#dde5d0" stroke="#788C5D" stroke-width="1.5"/>
  <text x="652" y="128" text-anchor="middle" font-size="12" fill="#4f5f3d">Done</text>
  <text x="652" y="146" text-anchor="middle" font-size="10" fill="#788C5D">完了</text>

  <!-- forward 遷移 -->
  <line x1="136" y1="130" x2="162" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="149" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">plan</text>

  <line x1="282" y1="130" x2="308" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="295" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">begin</text>

  <line x1="428" y1="130" x2="454" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="441" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">submit</text>

  <line x1="574" y1="130" x2="600" y2="130" stroke="#788C5D" stroke-width="1.5" marker-end="url(#arr-fwd)"/>
  <text x="587" y="120" text-anchor="middle" font-size="10" fill="#4f5f3d">approve</text>

  <!-- rollback 遷移（Review → In progress） -->
  <path d="M460,160 C420,200 380,200 372,162" fill="none" stroke="#a85040"
        stroke-width="1.5" stroke-dasharray="4 4" marker-end="url(#arr-back)"/>
  <text x="416" y="218" text-anchor="middle" font-size="10" fill="#6e2f25">request-changes</text>

  <text x="20" y="34" font-size="11" fill="#87867F">forward（plan/begin/submit/approve）は実線、rollback は破線で区別する</text>
</svg>
</div>
```

**用途と注意点:** 状態機械、Issue/PR ライフサイクル、ジョブステータス遷移、注文ワークフロー等に使う。forward と rollback で異なる marker（色）を使い分け、rollback は破線にすることで「正常系」と「逆行系」を一目で区別できる。状態ごとに色を変える場合は意味色を統一（process=blue、進行中=amber、レビュー=purple、完了=olive）。

#### E. シーケンス図（ライフライン）

縦の点線ライフラインと横向きメッセージ矢印で時間順の相互作用を表現。ライフライン上にアクティベーション（実線縦棒）を置くと処理中の区間を強調できる。

```html
<div class="diagram">
<svg viewBox="0 0 640 460" xmlns="http://www.w3.org/2000/svg"
     role="img" aria-label="implement-flow のワーカー委任シーケンス">
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

  <!-- ライフラインヘッダー -->
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

  <!-- ライフライン（縦点線） -->
  <line x1="100" y1="60" x2="100" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="260" y1="60" x2="260" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="420" y1="60" x2="420" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>
  <line x1="570" y1="60" x2="570" y2="440" stroke="#87867F" stroke-width="1" stroke-dasharray="3 4"/>

  <!-- アクティベーション（処理中の縦実線太め） -->
  <rect x="96"  y="80"  width="8" height="340" fill="#E3DACC" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="256" y="100" width="8" height="100" fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="416" y="230" width="8" height="80"  fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>
  <rect x="566" y="340" width="8" height="60"  fill="#F0EEE6" stroke="#3D3D3A" stroke-width="1"/>

  <!-- メッセージ 1: dispatch → coding -->
  <line x1="104" y1="110" x2="256" y2="110" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="180" y="104" text-anchor="middle" font-size="11" fill="#3D3D3A">dispatch(task)</text>

  <!-- メッセージ 2: changes_made → flow -->
  <line x1="256" y1="194" x2="108" y2="194" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="180" y="188" text-anchor="middle" font-size="11" fill="#4f5f3d">changes_made: true</text>

  <!-- メッセージ 3: commit → commit-worker -->
  <line x1="104" y1="240" x2="416" y2="240" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="260" y="234" text-anchor="middle" font-size="11" fill="#3D3D3A">commit + push</text>

  <!-- メッセージ 4: commit done -->
  <line x1="416" y1="304" x2="108" y2="304" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="260" y="298" text-anchor="middle" font-size="11" fill="#4f5f3d">sha: abc1234</text>

  <!-- メッセージ 5: create PR -->
  <line x1="104" y1="350" x2="566" y2="350" stroke="#87867F" stroke-width="1.5" marker-end="url(#arr-msg)"/>
  <text x="335" y="344" text-anchor="middle" font-size="11" fill="#3D3D3A">create PR</text>

  <!-- メッセージ 6: PR url -->
  <line x1="566" y1="394" x2="108" y2="394" stroke="#788C5D" stroke-width="1.5"
        stroke-dasharray="4 4" marker-end="url(#arr-ret)"/>
  <text x="335" y="388" text-anchor="middle" font-size="11" fill="#4f5f3d">#1234</text>

  <text x="40" y="454" font-size="11" fill="#87867F">実線: 同期呼び出し / 破線: 戻り値・通知</text>
</svg>
</div>
```

**用途と注意点:** API 呼び出し列、オーケストレーション、認証フロー、分散システム間の通信等の時間順相互作用に使う。ライフラインは縦点線、メッセージは横実線（呼び出し）+ 横破線（戻り値）で区別する。アクティベーション（縦実線矩形）はライフライン上で処理中の区間を強調し、ネスト時はインデントして重ねる。

### コードベース構造カード（`.diagram-panel` / `.repo-line`） *(style.css §12-11)*

「ファイル + 行範囲 + 一行説明」のセットを縦に並べ、太枠カードで囲んでコードベース構造を視覚化するパターン。SVG フロー図 + ファイル一覧の両方を `.diagram-panel` 内に置けるので、「この機能はこの 3 ファイルで構成される」を 1 ブロックで提示できる。`design-review` の対象ファイル一覧や、調査レポートの「触ったファイル」セクションで使用。

```html
<div class="diagram-panel">
  <h3>認証フローの主要ファイル</h3>
  <div class="flow">
    <div class="repo-line">
      <span class="path">apps/web/middleware.ts</span>
      <span class="range">L1-L42</span>
      <span class="snippet">セッションなしリクエストを /login へリダイレクト</span>
    </div>
    <div class="repo-line hot">
      <span class="path">packages/auth/session.ts</span>
      <span class="range">L80-L120</span>
      <span class="snippet"><code>resolveSession()</code>: cookie 検証と DB 照会の本体</span>
    </div>
    <div class="repo-line">
      <span class="path">packages/auth/jwt.ts</span>
      <span class="range">L15-L35</span>
      <span class="snippet">JWT 署名検証ユーティリティ</span>
    </div>
  </div>
</div>
```

**構成要素:**

- `.diagram-panel`: 太枠カード（`var(--border)` 1.5px、`var(--bg-soft)` 背景、12px radius）
- `.diagram-panel > h3`: パネルタイトル（display フォント、1.05rem）
- `.diagram-panel .flow`: 中身の縦並びコンテナ（SVG でも `.repo-line` の連続でも可）
- `.repo-line`: 3 カラム grid（`path | range | snippet`、モバイル幅で 1 カラム化）
- `.repo-line .path`: ファイルパス（`var(--mono)`、`var(--clay)` カラー）
- `.repo-line .range`: 行範囲（`var(--mono)`、small、`var(--muted)`、`nowrap`）
- `.repo-line .snippet`: 一行説明（本文色）
- `.repo-line.hot`: 注目行（`var(--warn-soft)` 背景 + `var(--warn)` 枠線、path/range も warn-dark に追従）

`.diagram-panel` 内に SVG フロー図と `.repo-line` を混在させてもよい（先に SVG で構造を見せ、続いて該当ファイル一覧を `.repo-line` で示す等）。`.repo-line` は 5〜10 行程度までを目安に、それ以上はカテゴリで分割するか `details.collapse` で折り畳む。

---

## データ系

### テーブル

```html
<table>
  <thead><tr><th>列 1</th><th>列 2</th></tr></thead>
  <tbody>
    <tr><td>...</td><td>...</td></tr>
  </tbody>
</table>
```

`style.css` で枠線・ヘッダー背景・配置が自動適用される。

### 問題リストテーブル（`.issue-list-table`） *(style.css §12-2)*

レビュー結果の Critical / High / Medium / Low の問題を、**深刻度バッジ + 問題タイトル + 対象ファイル + 推奨対処** の 4 列で並べる。`review-summary` テンプレートで使用。

```html
<table class="issue-list-table">
  <thead>
    <tr>
      <th>深刻度</th>
      <th>問題</th>
      <th>対象ファイル</th>
      <th>推奨対処</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="tag gate">Critical</span></td>
      <td>認可チェックが欠落</td>
      <td><code>src/api/handler.ts</code></td>
      <td>middleware の前段で auth gate を挿入</td>
    </tr>
    <tr>
      <td><span class="tag worker">High</span></td>
      <td>入力バリデーション不足</td>
      <td><code>src/parsers/input.ts</code></td>
      <td>Zod スキーマで境界バリデーション追加</td>
    </tr>
    <tr>
      <td><span class="tag status">Medium</span></td>
      <td>ログレベル設定の不整合</td>
      <td><code>src/log/config.ts</code></td>
      <td>error/warn の分離方針を統一</td>
    </tr>
    <tr>
      <td><span class="tag">Low</span></td>
      <td>JSDoc コメント不足</td>
      <td><code>src/utils/*.ts</code></td>
      <td>任意対応</td>
    </tr>
  </tbody>
</table>
```

- 1 列目に既存 `.tag` を流用した深刻度バッジ（`.tag.gate` / `.tag.worker` / `.tag.status` / 無印）
- 標準テーブルのバリアントなので、`<table>` の枠線・パディング・ヘッダー背景を継承
- 行間の hover ハイライトは `var(--bg-soft)` で実装

### メトリクスグリッド（`.metric-grid`） *(style.css §12-7)*

数値メトリクスを **大きな数値 + 単位 + ラベル** の 3 行構造でカードのグリッドに並べる。`postmortem` テンプレートの影響セクション、`status` 系報告の KPI 表示で使用。

```html
<div class="metric-grid">
  <div class="metric-card">
    <p class="number">12,420</p>
    <p class="unit">requests</p>
    <p class="label">失敗リクエスト数</p>
  </div>
  <div class="metric-card">
    <p class="number">348</p>
    <p class="unit">users</p>
    <p class="label">影響ユーザー数</p>
  </div>
  <div class="metric-card">
    <p class="number">2,180</p>
    <p class="unit">ms</p>
    <p class="label">ピークレイテンシ p99</p>
  </div>
  <div class="metric-card">
    <p class="number">22</p>
    <p class="unit">min</p>
    <p class="label">障害継続時間</p>
  </div>
</div>
```

- `.number` は display フォントで特大（`var(--clay)`）
- `.unit` は mono フォントの小さな単位（`var(--muted)`）
- `.label` は本文サイズの説明（`var(--fg)`）
- グリッドは `auto-fit` 200px（4 枚並び・モバイル幅で 2 列、超狭幅で 1 列）

### ポストモーテム合成パターン（`postmortem-timeline`）

`.status-header` + `.event-log` + `.metric-grid` を組み合わせた、ポストモーテム特化のレイアウト合成例。個別の新規 CSS クラスはなく、既存部品の構成パターンとして記載。

```html
<!-- 1. 上部: status-header（ID / SEV / Status / Duration） -->
<div class="status-header">
  <dl>
    <div><dt>Incident ID</dt><dd>INC-2026-051</dd></div>
    <div><dt>Severity</dt><dd>SEV-2</dd></div>
    <div><dt>Status</dt><dd>RESOLVED</dd></div>
    <div><dt>Duration</dt><dd>22 min</dd></div>
  </dl>
</div>

<h2 id="tldr">TL;DR</h2>
<blockquote>14:02 にデプロイ B 起因のレイテンシ悪化が発生。14:24 にロールバックで収束。</blockquote>

<!-- 2. 中段: event-log（時系列タイムライン） -->
<h2 id="timeline">時系列</h2>
<div class="event-log">
  <div class="entry">
    <span class="dot impact"></span>
    <span class="time">14:02</span>
    <div class="body"><strong>Impact starts</strong>: 監視アラート発火</div>
  </div>
  <div class="entry">
    <span class="dot mitigated"></span>
    <span class="time">14:18</span>
    <div class="body"><strong>Mitigated</strong>: ロールバック実施</div>
  </div>
  <div class="entry">
    <span class="dot resolved"></span>
    <span class="time">14:24</span>
    <div class="body"><strong>Resolved</strong>: 収束確認</div>
  </div>
</div>

<!-- 3. 下段: metric-grid（影響指標） -->
<h2 id="impact">影響</h2>
<div class="metric-grid">
  <div class="metric-card">
    <p class="number">12,420</p>
    <p class="unit">requests</p>
    <p class="label">失敗リクエスト数</p>
  </div>
  <div class="metric-card">
    <p class="number">348</p>
    <p class="unit">users</p>
    <p class="label">影響ユーザー数</p>
  </div>
</div>
```

このパターンは `postmortem.html` テンプレートでも採用している。`.status-header`（メタ）→ `.event-log`（時系列）→ `.metric-grid`（影響）の 3 段構成で、インシデントレポートの「いつ・何が・どれだけ」を順に提示できる。

### メトリクスタイル（`.tile` / `.tile-grid`） *(style.css §12-13)*

`.metric-grid`（§12-7）より「ステータス報告・週次レポート」向けに特化したタイル。**ラベル + 大きな数値 + 前期比 delta + sparkline** の 4 要素を 1 タイルに収め、トレンドを視覚化する。`.metric-grid` が「インシデントの数値影響」に最適なのに対し、`.tile-grid` は「定常運用の KPI モニタリング」に最適。

```html
<div class="tile-grid">
  <div class="tile">
    <span class="label">完了 Issue</span>
    <p class="number">23</p>
    <p class="delta up">+5 vs 先週</p>
    <div class="spark">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline points="0,20 20,15 40,18 60,8 80,12 100,5"
                  fill="none" stroke="var(--clay)" stroke-width="2"/>
      </svg>
    </div>
  </div>
  <div class="tile">
    <span class="label">Open PR</span>
    <p class="number">7</p>
    <p class="delta down">-2 vs 先週</p>
  </div>
  <div class="tile">
    <span class="label">マージ率</span>
    <p class="number">92<small>%</small></p>
    <p class="delta up">+3% vs 先週</p>
  </div>
</div>
```

**構成要素:**

- `.tile-grid`: `auto-fit minmax(180px, 1fr)` の grid（モバイル幅で 2 カラム固定）
- `.tile`: `var(--bg-soft)` 背景 + `var(--border)` 1.5px の角丸カード
- `.tile .label`: 上部キャプション（mono、small、uppercase、`var(--muted)`）
- `.tile .number`: 大きな数値（display フォント、2.5rem、`var(--slate)`）
- `.tile .delta.up`: 上昇トレンド（`var(--ok-dark)`）
- `.tile .delta.down`: 下降トレンド（`var(--danger-dark)`）
- `.tile .delta`（バリアントなし）: 中立トレンド（`var(--muted)`）
- `.tile .spark`: 高さ 30px の sparkline 領域（inline SVG を直接埋め込む）

**`.metric-grid` との使い分け:**

| 部品 | 用途 | 構成要素 | 雰囲気 |
|------|------|---------|--------|
| `.metric-grid` | インシデント影響・単発レポート | number + unit + label | 数値の絶対値を強調 |
| `.tile-grid` | 定常運用 KPI・週次・トレンド | label + number + delta + spark | 増減方向と推移を強調 |

sparkline は省略可。SVG 内の `stroke="var(--clay)"` はライト/ダーク両モードで自動追従する（CSS 変数経由のため `[data-theme="dark"] .diagram svg` ルールへの追加は不要）。`.delta.up` / `.delta.down` の判定は「数値が大きいほど良いか」で決める（バグ件数なら減少が `.up`、完了件数なら増加が `.up`）。

### トリアージボード（`.board` / `.board-toolbar`） *(style.css §12-15)*

Issue・PR・タスクを **カンバン形式** で複数レーン（Backlog / In progress / Review / Done など）に並べる。`.board-toolbar` で全体フィルタ・要約を、各 `.board-lane` で状態別グルーピングを表現する。`.filter-active` は選択中フィルタの強調状態。

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
      <p class="board-item-title">#N HTML レポート展開</p>
      <p class="board-item-meta">epic · 8 subs</p>
    </article>
    <article class="board-item">
      <p class="board-item-title">#N ギャラリー強化</p>
      <p class="board-item-meta">M · area:api</p>
    </article>
  </section>
  <section class="board-lane">
    <header class="board-lane-head">
      <h3>In progress</h3>
      <span class="count">3</span>
    </header>
    <article class="board-item">
      <p class="board-item-title">#N 残り 5 系統追加</p>
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

**構成要素:**

- `.board`: `repeat(4, 1fr)` の grid（モバイル幅で 1 カラム化）
- `.board-lane`: `var(--bg-soft)` 背景 + 1.5px border の角丸カラム
- `.board-lane-head`: flex（h3 左 + `.count` バッジ右）、下に border-bottom
- `.board-lane-head .count`: pill 形バッジ（`var(--bg)` 背景 + border）
- `.board-item`: `var(--bg)` 背景の小カード、hover で `var(--clay)` border
- `.board-item-title`: sans・small、`var(--fg-strong)`（Issue タイトルなど）
- `.board-item-meta`: mono・x-small、`var(--muted)`（種別・サイズ・ラベルなど）
- `.board-toolbar`: 上部の操作行、flex で button 群 + `.board-hintline` 右寄せ
- `.board-btn`: pill 形ボタン、`var(--bg-soft)` 背景・`var(--mono)` フォント
- `.board-btn.filter-active`: 選択中フィルタの強調（`var(--clay)` 背景 + `var(--ivory)` 文字）
- `.board-hintline`: 右端の要約テキスト（mono、`var(--muted)`、`›` 接頭辞付き）

ボードは「**閲覧用の静的スナップショット**」として使う。ドラッグ&ドロップ等のインタラクションは本部品の責務外（必要な場合は JS で別途実装する）。レーン数は通常 4 列まで、5 列以上になる場合はモバイル幅相当でも収まらないため別表現（テーブル等）に切り替える。

### 設定値表示（`.flag-list` / `.flag-info` / `.flag-key`） *(style.css §12-17)*

フィーチャーフラグ・config 値・環境変数など、**「key + value + description」の 3 要素を縦並びで列挙**する。`config-reference` 系ドキュメントや、リリース時のフラグ状態スナップショット、デバッグ時の設定確認画面などで使用。

```html
<div class="flag-list">
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">enable_html_reports</code>
      <span class="flag-value">true</span>
    </div>
    <p class="flag-desc">レビューコメントを HTML 化するかの判定を有効にする。閾値超過時のみ HTML 化。</p>
  </div>
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">html_report_threshold_lines</code>
      <span class="flag-value">80</span>
    </div>
    <p class="flag-desc">レポート本文の行数閾値。これを超えると HTML 化。</p>
  </div>
  <div class="flag-info">
    <div class="flag-row">
      <code class="flag-key">html_report_output_dir</code>
      <span class="flag-value">"reports/"</span>
    </div>
    <p class="flag-desc">HTML レポートの出力先ディレクトリ。リポジトリルートからの相対パス。</p>
  </div>
</div>
```

**構成要素:**

- `.flag-list`: 縦並びの flex（gap 0.6rem）
- `.flag-info`: `var(--bg-soft)` 背景 + 1.5px border の角丸カード（10px radius）
- `.flag-row`: flex（key 左 + value 右、flex-wrap で折り返し）
- `.flag-key`: inline code 風（mono、`var(--clay)` 文字、`var(--bg)` 背景、小さな radius）
- `.flag-value`: mono、`var(--ok-dark)` 文字（true / 数値 / 文字列を等幅で表示）
- `.flag-desc`: sans・small、`var(--muted)`、説明文

**`<table>` との使い分け:**

| 部品 | 用途 | 視覚 |
|------|------|------|
| `<table>` | 多列データ（key + value + type + default + ...） | 一覧性重視 |
| `.flag-list` | key + value + 1 文の説明だけ | 縦に流して読みやすい |

`.flag-list` は項目数が 10 以下、各説明が 1〜2 文に収まる場合に最適。多列が必要なら `<table>` または `.issue-list-table` を選ぶ。`.flag-value` の色は値の種別（true / false / 数値 / 文字列）に応じて将来的に `.flag-value.bool` などのサブクラスで分岐可能だが、現状は単色運用とする。

---

## メタ系

### メタ情報フッター（`.meta`）

```html
<div class="meta">
  <strong>ファイル</strong>: <code>docs/explainers/.../index.html</code><br>
  <strong>元情報</strong>: 関連 Issue / Discussion / ADR<br>
  <strong>用途</strong>: ...
</div>
```

---

## アンチパターン（避けるべき書き方）

| ❌ やらない | ✅ こうする |
|------------|------------|
| 横矢印で 7 ステップ並べる | `<ol class="timeline">` で縦リスト + チップ |
| `#000` / `#fff` などの純色 | パレット変数（`var(--fg)` / `var(--bg)`） |
| SVG `<text>` で fill 省略 | 必ず `fill` を指定（or 本文色を意図して省略） |
| 装飾だけの円・線 | 内容を表現する図 or 番号付きリスト |
| 5 階層以上の見出し | `h1`→`h2`→`h3`→`h4` で十分。`h5` 以上は避ける |
| 1 ページに 5 個以上の SVG | 主要な 1〜3 個に絞る（読み手の負荷増） |
| `.card-grid` に Before/After を混ぜる | 専用部品 `.before-after`（意味的色分け固定） |
| `.summary-card` を装飾的に多用 | セクション末尾の要約 1 件まで |

---

## カラーパレット早見表

| 役割 | 変数 | ライト | ダーク |
|------|------|--------|--------|
| 背景 | `--bg` | `#FAF9F5` ivory | `#1f1d1a` warm dark |
| 本文 | `--fg` | `#3D3D3A` gray-700 | `#d4d0c4` warm light |
| 強い見出し | `--slate` / `--fg-strong` | `#141413` | `#f5f2ea` |
| アクセント | `--clay` | `#D97757` | `#e89377` |
| 緑系 | `--olive` | `#788C5D` | `#a5b07e` |
| 暖タン | `--oat` | `#E3DACC` | `#3d342a` |
| ボーダー | `--border` | `#D1CFC5` | `#44413c` |
| muted | `--muted` | `#87867F` | `#9b988d` |

セマンティック（`--accent` / `--ok` / `--warn` / `--danger` / `--purple`）は本文と同じ変数階層で利用可能。

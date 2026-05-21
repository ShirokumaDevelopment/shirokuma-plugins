---
name: writing-html-explainer
description: 詳細な解説・コンセプト・設計レビューを Markdown ではなく HTML で執筆する。warm パレット + 丸ゴシック + ダークモード対応の独自テンプレートを使い、Docker nginx + cloudflared named tunnel でセルフホスト公開可能な単一ページを生成する。トリガー: 「HTML で詳しく書いて」「HTML 解説」「Pages 用ドキュメント」「コンセプト解説 HTML」「詳細解説ページ」「explainer HTML」「rich doc HTML」。
allowed-tools: Read, Write, Edit, Bash
---

# HTML 解説ドキュメント執筆

**スコープ:** 変更系ワーカー — HTML / CSS / JS ファイルの生成・更新と `pages/` submodule への反映を行う。コミット・push は `commit-issue` に委任する。

Markdown では表現しきれない**長文の解説・設計レビュー・コンセプト議論**を単一の HTML ページとして出力する。Issue / Discussion / PR の本文に URL を貼れば**ブラウザで直接閲覧可能**な詳細資料になる。

## 使用タイミング

| 場面 | 例 |
|------|-----|
| 設計コンセプトを詳しく説明したい | 「shirokuma-flow の協業フェーズモデル」 |
| ワークフロー / ステート遷移を可視化 | 「Issue ライフサイクル全体図」 |
| 過去議論の整理ドキュメント | 「Discussion #N の論点まとめ」 |
| Issue から参照するための参考資料 | 「この決定の背景を別ページで説明」 |
| Markdown だと表現が足りない時 | サイドバー TOC・カラー分類・SVG 図・ダークモード |

短い説明や Markdown で十分な場合は使わない。

## 設計原則

このスキルが生成する HTML の特徴：

1. **単一ページ完結**: `index.html` + `assets/style.css` のみ。ビルド工程なし。
2. **外部 CSS 依存ゼロ**: Bulma 等のフレームワーク不使用。独自パレット。
3. **Google Fonts のみ**: `Kosugi Maru` / `M PLUS Rounded 1c` / `M PLUS 1 Code`。
4. **ダークモード組込**: `data-theme="dark|light"` トグル + `localStorage` 永続化。
5. **HSP 配慮**: 純白・純黒不使用。warm palette + 丸ゴシック系で刺激を抑える。
6. **意味付け色分け**: 装飾色ではなく、フェーズ/ステップ種別に応じた色。
7. **SVG はテーマ追従**: ライト/ダーク両モードで読める配色。

## ワークフロー

### ステップ 1: カテゴリ・パスを確定（必須）

**`.shirokuma/config.yaml` の `pages` セクション**から submodule パス・カテゴリ・URL ベースを読み込む。

カテゴリ選択フローチャート:

| シーン | カテゴリ | パス例 |
|-------|---------|--------|
| Issue #N の補足資料 | `issues` | `pages/issues/{N}/` |
| PR #N の補足資料 | `prs` | `pages/prs/{N}/` |
| Discussion #N の補足（ADR・RFC・議論） | `discussions` | `pages/discussions/{N}/` |
| コンセプト・設計の詳細解説 | `explainers` | `pages/explainers/{topic-slug}/` |
| コード/設計レビュー結果 | `reviews` | `pages/reviews/{topic-slug}/` |
| 進捗・期間報告 | `status` | `pages/status/{topic-slug}/` |
| 障害・ポストモーテム | `incidents` | `pages/incidents/{topic-slug}/` |

`{topic-slug}` は **kebab-case の短い英数字**（例: `workflow-review`, `auth-migration-2026q2`）。

ユーザーに以下を確認:

| 項目 | 例 |
|------|-----|
| カテゴリ | `explainers` |
| topic slug or 番号 | `concept-workflow` または `2620` |
| ページタイトル | 表示用の人間可読タイトル |
| 元情報 | 参照する Issue / Discussion / ADR / 既存資料 |

詳細運用はプロジェクトの pages publishing 設定（submodule・ホスティング）に従う。

### テンプレート種別の選択

呼び出し元（オーケストレーター / ユーザー）は `--template` パラメータでテンプレート種別を選択する。デフォルトは `default`（`template.html` を使う既存挙動）。

| `--template` 値 | reference HTML | 主用途 | 主要呼び出し元 |
|---------------|--------------|------|------------|
| `default` | `template.html` | コンセプト解説・自由構成のドキュメント | `writing-html-explainer` 直接呼び出し、`explainers` 系全般 |
| `review-summary` | `review-summary.html` | レビュー結果全般（評価サマリ + 問題リスト + 推奨アクション） | `analyze-issue`、`review-issue`、`review-flow`、`auditing-docs`（オーケストレーター経由） |
| `design-review` | `design-review.html` | 設計レビュー（Design Brief 整合性 + Aesthetic Direction 評価 + UI チェック） | `design-flow`、`analyze-issue` design ロール（オーケストレーター経由） |
| `postmortem` | `postmortem.html` | 障害報告（status-header + event-log + metric-grid + RCA + actions） | インシデント対応（常時 HTML 化） |
| `implementation-plan` | `implementation-plan.html` | エピック計画（hero + milestone-timeline + risks + dataflow） | `prepare-flow` のエピック計画書、`plan-issue` の Markdown 補助 |

**判定基準・対応オーケストレーター・出力カテゴリの正本**: [`html-report-criteria.md`](../../rules/html-report-criteria.md)

#### テンプレート選択フローチャート

```
報告タイプは何か？
├─ 障害報告（インシデント）            → postmortem
├─ エピック計画 / ロードマップ          → implementation-plan
├─ 設計レビュー / Design Brief 評価     → design-review
├─ レビュー結果（PR / Issue / docs / security） → review-summary
└─ 上記以外の自由構成ドキュメント        → default（template.html）
```

#### カテゴリ選択との関係

`--template` はレポートの**構造（中身のレイアウト）**を決め、`--category`（`pages/<category>/<slug>/` のディレクトリ）は**配置先**を決める。両者は独立して指定する。例:

| ケース | `--template` | `--category` | `--slug` |
|-------|-------------|-------------|---------|
| PR #1234 のセキュリティレビュー | `review-summary` | `reviews` | `security-pr-1234` |
| Issue #N の設計レビュー | `design-review` | `reviews` | `design-{N}` |
| 2026-05 のインシデント報告 | `postmortem` | `incidents` | `2026-05-outage` |
| エピック #N 計画書 | `implementation-plan` | `issues` | `{N}` |
| コンセプト解説 | `default` | `explainers` | `concept-workflow` |

カテゴリ ↔ 報告タイプの完全な対応表は [`html-report-criteria.md`](../../rules/html-report-criteria.md) §4 を参照。

### ステップ 2: 共通アセットの確認・テンプレートコピー

`pages/assets/` には **全ページ共通**の `style.css` と `theme.js` が置かれる。HTML 側からは絶対パス `/assets/style.css` `/assets/theme.js` で参照する。

```bash
SKILL=plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference

# 共通 assets を初回のみ配置（既に存在する場合はスタイル更新時のみ上書き）
mkdir -p pages/assets
[ -f pages/assets/style.css ] || cp $SKILL/style.css pages/assets/style.css
[ -f pages/assets/theme.js ]  || cp $SKILL/theme.js  pages/assets/theme.js

# 例: explainers カテゴリで topic="concept-workflow" の場合
CATEGORY=explainers
TOPIC=concept-workflow
OUTDIR=pages/${CATEGORY}/${TOPIC}

# テンプレート種別に応じてコピー元を切り替える
# --template default            → template.html
# --template review-summary     → review-summary.html
# --template design-review      → design-review.html
# --template postmortem         → postmortem.html
# --template implementation-plan → implementation-plan.html
TEMPLATE_FILE=template.html  # 例: --template default の場合

mkdir -p ${OUTDIR}
cp $SKILL/${TEMPLATE_FILE} ${OUTDIR}/index.html
```

**重要**: 各ページディレクトリには `assets/` を作らない（共通参照のため）。

テンプレ内のプレースホルダを置換:

**共通プレースホルダ（全テンプレート）:**

| プレースホルダ | 置換内容 |
|---------------|---------|
| `{{TITLE}}` | ページタイトル（h1 + `<title>` の 2 箇所） |
| `{{OUTPUT_PATH}}` | `pages/{category}/{slug}/index.html` |
| `{{PURPOSE}}` | このドキュメントの用途を 1 行で |

**テンプレート固有プレースホルダ:**

| テンプレート | プレースホルダ | 置換内容 |
|-----------|-------------|---------|
| `review-summary` / `design-review` | `{{REPORT_TYPE}}` | レポート種別（例: `pr-review` / `design-review` / `requirements-review`） |
| `review-summary` / `design-review` | `{{REPORT_LEAD}}` | リード文（1〜2 文の総合評価） |
| `review-summary` | `{{TARGET}}` / `{{ROUND}}` | レビュー対象（PR 番号等）/ ラウンド番号 |
| `review-summary` / `design-review` | `{{SCORE_HINT}}` | スコアカードのヒント文 |
| `postmortem` | `{{INCIDENT_ID}}` / `{{SEV}}` / `{{STATUS}}` / `{{DURATION}}` | status-header の 4 値 |
| `postmortem` | `{{REQUEST_FAILURES}}` / `{{AFFECTED_USERS}}` / `{{PEAK_LATENCY}}` | metric-grid の数値 |
| `postmortem` | `{{ACTION_N}}` / `{{OWNER_N}}` / `{{DUE_N}}` | アクションアイテム表の行 |
| `implementation-plan` | `{{PERIOD}}` / `{{PROJECT_LEAD}}` / `{{STATUS}}` | ヒーローのメタ情報 |
| `implementation-plan` | `{{RISK_N}}` / `{{IMPACT_N}}` / `{{MITIGATION_N}}` | リスク表の行 |
| `implementation-plan` | `{{CRITERIA_N}}` | 受け入れ基準の項目 |

> **注**: `implementation-plan` ではリード文の placeholder は `{{PROJECT_LEAD}}` を使用（他テンプレートの `{{REPORT_LEAD}}` と区別）。プロジェクト概要のリード文（中長期的な目標説明）と、レポート全体のリード文（評価サマリの 1〜2 文）を意味的に分離する設計判断。

不要なプレースホルダ枠は削除し、必要な箇所だけ実値で置き換える。

**共通 CSS/JS 更新が必要な場合**（新しい部品追加・既存スタイル変更時）:

```bash
# 1. リファレンス側で編集
$EDITOR $SKILL/style.css     # or theme.js
# 2. submodule に同期 + キャッシュバスター更新
cp $SKILL/style.css pages/assets/style.css
cp $SKILL/theme.js  pages/assets/theme.js
# 3. 下記「?v=N Bumping ポリシー」に従い 4 箇所を同じ値で +1 インクリメント
```

#### `?v=N` Bumping ポリシー（キャッシュバスター）

`pages/assets/style.css` または `pages/assets/theme.js` を更新したら、以下 4 箇所の `?v=N` を**同じ値で +1 インクリメント**する。値がズレるとブラウザキャッシュが選択的にしか更新されず、UI が部分的に古いまま表示される。

| ファイル | 更新する `?v=N` の対象 |
|---------|----------------------|
| `pages/explainers/*/index.html`, `pages/issues/*/index.html` 等の全ページ | `<link href="/assets/style.css?v=N">` / `<script src="/assets/theme.js?v=N">` |
| `pages/index.html`（索引ページ） | 同上（`build-pages-index.mjs` の出力テンプレート内 `?v=N`） |
| `plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/template.html` | 新規生成時の初期値として揃える |
| `plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/review-summary.html` | 同上（報告系テンプレート） |
| `plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/design-review.html` | 同上 |
| `plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/postmortem.html` | 同上 |
| `plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/implementation-plan.html` | 同上 |
| `scripts/build-pages-index.mjs` | 索引再生成時のテンプレート埋め込み値 |

確認コマンド:

```bash
grep -rnE 'style\.css\?v=|theme\.js\?v=' pages/ plugin/shirokuma-skills-ja/skills/writing-html-explainer/reference/ scripts/build-pages-index.mjs
# → すべての行で同じ `?v=N` が表示されることを確認
```

### ステップ 3: 本文を埋める

`reference/snippets.md` の部品カタログから適切なパターンを選び、内容を差し込む。

**典型的な構成**（必須ではない）:

```
1. 概要 / 前提（blockquote + 短い導入）
2. 全体像（フェーズカード / 表 / SVG）
3. 詳細セクション（複数）
   - phase-card で章を区切る
   - timeline + チップ で手順を可視化
   - qbox で論点を明示
4. 横断的な仕組み（panel 風の表 or 表）
5. 一覧テーブル（承認ゲート / コンポーネント等）
6. 論点まとめ（番号付きリスト）
7. メタ情報（フッター）
```

**書く時のチェックリスト**:

- [ ] サイドバー TOC を実コンテンツに合わせて更新
- [ ] 各 `<h2>` に `id=""` を付与（TOC リンク用）
- [ ] SVG の塗り/線は**「SVG カラーパレット（ダーク対応済み）」から選ぶ**（「部品の追加・カスタマイズ」参照）。表に無い新規色を使う場合は `[data-theme="dark"] .diagram svg [fill="..."] / [stroke="..."]` の暗色ペアを **style.css に必ず追加**
- [ ] SVG 追加後、**未対応色が無いか下記の検証コマンドで確認**（目視だけに頼らない）
- [ ] SVG `<text>` に `fill` を必ず指定（または意図的に省略して本文色追従）
- [ ] `<code>` で囲むのは識別子・短いコマンドのみ
- [ ] `<strong>` の濫用を避ける（1 段落で最大 1〜2 箇所）

**SVG ダーク対応の検証**（未対応色を機械的に検出。`pages/` で実行）:

```bash
for c in $(grep -oE '(fill|stroke)="#[0-9A-Fa-f]{3,6}"' ${CATEGORY}/${TOPIC}/index.html \
            | grep -oE '#[0-9A-Fa-f]{3,6}' | sort -u); do
  grep -q "\[fill=\"$c\"\]\|\[stroke=\"$c\"\]" assets/style.css || echo "未対応: $c"
done
# 何も出力されなければ全色がダークモードに追従する
```

### ステップ 4: ローカル動作確認

`/assets/...` 絶対パス参照のため、サーバを **submodule ルート（`pages/`）** で起動する必要がある:

```bash
cd pages
python3 -m http.server 8080
# ブラウザで http://localhost:8080/${CATEGORY}/${TOPIC}/
```

確認項目:

- [ ] ライトモード表示
- [ ] テーマトグルでダークモードに切替
- [ ] TOC リンクで各セクションへスクロール
- [ ] SVG 図がライト/ダーク両方で読める
- [ ] **SVG クリックで拡大ダイアログが開く・ESC で閉じる**
- [ ] モバイル幅（< 900px）で TOC が上部に折り畳まれる

### ステップ 5: 索引ページの再生成

新規ページ追加・既存ページのタイトル変更時は、**全ページを横断するトップ索引** `pages/index.html` を再生成する:

```bash
node scripts/build-pages-index.mjs
```

スクリプトが `pages/{category}/{topic}/index.html` を全スキャンしてカテゴリ別グルーピング + ライブ検索付き索引を生成。出力は `pages/index.html`。

### ステップ 6: submodule コミット + 親リポポインタ更新

`pages/` は submodule なので、**submodule 内でコミット → push** してから親リポでポインタを更新する。

```bash
# 6-1. submodule 側（新規ページ + 再生成された index.html を一緒に）
cd pages
git add ${CATEGORY}/${TOPIC}/ index.html
git commit -m "docs(${CATEGORY}): add ${TOPIC}"
git push origin main

# 6-2. 親リポへ戻り submodule ポインタを進める
cd ..
git add pages
git commit -m "chore(pages): bump submodule for ${CATEGORY}/${TOPIC}"
```

親リポへの push は通常の implement-flow / commit-issue に委ねる（PR ベース）。

### ステップ 7: 公開 URL を提示

submodule への push 完了後、ホスト側 nginx の bind mount により**即時反映**される（外部ビルド不要）。cloudflared named tunnel 経由で固定 URL からアクセス可能。`pages.baseUrl` を組み合わせて URL を生成:

```
{baseUrl}/{category}/{topic}/
```

例:
- `explainers` → `{baseUrl}/explainers/concept-workflow/`
- `issues/{number}` → `{baseUrl}/issues/{number}/`

**Issue / PR / Discussion でのリンク例:**

```markdown
詳細は [{タイトル}]({URL}) を参照。
```

完成後ユーザーに提示する情報:
1. 生成パス（`pages/{category}/{topic}/`）
2. 公開 URL（`baseUrl/{category}/{topic}/`）
3. リンク貼付用 Markdown スニペット
4. submodule 進捗（既に push 済み / 親コミット済み）

## 部品の選択指針

`reference/snippets.md` の部品をいつ使うかの早見:

| シーン | 使う部品 |
|-------|---------|
| ページ冒頭で章一覧を一望させる | `.toc-grid`（章番号付き目次グリッド） |
| ページ冒頭で「このページは何か」を強く示す | `.hero`（eyebrow + h1 + lead + tags） |
| 3〜4 件の選択肢を横並びで比較 | `.card-grid`（`.card` の auto-fit グリッド） |
| 修正前後・移行前後を意味的に対比 | `.before-after`（danger ↔ ok の色分け固定） |
| コードと結果（または図解）を左右に並置 | `.code-visual`（`<pre>` ↔ `.visual`） |
| セクションのまとめ・重要事項を 1 ブロックに集約 | `.summary-card`（`warn` / `ok` / 無印） |
| 「詳細へ」誘導リンクを目立たせる | `.cta-link`（自動 `→` 付与） |
| 長いコード・補足情報を折り畳む | `details.collapse`（chevron 0.2s 回転） |
| 章をカード化したい | `.phase-card`（バリアントで色分け） |
| 順序付き手順を見せる | `.timeline` + 種別チップ |
| 論点を強調 | `.qbox` |
| 既知の問題・注意 | `blockquote.warn` |
| 成功確認 / 仮説確定 | `blockquote.callout` |
| 短い識別子 | `<code>` |
| 状態タグ・分類 | `<span class="tag ...">` |
| 全体図・関係図 | SVG（カラーは推奨ペアから） |
| 一覧データ | `<table>` |

## 部品の追加・カスタマイズ

ベースの style.css に**新規セレクタを追加する場合**:

1. 既存変数（`--accent` / `--ok` 等）から色を組み立てる
2. ダークモード用の上書きを `[data-theme="dark"]` セクションに必ず追加
3. SVG で新規色を使った場合は `[data-theme="dark"] .diagram svg [fill="..."]` ルールを追加

CSS バージョンを上げる場合は `<link href="assets/style.css?v=N">` の `N` をインクリメント（ブラウザキャッシュ対策）。

### SVG カラーパレット（ダーク対応済み）

SVG の `fill` / `stroke` は原則この表の色から選ぶ。**いずれも style.css に `[data-theme="dark"]` の暗色ペアが定義済みのため、登録なしでダークモードに自動追従する**。意味（フェーズ / 種別）に対応させて使うこと。

| 役割 | 薄背景（box bg） | 中間（線・マーカー） | 濃（見出し文字） |
|------|-----------------|--------------------|-----------------|
| ニュートラル | `#F0EEE6` / `#FAF9F5` | `#87867F` | `#3D3D3A` |
| 紫（accent） | `#e6dde9` | `#856ea3` | `#4b3680` |
| 青（info） | `#dde5ef` | `#4d7299` | `#2c4d75` |
| 緑（ok） | `#dde5d0` | `#788C5D` | `#4f5f3d` |
| 黄褐（warn） | `#f0e3c0` / `#f0e3b8` | `#b08838` | `#6e5417` |
| 赤褐（danger） | `#ecd6cd` | `#a85040` | `#6e2f25` |
| タン / クレイ | `#E3DACC` | `#D97757` | — |

- 単純な図なら `fill="var(--bg-soft)"` / `fill="var(--fg-strong)"` / `stroke="var(--border)"` のように **CSS 変数**を使うと登録不要で自動追従する（`.artboard` 例参照）。
- 上表に無い色をどうしても使う場合は、`[data-theme="dark"]` の暗色ペアを style.css に追加し、上記の**検証コマンドで未対応 0 を確認**する。これを怠ると「ライトでは見えるがダークで背景が浮く」不具合になる（典型的な見落とし）。

## アンチパターン

- ❌ Markdown で書ける内容を HTML 化する（情報密度が低いなら Markdown のままに）
- ❌ Bulma / Tailwind / Pico などの CSS ライブラリを併用する（パレット崩壊）
- ❌ JavaScript で動的レンダリング（静的 HTML として完結させる）
- ❌ 純白 `#fff` / 純黒 `#000` の使用（warm palette を維持）
- ❌ SVG `<text>` に `fill` 未指定（ダークモードで黒のまま見えなくなる）
- ❌ 複数の Google Fonts ファミリーを増やす（指定 3 種以外は使わない）

## 前提条件（submodule 初期セットアップ）

このスキルは `pages/` が **submodule として親リポに追加済み**であることを前提とする。未セットアップの場合はプロジェクトの pages submodule セットアップ手順に従う。

## 参考実装

`docs/workflow-review/index.html` がリファレンス実装（submodule 移行前の試作）。submodule 整備後は `pages/explainers/workflow-review/` への移動を推奨。

## 多言語対応

- JA 版を正本、EN 版（`plugin/shirokuma-skills-en/skills/writing-html-explainer/`）も新規作成済み。両言語で同一の `reference/` 構成と SKILL.md 構造を維持する。
- 修正は JA 版を先に行い、対応する EN 版セクションを翻訳して同期する。スキル本体（CSS / JS / HTML テンプレート）に言語依存はなく、SKILL.md と `snippets.md` の自然言語のみが翻訳対象。
- 同期方針の詳細は [`plugin/specs/skills/writing-html-explainer/DESIGN.md`](../../../../plugin/specs/skills/writing-html-explainer/DESIGN.md) の「多言語対応」節を参照。JA/EN 同期チェック観点（行数閾値・プレースホルダ数・コードブロック数）の正本は [`html-report-criteria.md` §7](../../rules/html-report-criteria.md)。

## 関連スキル

- `commit-issue`: 生成後のコミット・プッシュ
- `writing-manual`: Diátaxis ベースの体系的マニュアル（Markdown）
- `write-adr`: 意思決定の記録（Discussion）

短い解説で十分なら `writing-manual` を使う。HTML を選ぶのは「情報密度が高く、視覚的整理が読みやすさに直結する」場合のみ。

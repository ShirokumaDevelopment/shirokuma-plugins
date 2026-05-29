---
paths:
  - "**/skills/analyze-issue/**"
  - "**/skills/review-issue/**"
  - "**/skills/review-flow/**"
  - "**/skills/reviewing-security/**"
  - "**/skills/auditing-docs/**"
  - "**/skills/writing-html-explainer/**"
  - "**/skills/design-flow/**"
  - "**/skills/implement-flow/**"
---

# 報告系スキルの HTML 化判定基準

報告系スキル（`analyze-issue` / `review-flow` / `review-issue` / `reviewing-security` / `auditing-docs`）が生成する Markdown レポートを HTML レポートに昇格させるかどうかの判定基準・テンプレート選択・出力カテゴリ決定を一元管理するルール。

**正本**: 本ファイル。各 SKILL.md には閾値・テンプレート名・カテゴリ名を**直書きしない**。本ファイルへの参照のみを記述し、drift を防ぐ。


---

## 1. HTML 化判定の責務分担

| レイヤー | 担当 | 責務 |
|---------|------|------|
| 報告系スキル（調査系） | `analyze-issue` 等 | Markdown レポートを生成し GitHub コメント投稿。**判定情報**（行数・KB・Critical+High 件数・報告タイプ）を呼び出し元へ返却 |
| オーケストレーター | `design-flow` / `review-flow` / `implement-flow` | 返却された判定情報と本ファイルの基準を照合して HTML 化を判定。YES の場合のみ `writing-html-explainer` を呼び出す |
| HTML 生成エンジン（変更系） | `writing-html-explainer` | テンプレート種別パラメータを受け取り HTML を生成。submodule コミット・索引再生成 |

**責務境界**: 調査系スキルが変更系スキル（`writing-html-explainer`）を直接 Skill 呼び出ししないこと。`skill-scope-boundaries.md` の「カテゴリの混在禁止」「提案と実行の分離」を遵守する。

---

## 2. 判定基準テーブル

以下のいずれか **1 つでも満たす場合** に HTML 化を実施する。すべて満たさない場合は従来の Markdown コメントのみとする。

| 基準 | 閾値 | 根拠 |
|------|------|------|
| 行数 | レポート本文 **≥ 80 行** | GitHub コメントの視認性が著しく低下する目安 |
| サイズ | レポート本文 **≥ 8 KB** | コメント表示パフォーマンスへの影響 |
| 指摘件数（Critical + High の合計） | **≥ 3 件** | 優先度別整理・推奨アクション表示の価値が高い |
| 報告タイプ固有（常時 HTML 化） | `postmortem` | 障害報告は常に構造化表示が必要 |
| 報告タイプ固有（常時 HTML 化） | `security-pr-review`（`reviewing-security` の実行結果） | PR セキュリティレビューは常に構造化表示が必要 |
| 報告タイプ固有（常時 HTML 化） | `implement-flow-summary` | PR 作業サマリーは PR ページとセットで常に HTML 化する |
| 報告タイプ固有（常時 HTML 化） | `requirements-review`（`analyze-issue requirements` の実行結果） | 要件レビューはトリアージ経路での人間レビュー必須ステージであり常に構造化表示が必要 |
| 報告タイプ固有（常時 HTML 化） | `design-review`（`design-flow` の設計レビュー PASS 結果） | 設計レビューは設計品質を確定する人間レビュー必須ステージであり常に構造化表示が必要 |

> **人間レビュー必須ステージのポリシー**: 人間がレビューを行う必要があるステージ（トリアージ提出・PR セキュリティレビュー・障害報告・実装サマリー・設計レビューなど）は、閾値に関わらず常時 HTML 化の対象とする。将来新規フローを追加する際も、人間レビューが必要なレポートタイプは `always_html_types` に追加すること。**`always_html_types` 配列と §2 テーブルが真実の正本**。本散文は意図の説明であり、実際の登録は配列とテーブルで行うこと。

> **注**: 判定では Critical + High の合計のみを使用する。レポート本文の「問題サマリー表」では Critical / High / Medium / Low を個別に表示するが、判定式と表示項目を混同しないこと。

> **`auditing-security` は対象外**: `auditing-security` は依存パッケージの脆弱性スキャン → Issue 起票で完結するスキルであり、HTML レポートを生成しない。「常時 HTML 化」対象は `reviewing-security`（PR セキュリティレビュー）に限定する。

---

## 3. テンプレート対応表

`writing-html-explainer` は `--template` パラメータでテンプレート種別を選択する。4 種のテンプレートと使用する主要部品（snippets.md カタログより）の対応:

| テンプレート | 用途・対象スキル | 主要部品 |
|-----------|-------------|--------|
| `review-summary` | レビュー結果全般。`analyze-issue`（plan / requirements / design / research）、`review-issue`（code / security / testing / docs）、`review-flow`、`auditing-docs` | `review-score-card`（PASS/FAIL/NEEDS_REVISION）/ `issue-list-table`（Critical/High/Medium/Low の問題リスト）/ `action-items`（推奨アクション順序付きリスト） |
| `design-review` | 設計レビュー。`design-flow` / `analyze-issue` の design ロール | `phase-card`（章カード）/ `review-score-card` / `summary-card`（Design Brief 整合性・Aesthetic Direction 評価サマリ） |
| `postmortem` | 障害報告（インシデント対応） | `status-header`（ID + SEV + Status + Duration の 4 列メタ）/ `event-log`（時刻スタンプ型タイムライン）/ `metric-grid`（影響指標カードグリッド） |
| `implementation-plan` | エピック計画レポート。`prepare-flow` のエピック計画書 / `plan-issue` の Markdown 補助 | `hero`（プロジェクト概要 + tags）/ `milestone-timeline`（Week N · day–day グルーピング + 配下タスク群）/ リスク `<table>` / データフロー SVG |
| `default` | 汎用。スキル解説・Issue 補足・PR 作業サマリー（`implement-flow` 完了報告）・PR マスターページ（リンク集） | — |

**drift 防止ルール**: 各 SKILL.md にテンプレート名や閾値を**直書きしない**。本ファイル（`html-report-criteria.md`）を必ず参照する。テンプレート追加・閾値変更は本ファイルで一元管理する。

---

## 4. 報告タイプ ↔ カテゴリマッピング

`pages/` submodule（プロジェクトの pages カテゴリ定義）への出力先カテゴリと slug 命名規約。

| 報告タイプ | カテゴリ | パス例 | slug 命名規約 | 用途 |
|-----------|---------|--------|-------------|------|
| PR レビュー結果 | `reviews` | `pages/reviews/pr-{number}-r{round}/` | `pr-{number}-r{round}` | **legacy / #2629 以前の出力先。新規は「PR ライフサイクル（コードレビュー）」行を使用。** |
| Issue 要件レビュー | `issues` | `pages/issues/{number}/` | Issue 番号 | 要件品質・設計品質の詳細レポート |
| Discussion / ADR レビュー | `discussions` | `pages/discussions/{number}/` | Discussion 番号 | Discussion #N の評価結果 |
| 設計レビュー | `issues` | `pages/issues/{number}/` | 設計 Issue 番号 | `design-flow` の設計評価結果 |
| リサーチレビュー | `reviews` | `pages/reviews/research-{issue-number}/` | `research-{issue-number}` | research ロールの評価結果 |
| セキュリティ PR レビュー | `reviews` | `pages/reviews/security-pr-{number}/` | `security-pr-{number}` | `reviewing-security` の PR セキュリティレビュー結果 |
| ドキュメント監査 | `reviews` | `pages/reviews/docs-{year}{quarter}/` | `docs-{year}{quarter}`（例: `docs-2026q2`） | `auditing-docs` の構造監査結果 |
| 障害ポストモーテム | `incidents` | `pages/incidents/{year}-{slug}/` | `{year}-{slug}`（例: `2026-05-outage`） | 障害報告（`postmortem` テンプレート使用） |
| 進捗・期間報告 | `status` | `pages/status/{slug}/` | `{period}`（例: `q1-2026`） | Q1 報告等 |
| PR ライフサイクル（マスター） | `prs` | `pages/prs/{number}/index.html` | `{PR 番号}` | PR 全体ページ（レビュー・作業サマリーへのリンク集） |
| PR ライフサイクル（作業サマリー） | `prs` | `pages/prs/{number}/summary.html` | `{PR 番号}` | implement-flow の作業サマリー（`--output-filename summary.html`） |
| PR ライフサイクル（コードレビュー） | `prs` | `pages/prs/{number}/review-r{n}.html` | `{PR 番号}` | review-flow の各ラウンド（`--output-filename review-r{n}.html`） |
| PR ライフサイクル（修正報告） | `prs` | `pages/prs/{number}/fix-r{n}.html` | `{PR 番号}` | review-flow のスレッド対応報告（条件付き。`--output-filename fix-r{n}.html`） |

> **PR ライフサイクル（修正報告）の HTML 化条件**: コード修正スレッドが 1 件以上ある場合のみ生成。さらに §2 の閾値判定（行数 / KB / Critical+High 件数）のいずれかを満たす場合のみ HTML 化する（常時 HTML 化ではない）。

**slug 命名規約**: `reviews/` カテゴリ内でセキュリティレビュー / ドキュメント監査 / リサーチレビューが混在しても一覧性を保つため、プレフィックス（`security-pr-` / `docs-` / `research-`）を必須とする。（PR コードレビューは `prs/` カテゴリに移行済みのため `pr-` プレフィックスはここでは不要。設計レビューは `issues/` カテゴリに移行済みのため `design-` プレフィックスも不要）

**配置の例外**: PR の補足資料（差分解説・設計判断）と併用したい場合は `prs/{number}/` への配置も許容する（オーケストレーター側で選択肢を提示）。

カテゴリ ↔ URL の対応は各プロジェクトの pages 設定（カテゴリ定義）に従う。

---

## 5. オーケストレーター実装ガイド

オーケストレーター（`design-flow` / `review-flow` / `implement-flow`）が報告系スキル完了後に行う判定 → 呼び出しの流れ。

### 5-1. 判定情報の受け取り

報告系スキル（`analyze-issue` / `review-issue` / `review-flow` / `auditing-docs` / `reviewing-security`）はレポート生成完了時に以下の情報をオーケストレーターへ返却する:

| 項目 | 内容 |
|------|------|
| `report_lines` | レポート本文の行数 |
| `report_kb` | レポート本文のサイズ（KB） |
| `critical_high_count` | Critical + High の合計件数 |
| `report_type` | 報告タイプ（`pr-review` / `design-review` / `requirements-review` / `research-review` / `docs-audit` / `security-pr-review` / `postmortem` 等） |

### 5-2. 判定式（擬似コード）

```
always_html_types = ["postmortem", "security-pr-review", "implement-flow-summary", "requirements-review", "design-review"]

should_html = (
  report_type in always_html_types
  or report_lines >= 80
  or report_kb >= 8
  or critical_high_count >= 3
)
```

### 5-3. HTML 化 YES の場合の呼び出し

```
1. テンプレート種別を決定（§3 対応表）
   - レビュー結果 → review-summary
   - 設計レビュー → design-review
   - 障害報告    → postmortem
   - エピック計画 → implementation-plan
2. カテゴリ・slug を決定（§4 マッピング表）
3. writing-html-explainer を呼び出す（Skill ツール / SubAgent）
   - --template <種別>
   - --category <カテゴリ>
   - --slug <命名規約に従った slug>
   - --title <ページタイトル>
   - --source-report <Markdown レポート本文 or 参照>
4. 戻り値の公開 URL を取得
5. Issue / PR コメントに「サマリー表 + URL」形式で追記（§5-4）
```

### 5-4. コメント本文テンプレート（HTML 化 YES の場合）

```markdown
## {レポートタイプ} 完了

{1〜2 文の総合評価コメント。}

### 問題サマリー

| 深刻度 | 件数 |
|--------|------|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |

> HTML 化判定: Critical + High の合計 {n} 件（閾値: ≥ 3 件 / 行数 {lines} / サイズ {kb} KB）

**推奨アクション（上位 3 件）:**
1. {最優先アクション}
2. {次のアクション}
3. {任意のアクション}

詳細は [HTML レポート]({URL}) を参照してください。
```

HTML 化 NO の場合は従来通り Markdown 本文をそのままコメントとして投稿する。

---

## 6. drift 防止と更新手順

**drift 防止ルール**:
- 各 SKILL.md は**閾値値・テンプレート名・カテゴリ名を直書きしない**
- 必ず「詳細は `html-report-criteria.md` を参照」の形で本ファイルへリンクする
- 閾値変更・テンプレート追加・カテゴリ変更は本ファイルで一元的に行う

**本ファイル更新時のチェック**:
1. プロジェクトの pages カテゴリ定義と §4 が一致しているか
2. `writing-html-explainer/reference/` 配下に対応するテンプレート HTML が存在するか
3. `writing-html-explainer/reference/snippets.md` に対応する snippets セクションが存在するか
4. EN 版 `plugin/shirokuma-skills-en/skills/writing-html-explainer/` と内容が同期されているか

---

## 7. JA/EN 同期チェック観点

`writing-html-explainer` および本ファイルが参照する報告系スキル（`analyze-issue` / `review-flow` / `review-issue` / `reviewing-security` / `auditing-docs`）の JA / EN 版は構造同等性を維持する。

### 同期チェック基準

`auditing-docs` のステップ 2b「EN/JA 同期漏れの検出」は以下の閾値を使用する:

| 対象 | 閾値 | 検出方法 |
|------|------|---------|
| SKILL.md の行数差 | **50 行以上** | `wc -l plugin/shirokuma-skills-{ja,en}/skills/{skill}/SKILL.md` |
| `reference/snippets.md` の行数差 | **50 行以上** | `wc -l plugin/shirokuma-skills-{ja,en}/skills/writing-html-explainer/reference/snippets.md` |
| テンプレート HTML のプレースホルダ数差 | **1 件以上** | `grep -oE '\{\{[A-Z_]+\}\}' {template}.html \| sort -u \| wc -l` の JA/EN 比較 |
| `snippets.md` / `SKILL.md` のコードブロック数差 | **1 件以上** | ` ``` ` で始まる行数の JA/EN 比較 |
| `style.css` / `theme.js` のバイト数差 | **0 以外** | 言語非依存ファイルは完全同一が必須（`diff -q` で確認） |

行数差 50 行以上は **内容ドリフトの疑い**として警告（即エラーではなく要レビュー扱い）。

### 同期維持の原則

- **正本は JA 版** — 修正は JA 版を先に行い、対応する EN 版セクションを翻訳して同期させる
- **言語非依存ファイル**（`style.css` / `theme.js` / テンプレート HTML のプレースホルダ・構造）は完全同一にする
- **`reference/html-report-decision.md`** など 1 階層深いファイルも JA / EN 両方に同名で配置（参照パスのみ階層差で調整）

### 関連参照

- `skill-scope-boundaries` ルール（スキル責務境界）
- `plugin/shirokuma-skills-*/skills/auditing-docs/SKILL.md` のステップ 2b

---

## 関連

- `pages-publishing`（プロジェクト固有）— pages submodule 運用ルール
- `skill-scope-boundaries` — 調査系 / 変更系の責務境界
- `docs-layering` ルール — 三層配置モデル
- `plugin/shirokuma-skills-ja/skills/writing-html-explainer/SKILL.md` — HTML 生成エンジン

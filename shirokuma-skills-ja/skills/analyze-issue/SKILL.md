---
name: analyze-issue
description: Issue 分析ロール（plan / requirements / design / research）を提供します。計画品質・要件品質・設計品質・リサーチ品質をチェックし、Issue コメントにレポートを投稿します。トリガー: 「計画レビュー」「要件レビュー」「要件確認」「設計レビュー」「リサーチレビュー」「plan review」「requirements review」「design review」「research review」「要件整合性」「ADR 確認」「過去の決定を確認」「計画チェック」「デザインレビュー」。
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

## プロジェクトルール

!`shirokuma-flow rules inject --scope review-worker`

# Issue 分析

Issue コンテンツ（計画・要件・設計・リサーチ）の品質を専門ロール別に分析・レビューするスキル。`review-issue` から分離された Issue 分析専用スキル。

## 利用可能なロール

| ロール | 焦点 | トリガー |
|--------|------|----------|
| **plan** | 要件カバレッジ、タスク粒度、リスク | "plan review", "計画レビュー" |
| **requirements** | Issue 本文の完全性・明確性・実行可能性 | "requirements review", "要件レビュー", "要件確認" |
| **design** | Design Brief、Aesthetic Direction、UI 実装 | "design review", "設計レビュー" |
| **research** | 要件合致性、調査品質、実装可能性 | "research review", "リサーチレビュー" |

## ワークフロー

```
ロール選択 → ナレッジ読み込み → Issue 取得 → 分析 → レポート生成 → Issue コメント保存 → HTML 化判定
```

### 1. ロール選択

ユーザーリクエストに基づき適切なロールを選択：

| キーワード | ロール | 読み込むファイル | HTML テンプレート |
|------------|--------|-----------------|----------------|
| "plan", "計画レビュー" | plan | roles/plan.md, criteria/plan.md | `review-summary` |
| "requirements", "要件レビュー", "要件確認" | requirements | roles/requirements.md | `review-summary` |
| "design", "設計レビュー", "デザイン" | design | criteria/design, roles/design | `design-review` |
| "research", "リサーチレビュー" | research | roles/research, criteria/research | `review-summary` |

> **HTML テンプレート列**: ステップ 7「HTML 化判定」で呼び出し元オーケストレーターに返却する `template_name` 値。テンプレートとロールの対応の正本は [`html-report-criteria.md`](../../rules/html-report-criteria.md) §3 を参照。

**HTML 化判定スキップ条件**: ロール判定後、PASS 判定で指摘 0 件かつレポート本文 80 行未満が確定している場合、ステップ 7 の構造化出力で `html_report_required: false` を返してよい（閾値の正本は `html-report-criteria.md` §2 を参照）。**ただし `always_html_types` 対象のロール（`requirements`: `report_type: requirements-review`、`design`: `report_type: design-review`）は本スキップ条件の適用外。常に `html_report_required: true` を返す。**

### 2. ナレッジ読み込み

ロールに基づき必要なナレッジファイルを読み込む：

```
1. 自動読み込み: .claude/rules/*.md（ファイルパスに基づく）
2. ロール固有: roles/{role}.md
3. 基準: criteria/{relevant}.md（plan / design / research ロール）
```

**注意**: プロジェクト固有のルールは `.claude/rules/` から自動読み込み — 手動読み込み不要。

### 3. shirokuma-flow Lint 実行

**全ロールでスキップ（対象が Issue 本文 / 設計成果物 / 調査結果であり、コード/ドキュメントファイルではないため）**

### 4. Issue 分析

**requirements ロール:**

1. `shirokuma-flow issue context {number}` で Issue 本文を取得し、`.shirokuma/github/{org}/{repo}/issues/{number}/body.md` を Read ツールで読み込む
2. 各セクション（目的・概要・再現手順・成果物・検討事項）の有無と内容を分析
3. レビューチェックリスト（`roles/requirements.md`）の各項目を評価
4. アンチパターンとの照合
5. 完全性・明確性・実行可能性・整合性を判定
6. 設計要否判定を実施し `**設計要否:** NEEDED / NOT_NEEDED` をレポートに追記（`roles/requirements.md` の設計要否判定セクション参照）

**plan ロール:**

1. `shirokuma-flow issue context {number}` で親 Issue を取得し、`.shirokuma/github/{org}/{repo}/issues/{number}/body.md` を Read ツールで読み込む
2. `subIssuesSummary` からタイトルが「計画:」で始まる計画 Issue を特定する（これが `{plan-issue-number}`）
3. `shirokuma-flow issue context {plan-issue-number}` で計画 Issue の本文を取得し、`.shirokuma/github/{org}/{repo}/issues/{plan-issue-number}/body.md` を Read ツールで読み込む
4. 計画 Issue の `## 計画` セクションを抽出してレビュー対象とする
5. レビューチェックリスト（`roles/plan.md`）の各項目を評価
6. レビュー基準（`criteria/plan.md`）の 15 観点と照合し、High 以上の指摘を検出
7. アンチパターンとの照合
8. 要件・成果物との整合性を検証
9. **計画 Issue の並存検出**: `shirokuma-flow issue sub-list {parent}` を実行し、複数並存していれば Critical 指摘（`criteria/plan.md` 観点 7）
10. **コメント投稿先**: レビュー結果は**計画 Issue (子) にコメントとして投稿**する（親 Issue ではなく `{plan-issue-number}` にコメント）。これにより計画 Issue (子) が Review Status になった際に人間レビュアーがコメントを直接参照できる

**後方互換**: 計画 Issue（子 Issue）が存在せず、親 Issue 本文に `## 計画` セクションがある場合は、旧方式として親 Issue の `## 計画` セクションをレビュー対象とし、親 Issue にコメントを投稿する。

**design ロール:**

1. `shirokuma-flow issue context {number}` で Issue 本文を取得し、`.shirokuma/github/{org}/{repo}/issues/{number}/body.md` を Read ツールで読み込む
2. Design Brief、Aesthetic Direction、UI 実装結果を抽出
3. レビューチェックリスト（`roles/design.md`）の各項目を評価
4. レビュー基準（`criteria/design.md`）と照合
5. アンチパターンとの照合
6. 要件との整合性・技術的実現可能性を検証

**research ロール:**

1. 調査結果（Discussion または Issue コメント）を取得
2. 要件合致性を検証（`criteria/research.md`）
3. 調査品質を評価（ソース多様性、バージョン整合性、ソース帰属）
4. 実装可能性を検証（具体性、段階的導入、リスク識別）
5. 不合致判定マトリクス（`roles/research.md`）に基づき合致度を評価
6. 不合致だが有用なパターンがあれば取り込み提案を作成

### 5. レポート生成

`templates/report.md` 形式を使用：

1. サマリー（**散文による1〜2文の概要を先頭に置く** — 主要な発見・全体評価を結論ファーストで記述）
2. **問題サマリー**（深刻度別の検出数内訳テーブル）
3. 重大な問題
4. 改善点
5. ベストプラクティス
6. 推奨事項

**問題サマリーテーブル**（サマリーセクション直後に配置）:

```markdown
### 問題サマリー
| 深刻度 | 件数 |
|--------|------|
| Critical | {n} |
| High | {n} |
| Medium | {n} |
| Low | {n} |
| **合計** | **{n}** |
```

問題が 0 件の場合は「問題は検出されませんでした」と記載し、テーブルは省略する。

### 6. レポート保存

分析コンテキストに基づいて Issue コメントに投稿する。

```bash
# Write ツールでファイル作成後
shirokuma-flow issue comment {issue#} /tmp/shirokuma-flow/{number}-analyze-report.md
```

#### 6-1. ルーティングまとめ

| コンテキスト | 出力先 |
|-------------|--------|
| Issue 番号指定（plan ロール） | **計画 Issue (子) にコメント**（計画 Issue の Review 状態でのレビュー参照を可能にするため。後方互換: 計画 Issue なしの場合は親 Issue にコメント） |
| Issue 番号指定（requirements ロール） | Issue コメント |
| Issue 番号指定（design ロール） | Issue コメント |
| Issue 番号指定（research ロール） | Issue コメント |

> 出力先ポリシーの全体像は `rules/output-destinations.md` を参照。特に「調査・設計成果物の記録先」セクションは plan/requirements/design/research 各ロールが生成する中間成果物（処理フロー・副作用マトリクス・ギャップ分析・設計提案等）の振り分け基準を定めている — Issue コメントに偏らず、性質に応じて Discussion (Reports/Research/Knowledge) や ADR を選ぶこと。

### 7. HTML 化判定

レポート保存後、本スキル自身は HTML 生成を行わず、呼び出し元オーケストレーター（`design-flow` / `prepare-flow` / `review-flow` / `implement-flow` 等）に**判定情報**を構造化データで返却する。実際の HTML 生成（`writing-html-explainer` の呼び出し）はオーケストレーターの責務。

判定基準・テンプレート対応・カテゴリマッピングの**正本**は [`html-report-criteria.md`](../../rules/html-report-criteria.md) を参照する（閾値値・テンプレート名・カテゴリ名を本ファイルに直書きしないこと）。

**`auditing-security` 除外注**: `auditing-security` は依存パッケージ脆弱性スキャナで Issue 起票完結型のため、本判定ステップの対象外。`reviewing-security`（PR セキュリティレビュー）が常時 HTML 化対象。詳細は `html-report-criteria.md` §2 の注記参照。

#### 7-1. 返却フィールド

ステップ 5 のレポート生成結果を計測し、以下を構造化データ（YAML フロントマター）でオーケストレーターに返却する:

```yaml
html_report_required: true|false
template_name: review-summary|design-review
category: reviews|issues|discussions
slug: pr-{number}-r{round}|research-{issue-number}|{issue-number}
report_lines: 142
report_kb: 12.4
critical_high_count: 5
report_type: plan-review|requirements-review|design-review|research-review
```

#### 7-2. テンプレート選択（ロール別）

ロールごとに `template_name` を以下に固定する（正本: `html-report-criteria.md` §3）:

| ロール | `template_name` |
|--------|---------------|
| plan | `review-summary` |
| requirements | `review-summary` |
| design | `design-review` |
| research | `review-summary` |

#### 7-3. カテゴリ・slug 決定

カテゴリと slug は `html-report-criteria.md` §4「報告タイプ ↔ カテゴリマッピング」に従いオーケストレーターが決定する。本スキルは判定情報のみ返却し、最終的な `--category` / `--slug` 決定には介入しない。

#### 7-4. 責務分担

| レイヤー | 担当 |
|---------|------|
| `analyze-issue`（本スキル） | Markdown レポート生成 + Issue コメント投稿 + 判定情報返却 |
| オーケストレーター | 判定情報と `html-report-criteria.md` §2 の閾値を照合し、HTML 化要否を最終判定 |
| `writing-html-explainer` | オーケストレーターから `--template` 指定で呼び出され HTML を生成 |

## レビュー結果の判定表現

分析完了時、呼び出し元オーケストレーターが一貫して結果を判定できるよう、以下の標準表現を必ず出力する。

### 計画レビューモード（plan ロール）

`prepare-flow` から plan ロールで起動された場合、計画レビュー結果を**計画 Issue (子) にコメントとして投稿**し、以下の判定を明示する（計画 Issue (子) が Review Status に遷移した後、人間レビュアーが同一コンテキストでコメントを参照できるようにするため）。

- **PASS**: `**レビュー結果:** PASS` — 計画に重大な問題がない（Suggestions がある場合も PASS）
- **NEEDS_REVISION**: `**レビュー結果:** NEEDS_REVISION` — 要件漏れ、重大な不整合、アンチパターンの検出

NEEDS_REVISION 時は、問題点を `[計画]` と `[Issue記述]` に分類して記載する。`plan-issue` がこの分類に基づき修正を行う。

### 要件レビューモード（requirements ロール）

requirements ロールで起動された場合、要件レビュー結果を Issue コメントに投稿し、以下の判定を明示する。

- **PASS**: `**レビュー結果:** PASS` — Issue 本文に重大な問題がない（改善提案がある場合も PASS）
- **NEEDS_REVISION**: `**レビュー結果:** NEEDS_REVISION` — 必須セクションの欠落、致命的な曖昧さ、実装困難な要件の存在

NEEDS_REVISION 時は、問題点を `[完全性]`、`[明確性]`、`[実行可能性]` に分類して記載する。

レビュー結果が PASS の場合も NEEDS_REVISION の場合も、設計要否判定（`roles/requirements.md` の「設計要否判定」セクション参照）を実施し、必ず以下を追記する:

- **設計要否 NEEDED**: `**設計要否:** NEEDED` — 設計フェーズが必要
- **設計要否 NOT_NEEDED**: `**設計要否:** NOT_NEEDED` — 設計フェーズ不要

`issue-flow` が `**設計要否:**` 文字列を走査して次フローを自動分岐するため、この構造化出力は必須。

プロジェクト要件整合性チェックのトリガー条件・チェック項目・構造化出力フィールド（`**プロジェクト要件整合性:**` / `**参照 ADR:**`）は [`roles/requirements.md` の「プロジェクト要件整合性」](roles/requirements.md#プロジェクト要件整合性) を単一の正本とする。`issue-flow` ステップ 2b はこれらのフィールドを走査して後続処理を分岐する。

### 設計レビューモード（design ロール）

design ロールで起動された場合、設計レビュー結果を Issue コメントに投稿し、以下の判定を明示する。

- **PASS**: `**レビュー結果:** PASS` — 設計に重大な問題がない（改善提案がある場合も PASS）
- **NEEDS_REVISION**: `**レビュー結果:** NEEDS_REVISION` — Design Brief 不在、要件未カバー、アクセシビリティ違反、重大な不整合

### リサーチレビューモード（research ロール）

research ロールで起動された場合、リサーチレビュー結果を Issue コメントに投稿し、以下の判定を明示する。

- **PASS**: `**レビュー結果:** PASS` — 調査結果に重大な問題がなく、要件と合致
- **NEEDS_REVISION**: `**レビュー結果:** NEEDS_REVISION` — ソース不足、バージョン不整合、要件との重大な不合致

## 段階的開示

トークン効率のため：

1. **自動読み込み**: `.claude/rules/*.md`（分析対象のファイルパスに基づく）
2. **オンデマンド**: ロール/発見に基づきナレッジファイルを読み込む
3. **最小出力**: まずサマリー、詳細は要求時

## クイックリファレンス

```bash
"plan review #42"          # 計画レビュー
"requirements review #42"  # 要件レビュー
"design review #42"        # 設計レビュー
"research review #42"      # リサーチレビュー
```

## 次のステップ

スタンドアロン起動時（`implement-flow` 経由でない場合）、分析後の次のワークフローステップを提案：

```
分析完了。発見に基づいて変更を行った場合：
→ Issue 本文修正後に再分析を提案
```

## 実行コンテキスト

Skill ツール経由で起動された場合、メインコンテキストで実行されるため `.claude/rules/` のプロジェクト固有ルール（paths ベース含む）にアクセスできる。

### エラー回復

分析が不完全な場合：
1. カバレッジ不足箇所を特定
2. 追加パターンを読み込む
3. 未分析箇所を再分析
4. レポートを更新

## 注意事項

- **レポート保存**: Issue コメントとして投稿（`rules/output-destinations.md` 参照）
- **ロールベース**: 関連するナレッジファイルのみ読み込む
- **段階的**: まずサマリー、詳細は要求時
- **ルール自動読み込み**: `.claude/rules/` からプロジェクト規約（paths ベースのルール含む、メインコンテキスト実行時）
- **メインコンテキスト実行**: Skill ツール経由でメインコンテキストで実行。プロジェクト固有ルールへのアクセスが可能
- **呼び出し元のコメントファースト遵守**: このスキルはコメント投稿のみを行い本文更新は行わない
- **Effort 想定**: xhigh 前提。ADR 整合性チェック・アンチパターン照合・多角的な品質評価を担うため、十分な推論深度を確保する

## 言語

レビューレポート（Issue コメント）は**日本語**で記述する。

## NGケース

- **所見の報告に専念する**: Issue の修正は行わない。分析と修正を兼務するとレビューの客観性が薄れる
- **ロール固有ファイルのみ読み込む**: 全ナレッジファイルの一括読み込みはしない。ロール固有のファイルのみを読み込むことでコンテキストを集中させる

## リファレンスドキュメント

| ディレクトリ | ファイル |
|-------------|---------|
| `criteria/` | [plan](criteria/plan.md), [design](criteria/design.md), [research](criteria/research.md) |
| `roles/` | [plan](roles/plan.md), [requirements](roles/requirements.md), [design](roles/design.md), [research](roles/research.md) |
| `templates/` | [report](templates/report.md) |
| `docs/` | [adr-filter-logic](docs/adr-filter-logic.md) |

ロールごとの読み込みファイルはステップ 1 のロール選択テーブルを参照。

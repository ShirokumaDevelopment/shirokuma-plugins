---
name: create-item-flow
description: 会話コンテキストからGitHub Issue/Discussionを自動推定して作成し、要件レビューを自動実行して次フローに誘導します。トリガー: 「Issue にして」「Issue 作って」「フォローアップ Issue」「新規 Issue」。仕様・ADR の作成・要件定義プロセス全体が目的の場合は /requirements-flow を使用してください。
allowed-tools: Bash, Skill, AskUserQuestion, Read, Write, TaskCreate, TaskUpdate, TaskGet, TaskList
---

# アイテム作成

会話コンテキストから Issue メタデータを自動推定し、`managing-github-items` に委任して作成。Issue の場合は作成後に `analyze-issue requirements` を自動実行し、レビュー結果（`**レビュー結果:**`）と設計要否判定（`**設計要否:**`）に基づき次フロー（`/design-flow`, `/prepare-flow`, `/implement-flow`）に誘導する。Discussion の場合はレビューをスキップして次のアクション候補を提示する。

## 責務分担

| レイヤー | 責務 |
|---------|------|
| `create-item-flow` | ユーザーインターフェース。コンテキスト分析、メタデータ推定、**正本ドキュメント・ADR・既存 Issue の事前探索**、チェーン制御 |
| `managing-github-items` | 内部エンジン。CLI コマンド実行、フィールド設定、バリデーション |

### `analyze-issue requirements` との責務境界

ステップ 1c（事前探索）と `analyze-issue requirements` のプロジェクト要件整合性チェック（事後検証）は **時系列と目的が異なる相補的役割** を持つ。両者を混同しないこと。

| 観点 | ステップ 1c（このスキル） | `analyze-issue requirements` |
|------|------------------------|----------------------------|
| 実行タイミング | Issue **作成前** | Issue **作成後** |
| 目的 | 関連参照を網羅的に Issue 本文へ埋め込み、reviewer のコンテキスト補完 | ADR 整合性を検証し PASS / NEEDS_REVISION 判定 |
| 出力先 | Issue 本文の `## 関連参照` セクション | Issue コメント |
| 失敗時の挙動 | 探索 0 件ならセクションを省略（フェイルセーフ） | NEEDS_REVISION でループ修正 |

## タスク登録（必須）

**作業開始前**にチェーン全ステップを TaskCreate で登録する。

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | コンテキストを分析しメタデータを推定する | コンテキストを分析中 | マネージャー直接 |
| 1b | 類似課題を検索し関連付けを提案する | 類似課題を検索中 | マネージャー直接: `shirokuma-flow issue search` |
| 1c | 正本ドキュメント・ADR・既存 Issue を自動探索する | 関連参照を探索中 | マネージャー直接: `grep` / `discussion adr list` / `issue search` |
| 2 | managing-github-items に委任して作成する | アイテムを作成中 | `managing-github-items` (Skill) |
| 2b | [Issue のみ] 要件レビューと設計要否判定を実行する | 要件レビュー中 | `analyze-issue` (Skill, requirements ロール) |
| 3 | ユーザーに次のアクション候補を返す | 次のアクションを提示中 | マネージャー直接 |

Dependencies: step 1b blockedBy 1, step 1c blockedBy 1b, step 2 blockedBy 1c, step 2b blockedBy 2 (条件付き: Issue 作成時のみ), step 3 blockedBy 2 or 2b.

TaskUpdate で各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。ステップ 2b は Discussion 作成時にスキップ（タスクリストから除外してよい）。ステップ 1c は探索結果が 0 件の場合、セクションを省略してそのまま次へ進む。

## ワークフロー

### ステップ 1: コンテキスト分析

会話コンテキストから以下を推定:

| フィールド | 推定ソース |
|-----------|-----------|
| タイトル | ユーザーの発話から簡潔に |
| Issue Type | 内容のキーワード（[reference/chain-rules.md](reference/chain-rules.md) 参照） |
| Priority | 影響範囲・緊急度 |
| Size | 作業量 |
| エリアラベル | 影響するコード領域 |

**目的明確性チェック（必須）**: ユーザーの発話が「手段（何をするか）」のみで「目的（誰が・何を・なぜ）」が不明確な場合、推定した目的を提示して `AskUserQuestion` で確認する。判定基準は [reference/purpose-criteria.md](reference/purpose-criteria.md) 参照。

### ステップ 1b: 類似課題の検索・関連付け提案

コンテキスト分析後、作成前に類似する既存 Issue / Discussion を検索し、重複や関連付けの機会を提示する。

```bash
shirokuma-flow issue search "<キーワード>" --limit 5
```

- 類似 Issue が見つかった場合: ユーザーに提示し、新規作成するか既存 Issue にまとめるかを確認する（`AskUserQuestion`）
- 関連 Issue が見つかった場合: 作成後に `issue parent` で親子関係を設定することを提案する
- 何も見つからない場合: そのまま次のステップへ進む

### ステップ 1c: 正本ドキュメント・ADR・既存 Issue の自動探索

類似 Issue 検索後、Issue 作成前に **このプロジェクトの正本ドキュメント（一次情報源）・ADR（Accepted）・関連既存 Issue** を自動探索し、発見した参照を Issue 本文の `## 関連参照` セクションとして組み込む。詳細な検索ルール・キーワード生成・配置仕様は [../../rules/doc-search-rules.md](../../rules/doc-search-rules.md) 参照。

> **ドキュメント配置の判定**: Issue 本文に記録するか、正本ドキュメントとして別ファイルに切り出すかを判断する場合は `docs-layering` ルールの「一時的な計画（Issue 本文）vs reference doc」境界ケースを参照。

#### 探索対象

| カテゴリ | 検索コマンド | 出力先サブセクション |
|---------|------------|------------------|
| 正本ドキュメント | `grep -l <keywords> guide/ docs/specs/ docs/portal-design-spec.md CLAUDE.md` で発見 → 該当箇所を Read | `### 正本ドキュメント` |
| ADR (Accepted) | `shirokuma-flow discussion adr list` → タイトル / 本文キーワード照合で上位 3-5 件 | `### 関連 ADR（Accepted）` |
| 既存 Issue / PR | `shirokuma-flow issue search "<keywords>" --limit 5` | `### 関連既存 Issue / PR` |

#### キーワード生成

ステップ 1 で確定したタイトルと、ユーザー発話中の名詞句を組み合わせて検索クエリを生成する（YAGNI: シンプル案で開始、ヒット率が低ければ高度化）。日本語のフォールバック挙動は [../../rules/doc-search-rules.md](../../rules/doc-search-rules.md) を参照。

#### Issue 本文への組み込み

発見した参照を `## 関連参照` セクションとして **`## 目的` 直後・`## 概要` 直前** に配置する。テンプレートは [../../rules/doc-search-rules.md](../../rules/doc-search-rules.md) 参照。

- 探索結果が 0 件のカテゴリはサブセクションを省略
- 全カテゴリ 0 件の場合は `## 関連参照` セクション全体を省略

### ステップ 2: `managing-github-items` に委任

コンテキスト分析後、事前確認なしで即座に Skill ツールで `managing-github-items` を起動:

```
Skill: managing-github-items
Args: create-item --title "{タイトル}" --issue-type "{Type}" --labels "{area:ラベル}" --priority "{Priority}" --size "{Size}"
```

> **初期 Status（ADR-v3-022）**: `INITIAL_STATUSES = ["Backlog"]` により、Issue 作成時のデフォルト Status は `Backlog`（未調査・未トリアージ）。`--status "In progress"` の明示指定は `validateInitialStatus` でエラーになる。

### ステップ 2b: 要件レビューと設計要否判定（analyze-issue requirements 呼び出し）

**適用範囲**: 作成したアイテムの type が `issue` の場合のみ実行する。`discussion` の場合はスキップし、ステップ 3 で従来通り次のアクション候補を提示する。

Issue 作成直後のコンテキストを活かし、Skill ツールで `analyze-issue requirements #{issue-number}` を呼び出す。

```
Skill: analyze-issue
Args: requirements #{issue-number}
```

`analyze-issue requirements` は Issue のキーワード・ラベルに応じてプロジェクト要件整合性チェック（ADR 参照）を追加実行する場合がある。トリガー条件と出力フィールドは [../analyze-issue/roles/requirements.md](../analyze-issue/roles/requirements.md#プロジェクト要件整合性) を参照。

#### 期待出力フィールド

`analyze-issue` が Issue コメントに投稿した結果から以下の文字列を走査する:
- `**レビュー結果:**` — PASS または NEEDS_REVISION（常に出力）
- `**設計要否:**` — NEEDED または NOT_NEEDED（常に出力）
- `**プロジェクト要件整合性:**` — PASS または NEEDS_REVISION（ADR チェック実施時のみ）
- `**参照 ADR:**` — ADR 番号リスト（ADR チェック実施時のみ）

#### チェック失敗時のハンドリング

`レビュー結果` が `NEEDS_REVISION` の場合（修正ループ）: 問題点をユーザーに提示し、Issue 本文の修正を依頼する。修正後に再度 `analyze-issue requirements` を呼び出す（修正ループは最大 2 回。3 回目の NEEDS_REVISION はユーザーに判断を委ねる）。

`プロジェクト要件整合性` が `NEEDS_REVISION` の場合: 矛盾する ADR 番号と矛盾内容を提示する。AskUserQuestion でユーザーに以下のいずれかを選択させる:
- 「Issue 本文を修正して整合させる」→ 修正後に再度 requirements レビューを実行
- 「既存 ADR の見直し（`write-adr` 更新フロー）を先に実施する」→ `/write-adr` に誘導してステップを中断

### ステップ 3: ユーザーに返す

**Discussion の場合**: ステップ 2b をスキップしたため、作成完了の旨と次のアクション候補を提示する。

```markdown
Discussion 作成完了: #{number}
→ 続編の議論や関連 Issue があれば案内
```

**Issue の場合**: ステップ 2b の `**レビュー結果:**`（`analyze-issue` が投稿）が PASS の場合、`**設計要否:**` に基づき以下の 3 方向に分岐する。

**設計要否 NEEDED の場合（設計フェーズへ）:**

```markdown
アイテム作成完了: #{number}
**レビュー結果:** PASS / **設計要否:** NEEDED
→ `/design-flow #{課題番号}` で設計を開始（推奨）
→ またはそのまま ToDo（着手待ち）に配置
```

**設計要否 NOT_NEEDED かつ Size M 以上または要件に曖昧さがある場合（計画フェーズへ）:**

```markdown
アイテム作成完了: #{number}
**レビュー結果:** PASS / **設計要否:** NOT_NEEDED
→ `/prepare-flow #{課題番号}` で計画を立てる（推奨）
→ `/implement-flow #{課題番号}` で直接実装
→ またはそのまま ToDo（着手待ち）に配置
```

**設計要否 NOT_NEEDED かつ Size XS/S かつ要件明確の場合（直接実装へ）:**

```markdown
アイテム作成完了: #{number}
**レビュー結果:** PASS / **設計要否:** NOT_NEEDED
→ `/implement-flow #{課題番号}` で直接実装（推奨）
→ またはそのまま ToDo（着手待ち）に配置
```

設計判定（NEEDED / NOT_NEEDED）を Size 判定より優先する。設計が NEEDED であれば Size にかかわらず `/design-flow` を案内する。

チェーン判定の詳細は [reference/chain-rules.md](reference/chain-rules.md) 参照。

## スキル内ドキュメント

| ドキュメント | 内容 | 読み込みタイミング |
|-------------|------|-------------------|
| [reference/chain-rules.md](reference/chain-rules.md) | チェーン判定ルール・推定ロジック | アイテム作成時 |
| [reference/purpose-criteria.md](reference/purpose-criteria.md) | 手段 vs 目的の判定基準（JTBD ベース） | コンテキスト分析時（目的明確性チェック） |
| [../../rules/doc-search-rules.md](../../rules/doc-search-rules.md) | 正本ドキュメント・ADR 探索のキーワード生成・分割ルール・配置仕様・フォールバック | ステップ 1c 実行時 |

## 次のステップ

ステップ 2b の `analyze-issue requirements` 結果に基づき 3 方向に分岐する: 設計 NEEDED → `/design-flow`、設計 NOT_NEEDED + M+ → `/prepare-flow`、設計 NOT_NEEDED + XS/S + 要件明確 → `/implement-flow`。詳細はステップ 3 参照。

## Evolution シグナル自動記録

アイテム作成完了レポートの末尾で、`rule-evolution` ルールの「スキル完了時の自動記録手順」に従い Evolution シグナルを自動記録する。

**スキップ条件:** 作成したアイテムの Issue Type が Evolution の場合、シグナル記録全体をスキップする（Evolution Issue 自体が改善提案であり、重複記録を防止するため）。

## GitHub 書き込みルール

Issue のタイトル・本文は `output-language` ルールと `github-writing-style` ルールに準拠すること。委任先の `managing-github-items` にもこのルールが適用される。

## スキル選択ガイド

このスキルと `requirements-flow` はどちらも GitHub アイテムを作成できますが、目的が異なります。

| 目的 | 使うべきスキル |
|------|--------------|
| 「この会話の内容を Issue として登録したい」「フォローアップ Issue を作りたい」 | `create-item-flow`（このスキル） |
| 「仕様・ADR を作成してから Issue 化したい」「要件定義プロセス全体を実行したい」 | `/requirements-flow` |
| 「ADR を書きたい」「技術選定を記録したい」 | `/requirements-flow` |

**判断基準**: 「今すぐ GitHub Issue/Discussion として登録する」ことが目的なら `create-item-flow`。「要件定義・ADR 作成というプロセス全体を実行する」ことが目的なら `requirements-flow`。

### `requirements-flow` との責務境界

- `create-item-flow` は **UI レイヤー** であり、既存の会話コンテキストをもとに Issue/Discussion を即時登録する
- `requirements-flow` は **要件定義フェーズのオーケストレーター** であり、既存 ADR・Discussion の検索・整合確認→ write-adr / 仕様 Discussion 作成→次フロー案内までを統括する
- 「仕様 Discussion を作ってほしい」という発話は `requirements-flow` にルーティングする。このスキルは仕様の要件定義プロセスを担当しない

## 注意事項

- 作成後にユーザーに案内し、修正指示の機会を提供する
- Issue 作成の CLI 実行は `managing-github-items` に委任（直接 CLI を叩かない）
- 詳細な推定テーブルは `managing-github-items` スキルを参照
- **Effort 想定**: xhigh 前提。コンテキスト分析・ADR 探索・要件レビューのチェーンを担うため、十分な推論深度を確保する

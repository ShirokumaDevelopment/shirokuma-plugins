---
name: review-issue
description: 専門ロール別の包括的レビューワークフローを提供し、コード品質・セキュリティ・テストパターン・ドキュメント品質をチェックします。トリガー: 「レビューして」「review」「セキュリティチェック」「security audit」「テストレビュー」「ドキュメントレビュー」「コードレビュー」「設定レビュー」「config review」。Issue 分析（計画・要件・設計・リサーチ）は analyze-issue を使用してください。
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

## プロジェクトルール

!`shirokuma-flow rules inject --scope review-worker`

# Issue レビュー

専門ロール別の包括的レビューワークフロー。

## 利用可能なロール

| ロール | 焦点 | トリガー |
|--------|------|----------|
| **code** | 品質、パターン、スタイル | "review", "コードレビュー" |
| **config** | 設定ファイル品質、ベストプラクティス準拠 | `code` ロールから自動検出、または "config review", "設定レビュー" |
| **code+annotation** | JSDoc アノテーション | "annotation review", "アノテーションレビュー" |
| **security** | OWASP、CVE、認証 | "security review", "セキュリティ" |
| **testing** | TDD、カバレッジ、モック | "test review", "テストレビュー" |
| **nextjs** | フレームワーク、パターン（`reviewing-nextjs` に委任、フォールバックあり） | "Next.js review", "プロジェクト" |
| **docs** | Markdown 構造、リンク、用語 | "docs review", "ドキュメントレビュー" |

> **Issue 分析ロール（plan / requirements / design / research）は `analyze-issue` に移行しました。** 後方互換スタブにより、これらのキーワードで呼び出した場合は自動的に `analyze-issue` に委任されます。

## 後方互換委任スタブ

以下のキーワードで `review-issue` が呼び出された場合、`analyze-issue` に自動委任する:

| キーワード | 委任先ロール |
|------------|-------------|
| "plan review", "計画レビュー", "計画チェック" | `analyze-issue` plan |
| "requirements review", "要件レビュー", "要件確認", "要件整合性", "ADR 確認" | `analyze-issue` requirements |
| "design review", "設計レビュー", "デザインレビュー" | `analyze-issue` design |
| "research review", "リサーチレビュー" | `analyze-issue` research |

**動作**: キーワードを検出したら、以下のメッセージを出力して終了する（Skill 委任は行わない）:

```
このロールは analyze-issue スキルに移行しました。`analyze-issue {ロール名}` を使用してください。
```

例: "plan review" を検出した場合 → `「このロールは analyze-issue スキルに移行しました。\`analyze-issue plan\` を使用してください。」` を出力して終了。

## ワークフロー

```
ロール選択 → ナレッジ読み込み → Lint 実行 → コード分析/計画分析 → レポート生成 → レポート保存 → HTML 化判定
```

**7ステップ**: ロール選択 → 読み込み → **Lint** → 分析 → レポート → 保存 → **HTML 化判定**

### 1. ロール選択

ユーザーリクエストに基づき適切なロールを選択：

| キーワード | ロール | 読み込むファイル |
|------------|--------|-----------------|
| "review", "レビュー" | code | criteria/code-quality, criteria/coding-conventions, patterns/server-actions, patterns/drizzle-orm, patterns/jsdoc |
| "config review", "設定レビュー" | config | `reviewing-claude-config/SKILL.md` の検証ルール |
| "annotation", "アノテーション" | code+annotation | roles/code.md |
| "security", "セキュリティ" | security | criteria/security, patterns/better-auth |
| "test", "テスト" | testing | criteria/testing, patterns/e2e-testing |
| "Next.js", "nextjs" | nextjs | `skills routing reviewing` で `reviewing-nextjs` を発見、未インストール時は全ナレッジファイル |
| "docs", "ドキュメント" | docs | roles/docs.md |
| "plan", "計画レビュー" | → `analyze-issue` に委任 | — |
| "requirements", "要件レビュー", "要件確認" | → `analyze-issue` に委任 | — |
| "design", "設計レビュー", "デザイン" | → `analyze-issue` に委任 | — |
| "research", "リサーチレビュー" | → `analyze-issue` に委任 | — |

#### `nextjs` ロールの動的委任（`skills routing reviewing` 統合）

`nextjs` ロールが選択された場合、`reviewing-*` スキルの動的発見を試みる:

```bash
shirokuma-flow skills routing reviewing
```

出力の `routes` 配列に `key: "nextjs"` エントリが存在する場合（`reviewing-nextjs` がインストール済み）:
- `reviewing-nextjs` スキルに **Skill 委任**し、レビューを実行させる
- `reviewing-nextjs` の完了レポートを受け取り、このスキルのレポート保存ロジックで出力先を決定する

`key: "nextjs"` エントリが存在しない場合（`shirokuma-nextjs` 未インストール）:
- フォールバック: 従来の `nextjs` ロール処理（全ナレッジファイル読み込み）を実行する

同様に、他のレビュー対象（Drizzle、shadcn/ui、AWS、CDK 等）についても `routes` 配列を参照してプラグイン固有の `reviewing-*` スキルが存在する場合は委任することを推奨する。

#### マルチロール自動判定

ユーザーリクエスト内の全キーワードを走査し、2つ以上のコードレビューロールにマッチした場合はマルチロールモードに移行する。

**判定フロー:**

```
ユーザーリクエスト
  ↓ 全キーワードを走査
  ↓ マッチしたロール一覧を生成
  ↓
  [1ロール] → 通常の単一ロール実行
  [2+ロール] → ロール実行順序テーブルに基づき順次実行
```

**ロール実行順序テーブル:**

| 優先度 | ロール | 理由 |
|--------|--------|------|
| 1 | code | 基盤ロール。コード品質の知見が他ロールに有用 |
| 2 | security | コード構造の理解の上にセキュリティ分析 |
| 3 | testing | コード・セキュリティの知見がテスト観点に有用 |
| 4 | nextjs | フレームワーク固有の知見 |
| 5 | docs | ドキュメント分析はコード分析と独立 |
| 6 | code+annotation | code の特殊モード |

**対象外ロール:** plan / requirements / design / research は `analyze-issue` に移行済みのため、このスキルのマルチロール判定から除外。

**除外ルール:**
- `code` と `config` は自動切り替え対象のため、両方マッチした場合は既存の `config` 自動検出ロジックを優先し、マルチロールにしない。
- `code` と `code+annotation` は相互排他。両方マッチした場合は `code+annotation` を優先する（`code` のスーパーセットであるため）。

#### `config` ロール自動検出（`code` ロール選択時）

ロールが `code` に決定された場合、変更ファイルを分析してレビュー戦略を自動判定する：

```bash
git diff --name-only origin/{base-branch}...HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD
```

取得したファイルリストを以下の設定ファイルパターンと照合する：

| パターン | 対象 |
|---------|------|
| `plugin/**/*.md` | スキルファイル（SKILL.md）、ルールファイル（rules/*.md）、エージェントファイル（AGENT.md） |
| `plugin/**/*.json` | plugin.json 等の設定 |
| `.claude/**/*.md` | プロジェクトローカルのルール・スキル |
| `.claude/**/*.json` | プロジェクトローカルの設定 |
| `.claude/**/*.yaml` | プロジェクトローカルの YAML 設定 |

| 判定結果 | アクション |
|---------|----------|
| 全ファイルが設定ファイルパターンに一致 | `config` ロールに切り替え |
| 一部または全ファイルが不一致 | `code` ロールを維持 |
| 変更ファイルが取得できない | `code` ロールにフォールバック |
| `config` と明示的に指定された場合 | 変更ファイル分析をスキップし `config` で実行 |

### 2. ナレッジ読み込み

ロールに基づき必要なナレッジファイルを読み込む：

```
1. 自動読み込み: .claude/rules/*.md（ファイルパスに基づく）
2. ロール固有: roles/{role}.md
3. 基準: criteria/{relevant}.md
4. パターン: patterns/{relevant}.md
```

**注意**: プロジェクト固有のルールは `.claude/rules/` から自動読み込み — 手動読み込み不要。

#### 2a. ローカルドキュメントチェック（code / security / testing / nextjs ロール）

コードレビューロール（code, security, testing, nextjs）の場合、ローカルに取得済みのドキュメントを参照してレビューの精度を高める:

```bash
# 利用可能なドキュメントソースを確認
shirokuma-flow docs detect --format json
```

`status: "ready"` のソースがある場合、レビュー対象コードの技術スタックに関連するキーワードで検索:

```bash
shirokuma-flow docs search "<技術キーワード>" --source <ソース名> --section --limit 3
```

ローカルドキュメントが存在しない（`ready` なし）場合はこのサブステップをスキップする。

> **注**: この `--limit 3` は `local-docs-lookup` ルールのデフォルト（`--limit 5`）よりレビューコンテキストに最適化された値。スキル固有の指定が優先される。

### 3. shirokuma-flow Lint 実行（必須）

**手動レビューの前に自動チェックを実行。ロールに応じて実行する lint コマンドが異なる：**

| ロール | 実行する lint コマンド |
|--------|----------------------|
| code, code+annotation, nextjs | `lint all`（全種一括）を推奨。個別実行も可: lint tests, lint coverage, lint code, lint structure, lint annotations |
| security | lint security, lint code, lint structure（セキュリティ関連のみ） |
| testing | lint tests, lint coverage（テスト関連のみ） |
| docs | lint docs（ドキュメント構造のみ） |
| config | スキップ（設定ファイルは `reviewing-claude-config` の検証ロジックで分析するため） |
| plan / requirements / design / research | `analyze-issue` に委任（これらのロールはこのスキルでは処理しない） |

**code / code+annotation / nextjs ロール:**

```bash
# 推奨: 全種一括実行
shirokuma-flow lint all -p .

# 個別実行（特定の lint のみ必要な場合）:
# テストドキュメント（@testdoc, @skip-reason）
shirokuma-flow lint tests -p . -f terminal

# 実装-テストカバレッジ
shirokuma-flow lint coverage -p . -f summary

# コード構造（Server Actions、アノテーション）
shirokuma-flow lint code -p . -f terminal

# プロジェクト構造（ディレクトリ、命名）
shirokuma-flow lint structure -p . -f terminal

# アノテーション整合性（@usedComponents, @screen）
shirokuma-flow lint annotations -p . -f terminal
```

**docs ロール:**

```bash
# ドキュメント構造検証
shirokuma-flow lint docs -p . -f terminal
```

**主要チェックルール：**

| ルール | 説明 |
|--------|------|
| `skipped-test-report` | `.skip` テストを報告（`@skip-reason` の存在確認） |
| `testdoc-required` | 全テストに `@testdoc` が必要 |
| `lint coverage` | ソースファイルに対応テストが必要 |
| `annotation-required` | Server Actions に `@serverAction` が必要 |

プロジェクト固有の修正手順はワークフロードキュメントを参照。

### 4. コード分析 / 計画分析

**コードロール（code, security, testing, nextjs, docs）:**

1. 対象ファイルを読み込む
2. 読み込んだナレッジの基準を適用
3. 既知の問題と照合
4. shirokuma-flow lint 結果と相互参照
5. 違反と改善点を特定

**config ロール:** `reviewing-claude-config/SKILL.md` の検証ロジックを参照（8項目のチェック詳細は [reference/review-checklist.md](reference/review-checklist.md) を参照）。

**成果物レビュー（PR prompt に「成果物レビュー対象:」がある場合のみ）:** 各 `#N` を `issue context` で取得し `roles/code.md` の「GitHub ドキュメントレビュー観点」を適用。詳細は [reference/review-checklist.md](reference/review-checklist.md) を参照。

### 5. レポート生成

`templates/report.md` 形式を使用：

1. サマリー（**散文による1〜2文の概要を先頭に置く** — 主要な発見・全体評価を結論ファーストで記述。shirokuma-flow lint サマリーを含む）
2. **問題サマリー**（深刻度別の検出数内訳テーブル）
3. 重大な問題
4. 改善点
5. ベストプラクティス
6. 推奨事項

**問題サマリーテーブル**（サマリーセクション直後に配置）: テンプレートは [reference/review-checklist.md](reference/review-checklist.md) を参照。問題が 0 件の場合は「問題は検出されませんでした」と記載し、テーブルは省略する。

### 6. レポート保存

レビューコンテキストに基づいて出力先をルーティングする。

#### PR レビュー（PR 番号がコンテキストにある場合）

PR にレビューサマリーを issuecomment として投稿（レビュースレッドコメントではなく通常コメント）：

```bash
# Write ツールでファイル作成後
shirokuma-flow issue comment {PR#} /tmp/shirokuma-flow/{number}-review-summary.md
```

> **注意**: `issue comment` は PR に issuecomment を投稿する。これは `pr comments` 出力の `issue_comments` セクションに表示され、レビュースレッドコメントとは別に管理される。

重大な問題（severity: error）が多数（5件以上）ある場合のみ、詳細レポートを Discussion にも保存し、PR コメントに Discussion URL をリンクする。

#### ファイル/ディレクトリレビュー（PR 番号なし）

Reports カテゴリに Discussion を作成（従来の動作）：

```bash
# frontmatter に title と category を設定したファイルを用意してから実行
shirokuma-flow discussion add /tmp/shirokuma-flow/review-report.md
```

Discussion URL をユーザーに報告。

#### ルーティングまとめ

| コンテキスト | メイン出力先 | 詳細レポート |
|-------------|------------|------------|
| PR 番号指定 | PR コメント（サマリー） | error 5件以上のみ Discussion |
| ファイル/ディレクトリ | Discussion (Reports) | — |
| Issue 分析（plan/requirements/design/research） | `analyze-issue` に委任 | — |

> 出力先ポリシーの全体像は `rules/output-destinations.md` を参照。

### 7. HTML 化判定

レポート保存後、本スキル自身は HTML 生成を行わず、呼び出し元オーケストレーター（`review-flow` 等）に**判定情報**を構造化データで返却する。判定基準・返却フィールド・テンプレート選択の詳細は [reference/html-report-decision.md](reference/html-report-decision.md) を参照（正本: [`html-report-criteria.md`](../../rules/html-report-criteria.md)）。

> `auditing-security` は依存パッケージ脆弱性スキャナで Issue 起票完結型のため、本判定の対象外。`reviewing-security`（PR セキュリティレビュー）が常時 HTML 化対象。

## ナレッジ更新

`--update` 要求時は knowledge-manager に委任する（「ソース更新して」）。knowledge-manager が Next.js/React/Tailwind CSS/Better Auth/OWASP を Web 検索で最新化し、「配布して」で再配布する。

## 段階的開示

トークン効率のため：

1. **自動読み込み**: `.claude/rules/*.md`（レビュー対象のファイルパスに基づく）
2. **オンデマンド**: ロール/発見に基づきナレッジファイルを読み込む
3. **最小出力**: まずサマリー、詳細は要求時

## クイックリファレンス

| 例 | ロール |
|----|--------|
| `"review lib/actions/"` | code |
| `"security review lib/actions/"` | security |
| `"test review"` | testing |
| `"Next.js review"` | nextjs |
| `"security + code review src/"` | マルチロール |
| `"reviewer --update"` | ナレッジ更新 |

> Issue 分析（plan/requirements/design/research）は `analyze-issue` に移行済み。

## 次のステップ

`implement-flow` 経由ではなくスタンドアロンで起動された場合、レビュー後に次のワークフローステップを提案する:

```
レビュー完了。所見に基づき変更を行った場合:
→ `/commit-issue` で変更をステージングしてコミット
```

## 実行コンテキスト

Skill ツール経由で起動された場合、本スキルはメインコンテキストで実行され、`.claude/rules/` のプロジェクト固有ルールにアクセス可能。これによりルール準拠のレビューが可能になる。

### 進捗報告

ロールごとのフォーマット例は `reference/progress-report-examples.md` を参照。

### エラーリカバリー

分析が不完全な場合:
1. カバレッジ不足箇所を特定
2. 追加パターンを読み込む
3. 見落とした領域を再分析
4. レポートを更新

## マルチロール実行モード

複数ロールが要求された場合、ロールごとに 7 ステップを順次実行し、レポートを個別に投稿する。

| 項目 | 通常（単一ロール） | マルチロール |
|------|-------------------|------------|
| ロール選択 | ユーザーリクエストから判定 | 自動判定または呼び出し元が指定 |
| 実行 | 7 ステップを 1 回実行 | 各ロールで 7 ステップを順次実行 |
| レポート保存 | PR/Issue コメントとして投稿 | ロールごとに個別投稿 |

進捗報告例は `reference/progress-report-examples.md` の「マルチロール」セクションを参照。先行ロールの lint 結果・検出問題は後続ロールのコンテキストとして利用できる（ただしレポートは独立して生成）。

## 注意事項

- **レポート保存**: PR → PR コメント、ファイル → Discussion Reports（`rules/output-destinations.md` 参照）
- **ロールベース**: 関連するナレッジファイルのみ読み込む（段階的開示）
- **メインコンテキスト実行**: Skill ツール経由で `.claude/rules/` のプロジェクト固有ルールにアクセス可能
- **What/Why 分離**: このスキルはコメント投稿（Why の記録）のみ行い本文更新は行わない。原則は `project-items` ルールの「What/Why 分離」節、手順詳細は `item-maintenance.md` を参照
- **コンテキスト境界**: 他スキルの `reference/` へのファイルパス参照提案をしない（ルールから reference にはアクセス不可）

## レビュー結果の判定表現

レビュー完了時、呼び出し元オーケストレーターが一貫して結果を判定できるよう、以下の標準表現を必ず出力する。

> **注意**: plan / requirements / design / research ロールは `analyze-issue` に移行しました。これらのロールの判定表現は `analyze-issue` スキルを参照してください。

### 通常レビューモード（code / security / testing / docs / config ロール）

レポートを GitHub に保存し、以下の判定を明示する。

- **PASS**: `**レビュー結果:** PASS` — 重大な問題なし
- **FAIL**: `**レビュー結果:** FAIL` — 重大な問題あり

## 言語

レビューレポート（PR コメント、Discussion）は**日本語**で記述する。

## NGケース

- コードの修正を避ける — レビュアーの役割は所見の報告であり、修正と兼務するとレビューの客観性が薄れる
- 全ナレッジファイルの一括読み込みを避ける — ロール固有のファイルのみ読み込むことでコンテキストを集中させる

## リファレンスドキュメント

| ディレクトリ | ファイル |
|-------------|---------|
| `criteria/` | [code-quality](criteria/code-quality.md), [coding-conventions](criteria/coding-conventions.md), [security](criteria/security.md), [testing](criteria/testing.md) |
| `patterns/` | [server-actions](patterns/server-actions.md), [server-actions-structure](patterns/server-actions-structure.md), [drizzle-orm](patterns/drizzle-orm.md), [better-auth](patterns/better-auth.md), [e2e-testing](patterns/e2e-testing.md), [tailwind-v4](patterns/tailwind-v4.md), [radix-ui-hydration](patterns/radix-ui-hydration.md), [jsdoc](patterns/jsdoc.md), [nextjs-patterns](patterns/nextjs-patterns.md), [i18n](patterns/i18n.md), [code-quality](patterns/code-quality.md), [account-lockout](patterns/account-lockout.md), [audit-logging](patterns/audit-logging.md), [docs-management](patterns/docs-management.md) |
| `reference/` | [tech-stack](reference/tech-stack.md), [progress-report-examples](reference/progress-report-examples.md), [review-checklist](reference/review-checklist.md), [html-report-decision](reference/html-report-decision.md) |
| `roles/` | [code](roles/code.md), [security](roles/security.md), [testing](roles/testing.md), [nextjs](roles/nextjs.md), [docs](roles/docs.md) |
| `templates/` | [report](templates/report.md) |
| `docs/setup/` | [auth-setup](docs/setup/auth-setup.md), [database-setup](docs/setup/database-setup.md), [infra-setup](docs/setup/infra-setup.md), [project-init](docs/setup/project-init.md), [styling-setup](docs/setup/styling-setup.md) |
| `docs/workflows/` | [annotation-consistency](docs/workflows/annotation-consistency.md), [shirokuma-flow-verification](docs/workflows/shirokuma-flow-verification.md) |

> **Issue 分析スキルのリファレンス**: plan/requirements/design/research ロールのナレッジファイルは `analyze-issue/` スキルを参照してください。

ロールごとの読み込みファイルはステップ 1 のロール選択テーブルを参照。

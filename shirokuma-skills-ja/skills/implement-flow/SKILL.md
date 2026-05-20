---
name: implement-flow
description: Issue番号またはタスク説明を受け取り、適切なスキルを選択して実装からPRまでのワークフロー全体を統括します。トリガー: 「これやって」「work on」「取り組む」「着手して」「#42 やって」。
allowed-tools: Bash, Read, Grep, Glob, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---

!`shirokuma-flow rules inject --scope orchestrator`

# Issue に取り組む（オーケストレーター）

> **チェーン自律進行（最重要ルール）**: Skill ツールまたは Agent ツールが完了したら、**同じレスポンス内で必ず次のツールを呼び出す**。これが唯一かつ最重要のルールである。TaskList に pending ステップが残っているのにテキストのみで応答を終えることはチェーン断絶エラーであり、ユーザーが「続けて」と手動で促す羽目になる。

Issue の種類やタスク説明に基づいて、計画→実装→コミット→PR の一連のフローを統括する。

**注意**: セッションセットアップには `starting-session` を使用。このスキルはセッション内でもスタンドアロン（`starting-session` なし）でも動作する。いずれのモードでも特定タスクの作業開始の主要エントリーポイントとなる。

## タスク登録（必須）

**作業開始前**にチェーン全ステップを TaskCreate で登録する。

**実装 / バグ修正 / リファクタリング / Chore:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 実装する | 実装中 | `code-issue` (subagent: `coding-worker`) |
| 2 | 変更をコミット・プッシュする | コミット・プッシュ中 | `commit-issue` (subagent) |
| 3 | プルリクエストを作成する | プルリクエストを作成中 | `open-pr-issue` (subagent) |
| 4 | コードを後処理する（簡略化・セキュリティレビュー・改善コミット） | コードを後処理中 | `finalize-changes`（Skill ツール） |
| 5 | 作業サマリーを投稿する | 作業サマリーを投稿中 | マネージャー直接: `issue comment` |
| 6 | PR の Status が Review であることを検証する（**Issue 本体を Review に再遷移させない**）| PR ステータスを検証中 | マネージャー直接: `status get <PR>` |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4, step 6 blockedBy 5.

> **ステップ 6 の位置付け（PR 状態の検証のみ）**: ステップ 3 で起動された `pr create` が PR 自身を **Status: Review** に遷移させる（コードレビュー可能）。本ステップは PR が Review であることを `status get <PR>` で確認するのみで、課題 Issue / 計画 Issue を `submit` で Review に遷移させない（`project-items.md` の Review セクション「DO NOT」リスト準拠 — 1 エンティティ 1 Review 原則）。
>
> 実装フェーズでは PR 自身が `Status: Review` を担い、課題 Issue・計画 Issue は In progress のまま。`pr merge` 時に `Status: Done` に直接遷移する。
>
> **PR が Review でない場合のフォールバック**: `status get <PR>` の結果が Review でない（例: `pr create` の自動遷移が失敗した）場合のみ、PR 自身を `submit <PR>` で Review に遷移させる。**課題 Issue / 計画 Issue を submit してはならない**。

> **変更なし分岐**: `coding-worker` が `changes_made: false` で完了した場合、ステップ 2〜4（コミット・PR・finalize-changes）をスキップし、ステップ 5（変更なし用作業サマリー）→ ステップ 6（ステータス判定）に進む。詳細は [reference/chain-execution.md](reference/chain-execution.md) の「変更なしパス」および [reference/chain-end-steps.md](reference/chain-end-steps.md) の「変更なしパス」参照。

**調査:**

| # | content | activeForm | スキル |
|---|---------|------------|--------|
| 1 | 調査を実施する | 調査を実施中 | `researching-best-practices` (subagent) |
| 2 | Discussion に調査結果を保存する | Discussion を作成中 | `shirokuma-flow discussion add` |

Dependencies: step 2 blockedBy 1.

TaskUpdate で各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。

## ワークフロー

### ステップ 1: 作業の分析

#### 計画 Issue 自動解決（ステップ 1 前処理）

受け取った Issue のタイトルが「計画: 」または「Plan: 」で始まる場合、計画 Issue として扱い親 Issue に自動リダイレクトする:

1. キャッシュの frontmatter から `parent` フィールドを確認
2. `parent` が設定されている場合 → 親 Issue 番号で `issue context` を実行し、以降のフローは親 Issue 番号で実行（計画 Issue の番号は計画コンテキスト参照にのみ使用）
3. `parent` が未設定の場合 → `issue context {number}` で再取得して `parent` を確認
4. それでも `parent` が不明な場合 → エラーメッセージを表示して停止:
   「計画 Issue #{number} の親 Issue が特定できません。親 Issue 番号を直接指定してください。」

**Issue 番号あり**: `shirokuma-flow issue context {number}` で取得し、JSON 出力から title/body/labels/status/priority/size を抽出。

#### サブ Issue 検出

`.shirokuma/github/{org}/{repo}/issues/{number}/body.md` の frontmatter に `parentIssue` フィールドがある場合、サブ Issue モードで動作する:

1. 親 Issue の計画 Issue（子 Issue のうちタイトルが「計画:」または「Plan:」で始まるもの）を特定し、`issue context {plan-issue-number}` で取得して全体コンテキストを把握する
2. ベースブランチを `develop` ではなく親の integration ブランチに設定（ステップ 3 参照）
3. PR 作成時も integration ブランチをベースにする（`open-pr-issue` が `parentIssue` フィールドで自力検出するため、明示的なコンテキスト渡しは不要。渡せばそれを利用する補助的位置づけ）

```bash
# 親 Issue の確認
shirokuma-flow issue context {parent-number}
# → .shirokuma/github/{org}/{repo}/issues/{parent-number}/body.md を Read ツールで読み込む
# subIssuesSummary からタイトルが「計画:」で始まる子 Issue を特定
shirokuma-flow issue context {plan-issue-number}
# → 計画の本文を取得してコンテキストとして使用
```

#### 計画済み判定（Issue 番号ありの場合）

`subIssuesSummary` を確認し、タイトルが「計画:」または「Plan:」で始まる子 Issue が存在するか確認する。

| 計画状態 | 条件 | アクション |
|---------|------|----------|
| — | Review ステータス | → Review ステータス優先パス（下記フローに従う） |
| 計画 Issue なし | Size XS/S（明確な要件）かつサブ Issue でない、かつ Review でない | → 計画をスキップして直接 `code-issue` に進む |
| 計画 Issue なし | Size M 以上または要件に曖昧さあり | → `prepare-flow` に委任して計画を策定 |
| 計画 Issue なし | サブ Issue（`parentIssue` あり） | → サイズに関わらず `prepare-flow` に委任して計画を策定 |
| 計画 Issue あり | — | → `issue context {plan-issue-number}` で計画 Issue の本文を取得し、コンテキストとして実装スキルに渡す |

#### Review ステータス優先パス

Review ステータスは「計画済み」の明示的シグナルであり、Size に関わらず計画の存在確認を優先する。判定フロー:

```
Review ステータス
  → 計画 Issue（subIssuesSummary でタイトル「計画:」で始まる子 Issue）の存在を確認
    あり → 計画 Issue の本文を取得してコンテキストとして使用（通常パスと同じ）
    なし → 異常系: ステータスが Review にもかかわらず計画が見つからない
           → 警告メッセージを表示し、Size に応じた通常判定にフォールバック
```

異常系フォールバックの警告メッセージ例: 「⚠️ Review ステータスですが、計画 Issue が見つかりません。通常の Size ベース判定にフォールバックします。」

#### 計画詳細の取得

計画 Issue が存在する場合（新方式）:

```bash
shirokuma-flow issue context {plan-issue-number}
# → .shirokuma/github/{org}/{repo}/issues/{plan-issue-number}/body.md を Read ツールで読み込み計画内容を取得
```

**XS/S 直接実装パスの判定:** Issue の Size フィールドが XS または S であり、かつタイトルと本文から変更内容が明確に読み取れる場合（パターン置換、型修正、リネーム等の機械的変換）に適用する。ただし、サブ Issue（`parentIssue` フィールドあり）は Size に関わらず計画が必須であるため、このパスの対象外とする。また、Review ステータスの場合はこのパスの対象外（Review ステータス優先パスが先に評価される）。Size が未設定、要件に曖昧さがある、サブ Issue である、または判断が難しい場合は `prepare-flow` に委任する。正規の判定基準は `create-item-flow` スキルの「要件明確性の判定」セクションを参照。

#### 計画書の Phase / PR タイミングの読み取り（必須）

計画 Issue の本文を取得したら、PR 作成タイミングに関する記述を**必ず先に解析**する。代表的なパターン:

| 計画書の記述 | 実装範囲と PR タイミング |
|------------|----------------------|
| 「Phase N 完了時にコミット、Phase {最終} 完了後に PR 作成」 | **全フェーズを一括実装してから PR を作成**。フェーズ単位での PR は作らない |
| 「Phase ごとに PR を作成」 | フェーズごとに PR を作成（明示的な指示がある場合のみ） |
| 記述なし | 通常通り単一 PR |

`coding-worker`（Agent）に渡す prompt には、解析結果に基づいて**実装すべき全フェーズ**を含めること。Phase 0 のみを切り出して渡す等のスコープ限定は、計画書に「フェーズごとに PR」と明記されていない限り行わない。

**過去の失敗:** XL Issue の計画に「全 Phase 完了後に PR」と書いてあったのに Phase 0 だけで PR を作成し、ユーザーから「一度に全部やれ」と指示されていたにもかかわらず指示を無視する形になった。

#### In Progress ステータス（計画フェーズ）からの遷移

| 計画状態 | アクション |
|---------|----------|
| In Progress + 計画なし | → `prepare-flow` に委任 |
| In Progress + 計画あり | → Review に遷移し、ユーザーに承認を求める |

**テキスト説明のみ**: ディスパッチ条件テーブル（ステップ 4）のキーワードから分類。

### ステップ 1a: Issue 解決（テキスト説明のみの場合）

テキスト説明のみで呼ばれた場合、`create-item-flow` スキルに委任して Issue を確保する。

```text
テキスト説明のみ → create-item-flow → Issue 番号取得 → ステップ 1 に合流
```

### ステップ 2: ステータス更新

**計画 Issue 中心モデルに基づくステータス更新:**

| 状況 | アクション |
|------|----------|
| 計画 Issue が ToDo の場合 | `shirokuma-flow begin {plan-issue-number}` を実行（計画 Issue を In progress に遷移）。親 Issue（課題）は直接操作しない。親は `syncParentStatus` が子 Issue のステータスから自動導出する |
| XS/S 直接実装パス（計画 Issue なし）の場合 | `shirokuma-flow begin {issue-number}` を実行（対象 Issue を In progress に遷移） |

> **`pr create` の自動遷移**: `pr create` が `Closes #N` を解析し、PR 前進遷移（PR_FORWARD）により PR を `In progress → Review` に遷移させる。計画 Issue・課題 Issue は Review に遷移させない（1 エンティティ 1 Review 原則）。

> **approve の意味変更**: 計画 Issue (子) の `approve` は `Review → Done`（計画完了）を意味する。これにより `syncParentStatus` が自動的に親 Issue を `Backlog → ToDo` に同期する。旧仕様の `approve = Review → ToDo` は廃止。

**Review / ToDo からの遷移**: Review 状態の Issue から `/implement-flow` が呼ばれた場合、`approve` を促してから `begin` を実行する:

| Issue の状態 | アクション |
|-----------|---------|
| Review（承認前） | 「先に `approve {number}` で承認してください（`Review → Done` に遷移し、親 Issue が `Backlog → ToDo` に自動同期される）」を提示して停止 |
| ToDo（承認済み）| `begin {plan-issue-number}` で In progress に遷移して実装開始 |
| In progress（実装継続） | ステータス更新をスキップして実装を継続 |

### ステップ 3: フィーチャーブランチの確保

`develop` または integration ブランチにいる場合、`branch-workflow` ルールに従いブランチを作成:

```bash
# 通常の Issue
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}

# サブ Issue（親の integration ブランチから分岐）
git checkout epic/{parent-number}-{slug} && git pull origin epic/{parent-number}-{slug}
git checkout -b {type}/{number}-{slug}
```

**Integration ブランチの検出順序**（サブ Issue の場合）:

1. 親 Issue の本文から `### Integration ブランチ`（JA）/ `### Integration Branch`（EN）ヘッディングを探し、直後のバッククォート内のブランチ名を抽出（プレフィックスは `epic/`, `chore/`, `feat/` 等任意）
2. フォールバック: `git branch -r --list "origin/*/{parent-number}-*"` で検索（1件→自動採用、複数→AskUserQuestion、0件→`develop` にフォールバック）
3. 見つからない場合: `develop` をベースにし、ユーザーに警告

### ステップ 3b: ADR 提案（Feature M+ のみ）

Feature タイプでサイズ M 以上の場合、ADR 作成を提案（AskUserQuestion）。

### ステップ 3c: ローカルドキュメントの検出（コーディングタスクのみ）

コーディング系タスク（実装・バグ修正・リファクタ）の場合、`code-issue` 起動前にローカルドキュメントを確認する:

```bash
shirokuma-flow docs detect --format json
```

`status: "ready"` のソースを収集し prompt に含める（`docs search "<keyword>" --source <name> --section`）。ソースなし or コーディング系以外はスキップ。

### ステップ 4: スキルの選択と実行

#### ディスパッチ条件テーブル

| 作業タイプ | 判定条件 | 委任先スキル | TDD 適用 |
|-----------|---------|------------|---------|
| コーディング全般 | 実装、修正、リファクタ、設定、Markdown 編集 | `code-issue` (subagent: `coding-worker`) | はい（実装・修正・リファクタ） |
| 調査 | キーワード: `research`, `調査` | `researching-best-practices` (subagent: `research-worker`) | いいえ |
| レビュー | キーワード: `review`, `レビュー` | `review-issue` (subagent: `review-worker`) | いいえ |
| セットアップ | キーワード: `初期設定`, `セットアップ`, `setup project` | `setting-up-project` | いいえ |

**事前解決ロジック**: サブエージェントワーカーは `AskUserQuestion` を使用できないため、マネージャー（メイン AI）が起動前にエッジケースを解決する:

| エッジケース | マネージャー（メイン AI）の事前アクション |
|------------|--------------------------|
| ステージ対象ファイルが不明 | `git status` で確認し、ファイルリストを引数で渡す |
| 複数ブランチマッチ | ブランチ一覧を確認し、正しいブランチを引数で渡す |
| 未コミット変更あり | `commit-issue` を先に呼び出す |

#### TDD ワークフロー（TDD 適用の場合）

TDD 適用の作業タイプでは、`code-issue` の呼び出しを TDD で包む:

```text
テスト設計 → テスト作成 → テスト確認（ゲート）→ [code-issue] → テスト実行 → 検証
```

TDD 共通ワークフローの詳細は [docs/tdd-workflow.md](docs/tdd-workflow.md) を参照。

### ステップ 5: ワークフロー順次実行

作業完了後、ワークフローチェーンを**自動的に順次実行**する。ステップ間でユーザーに確認しない。

| 作業タイプ | チェーン |
|-----------|---------|
| コーディング全般 | Work → Commit → PR → finalize-changes → Work Summary → Status Update |
| 調査 | Research → Discussion |
| レビュー | Review → レポート投稿 → 完了（コミット/PR チェーンなし） |

- **マージはチェーンに含まない**
- ステップ間で確認しない、進捗を1行で報告
- 失敗時: チェーン停止、状況報告、ユーザーに制御を返す

**チェーン完了保証**: スキル/サブエージェント完了後、マネージャー（メイン AI）は**即座に次のステップに進む**。チェーン末尾の Status Update はマネージャーが直接実行するため、分断リスクがない。

**Skill ツールと Agent ツールの完了パターンの違い:**

| 起動方法 | 完了後の判定方法 |
|---------|--------------|
| Skill ツール（`reviewing-claude-config` 等） | メインコンテキスト内で完了する。エラーがなければ次のステップへ進む。YAML パース不要 |
| Agent ツール（`coding-worker`, `review-worker`, `commit-worker`, `pr-worker`） | YAML フロントマターで `action` フィールドをパースし、`CONTINUE` → 次へ、`STOP` → 停止（[reference/worker-completion-pattern.md](reference/worker-completion-pattern.md) 参照） |

**Agent ツール出力パースチェックポイント** — Agent ツール（サブエージェント）出力を受け取ったら:

1. YAML フロントマターから `action` を読む
2. `action: CONTINUE` → 下記の例外チェックを経て、**同じレスポンス内**で `next` フィールドのスキルを即座に起動（本文 1 行目のみサマリー出力）
3. `action: STOP` / `REVISE` → チェーン停止、ユーザーに報告

例外（優先順）:
1. **`coding-worker` で `changes_made: false`**: `next` フィールドを無視し、変更なしチェーン（[reference/chain-execution.md](reference/chain-execution.md)「変更なしパス」参照）に分岐。`ucp_required` より先に評価する
2. **`ucp_required: true` または `suggestions_count > 0`**: AskUserQuestion でユーザーに提示してから続行

**核心: スキル/サブエージェントが完了したら、テキスト出力ではなくツール呼び出しで応答する。**

**Tasks 継続不変条件**: スキル/サブエージェント完了後、TaskList を確認する。`pending` ステップが残っている場合、同じレスポンス内で次のツール呼び出しを**必ず**実行すること — pending ステップが残ったままテキストのみの最終レスポンスを生成するのはチェーン断絶エラーである。

チェーン委任先対応表・擬似コード・Agent ツール構造化データフィールド定義の詳細は [reference/chain-execution.md](reference/chain-execution.md) を参照。

#### スキル・サブエージェント呼び出しパターン

スキルは Skill ツール（メインコンテキスト）または Agent ツール（サブエージェント）で起動する。コンテキスト分離が有効なスキルはサブエージェントで実行し、メインコンテキストの肥大化を防止する。ルールは各 worker スキルの `` `shirokuma-flow rules inject --scope {worker}` `` でサブエージェントに注入される。

| スキル | 起動方法 | 理由 |
|--------|---------|------|
| `code-issue` | Agent (`coding-worker`) | コンテキスト分離（実装作業はメインコンテキストを肥大化させる） |
| `finalize-changes` | Skill ツール | `/simplify` + `reviewing-security` + `lint docs` + 改善コミットの後処理チェーン。**Agent ツールで起動しない** |
| `review-issue` | Agent (`review-worker`) | コンテキスト分離 + opus モデル選択 |
| `reviewing-claude-config` | Skill ツール | 品質基準にプロジェクトルールが必要、比較的軽量 |
| `commit-issue` | Agent (`commit-worker`) | git 操作のみ |
| `open-pr-issue` | Agent (`pr-worker`) | GitHub 操作のみ |
| `researching-best-practices` | Agent (`research-worker`) | 外部調査 |

**Skill ツール**: `Skill(skill: "{name}", args: "#{number}")`

**Agent ツール**: `Agent(description: "{worker} #{number}", subagent_type: "{worker}", prompt: "#{number}")`

**⚠️ `pr-worker` は必ず Issue 番号を prompt に含めること**（`Closes #N` が省略され PR-Issue リンクが消える）。

> **重要 — Skill ツール / Agent ツール復帰後のチェーン継続**: Skill ツール（`finalize-changes` 等）またはサブエージェント（`pr-worker`, `commit-worker` 等）が完了した時点で、**TaskList の残り `pending` ステップを確認する**。pending ステップが残っている場合（コミット、PR 作成、作業サマリー、ステータス更新）、**同じレスポンス内で即座に次の pending ステップを実行すること**。停止・サマリー表示・ユーザーへの確認は禁止。Skill ツール / Agent ツールの復帰はチェーンの中間地点であり、完了シグナルではない。特に PR → `finalize-changes` の遷移で断絶しやすいため注意。

チェーン末尾のステップ（作業サマリー投稿・Status 更新・計画 Issue の Done 更新・次のステップ提案）の詳細は [reference/chain-end-steps.md](reference/chain-end-steps.md) を参照。

### ステップ 6: Evolution シグナル自動記録

チェーン正常完了後（チェーン失敗時はスキップ）、`rule-evolution` ルールの「スキル完了時の自動記録手順」に従い Evolution シグナルを自動記録する。タスクには登録しない（ノンブロッキング処理）。

## PR マージ後の自動アクション（チェーン外）

**マージはチェーンに含まない**。`shirokuma-flow pr merge` を別途実行する。マージ後の自動アクション（Done 化・syncParentStatus・次 Issue 提案）は `pr merge` が担う。マージ後は `next_action` の指示に従う。

## バッチモード

複数 Issue（例: `#101 #102 #103`）を逐次バッチで処理する。1 ブランチ・1 PR で逐次処理する。検出・適格性・タスク登録・ワークフローの詳細は [reference/batch-workflow.md](reference/batch-workflow.md) を参照。

> **並列バッチは廃止済み**（`parallel-coding-worker` 削除）。逐次バッチを使用。

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| Issue 番号 | `#42` | Issue 取得、タイプ分析 |
| 複数 Issue | `#101 #102 #103` | 逐次バッチモード |
| 説明文 | `implement dashboard` | テキスト分類 → `create-item-flow` 経由 |
| 引数なし | — | AskUserQuestion で確認 |

### フラグ

| フラグ | 説明 |
|--------|------|
| `--headless` | ヘッドレスモード。UCP をデフォルト動作で自動処理し、対話的な確認をスキップする |

## ヘッドレスモード（`--headless`）

UCP にデフォルト動作を適用し対話なしでチェーンを完遂する。前提条件・UCP デフォルト動作の詳細は [reference/headless-mode.md](reference/headless-mode.md) を参照。

**前提条件（概要）**: 明示的な Issue 番号 / ステータスが Review または ToDo / 計画 Issue が存在する — の 3 条件を全て満たすこと。

## エッジケース

| 状況 | アクション |
|------|----------|
| Issue が見つからない | AskUserQuestion で番号確認 |
| Issue が Done | 警告、再オープン確認 |
| 既に In Progress | ステータス変更なしで続行 |
| 誤ったブランチ | AskUserQuestion: 切り替え or 続行 |
| チェーン失敗 | 完了/残りステップ報告、制御を返す。[reference/chain-recovery.md](reference/chain-recovery.md) 参照 |
| `coding-worker` が `changes_made: false` で完了 | コミット・PR・finalize-changes をスキップ、変更なし用作業サマリーを投稿、AskUserQuestion でステータスを確認（キャンセル扱い via `issue cancel`（内部で Done + state_reason: not_planned に変換）/ Blocked / ToDo）。[reference/chain-end-steps.md](reference/chain-end-steps.md)「変更なしパス」参照 |
| Issue が revert された（PR revert 後） | `shirokuma-flow issue rollback {plan-issue#} --action revert` で revert ブランチ作成 + revert PR 作成 + 計画 Issue を ToDo に戻す処理を一括実行する。実行後は新ブランチで再実装。[reference/chain-recovery.md](reference/chain-recovery.md) 参照 |
| サブ Issue で integration ブランチ未検出 | `develop` をベースにし警告表示 |
| エピック Issue を直接指定 | 計画 Issue 以外の子 Issue の有無に基づき下記「エピック Issue エントリーポイント」参照 |
| `--headless` + 前提条件未達 | エラーメッセージを表示して停止 |
| `--headless` + 誤ブランチ（W4） | 警告を表示して停止（自動切り替えしない） |
| `--headless` + worker の UCP（W5） | スキップして Issue コメントに記録 |

PR revert 後のリカバリーおよびチェーン復旧手順の詳細は [reference/chain-recovery.md](reference/chain-recovery.md) を参照。

## エピック Issue エントリーポイント

エピック Issue が直接指定された場合、通常の実装ディスパッチではなく専用のエピックワークフローを実行する。

詳細（前提条件・統合ブランチ作成・サブ Issue 一括作成・実行順序案内）は [reference/epic-entry.md](reference/epic-entry.md) を参照。

**概要フロー**: Integration ブランチ作成 → サブ Issue 一括作成（未作成時のみ）→ 実行順序案内で終了（即時実装は開始しない）。

## ルール参照

| ルール | 用途 |
|--------|------|
| `branch-workflow` | ブランチ命名、`develop` からの作成、integration ブランチ |
| `batch-workflow` | バッチ適格性、品質基準、ブランチ命名 |
| `epic-workflow` リファレンス | エピック・サブ Issue ワークフロー全体像 |
| `project-items` | ステータスワークフロー、フィールド要件 |
| `git-commit-style` | コミットメッセージ形式 |
| `output-language` | GitHub 出力の言語規約 |
| `github-writing-style` | 箇条書き vs 散文のガイドライン |
| `worker-completion-pattern` リファレンス | Worker 完了後の統一パターン、拡張スキーマ |

## ツール使用

| ツール | タイミング |
|--------|-----------|
| AskUserQuestion | 要件確認、アプローチ選択、エッジケース判断（マネージャー（メイン AI）が事前解決） |
| TaskCreate, TaskUpdate | チェーンステップ登録（全作業で必須） |
| Bash | Git 操作、`shirokuma-flow issue` コマンド |

## 注意事項

- このスキルは作業の**マネージャー（メインプロセスの AI エージェント）**であり、Agent ツール（coding-worker, review-worker, commit-worker, pr-worker, research-worker）または Skill ツール（reviewing-claude-config）経由で作業を委任する
- **Effort 想定**: xhigh 前提。マルチステップのチェーンオーケストレーションを担うため、十分な推論深度を確保する
- 作業開始前に Issue ステータスを更新
- 正しいフィーチャーブランチを確保
- TDD 適用の作業では `code-issue` の呼び出しを TDD で包む（[docs/tdd-workflow.md](docs/tdd-workflow.md) 参照）
- ワークフローは常に順次実行（Commit → PR → Work Summary → Status Update）。**マージは含まない**
- チェーン実行はエラー発生時に停止し、ユーザーに制御を返す
- **チェーン自律進行（最重要）**: Skill ツールまたは Agent ツールが完了したら、テキスト出力ではなくツール呼び出しで応答する。TaskList に pending ステップがある限り、同じレスポンス内で次の Skill/Agent ツールを呼び出す。特に `open-pr-issue` 完了後は断絶しやすいため、Work Summary → Status Update を Bash で即座に実行する

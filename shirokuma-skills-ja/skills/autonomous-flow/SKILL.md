---
name: autonomous-flow
description: 複数 Issue を自律モードで連続処理するオーケストレーター。--autopilot フラグで承認ゲートを自動通過し、バッチ処理と全フェーズ貫通を実現。安全装置（連続失敗停止・件数上限・監査記録・dry-run）を内蔵。トリガー: 「自律処理」「autopilot」「自動処理」「バッチ実行」「連続処理」「自律モード」「autonomous」。
allowed-tools: Bash, Read, Skill, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList
---

!`shirokuma-flow rules inject --scope orchestrator`

# 自律モードで複数 Issue を連続処理（オーケストレーター）

> **チェーン自律進行（最重要ルール）**: 各フェーズフロー（`design-flow` / `prepare-flow` / `implement-flow`）を Skill ツールで起動したら、完了後に**同じレスポンス内で必ず次のステップ**（承認ゲート処理または次フェーズ起動）を実行する。1 Issue のフェーズチェーンが途中で止まったままテキストのみで応答を終えることはチェーン断絶エラーである。

複数の Issue を自律モード（autopilot）で連続処理する上位オーケストレーター。各 Issue を全フェーズ（トリアージ → 設計 → 計画 → 実装）に通し、`--autopilot` フラグ起動時のみ承認ゲートを自動通過する（ADR-v3-024: 包括委任、Proposed #2706）。

**注意**: このスキルは複数 Issue を **sequential**（1 件ずつ順番）に処理する。`implement-flow` が内部に持つ「1 Issue 内の複数タスク逐次バッチ」とは異なる上位概念であり、本スキルは Issue の選定・キューイング・フェーズチェーン接続を担い、各フェーズ内の詳細（設計・計画・実装）は既存フロースキルへ委任する。

## 核心コンセプト: 包括委任

自律モードの起動行為そのものを「人間による明示的な一括承認（包括委任）」とみなす。各承認ゲートの自動通過は「委任の履行」であり、ADR-v3-016 が排除した「暗黙承認の不透明さ」とは構造的に異なる（全自動承認を監査記録に残し事後確認可能とする）。

```
通常モード（デフォルト）:
  各承認ゲートでユーザー確認 → 承認操作 → 次フェーズ

自律モード（autopilot, opt-in）:
  起動時にユーザーが包括委任を宣言（--autopilot フラグ）
    → 各承認ゲートは「委任の履行」として自動通過
    → 監査記録に全自動承認を記録（事後確認可能）
```

## 委任メカニズム（選択肢 A: Skill ツールでフロー起動）

本スキルは各フェーズフローを **Skill ツール**で順次起動する上位オーケストレーターである。承認ゲートは本スキル自身が CLI（`shirokuma-flow submit/approve/pr merge`）で完了させてから次フェーズを起動する。各フロースキルの AskUserQuestion（承認ゲート）をバイパスするのではなく、**オーケストレーター層で承認操作を先に完了**してから次フェーズの Skill を呼び出す方式を取る。

```
autonomous-flow（マネージャー、Skill ツールで各フローを起動）
  ├─ design-flow（Skill）       → 設計フェーズ（設計要否 NEEDED の場合のみ）
  ├─ approve（Bash）            → 設計承認ゲートを自動通過（--autopilot 時）
  ├─ prepare-flow（Skill）      → 計画フェーズ
  ├─ approve（Bash）            → 計画承認ゲートを自動通過（--autopilot 時）
  ├─ implement-flow（Skill）    → 実装〜PR（PR は Backlog で作成）
  ├─ review-flow（Skill）       → コードレビュー（PASS で PR を Backlog → Review）
  └─ pr merge（Bash）           → PR マージゲートを自動通過（--autopilot 時、レビュー PASS が前提）
```

## タスク登録（必須）

**バッチ処理開始前**に以下のステップを TaskCreate で登録する。

| # | content | activeForm | 担当 |
|---|---------|------------|------|
| 1 | キューを構築する | キューを構築中 | マネージャー直接: `shirokuma-flow issue list` |
| 2 | 自律モードとキューを確認する | 自律モードとキューを確認中 | マネージャー直接: AskUserQuestion |
| 3 | バッチサマリー Issue を作成する | バッチサマリー Issue を作成中 | マネージャー直接: `shirokuma-flow issue add` |
| 4 | Issue ループを実行する（各 Issue を全フェーズ処理） | Issue ループを実行中 | Skill: `design-flow`/`prepare-flow`/`implement-flow`/`review-flow` + Bash |
| 5 | 完了レポートを表示する | 完了レポートを表示中 | マネージャー直接: バッチサマリー Issue 更新 |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4.

TaskUpdate で各ステップの実行開始時に `in_progress`、完了時に `completed` に更新する。ステップ 3 は `--autopilot` 有効かつ `--dry-run` でない場合のみ実行する。

> **Issue ループ内のサブタスク**: ステップ 4 の Issue ループ内では、各 Issue ごとにフェーズチェーン（トリアージ → 設計 → 計画 → 実装）を貫通する。Issue 単位の進捗は TaskCreate で動的に追加してもよいが、必須ではない（バッチサマリー Issue が永続的な進捗記録の正本）。

## バッチ状態（スキル内で保持）

```
queue:                Issue 番号のリスト
processed:            処理済み Issue と結果（SUCCESS / FAILED / SKIPPED）
consecutiveFailures:  連続失敗カウント
maxFailures:          停止閾値（デフォルト 3、--max-failures で上書き）
limit:                件数上限（デフォルト 10、最大 20、--limit で制御）
autopilotMode:        true / false（--autopilot フラグ）
dryRun:               true / false（--dry-run フラグ）
summaryIssueNumber:   バッチサマリー Issue の番号
batchId:              autopilot-{timestamp}
```

## ワークフロー

### ステップ 1: キュー構築

引数とフラグからキューを構築する（[reference/chain-recovery.md](reference/chain-recovery.md) のフェーズ再開判定と併用）。

| ケース | キュー構築ロジック |
|--------|------------------|
| 明示指定（`#101 #102 #103`） | 指定番号をキューとする。`--limit` を超える場合は警告して先頭 `--limit` 件のみ処理 |
| フィルタ指定（`--status ToDo`） | `shirokuma-flow issue list --status <status>` で収集し `--limit` 件に絞る |
| 複合（明示 + フィルタ） | 明示指定を優先し、フィルタは補助 |

```bash
# フィルタによる自動収集
shirokuma-flow issue list --status ToDo --format json
# → JSON の items から番号を抽出し、--limit 件に絞る
```

**件数上限**: デフォルト 10 件、最大 20 件。上限を超える場合はエラー停止ではなく警告 + トリミング（先頭 N 件のみ）。

### ステップ 2: 自律モードとキューの確認

`--autopilot` フラグの有無でモードが分岐する。

| モード | フラグ | 挙動 |
|--------|--------|------|
| 通常モード（デフォルト） | フラグなし | 各承認ゲートで AskUserQuestion による確認を行う |
| 自律モード（包括委任） | `--autopilot` | 承認ゲートを自動通過する |

**`--autopilot` 起動時の確認（必須）**: 包括委任の説明とキュー内容を提示し、AskUserQuestion で最終確認を取る。

```
自律モード（autopilot）で以下の {N} 件を連続処理します。
各 Issue の承認ゲート（トリアージ承認・設計承認・計画承認・PR マージ）を
自動通過します（包括委任 / ADR-v3-024、Proposed #2706）。

対象 Issue: #101, #102, #103
連続失敗上限: 3 件（超過で自動停止）

この内容で実行してよろしいですか？
```

**dry-run 時**: ステップ 4 を実行せず、各 Issue の予定アクションを表示して終了する（下記「dry-run モード」参照）。

### ステップ 3: バッチサマリー Issue の作成（`--autopilot` かつ `--dry-run` でない場合のみ）

バッチ開始時に追跡用の Issue を作成する。タイトル: `[Autopilot] バッチ処理サマリー: {timestamp}`。

> **dry-run 時はスキップ**: `--dry-run` の場合はこのステップを実行せず、「バッチサマリー Issue を作成する予定だった」という表示のみ行う（実 Issue は作成しない）。

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/autopilot-summary.md <<'EOF'
## バッチ処理サマリー

**バッチ ID:** autopilot-{timestamp}
**対象 Issue:** #101, #102, #103
**開始:** {ISO8601}

| Issue | 結果 | フェーズ | PR |
|-------|------|---------|-----|
| #101  | 処理中 | — | — |
| #102  | 待機中 | — | — |
| #103  | 待機中 | — | — |
EOF
shirokuma-flow issue add "[Autopilot] バッチ処理サマリー: {timestamp}" /tmp/shirokuma-flow/autopilot-summary.md
# → 返却された Issue 番号を summaryIssueNumber として保持
```

監査記録フォーマットの詳細は [reference/audit-record.md](reference/audit-record.md) を参照。

### ステップ 4: Issue ループ（各 Issue を全フェーズ処理）

キュー内の Issue を 1 件ずつ順番に処理する。各 Issue について以下を実行する。

#### 4a. ステータス確認 → 開始フェーズ決定

`shirokuma-flow issue context {number}` で現在のステータスと子 Issue を取得し、開始フェーズを判定する。ToDo 多義性（設計待ち/計画待ち/実装待ち）の判別は [reference/chain-recovery.md](reference/chain-recovery.md) のフェーズ再開判定アルゴリズムに従う。

| 現在のステータス | 開始フェーズ |
|----------------|------------|
| Backlog | トリアージ提出（`submit`）→ トリアージ承認（`approve`）→ フェーズ判定 |
| Review（トリアージ待ち） | トリアージ承認（`approve`）→ フェーズ判定 |
| ToDo | 子 Issue の有無とタイトルでフェーズを判別（[reference/chain-recovery.md](reference/chain-recovery.md) 参照） |
| In progress | 現フェーズを継続（子 Issue のステータスで判定） |
| Done | スキップ（処理済みとして記録、`consecutiveFailures` リセット） |
| Blocked | スキップ（要手動対応としてログ記録、`consecutiveFailures` リセット） |

#### 4b. フェーズチェーンの実行

開始フェーズから順次、必要なフェーズを実行する。各承認ゲートは `--autopilot` 時に自動通過する。

**トリアージ自動通過（H-1 対応: 必ず 2 ステップ）:**

```bash
shirokuma-flow submit {number}    # Backlog → Review（トリアージ提出）
shirokuma-flow approve {number}   # Review → ToDo（トリアージ承認）
```

> **`approve` は Review 状態でないと CLI がエラー拒否する。** Backlog から直接 `approve` を呼ぶと失敗するため、必ず `submit` で Review に遷移させてから `approve` する。すでに Review 状態の Issue には `submit` をスキップして `approve` のみ実行する。

**フェーズ委任（Skill ツール）と承認ゲート:**

```
# 設計フェーズ（設計要否 NEEDED の場合のみ）
Skill(skill: "design-flow", args: "#{number}")
  → 設計承認ゲート（--autopilot 時）:
     shirokuma-flow approve {design-issue-number}   # Review → ToDo

# 計画フェーズ
Skill(skill: "prepare-flow", args: "#{number}")
  → 計画承認ゲート（--autopilot 時）:
     shirokuma-flow approve {plan-issue-number}      # Review → ToDo（承認継承で実装サブ Issue が ToDo に）

# 実装フェーズ（計画 Issue のステータスで begin の要否を判定）
#   計画 Issue が ToDo の場合のみ: begin で In progress に遷移
#   計画 Issue が既に In progress の場合: begin をスキップ
shirokuma-flow begin {plan-issue-number}             # ToDo → In progress（ToDo の場合のみ）
Skill(skill: "implement-flow", args: "#{plan-issue-number}")
  → コードレビュー + PR マージゲート（--autopilot 時）:
     # PR 番号の取得: implement-flow 完了後に issue context で linked PR を確認
     shirokuma-flow issue context {plan-issue-number}  # → pull_requests[0].number を取得
     # PR が存在する場合のみレビュー → マージ（no-changes パスでは PR が存在しない）
     # implement-flow は PR を Backlog のままチェーン終了する（#2818）。
     # pr merge は遷移ガードを通さず Status=Done を force-set するため、
     # review-flow を必ず挟みレビュー PASS（PR が Review に遷移）を確認してからマージする。
     if pull_requests が空でない:
       Skill(skill: "review-flow", args: "#{pr-number}")  # コードレビュー（PASS で PR を Backlog → Review）
       shirokuma-flow status get {pr-number}              # → status == Review かを確認
       if レビュー PASS（status == Review）:
         shirokuma-flow pr merge {pr-number}              # Review → Done
       else:
         # レビュー FAIL / 未解決スレッドあり: 自動マージせず「レビュー FAIL（要対応）」
         # として記録し pr merge をスキップする（安全装置: 未レビュー/FAIL コードを自動マージしない）
     else:
       # 変更なしで完了（SUCCESS として記録）
```

> **`approve` の正本は `approve-flow` SKILL.md**（全種別 Review → ToDo、`issue_kind` で副作用分岐）。`pages/specs/workflow-status/` の一部（計画承認遷移）には ADR-v3-022 整合性監査で発見されたドリフトが残存しているため、本スキルは `approve-flow` SKILL.md を正本として参照する。

> **`implement-flow` のバッチモードを発火させない（M-1 対応）**: 各 Issue に対し `implement-flow` を **1 回**（単一 Issue 番号で）呼び出す。`#101 #102 #103` のように複数番号を一度に渡すと `implement-flow` 側の逐次バッチが起動するため、必ず 1 件ずつ呼び出す（1 Issue = 1 PR）。

#### 4c. 監査記録の投稿

`--autopilot` 時、各自動承認操作（submit/approve/PR マージ）を処理対象 Issue へのコメントとして記録する。フォーマットは [reference/audit-record.md](reference/audit-record.md) を参照（トリアージは submit + approve の 2 ステップを記録）。

#### 4d. 結果記録と連続失敗チェック

処理結果（SUCCESS / FAILED / SKIPPED）をバッチ状態とバッチサマリー Issue に記録する。失敗時の挙動（H-2 対応）:

```
失敗発生:
  if Issue が In progress 到達済み:
    → shirokuma-flow block {number} --reason "autopilot: {失敗フェーズ/原因}"      # In progress → Blocked（唯一の失敗遷移）
    → consecutiveFailures += 1
  else:
    → ステータス変更なし（そのまま次の Issue へスキップ。ログ記録のみ）
    → consecutiveFailures += 1
  → 監査記録に失敗を記録（原因）

  if consecutiveFailures >= maxFailures（デフォルト 3）:
    → 全停止。バッチサマリー Issue に記録してユーザーに報告
  else:
    → 次の Issue へ継続

成功時:
  → consecutiveFailures = 0（リセット）
  → 次の Issue へ

スキップ時（Done / Blocked の Issue）:
  → consecutiveFailures = 0（リセット）— 系統的失敗ではないため連続失敗カウントに含めない
  → 次の Issue へ
```

> **`In progress → Blocked` のみ CLI が許可する失敗遷移。** In progress 未到達（Backlog / ToDo / Review）の Issue を失敗時に強制的にステータス変更しない（ログ記録のみでスキップ）。

### ステップ 5: 完了レポート

全 Issue 処理後（または連続失敗で自動停止後）、結果をまとめてレポートする。フォーマットは `completion-report-style` ルールに従う。

```
## 自律処理完了

**バッチ ID:** autopilot-{timestamp}
**処理件数:** {成功} 件成功 / {失敗} 件失敗 / {スキップ} 件スキップ
**バッチサマリー:** #{summaryIssueNumber}

| Issue | 結果 | フェーズ | PR |
|-------|------|---------|-----|
| #101  | SUCCESS | 全フェーズ完了 | #201 |
| #102  | FAILED（Blocked）| prepare-flow で失敗 | — |
| #103  | SUCCESS | 全フェーズ完了 | #202 |
```

> **`**バッチサマリー:** #{summaryIssueNumber}` 行は条件付き**: `--autopilot` かつ `--dry-run` でない場合のみ表示する（バッチサマリー Issue が実際に作成されたとき）。通常モード・dry-run モードでは `summaryIssueNumber` が未設定のため、この行を省略する。

バッチサマリー Issue を最終結果で更新する。連続失敗で自動停止した場合は、未処理 Issue 一覧と推奨アクション（`/autonomous-flow` で残りを再実行 or 個別対応）を併記する。

## dry-run モード（`--dry-run`）

実際の操作を行わず予定アクションを表示する。トリアージは submit + approve の 2 ステップを明示する。

```
[Dry-run] 以下の操作を実行予定です:

Issue #101 (タイトル...):
  1. トリアージ提出: Backlog → Review（submit #101）
  2. トリアージ承認: Review → ToDo（approve #101）※ approve は Review 状態の Issue にのみ実行可
  3. design-flow 実行（設計要否: NEEDED）
  4. 設計承認: Review → ToDo（approve #{設計Issue番号}）
  5. prepare-flow 実行
  6. 計画承認: Review → ToDo（approve #{計画Issue番号}）
  7. begin #{計画Issue番号}（ToDo → In progress）
  8. implement-flow 実行（PR は Backlog で作成）
  9. review-flow 実行（コードレビュー、PASS で PR を Backlog → Review）
  10. PR マージ（pr merge #{PR番号}）※ レビュー PASS 時のみ。FAIL は要対応として記録しスキップ

Issue #102 (タイトル...):
  1. prepare-flow から再開（ステータス: ToDo / 子 Issue「計画:」あり）
  ...

実際に実行する場合は --dry-run を外してください。
```

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| 複数 Issue | `#101 #102 #103` | 明示指定キュー |
| 単一 Issue | `#101` | 1 件のみ処理（autonomous-flow としては最小キュー） |
| 引数なし | — | フィルタ指定が必須。なければ AskUserQuestion で確認 |

### フラグ

| フラグ | デフォルト | 説明 |
|--------|----------|------|
| `--autopilot` | オフ | 自律モード（包括委任）。承認ゲートを自動通過 |
| `--dry-run` | オフ | 予定アクションを表示（操作は実行しない） |
| `--status <status>` | — | ステータスフィルタでキューを自動収集 |
| `--label <label>` | — | ラベルフィルタ（補助） |
| `--limit <n>` | 10 | 件数上限（最大 20） |
| `--max-failures <n>` | 3 | 連続失敗での自動停止閾値 |

## 責務境界

| 責務 | autonomous-flow | implement-flow |
|------|----------------|----------------|
| 対象 Issue の選定・キューイング | 担当 | 対象外 |
| フェーズチェーン接続（design → prepare → implement） | 担当 | 対象外 |
| 承認ゲートの自動通過 | 担当（`--autopilot` 時） | 対象外（AskUserQuestion で人間に委ねる） |
| 個々の Issue の実装・コミット・PR 作成 | `implement-flow` に委任 | 担当 |
| コーディング・テスト・レビュー対応 | `implement-flow` に委任 | 担当 |

- **autonomous-flow は 1 件ずつ sequential に処理する**（H-3/M-1 対応）。`implement-flow` の既存逐次バッチモードを発火させないため、各 Issue に対し単一 Issue 番号で `implement-flow` を呼び出す。
- **承認の正本は `approve-flow` SKILL.md**。`status.md` のドリフト（計画承認遷移）は別途修正 Issue で対応予定であり、本スキルは `approve-flow` SKILL.md の遷移定義（Review → ToDo）を参照する。

## エッジケース

| 状況 | アクション |
|------|----------|
| キューが空 | 警告を表示して終了（処理対象なし） |
| `--limit` 超過 | 警告 + 先頭 N 件にトリミング（エラー停止しない） |
| `approve` が Review 以外でエラー | `submit` を先に実行してから `approve`（[reference/chain-recovery.md](reference/chain-recovery.md) 参照） |
| 連続失敗が閾値到達 | 全停止 + バッチサマリーに記録 + 未処理 Issue 一覧を提示 |
| Issue が既に Done | スキップ（処理済みとして記録） |
| `--autopilot` なしで複数 Issue | 通常モード（各ゲートで AskUserQuestion）。バッチサマリー Issue は作成しない |
| フェーズチェーン中断 | [reference/chain-recovery.md](reference/chain-recovery.md) のリカバリ手順に従う |

## ルール参照

| ルール | 用途 |
|--------|------|
| `project-items` | ステータスワークフロー、「次フロー共通ゲート」節（着手挙動の正本） |
| `output-language` | GitHub 出力の言語規約 |
| `github-writing-style` | 箇条書き vs 散文のガイドライン |
| `completion-report-style` | 完了レポートのフォーマット |
| `approve-flow` スキル | 承認遷移の正本（Review → ToDo、issue_kind 副作用分岐） |

## ツール使用

| ツール | タイミング |
|--------|-----------|
| AskUserQuestion | 自律モード・キュー確認、通常モードの各承認ゲート |
| Bash | `shirokuma-flow submit/approve/begin/block/issue list/issue add/issue comment/pr merge` |
| Skill | `design-flow` / `prepare-flow` / `implement-flow` / `review-flow` の起動 |
| TaskCreate, TaskUpdate | バッチ処理ステップの進捗管理 |

## 注意事項

- このスキルは複数 Issue 処理の**マネージャー（メインプロセスの AI エージェント）**であり、各フェーズフローを Skill ツールで起動する上位オーケストレーターである
- **Effort 想定**: xhigh 前提。複数 Issue × マルチフェーズのチェーンオーケストレーションを担うため、十分な推論深度を確保する
- **自律モードは opt-in**: `--autopilot` がない場合は通常モード（各ゲートで AskUserQuestion）。デフォルトで承認を自動通過しない
- **承認ゲートはオーケストレーターが CLI で先に完了**してから次フェーズを起動する（各フロースキルの AskUserQuestion をバイパスしない）
- **チェーン自律進行（最重要）**: フェーズフロー（Skill ツール）完了後、同じレスポンス内で承認ゲート処理 → 次フェーズ起動へ進む。1 Issue のフェーズチェーンが完了するまで停止しない
- 全自動承認は監査記録（各 Issue コメント + バッチサマリー Issue）に残し、事後確認可能とする
- 並列バッチ処理は対象外（`parallel-coding-worker` 廃止済み）。sequential 処理のみ

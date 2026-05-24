# フェーズ再開判定・チェーンリカバリ リファレンス

`autonomous-flow` のフェーズ再開判定アルゴリズムと、チェーン中断時のリカバリガイド。

参照: [SKILL.md](../SKILL.md)

## フェーズ再開判定アルゴリズム

各 Issue の処理開始時、現在のステータスと子 Issue の構成から「どのフェーズから開始すべきか」を判定する。特に **ToDo は多義的**（設計待ち / 計画待ち / 実装待ち）であるため、子 Issue の有無とタイトルで判別する。

### ステータス別の開始フェーズ

| 現在のステータス | 開始フェーズ |
|----------------|------------|
| Backlog | `submit`（Backlog → Review）→ `approve`（Review → ToDo）→ 子 Issue 判定 |
| Review（トリアージ待ち） | `approve`（Review → ToDo）→ 子 Issue 判定 |
| ToDo | 下記「ToDo 多義性の判別」に従う |
| In progress | 現フェーズを継続（子 Issue のステータスで判定） |
| Done | スキップ（処理済みとして記録） |
| Blocked | スキップ（要手動対応としてログ記録） |

### ToDo 多義性の判別（擬似コード）

ToDo の Issue は、子 Issue の有無とタイトル接頭辞でフェーズを判別する。

```text
# issue context {number} の subIssuesSummary から子 Issue を取得
children = issue_context.subIssuesSummary

if children が空:
    # 子 Issue なし → 設計も計画もまだ → issue-flow フェーズ相当から
    # = design-flow（設計要否判定を含む）から開始
    開始フェーズ = "design-flow"  # design-flow が NOT_NEEDED と判定すれば prepare-flow へ自動遷移

else:
    design_child = children のうちタイトルが「設計:」または「Design:」で始まるもの
    plan_child   = children のうちタイトルが「計画:」または「Plan:」で始まるもの

    if design_child が存在 and design_child.status in [Backlog, Review]:
        # 設計フェーズが未完了
        開始フェーズ = "design-flow"

    elif plan_child が存在:
        if plan_child.status == ToDo:
            # 計画承認済み・着手待ち → begin してから実装
            開始フェーズ = "implement-flow"  # 事前に begin {plan_child.number}
        elif plan_child.status in [Backlog, Review]:
            # 計画フェーズ継続（計画作成中 or 計画承認待ち）
            開始フェーズ = "prepare-flow"
        else:
            # In progress / Done 等 → 実装フェーズ
            開始フェーズ = "implement-flow"

    elif design_child が存在 and design_child.status == ToDo:
        # 設計承認済み・計画未着手 → 計画フェーズから
        開始フェーズ = "prepare-flow"

    else:
        # 子 Issue はあるが設計/計画 Issue でない（実装サブ Issue 等）
        # → 計画策定が必要
        開始フェーズ = "prepare-flow"
```

### 判別ロジックの要約

| 子 Issue の状態 | 開始フェーズ |
|----------------|------------|
| 子 Issue なし | `design-flow` から（設計要否判定込み） |
| 「設計:」子が Backlog/Review | `design-flow` から再開 |
| 「設計:」子が Backlog/Review ＋「計画:」子も存在 | `design-flow` から再開（アルゴリズム優先順: design > plan > implement） |
| 「設計:」子が ToDo（計画未着手） | `prepare-flow` から |
| 「計画:」子が Backlog/Review | `prepare-flow` から再開 |
| 「計画:」子が ToDo | `begin` してから `implement-flow` |
| 「計画:」子が In progress/Done | `implement-flow` から |
| 実装サブ Issue のみ（計画 Issue なし） | `prepare-flow` から |

> **計画 Issue が ToDo の場合の begin**: 計画承認（`approve`）により計画 Issue は `Review → ToDo` に遷移する。実装着手前に `shirokuma-flow begin {plan-issue-number}` で `ToDo → In progress` に遷移させてから `implement-flow` を起動する（`ISSUE_FORWARD_TRANSITIONS` に Backlog → In progress の直接遷移は存在しないため、必ず ToDo を経由する）。

## トリアージ 2 ステップの冪等性（H-1 対応）

トリアージ承認は **submit → approve の 2 ステップ**で行う。状態に応じてスキップ判定する。

| 現在のステータス | submit | approve |
|----------------|--------|---------|
| Backlog | 実行（Backlog → Review） | 実行（Review → ToDo） |
| Review | スキップ（既に Review） | 実行（Review → ToDo） |
| ToDo 以降 | スキップ | スキップ（既に承認済み） |

> **`approve` は Review 状態でないと CLI がエラー拒否する**（`result: "error"` を返す）。Backlog から直接 `approve` を呼ぶと失敗するため、必ず `submit` を先に実行する。既に Review の Issue には `submit` をスキップして `approve` のみ実行する。

## 中断ポイントごとのリカバリ

フェーズチェーンが途中で止まった場合、どのフェーズで止まったかを特定してから再開する。

### フェーズ別の再開可能状態

| 止まったフェーズ | 確認項目 | リカバリ操作 |
|----------------|---------|------------|
| トリアージ（submit/approve） | `issue context {n}` でステータス確認 | Review なら `approve`、Backlog なら `submit` → `approve` |
| design-flow | 「設計:」子 Issue の有無・ステータス | `design-flow` を Skill ツールで再起動 |
| prepare-flow | 「計画:」子 Issue の有無・ステータス | `prepare-flow` を Skill ツールで再起動 |
| implement-flow | `gh pr list --head {branch}` で PR 確認 | `implement-flow` を Skill ツールで再起動（冪等） |
| PR マージ | `shirokuma-flow pr view {pr}` でマージ状態確認 | 未マージなら `pr merge {pr}` |

### バッチ全体のリカバリ

バッチ処理が中断した場合（連続失敗での自動停止 / セッション切断等）、バッチサマリー Issue が処理状態の正本となる。

```text
1. バッチサマリー Issue を Read → 各 Issue の結果（SUCCESS / FAILED / SKIPPED / 待機中）を確認
2. 「待機中」の Issue を新しいキューとして /autonomous-flow で再実行
3. FAILED（Blocked）の Issue は個別対応を推奨（自律モードの再実行対象から除外可）
```

## 冪等性保証

| 状態 | 動作 |
|------|------|
| トリアージ済み（Review/ToDo） | `submit`/`approve` を状態に応じてスキップ |
| 計画 Issue が既に存在 | `prepare-flow` が上書き確認（autopilot 時は既存計画を尊重） |
| ブランチが既に存在 | `implement-flow` が既存ブランチに切り替え |
| PR が既に存在 | `implement-flow`（pr-worker）が検出してスキップ |
| PR が既にマージ済み | `pr merge` をスキップ（Done として記録） |
| バッチサマリー Issue が既に存在 | 新規作成せず既存を更新（再実行時） |

## 注意事項

- フェーズをスキップしない — 各フェーズの成果物（設計 Issue / 計画 Issue / PR）は次フェーズが使用する
- リカバリが繰り返し失敗する場合は、現在の状態をバッチサマリー Issue に記録してユーザーに報告し停止する
- 連続失敗での自動停止後は、根本原因（系統的問題の可能性）を確認してから再実行する

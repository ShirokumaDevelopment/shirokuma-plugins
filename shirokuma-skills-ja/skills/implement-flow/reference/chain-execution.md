# チェーン実行リファレンス

`implement-flow` のステップ 5（ワークフロー順次実行）の詳細リファレンス。

## チェーン委任先対応表（必ず遵守）

| 完了したスキル | 起動方法 | 次に呼ぶスキル | 起動方法 | 禁止行動 |
|-------------|---------|-------------|---------|---------|
| `code-issue` (`changes_made: true`) | Agent (`coding-worker`) | `commit-issue` | Agent (`commit-worker`) | `code-issue` を再起動しない |
| `code-issue` (`changes_made: false`) | Agent (`coding-worker`) | **変更なしチェーン**（下記「変更なしパス」参照） | マネージャー直接実行 | コミット・PR・finalize-changes をスキップする |
| `commit-issue` | Agent (`commit-worker`) | `open-pr-issue` | Agent (`pr-worker`) | `code-issue` に委任しない |
| `open-pr-issue` | Agent (`pr-worker`) | `finalize-changes` | Skill ツール | PR は Backlog のまま。Review 遷移はユーザーの `/review-flow` 実行時に行われる。implement-flow はコードレビューを自動起動しない（#2818） |
| `finalize-changes` | Skill ツール | **マネージャー管理ステップ開始**（下記参照） | 直接実行 | Agent ツールで起動しない |
| `review-issue` | Agent (`review-worker`) | **完了**（コミット/PR チェーンなし。CONTINUE/STOP の詳細は下記「レビューワークタイプのチェーン」参照） | — | コミットチェーンを起動しない |

## Testing ステータス遷移の方針

`Testing` ステータスは `implement-flow` が自動的に設定しない。ユーザーが手動で行うか、CI 完了後に自動で遷移する。

| トリガー | 設定者 |
|---------|--------|
| CI パイプラインが正常完了 | CI システム（自動）またはユーザー |
| ユーザーが実装を手動で検証 | ユーザー（手動） |
| PR がマージされてステージングにデプロイ後 | ユーザー（手動） |

チェーン内で `Testing` ステータスを設定**しない**こと。チェーンは PR を Backlog で作成し、Backlog のままチェーンを終える（#2818）。`Backlog → Review` 遷移はユーザーが `/review-flow` を実行した時点で行われる（#2802）。Issue 本体の Status はチェーン末尾で変更しない（1 エンティティ 1 Review 原則）。`Testing` への遷移は人間または CI システムの責務である。

## `finalize-changes` 完了後のマネージャー管理ステップ（断絶最多ポイント）

`finalize-changes` 完了後は、サブエージェントではなくマネージャーが直接実行する。後処理が完了した時点でチェーンが終わったように見えるが、**TaskList には pending ステップが残っている**。停止せずに**同じレスポンス内で**以下を Bash ツールで順次実行する:

1. **Work Summary**: Issue コメントとして作業サマリーを投稿（Bash: `shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-work-summary.md`）
2. **次フロー案内**: チェーン末尾で `/review-flow #{PR#}` を案内提示する。PR は Backlog のままチェーンを終える。PR の Review 検証は行わない（implement-flow はコードレビューを自動起動しないため。#2818）。**Issue 本体を `submit` で Review に遷移させない**（1 エンティティ 1 Review 原則）
3. **Evolution**: シグナル自動記録（ステップ 5 参照）

> **なぜここで断絶するのか**: PR 作成と後処理チェーン（finalize-changes）は視覚的な「完了感」が強く、LLM がサマリーを出力して停止しやすい。しかし TaskList の pending ステップが 0 になるまではチェーン途中である。

## チェーン進行ロジック（擬似コード）

```text
// ステップ 1: code-issue（Agent ツール — coding-worker）
subagent_output = invoke_agent("coding-worker")
frontmatter, body = parse_yaml_frontmatter(subagent_output)
if frontmatter.action == "STOP":
  handle_failure(frontmatter, body)
  break
TaskUpdate("implement", "completed")

// ステップ 1b: 変更なし分岐（coding-worker 限定）
if frontmatter.changes_made == false:
  // コミット・PR・finalize-changes をスキップし、変更なしチェーンに進む
  // 詳細は chain-end-steps.md「変更なしパス」セクション参照
  execute_no_changes_chain(frontmatter, body)
  break

// ステップ 2-3: commit, pr（Agent ツール — サブエージェント）
// pr create は PR を Backlog で作成する（#2802）。PR は Backlog のままチェーンを終える
for each step in [commit, pr]:
  subagent_output = invoke_agent(step)
  frontmatter, body = parse_yaml_frontmatter(subagent_output)
  if frontmatter.action == "STOP":
    handle_failure(frontmatter, body)
    break
  TaskUpdate(step, "completed")

// ステップ 4: finalize-changes（Skill ツール）
// /simplify → reviewing-security → lint docs → 改善コミット（変更ありの場合）を内包
// implement-flow はコードレビュー（review-flow）を自動起動しない（#2818）
invoke_skill("finalize-changes")
// Skill ツールはメインコンテキストで完了。エラーがなければ次へ進む
TaskUpdate("finalize_changes", "completed")

// ステップ 5-6: work_summary, next_flow_guidance（マネージャー直接実行）
// 作業サマリーを `issue comment` で投稿
post_work_summary()  // shirokuma-flow issue comment {N} /tmp/...
TaskUpdate("work_summary", "completed")
// チェーン末尾で /review-flow #{PR#} を案内提示する。PR は Backlog のまま（検証不要）
// Backlog → Review 遷移はユーザーの /review-flow 実行時に行われる
guide_next_flow()  // "/review-flow #{PR#}" を提示
TaskUpdate("next_flow_guidance", "completed")
```

## 変更なしパス（`changes_made: false`）

`coding-worker` が `changes_made: false` で完了した場合、通常の commit → PR → finalize チェーンは実行しない。代わりに以下のマネージャー直接ステップを実行する:

1. **変更なし作業サマリー投稿**: 調査結果として Issue コメントを投稿（chain-end-steps.md「変更なし用作業サマリー」参照）
2. **ステータス判定**: coding-worker の本文から理由を判定し、ステータスを更新（chain-end-steps.md「変更なし時のステータス判定」参照）
3. **次のステップ提案**: PR がないため `/review-flow` は省略

commit-issue / open-pr-issue / finalize-changes のタスクは `skipped`（または `completed` に相当するスキップ扱い）としてマークする。

## Agent ツール構造化データフィールド定義

`commit-worker` および `pr-worker` に適用:

| フィールド | 必須 | 値 | 説明 |
|-----------|------|-----|------|
| `action` | はい | `CONTINUE` / `STOP` | オーケストレータへの行動指示（最初のフィールド） |
| `next` | 条件付き | スキル名 | `action: CONTINUE` 時に次のスキルを指定 |
| `status` | はい | `SUCCESS` / `FAIL` | 結果ステータス |
| `ref` | 条件付き | GitHub 参照 | GitHub に書き込みを行った場合の人間向け参照 |
| `comment_id` | 条件付き | 数値（database_id） | コメント投稿時のみ。reply-to / edit 用 |
| `ucp_required` | いいえ | boolean | worker がユーザー判断を要求する場合 `true` |
| `suggestions_count` | いいえ | number | 改善提案の件数 |
| `followup_candidates` | いいえ | string[] | フォローアップ Issue 候補 |

`Summary` フィールドは廃止。代わりに**本文の 1 行目**をサマリーとして扱う。

Agent ツールの構造化データは内部処理データであり、そのままユーザーに提示しない。本文 1 行目のみサマリーとして出力して次のツール呼び出しへ進む。

## レビューワークタイプのチェーン

`review-issue`（subagent: `review-worker`）はレビュー結果レポートで完了 — コミット/PR チェーンは続かない。

```
review-issue → レポート投稿 → 完了
```

`review-issue` 完了後:
1. `review-worker` 出力の `action` フィールドを確認
2. `ucp_required: true` の場合 → 修正に進む前に AskUserQuestion でレビュー結果をユーザーに提示
3. `action: STOP` → チェーン完了、ユーザーに報告

委任タイミングの詳細は [docs/reviewing-reference.md](../docs/reviewing-reference.md) を参照。

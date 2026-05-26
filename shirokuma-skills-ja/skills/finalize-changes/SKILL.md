---
name: finalize-changes
description: コード変更後の共通後処理（finalize-worker SubAgent による /simplify＋セキュリティレビュー → lint docs → 改善コミット）を実行する小規模オーケストレーター。implement-flow と review-flow から呼び出される。
allowed-tools: Bash, Agent
---

# 変更の後処理

`implement-flow` と `review-flow` の共通後処理チェーン。コード変更後に `finalize-worker` SubAgent（内部で `/simplify` と `reviewing-security` を順次実行）と `lint docs` を実行し、変更があった場合のみ改善コミットをプッシュする。

## 呼び出し元

| スキル | 呼び出しタイミング |
|--------|-----------------|
| `implement-flow` | PR 作成後（ステップ 4-5 の後処理チェーン） |
| `review-flow` | レビュー修正コミット後（ステップ 5 の後処理） |

> **設計メモ**: `/simplify` と `reviewing-security` を `finalize-worker` SubAgent に委任してコンテキスト分離する設計の背景は [`plugin/specs/skills/finalize-changes/DESIGN.md`](../../../specs/skills/finalize-changes/DESIGN.md) を参照。

## ワークフロー

### ステップ 1: finalize-worker SubAgent 委任

`finalize-worker` を Agent ツールで起動。SubAgent は内部で Step A（skip 判定）→ Step B（`/simplify`）→ Step C（`reviewing-security`）を順次実行する（詳細は `plugin/shirokuma-skills-ja/agents/finalize-worker.md` 参照）。

```text
Agent(
  description: "finalize-worker simplify+security",
  subagent_type: "finalize-worker",
  prompt: "コード変更後の品質チェック（/simplify と reviewing-security）を実行してください。"
)
```

SubAgent はサブ Issue の integration ブランチを利用している場合、呼び出し元が prompt に base branch（例: `epic/2612-finalize-worker-subagent`）を含めて伝える。base branch が不明な場合は `develop` フォールバックを使用する。

> **完了出力の判定**: `worker-completion-pattern.md` の Agent ツール完了パターンに従い YAML フロントマターをパースする。`status: SUCCESS` → 次のステップへ。`status: FAIL`（SubAgent の致命的エラー）→ 警告を出力し、`lint docs` ステップへ続行する（チェーン全体は停止しない）。`action: STOP` は通常返らないが、返った場合は呼び出し元に停止を報告する。

> **エラーハンドリング**: `/simplify` 失敗・`reviewing-security` 失敗のいずれも SubAgent 内で `status: SUCCESS` のまま吸収される（worker 内ルール参照）。`finalize-changes` 側からはエラー無しに見える。

### ステップ 2: lint docs（機械検査による docs drift 検出）

`shirokuma-flow lint docs` を実行し、ドキュメントの構造的なずれ（必須セクション欠落・参照切れ等）を検出する。**ステップ 1 の `/simplify` は内容品質（冗長・一貫性）を扱うのに対し、本ステップは構造検査で責務が異なる。**

```bash
shirokuma-flow lint docs
```

判定:

| 結果 | 対応 |
|------|------|
| **PASS** | 次のステップ（改善コミット）へ進む |
| **エラー検出（inline 修正可能）** | 同 PR 内で修正してから次へ進む。判定基準: **追加で必要な修正範囲が 3 ファイル以下、かつ Markdown / 設定ファイル（`.md` / `.yaml` / `.yml` / `.json` / `.toml`）のみ**。PR 本体作業で既に編集中のファイルはカウント対象外。判断に迷う場合は inline 修正を優先する |
| **エラー検出（大規模・構造的）** | `issue-flow` 経由で派生 Issue 化（または手動で記録）。本 PR の作業は完了として扱い、派生 Issue で別途対応する |

> **エラーハンドリング**: 以下 2 種を区別する。
>
> - **drift 検出（非ゼロ exit, 期待挙動）**: 上記の判定テーブルに従って inline 修正または派生 Issue 化で対応する
> - **コマンド実行失敗（CLI 自体のクラッシュ等）**: 警告を出力し、次のステップへ続行する。drift 検出として扱わない

### ステップ 3: 改善コミット（変更があった場合のみ）

ステップ 1（`finalize-worker` 内の `/simplify`・`reviewing-security`）または ステップ 2（`lint docs`）でコード変更が生じた場合、`commit-worker` に追加コミットを委任:

```bash
# 変更有無を確認
git diff --stat
```

変更がある場合:

```text
Agent(
  description: "commit-worker simplify/security improvements",
  subagent_type: "commit-worker",
  prompt: "simplify/security-review による改善をコミット・プッシュしてください。コミットには `shirokuma-flow git commit-push` を使用してください。"
)
```

変更がない場合はこのステップをスキップし、次へ進む。

## ルール

1. **`finalize-worker` の `status: FAIL` でも続行** — `lint docs` ステップへ進む（チェーン全体は停止しない）
2. **変更なければスキップ** — 改善コミットは `git diff --stat` で変更を確認してから実行
3. **出力切り詰め禁止** — SubAgent 出力を `| tail` / `| head` / `| grep` でパイプしない
4. **呼び出し元にサマリー投稿の責務は委ねる** — このスキルは作業サマリーの投稿を行わない
5. **`Skill` ツールを直接呼ばない** — `/simplify` と `reviewing-security` の呼び出しは `finalize-worker` SubAgent に閉じる。本スキルは `allowed-tools` から `Skill` を除外し、コンテキスト分離を構造的に保証する

## ツール使用

| ツール | タイミング |
|--------|-----------|
| Agent | `finalize-worker`（ステップ 1）、`commit-worker` による改善コミット（ステップ 3、変更ありの場合） |
| Bash | `shirokuma-flow lint docs`（ステップ 2）、`git diff --stat` による変更有無の確認（ステップ 3） |

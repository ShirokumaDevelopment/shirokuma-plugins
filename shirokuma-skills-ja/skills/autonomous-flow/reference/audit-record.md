# 監査記録フォーマット リファレンス

`autonomous-flow` の `--autopilot` モードでは、各自動承認操作を監査記録として残す。包括委任（ADR-v3-024、Proposed #2706）の透明性を担保し、全自動承認を事後確認可能にするための仕組みである。

参照: [SKILL.md](../SKILL.md)

## 二重記録の方針

| 記録先 | 内容 | 用途 |
|--------|------|------|
| 処理対象 Issue へのコメント | 当該 Issue の自動承認内容・タイムスタンプ・実行者 | 各 Issue の事後確認 |
| バッチサマリー Issue | バッチ全体の処理結果（成功・失敗・自動承認一覧） | バッチ全体の事後監査 |

> ローカルログ（`/tmp/shirokuma-flow/autopilot-{timestamp}.log`）への詳細記録は任意（デバッグ用途）。GitHub Issue が正本でありセッションをまたいで参照可能。

## 各 Issue へのコメントフォーマット

各 Issue の全フェーズ処理完了後（または失敗時）、その Issue にコメントを投稿する。

```markdown
## [Autopilot] 自動承認記録

**バッチ ID:** autopilot-{timestamp}
**実行者:** @{user}（包括委任）

| ゲート | 操作 | タイムスタンプ |
|--------|------|--------------|
| トリアージ提出（submit） | Backlog → Review | 2026-05-23T09:59:00Z |
| トリアージ承認（approve） | Review → ToDo | 2026-05-23T10:00:00Z |
| 設計承認（approve） | Review → ToDo | 2026-05-23T10:03:00Z |
| 計画承認（approve） | Review → ToDo | 2026-05-23T10:05:00Z |
| PR マージ（pr merge） | Review → Done | 2026-05-23T10:15:00Z |

**ADR 根拠:** ADR-v3-024（包括委任による承認ゲート自動通過）
```

> **トリアージは必ず 2 行（H-1 対応）**: トリアージ承認は `submit`（Backlog → Review）と `approve`（Review → ToDo）の 2 ステップで構成されるため、監査記録にも **submit 行と approve 行を分けて記録**する。1 行にまとめない。

> **実行済みゲートのみ記録**: 設計フェーズが NOT_NEEDED の場合は「設計承認」行を省略する。フェーズ再開で一部ゲートを通過済みの場合も、当該セッションで実行した操作のみを記録する。

> **`{user}` の取得**: `gh api user -q .login` で実行ユーザーのログイン名を取得する（例: `particles7`）。

### コメント投稿コマンド

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/{number}-autopilot-audit.md <<'EOF'
## [Autopilot] 自動承認記録

**バッチ ID:** autopilot-{timestamp}
**実行者:** @{user}（包括委任）

| ゲート | 操作 | タイムスタンプ |
|--------|------|--------------|
| トリアージ提出（submit） | Backlog → Review | {ts1} |
| トリアージ承認（approve） | Review → ToDo | {ts2} |

**ADR 根拠:** ADR-v3-024（包括委任による承認ゲート自動通過）
EOF
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-autopilot-audit.md
```

## バッチサマリー Issue のフォーマット

バッチ開始時に作成し、各 Issue の処理後に更新する。タイトル: `[Autopilot] バッチ処理サマリー: {timestamp}`。

```markdown
## バッチ処理サマリー

**バッチ ID:** autopilot-{timestamp}
**対象 Issue:** #101, #102, #103
**開始:** 2026-05-23T10:00:00Z
**完了:** 2026-05-23T10:30:00Z

| Issue | 結果 | フェーズ | PR |
|-------|------|---------|-----|
| #101  | SUCCESS | 全フェーズ完了 | #201 |
| #102  | FAILED（Blocked）| prepare-flow で失敗 | — |
| #103  | SUCCESS | 全フェーズ完了 | #202 |
```

### 結果ステータスの定義

| 結果 | 意味 |
|------|------|
| SUCCESS | 全フェーズ完了・PR 作成（またはマージ）まで到達 |
| FAILED（Blocked） | In progress 到達後に失敗。`block --reason "autopilot: {失敗原因}"` で Blocked に遷移 |
| SKIPPED | In progress 未到達で失敗（ステータス変更なし）、または既に Done |
| 処理中 | 現在処理中の Issue |
| 待機中 | キューに登録済みで未処理 |

### 連続失敗で自動停止した場合の追記

連続失敗が閾値（デフォルト 3 件）に達して自動停止した場合、バッチサマリー Issue に以下を追記する。

```markdown
## 自動停止（連続失敗 {N} 件）

**停止理由:** 連続 {N} 件の失敗により自動停止しました（系統的問題の可能性）。

**未処理 Issue:** #104, #105

**推奨アクション:**
- 失敗原因を確認後、`/autonomous-flow #104 #105` で残りを再実行
- または FAILED Issue を個別に対応
```

## 監査記録のタイミング

| タイミング | 記録先 |
|-----------|--------|
| バッチ開始時 | バッチサマリー Issue 作成（全対象を「待機中」で初期化） |
| 各 Issue 処理開始時 | バッチサマリー Issue の当該行を「処理中」に更新 |
| 各 Issue 処理完了時 | 当該 Issue へ自動承認コメント投稿 + バッチサマリー Issue の当該行を結果に更新 |
| バッチ完了時 | バッチサマリー Issue の「完了」タイムスタンプを更新 |
| 自動停止時 | バッチサマリー Issue に「自動停止」セクションを追記 |

## 注意事項

- タイムスタンプは ISO8601 形式（UTC）で記録する
- 実行者（`@{user}`）はバッチ起動者を記録し、包括委任の主体を明示する
- トリアージは submit + approve の 2 ステップを必ず分けて記録する（H-1 対応）
- 監査記録は `output-language` ルールに従い日本語（EN 版は英語）で記述する

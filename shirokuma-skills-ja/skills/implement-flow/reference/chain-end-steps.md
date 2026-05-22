# チェーン末尾ステップ リファレンス

`implement-flow` チェーン完了直前に実行される末尾ステップの詳細。

## 作業サマリー（Issue コメント）

PR 作成後、技術的な作業サマリーを Issue コメントとして投稿する。これは将来の会話で Issue のコンテキストとして参照されるプライマリ記録。

作業サマリーは**技術的な作業詳細**に焦点を当てる — 変更内容、変更ファイル、技術的判断。

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-work-summary.md
```

`/tmp/shirokuma-flow/{number}-work-summary.md` の内容:

```markdown
## 作業サマリー

### 変更内容
{実装または修正した内容 — 技術的な詳細}

### 変更ファイル
- `path/file.ts` - {変更内容}

### プルリクエスト
PR #{pr-number}

### 技術的判断
- {判断と根拠}
```

Issue 番号が関連付けられていない作業の場合、このステップをスキップ。

**スタンドアロン完了**: `implement-flow` がチェーンを完了した場合（スタンドアロンでもセッション内でも）、作業サマリーは自動投稿される。

## Status（チェーン末尾）

> **新モデル（ADR-v3-022 第四改訂）**: 実装単位（計画 Issue、または XS/S 直接実装時は課題 Issue）は implement 中 `In progress` のまま。**コードレビュー待ちは PR が Review を担う**（`open-pr-issue` の `pr create` が PR を `In progress → Review` に遷移）。1 エンティティ 1 Review 原則により、実装単位 Issue を Review に遷移させない（旧モデルの `submit {number}` / `status transition {number} --to Review` は行わない。新モデルでは `ISSUE_FORWARD` に `In progress → Review` がなく失敗する）。

作業サマリーの Issue コメント投稿（前節）のみ行い、実装単位 Issue の Status はチェーン末尾で変更しない。

## 計画 Issue の Done（PR マージで到達）

> 計画 Issue は実装単位。implement では `begin`（`ToDo → In progress`）して PR を作る。**計画 Issue が Done になるのは PR マージ時**（review-flow / `pr merge` で PR `Review → Done`、`Closes #N` で計画 Issue が close、`syncParentStatus` が親を子から導出）。implement-flow チェーン末尾では計画 Issue は `In progress` のまま（PR レビュー待ち）で、ここで Done への更新は行わない。

XS/S 直接実装パス（計画 Issue なし）でも同様に、課題 Issue は `In progress` のまま PR マージで Done に到達する。

## 次のステップ提案（チェーン末尾）

Status 更新後、ユーザーに次のアクション候補を提示する。`open-pr-issue` の出力から PR 番号を取得して具体的に案内する。PR 番号が取得できない場合（PR 未作成等）は `/review-flow` の行を省略する。

```
## 次のステップ

- `/review-flow #{pr-number}` — PR のセルフレビューを実行
```

## 変更なしパス（`coding-worker` が `changes_made: false` で完了した場合）

`coding-worker` が `changes_made: false` を返した場合、通常チェーン（commit → PR → finalize-changes）をスキップし、以下の手順を実行する。

### 変更なし用作業サマリー

PR がないため、`### プルリクエスト` セクションを省略した専用テンプレートを使用する。「既に実装済み」「仕様上正しい」「再現せず」等の調査結果として記録する。

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-no-changes-summary.md
```

`/tmp/shirokuma-flow/{number}-no-changes-summary.md` の内容:

```markdown
## 作業サマリー（変更なし）

### 調査結果
{coding-worker が確認した内容 — なぜ変更不要と判断したか}

### 判定
{例: 既に実装済み、仕様上正しい、再現しない、等}

### 確認したファイル
- `path/file.ts` - {確認内容}

### 技術的判断
- {判断と根拠}
```

### 変更なし時のステータス判定

「変更なし」でチェーンが終了した場合、コード変更も PR もないため `In progress` から通常の `Review` / `Done` 遷移には進めない（`status-workflow.ts` の `STATUS_TRANSITIONS` 参照）。正規ルートは以下のいずれか:

| 選択肢 | 遷移手段 | 用途 |
|--------|---------|------|
| Cancel（Done + not_planned） | `shirokuma-flow issue cancel {n} --comment "{理由}"` | 「変更不要」として Issue を close（推奨） |
| Blocked | `shirokuma-flow block {n} --reason "{理由}"` | 再検討・追加情報待ち（reason は Issue コメントとして記録） |
| ToDo | `shirokuma-flow status transition {n} --to ToDo` | 後で再評価する |

> **重要**: 取り下げは **`issue cancel`** 専用コマンドで実行する。`Cancelled` Status は廃止され、現在は `state_reason: not_planned` の Close + Status: Done として記録される（`status-workflow.ts` の `isCancelledEquivalent` 参照）。

実装:

```text
reason = extract_first_line(body)  # coding-worker 本文 1 行目サマリー
user_choice = AskUserQuestion(
    "変更なしで完了しました。理由: {reason}。ステータスをどうしますか？",
    options=[
      "Cancel（取り下げ・推奨。Done + state_reason: not_planned で記録）",
      "Blocked（再検討・追加情報待ち）",
      "ToDo（後で再評価）"
    ]
)

if user_choice == "Cancel":
    run: shirokuma-flow issue cancel {number} --comment "{reason}"
elif user_choice == "Blocked":
    run: shirokuma-flow block {number} --reason "{reason}"
else:
    run: shirokuma-flow status transition {number} --to ToDo
```

ヘッドレスモード（`--headless`）では AskUserQuestion をスキップし、デフォルト動作として `issue cancel {number} --comment "{reason}"` を実行する（取り下げ後は `issue reopen` + `status transition --to ToDo` で復旧可能）。

### 変更なし時の次のステップ提案

PR がないため `/review-flow` 行を省略し、以下のみを提示する:

```
## 次のステップ

変更が不要と判断されました。必要に応じて:
- `/implement-flow #{number}` — 再実行（判定が誤っていた場合）
```

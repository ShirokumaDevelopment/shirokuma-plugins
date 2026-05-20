---
name: approve-flow
description: Review 状態の Issue を明示的に承認する。Review → Done に遷移する。計画 Issue (issue itemType) の場合は syncParentStatus が親 Issue を Backlog → ToDo に自動同期する。トリガー: 「承認」「approve」「計画承認」「承認して」。
allowed-tools: Bash, Read, Edit
---

# Issue 承認

Review 状態の Issue を明示的に承認する。Review → Done に遷移する。

| Issue 種別 | 遷移先 | 説明 |
|-----------|--------|------|
| 計画 Issue (plan/design) | **Done** | 計画完了。`syncParentStatus` が親 Issue を Backlog → ToDo に自動同期 |
| その他 Issue Type | **Done** | 承認完了（Review 以外では失敗） |

**承認モデル**: `approve` は Review → Done に遷移する。旧 `Review → ToDo` パスは廃止。計画 Issue (子) の `approve` 後、`syncParentStatus` が自動的に親 Issue を Backlog → ToDo（着手準備完了）に同期する。`/implement-flow` 起動時に課題 Issue が ToDo であれば begin で In progress に遷移できる。

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| Issue 番号 | `#42` | 指定 Issue を承認 |
| 引数なし | — | AskUserQuestion で確認 |

## ワークフロー

1. **承認実行**: `shirokuma-flow approve {number}` を実行（top-level alias。内部で `status approve` と同等）。CLI は内部でステータスを検証し、Review 以外なら `result: "error"` で終了する
2. **結果分岐**: JSON 出力の `result` を確認
   - `"ok"` → 完了レポート + `next_suggestions` をユーザーに提示
   - `"error"` → `message` フィールドをそのまま表示して終了
3. **完了レポート**（`result: "ok"` の場合）:

```
## 承認完了

**Issue:** #{number} {title}
**遷移:** Review → Done（計画完了）
**親 Issue 同期:** #{parent-number} Backlog → ToDo（計画 Issue の場合）
**次のアクション:** /implement-flow #{parent-number}（実装着手）
```

## エッジケース

| 状況 | アクション |
|------|----------|
| Review 以外 / 既に Done / Issue が見つからない | CLI の `result: "error"` として `message` を表示して終了 |
| 計画 Issue かつ親が Backlog | 親を Backlog → ToDo に自動同期（syncParentStatus） |
| 計画 Issue かつ親が Backlog 以外 | syncParentStatus で親ステータスを子集計から自動導出 |

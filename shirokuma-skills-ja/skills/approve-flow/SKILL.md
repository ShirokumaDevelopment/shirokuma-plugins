---
name: approve-flow
description: Review 状態の Issue を明示的に承認する。issue_kind で分岐し、計画/設計 Issue (子) は Review → Done（syncParentStatus が親を Backlog → ToDo に同期）、課題 Issue (トリアージ) は Review → ToDo に遷移する。トリガー: 「承認」「approve」「計画承認」「承認して」。
allowed-tools: Bash, Read, Edit
---

# Issue 承認

Review 状態の Issue を明示的に承認する。遷移先は `issue_kind` で分岐する。

| Issue 種別 | 遷移先 | 説明 |
|-----------|--------|------|
| 計画 Issue / 設計 Issue（子） | **Done** | 計画/設計完了。`syncParentStatus` が親を Backlog → ToDo に同期 |
| 課題 Issue（トリアージ） | **ToDo** | トリアージ承認。`Review → ToDo`。次フローが `begin` で着手 |

**承認モデル**: `approve` は `issue_kind` で分岐する。計画/設計 Issue（子）は Review → Done に遷移し、`syncParentStatus` が自動的に親 Issue を Backlog → ToDo（着手準備完了）に同期する。課題 Issue（normal 分岐 = トリアージ承認）は Review → ToDo に遷移する（親同期なし）。`/implement-flow` 起動時に課題 Issue が ToDo であれば `begin` で In progress に遷移できる。

> **`Review → ToDo` の再導入**: 課題 Issue のトリアージ承認用に `Review → ToDo` パスを再導入した。これは ADR-v3-018 で廃止された「**計画承認**の Review → ToDo」とは**別概念**であり、こちらは**課題 Issue のトリアージ承認**（未トリアージ Backlog → トリアージ承認待ち Review → 承認済 ToDo）である。計画/設計 Issue の承認は引き続き Review → Done。

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
3. **完了レポート**（`result: "ok"` の場合）: `issue_kind`（JSON 出力の `to` フィールドでも判別可能。`to: "Done"` = 計画/設計、`to: "ToDo"` = 課題トリアージ）で出し分ける。

**計画 Issue / 設計 Issue（子）の場合**（`to: "Done"`）:

```
## 承認完了

**Issue:** #{number} {title}
**遷移:** Review → Done（計画/設計完了）
**親 Issue 同期:** #{parent-number} Backlog → ToDo
**次のアクション:** /implement-flow #{parent-number}（実装着手）
```

**課題 Issue（トリアージ）の場合**（`to: "ToDo"`）:

```
## 承認完了

**Issue:** #{number} {title}
**遷移:** Review → ToDo（トリアージ承認）
**次のアクション:** /implement-flow #{number}（`begin` で着手）
```

## エッジケース

| 状況 | アクション |
|------|----------|
| Review 以外 / 既に Done / Issue が見つからない | CLI の `result: "error"` として `message` を表示して終了 |
| 計画/設計 Issue（子）かつ親が Backlog | Review → Done。親を Backlog → ToDo に自動同期（syncParentStatus） |
| 計画/設計 Issue（子）かつ親が Backlog 以外 | Review → Done。syncParentStatus で親ステータスを子集計から自動導出 |
| 課題 Issue（トリアージ） | Review → ToDo。親同期なし。次フローが `begin` で着手 |

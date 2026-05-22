---
name: approve-flow
description: Review 状態の Issue を明示的に承認する。全種別で Review → ToDo に遷移し、issue_kind で副作用が分岐する。計画 Issue (子) は承認継承（同じ親配下の実装サブ Issue を Backlog → ToDo）+ 親を子から導出、設計 Issue (子) は親を子から導出、課題 Issue (トリアージ) は副作用なし。トリガー: 「承認」「approve」「計画承認」「承認して」。
allowed-tools: Bash, Read, Edit
---

# Issue 承認

Review 状態の Issue を明示的に承認する。**遷移先は全種別で `Review → ToDo`** に統一されており、`issue_kind` で**副作用**が分岐する。

| Issue 種別 | 遷移 | 副作用 |
|-----------|------|--------|
| 計画 Issue（子） | **Review → ToDo** | 承認継承（同じ親配下の実装サブ Issue を Backlog → ToDo）+ 親を子から導出（`syncParentStatus`） |
| 設計 Issue（子） | **Review → ToDo** | 親を子から導出（`syncParentStatus`）。設計 Issue は中間箱であり Done にしない |
| 課題 Issue（トリアージ） | **Review → ToDo** | 副作用なし。次フローが `begin` で着手 |

**承認モデル**: `approve` は全種別で `Review → ToDo` に遷移し、計画フェーズで Issue を Done にしない（Done は実装フェーズで到達する）。`issue_kind` で副作用が分岐する。

- **計画 Issue（子）**: `Review → ToDo`。**承認継承の下方カスケード**として、同じ親（課題 Issue）配下の「計画/設計以外の子」= 実装サブ Issue で **Backlog のものを `Backlog → ToDo`** に一括遷移させる（計画承認＝実装着手準備完了の継承）。加えて親 Issue を `syncParentStatus` が子の集計から導出・同期する。
- **設計 Issue（子）**: `Review → ToDo`。設計 Issue は中間箱（Done にせず子から導出）であり、親 Issue を `syncParentStatus` が子から導出・同期する。兄弟カスケードは行わない（計画 approve のみ）。
- **課題 Issue（normal 分岐 = トリアージ承認）**: `Review → ToDo`。親同期・カスケードなし。`/implement-flow` 起動時に課題 Issue が ToDo であれば `begin` で In progress に遷移できる。

> **親 Issue は子から導出**: 計画/設計子の approve では親 Issue を直書きせず、`syncParentStatus` が子の集計から導出する（子→親の上方向のみ）。承認継承の下方カスケード（兄弟→兄弟）とは方向が逆で、循環には入らない。

> **`Review → Done` は PR のマージのみ**: Issue の approve では `Review → Done` は発生しない。`Review → Done` は PR のマージ承認（`pr merge`）専用である。

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
3. **完了レポート**（`result: "ok"` の場合）: `issue_kind` で出し分ける（全種別で `to: "ToDo"` のため `issue_kind` フィールドで判別する）。

**計画 Issue（子）の場合**（`issue_kind: "plan"`）:

```
## 承認完了

**Issue:** #{number} {title}
**遷移:** Review → ToDo（計画承認）
**承認継承:** 実装サブ Issue #{...} を Backlog → ToDo に同期（pending_subissues / ログ参照）
**親 Issue 同期:** #{parent-number} を子から導出（syncParentStatus）
**次のアクション:** /implement-flow #{parent-number}（実装着手）
```

**設計 Issue（子）の場合**（`issue_kind: "design"`）:

```
## 承認完了

**Issue:** #{number} {title}
**遷移:** Review → ToDo（設計承認）
**親 Issue 同期:** #{parent-number} を子から導出（syncParentStatus）
**次のアクション:** /prepare-flow #{parent-number} または /implement-flow #{parent-number}
```

**課題 Issue（トリアージ）の場合**（`issue_kind: "normal"`）:

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
| 計画 Issue（子） | Review → ToDo。承認継承で Backlog の実装サブ Issue を Backlog → ToDo。親は syncParentStatus で子集計から導出 |
| 設計 Issue（子） | Review → ToDo。親は syncParentStatus で子集計から導出（兄弟カスケードなし） |
| 課題 Issue（トリアージ） | Review → ToDo。親同期・カスケードなし。次フローが `begin` で着手 |

---
name: starting-session
description: 会話開始時にデフォルトルールを読み込む初期化スキル。トリガー: 「セッション開始」「作業開始」「start session」「begin work」「会話初期化」「init session」。
allowed-tools: Bash
---

!`shirokuma-flow rules inject --scope main`

# 会話初期化

新しい会話を開始した際にプロジェクトのデフォルトルールを読み込む。

`#N` 引数が指定された場合は `implement-flow #N` にルーティングする。それ以外は何も表示しない。

## Issue バウンドモード

`/starting-session #N` で起動された場合のみ:

```
Skill: implement-flow
Args: #{N}
```

## 注意事項

- プロジェクト状態（オープン Issue / PR / バッチ候補 / Evolution シグナル）を確認したい場合は `/show-dashboard`（`showing-github` スキル）を明示的に呼ぶ。
- PreCompact バックアップ復元が必要な場合は `shirokuma-flow dashboard` 出力の `backups` フィールドを参照。
- 本スキルは GitHub への問い合わせを行わない — 最小限に保つ。

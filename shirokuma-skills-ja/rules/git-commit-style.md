---
scope: default
category: general
priority: required
---

# Git コミットスタイル

## コミットメッセージ形式

```
{type}: {description} (#{issue-number})

{optional body}
```

## Conventional Commit タイプ

| タイプ | 使用タイミング |
|--------|-------------|
| `feat` | 新機能・機能拡張 |
| `fix` | バグ修正 |
| `refactor` | コード構造改善（動作変更なし） |
| `docs` | ドキュメントのみの変更 |
| `test` | テストの追加・更新 |
| `chore` | 設定・ツール・依存関係 |

## ルール

1. **1行目は72文字以内** — `lint workflow` の `commit-format` が info で検出する（過去違反例: #2620 PR #2635 で 8 件）。長くなりそうな変更は件名を要約に絞り、Issue 番号・サブ Issue・統合範囲などの詳細は body へ送る
2. **Issue 番号を参照** する（該当する場合）: `(#39)`
3. **命令形** で記述: "add feature"（"added feature" ではない）
4. **本文は任意** — 説明が必要な複雑な変更に使用
5. **件名と本文の間に空行** を入れる

### 72 文字を超えそうな時の書き換え方

| Bad（超過） | Good（72字以内） |
|------------|----------------|
| `feat(skill): writing-html-explainer に html-effectiveness 残り 5 系統部品を追加（decision-card / triage-board / artboard / flag / card-titles）+ ?v=12 一括 (#2620)` (149字) | `feat(skill): writing-html-explainer に html-effectiveness 5 系統追加 (#2620)` (66字) + body に詳細 |
| `chore(pages): submodule ポインタを更新（§5.3 を .milestone-timeline に書き換え） (#2620)` (73字) | `chore(pages): submodule 更新 (§5.3 を .milestone-timeline 化) (#2620)` (60字) |

### コミット前のセルフチェック

```bash
# 件名長を確認（subject の文字数）
git log -1 --format=%s | wc -m
```

72 文字以内（73 を超えない）であることを確認してから push する。

## 例

```
feat: ブランチワークフロールール追加 (#39)

fix: クロスリポ対応のためリポ名を getProjectId に渡す (#34)

refactor: マーケットプレイスとプラグインのディレクトリ構造を分離 (#27)

chore: 依存関係を更新
```

## コード言語

| 要素 | 言語 |
|------|------|
| コード / 変数名 | English |
| コメント / JSDoc | 日本語 |
| コミットメッセージ | 日本語（プレフィックスは English: `feat:`, `fix:` 等） |
| CLI 出力 | i18n 辞書 (`i18n/cli/`) |

## 注意事項

- `Signed-off-by` 行はプロジェクトで明示的に要求された場合のみ含める
- `--no-verify` は避け、フック失敗は根本原因を修正する（フックバイパスは CI 品質チェックをスキップするため）
- amend はユーザーの明示的な依頼がある場合のみ行う（意図しない履歴書き換えを防ぐため）
- force push はベースブランチ以外の専用用途でのみ行う（ベースブランチへの force push はチームの作業を破壊する）

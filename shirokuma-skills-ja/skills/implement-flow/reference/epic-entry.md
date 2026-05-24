# エピック Issue エントリーポイント詳細

エピック Issue が直接指定された場合（計画 Issue 以外の子 Issue が存在する、または計画 Issue の本文に `### サブ Issue 構成` セクションがある場合）、通常の実装ディスパッチではなく以下のフローを実行する。

## 前提条件: サブ Issue 構成を含む計画 Issue

エピックに計画 Issue（子 Issue のうちタイトルが「計画:」または「Plan:」で始まるもの）があり、その本文に `### サブ Issue 構成` セクションが必要。計画 Issue がなければ `prepare-flow` に先に委任（通常フロー）。

## エピックワークフロー

1. **Integration ブランチの作成**: 計画の `### Integration ブランチ` からブランチ名を抽出し、`develop` から作成:
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b epic/{number}-{slug}
   git push -u origin epic/{number}-{slug}
   ```

   | 条件 | ステップ 2 |
   |------|-----------|
   | 計画 Issue 以外の子 Issue が存在しない | サブ Issue を作成 |
   | 計画 Issue 以外の子 Issue が既に存在する | スキップ（`prepare-flow` で作成済み） |

2. **サブ Issue の一括作成**（計画 Issue 以外の子 Issue が存在しない場合のみ）: `prepare-flow` で既にサブ Issue が作成済みの場合はこのステップをスキップする。計画 Issue の `### サブ Issue 構成` テーブルを解析し、各行についてサブ Issue を CLI で作成:
   ```bash
   shirokuma-flow issue add /tmp/shirokuma-flow/{slug}.md
   ```
   本文ファイルの frontmatter に `title`、`status: "Backlog"` を設定し、本文には親計画への参照（`#{epic-number} の計画を参照`）を記述する。
   作成後、`shirokuma-flow issue parent {sub-number} {epic-number}` でサブ Issue の親を設定する。
   作成後、計画 Issue の `### サブ Issue 構成` テーブルのプレースホルダー（`#{sub1}` 等）を実際の Issue 番号で更新し、`issue update {plan-issue-number} /tmp/shirokuma-flow/{plan-issue-number}-body.md` で計画 Issue 本文を同期する。

3. **実行順序の案内**: `### 実行順序` セクションまたは依存列に基づき、推奨順序を表示して終了する。即時作業開始は提案しない — `best-practices-first` ルールのエピックパターンに従い、各サブ Issue は別の会話で作業する:
   ```
   エピックセットアップ完了。

   **Integration ブランチ:** `epic/{number}-{slug}`
   **作成したサブ Issue:** #{sub1}, #{sub2}, #{sub3}

   推奨実行順序:
   1. #{sub1} - {タイトル}（依存なし）
   2. #{sub2} - {タイトル}（#{sub1} に依存）
   3. #{sub3} - {タイトル}（#{sub2} に依存）

   各サブ Issue は新しい会話で `/implement-flow #{sub}` で開始してください。
   ```

## 責務に関する注記

このフローでのサブ Issue 作成は `shirokuma-flow issue add` を直接使用する（`issue-flow` ではない）。計画でサブ Issue の詳細が確定済みのため、`issue-flow` の推論ロジックは不要。

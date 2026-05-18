---
name: plan-issue
description: "Issue計画スキル。prepare-flowからSkillツール経由で委任され、コードベース調査、計画作成、計画Issue作成を実行する。直接起動は想定しない。"
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch
---

!`shirokuma-flow rules inject --scope plan-worker`

# Issue の計画

Issue の要件を分析し、実装計画を策定して計画 Issue（子 Issue）として永続化する。このスキルは実作業を担当する — オーケストレーション（ステータス管理、レビュー委任、ユーザーとのやりとり）は `prepare-flow` が担当する。

## 計画レベル

Issue の内容に応じて計画の深さを調整する。サイズではなく、**内容の複雑度・不確実性**で判定。

| レベル | 内容 | 例 |
|--------|------|-----|
| 軽量 | アプローチ1-2行 + 確認 | タイポ修正、設定変更、単純なバグ修正 |
| 標準 | アプローチ + 変更ファイル + タスク分解 | 新機能、リファクタリング、中程度の修正 |
| 詳細 | 複数案比較 + リスク分析 + テスト戦略 | アーキテクチャ変更、破壊的変更、複数システム連携 |

### 深さの判定基準

AI が Issue の title/body/type/comments から以下を判断:

| 基準 | 軽量 | 標準 | 詳細 |
|------|------|------|------|
| 変更ファイル数（推定） | 1-2 | 3-5 | 6+ |
| 設計判断の有無 | なし | あり | 複数案あり |
| 既存動作への影響 | なし | 限定的 | 広範囲 |
| テスト影響 | 既存で十分 | 追加必要 | 戦略検討必要 |

1つでも上位レベルの基準に該当すれば、そのレベルを採用する。

## ワークフロー

### ステップ 1: Issue 取得

```bash
shirokuma-flow issue context {number}
# → .shirokuma/github/{org}/{repo}/issues/{number}/body.md を Read ツールで読み込む
```

title, body, type, priority, size, labels, コメントを確認。

### ステップ 2: コードベース調査

Issue の要件に関連するコードを調査する。

1. **既存実装の確認**: Grep/Glob で関連ファイルを特定
2. **依存関係の把握**: 変更が影響するモジュール・テストを確認
3. **パターンの確認**: 類似の実装がコードベースにあるか確認
4. **スキル挙動変更時の波及確認**: スキルの挙動変更（廃止・責務変更・動作変更）が含まれる場合、そのスキル名で以下のファイルカテゴリを grep し、旧挙動の前提に基づく記述が残っていないか確認する
   - `i18n/cli/{ja,en}.json` のスキル説明文
   - `plugin/*/rules/` 内のスキル責務記述
   - `plugin/*/skills/*/reference/` 内の他スキル動作の前提記述
   - `plugin/specs/skills/*/evals/` の評価シナリオ

### ステップ 3: 計画策定

Issue の内容と調査結果から計画レベルを判定し、レベルに応じた計画を作成する。

計画レベル別テンプレート（軽量/標準/詳細/エピック）は [reference/plan-templates.md](reference/plan-templates.md) を参照。

#### エピック Issue のサブ Issue 本文テンプレート

エピック Issue を計画する場合、`### サブ Issue 構成` テーブルに基づき各サブ Issue の本文を作成する。サブ Issue 本文には必ず親計画への参照を含める:

```markdown
#{epic-number} の計画を参照。
```

これにより `implement-flow` がサブ Issue を処理する際に親のコンテキストを参照でき、作業の整合性を保てる。

**注意**: エピック Issue の計画 Issue（`計画: {タイトル}` という名前の子 Issue）はサブ Issue 構成のカウントから除外する。エピックの実作業サブ Issue のみ `### サブ Issue 構成` テーブルに含める。

### ステップ 4: 計画 Issue を作成

ステップ 3 で策定した計画を本文とする計画 Issue を `issue add` で作成する。

計画 Issue の本文ファイルを作成する:

```bash
cat > /tmp/shirokuma-flow/{number}-plan-issue.md <<'EOF'
---
title: "計画: {親 Issue のタイトル}"
status: "In progress"
labels: ["area:plan"]
---

## 計画

{計画の全内容（ステップ 3 のレベル別テンプレートに基づく）}

## 親 Issue

#{parent-number} の課題を参照。
EOF
shirokuma-flow issue add /tmp/shirokuma-flow/{number}-plan-issue.md
```

計画 Issue 作成後、返却された Issue 番号を `PLAN_ISSUE_NUMBER` として記録する。

計画作成完了のため、`submit` で In progress → Review に遷移する（計画 Issue は作成直後から In progress）:

```bash
shirokuma-flow submit {PLAN_ISSUE_NUMBER}
```

> 計画 Issue の本文の言語・スタイルは `output-language` ルールと `github-writing-style` ルールに準拠すること。

### ステップ 4a: 思考プロセスコメントを計画 Issue に投稿

調査結果から得た判断根拠・代替案・制約を**計画 Issue へのコメント**として投稿する（親 Issue ではなく計画 Issue へ）。

```bash
cat > /tmp/shirokuma-flow/{number}-reasoning.md <<'EOF'
## 計画の判断根拠

### 選定アプローチ
{選定したアプローチとその理由}

### 検討した代替案
{検討して却下した案とその理由。なければ「代替案なし（明確な単一アプローチ）」}

### 調査で判明した制約
{コードベース調査で発見した技術的制約や依存関係。なければ「制約なし」}
EOF
shirokuma-flow issue comment {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{number}-reasoning.md
```

> コメントの言語・スタイルは `output-language` ルールと `github-writing-style` ルールに準拠すること。

### ステップ 4b: 親子関係を設定

`issue parent` コマンドで計画 Issue を親 Issue の子 Issue として登録する。

```bash
shirokuma-flow issue parent {PLAN_ISSUE_NUMBER} {parent-number}
```

### ステップ 4c: エピック計画のサブ Issue 作成とプレースホルダー置換（条件付き）

計画 Issue の本文に `### サブ Issue 構成` テーブルが含まれる場合のみ実行する。`### サブ Issue 構成` テーブルがない計画 Issue（軽量・標準・詳細計画）ではこのステップをスキップする。

> **委任元との役割分担**: `plan-issue` はサブ Issue の **作成** と **プレースホルダー置換** を担当する。オーケストレーター（`prepare-flow`）はステップ 4a でこのステップの実行をトリガーする。

#### サブ Issue 作成手順

1. 計画 Issue 本文から `### サブ Issue 構成` テーブルを解析し、各行についてサブ Issue を作成する:

   ```bash
   # 各サブ Issue の本文ファイルを作成（n はテーブル行番号）
   cat > /tmp/shirokuma-flow/{parent-number}-sub-{n}.md <<'EOF'
   ---
   title: "{サブ Issue タイトル}"
   status: "In progress"
   ---

   #{parent-number} の計画を参照。
   EOF

   # サブ Issue を作成（返却された番号を sub_N_NUMBER として記録）
   shirokuma-flow issue add /tmp/shirokuma-flow/{parent-number}-sub-{n}.md
   ```

2. 各サブ Issue の親子関係を設定する:

   ```bash
   shirokuma-flow issue parent {sub-N-number} {parent-number}
   ```

#### プレースホルダー置換手順

全サブ Issue の作成後、計画 Issue 本文に含まれるプレースホルダー（`{sub1}`〜`{subN}` または `#{sub1}`〜`#{subN}`）を実際の Issue 番号に置換し、`issue update` で同期する。

```bash
# 計画 Issue の現在の本文を取得
shirokuma-flow issue context {PLAN_ISSUE_NUMBER}
# → .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md を Read で読み込む

# 本文をローカルファイルにコピーしてプレースホルダーを置換
cp .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md \
   /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md

# python3 でプレースホルダーを実 Issue 番号に置換
# （{sub1} → #{sub1-number}、#{sub1} → #{sub1-number} の両形式に対応）
python3 - <<'PYEOF'
import re

with open("/tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md", "r") as f:
    body = f.read()

# プレースホルダーと実 Issue 番号のマッピング
replacements = {
    "#{sub1}": "#{sub1-number}",
    "{sub1}": "#{sub1-number}",
    "#{sub2}": "#{sub2-number}",
    "{sub2}": "#{sub2-number}",
    # 必要に応じて追加
}
for placeholder, actual in replacements.items():
    body = body.replace(placeholder, actual)

with open("/tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md", "w") as f:
    f.write(body)
PYEOF

# 置換後の本文で計画 Issue を更新
shirokuma-flow issue update {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md

# リモート GitHub との本文差分を解消
shirokuma-flow issue push {PLAN_ISSUE_NUMBER}
```

> **置換対象の形式**: `{subN}` と `#{subN}` の両形式を置換する。置換後はすべて `#{実番号}` 形式とする。テーブルに記載された順序（sub1, sub2, ...）と作成した Issue 番号の対応を正確に管理すること。

## 制約

- Skill ツール（メインコンテキスト）で実行されるが、進捗管理とユーザーとのやりとりはオーケストレーター（`prepare-flow`）が担当
- 計画レビューは `prepare-flow` が担当 — このスキルは計画の作成のみ
- **ステータスは更新しない** — 親 Issue のステータス遷移（In Progress, Review）は `prepare-flow` が管理
- 計画 Issue は `In progress` で作成し、作成後に `submit` で `In progress → Review` に遷移する。ラベルは `area:plan`

## GitHub 書き込みルール

Issue のコメント・本文への書き込みは `output-language` ルールと `github-writing-style` ルールに準拠すること。

**NG例（日本語設定なのに英語）:**

```
### Approach
Add GitHub writing rule references to each skill...  ← 日本語設定では不正
```

**OK例:**

```
### アプローチ
各スキルに GitHub 書き込みルールの参照を追加し...
```

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| Issue 番号 | `#42` | Issue を取得して計画を作成 |

## エッジケース

| 状況 | アクション |
|------|----------|
| Issue の body が空 | 計画セクションのみで本文を作成 |
| エピック Issue（サブ Issue あり） | エピック計画テンプレートを使用し、integration ブランチ名を計画に含める |
| `### サブ Issue 構成` テーブルなし | ステップ 4c をスキップ（軽量・標準・詳細計画） |
| サブ Issue 作成済み（再計画時） | ステップ 4c をスキップ（`prepare-flow` ステップ 4a の条件チェックにより既に除外される） |

## ルール参照

| ルール | 用途 |
|--------|------|
| `project-items` | Review ステータスの運用 |
| `branch-workflow` | ブランチ命名の参照（計画に記載するため） |
| `output-language` | Issue コメント・本文の出力言語 |
| `github-writing-style` | 箇条書き vs 散文のガイドライン |

## 注意事項

- **実装には進まない** — 計画のみ。実装は `implement-flow` の責務
- 計画は計画 Issue（子 Issue）として永続化される — セッションをまたいでも参照可能
- このスキルは `prepare-flow` から Skill ツール経由で起動される — オーケストレーションは `prepare-flow` が担当

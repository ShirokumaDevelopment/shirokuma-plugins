# 出力スタイルリファレンス

Claude Code 出力スタイルの完全な技術仕様。

## 目次

- [Frontmatter 仕様](#frontmatter-仕様)
- [設定ファイル形式](#設定ファイル形式)
- [ファイル配置](#ファイル配置)
- [ビルトインスタイル](#ビルトインスタイル)
- [カスタムスタイル要件](#カスタムスタイル要件)
- [優先度とオーバーライドルール](#優先度とオーバーライドルール)

## Frontmatter 仕様

カスタム出力スタイルファイルには、以下のフィールドを含む YAML frontmatter が必要:

### 必須フィールド

```yaml
---
name: style-name          # 必須: 一意の識別子（kebab-case）
description: Brief text   # 必須: スタイルの機能（1-2文）
---
```

### フィールド詳細

#### name

- Type: `string`
- Pattern: `^[a-z0-9-]+$`（小文字、数字、ハイフンのみ）
- 最大長: 64文字
- スコープ内で一意であること（ユーザーレベルまたはプロジェクトレベル）
- `/output-style [name]` コマンドで使用
- 予約名は使用不可: `default`, `explanatory`, `learning`

例:
- `security-focused` -- 有効
- `refactoring-mode` -- 有効
- `SecurityFocused` -- 無効（大文字）
- `security_focused` -- 無効（アンダースコア）

#### description

- Type: `string`
- 最大長: 1024文字
- スタイルの動作を明確に記述
- インタラクティブメニューとヘルプテキストに表示される

## 設定ファイル形式

出力スタイル設定は `.claude/settings.local.json` に保存:

```json
{
  "outputStyle": "style-name"
}
```

### ファイル詳細

- 場所: `.claude/settings.local.json`（プロジェクトルート）
- 形式: JSON
- `/output-style` コマンド使用時に自動作成
- `.gitignore` に追加すべき（ローカル設定、共有しない）

### 例

```json
{
  "outputStyle": "explanatory",
  "otherSettings": {
    "...": "..."
  }
}
```

`outputStyle` フィールドが存在しない、またはファイルが存在しない場合、"default" スタイルが有効。

## ファイル配置

### ユーザーレベルスタイル

場所: `~/.claude/output-styles/*.md`（例: my-style.md, security-focused.md）

- すべてのプロジェクトで利用可能
- ホームディレクトリ同期でマシン間移動可能
- プロジェクトレベルより低優先度

### プロジェクトレベルスタイル

場所: `.claude/output-styles/*.md`（例: team-style.md, api-development.md）

- このプロジェクト内でのみ利用可能
- git リポジトリでチームと共有
- ユーザーレベルより高優先度（同名の場合オーバーライド）

## ビルトインスタイル

Claude Code には 3 つのビルトイン出力スタイルが含まれる:

### default

効率的なタスク完了に最適化された標準エンジニアリングモード。

**特性:**
- 簡潔なコミュニケーション
- 本番重視
- 最小限の説明テキスト
- コード品質とベストプラクティスを強調

**使用場面:**
- 本番機能の構築
- 時間制約下での作業
- コードベースを十分理解している場合

### explanatory

コーディング活動の間に教育的な "Insights" セクションを追加。

**特性:**
- アーキテクチャ決定の説明
- コードベース内のパターンを強調
- 教育的なコメンタリー
- 理解構築の支援

**使用場面:**
- 新しいコードベースの学習
- デザインパターンの理解
- プロジェクトへのオンボーディング
- ベストプラクティスの学習

### learning

`TODO(human)` マーカー付きの協調的ハンズオンアプローチ。

**特性:**
- Claude が部分的なソリューションを実装
- `TODO(human)` を追加して完成すべき箇所を指示
- 何を実装すべきか、その理由を説明
- インタラクティブなスキル構築

**使用場面:**
- 新しい言語やフレームワークの学習
- 特定テクニックの練習
- ハンズオンスキルの構築
- 教育目的のペアプログラミング

## カスタムスタイル要件

### 最小構成

```markdown
---
name: minimal-style
description: A minimal custom output style
---

# Minimal Style

Add your custom instructions here.
```

### 推奨構造

```markdown
---
name: style-name
description: Clear description of behavior changes
---

# Style Title

Brief overview of this style's purpose.

## Core Principles

- Principle 1
- Principle 2
- Principle 3

## Modified Behaviors

### When Writing Code

[Instructions for code generation...]

### When Explaining

[Instructions for explanations...]

### When Testing

[Instructions for testing approach...]

## Additional Guidelines

[Any other customizations...]
```

### コンテンツガイドライン

- 可読性のため Markdown フォーマットを使用
- 振る舞いの変更点を具体的に記述
- 役立つ場合は例を含める
- フォーカスを保つ（1000 行以下推奨）
- Claude Code のコア機能と矛盾する内容は避ける

### カスタマイズ可能な範囲

**カスタマイズ可能:**
- トーンとコミュニケーションスタイル
- 説明の詳細レベル
- コードコメントのアプローチ
- テスト哲学
- ドキュメント重視度
- エラーハンドリングのスタイル
- フォーカスエリア（セキュリティ、パフォーマンス等）

**オーバーライド不可:**
- ツールの可用性（Read, Write, Bash 等）
- コアセーフティガイドライン
- ファイル操作の動作
- Git ワークフロー
- コマンド実行

## 優先度とオーバーライドルール

### スタイル選択の優先度

1. **明示的コマンド**: `/output-style [name]` -- 最高優先度
2. **設定ファイル**: `.claude/settings.local.json` -- 中優先度
3. **デフォルト**: ビルトイン "default" スタイル -- フォールバック

### ファイル配置の優先度

同名のスタイルが複数存在する場合:

1. **プロジェクトレベル**: `.claude/output-styles/style.md` -- 最高優先度
2. **ユーザーレベル**: `~/.claude/output-styles/style.md` -- 低優先度
3. **ビルトイン**: `default`, `explanatory`, `learning` -- オーバーライド不可

例:
```
# 両方が存在する場合:
~/.claude/output-styles/team-style.md
.claude/output-styles/team-style.md

# /output-style team-style は以下を使用:
.claude/output-styles/team-style.md  ← プロジェクトレベルが優先
```

### 有効化の動作

- `/output-style [name]` で即時有効化
- 変更は `.claude/settings.local.json` に永続化
- スタイルファイル編集後は再有効化またはリスタートが必要
- アクティブスタイルのファイル削除で "default" にフォールバック

## コマンドリファレンス

### /output-style

利用可能なスタイルから選択するインタラクティブメニューを開く。

### /output-style [name]

指定したスタイルに直接切り替え。

```bash
/output-style default
/output-style explanatory
/output-style my-custom-style
```

### /output-style:new [description]

新しいカスタムスタイルをインタラクティブに作成。

```bash
/output-style:new Focus on API development with OpenAPI specs
```

動作:
1. `~/.claude/output-styles/` にスタイルファイルを生成
2. AI が説明に基づいて適切なコンテンツを作成
3. 新しいスタイルを自動的に有効化

## よくある YAML エラー

### エラー: 無効な frontmatter

**原因**: YAML の構文エラー

❌ **間違い**:
```yaml
---
name: my style          # name にスペース不可
description: "Missing closing quote
---
```

✅ **正しい**:
```yaml
---
name: my-style          # スペースの代わりにハイフン
description: Proper description here
---
```

### エラー: タブの代わりにスペース

**原因**: YAML はインデントにスペースを要求

❌ **間違い**:
```yaml
---
name:	my-style        # タブ文字
---
```

✅ **正しい**:
```yaml
---
name: my-style          # スペースのみ
---
```

### エラー: 必須フィールドの欠如

**原因**: `name` または `description` フィールドが欠落

❌ **間違い**:
```yaml
---
name: my-style
# description が欠落
---
```

✅ **正しい**:
```yaml
---
name: my-style
description: Complete frontmatter
---
```

## 高度なテクニック

### 条件付き指示

複雑な指示を整理するために markdown を使用:

```markdown
---
name: context-aware
description: Adapts based on file type
---

# Context-Aware Style

## When Working with TypeScript

- Emphasize type safety
- Suggest interface definitions
- Use strict mode

## When Working with Python

- Follow PEP 8
- Use type hints
- Prefer dataclasses

## When Working with Bash

- Add error handling (set -euo pipefail)
- Include usage comments
- Validate inputs
```

### CLAUDE.md との併用

出力スタイルと CLAUDE.md は連携して動作:

```
1. システムプロンプト（出力スタイルにより変更される）
2. CLAUDE.md からのユーザーメッセージ
3. ユーザーの実際の質問
```

出力スタイルは Claude の**振る舞い方（how）**に、CLAUDE.md は Claude が**知っていること（what）**に使用する。

### バージョン管理のベストプラクティス

プロジェクトレベルスタイル:

```gitignore
# .gitignore
.claude/settings.local.json    # コミットしない（個人設定）
```

```bash
# プロジェクトスタイルをコミット
git add .claude/output-styles/
git commit -m "Add team output styles"
```

ユーザーレベルスタイルは dotfiles リポジトリでの管理を検討:

```bash
# ~/dotfiles/claude/output-styles/
ln -s ~/dotfiles/claude/output-styles ~/.claude/output-styles
```

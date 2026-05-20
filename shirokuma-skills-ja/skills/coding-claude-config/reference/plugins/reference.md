# プラグインリファレンス

Claude Code プラグイン開発の完全な技術仕様。

## 目次

- [plugin.json スキーマ](#pluginjson-スキーマ)
- [marketplace.json スキーマ](#marketplacejson-スキーマ)
- [プラグイン構造](#プラグイン構造)
- [配布方法](#配布方法)
- [プラグイン管理コマンド](#プラグイン管理コマンド)
- [コンポーネント統合](#コンポーネント統合)
- [高度な機能](#高度な機能)

## plugin.json スキーマ

場所: `.claude-plugin/plugin.json`

### 必須フィールド

#### name (string)

プラグイン識別子。マーケットプレイス内で一意であること。

**ルール**:
- 小文字、数字、ハイフンのみ
- スペースや特殊文字不可
- 最大 64文字
- 予約語不可 ("anthropic", "claude")

**例**: `"my-awesome-plugin"`

#### description (string)

プラグインの目的と機能の簡潔な説明。

**ルール**:
- 最大 200文字推奨
- 明確かつ具体的
- 三人称で記述
- プラグインが提供する内容を記述

**例**: `"Analyzes spreadsheets and generates reports with data visualization"`

#### version (string)

MAJOR.MINOR.PATCH 形式に従うセマンティックバージョニング。

**ルール**:
- semver 仕様に準拠
- 形式: "MAJOR.MINOR.PATCH"
- MAJOR: 破壊的変更
- MINOR: 新機能（後方互換）
- PATCH: バグ修正（後方互換）

**例**: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`

#### author (object)

作成者情報。

**必須サブフィールド**:
- `name` (string): 作成者名または組織名

**例**:
```json
{
  "author": {
    "name": "John Doe"
  }
}
```

### オプションフィールド

#### homepage (string)

プラグインドキュメントまたは Web サイトの URL。

**例**: `"https://github.com/user/plugin-name"`

#### repository (object)

ソースコードリポジトリ情報。

**フィールド**:
- `type` (string): リポジトリタイプ（例: "git"）
- `url` (string): リポジトリ URL

**例**:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git"
  }
}
```

#### keywords (array)

プラグイン検出用の検索キーワード。

**例**: `["spreadsheet", "analysis", "reporting"]`

#### license (string)

ソフトウェアライセンス識別子（SPDX 形式）。

**例**: `"MIT"`, `"Apache-2.0"`, `"GPL-3.0"`

### 完全な例

```json
{
  "name": "spreadsheet-analyzer",
  "description": "Analyzes spreadsheets and generates reports with data visualization",
  "version": "1.2.3",
  "author": {
    "name": "Data Tools Team"
  },
  "homepage": "https://github.com/data-tools/spreadsheet-analyzer",
  "repository": {
    "type": "git",
    "url": "https://github.com/data-tools/spreadsheet-analyzer.git"
  },
  "keywords": ["spreadsheet", "analysis", "reporting", "xlsx"],
  "license": "MIT"
}
```

## marketplace.json スキーマ

場所: マーケットプレイスディレクトリのルート

### 必須フィールド

#### name (string)

マーケットプレイス識別子。一意であること。

**ルール**:
- 小文字、数字、ハイフンのみ
- マーケットプレイスの目的を表す
- 最大 64文字

**例**: `"company-internal-plugins"`

#### owner (object)

マーケットプレイスメンテナー情報。

**必須サブフィールド**:
- `name` (string): オーナー名または組織名

**例**:
```json
{
  "owner": {
    "name": "Engineering Team"
  }
}
```

#### plugins (array)

マーケットプレイスで利用可能なプラグインのリスト。

**各プラグインエントリの必須フィールド**:
- `name` (string): プラグイン識別子
- `source` (string): プラグインディレクトリへのパス
- `description` (string): プラグイン概要

**例**:
```json
{
  "plugins": [
    {
      "name": "plugin-one",
      "source": "./plugins/plugin-one",
      "description": "First plugin description"
    },
    {
      "name": "plugin-two",
      "source": "./plugins/plugin-two",
      "description": "Second plugin description"
    }
  ]
}
```

### オプションフィールド

#### version (string)

マーケットプレイスのバージョン（個別プラグインのバージョンではない）。

**例**: `"1.0.0"`

#### homepage (string)

マーケットプレイスドキュメントの URL。

**例**: `"https://company.com/claude-plugins"`

### 完全な例

```json
{
  "name": "company-plugins",
  "version": "1.0.0",
  "owner": {
    "name": "Company Engineering"
  },
  "homepage": "https://github.com/company/claude-plugins",
  "plugins": [
    {
      "name": "code-reviewer",
      "source": "./plugins/code-reviewer",
      "description": "Automated code review with company standards"
    },
    {
      "name": "deployment-helper",
      "source": "./plugins/deployment-helper",
      "description": "Deployment workflow automation"
    }
  ]
}
```

## プラグイン構造

### ディレクトリレイアウト

| パス | 必須 | 目的 |
|------|------|------|
| `.claude-plugin/plugin.json` | はい | プラグインマニフェスト |
| `skills/{skill-name}/SKILL.md` | いいえ | スキル定義（+ reference.md, examples.md） |
| `agents/{agent-name}/AGENT.md` | いいえ | エージェント定義（+ reference.md） |
| `commands/{command}.md` | いいえ | スラッシュコマンド |
| `hooks/{event}.js` | いいえ | イベントハンドラ |
| `README.md` | いいえ | プラグインドキュメント |

### ファイル要件

#### 必須

- `.claude-plugin/plugin.json` - メタデータを含むプラグインマニフェスト

#### オプション（機能を使用する場合のみ）

- `skills/` - スキル定義用ディレクトリ
- `agents/` - エージェント定義用ディレクトリ
- `commands/` - コマンド定義用ディレクトリ
- `hooks/` - フックスクリプト用ディレクトリ
- `README.md` - プラグイン使用方法ドキュメント

### 命名規約

#### プラグイン

- 形式: `plugin-name`
- 単語間にハイフンを使用
- 説明的かつ具体的
- 最大 64文字

#### スキル

- 形式: `doing-something`（動名詞形）
- 例: `analyzing-logs`, `generating-reports`

#### エージェント

- 形式: `noun-agent`
- 例: `code-reviewer-agent`, `deployment-agent`

#### コマンド

- 形式: `command-name`
- 例: `review-pr`, `deploy-staging`

## 配布方法

### 方法 1: マーケットプレイス（推奨）

チーム連携と集中管理に最適。

#### セットアップ手順

1. マーケットプレイスリポジトリを作成:
```bash
mkdir my-marketplace
cd my-marketplace
git init
```

2. プラグインディレクトリを追加:
```bash
mkdir plugins
cp -r /path/to/plugin-one plugins/
cp -r /path/to/plugin-two plugins/
```

3. ルートに marketplace.json を作成

4. コミットして GitHub/GitLab にホスト:
```bash
git add .
git commit -m "Initial marketplace"
git push origin main
```

5. マーケットプレイス URL をチームと共有:
```
https://raw.githubusercontent.com/user/repo/main/marketplace.json
```

#### インストール

ユーザーは一度マーケットプレイスを追加:
```bash
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json
```

その後プラグインをインストール:
```bash
/plugin install plugin-name@marketplace-name
```

#### 更新

1. プラグインファイルを更新
2. plugin.json のバージョンを更新
3. コミットしてプッシュ
4. ユーザーが実行:
```bash
/plugin update plugin-name
```

### 方法 2: Git リポジトリ

プロジェクト固有プラグインのバージョン管理共有に最適。

#### セットアップ手順

1. プロジェクトリポジトリに追加:
```bash
mkdir -p .claude/plugins
cp -r plugin-name .claude/plugins/
```

2. `.claude/settings.json` で自動インストールを設定:
```json
{
  "plugins": {
    "autoInstall": true,
    "sources": [
      {
        "type": "local",
        "path": ".claude/plugins/plugin-name"
      }
    ]
  }
}
```

3. リポジトリにコミット:
```bash
git add .claude/
git commit -m "Add custom plugin"
git push
```

#### インストール

チームメンバー:
1. リポジトリを pull: `git pull`
2. Claude Code でフォルダを trust
3. 次回起動時にプラグインが自動インストール

### 方法 3: npm パッケージ

広いコミュニティへの公開配布に最適。

#### セットアップ手順

1. package.json を作成:
```json
{
  "name": "@username/plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "main": ".claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "hooks/"
  ],
  "keywords": ["claude-code", "plugin"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git"
  }
}
```

2. 公開:
```bash
npm publish --access public
```

#### インストール

ユーザーがグローバルインストール:
```bash
npm install -g @username/plugin-name
```

Claude Code がグローバル node_modules 内のプラグインを自動検出。

### 方法 4: ローカルファイル

個人使用やテストに最適。

#### インストール

個人スキルディレクトリにコピー:
```bash
cp -r plugin-name/skills/* ~/.claude/skills/
cp -r plugin-name/agents/* ~/.claude/agents/
cp -r plugin-name/commands/* ~/.claude/commands/
```

Claude Code を再起動。

## プラグイン管理コマンド

### マーケットプレイスコマンド

#### マーケットプレイスの追加

```bash
/plugin marketplace add <url>
```

例:
```bash
# リモートマーケットプレイス
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json

# ローカルマーケットプレイス（テスト用）
/plugin marketplace add file:///absolute/path/to/marketplace.json
```

#### マーケットプレイス一覧

```bash
/plugin marketplace list
```

登録済みの全マーケットプレイスを表示。

#### マーケットプレイスの削除

```bash
/plugin marketplace remove <marketplace-name>
```

### プラグインコマンド

#### プラグイン一覧

```bash
/plugin list
```

インストール済みプラグインとその状態（有効/無効）を表示。

#### プラグインのインストール

```bash
/plugin install <plugin-name>@<marketplace-name>
```

例:
```bash
/plugin install code-reviewer@company-plugins
```

#### プラグインの更新

```bash
/plugin update <plugin-name>
```

マーケットプレイスから最新バージョンに更新。

#### プラグインの有効化

```bash
/plugin enable <plugin-name>
```

再インストールせずに無効化されたプラグインを有効化。

#### プラグインの無効化

```bash
/plugin disable <plugin-name>
```

プラグインを一時的に無効化（ファイルは保持）。

#### プラグインのアンインストール

```bash
/plugin uninstall <plugin-name>
```

プラグインを完全に削除。

### 動作確認

インストール後、新機能を確認:
```bash
/help
```

新しいコマンドがヘルプリストに表示されるはず。

## コンポーネント統合

### プラグイン内のスキル

`skills/` ディレクトリに配置されたスキルは自動的にロードされる。

#### 構造

場所: `plugin-name/skills/{skill-name}/`

| ファイル | 必須 | 目的 |
|---------|------|------|
| SKILL.md | はい | 指示 + frontmatter |
| reference.md | いいえ | 詳細仕様 |
| examples.md | いいえ | ユースケース |
| scripts/*.py | いいえ | ヘルパースクリプト |

#### 検出

Claude は以下に基づいてスキルを自動認識する:
- SKILL.md frontmatter のスキル description
- ユーザーの自然言語クエリ
- 会話のコンテキスト

### プラグイン内のエージェント

`agents/` ディレクトリに配置されたエージェントは自動的にロードされる。

#### 構造

場所: `plugin-name/agents/{agent-name}/` → AGENT.md（必須）、reference.md（任意）

#### 呼び出し

エージェントは以下によって呼び出せる:
- Claude が自律的に（エージェント description に基づく）
- ユーザーが明示的に: "use the X agent"
- 他のエージェントまたはスキル

### プラグイン内のコマンド

`commands/` ディレクトリに配置されたコマンドはスラッシュコマンドになる。

#### 構造

場所: `plugin-name/commands/{command}.md`（例: review-pr.md, deploy.md）

#### コマンドファイル形式

```markdown
# Command description

This command [what it does].

[Full prompt that Claude executes when command is invoked]
```

#### 使用方法

ユーザーが入力:
```bash
/review-pr
```

Claude は `review-pr.md` から展開されたプロンプトを受け取る。

### プラグイン内のフック

`hooks/` ディレクトリに配置されたフックはイベント発生時に実行される。

#### 構造

場所: `plugin-name/hooks/{event}.js`（例: pre-commit.js, post-build.js）

#### フックタイプ

- `pre-commit` - git commit 前
- `post-commit` - git commit 後
- `pre-push` - git push 前
- `post-build` - ビルド完了後
- `on-file-change` - ファイル変更時

#### フック形式（JavaScript）

```javascript
module.exports = {
  name: 'hook-name',
  event: 'pre-commit',
  async execute(context) {
    // フックロジックをここに記述
    // true を返すと操作を許可
    // false を返すと操作をブロック
    return true;
  }
};
```

## 高度な機能

### プラグイン間依存

プラグインは要件を記述することで他のプラグインに依存できる:

```json
{
  "name": "advanced-plugin",
  "description": "Advanced features building on base-plugin",
  "dependencies": {
    "base-plugin": ">=1.0.0"
  }
}
```

注意: 手動依存チェックが必要。自動解決なし。

### プラグイン設定

プラグインは `.claude/settings.json` に設定を定義できる:

```json
{
  "plugins": {
    "plugin-name": {
      "setting1": "value1",
      "setting2": "value2"
    }
  }
}
```

設定コンテキスト経由でスキル/エージェントからアクセス。

### MCP Server Integration

プラグインは MCP server 設定を含めることができる:

場所: `plugin-name/mcp/` → server-config.json, server.js

MCP 設定はプラグインドキュメントで参照する。

### バージョン互換性

Claude Code のバージョン要件を指定:

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "engines": {
    "claude-code": ">=1.5.0"
  }
}
```

### プラグインテスト

プラグインテストのベストプラクティス:

1. ローカルテストマーケットプレイスを作成
2. テストマーケットプレイスからインストール
3. 全コンポーネントの読み込みを確認
4. 各スキル/エージェント/コマンドを個別テスト
5. コンポーネント間の相互作用をテスト
6. 他のプラグインとの競合をチェック
7. 更新をテスト（バージョンバンプ → 再インストール）

### 公開チェックリスト

プラグイン配布前に確認:

- [ ] plugin.json に必須フィールドあり
- [ ] バージョンがセマンティックバージョニングに従う
- [ ] 全スキルに有効な frontmatter あり
- [ ] 全エージェントに有効な frontmatter あり
- [ ] コマンドに明確な説明あり
- [ ] README.md で使用方法を文書化
- [ ] ローカルで新規インストールテスト済み
- [ ] ハードコードされたパスや認証情報なし
- [ ] クロスプラットフォーム互換（フォワードスラッシュ）
- [ ] 人気プラグインとの競合なし
- [ ] 公開配布の場合ライセンスを指定
- [ ] リポジトリ URL を提供（該当する場合）

## よくあるパターン

### スキルのみプラグイン

機能を共有する最もシンプルなプラグイン構造:

```
utility-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

### エージェントのみプラグイン

複雑なワークフロー自動化向け:

```
automation-plugin/
├── .claude-plugin/
│   └── plugin.json
└── agents/
    ├── builder-agent/
    │   └── AGENT.md
    └── tester-agent/
        └── AGENT.MD
```

### コマンドのみプラグイン

ユーザートリガー操作向け:

```
command-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    ├── quick-fix.md
    └── generate-docs.md
```

### 包括的プラグイン

全機能を組み合わせる場合:

```
full-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── analyzer/
│       └── SKILL.md
├── agents/
│   └── optimizer/
│       └── AGENT.md
├── commands/
│   └── optimize.md
└── hooks/
    └── pre-commit.js
```

# 発見カテゴリ

TypeScript アプリケーション全体で発見すべきパターンのカテゴリ。

## 1. 構造パターン

### ファイル命名

| パターン | Grep コマンド | ルール候補 |
|---------|--------------|-----------|
| kebab-case ファイル | `find . -name "*.ts" \| grep -E "[a-z]+-[a-z]+"` | naming-convention |
| PascalCase コンポーネント | `find . -name "*.tsx" \| grep -E "^[A-Z]"` | component-naming |
| index.ts 再エクスポート | `find . -name "index.ts"` | barrel-exports |

### エクスポートパターン

```bash
# default vs named exports
grep -r "^export default" --include="*.ts" | wc -l
grep -r "^export function" --include="*.ts" | wc -l
grep -r "^export const" --include="*.ts" | wc -l
```

### インポート順序

```bash
# インポートグループ確認 (react, next, lib, local)
grep -A10 "^import" --include="*.tsx" | head -50
```

## 2. コード品質パターン

### エラーハンドリング

```bash
# try-catch 使用状況
grep -rn "try {" --include="*.ts"

# エラーログ
grep -rn "console.error" --include="*.ts"
grep -rn "logger.error" --include="*.ts"

# エラー型
grep -rn "throw new Error" --include="*.ts"
grep -rn "throw new [A-Z].*Error" --include="*.ts"
```

### 非同期パターン

```bash
# async 関数宣言
grep -rn "async function" --include="*.ts"

# Promise ハンドリング
grep -rn "\.then(" --include="*.ts"
grep -rn "await " --include="*.ts"

# Promise.all の使用
grep -rn "Promise.all" --include="*.ts"
```

### 型安全性

```bash
# any の使用
grep -rn ": any" --include="*.ts"
grep -rn "as any" --include="*.ts"

# unknown の使用
grep -rn ": unknown" --include="*.ts"

# 型アサーション
grep -rn "as [A-Z]" --include="*.ts"
```

## 3. フレームワークパターン

### Server Actions

```bash
# "use server" 宣言
grep -rn '"use server"' --include="*.ts"

# 認証パターン
grep -rn "verifyAuth\|verifyAuthMutation" --include="*.ts"

# CSRF パターン
grep -rn "validateCSRF\|csrfProtect" --include="*.ts"

# Zod バリデーション
grep -rn "\.parse(\|\.safeParse(" --include="*.ts"
```

### React コンポーネント

```bash
# 関数コンポーネント
grep -rn "^export function [A-Z]" --include="*.tsx"

# Props インターフェース
grep -rn "interface.*Props" --include="*.tsx"

# フックの使用
grep -rn "use[A-Z][a-zA-Z]*(" --include="*.tsx"
```

### i18n パターン

```bash
# useTranslations の使用
grep -rn "useTranslations" --include="*.tsx"

# t() 呼び出し
grep -rn "t\(['\"]" --include="*.tsx"

# 翻訳キーフォーマット
grep -rn 't("' --include="*.tsx" | sed 's/.*t("//' | sed 's/".*//' | sort | uniq
```

## 4. ドキュメントパターン

### JSDoc カバレッジ

```bash
# JSDoc ブロック
grep -rn "/\*\*" --include="*.ts"

# @description タグ
grep -rn "@description" --include="*.ts"

# @param タグ
grep -rn "@param" --include="*.ts"

# @returns タグ
grep -rn "@returns\|@return" --include="*.ts"
```

### カスタムアノテーション

```bash
# shirokuma-flow アノテーション
grep -rn "@screen\|@component\|@serverAction" --include="*.ts"
grep -rn "@usedComponents\|@usedActions" --include="*.ts"
grep -rn "@dbTables\|@feature" --include="*.ts"
```

### TODO/FIXME 追跡

```bash
# TODO コメント
grep -rn "// TODO\|// FIXME" --include="*.ts"

# 担当者付き
grep -rn "// TODO(@" --include="*.ts"
```

## 5. テストパターン

### テスト構造

```bash
# describe ブロック
grep -rn "describe(" --include="*.test.ts"

# it/test ブロック
grep -rn "it(\|test(" --include="*.test.ts"

# @testdoc アノテーション
grep -rn "@testdoc" --include="*.test.ts"
```

### モックパターン

```bash
# jest.mock の使用
grep -rn "jest.mock" --include="*.test.ts"

# vi.mock (Vitest)
grep -rn "vi.mock" --include="*.test.ts"
```

## 分析マトリクス

| カテゴリ | Admin | Public | Web | MCP | shirokuma |
|---------|-------|--------|-----|-----|-----------|
| エラーハンドリング | ? | ? | ? | ? | ? |
| 型安全性 | ? | ? | ? | ? | ? |
| JSDoc カバレッジ | ? | ? | ? | ? | ? |
| Server Actions | ? | ? | ? | N/A | N/A |

分析中にカウントを記入し、パターンと不整合を特定する。

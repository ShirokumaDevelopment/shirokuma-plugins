---
name: auditing-docs
description: ドキュメント構造を定期的に監査し、docs-layering / docs-layout ルール違反・ADR 漏れ・orphan ルール等を検出して改善 Issue 起票を提案します。トリガー: 「ドキュメント監査」「構造監査」「docs structural audit」「auditing-docs」。
allowed-tools: Read, Bash, Glob, Grep
---

# ドキュメント構造監査

`lint docs` による機械検査と AI 判定による構造監査を組み合わせて、ドキュメント配置の問題を検出・報告するスキル。

## スコープ

- **カテゴリ:** 調査系ワーカー
- **スコープ:** `shirokuma-flow lint docs` による機械検査、`docs-layering` / `docs-layout` ルールに基づく AI 構造監査、検出問題の重大度分類、改善 Issue 起票の提案。
- **スコープ外:** ドキュメントの自動移動・自動修正、ユーザー確認なしの Issue 自動作成。Issue 作成はユーザー確認後に実行する。

> **Bash 例外**: `shirokuma-flow lint docs` および `git log` / `wc` / `diff` 等の読み取り・検索コマンドは許可。ファイルの自動移動・削除は禁止。

## ワークフロー

```
機械検査（lint docs） → AI 構造監査（Grep/Read） → 重大度分類 → サマリーレポート → HTML 化判定 → Issue 起票提案
```

## 手順

### 1. 機械検査の実行

```bash
shirokuma-flow lint docs
```

出力から以下を収集する:
- エラー（`❌`）: 必須セクション欠落、OVERVIEW.md / ADR 等の構造違反
- 警告（`⚠️`）: 軽微な構造問題

> **現状の検査範囲**: `lint docs` はファイル存在・必須セクションの検査が中心。Phase 1 (#2496) で実装された `claude-md-budget` / `claude-md-index-drift` ルールは `lint workflow` 側に属し、`workflow.ts` への配線が完了（#2512）するまで `lint docs` の出力には含まれない。本 skill では Step 2c/2d で AI 側でも該当領域を検出する。

### 2. AI 判定による構造監査

`docs-layering` / `docs-layout` ルールを参照して以下を `Grep` / `Read` で調査する:

#### 2a. layering 違反の検出

配置先のミスマッチを検出する:

```bash
# plugin/shirokuma-skills-ja/rules/ に project rule 相当のものが紛れていないか
# （他プロジェクトでは意味を持たない、特定リポジトリ固有の内容）
grep -r "shirokuma-docs" plugin/shirokuma-skills-ja/rules/ --include="*.md" -l
```

```bash
# .shirokuma/rules/{project}/ に plugin rule 相当のものがないか
# （汎用的なプラクティスで他プロジェクトでも使えるもの）
# 手動確認: 各ファイルのスコープを Read で確認
```

判定基準（`docs-layering` ルールの Q2 より）:
- 「他のプロジェクトでも使えるか？」→ YES なら plugin rule が正
- 「コードと密結合しているか？」→ YES なら project rule が正

#### 2b. EN/JA 同期漏れの検出（EN/JA 両方配布するプロジェクトのみ）

> **適用範囲**: `plugin/shirokuma-skills-{en,ja}/` を両方持つリポジトリでのみ実行する。片言語のみのプロジェクトではこのステップをスキップ。

```bash
# ファイル名レベルの存在チェック（簡易）
diff <(ls plugin/shirokuma-skills-ja/rules/ | sort) <(ls plugin/shirokuma-skills-en/rules/ | sort)
diff <(ls plugin/shirokuma-skills-ja/skills/ | sort) <(ls plugin/shirokuma-skills-en/skills/ | sort)
```

> **限界**: `ls + diff` はファイル名一致のみで検出する。内容ドリフト（一方が更新され他方が古い）は別途各ペアを `Read` で確認するか、`wc -l` の行数差を比較する。

#### 2c. orphan ルール / リンク切れの検出

各 project rule ファイルの basename を、参照される可能性のある全範囲（CLAUDE.md、`.shirokuma/rules/`、`plugin/` 全体）で検索する:

```bash
# 各ファイルの参照件数を確認（自ファイルは除く）
for f in .shirokuma/rules/{project}/*.md; do
  name=$(basename "$f")
  count=$(grep -rl "$name" CLAUDE.md .shirokuma/rules/ plugin/ --include="*.md" 2>/dev/null | grep -v "^$f$" | wc -l)
  echo "$count $name"
done | sort -n | head -10
```

参照件数 **0** のファイルが orphan 候補。`rules-index.md` 経由の間接参照や plugin SKILL.md からの参照も含めて検出する。

#### 2d. CLAUDE.md 予算チェック（暫定）

```bash
wc -l CLAUDE.md
```

150 行を超えている場合は警告（ADR-v3-021 Phase 1 で設定された予算）。

> **暫定**: `claude-md-budget` lint ルール（Phase 1 (#2496) で実装済み）の `workflow.ts` への配線が完了（#2512）すれば、本チェックは段 1（lint workflow）で機械的に検出される。本 skill では暫定的に AI 側でも確認する。

#### 2e. ADR 漏れの可能性

以下の兆候がある場合、ADR 未記録の重要決定が存在する可能性がある:

- 大きな refactor PR にコメントなしで方針変更が含まれている
- `.shirokuma/rules/` や `SKILL.md` に「なぜ」という理由が記述されていない重要な設計制約がある

```bash
# 最近の大規模変更を確認（調査の参考として）
git log --oneline -20
```

### 3. 重大度分類

検出された問題を以下の基準で分類する:

| 重大度 | 基準 | 対応 |
|--------|------|------|
| **High** | EN/JA 同期漏れ（片方のみ存在）、lint docs エラー | 個別 Issue 起票を推奨 |
| **Medium** | layering 違反（明らかなミスマッチ）、orphan ルール | 個別 Issue 起票を推奨 |
| **Low** | CLAUDE.md 予算超過、ADR 漏れの可能性、軽微な構造改善 | 同種を集約して 1 Issue にまとめる |

**false positive 抑制**: 同一カテゴリ内（例: orphan rule、軽微な layering 違反、CLAUDE.md 予算超過 等）で重大度 Low が **3 件以上**ある場合、個別起票ではなくカテゴリ単位のまとめ Issue にする。

### 4. サマリーレポート

以下の形式でユーザーに報告する:

```markdown
## ドキュメント監査結果

**監査日時:** {date}

### 機械検査（lint docs）
| 結果 | 件数 |
|------|------|
| エラー | {n} |
| 警告 | {n} |

### AI 構造監査
| 重大度 | 問題 | 場所 |
|--------|------|------|
| High | EN/JA 同期漏れ: {filename} | plugin/shirokuma-skills-ja/rules/ に存在、EN 側になし |
| Medium | layering 違反: {filename} | .shirokuma/rules/ に汎用ルールが配置されている |
| Low | CLAUDE.md 予算超過 | {n} 行（上限 150 行） |

### Issue 起票候補
- [ ] [High] EN/JA 同期漏れ: {filename} を EN 側に追加
- [ ] [Medium] {filename} を plugin ルールに移動
- [ ] [Low] まとめ: 軽微な構造改善（{n} 件）
```

### 5. HTML 化判定

サマリーレポート（ステップ 4）の規模に基づき、HTML レポート化要否を判定する。本スキル自身は HTML 生成を行わず、呼び出し元または直接実行時のユーザーに**判定情報**を提示する。

**判定基準・テンプレート対応・カテゴリマッピングの正本**: [`.shirokuma/rules/shirokuma-flow/html-report-criteria.md`](../../../../.shirokuma/rules/shirokuma-flow/html-report-criteria.md)（閾値・テンプレート名・カテゴリ名を本ファイルに直書きしない）。

#### 5-1. 判定情報の生成

ステップ 4 のサマリーレポート規模を計測し、構造化データを生成する:

```yaml
html_report_required: true|false
template_name: review-summary
category: reviews
slug: docs-{year}{quarter}  # 例: docs-2026q2
report_lines: 142
report_kb: 12.4
critical_high_count: 5  # High 件数（auditing-docs は High が最高重大度）
report_type: docs-audit
```

`html_report_required` は `html-report-criteria.md` §2 の閾値（行数 ≥ 80 / サイズ ≥ 8 KB / Critical+High ≥ 3）のいずれかを満たす場合 `true`、それ以外は `false`。auditing-docs は閾値ベースの判定であり常時 HTML 化対象ではない。

#### 5-2. HTML 化 YES の場合

本スキル自身は HTML 生成を行わず、ユーザー（直接実行時）または呼び出し元オーケストレーターに判定情報を提示する。実際の `writing-html-explainer` 呼び出しはユーザー指示またはオーケストレーター責務（`html-report-criteria.md` §1 の責務境界に従う）。

パラメータは `html-report-criteria.md` §3 / §4 に従い固定:

| パラメータ | 値 |
|-----------|---|
| `--template` | `review-summary`（正本: `html-report-criteria.md` §3） |
| `--category` | `reviews`（正本: `html-report-criteria.md` §4 のドキュメント監査行） |
| `--slug` | `docs-{year}{quarter}`（例: `docs-2026q2`、命名規約は `html-report-criteria.md` §4 参照） |

レポート構造化には `html-report-criteria.md` §3 のテンプレート対応表に従い以下の部品を活用する:

- **`review-score-card`**: 機械検査結果（lint docs エラー / 警告件数）の総合判定
- **`issue-list-table`**: drift 一覧・必須セクション欠落・参照切れ・layering 違反・orphan ルールを High / Medium / Low の優先度順で表示
- **`action-items`**: Issue 起票候補の順序付きリスト

#### 5-3. style.css `?v=N` Bumping ポリシー

大規模監査時は表示数が多くなるため新規スタイル追加が発生する可能性がある。`pages/assets/style.css` を更新した場合のみ `?v=N` キャッシュバスターを 4 箇所同時にインクリメントする（`writing-html-explainer/SKILL.md` の「`?v=N` Bumping ポリシー」セクションを参照）。**style.css 更新がない場合は `?v=N` 操作不要**。

#### 5-4. HTML 化 NO の場合

従来通り Markdown サマリーレポートのみとし、追加処理は行わない。ステップ 6 の Issue 起票へ進む。

### 6. Issue 起票（ユーザー確認後）

ユーザーの確認を得てから Issue を起票する。スキルは自動で Issue を作成しない。

Issue 本文を一時ファイルに書き出し、`shirokuma-flow issue add` で作成する（`auditing-security` と同じパターン）:

```bash
mkdir -p /tmp/shirokuma-flow
cat > /tmp/shirokuma-flow/audit-issue-{slug}.md <<'EOF'
---
title: "fix(docs): {問題の要約}"
priority: "Medium"
size: "S"
labels: ["area:docs"]
---

## 目的
{問題の説明} を修正してドキュメント構造の整合性を回復する。

## 背景
- **検出:** auditing-docs スキルによる構造監査
- **ルール参照:** docs-layering / docs-layout
- **影響:** {影響範囲の説明}

## タスク
- [ ] {具体的な修正手順}
- [ ] lint docs が PASS することを確認

## 成果物
`shirokuma-flow lint docs` がクリーンになり、docs-layering ルールに準拠した状態になること。
EOF

shirokuma-flow issue add /tmp/shirokuma-flow/audit-issue-{slug}.md
```

要件分析・サブ Issue 構成判定が必要な大型タスクの場合は `create-item-flow` を呼び出してもよい（推論ロジックを活用したい場合のみ）。

## GitHub Actions での定期実行（参考）

> **位置付け**: schedule で自動実行できるのは段 1 の **`lint docs` のみ**。本 skill 全体（AI 判定を含む）は手動起動が前提。`lint docs` がエラー検出した週に手動で `/auditing-docs` を起動するトリガー条件として利用する。

```yaml
# .github/workflows/docs-audit.yml（参考例）
name: docs-audit
on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜 9:00 UTC（lint docs のみ自動実行）
  workflow_dispatch:

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run lint docs（機械検査）
        run: shirokuma-flow lint docs
      # lint docs がエラー検出した場合、開発者が手動で /auditing-docs を起動する
```

## 注意事項

- **lint docs が PASS している場合でも構造問題は存在しうる**: 機械検査はファイルの存在・フォーマットを確認するが、配置先の適切性（layering）は AI が判定する
- **大規模変更後に実行を推奨**: plugin ルール追加・大きな refactor の後は構造監査を実行する
- **定期実行の目安**: 月 1 回または major PR マージ後

## クイックリファレンス

```bash
# 機械検査のみ
shirokuma-flow lint docs

# 手動で構造監査全体を起動
/auditing-docs
```

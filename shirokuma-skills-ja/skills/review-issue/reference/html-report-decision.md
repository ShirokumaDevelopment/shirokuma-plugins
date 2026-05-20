# HTML 化判定（review-issue 用詳細仕様）

`review-issue` SKILL.md ステップ 7（HTML 化判定）の詳細仕様。

## 役割

レポート保存後、本スキル自身は HTML 生成を行わず、呼び出し元オーケストレーター（`review-flow` 等）に**判定情報**を構造化データで返却する。実際の HTML 生成（`writing-html-explainer` の呼び出し）はオーケストレーターの責務。

**判定基準・テンプレート対応・カテゴリマッピングの正本**: [`html-report-criteria.md`](../../../rules/html-report-criteria.md)（閾値・テンプレート名・カテゴリ名を本ファイルに直書きしないこと）。

## 判定スキップ条件

PASS 判定で指摘 0 件かつレポート本文が 80 行未満が確定している場合、`html_report_required: false` を返してよい（閾値の正本は `html-report-criteria.md` §2 を参照）。

## 返却フィールド

ステップ 5 のレポート生成結果を計測し、以下を構造化データ（YAML フロントマター）でオーケストレーターに返却する:

```yaml
html_report_required: true|false
template_name: review-summary
category: reviews|discussions
slug: pr-{number}-r{round}
report_lines: 142
report_kb: 12.4
critical_high_count: 5
report_type: pr-review|code-review|docs-audit|testing-review|config-review
```

## テンプレート選択（ロール別）

ロールごとの `template_name` は以下に固定する（正本: `html-report-criteria.md` §3）:

| ロール | `template_name` |
|--------|---------------|
| code / config / code+annotation | `review-summary` |
| security | `review-summary` |
| testing | `review-summary` |
| nextjs（フォールバック実行時） | `review-summary` |
| docs | `review-summary` |

**委任時の扱い**: `nextjs` ロールが `reviewing-nextjs` に委任された場合は、本判定は委任先スキルが行う。本スキルでフォールバック実行した場合のみ上記テーブルを適用する。

## カテゴリ・slug 決定

カテゴリと slug は `html-report-criteria.md` §4「報告タイプ ↔ カテゴリマッピング」に従いオーケストレーターが決定する。本スキルは判定情報のみ返却し、最終的な `--category` / `--slug` 決定には介入しない。

## 責務分担

| レイヤー | 担当 |
|---------|------|
| `review-issue`（本スキル） | Markdown レポート生成 + PR / Discussion 投稿 + 判定情報返却 |
| オーケストレーター（`review-flow` 等） | 判定情報と `html-report-criteria.md` §2 の閾値を照合し、HTML 化要否を最終判定。YES の場合のみ `writing-html-explainer` を Skill ツールで呼び出し |
| `writing-html-explainer` | オーケストレーターから `--template` 指定で呼び出され HTML を生成 |

## `auditing-security` 除外注

`auditing-security` は依存パッケージ脆弱性スキャナで Issue 起票完結型のため、本判定ステップの対象外。`reviewing-security`（PR セキュリティレビュー）が常時 HTML 化対象。詳細は `html-report-criteria.md` §2 の注記参照。

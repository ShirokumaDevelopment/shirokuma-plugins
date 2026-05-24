# サブ Issue 自動生成: bash 詳細手順

## plan-issue ステップ 4c の実行内容

### 1. サブ Issue の作成

```bash
# 各サブ Issue の本文ファイルを作成
cat > /tmp/shirokuma-flow/{parent-number}-sub-{n}.md <<'EOF'
---
title: "{サブ Issue タイトル}"
status: "Backlog"
---

#{parent-number} の計画を参照。
EOF

# サブ Issue を作成
shirokuma-flow issue add /tmp/shirokuma-flow/{parent-number}-sub-{n}.md

# 親子関係を設定
shirokuma-flow issue parent {sub-number} {parent-number}
```

### 2. プレースホルダーの置換

全サブ Issue 作成後、計画 Issue 本文のプレースホルダー（`#{sub1}` / `{sub1}` 等）を実際の番号に置換し、`issue update` + `issue push` で同期する:

```bash
# 計画 Issue 本文を取得してプレースホルダーを置換
shirokuma-flow issue context {PLAN_ISSUE_NUMBER}
# Read .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md
# → cp してプレースホルダーを python3 で置換
shirokuma-flow issue update {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md
shirokuma-flow issue push {PLAN_ISSUE_NUMBER}
```

詳細な bash 例: `plan-issue` の「ステップ 4c」セクションを参照。

# Sub-Issue Auto-Generation: bash Details

## What plan-issue Step 4c Executes

### 1. Create Sub-Issues

```bash
# Create the body file for each sub-issue
cat > /tmp/shirokuma-flow/{parent-number}-sub-{n}.md <<'EOF'
---
title: "{sub-issue title}"
status: "In progress"
---

See #{parent-number} for full plan.
EOF

# Create the sub-issue
shirokuma-flow issue add /tmp/shirokuma-flow/{parent-number}-sub-{n}.md

# Set parent-child relationship
shirokuma-flow issue parent {sub-number} {parent-number}
```

### 2. Replace Placeholders

After all sub-issues are created, replace placeholders (`#{sub1}` / `{sub1}`, etc.) in the plan issue body with actual issue numbers, then sync via `issue update` + `issue push`:

```bash
# Fetch plan issue body and replace placeholders
shirokuma-flow issue context {PLAN_ISSUE_NUMBER}
# Read .shirokuma/github/{org}/{repo}/issues/{PLAN_ISSUE_NUMBER}/body.md
# → cp the body and replace placeholders via python3
shirokuma-flow issue update {PLAN_ISSUE_NUMBER} /tmp/shirokuma-flow/{PLAN_ISSUE_NUMBER}-updated-body.md
shirokuma-flow issue push {PLAN_ISSUE_NUMBER}
```

Full bash example: see the "Step 4c" section in `plan-issue`.

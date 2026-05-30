---
name: review-flow
description: PR番号を受け取り、コードレビュー実行および未解決レビュースレッドの対応を自動チェーンで処理します。トリガー: 「レビュー対応」「PR対応」「PRレビュー」「review response」「/review-flow #123」。
allowed-tools: Bash, Read, Grep, Glob, Skill, TaskCreate, TaskUpdate, TaskGet, TaskList, AskUserQuestion, Agent
---

# PR レビュー対応

PR 番号を受け取り、コードレビュー実行（`review-issue` Agent / `review-worker` 経由）および未解決レビュースレッドの対応（分類・修正・コミット・返信・解決）を自動チェーンで処理する。

## 責務境界

| スキル | 責務 |
|--------|------|
| `review-issue` | コードレビュー実行エンジン。Agent ツール（`review-worker`）経由で起動 |
| `review-flow`（このスキル） | PR レビューのオーケストレーター（レビュー実行 + スレッド対応）。新しい会話のエントリーポイント |

## 引数

| 形式 | 例 | 動作 |
|------|---|------|
| PR 番号 | `#123` or `123` | PR のレビュースレッドを取得して対応 |
| 引数なし | — | AskUserQuestion で PR 番号を確認 |

## ワークフロー

### Issue / PR ステータス遷移（PR は Backlog で入り PASS で Review に上げる）

「**1 エンティティ 1 Review** 原則」に従い、`review-flow` は **課題 Issue / 計画 Issue を Review に遷移させない**。コードレビューは **PR の Review 状態のみ**で表現される。

#2802 により、PR は `pr create` で **Backlog** で作成される。`review-flow` の AI レビューが **PASS** した時点で初めて PR を `Backlog → Review` に遷移させる（コードレビュー完了の明示シグナル）。FAIL / 未解決スレッドありの場合は PR を **Backlog のまま保持**し、修正→再レビューが PASS した時点で初めて Review に上げる。

| エンティティ | review-flow 中の挙動 |
|------------|-------------------|
| **PR** | Backlog で入り、AI レビュー **PASS で `Backlog → Review`** に遷移（`pr merge` で Done に遷移）。FAIL / 未解決スレッドありの間は Backlog のまま |
| **課題 Issue** | Status: In progress のまま触らない |
| **計画 Issue** | Status: In progress のまま触らない |

#### **DO NOT**: review-flow から呼んではならないコマンド

- `submit <Issue#>` / `submit <PlanIssue#>`（課題 Issue / 計画 Issue を Review に遷移させる行為。**1 Review 原則違反**）
- `status transition <Issue#> --to Review`（同上）
- 課題 Issue / 計画 Issue を Review ↔ In progress で往復させる経路全般（フラッピング防止）

> **PR の Backlog → Review は許可**: 上記 DO NOT は**課題 Issue / 計画 Issue** に対する不変条件。PR 自身を AI レビュー PASS 後に `status transition <PR#> --to Review` で遷移させるのは正規の経路（PR_FORWARD: `Backlog → Review`）。

#### review-flow 中のコード修正

レビュー指摘に対するコード修正は、**Issue / 計画 Issue を In progress のまま** 行う。途中でステータスを動かす必要はない:

1. `coding-worker` でコード修正
2. `commit-worker` でコミット & プッシュ
3. `pr reply` / `pr resolve` でスレッド対応
4. ステータス更新は不要（PR は Backlog のまま、Issue は In progress のまま）。再レビューが PASS した時点で PR を `Backlog → Review` に上げる

> **参照**: 1 エンティティ 1 Review 原則の詳細は `project-items.md` Review セクション、および `pages/specs/skill-ja-review-flow/index.html` を参照。

### ステップ 1: コンテキスト復元（必須・最初に実行）

> **このステップは必ず最初に実行する。** スキップ不可。

1. PR 情報を取得し、`review_count` と `linked_issues` を記録する（ステップ 2 の分岐判定で使用）:
   ```bash
   shirokuma-flow pr show {PR#}
   ```
   取得すべきフィールド:
   - `review_count`: GitHub formal review submission の件数（新規レビュー判定の一要素。issue comment 形式のレビューは計上しないため、ステップ 2 で `issue_comments` も併せて確認する）
   - `linked_issues`: 関連 Issue 番号（コンテキスト復元に使用）
   - `base_ref_name`: ベースブランチ（diff 取得に使用）
   - PR 本文（`body`）: 成果物検出に使用

2. 関連 Issue がある場合、Issue の計画を参照してコンテキストを把握:
   ```bash
   shirokuma-flow issue context {issue-number}
   # → .shirokuma/github/{org}/{repo}/issues/{issue-number}/body.md を Read ツールで読み込む
   ```
3. PR の diff を確認:
   ```bash
   # ベースブランチ（通常 develop、サブ Issue は integration ブランチ）
   git diff origin/{base-branch}...HEAD
   ```

4. **成果物検出**: PR 本文から「レビュー対象の成果物」を判別する:

   **検出ルール:**
   - PR 本文から `#N` 参照を全抽出する
   - `Closes #N` / `Fixes #N` / `Refs #N` / `References #N` パターンに一致するものは linked issues として除外する
   - `## Summary` / `## 概要` セクション内の残りの `#N` 参照、または `## Artifacts` / `## 成果物` セクション内の `#N` 参照を成果物候補とする
   - 成果物候補が 0 件の場合 → 成果物レビューをスキップ（従来通り diff のみレビュー）
   - 成果物候補がある場合 → `shirokuma-flow issue context {N}` でキャッシュし、`.shirokuma/github/{org}/{repo}/issues/{N}/body.md` の frontmatter `type` フィールドで Discussion / Issue / PR を判別し、Discussion と Issue のみをレビュー対象とする
   - **上限**: 成果物は最大 10 件まで。超過時は最初の 10 件のみレビューし、警告を出力する

   **成果物候補リスト** として記録する（形式: `#N (Discussion)`, `#N (Issue)` 等）

### ステップ 2: レビュー状態の判定と分岐

新規レビューモード（ステップ 2a）に入る**前**に、`review_count` と既存レビューコメントの両方を確認する。`pr comments {PR#}` を取得し、`issue_comments` に `**レビュー結果:**`（PASS / FAIL）を含むコメントが存在するかをチェックする:

```bash
shirokuma-flow pr comments {PR#}
```

> **なぜ `review_count` だけでは不十分か（#2818 問題 2）**: `review_count` は GitHub の formal review submission の件数であり、issue comment 形式で投稿されたレビューを計上しない。`review-issue` は指摘を review thread・issue comment のどちらの形式でも投稿しうるため、`review_count: 0` だけを根拠に新規レビューと判定すると、issue comment 形式で既にレビュー済みの PR で重複レビューが走る。

**判定順序（既存レビューの有無を先に確定する）:**

| 判定 | 条件 | 分岐先 |
|------|------|--------|
| **既存レビューあり** | `review_count > 0` **または** `issue_comments` に `**レビュー結果:**` を含むコメントあり | 新規レビューモード（ステップ 2a）を**スキップ**。下記「既存レビューありの分岐」へ |
| **新規レビュー** | `review_count: 0` **かつ** `issue_comments` に `**レビュー結果:**` を含むコメントなし | 新規レビューモードへ（ステップ 2a） |

**既存レビューありの分岐**（未解決スレッドの有無で振り分け）:

- 未解決スレッドが 0 件 → 完了レポートを表示し、再レビューを提案（「`review-issue` で再レビューを実行しますか？」と AskUserQuestion）。ユーザーが承認した場合はステップ 2a へ遷移
- 未解決スレッドあり → ステップ 2b（レビュー結果確認）→ ステップ 3 以降の既存フロー

### ステップ 2a: レビュー実行モード（新規レビューと判定された場合）

レビューがまだ提出されていない場合、`review-issue` を Agent ツール（`review-worker`）で呼び出してコードレビューを実行する。

1. `review-issue` を Agent ツールで起動し、PR の diff に対するコードレビューを実行:

   成果物候補がある場合は、prompt に「成果物レビュー対象:」セクションを含める:
   ```text
   Agent(
     description: "review-worker code PR #{PR#}",
     subagent_type: "review-worker",
     prompt: "code PR #{PR#}\n\n成果物レビュー対象:\n- #101 (Discussion)\n- #102 (Discussion)"
   )
   ```

   成果物候補がない場合は、従来通り:
   ```text
   Agent(
     description: "review-worker code PR #{PR#}",
     subagent_type: "review-worker",
     prompt: "code PR #{PR#}"
   )
   ```
2. `review-issue` がレビュー結果を PR コメントとして投稿する。Agent ツールの出力本文でレビュー結果を確認する
3. `review-issue` が issue comment を投稿した場合、PR コメントの存在を `pr comments` で確認する
4. 未解決スレッドを確認する:
   ```bash
   shirokuma-flow pr comments {PR#}
   ```
   以下の条件テーブルに基づいて分岐する:

   | 未解決スレッド | `issue_comments` にレビューコメント | 分岐先 |
   |--------------|----------------------------------|--------|
   | あり | — | ステップ 2a-2（HTML 化判定）→ ステップ 2b（レビュー結果確認）へ。**PR は Backlog のまま**（FAIL/未解決） |
   | なし | あり | ステップ 2a-2（HTML 化判定）→ ステップ 2a-3（**PASS: PR を Backlog → Review**）→ ステップ 2b（推奨事項対応確認）へ |
   | なし | なし | ステップ 2a-2（HTML 化判定）→ ステップ 2a-3（**PASS: PR を Backlog → Review**）→ 完了レポートを表示して終了 |

   > **重要**: PASS 判定であっても `issue_comments` にレビューコメント（推奨事項）が存在する場合はステップ 2b の UCP を必ず発動する。PASS は「ブロッキングな指摘なし」を意味するが、推奨事項の対応判断はユーザーに委ねる必要がある。`issue_comments` チェックは PASS/FAIL 判定より優先して評価すること。

### ステップ 2a-2: HTML 化判定とレポート生成

`review-issue`（`review-worker` Agent）から返却された判定情報（`html_report_required`, `template_name`, `report_lines`, `report_kb`, `critical_high_count`, `report_type`）を受け取り、HTML 化要否を最終判定する。`category` / `slug` / 出力ファイル名は本スキル（オーケストレーター）が `html-report-criteria.md` §4 に従い決定する（review-issue の返却値に依存しない）。

**判定基準・テンプレート対応・カテゴリマッピングの正本**: [`html-report-criteria.md`](../../rules/html-report-criteria.md)（閾値・テンプレート名・カテゴリ名を本ファイルに直書きしない）。

1. **判定式**: `html-report-criteria.md` §5-2 の擬似コードに従う。`report_type` が常時 HTML 化対象（`postmortem` / `security-pr-review`）、または閾値（行数 / KB / Critical+High 件数）のいずれかを満たせば HTML 化を実施する。
2. **HTML 化 YES の場合**: `writing-html-explainer` を Skill ツールで呼び出して HTML レポートを生成する:
   ```text
   Skill(
     skill: "writing-html-explainer",
     args: "--template review-summary --category prs --slug {PR#} --output-filename review-r{round}.html --title \"PR #{PR#} コードレビュー R{round}\" --source-report /tmp/shirokuma-flow/{PR#}-review-summary.md"
   )
   ```
   - `template_name` は通常 `review-summary`（コード/セキュリティ/テスト/ドキュメントレビュー）。詳細は `html-report-criteria.md` §3 参照
   - `category` / `slug` / 出力ファイル名は `html-report-criteria.md` §4「報告タイプ ↔ カテゴリマッピング」に従い決定（PR レビューは `prs` カテゴリ + slug `{PR#}`、出力ファイル名 `review-r{round}.html`）
3. **HTML 生成成功後**: 公開 URL を取得し、PR コメントを `html-report-criteria.md` §5-4「コメント本文テンプレート」形式に従って更新する（サマリー表 + HTML レポート URL）。
4. **マスターページへのリンク追記**: `pages/prs/{PR#}/index.html` の `<!-- SUBPAGE_LINKS_START -->` / `<!-- SUBPAGE_LINKS_END -->` 間に `review-r{round}.html` のリンクを追記する（マスターページが未生成の場合は先に implement-flow が生成しているはず。未生成の場合は `--template default` でマスターページを先に生成する）。追記前にマーカーの存在を確認し、無ければフォールバックで挿入する:
   ```bash
   MASTER=pages/prs/{PR#}/index.html
   # マーカーが無い場合は </main> 直前に挿入（フォールバック）
   grep -q '<!-- SUBPAGE_LINKS_END -->' "${MASTER}" || \
     sed -i 's|</main>|<ul>\n  <!-- SUBPAGE_LINKS_START -->\n  <!-- SUBPAGE_LINKS_END -->\n</ul>\n</main>|' "${MASTER}"
   LINK='  <li><a href="review-r{round}.html">コードレビュー R{round}</a></li>'
   sed -i "s|<!-- SUBPAGE_LINKS_END -->|${LINK}\n<!-- SUBPAGE_LINKS_END -->|" ${MASTER}
   ```
5. **HTML 化 NO の場合**: 従来通り Markdown 本文の PR コメントのみとし、追加処理は行わない。

> **切替方針（#2629 互換）**: #2629 で生成された既存の `pages/reviews/pr-{n}-r{round}/` 生成物はそのまま残す。本計画以降の新規 review-flow 実行分から `pages/prs/{n}/review-r{n}.html` に切替える。マイグレーションは行わない。

> **責務分担**: `review-issue` は Markdown レポート生成と判定情報返却のみを担当し、本ステップ（HTML 生成委任）はオーケストレーターである本スキル（`review-flow`）の責務。`html-report-criteria.md` §1 の「責務境界」を遵守する。

> **`auditing-security` 除外注**: `auditing-security` は依存パッケージ脆弱性スキャナで Issue 起票完結型のため、本判定の対象外。`reviewing-security`（PR セキュリティレビュー）は常時 HTML 化対象であり、`finalize-changes` 経由で実行された場合の HTML 生成は `reviewing-security` 側のフローに従う。詳細は `html-report-criteria.md` §2 の注記参照。

### ステップ 2a-3: AI レビュー PASS 時の PR 遷移（Backlog → Review、#2802）

AI レビューが **PASS**（ブロッキングな指摘なし = 未解決スレッドなし）と確定した時点で、PR を `Backlog → Review` に遷移させる。これがコードレビュー完了の明示シグナルとなる。

```bash
shirokuma-flow status transition {PR#} --to Review
```

| AI レビュー結果 | PR Status の扱い |
|----------------|----------------|
| PASS（未解決スレッドなし、推奨事項のみ含む） | `Backlog → Review` に遷移（PR_FORWARD） |
| FAIL / 未解決スレッドあり | **Backlog のまま保持**（Review に上げない）。スレッド対応フロー（ステップ 3 以降）へ |

> **遷移の前提**: PR は `pr create` で Backlog で作成されている（#2802）。既に Review の場合（再レビュー等で手動遷移済み）はこのステップをスキップする。`PR_FORWARD_TRANSITIONS["Backlog"]` に `Review` が含まれるため、`status transition {PR#} --to Review` は `--rollback` なしで成功する。
>
> **FAIL → 修正 → 再レビュー PASS のサイクル**: FAIL の場合は PR を Backlog のまま保持し、ステップ 5 のコード修正・コミット後に再レビューを実行する。再レビューが PASS（未解決スレッドが 0 件）になった時点で初めて本ステップで PR を Review に上げる。

### ステップ 2b: レビュー結果確認（ユーザー制御ポイント）

> **適用範囲:** このステップは 2 つのエントリーポイントから到達する: (1) ステップ 2a（新規レビュー実行後）で未解決スレッドまたはレビュー issue comment がある場合; (2) ステップ 2 の「既存レビューありの分岐」で既存レビューが検出され未解決スレッドが残っている場合。いずれの場合も UCP は必要。

レビュー結果をユーザーに提示し対応方針を確認する。エントリーポイント (1) では、直前に完了した `review-issue` の実行から未解決スレッドまたはレビュー issue comment が返された状態。エントリーポイント (2) では、ステップ 2 で `issue_comments` を介して既存レビューが検出された状態。`review-issue` は指摘を review thread として投稿する場合と issue comment として投稿する場合があり、いずれの形式でも UCP を発動させる。

Agent ツール（`review-worker`）の出力本文から `**レビュー結果:**` 文字列を走査し、PASS / FAIL の判定結果を取得する。

1. レビュー結果のサマリー（指摘件数、タイプ別内訳）をユーザーに表示
2. `AskUserQuestion` で対応確認（PASS/FAIL に応じて選択肢を分ける）:

   **FAIL 判定 または 未解決スレッドありの場合:**
   - 「レビュー結果を確認してください。対応を開始しますか？」
   - 選択肢: 「対応を開始する」/「修正不要（このまま完了）」/「一部のみ対応する」

   **PASS 判定 かつ 未解決スレッドなし（推奨事項のみ）の場合:**
   - 「PASS 判定ですが推奨事項があります。対応しますか？」
   - 選択肢: 「対応する」/「このまま完了」（2 択に簡略化）

3. ユーザー応答に基づく分岐:
   - **対応開始 / 対応する** → ステップ 3 以降のスレッド対応フローへ
   - **修正不要 / このまま完了** → 完了レポートを表示して終了
   - **一部のみ対応**（FAIL 時のみ） → スレッド一覧を番号付きで表示し、対応するスレッド番号を `AskUserQuestion` で確認してから処理（ステップ 3 以降）

### ステップ 3: スレッド分類

各未解決スレッドを以下の 4 タイプに分類:

| タイプ | 判定基準 | 処理方針 |
|--------|---------|---------|
| コード修正 | コードの変更を求めている | 修正 → コミット → 返信 → 解決 |
| コメント修正 | 以前の AI コメントの誤りを指摘 | コメント編集 → 返信 → 解決 |
| 質問 | 説明や理由の質問 | 返信 → 解決 |
| 意見相違 | レビュアーと判断が分かれる | 返信（解決しない） |

#### スコープ再評価（フォローアップ Issue 先送り防止）

レビュー指摘が「PR スコープ外」「フォローアップ Issue で対応」と分類されている場合、以下の基準で同一 PR での修正可否を再評価する:

**判定フロー**（両方を満たす場合のみ同一 PR で修正）:
1. 指摘内容が PR の diff と概念的に同じ変更カテゴリに属するか確認する（例: 旧方式→新方式の移行の残り）
2. 対象ファイルを特定し、影響ファイル数が 5 以下か確認する
3. 両方を満たす → タイプを「コード修正」に再分類し、同一 PR で対応する
4. いずれかを満たさない → フォローアップ Issue として記録（従来通り）

この再評価はユーザーに確認せず自律的に判断する。再分類した場合はステップ 5 の処理時に「スコープ再評価により同一 PR で対応」と返信に含める。

### ステップ 4: タスク登録（必須）

> **TaskCreate によるタスク登録は必須。** スキップ不可。タスク登録なしにステップ 5 に進むことは禁止。LLM が長いチェーン処理の途中で停止する問題を防止するため、全スレッドの処理ステップを TaskCreate で事前登録し、TaskUpdate で進捗を追跡する。

分類結果に基づき、以下のテンプレートで TaskCreate を実行する:

**コード修正スレッドがある場合:**

| # | content | activeForm |
|---|---------|------------|
| 1 | コード修正: {スレッド要約1}, {スレッド要約2}, ... | コード修正を実施中 |
| 2 | コード修正をコミット・プッシュする | コミット・プッシュ中 |
| 3 | コードを後処理する（簡略化・セキュリティレビュー・lint docs・改善コミット） | コードを後処理中 |
| 4 | 各スレッドに返信・解決する | スレッドに返信・解決中 |
| 5 | PR サマリーコメントを投稿する | PR サマリーを投稿中 |

Dependencies: step 2 blockedBy 1, step 3 blockedBy 2, step 4 blockedBy 3, step 5 blockedBy 4.

**質問・意見相違スレッドのみの場合:**

| # | content | activeForm |
|---|---------|------------|
| 1 | 各スレッドに返信・解決する | スレッドに返信・解決中 |

コード修正スレッドと質問/意見相違スレッドが混在する場合は、コード修正テンプレートを使用し、返信・解決ステップで全タイプのスレッドをまとめて処理する。

### ステップ 5: スレッド順次処理

> **TaskUpdate による進捗更新は必須。** 各タスクの開始時に `in_progress`、完了時に `completed` に更新する。TaskList に `pending` タスクが残っている限り、同じレスポンス内で次のタスクに進むこと。

#### コード修正スレッド

コード修正スレッドをまとめて処理する。修正は `code-issue` に Skill ツールで委任し、コミットは `commit-worker` に Agent ツールで委任する。

> **ステータス遷移（#2802）**: 通常フローでは PR は **Backlog** のままコード修正を行う（FAIL/未解決スレッドありのため Review に上げていない）。修正・コミット後に再レビューを実行し、PASS（未解決スレッド 0 件）になった時点でステップ 2a-3 の `status transition {PR#} --to Review`（PR_FORWARD: `Backlog → Review`、`--rollback` 不要）で PR を Review に上げる。
>
> **既に Review の PR を差し戻す場合（PR_ROLLBACK）**: 手動運用等で PR が既に Review の状態からコード修正のために `Review → In progress` に戻す場合は `--rollback` フラグが必須（`shirokuma-flow status transition {PR#} --to "In progress" --rollback`）。修正完了後の `In progress → Review` は PR_FORWARD として通常遷移（`--rollback` 不要）。

1. **修正**: `code-issue` に修正対象スレッドの情報（ファイルパス、指摘内容）をまとめて渡し、一括修正を委任:
   ```text
   Skill(
     skill: "code-issue",
     args: "PR #{PR#} のレビュー指摘に対応してください。\n\n{各スレッドの修正指示}"
   )
   ```
   `code-issue` は Skill ツール（メインコンテキスト）で実行されるため、YAML 出力パースは不要。エラーがなければ次のステップへ進む。

2. **コミット・プッシュ**: `commit-worker` に全修正のコミット・プッシュを委任:
   ```text
   Agent(
     description: "commit-worker PR #{PR#} review fixes",
     subagent_type: "commit-worker",
     prompt: "レビュー修正をコミット・プッシュしてください。コミットには `shirokuma-flow git commit-push` を使用してください。"
   )
   ```

3. **後処理**: `finalize-changes` を Skill ツールで実行:
   ```text
   Skill(skill: "finalize-changes")
   ```
   `/simplify` → `reviewing-security` → `lint docs` → 改善コミット（変更ありの場合のみ）を自動実行する。

4. **返信**: 各スレッドにコミット参照で返信（`--reply-to` には `pr comments` 出力の数値 `database_id` を使用）
   ```bash
   shirokuma-flow pr reply {PR#} --reply-to {database_id} - <<'EOF'
   {commit-hash} で修正しました。

   {修正内容の説明}
   EOF
   ```
5. **解決**: スレッドを解決（`--thread-id` には `pr comments` 出力の `PRRT_` プレフィックス ID を使用）
   ```bash
   shirokuma-flow pr resolve {PR#} --thread-id {PRRT_id}
   ```

#### 修正報告 HTML 化（fix-r）

コード修正スレッドが 1 件以上ある場合、修正報告を HTML 化する（条件: `html-report-criteria.md` §2 の閾値判定 + コード修正スレッドありを必須）。

HTML 化条件を満たす場合:
```text
Skill(
  skill: "writing-html-explainer",
  args: "--template review-summary --category prs --slug {PR#} --output-filename fix-r{round}.html --title \"PR #{PR#} 修正報告 R{round}\" --source-report /tmp/shirokuma-flow/{PR#}-fix-summary.md"
)
```

生成後、`pages/prs/{PR#}/index.html` の `<!-- SUBPAGE_LINKS_END -->` の前に `fix-r{round}.html` のリンクを追記する。

HTML 化条件を満たさない場合: 従来通り Markdown コメントのみとする。

#### コメント修正スレッド

1. **コメント編集**: 誤りのあるコメントを修正
   ```bash
   shirokuma-flow issue update {number} --comment-id {comment-id} /tmp/shirokuma-flow/{number}-comment-fix.md
   ```
2. **返信**: 修正した旨をスレッドに返信
3. **解決**: スレッドを解決

#### 質問スレッド

1. **返信**: コード・計画を参照して説明を返信
2. **解決**: スレッドを解決

#### 意見相違スレッド

1. **返信**: 懸念事項とトレードオフを説明して返信
2. 解決**しない** — レビュアーに判断を委ねる

#### PR サマリーコメント投稿

コード修正を含むスレッド対応が完了した後、対応全体のサマリーを PR コメントとして投稿する。レビュアーが PR 上で全対応履歴を追跡できるようにするため。

```bash
shirokuma-flow issue comment {PR#} /tmp/shirokuma-flow/pr-{PR#}-review-response.md
```

`/tmp/shirokuma-flow/pr-{PR#}-review-response.md` の内容:

````markdown
## レビュー対応完了

{N} 件のスレッドに対応しました。

| スレッド | タイプ | コミット |
|---------|--------|---------|
| {要約} | コード修正 | {commit-hash} |
| {要約} | 質問 | — |
````

> **注意**: コード修正スレッドがない場合（質問・意見相違のみ）はこのステップをスキップする。

## ルール

1. **全スレッドを処理してからユーザーに報告** — スレッド間でユーザーに質問しない
2. **返信と解決はセット** — すべての返信には解決が続くべき（意見相違を除く）
3. **正しい ID を使用** — `--reply-to` は `pr comments` 出力の数値 `database_id`、`--thread-id` は `pr comments` 出力の `PRRT_` プレフィックス ID
4. **コミットは修正ごと** — 異なるスレッドの修正を 1 コミットに混在させない（`git commit-push` を修正ごとに呼ぶ）
5. **意見相違は解決しない** — レビュアーに判断を委ねる
6. **コンテキスト復元を先に** — ステップ 1 は必ず最初に実行し、`review_count` を取得してから分岐する
7. **レビュー実行は `review-issue` 経由** — ステップ 2a では `review-issue` を Agent ツール（`review-worker`）で呼び出し、直接レビューを書かない
8. **コード修正はスキル/サブエージェント委任** — ステップ 5 のコード修正は `code-issue` (Skill) / `commit-worker` (Agent) に委任し、オーケストレーターは直接コード修正しない
9. **What/Why 分離** — レビュー対応はコメント（返信 = Why の記録）で完結させ、PR 本文を更新する場合は最新 What payload に整える。原則は `project-items` ルールの「What/Why 分離」節を参照

## エッジケース

| 状況 | アクション |
|------|----------|
| `review_count: 0` かつ `issue_comments` に `**レビュー結果:**` なし | レビュー実行モード（ステップ 2a）で `review-issue` を Agent ツール（`review-worker`）で呼び出しコードレビューを実行 |
| `review_count: 0` だが `issue_comments` に `**レビュー結果:**` を含む既存レビューあり | 新規レビューモード（ステップ 2a）をスキップし、既存レビューありの分岐へ。重複レビュー防止（#2818 問題 2） |
| AI レビュー PASS（未解決スレッドなし） | ステップ 2a-3 で PR を `Backlog → Review` に遷移（PR_FORWARD、#2802） |
| AI レビュー FAIL / 未解決スレッドあり | PR を **Backlog のまま保持**。修正→再レビュー PASS で初めて `Backlog → Review` に上げる |
| PR が既に Review（再レビュー等で手動遷移済み） | ステップ 2a-3 の `Backlog → Review` 遷移をスキップ |
| 未解決スレッドが 0 件（`review_count > 0`） | 完了レポートを表示し、再レビューを提案 |
| スレッドがすでに解決済み | スキップ |
| 古いコメント（コードが変更済み） | フィードバックがまだ有効なら返信、関連コミットを参照 |
| レビュアーが再レビューを要求 | 返信するがスレッドは開いたまま |
| PR に関連 Issue がない | コンテキスト復元の Issue 参照をスキップ |
| PR 本文に成果物候補がない | 成果物レビューをスキップ（diff のみ） |
| 成果物候補が 10 件超 | 最初の 10 件のみレビューし警告を表示 |
| 成果物が PR タイプ | PR は成果物レビュー対象外（Discussion / Issue のみ対象） |
| 未解決スレッドあり かつ レビューコメントあり | `unresolved_threads > 0` が優先。ステップ 2b（レビュー結果確認）へ進む |
| 未解決スレッドなしだが レビューコメントあり | `review-issue` が改善提案を issue comment で投稿したケース。`pr comments` の `issue_comments` で識別。ステップ 2b の UCP を発動する |
| コード修正が他のスレッドに影響 | 影響を確認して一括対応 |
| 「PR スコープ外」指摘が概念的に同じ変更かつ ≤5 ファイル | スコープ再評価で「コード修正」に再分類し同一 PR で対応 |
| ユーザーが修正不要と判断（UCP） | 完了レポートを表示して終了。スレッド対応をスキップ |
| ユーザーが一部のみ対応を選択（UCP） | 指定されたスレッドのみ処理し、残りは未解決のまま保持 |
| PASS + 推奨事項のみで対応を選択（review thread なし） | ステップ 3（スレッド分類）をスキップし、issue comment の推奨事項を元にコード修正 → コミットを実行。スレッド返信・解決ステップは不要 |
| ユーザーが「PR を close する」を選択（修正の方向性が違う等） | `shirokuma-flow pr close {PR#} --rollback` を案内・実行する。`--rollback` フラグでリンク Issue が Review から In progress に自動差し戻しされる（PR_ROLLBACK 遷移）。本フローは終了し、Issue ステータス更新はスキップ |
| マージ済み PR の取り消しが必要（revert 要求） | `shirokuma-flow issue rollback {plan-issue#} --action revert` を案内する。revert ブランチ作成 + revert PR 作成 + 計画 Issue を ToDo に戻す処理を一括実行する |

## ツール使用

| ツール | タイミング |
|--------|-----------|
| Skill | `code-issue` によるコード修正（ステップ 5）、`finalize-changes` による後処理（ステップ 5） |
| Agent | `review-worker` によるコードレビュー実行（ステップ 2a）、`commit-worker` によるコミット・プッシュ（ステップ 5） |
| Bash | `shirokuma-flow pr comments`, `pr reply`, `pr resolve`, git 操作 |
| Read | コード確認、計画参照 |
| TaskCreate, TaskUpdate | スレッド処理の進捗管理 |

## リファレンス

| リファレンス | 用途 |
|------------|------|
| `implement-flow` スキル | Worker 完了後の統一パターン、UCP チェック |

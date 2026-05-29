# チェーン末尾ステップ リファレンス

`implement-flow` チェーン完了直前に実行される末尾ステップの詳細。

## 作業サマリー（Issue コメント）

PR 作成後、技術的な作業サマリーを Issue コメントとして投稿する。これは将来の会話で Issue のコンテキストとして参照されるプライマリ記録。

作業サマリーは**技術的な作業詳細**に焦点を当てる — 変更内容、変更ファイル、技術的判断。

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-work-summary.md
```

`/tmp/shirokuma-flow/{number}-work-summary.md` の内容:

```markdown
## 作業サマリー

### 変更内容
{実装または修正した内容 — 技術的な詳細}

### 変更ファイル
- `path/file.ts` - {変更内容}

### プルリクエスト
PR #{pr-number}

### 技術的判断
- {判断と根拠}
```

Issue 番号が関連付けられていない作業の場合、このステップをスキップ。

**スタンドアロン完了**: `implement-flow` がチェーンを完了した場合（スタンドアロンでもセッション内でも）、作業サマリーは自動投稿される。

## PR ページ生成（HTML 化）

PR 作成後、作業サマリー投稿と同タイミングで PR ページを生成する。`implement-flow-summary` は常時 HTML 化対象（`html-report-criteria.md` §2）。

### ステップ 1: PR マスターページの生成

`pages/prs/{pr-number}/index.html` を `--template default` で生成する。マスターページには `<!-- SUBPAGE_LINKS_START -->` / `<!-- SUBPAGE_LINKS_END -->` コメントマーカーを含むリンクリスト領域を設ける（後続の `review-flow` が追記できるよう）。

```text
Skill(
  skill: "writing-html-explainer",
  args: "--template default --category prs --slug {pr-number} --title \"PR #{pr-number}: {pr-title}\""
)
```

マスターページはリンクハブ（サブページへのナビゲーション）として機能するため、作業サマリーの本文は渡さない。PR タイトルと `<!-- SUBPAGE_LINKS_START/END -->` マーカー付きのリンクリストのみを本文として手動設置する（ステップ 3 参照）。

### ステップ 2: 作業サマリーページの生成

`pages/prs/{pr-number}/summary.html` を生成する（`--output-filename summary.html`）。

```text
Skill(
  skill: "writing-html-explainer",
  args: "--template default --category prs --slug {pr-number} --output-filename summary.html --title \"PR #{pr-number} 作業サマリー\" --source-report /tmp/shirokuma-flow/{number}-work-summary.md"
)
```

### ステップ 3: マスターページへのリンク追記

生成した `summary.html` のリンクを `index.html` の `<!-- SUBPAGE_LINKS_START -->` / `<!-- SUBPAGE_LINKS_END -->` 間に追記する。追記前にマーカーの存在を確認し、無ければ `<main>` 末尾に挿入してから追記する:

```bash
MASTER=pages/prs/{pr-number}/index.html
# マーカーが無い場合は </main> 直前に挿入（フォールバック）
grep -q '<!-- SUBPAGE_LINKS_END -->' "${MASTER}" || \
  sed -i 's|</main>|<ul>\n  <!-- SUBPAGE_LINKS_START -->\n  <!-- SUBPAGE_LINKS_END -->\n</ul>\n</main>|' "${MASTER}"
LINK='  <li><a href="summary.html">作業サマリー</a></li>'
sed -i "s|<!-- SUBPAGE_LINKS_END -->|${LINK}\n<!-- SUBPAGE_LINKS_END -->|" ${MASTER}
```

### 公開 URL

HTML 生成成功後、次のステップ提案に PR ページ URL を含める:

```
## 次のステップ

- `/review-flow #{pr-number}` — PR のセルフレビューを実行
- [PR ページ]({pr-page-url}) — HTML 作業サマリーを確認
```

## Status（チェーン末尾）

> **新モデル（ADR-v3-022 第四改訂 + #2802）**: 実装単位（計画 Issue、または XS/S 直接実装時は課題 Issue）は implement 中 `In progress` のまま。**コードレビュー待ちは PR が Review を担う**。PR は `pr create` で **Backlog** として作成され、`review-flow` の AI レビュー PASS 後に `Backlog → Review` に遷移する（#2802）。1 エンティティ 1 Review 原則により、実装単位 Issue を Review に遷移させない（旧モデルの `submit {number}` / `status transition {number} --to Review` は行わない。新モデルでは `ISSUE_FORWARD` に `In progress → Review` がなく失敗する）。

作業サマリーの Issue コメント投稿（前節）のみ行い、実装単位 Issue の Status はチェーン末尾で変更しない。PR の Review 遷移は `review-flow` が担うため、チェーン末尾では PR が Review であることの検証のみを行う。

## 計画 Issue の Done（PR マージで到達）

> 計画 Issue は実装単位。implement では `begin`（`ToDo → In progress`）して PR を作る。**計画 Issue が Done になるのは PR マージ時**（review-flow / `pr merge` で PR `Review → Done`、`Closes #N` で計画 Issue が close、`syncParentStatus` が親を子から導出）。implement-flow チェーン末尾では計画 Issue は `In progress` のまま（PR レビュー待ち）で、ここで Done への更新は行わない。

XS/S 直接実装パス（計画 Issue なし）でも同様に、課題 Issue は `In progress` のまま PR マージで Done に到達する。

## 次のステップ提案（チェーン末尾）

Status 更新後、ユーザーに次のアクション候補を提示する。`open-pr-issue` の出力から PR 番号を取得して具体的に案内する。PR 番号が取得できない場合（PR 未作成等）は `/review-flow` の行を省略する。

```
## 次のステップ

- `/review-flow #{pr-number}` — PR のセルフレビューを実行
```

## 変更なしパス（`coding-worker` が `changes_made: false` で完了した場合）

`coding-worker` が `changes_made: false` を返した場合、通常チェーン（commit → PR → review-flow → finalize-changes）をスキップし、以下の手順を実行する。

### 変更なし用作業サマリー

PR がないため、`### プルリクエスト` セクションを省略した専用テンプレートを使用する。「既に実装済み」「仕様上正しい」「再現せず」等の調査結果として記録する。

```bash
shirokuma-flow issue comment {number} /tmp/shirokuma-flow/{number}-no-changes-summary.md
```

`/tmp/shirokuma-flow/{number}-no-changes-summary.md` の内容:

```markdown
## 作業サマリー（変更なし）

### 調査結果
{coding-worker が確認した内容 — なぜ変更不要と判断したか}

### 判定
{例: 既に実装済み、仕様上正しい、再現しない、等}

### 確認したファイル
- `path/file.ts` - {確認内容}

### 技術的判断
- {判断と根拠}
```

### 変更なし時のステータス判定

「変更なし」でチェーンが終了した場合、コード変更も PR もないため `In progress` から通常の `Review` / `Done` 遷移には進めない（`status-workflow.ts` の `STATUS_TRANSITIONS` 参照）。正規ルートは以下のいずれか:

| 選択肢 | 遷移手段 | 用途 |
|--------|---------|------|
| Cancel（Done + not_planned） | `shirokuma-flow issue cancel {n} --comment "{理由}"` | 「変更不要」として Issue を close（推奨） |
| Blocked | `shirokuma-flow block {n} --reason "{理由}"` | 再検討・追加情報待ち（reason は Issue コメントとして記録） |
| ToDo | `shirokuma-flow status transition {n} --to ToDo` | 後で再評価する |

> **重要**: 取り下げは **`issue cancel`** 専用コマンドで実行する。`Cancelled` Status は廃止され、現在は `state_reason: not_planned` の Close + Status: Done として記録される（`status-workflow.ts` の `isCancelledEquivalent` 参照）。

実装:

```text
reason = extract_first_line(body)  # coding-worker 本文 1 行目サマリー
user_choice = AskUserQuestion(
    "変更なしで完了しました。理由: {reason}。ステータスをどうしますか？",
    options=[
      "Cancel（取り下げ・推奨。Done + state_reason: not_planned で記録）",
      "Blocked（再検討・追加情報待ち）",
      "ToDo（後で再評価）"
    ]
)

if user_choice == "Cancel":
    run: shirokuma-flow issue cancel {number} --comment "{reason}"
elif user_choice == "Blocked":
    run: shirokuma-flow block {number} --reason "{reason}"
else:
    run: shirokuma-flow status transition {number} --to ToDo
```

ヘッドレスモード（`--headless`）では AskUserQuestion をスキップし、デフォルト動作として `issue cancel {number} --comment "{reason}"` を実行する（取り下げ後は `issue reopen` + `status transition --to ToDo` で復旧可能）。

### 変更なし時の次のステップ提案

PR がないため `/review-flow` 行を省略し、以下のみを提示する:

```
## 次のステップ

変更が不要と判断されました。必要に応じて:
- `/implement-flow #{number}` — 再実行（判定が誤っていた場合）
```

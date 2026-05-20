# ヘッドレスモード詳細

`--headless` フラグを指定すると、実装フェーズの UCP（ユーザー制御ポイント）にデフォルト動作を適用し、対話的な確認なしでチェーンを完遂する。`claude -p` でのバッチ実行や、対話セッション内での確認スキップに使用する。

## 前提条件

ヘッドレスモードで実行するには以下を**全て**満たす必要がある:

1. 引数に**明示的な Issue 番号**が指定されている
2. Issue のステータスが **Review** または **ToDo** である
   - plan/design Issue: **ToDo** が必須（事前に approve 完了済み（Review → Done）; Review では停止）
   - 通常 Issue: **Review** が必須
3. Issue に計画 Issue（タイトルが「計画:」または「Plan:」で始まる子 Issue）が存在する

いずれかを満たさない場合、エラーメッセージを表示して停止する（通常モードへのフォールバックは行わない）。

> **注意:** Review または ToDo 以外のステータス（In progress, Blocked 等）の Issue に `--headless` を指定した場合も前提条件エラーで停止する。In progress ステータス（計画フェーズ）の Issue は `prepare-flow` による対話的な計画策定が必要なため、ヘッドレスモードの対象外。また、plan/design Issue が Review 状態の場合も前提条件エラーとして停止する（先に `status approve`（Review → Done に意味変更）による明示的な完了宣言が必要。親 Issue は `syncParentStatus` により `Backlog → ToDo` に自動同期）。

## UCP デフォルト動作

| UCP ID | 発生箇所 | 通常モード | ヘッドレスモードのデフォルト動作 |
|--------|---------|----------|--------------------------|
| W1 | 引数なし呼び出し | AskUserQuestion で番号確認 | 前提条件エラーとして即停止 |
| W2 | Issue が Done | 再オープン確認 | 警告を表示して停止（誤実行防止） |
| W3 | ADR 作成提案（Feature M+） | AskUserQuestion で確認 | スキップ（ADR なしで続行） |
| W4 | 誤ったブランチ検出 | AskUserQuestion で切り替え確認 | 警告を表示して停止（最高リスク） |
| W5 | worker の ucp_required フラグ | AskUserQuestion で提案を提示 | スキップして Issue コメントに記録 |

### W5 スキップ時の Issue コメント記録

ヘッドレスモードで W5（worker の UCP）がスキップされた場合、以下の形式で Issue コメントに記録する:

```
**[Headless] UCP スキップ:** {worker 名}
**提案内容:** {スキップされた提案の要約}
**デフォルト動作:** スキップして続行
```

## 使用例

```bash
# claude -p でのバッチ実行
claude -p "/implement-flow --headless #42"

# 対話セッション内での確認スキップ
/implement-flow #42 --headless
```

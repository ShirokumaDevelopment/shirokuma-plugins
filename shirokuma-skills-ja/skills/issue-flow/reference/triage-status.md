# トリアージ Status の進行（Backlog → Review → ToDo）

`issue-flow` は新規作成に加え、**既存の課題 Issue のトリアージ Status を進める役割**を担う。トリアージとは「未調査・未トリアージ（Backlog）の課題 Issue を、人間が承認すべき着手候補（Review）に提出し、承認を経て着手準備完了（ToDo）に進める」プロセスである。

> トリアージ対象は **課題 Issue（通常 Issue）** のみ。計画 Issue / 設計 Issue（子）のレビュー提出・承認は本スキルの責務外（`prepare-flow` / `design-flow` / `approve-flow` が担う）。

## (a) トリアージを開始するトリガー

以下のいずれかのコンテキストでトリアージ提出（Backlog → Review）を開始する:

- 新規作成した課題 Issue を、その場で「着手候補として人間に提出したい」とユーザーが意図したとき（新規作成チェーン完了後の継続）
- 既存の Backlog 課題 Issue について「トリアージして」「着手候補に上げて」「Review に出して」等の指示を受けたとき
- 別フロー（`/implement-flow` 等）が Backlog の課題 Issue に遭遇し、着手前にトリアージが必要として誘導されたとき

> **DO NOT**: 既に一度 Review を経由した Issue を再提出してはならない（1 エンティティ 1 Review 原則）。実装フェーズで PR が動いている間の課題 Issue は In progress のまま触らない。

## (b) Backlog → Review（トリアージ提出）

`submit` コマンドで課題 Issue を Review（トリアージ承認待ち）に提出する:

```bash
shirokuma-flow submit {number}
```

- `submit` は現在ステータスが `Backlog` であることを CLI 側で検証する。Backlog 以外なら `result: "error"` で終了するため、その `message` をユーザーに提示して停止する
- トリアージ提出時にメモ（調査結果・優先度判断の根拠など）を残す場合は `--comment <file>` でコメントを先に投稿してから遷移する
- 提出後はユーザーに「Review（トリアージ承認待ち）に提出した。承認は GitHub Web もしくは承認指示で行う」旨を案内する

## (c) Review → ToDo（トリアージ承認）

Review に提出された課題 Issue の承認は **基本的に人間が GitHub Web 上で判断する**。本スキルは承認を勝手に実行せず、承認待ちであることを案内するに留める。

ユーザーが明示的に「承認」「approve」を指示した場合（AI 自発承認）にのみ、`approve-flow` スキルに委譲する:

```
Skill: approve-flow
Args: #{number}
```

- `approve-flow` は `issue_kind` で遷移先を分岐する。課題 Issue（normal）は `Review → ToDo`（トリアージ承認・着手可、親同期なし）に遷移する
- ToDo 到達後は `/implement-flow #{number}` を案内する（`begin` で In progress に着手）
- 承認実行前に AskUserQuestion で承認意思を確認することを推奨する（誤承認の防止）

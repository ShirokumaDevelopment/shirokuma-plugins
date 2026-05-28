# 統合テスト・動作確認シナリオ

ADR ライフサイクル管理機能（#2053/#2061 実装）の統合動作確認手順と期待結果を記録する。

## シナリオ 1: write-adr の 3 モード分岐確認

各モードの前提・入力・期待結果を明示する。モード判定は `## モード判定（必須: 最初に確認）` の表に基づく。

### S1-1: create モード（新規作成）

**前提:** 新しい決定を記録する要求。既存 ADR との重複なし。
**入力:** 「ADR を作成して。PostgreSQL を採用した決定を記録したい」
**期待結果:**
- モード判定: **create**（対象 ADR 数: 1 新規）
- `items adr list` で既存番号確認 → 次の空き番号を採番
- 標準 ADR テンプレートで Discussion を Proposed ステータスで作成
- 完了レポート: `## ADR 作成完了` + `**番号:**` + `**タイトル:**` + `**ステータス:** Proposed` + `**Discussion:** #{n}`

### S1-2: update モード（本文のみ更新）

**前提:** 既存 ADR あり。ステータス変更なし（Context/Decision/Consequences の加筆修正のみ）。
**入力:** 「ADR-003 の Consequences セクションに最近発見した副作用を追記してください」
**期待結果:**
- モード判定: **update**（対象 ADR 数: 1 既存）→ 既存 ADR 更新サブフロー
- `items adr list` → AskUserQuestion で対象 ADR 確認
- 変更種別: 「本文のみ更新」
- `items adr get 3` で本文取得 → 該当セクション編集 → `items update 3 --body /tmp/...`
- 完了レポート: `## ADR 更新完了` + `**変更種別:** 本文更新`（ステータスフィールドは省略）

### S1-3: update モード（ステータス変更: Accepted → Deprecated）

**前提:** 既存 Accepted ADR あり。置換先 ADR なし（単純な廃止）。
**入力:** 「ADR-002 を Deprecated にしてください。この技術はもう使っていません」
**期待結果:**
- モード判定: **update**（対象 ADR 数: 1 既存。Deprecated は独立モードではなく update の特殊ケース）
- `items adr list` → AskUserQuestion で対象 ADR 確認
- 変更種別: 「ステータス変更（→ Deprecated）」
- `items adr get 2` で本文取得 → ヘッダー `**Status:** Accepted` → `**Status:** Deprecated` に更新 + 更新履歴に記録
- `items update 2 --body /tmp/...` で本文適用
- 完了レポート: `## ADR 更新完了` + `**変更種別:** ステータス変更` + `**旧ステータス:** Accepted` + `**新ステータス:** Deprecated`

### S1-4: supersede モード（新 ADR 作成 + 旧 ADR 置換）

**前提:** 既存 Accepted ADR あり。置換先の新 ADR をこれから作成する。
**入力:** 「ADR-001 は新しい ADR に置き換えられます。Superseded にしてください」
**期待結果:**
- モード判定: **supersede**（対象 ADR 数: 2 = 新規 + 既存）→ ADR 置換サブフロー
- `items adr list` → AskUserQuestion で旧 ADR 番号・置換理由・新 ADR コンテキストを収集
- create モードを内部実行して新 ADR を作成（新 ADR 本文の「関連する決定」に `**Supersedes:** ADR-001`）
- update モードと同様の手順で旧 ADR を更新: `**Status:** Accepted` → `**Status:** Superseded by ADR-{新番号}` + 更新履歴に置換理由を追記
- 旧 ADR Discussion にコメント「この ADR は ADR-{新番号} により置換されました」を追加
- 完了レポート: `## ADR 置換完了` + `**新 ADR:**` + `**旧 ADR:**` + `**旧ステータス:** Accepted` + `**新ステータス:** Superseded by ADR-{新番号}` + `**置換理由:**`

## シナリオ 2: analyze-issue requirements の ADR 整合性チェック

### S2-1: トリガー条件マッチ（ADR キーワードあり）

**操作:** Issue 本文に「アーキテクチャ」「技術選定」等のキーワードを含む Issue に対して `/analyze-issue requirements #{N}`
**期待結果:**
- 通常チェックリストに加えてプロジェクト要件整合性チェックを実行
- `items discussions search "<キーワード>"` で ADR を検索
- 上位 5 件の詳細を `items adr get` で取得
- コメントに `**プロジェクト要件整合性:**` と `**参照 ADR:**` を出力

### S2-2: トリガー条件非マッチ（通常 Issue）

**操作:** UI バグ修正 Issue に対して `/analyze-issue requirements #{N}`
**期待結果:**
- 通常チェックリストのみ実行
- `**プロジェクト要件整合性:**` フィールドは出力されない（またはスキップ旨を記載）

### S2-3: NEEDS_REVISION 時のハンドリング

**操作:** ADR と矛盾する方針を含む Issue の requirements レビュー
**期待結果:**
- `**プロジェクト要件整合性:** NEEDS_REVISION` を出力
- 矛盾する ADR 番号と内容を提示
- AskUserQuestion で「Issue 修正」か「write-adr 更新先行」かを確認

## シナリオ 3: issue-flow のステップ 2b チェーン

### S3-1: ADR 関連 Issue 作成時のチェーン

**操作:** `issue-flow` でアーキテクチャ変更 Issue を作成
**期待結果:**
1. ステップ 2 で `managing-github-items` が Issue を作成
2. ステップ 2b で `analyze-issue requirements` を自動呼び出し
3. ADR キーワードを検出して ADR 整合性チェックを実行
4. PASS の場合: ステップ 3 で通常の次アクション候補を提示
5. NEEDS_REVISION の場合: AskUserQuestion で対応方法を確認

### S3-2: 通常 Issue 作成時のチェーン

**操作:** `issue-flow` でバグ修正 Issue を作成
**期待結果:**
- ステップ 2b で requirements レビューを自動実行
- ADR キーワードがないため ADR 整合性チェックは実行しない
- `**レビュー結果:**` と `**設計要否:**` のみ出力

## シナリオ 4: discovering-codebase-rules の ADR ライフサイクル検知

### S4-1: ADR ステータス管理パターンの検知

**操作:** コードベースで ADR ステータス管理パターンを分析
**期待結果:**
- `Proposed/Accepted/Deprecated/Superseded` の 4 ステータス遷移パターンを検知
- 2 回以上の観測で Knowledge Discussion として記録
- Evolution シグナルとして「ADR ライフサイクル管理パターン」を提案

## 確認コマンド例

```bash
# ADR 一覧確認
shirokuma-flow discussion adr list

# ADR 検索
shirokuma-flow discussion search "アーキテクチャ スキル"

# ADR 詳細取得
shirokuma-flow discussion adr get {discussion-number}

# Issue に整合性チェック
# → /analyze-issue requirements #{issue-number} を実行
```
